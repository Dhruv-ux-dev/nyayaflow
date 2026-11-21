import { CalendarClock, FileClock, Gavel, ListChecks, ScrollText } from 'lucide-react'
import { Link } from 'react-router'

import { CaseStatusBadge, DueLabel, PriorityTag } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { EmptyState } from '@/components/ui/feedback'
import { formatDate, formatTime, formatWeekday, relativeDay, timeAgo } from '@/lib/format'
import { hearingTypeLabels, orderTypeLabels } from '@/lib/labels'
import type { AuditEvent, CaseSummary, CourtOrder, Deadline, Hearing } from '@/lib/types'

/** Upcoming hearings as an agenda, grouped by day. */
export function HearingAgenda({ hearings, empty = 'Nothing listed in this period.' }: { hearings: Hearing[]; empty?: string }) {
  if (hearings.length === 0) return <EmptyState icon={CalendarClock} title={empty} className="py-8" />
  const days = new Map<string, Hearing[]>()
  for (const hearing of hearings) {
    const day = hearing.scheduledAt.slice(0, 10)
    days.set(day, [...(days.get(day) ?? []), hearing])
  }
  return (
    <div className="divide-y divide-line">
      {[...days.entries()].map(([day, items]) => (
        <div key={day} className="grid grid-cols-[minmax(0,1fr)] gap-x-4 px-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
          <div className="pb-1 sm:pt-0.5">
            <p className="text-sm font-semibold text-ink">{formatWeekday(day)}</p>
            <p className="text-xs text-muted">{relativeDay(day)}</p>
          </div>
          <ul className="space-y-2.5">
            {items.map((hearing) => (
              <li key={hearing.id}>
                <Link to={`/cases/${hearing.courtCase.id}?tab=hearings`} className="group block">
                  <span className="flex items-baseline gap-2">
                    <span className="tabular text-sm font-semibold text-ink">{formatTime(hearing.scheduledAt)}</span>
                    <CaseNumber value={hearing.courtCase.caseNumber} />
                  </span>
                  <CaseTitle title={hearing.courtCase.title} className="block truncate text-[15px] text-ink group-hover:underline" />
                  <span className="block truncate text-xs text-muted">
                    {hearingTypeLabels[hearing.hearingType]}
                    {hearing.courtroom ? ` in ${hearing.courtroom.name}` : ''}
                    {hearing.judge ? `, before ${hearing.judge.fullName}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function DeadlineList({ deadlines }: { deadlines: Deadline[] }) {
  if (deadlines.length === 0) {
    return <EmptyState icon={ListChecks} title="No deadlines are due" description="Overdue and upcoming deadlines appear here." className="py-8" />
  }
  return (
    <ul className="divide-y divide-line">
      {deadlines.map((deadline) => (
        <li key={deadline.id}>
          <Link to={`/cases/${deadline.courtCase.id}?tab=deadlines`} className="block px-4 py-3 transition-colors hover:bg-paper">
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
      ))}
    </ul>
  )
}

export function CaseList({ cases, empty }: { cases: CaseSummary[]; empty: string }) {
  if (cases.length === 0) return <EmptyState icon={Gavel} title={empty} className="py-8" />
  return (
    <ul className="divide-y divide-line">
      {cases.map((item) => (
        <li key={item.id}>
          <Link to={`/cases/${item.id}`} className="block px-4 py-3 transition-colors hover:bg-paper">
            <span className="flex items-center justify-between gap-3">
              <CaseNumber value={item.caseNumber} />
              <CaseStatusBadge status={item.status} />
            </span>
            <CaseTitle title={item.title} className="mt-0.5 block truncate text-[15px] text-ink" />
            <span className="block text-xs text-muted">
              Filed {formatDate(item.filingDate)}
              {item.judge ? `, before ${item.judge.fullName}` : ''}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function OutcomeList({ hearings }: { hearings: Hearing[] }) {
  if (hearings.length === 0) return <EmptyState icon={FileClock} title="Every held hearing has an outcome" className="py-8" />
  return (
    <ul className="divide-y divide-line">
      {hearings.map((hearing) => (
        <li key={hearing.id}>
          <Link to={`/cases/${hearing.courtCase.id}?tab=hearings`} className="block px-4 py-3 transition-colors hover:bg-paper">
            <span className="flex items-center justify-between gap-3">
              <CaseNumber value={hearing.courtCase.caseNumber} />
              <span className="text-xs font-medium text-danger">{relativeDay(hearing.scheduledAt)}</span>
            </span>
            <CaseTitle title={hearing.courtCase.title} className="mt-0.5 block truncate text-[15px] text-ink" />
            <span className="block text-xs text-muted">
              {hearingTypeLabels[hearing.hearingType]} at {formatTime(hearing.scheduledAt)}
              {hearing.courtroom ? `, ${hearing.courtroom.name}` : ''}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function OrderList({ orders }: { orders: CourtOrder[] }) {
  if (orders.length === 0) return <EmptyState icon={ScrollText} title="No orders yet" className="py-8" />
  return (
    <ul className="divide-y divide-line">
      {orders.map((order) => (
        <li key={order.id}>
          <Link to={`/cases/${order.courtCase.id}?tab=orders`} className="block px-4 py-3 transition-colors hover:bg-paper">
            <span className="flex items-center justify-between gap-3 text-xs text-muted">
              <span>
                {orderTypeLabels[order.orderType]}, {formatDate(order.orderDate)}
              </span>
              <CaseNumber value={order.courtCase.caseNumber} className="text-xs" />
            </span>
            <span className="mt-0.5 block text-sm font-medium text-ink">{order.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function ActivityFeed({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return <EmptyState title="No recent activity" className="py-8" />
  return (
    <ol className="divide-y divide-line">
      {events.map((event) => {
        const body = (
          <>
            <p className="text-sm text-ink-soft">{event.summary}</p>
            <p className="mt-0.5 text-xs text-muted">
              {event.actorName ?? 'System'}, {timeAgo(event.occurredAt)}
            </p>
          </>
        )
        return (
          <li key={event.id}>
            {event.caseId ? (
              <Link to={`/cases/${event.caseId}?tab=activity`} className="block px-4 py-2.5 transition-colors hover:bg-paper">
                {body}
              </Link>
            ) : (
              <div className="px-4 py-2.5">{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
