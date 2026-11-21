// Shapes returned by the NyayaFlow API. Date-only values are ISO dates ("2026-10-12"),
// court times are local date-times without zone ("2026-10-12T10:30:00"), and system
// timestamps are ISO instants ("2026-10-08T19:53:17Z").

export type Role = 'ADMIN' | 'JUDGE' | 'LAWYER' | 'STAFF'
export type CaseStatus = 'FILED' | 'UNDER_REVIEW' | 'ACTIVE' | 'AWAITING_DECISION' | 'DISPOSED' | 'CLOSED'
export type CaseType =
  | 'CIVIL_SUIT'
  | 'COMMERCIAL_SUIT'
  | 'CRIMINAL_CASE'
  | 'BAIL_APPLICATION'
  | 'WRIT_PETITION'
  | 'CIVIL_APPEAL'
  | 'CRIMINAL_APPEAL'
  | 'FAMILY_MATTER'
  | 'ARBITRATION'
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type PartySide = 'PETITIONER' | 'RESPONDENT'
export type PartyType = 'INDIVIDUAL' | 'ORGANIZATION' | 'GOVERNMENT'
export type HearingType =
  | 'FIRST_HEARING'
  | 'FRAMING_OF_ISSUES'
  | 'EVIDENCE'
  | 'INTERIM_APPLICATION'
  | 'ARGUMENTS'
  | 'FINAL_ARGUMENTS'
  | 'JUDGMENT_PRONOUNCEMENT'
export type HearingStatus = 'SCHEDULED' | 'COMPLETED' | 'ADJOURNED' | 'CANCELLED'
export type OrderType = 'INTERIM_ORDER' | 'DIRECTION' | 'FINAL_ORDER' | 'JUDGMENT'
export type DocumentType =
  | 'PETITION'
  | 'APPLICATION'
  | 'REPLY'
  | 'AFFIDAVIT'
  | 'EVIDENCE'
  | 'NOTICE'
  | 'ORDER'
  | 'JUDGMENT'
  | 'OTHER'
export type DeadlineStatus = 'PENDING' | 'OVERDUE' | 'COMPLETED'
export type DeadlineView = 'ALL' | 'OPEN' | 'OVERDUE' | 'DUE_SOON' | 'COMPLETED'
export type NotificationType =
  | 'CASE_ASSIGNED'
  | 'CASE_UNASSIGNED'
  | 'LAWYER_ADDED'
  | 'LAWYER_REMOVED'
  | 'CASE_STATUS_CHANGED'
  | 'HEARING_SCHEDULED'
  | 'HEARING_RESCHEDULED'
  | 'HEARING_CANCELLED'
  | 'HEARING_CONCLUDED'
  | 'DOCUMENT_UPLOADED'
  | 'PROCEEDING_RECORDED'
  | 'ORDER_ISSUED'
  | 'DEADLINE_ASSIGNED'
  | 'DEADLINE_APPROACHING'
  | 'ACCOUNT_UPDATED'
export type AuditCategory =
  | 'ACCESS'
  | 'USERS'
  | 'CONFIGURATION'
  | 'CASES'
  | 'HEARINGS'
  | 'DOCUMENTS'
  | 'PROCEEDINGS'
  | 'ORDERS'
  | 'DEADLINES'

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface UserRef {
  id: number
  fullName: string
  role: Role
  designation: string | null
}

export interface CourtRef {
  id: number
  code: string
  name: string
}

export interface CourtroomRef {
  id: number
  name: string
  floor: string | null
}

