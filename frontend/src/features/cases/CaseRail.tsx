import { CalendarClock, CalendarPlus, ListChecks, MapPin, ScrollText, Users } from 'lucide-react'
import type { ReactNode } from 'react'

import { DueLabel, HearingStatusBadge } from '@/components/domain/badges'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { formatDate, formatTime, relativeDay } from '@/lib/format'
import { hearingTypeLabels, orderTypeLabels, sideLabels } from '@/lib/labels'
import type { CaseDetail, CourtOrder, Deadline, Hearing } from '@/lib/types'

import { useOpenCaseDialog } from './caseDialogContext'
import { HearingActions } from './tabs/HearingsTab'

function RailCard({
  title,
  icon,
  action,
  children,
  className,
}: {
  title: string
  icon: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface shadow-raised', className)}>
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink [&_svg]:size-4 [&_svg]:text-muted">
          {icon}
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  )
}

function RailLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-brand hover:underline">
      {children}
    </button>
  )
}

/** The case at a glance, kept beside every tab: next listing, what is due, the latest order and counsel. */
export function CaseRail({
  courtCase,
  hearings,
  deadlines,
  orders,
  onTab,
}: {
  courtCase: CaseDetail
  hearings?: Hearing[]
  deadlines?: Deadline[]
  orders?: CourtOrder[]
  onTab: (tab: string) => void
}) {
  const open = useOpenCaseDialog()
  const next = hearings?.filter((h) => h.status === 'SCHEDULED').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0]
  const openDeadlines = (deadlines ?? []).filter((d) => d.status !== 'COMPLETED').sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  const latestOrder = orders?.[orders.length - 1]
  const labels = sideLabels[courtCase.caseType]

  return (
    <aside className="min-w-0 space-y-4 xl:sticky xl:top-24 xl:self-start" aria-label="Case summary">
      <RailCard
        title="Next hearing"
        icon={<CalendarClock />}
        action={next && <HearingStatusBadge status={next.status} outcomePending={next.outcomePending} />}
      >
        {next ? (
          <div className="p-4">
            <div className="flex gap-3.5">
              <div className="w-14 shrink-0 overflow-hidden rounded-lg border border-line text-center">
                <p className="bg-role py-0.5 text-[10px] font-semibold text-white">
                  {new Date(next.scheduledAt).toLocaleString('en-IN', { month: 'short' })}
                </p>
                <p className="tabular py-0.5 text-xl leading-tight font-semibold text-ink">{new Date(next.scheduledAt).getDate()}</p>
                <p className="pb-0.5 text-[10px] text-muted">{new Date(next.scheduledAt).toLocaleString('en-IN', { weekday: 'short' })}</p>
              </div>
              <div className="min-w-0">
                <p className="tabular text-base font-semibold text-ink">
                  {formatTime(next.scheduledAt)} <span className="text-xs font-normal text-muted">{relativeDay(next.scheduledAt)}</span>
                </p>
                <p className="text-[13px] text-ink-soft">{hearingTypeLabels[next.hearingType]}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                  <MapPin className="size-3" aria-hidden="true" />
                  {next.courtroom?.name ?? 'Courtroom to be assigned'}
                </p>
              </div>
            </div>
            {next.purpose && <p className="mt-3 text-[13px] text-muted">{next.purpose}</p>}
            <div className="mt-3">
              <HearingActions courtCase={courtCase} hearing={next} />
            </div>
          </div>
        ) : (
          <div className="p-4 text-[13px] text-muted">
            {!courtCase.judge
              ? 'Allocate the case to a judge before listing it.'
              : courtCase.status === 'DISPOSED' || courtCase.status === 'CLOSED'
                ? 'The case has been decided; no further hearings are listed.'
                : 'No hearing is listed.'}
            {courtCase.permissions.canScheduleHearing && (
              <Button size="sm" variant="role" className="mt-3 w-full justify-center" onClick={() => open({ kind: 'schedule' })}>
                <CalendarPlus />
                Schedule hearing
              </Button>
            )}
          </div>
        )}
      </RailCard>

      <RailCard
        title={`Open deadlines${openDeadlines.length ? ` · ${openDeadlines.length}` : ''}`}
        icon={<ListChecks />}
        action={<RailLink onClick={() => onTab('deadlines')}>All</RailLink>}
      >
        {openDeadlines.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">Nothing is due in this case.</p>
        ) : (
          <ul className="divide-y divide-line">
            {openDeadlines.slice(0, 4).map((deadline) => (
              <li key={deadline.id} className={cn('px-4 py-2.5', deadline.status === 'OVERDUE' && 'bg-danger-soft/30')}>
                <p className="text-[13px] font-medium text-ink">{deadline.title}</p>
                <p className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">{deadline.assignedTo?.fullName ?? 'Unassigned'}</span>
                  <DueLabel days={deadline.daysUntilDue} status={deadline.status} className="shrink-0" />
                </p>
              </li>
            ))}
          </ul>
        )}
      </RailCard>

      <RailCard
        title="Latest order"
        icon={<ScrollText />}
        action={orders?.length ? <RailLink onClick={() => onTab('orders')}>All {orders.length}</RailLink> : undefined}
      >
        {latestOrder ? (
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge tone={latestOrder.orderType === 'JUDGMENT' || latestOrder.orderType === 'FINAL_ORDER' ? 'disposed' : 'neutral'}>
                {orderTypeLabels[latestOrder.orderType]}
              </Badge>
              {formatDate(latestOrder.orderDate)}
            </div>
            <p className="mt-1.5 text-sm font-medium text-ink">{latestOrder.title}</p>
            <p className="mt-1 line-clamp-3 font-serif text-[14px] leading-relaxed text-ink-soft">{latestOrder.content}</p>
          </div>
        ) : (
          <p className="p-4 text-[13px] text-muted">No orders have been issued.</p>
        )}
      </RailCard>

      <RailCard title="Counsel" icon={<Users />} action={<RailLink onClick={() => onTab('parties')}>Details</RailLink>}>
        {courtCase.lawyers.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">No counsel has entered appearance.</p>
        ) : (
          <ul className="space-y-2.5 p-4">
            {courtCase.lawyers.map((lawyer) => (
              <li key={lawyer.lawyerId} className="flex items-center gap-2.5">
                <Avatar name={lawyer.fullName} role="LAWYER" size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{lawyer.fullName}</span>
                  <span className="block truncate text-[11px] text-muted">
                    For the {labels[lawyer.side].toLowerCase()}
                    {lawyer.leadCounsel ? ' · lead' : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </RailCard>
    </aside>
  )
}
