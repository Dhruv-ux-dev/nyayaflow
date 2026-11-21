import { AlertCircle } from 'lucide-react'

import { Badge, type Tone } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { caseStatusHints, caseStatusLabels, deadlineStatusLabels, hearingStatusLabels, priorityLabels } from '@/lib/labels'
import type { CaseStatus, DeadlineStatus, HearingStatus, Priority } from '@/lib/types'

export const caseStatusTone: Record<CaseStatus, Tone> = {
  FILED: 'filed',
  UNDER_REVIEW: 'review',
  ACTIVE: 'active',
  AWAITING_DECISION: 'reserved',
  DISPOSED: 'disposed',
  CLOSED: 'closed',
}

export function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  return (
    <Badge tone={caseStatusTone[status]} dot className={className} title={caseStatusHints[status]}>
      {caseStatusLabels[status]}
    </Badge>
  )
}

export function HearingStatusBadge({ status, outcomePending }: { status: HearingStatus; outcomePending?: boolean }) {
  if (outcomePending) {
    return (
      <Badge tone="danger" dot>
        Outcome pending
      </Badge>
    )
  }
  const tone: Record<HearingStatus, Tone> = { SCHEDULED: 'info', COMPLETED: 'success', ADJOURNED: 'warning', CANCELLED: 'neutral' }
  return (
    <Badge tone={tone[status]} dot>
      {hearingStatusLabels[status]}
    </Badge>
  )
}

export function DeadlineStatusBadge({ status }: { status: DeadlineStatus }) {
  const tone: Record<DeadlineStatus, Tone> = { PENDING: 'info', OVERDUE: 'danger', COMPLETED: 'success' }
  return (
    <Badge tone={tone[status]} dot>
      {deadlineStatusLabels[status]}
    </Badge>
  )
}

/** Normal and low priority stay quiet; only matters needing attention are marked. */
export function PriorityTag({ priority, quiet = false }: { priority: Priority; quiet?: boolean }) {
  if (priority === 'URGENT') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
        <AlertCircle className="size-3.5" aria-hidden="true" />
        Urgent
      </span>
    )
  }
  if (priority === 'HIGH') return <span className="text-xs font-semibold text-warning">High priority</span>
  if (quiet) return null
  return <span className="text-xs text-muted">{priorityLabels[priority]}</span>
}

/** "Due today", "Due in 3 days", "4 days overdue". */
export function DueLabel({ days, status, className }: { days: number; status: DeadlineStatus; className?: string }) {
  if (status === 'COMPLETED') return <span className={cn('text-xs text-muted', className)}>Completed</span>
  const text =
    days < 0 ? `${-days} day${days === -1 ? '' : 's'} overdue` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`
  const tone = days < 0 ? 'text-danger font-semibold' : days <= 2 ? 'text-warning font-semibold' : 'text-muted'
  return <span className={cn('text-xs tabular', tone, className)}>{text}</span>
}
