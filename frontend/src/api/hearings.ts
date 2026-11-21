import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { Hearing, HearingStatus, HearingType, Page, SchedulingConflict } from '@/lib/types'

import { useAction } from './mutation'

export interface HearingQuery {
  from?: string
  to?: string
  status?: HearingStatus[]
  type?: HearingType[]
  judgeId?: number
  courtroomId?: number
  courtId?: number
  caseId?: number
  q?: string
  direction?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ScheduleInput {
  scheduledAt: string
  durationMinutes: number
  hearingType: HearingType
  courtroomId: number
  purpose?: string
  overrideConflicts?: boolean
}

export interface ConcludeInput {
  result: 'COMPLETED' | 'ADJOURNED'
  outcome: string
  proceeding?: { summary: string; remarks?: string }
  nextHearing?: ScheduleInput
}

export function useHearings(query: HearingQuery) {
  return useQuery({
    queryKey: ['hearings', query],
    queryFn: () => api.get<Page<Hearing>>('/hearings', { ...query }),
    placeholderData: keepPreviousData,
  })
}

export function useHearingCalendar(from: string, to: string, filters: { judgeId?: number; courtroomId?: number; courtId?: number }) {
  return useQuery({
    queryKey: ['hearings', 'calendar', from, to, filters],
    queryFn: () => api.get<Hearing[]>('/hearings/calendar', { from, to, ...filters }),
    placeholderData: keepPreviousData,
  })
}

export function useCaseHearings(caseId: number) {
  return useQuery({ queryKey: ['case', caseId, 'hearings'], queryFn: () => api.get<Hearing[]>(`/cases/${caseId}/hearings`) })
}

export function fetchConflicts(params: {
  caseId: number
  scheduledAt: string
  durationMinutes: number
  courtroomId?: number
  excludeHearingId?: number
}) {
  return api.get<SchedulingConflict[]>('/hearings/conflicts', { ...params })
}

export function useScheduleHearing(caseId: number) {
  return useAction((input: ScheduleInput) => api.post<Hearing>(`/cases/${caseId}/hearings`, input), {
    success: 'Hearing scheduled',
  })
}

export function useRescheduleHearing() {
  return useAction(
    ({ id, ...input }: { id: number; scheduledAt: string; durationMinutes?: number; courtroomId?: number; reason: string; overrideConflicts?: boolean }) =>
      api.post<Hearing>(`/hearings/${id}/reschedule`, input),
    { success: 'Hearing rescheduled' },
  )
}

export function useCancelHearing() {
  return useAction(({ id, reason }: { id: number; reason: string }) => api.post<Hearing>(`/hearings/${id}/cancel`, { reason }), {
    success: 'Hearing cancelled',
  })
}

export function useConcludeHearing() {
  return useAction(({ id, ...input }: ConcludeInput & { id: number }) => api.post<Hearing>(`/hearings/${id}/conclude`, input), {
    success: (hearing) => (hearing.status === 'ADJOURNED' ? 'Hearing recorded as adjourned' : 'Hearing outcome recorded'),
  })
}
