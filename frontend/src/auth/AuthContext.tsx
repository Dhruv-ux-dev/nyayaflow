import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, ApiError, sessionStore, setUnauthorizedHandler } from '@/lib/api'
import type { LoginResponse, User } from '@/lib/types'

type SignOutReason = 'manual' | 'expired'

interface AuthState {
  user: User | null
  /** True while the stored session is being validated on first load. */
  loading: boolean
  /** Set when the stored session could not be checked because the server was unreachable. */
  sessionCheckError: unknown
  retrySessionCheck: () => void
  /** Why the last session ended, shown on the sign-in page. */
  signOutReason: SignOutReason | null
  signIn: (email: string, password: string) => Promise<User>
  signOut: (reason?: SignOutReason) => void
  setUser: (user: User) => void
  /** Store a fresh token, for example after a password change. */
  acceptSession: (response: LoginResponse) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => sessionStore.get() !== null)
  const [signOutReason, setSignOutReason] = useState<SignOutReason | null>(null)
  const [sessionCheckError, setSessionCheckError] = useState<unknown>(null)

  const signOut = useCallback(
    (reason: SignOutReason = 'manual') => {
      sessionStore.clear()
      queryClient.clear()
      setUser(null)
      setSignOutReason(reason)
    },
    [queryClient],
  )

  // Any 401 from the API (expired token, deactivated account, password changed elsewhere) ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => signOut('expired'))
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  // Validate a stored session on load. A rejected session is ended by the 401 handler above; any
  // other failure means the server could not be reached, so the session is kept for a retry.
  const checkSession = useCallback(() => {
    api
      .get<User>('/auth/me')
      .then((me) => {
        setSessionCheckError(null)
        setUser(me)
      })
      .catch((error) => {
        if (!(error instanceof ApiError && error.status === 401)) setSessionCheckError(error)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (sessionStore.get()) checkSession()
  }, [checkSession])

  const retrySessionCheck = useCallback(() => {
    setLoading(true)
    checkSession()
  }, [checkSession])

  // Sign out when the token's lifetime ends, even if the user is idle.
  useEffect(() => {
    const session = sessionStore.get()
    if (!user || !session) return
    const remaining = new Date(session.expiresAt).getTime() - Date.now()
    const timer = window.setTimeout(() => signOut('expired'), Math.max(remaining, 0))
    return () => window.clearTimeout(timer)
  }, [user, signOut])

  const acceptSession = useCallback((response: LoginResponse) => {
    sessionStore.set(response)
    setUser(response.user)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<LoginResponse>('/auth/login', { email, password })
      queryClient.clear()
      acceptSession(response)
      setSignOutReason(null)
      return response.user
    },
    [acceptSession, queryClient],
  )

  const value = useMemo(
    () => ({ user, loading, sessionCheckError, retrySessionCheck, signOutReason, signIn, signOut, setUser, acceptSession }),
    [user, loading, sessionCheckError, retrySessionCheck, signOutReason, signIn, signOut, acceptSession],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

/** The signed-in user; only call inside routes guarded by RequireAuth. */
export function useCurrentUser() {
  const { user } = useAuth()
  if (!user) throw new Error('No signed-in user')
  return user
}
