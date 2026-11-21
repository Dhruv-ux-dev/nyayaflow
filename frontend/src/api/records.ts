import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { CaseDocument, CourtOrder, DocumentType, OrderType, Page, Proceeding } from '@/lib/types'

import { useAction } from './mutation'

// ---------------------------------------------------------------- proceedings

export function useCaseProceedings(caseId: number) {
  return useQuery({ queryKey: ['case', caseId, 'proceedings'], queryFn: () => api.get<Proceeding[]>(`/cases/${caseId}/proceedings`) })
}

export function useRecordProceeding(caseId: number) {
  return useAction(
    (input: { hearingId?: number | null; proceedingDate: string; summary: string; remarks?: string }) =>
      api.post<Proceeding>(`/cases/${caseId}/proceedings`, input),
    { success: 'Proceedings recorded' },
  )
}

export function useUpdateProceeding() {
  return useAction(
    ({ id, ...input }: { id: number; summary: string; remarks?: string }) => api.put<Proceeding>(`/proceedings/${id}`, input),
    { success: 'Proceedings updated' },
  )
}

// ---------------------------------------------------------------- orders

export function useCaseOrders(caseId: number) {
  return useQuery({ queryKey: ['case', caseId, 'orders'], queryFn: () => api.get<CourtOrder[]>(`/cases/${caseId}/orders`) })
}

export function useOrders(query: { q?: string; type?: OrderType[]; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['orders', query],
    queryFn: () => api.get<Page<CourtOrder>>('/orders', { ...query }),
    placeholderData: keepPreviousData,
  })
}

export function useIssueOrder(caseId: number) {
  return useAction(
    (input: { orderType: OrderType; title: string; content: string; remarks?: string; orderDate: string; hearingId?: number | null }) =>
      api.post<CourtOrder>(`/cases/${caseId}/orders`, input),
    { success: (order) => `${order.title} issued` },
  )
}

// ---------------------------------------------------------------- documents

export function useCaseDocuments(caseId: number) {
  return useQuery({ queryKey: ['case', caseId, 'documents'], queryFn: () => api.get<CaseDocument[]>(`/cases/${caseId}/documents`) })
}

export function useDocuments(query: { q?: string; type?: DocumentType[]; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['documents', query],
    queryFn: () => api.get<Page<CaseDocument>>('/documents', { ...query }),
    placeholderData: keepPreviousData,
  })
}

export function useUploadDocument(caseId: number) {
  return useAction(
    (input: { file: File; title?: string; documentType: DocumentType; description?: string }) => {
      const form = new FormData()
      form.append('file', input.file)
      form.append('documentType', input.documentType)
      if (input.title) form.append('title', input.title)
      if (input.description) form.append('description', input.description)
      return api.upload<CaseDocument>(`/cases/${caseId}/documents`, form)
    },
    { success: (doc) => `Uploaded ${doc.title}` },
  )
}

export function useAddDocumentVersion() {
  return useAction(
    ({ id, file, changeNote }: { id: number; file: File; changeNote?: string }) => {
      const form = new FormData()
      form.append('file', file)
      if (changeNote) form.append('changeNote', changeNote)
      return api.upload<CaseDocument>(`/documents/${id}/versions`, form)
    },
    { success: (doc) => `Version ${doc.currentVersion} uploaded` },
  )
}

export function useUpdateDocument() {
  return useAction(
    ({ id, ...input }: { id: number; title: string; documentType: DocumentType; description?: string }) =>
      api.put<CaseDocument>(`/documents/${id}`, input),
    { success: 'Document details saved' },
  )
}

export function useDeleteDocument() {
  return useAction((id: number) => api.delete(`/documents/${id}`), { success: 'Document removed', toastErrors: true })
}
