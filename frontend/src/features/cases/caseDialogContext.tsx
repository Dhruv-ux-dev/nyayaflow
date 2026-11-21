import { createContext, useContext } from 'react'

import type { CaseDocument, Deadline, Hearing, Proceeding } from '@/lib/types'

/** Every dialog the case page can open. Tabs request one; the page renders it. */
export type CaseDialog =
  | { kind: 'status' }
  | { kind: 'assign' }
  | { kind: 'lawyer' }
  | { kind: 'schedule' }
  | { kind: 'reschedule'; hearing: Hearing }
  | { kind: 'cancel'; hearing: Hearing }
  | { kind: 'conclude'; hearing: Hearing }
  | { kind: 'proceeding'; proceeding?: Proceeding }
  | { kind: 'order' }
  | { kind: 'upload' }
  | { kind: 'version'; document: CaseDocument }
  | { kind: 'editDocument'; document: CaseDocument }
  | { kind: 'deadline'; deadline?: Deadline }

export const CaseDialogContext = createContext<((dialog: CaseDialog) => void) | null>(null)

export function useOpenCaseDialog() {
  const open = useContext(CaseDialogContext)
  if (!open) throw new Error('useOpenCaseDialog must be used inside the case page')
  return open
}
