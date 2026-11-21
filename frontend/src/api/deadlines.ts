import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { Deadline, DeadlineView, Page, Priority } from '@/lib/types'

import { useAction } from './mutation'

export interface DeadlineInput {
  title: string
  description?: string
  dueDate: string
  priority: Priority
  assignedToId?: number | null
}

export function useDeadlines(query: { view: DeadlineView; mine?: boolean; q?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['deadlines', query],
    queryFn: () => api.get<Page<Deadline>>('/deadlines', { ...query }),
    placeholderData: keepPreviousData,
  })
}

export function useCaseDeadlines(caseId: number) {
  return useQuery({ queryKey: ['case', caseId, 'deadlines'], queryFn: () => api.get<Deadline[]>(`/cases/${caseId}/deadlines`) })
}

export function useCreateDeadline(caseId: number) {
  return useAction((input: DeadlineInput) => api.post<Deadline>(`/cases/${caseId}/deadlines`, input), {
    success: 'Deadline added',
  })
}

export function useUpdateDeadline() {
  return useAction(({ id, ...input }: DeadlineInput & { id: number }) => api.put<Deadline>(`/deadlines/${id}`, input), {
    success: 'Deadline updated',
  })
}

export function useCompleteDeadline() {
  return useAction((id: number) => api.post<Deadline>(`/deadlines/${id}/complete`), {
    success: 'Marked as completed',
    toastErrors: true,
  })
}

export function useReopenDeadline() {
  return useAction((id: number) => api.post<Deadline>(`/deadlines/${id}/reopen`), { success: 'Deadline reopened', toastErrors: true })
}

export function useDeleteDeadline() {
  return useAction((id: number) => api.delete(`/deadlines/${id}`), { success: 'Deadline deleted', toastErrors: true })
}
