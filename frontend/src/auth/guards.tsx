import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { ErrorState, FullPageSpinner } from '@/components/ui/feedback'
import type { Role } from '@/lib/types'
import { ForbiddenPage } from '@/features/errors/ErrorPages'

import { useAuth } from './AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, sessionCheckError, retrySessionCheck } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user && sessionCheckError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper px-4">
        <ErrorState error={sessionCheckError} onRetry={retrySessionCheck} />
      </main>
    )
  }
  if (!user) {
    const next = location.pathname + location.search
    return <Navigate to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} replace />
  }
  return children
}

/** Hides pages a role cannot use. The API enforces the same rules independently. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) return <ForbiddenPage />
  return children
}
