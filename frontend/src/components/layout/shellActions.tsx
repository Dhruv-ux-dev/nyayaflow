import { createContext, useContext } from 'react'

import type { CaseQuery } from '@/api/cases'

/**
 * Case-level actions that start from outside a case (dashboards, sidebars): the user first picks
 * the case, then lands on its page with the matching dialog open (see `?action=` on CaseDetailPage).
 */
export type CaseIntent = 'open' | 'upload' | 'schedule' | 'assign' | 'order' | 'deadline' | 'conclude' | 'history'

export interface CasePickerRequest {
  intent: CaseIntent
  title: string
  description?: string
  /** Narrows the cases offered, e.g. only filed cases for allocation. */
  filter?: Partial<CaseQuery>
}

export interface ShellActions {
  openSearch: () => void
  pickCase: (request: CasePickerRequest) => void
}

export const ShellActionsContext = createContext<ShellActions | null>(null)

export function useShellActions() {
  const value = useContext(ShellActionsContext)
  if (!value) throw new Error('useShellActions must be used inside the app shell')
  return value
}

/** Where a picked case should take the user for each intent. */
export function caseIntentPath(caseId: number, intent: CaseIntent) {
  if (intent === 'open') return `/cases/${caseId}`
  if (intent === 'history') return `/cases/${caseId}?tab=timeline`
  return `/cases/${caseId}?action=${intent}`
}
