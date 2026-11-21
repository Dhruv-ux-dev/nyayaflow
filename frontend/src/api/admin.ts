import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { AuditCategory, AuditEvent, Court, Courtroom, Dashboard, DirectoryEntry, Page, Role, User } from '@/lib/types'

import { useAction } from './mutation'

// ---------------------------------------------------------------- reference data

export function useCourts() {
  return useQuery({ queryKey: ['courts'], queryFn: () => api.get<Court[]>('/courts'), staleTime: 5 * 60_000 })
}

export function useDirectory(role: Role, enabled = true) {
  return useQuery({
    queryKey: ['directory', role],
    queryFn: () => api.get<DirectoryEntry[]>('/directory/users', { role }),
    staleTime: 60_000,
    enabled,
  })
}

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<Dashboard>('/dashboard'), refetchInterval: 60_000 })
}

// ---------------------------------------------------------------- users

export interface UserInput {
  fullName: string
  email: string
  role: Role
  designation?: string
  phone?: string
  barRegistrationNumber?: string
  courtId?: number | null
  password?: string
}

export function useUsers(query: { q?: string; role?: Role; active?: boolean; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: () => api.get<Page<User>>('/users', { ...query }),
    placeholderData: keepPreviousData,
  })
}

export function useCreateUser() {
  return useAction((input: UserInput) => api.post<User>('/users', input), { success: (u) => `Account created for ${u.fullName}` })
}

export function useUpdateUser() {
  return useAction(({ id, ...input }: UserInput & { id: number }) => api.put<User>(`/users/${id}`, input), {
    success: 'Account updated',
  })
}

export function useSetUserActive() {
  return useAction(
    ({ id, active }: { id: number; active: boolean }) => api.post<User>(`/users/${id}/${active ? 'activate' : 'deactivate'}`),
    { success: (u) => (u.active ? `${u.fullName} reactivated` : `${u.fullName} deactivated`), toastErrors: true },
  )
}

export function useResetPassword() {
  return useAction(({ id, newPassword }: { id: number; newPassword: string }) => api.post(`/users/${id}/reset-password`, { newPassword }), {
    success: 'Password reset. Share it with the user securely.',
  })
}

// ---------------------------------------------------------------- courts

export interface CourtInput {
  code: string
  name: string
  city: string
  address?: string
  active: boolean
}

export function useSaveCourt() {
  return useAction(({ id, ...input }: CourtInput & { id?: number }) =>
    id ? api.put<Court>(`/courts/${id}`, input) : api.post<Court>('/courts', input), { success: 'Court saved' })
}

export function useSaveCourtroom() {
  return useAction(
    ({ id, courtId, ...input }: { id?: number; courtId: number; name: string; floor?: string; active: boolean }) =>
      id ? api.put<Courtroom>(`/courtrooms/${id}`, input) : api.post<Courtroom>(`/courts/${courtId}/courtrooms`, input),
    { success: 'Courtroom saved' },
  )
}

// ---------------------------------------------------------------- audit

export function useAuditLog(query: { category?: AuditCategory; q?: string; from?: string; to?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['audit', query],
    queryFn: () => api.get<Page<AuditEvent>>('/audit', { ...query }),
    placeholderData: keepPreviousData,
  })
}
