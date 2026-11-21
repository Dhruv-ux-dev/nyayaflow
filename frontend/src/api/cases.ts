import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type {
  AuditEvent,
  CaseDetail,
  CaseStatus,
  CaseSummary,
  CaseType,
  Page,
  PartySide,
  PartyType,
  Priority,
  TimelineEntry,
} from '@/lib/types'

import { useAction } from './mutation'

export interface CaseQuery {
  q?: string
  status?: CaseStatus[]
  type?: CaseType[]
  priority?: Priority[]
  judgeId?: number
  lawyerId?: number
  courtId?: number
  filedFrom?: string
  filedTo?: string
  hasHearing?: boolean
  unassigned?: boolean
  sort?: string
  page?: number
  size?: number
}

export interface PartyInput {
  side: PartySide
  partyType: PartyType
  name: string
  address?: string
}

export interface CreateCaseInput {
  title: string
  caseType: CaseType
  description?: string
  priority: Priority
  filingDate: string
  courtId: number
  courtroomId?: number | null
  judgeId?: number | null
  parties: PartyInput[]
  lawyers: Array<{ lawyerId: number; side: PartySide; leadCounsel: boolean }>
}

export interface UpdateCaseInput {
  title: string
  description?: string
  priority: Priority
  filingDate: string
  courtroomId?: number | null
  parties: PartyInput[]
  version: number
}

export function useCases(query: CaseQuery, enabled = true) {
  return useQuery({
    queryKey: ['cases', query],
    queryFn: () => api.get<Page<CaseSummary>>('/cases', { ...query }),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useCase(id: number) {
  return useQuery({ queryKey: ['case', id], queryFn: () => api.get<CaseDetail>(`/cases/${id}`), enabled: id > 0 })
}

export function useCaseTimeline(id: number) {
  return useQuery({ queryKey: ['case', id, 'timeline'], queryFn: () => api.get<TimelineEntry[]>(`/cases/${id}/timeline`) })
}

export function useCaseActivity(id: number, page: number) {
  return useQuery({
    queryKey: ['case', id, 'activity', page],
    queryFn: () => api.get<Page<AuditEvent>>(`/cases/${id}/activity`, { page, size: 30 }),
    placeholderData: keepPreviousData,
  })
}

export function useCreateCase() {
  return useAction((input: CreateCaseInput) => api.post<CaseDetail>('/cases', input), {
    success: (created) => `Registered ${created.caseNumber}`,
  })
}

export function useUpdateCase(id: number) {
  return useAction((input: UpdateCaseInput) => api.put<CaseDetail>(`/cases/${id}`, input), {
    success: 'Case details saved',
  })
}

export function useAssignJudge(id: number) {
  return useAction((input: { judgeId: number; note?: string }) => api.put<CaseDetail>(`/cases/${id}/judge`, input), {
    success: (updated) => `Assigned to ${updated.judge?.fullName}`,
  })
}

export function useAddLawyer(id: number) {
  return useAction(
    (input: { lawyerId: number; side: PartySide; leadCounsel: boolean }) =>
      api.post<CaseDetail>(`/cases/${id}/lawyers`, input),
    { success: 'Counsel added' },
  )
}

export function useRemoveLawyer(id: number) {
  return useAction((lawyerId: number) => api.delete<CaseDetail>(`/cases/${id}/lawyers/${lawyerId}`), {
    success: 'Counsel removed',
    toastErrors: true,
  })
}

export function useChangeStatus(id: number) {
  return useAction((input: { status: CaseStatus; note?: string }) => api.post<CaseDetail>(`/cases/${id}/status`, input), {
    success: 'Case status updated',
  })
}