export interface User {
  id: number
  fullName: string
  email: string
  role: Role
  designation: string | null
  phone: string | null
  barRegistrationNumber: string | null
  court: CourtRef | null
  active: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface DirectoryEntry {
  id: number
  fullName: string
  role: Role
  designation: string | null
  barRegistrationNumber: string | null
  courtId: number | null
}

export interface Courtroom {
  id: number
  name: string
  floor: string | null
  active: boolean
}

export interface Court {
  id: number
  code: string
  name: string
  city: string
  address: string | null
  active: boolean
  courtrooms: Courtroom[]
}

export interface Party {
  id: number
  side: PartySide
  partyType: PartyType
  name: string
  address: string | null
}

export interface CaseLawyer {
  lawyerId: number
  fullName: string
  barRegistrationNumber: string | null
  email: string
  phone: string | null
  side: PartySide
  leadCounsel: boolean
  addedAt: string
}

export interface CaseSummary {
  id: number
  caseNumber: string
  title: string
  caseType: CaseType
  status: CaseStatus
  priority: Priority
  filingDate: string
  court: CourtRef
  judge: UserRef | null
  petitioner: string | null
  respondent: string | null
  lawyers: string[]
  nextHearingAt: string | null
  updatedAt: string
}

export interface CasePermissions {
  canEdit: boolean
  canAssignJudge: boolean
  canManageLawyers: boolean
  allowedStatusChanges: CaseStatus[]
  canScheduleHearing: boolean
  canManageHearings: boolean
  canRecordProceeding: boolean
  canIssueOrder: boolean
  canUploadDocument: boolean
  canManageDeadlines: boolean
}

export interface StatusChange {
  id: number
  fromStatus: CaseStatus | null
  toStatus: CaseStatus
  note: string | null
  changedBy: UserRef | null
  changedAt: string
}

export interface CaseDetail {
  id: number
  caseNumber: string
  title: string
  caseType: CaseType
  description: string | null
  status: CaseStatus
  priority: Priority
  filingDate: string
  court: CourtRef
  courtroom: CourtroomRef | null
  judge: UserRef | null
  parties: Party[]
  lawyers: CaseLawyer[]
  nextHearingAt: string | null
  disposedOn: string | null
  closedOn: string | null
  createdBy: UserRef | null
  createdAt: string
  updatedAt: string
  version: number
  statusHistory: StatusChange[]
  permissions: CasePermissions
}

export interface CaseRef {
  id: number
  caseNumber: string
  title: string
  parties: string
  status: CaseStatus
}

export interface Hearing {
  id: number
  courtCase: CaseRef
  judge: UserRef | null
  courtroom: CourtroomRef | null
  scheduledAt: string
  endsAt: string
  durationMinutes: number
  hearingType: HearingType
  status: HearingStatus
  purpose: string | null
  outcome: string | null
  rescheduleCount: number
  statusReason: string | null
  outcomePending: boolean
  createdBy: UserRef | null
  createdAt: string
  updatedAt: string
}

export interface SchedulingConflict {
  hearingId: number
  caseId: number
  caseNumber: string
  scheduledAt: string
  endsAt: string
  judgeName: string | null
  courtroomName: string | null
  reasons: Array<'JUDGE_BUSY' | 'COURTROOM_BUSY'>
}

export interface HearingBrief {
  id: number
  scheduledAt: string
  hearingType: HearingType
}

export interface Proceeding {
  id: number
  caseId: number
  hearing: HearingBrief | null
  proceedingDate: string
  summary: string
  remarks: string | null
  recordedBy: UserRef
  createdAt: string
  updatedAt: string
  editable: boolean
}

export interface CourtOrder {
  id: number
  courtCase: CaseRef
  hearing: HearingBrief | null
  orderType: OrderType
  title: string
  content: string
  remarks: string | null
  orderDate: string
  issuedBy: UserRef
  createdAt: string
}

export interface DocumentVersion {
  id: number
  versionNumber: number
  originalFilename: string
  contentType: string
  sizeBytes: number
  sha256: string
  changeNote: string | null
  uploadedBy: UserRef
  uploadedAt: string
}

export interface CaseDocument {
  id: number
  courtCase: CaseRef
  title: string
  documentType: DocumentType
  description: string | null
  currentVersion: number
  versions: DocumentVersion[]
  uploadedBy: UserRef
  createdAt: string
  updatedAt: string
  canModify: boolean
}

export interface Deadline {
  id: number
  courtCase: CaseRef
  title: string
  description: string | null
  dueDate: string
  daysUntilDue: number
  priority: Priority
  status: DeadlineStatus
  assignedTo: UserRef | null
  createdBy: UserRef
  completedAt: string | null
  completedBy: UserRef | null
  createdAt: string
  canEdit: boolean
  canComplete: boolean
}

export interface NotificationItem {
  id: number
  type: NotificationType
  title: string
  message: string
  caseId: number | null
  read: boolean
  createdAt: string
}

export interface AuditEvent {
  id: number
  occurredAt: string
  actorId: number | null
  actorName: string | null
  action: string
  category: AuditCategory
  entityType: string | null
  entityId: number | null
  caseId: number | null
  summary: string
}

export type TimelineKind = 'FILED' | 'ASSIGNMENT' | 'STATUS' | 'HEARING' | 'PROCEEDING' | 'DOCUMENT' | 'ORDER'

export interface TimelineEntry {
  id: string
  kind: TimelineKind
  occurredAt: string
  title: string
  description: string | null
  actor: string | null
  tag: string | null
  milestone: boolean
  upcoming: boolean
  refId: number | null
}

export type StatTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface DashboardStat {
  key: string
  label: string
  value: number
  hint: string
  tone: StatTone
  link: string | null
}

export interface NamedCount {
  key: string
  label: string
  count: number
}

export interface Dashboard {
  role: Role
  stats: DashboardStat[]
  todaysHearings?: Hearing[]
  upcomingHearings?: Hearing[]
  pendingOutcomes?: Hearing[]
  deadlines?: Deadline[]
  attention?: { title: string; description: string; cases: CaseSummary[]; link: string }
  recentOrders?: CourtOrder[]
  recentActivity?: AuditEvent[]
  charts?: {
    casesByStatus?: NamedCount[]
    casesByType?: NamedCount[]
    institutionVsDisposal?: Array<{ month: string; instituted: number; disposed: number }>
    pendingByJudge?: NamedCount[]
    hearingLoad?: Array<{ date: string; count: number }>
  }
}

export interface LoginResponse {
  token: string
  expiresAt: string
  user: User
}
