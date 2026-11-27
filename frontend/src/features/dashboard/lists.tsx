import {
  CalendarClock,
  FileClock,
  FileText,
  FolderOpen,
  Gavel,
  KeyRound,
  ListChecks,
  NotebookPen,
  ScrollText,
  Settings2,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import { CaseStatusBadge, DueLabel, PriorityTag } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'
import { formatDate, formatTime, formatWeekday, relativeDay, timeAgo } from '@/lib/format'
import { caseTypeLabels, hearingTypeLabels, orderTypeLabels } from '@/lib/labels'
import type { AuditCategory, AuditEvent, CaseSummary, CourtOrder, Deadline, Hearing } from '@/lib/types'

/** Upcoming hearings as an agenda, grouped by day. */
export function HearingAgenda({
  hearings,
  empty = 'Nothing listed in this period.',
  showJudge = true,
}: {
  hearings: Hearing[]
  empty?: string
  showJudge?: boolean
}) {
  if (hearings.length === 0) return <EmptyState compact icon={CalendarClock} title={empty} />
  const days = new Map<string, Hearing[]>()
  for (const hearing of hearings) {
    const day = hearing.scheduledAt.slice(0, 10)
    days.set(day, [...(days.get(day) ?? []), hearing])
  }
  return (
    <div className="divide-y divide-line">
      {[...days.entries()].map(([day, items]) => {
        const date = new Date(`${day}T00:00:00`)
        return (
          <div key={day} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 px-4 py-3.5 sm:px-5">
            <div className="text-center">
              <p className="eyebrow text-faint">{date.toLocaleString('en-IN', { weekday: 'short' })}</p>
              <p className="tabular text-[1.35rem] leading-tight font-semibold text-ink">{date.getDate()}</p>
              <p className="text-[11px] text-muted">{date.toLocaleString('en-IN', { month: 'short' })}</p>
            </div>
            <ul className="min-w-0 space-y-3">
              <li className="text-xs font-medium text-role">{relativeDay(day)}</li>
              {items.map((hearing) => (
                <li key={hearing.id}>
                  <Link to={`/cases/${hearing.courtCase.id}?tab=hearings`} className="group block">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="tabular text-sm font-semibold text-ink">{formatTime(hearing.scheduledAt)}</span>
                      <CaseNumber value={hearing.courtCase.caseNumber} />
                      <span className="text-xs text-muted">{hearingTypeLabels[hearing.hearingType]}</span>
                    </span>
                    <CaseTitle title={hearing.courtCase.title} className="block truncate text-[15px] text-ink group-hover:underline" />
                    <span className="block truncate text-xs text-muted">
                      {hearing.courtroom?.name ?? 'Courtroom to be assigned'}
                      {showJudge && hearing.judge ? ` · before ${hearing.judge.fullName}` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export function DeadlineList({ deadlines, empty = 'No deadlines are due' }: { deadlines: Deadline[]; empty?: string }) {
  if (deadlines.length === 0) {
    return <EmptyState compact icon={ListChecks} title={empty} description="Overdue and upcoming deadlines appear here." />
  }
  return (
    <ul className="divide-y divide-line">
      {deadlines.map((deadline) => {
        const overdue = deadline.status === 'OVERDUE'
        return (
          <li key={deadline.id}>
            <Link
              to={`/cases/${deadline.courtCase.id}?tab=deadlines`}
              className={cn('relative block px-4 py-3 transition-colors hover:bg-ivory sm:px-5', overdue && 'bg-danger-soft/30')}
            >
              {overdue && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-danger" aria-hidden="true" />}
              <span className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-ink">{deadline.title}</span>
                <DueLabel days={deadline.daysUntilDue} status={deadline.status} className="shrink-0 pt-0.5" />
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                <CaseNumber value={deadline.courtCase.caseNumber} className="text-xs" />
                <span>{deadline.assignedTo ? deadline.assignedTo.fullName : 'Unassigned'}</span>
                <PriorityTag priority={deadline.priority} quiet />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function CaseList({ cases, empty, showType = false }: { cases: CaseSummary[]; empty: string; showType?: boolean }) {
  if (cases.length === 0) return <EmptyState compact icon={Gavel} title={empty} />
  return (
    <ul className="divide-y divide-line">
      {cases.map((item) => (
        <li key={item.id}>
          <Link to={`/cases/${item.id}`} className="block px-4 py-3 transition-colors hover:bg-ivory sm:px-5">
            <span className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <CaseNumber value={item.caseNumber} />
                {showType && <span className="truncate text-xs text-muted">{caseTypeLabels[item.caseType]}</span>}
              </span>
              <CaseStatusBadge status={item.status} />
            </span>
            <CaseTitle title={item.title} className="mt-0.5 block truncate text-[15px] text-ink" />
            <span className="block truncate text-xs text-muted">
              Filed {formatDate(item.filingDate)}
              {item.judge ? ` · before ${item.judge.fullName}` : ' · no judge allocated'}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function OutcomeList({ hearings, actionLabel }: { hearings: Hearing[]; actionLabel?: string }) {
  if (hearings.length === 0) return <EmptyState compact icon={FileClock} title="Every held hearing has an outcome" />
  return (
    <ul className="divide-y divide-line">
      {hearings.map((hearing) => (
        <li key={hearing.id}>
          <Link
            to={actionLabel ? `/cases/${hearing.courtCase.id}?action=conclude&hearing=${hearing.id}` : `/cases/${hearing.courtCase.id}?tab=hearings`}
            className="group block px-4 py-3 transition-colors hover:bg-ivory sm:px-5"
          >
            <span className="flex items-center justify-between gap-3">
              <CaseNumber value={hearing.courtCase.caseNumber} />
              <span className="text-xs font-medium text-danger">Held {relativeDay(hearing.scheduledAt).toLowerCase()}</span>
            </span>
            <CaseTitle title={hearing.courtCase.title} className="mt-0.5 block truncate text-[15px] text-ink" />
            <span className="flex items-center justify-between gap-2 text-xs text-muted">
              <span className="truncate">
                {hearingTypeLabels[hearing.hearingType]} at {formatTime(hearing.scheduledAt)}
                {hearing.courtroom ? `, ${hearing.courtroom.name}` : ''}
              </span>
              {actionLabel && <span className="shrink-0 font-medium text-brand group-hover:underline">{actionLabel}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function OrderList({ orders, empty = 'No orders yet' }: { orders: CourtOrder[]; empty?: string }) {
  if (orders.length === 0) return <EmptyState compact icon={ScrollText} title={empty} />
  return (
    <ul className="divide-y divide-line">
      {orders.map((order) => {
        const final = order.orderType === 'FINAL_ORDER' || order.orderType === 'JUDGMENT'
        return (
          <li key={order.id}>
            <Link to={`/cases/${order.courtCase.id}?tab=orders`} className="flex gap-3 px-4 py-3 transition-colors hover:bg-ivory sm:px-5">
              <span
                className={cn(
                  'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                  final ? 'bg-disposed-soft text-disposed' : 'bg-sunken text-ink-soft',
                )}
              >
                <ScrollText className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <CaseNumber value={order.courtCase.caseNumber} className="text-xs" />
                  <span>{formatDate(order.orderDate)}</span>
                </span>
                <span className="mt-0.5 block truncate text-sm font-medium text-ink">{order.title}</span>
                <span className="mt-1 block">
                  <Badge tone={final ? 'disposed' : order.orderType === 'DIRECTION' ? 'info' : 'neutral'}>{orderTypeLabels[order.orderType]}</Badge>
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

const categoryIcon: Record<AuditCategory, LucideIcon> = {
  ACCESS: KeyRound,
  USERS: UserCog,
  CONFIGURATION: Settings2,
  CASES: FolderOpen,
  HEARINGS: Gavel,
  DOCUMENTS: FileText,
  PROCEEDINGS: NotebookPen,
  ORDERS: ScrollText,
  DEADLINES: ListChecks,
}

/** Audit events as a vertical feed with a category glyph on a connecting rule. */
export function ActivityFeed({ events, empty = 'No recent activity' }: { events: AuditEvent[]; empty?: string }) {
  if (events.length === 0) return <EmptyState compact title={empty} />
  return (
    <ol className="px-4 py-3 sm:px-5">
      {events.map((event, index) => {
        const Icon = categoryIcon[event.category] ?? FolderOpen
        const body = (
          <>
            <p className="text-[13px] leading-snug text-ink-soft group-hover:text-ink">{event.summary}</p>
            <p className="mt-0.5 text-xs text-muted">
              <span className="font-medium text-ink-soft">{event.actorName ?? 'System'}</span> · {timeAgo(event.occurredAt)}
            </p>
          </>
        )
        return (
          <li key={event.id} className="relative flex gap-3 pb-3.5 last:pb-0">
            {index < events.length - 1 && <span className="absolute top-7 bottom-0 left-[13px] w-px bg-line" aria-hidden="true" />}
            <span className="relative grid size-7 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              {event.caseId ? (
                <Link to={`/cases/${event.caseId}?tab=activity`} className="group block">
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Compact day header used by agenda-style lists. */
export function DayHeading({ day }: { day: string }) {
  return (
    <h3 className="flex items-baseline gap-2 border-b border-line bg-ivory px-4 py-2 text-[13px] font-semibold text-ink sm:px-5">
      {formatWeekday(day)}
      <span className="font-normal text-muted">{relativeDay(day)}</span>
    </h3>
  )
}
