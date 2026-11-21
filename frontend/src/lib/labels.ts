import type {
  AuditCategory,
  CaseStatus,
  CaseType,
  DeadlineStatus,
  DocumentType,
  HearingStatus,
  HearingType,
  OrderType,
  PartySide,
  PartyType,
  Priority,
  Role,
} from './types'

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrator',
  JUDGE: 'Judge',
  LAWYER: 'Lawyer',
  STAFF: 'Court staff',
}

export const caseStatusLabels: Record<CaseStatus, string> = {
  FILED: 'Filed',
  UNDER_REVIEW: 'Under review',
  ACTIVE: 'Active',
  AWAITING_DECISION: 'Awaiting decision',
  DISPOSED: 'Disposed',
  CLOSED: 'Closed',
}

/** Lifecycle order, used by the docket strip and status filters. */
export const caseStatuses: CaseStatus[] = ['FILED', 'UNDER_REVIEW', 'ACTIVE', 'AWAITING_DECISION', 'DISPOSED', 'CLOSED']
export const pendingStatuses: CaseStatus[] = ['FILED', 'UNDER_REVIEW', 'ACTIVE', 'AWAITING_DECISION']

export const caseStatusHints: Record<CaseStatus, string> = {
  FILED: 'Registered and awaiting allocation to a judge',
  UNDER_REVIEW: 'Allocated; preliminary hearing pending',
  ACTIVE: 'Being heard',
  AWAITING_DECISION: 'Arguments concluded; judgment reserved',
  DISPOSED: 'Decided by a final order or judgment',
  CLOSED: 'Record consigned; no further action',
}

export const caseTypeLabels: Record<CaseType, string> = {
  CIVIL_SUIT: 'Civil suit',
  COMMERCIAL_SUIT: 'Commercial suit',
  CRIMINAL_CASE: 'Criminal case',
  BAIL_APPLICATION: 'Bail application',
  WRIT_PETITION: 'Writ petition',
  CIVIL_APPEAL: 'Civil appeal',
  CRIMINAL_APPEAL: 'Criminal appeal',
  FAMILY_MATTER: 'Family / matrimonial',
  ARBITRATION: 'Arbitration petition',
}

/** How each side is addressed in a given type of matter. */
export const sideLabels: Record<CaseType, Record<PartySide, string>> = {
  CIVIL_SUIT: { PETITIONER: 'Plaintiff', RESPONDENT: 'Defendant' },
  COMMERCIAL_SUIT: { PETITIONER: 'Plaintiff', RESPONDENT: 'Defendant' },
  CRIMINAL_CASE: { PETITIONER: 'Complainant', RESPONDENT: 'Accused' },
  BAIL_APPLICATION: { PETITIONER: 'Applicant', RESPONDENT: 'Respondent' },
  WRIT_PETITION: { PETITIONER: 'Petitioner', RESPONDENT: 'Respondent' },
  CIVIL_APPEAL: { PETITIONER: 'Appellant', RESPONDENT: 'Respondent' },
  CRIMINAL_APPEAL: { PETITIONER: 'Appellant', RESPONDENT: 'Respondent' },
  FAMILY_MATTER: { PETITIONER: 'Petitioner', RESPONDENT: 'Respondent' },
  ARBITRATION: { PETITIONER: 'Petitioner', RESPONDENT: 'Respondent' },
}

export const partyTypeLabels: Record<PartyType, string> = {
  INDIVIDUAL: 'Individual',
  ORGANIZATION: 'Organisation',
  GOVERNMENT: 'Government / State',
}

export const priorityLabels: Record<Priority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export const hearingTypeLabels: Record<HearingType, string> = {
  FIRST_HEARING: 'First hearing',
  FRAMING_OF_ISSUES: 'Framing of issues',
  EVIDENCE: 'Evidence',
  INTERIM_APPLICATION: 'Interim application',
  ARGUMENTS: 'Arguments',
  FINAL_ARGUMENTS: 'Final arguments',
  JUDGMENT_PRONOUNCEMENT: 'Pronouncement of judgment',
}

export const hearingStatusLabels: Record<HearingStatus, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  ADJOURNED: 'Adjourned',
  CANCELLED: 'Cancelled',
}

export const orderTypeLabels: Record<OrderType, string> = {
  INTERIM_ORDER: 'Interim order',
  DIRECTION: 'Direction',
  FINAL_ORDER: 'Final order',
  JUDGMENT: 'Judgment',
}

export const documentTypeLabels: Record<DocumentType, string> = {
  PETITION: 'Petition / plaint',
  APPLICATION: 'Application',
  REPLY: 'Reply / written statement',
  AFFIDAVIT: 'Affidavit',
  EVIDENCE: 'Evidence',
  NOTICE: 'Notice',
  ORDER: 'Order copy',
  JUDGMENT: 'Judgment copy',
  OTHER: 'Other',
}

export const deadlineStatusLabels: Record<DeadlineStatus, string> = {
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
  COMPLETED: 'Completed',
}

export const auditCategoryLabels: Record<AuditCategory, string> = {
  ACCESS: 'Sign-ins',
  USERS: 'Users',
  CONFIGURATION: 'Configuration',
  CASES: 'Cases',
  HEARINGS: 'Hearings',
  DOCUMENTS: 'Documents',
  PROCEEDINGS: 'Proceedings',
  ORDERS: 'Orders',
  DEADLINES: 'Deadlines',
}

export function options<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))
}
