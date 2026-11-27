import { addDays, format, isSameDay, parseISO } from 'date-fns'
import {
  AlarmClock,
  Bell,
  Briefcase,
  CalendarDays,
  CalendarRange,
  FilePlus2,
  FileStack,
  FileText,
  Gavel,
  ListOrdered,
  ListTodo,
  MapPin,
  ScrollText,
  Search,
  Upload,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { useDashboard } from '@/api/admin'
import { useCases } from '@/api/cases'
import { useCount } from '@/api/insights'
import { useMarkRead, useNotifications, useUnreadCount } from '@/api/notifications'
import { useDocuments } from '@/api/records'
import { useCurrentUser } from '@/auth/AuthContext'
import { CaseStatusBadge } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { useShellActions } from '@/components/layout/shellActions'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { KpiCard, KpiGrid } from '@/components/ui/kpi'
import { PageHeader, Panel, PanelLink } from '@/components/ui/panel'
import { cn } from '@/lib/cn'
import { formatDateTime, formatTime, relativeDay, timeAgo } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import { documentTypeLabels, hearingTypeLabels, pendingStatuses } from '@/lib/labels'
import type { Hearing } from '@/lib/types'

import { DeadlineList, HearingAgenda, OrderList } from './lists'
import { DashboardSkeleton, firstName, greeting, QuickAction, QuickActions, stat } from './shared'

export function LawyerDashboard() {
  useDocumentTitle('Overview')
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { openSearch, pickCase } = useShellActions()
  const { data, isLoading, error, refetch } = useDashboard()
  const { data: unread } = useUnreadCount()
  const { data: pendingTasks } = useCount('/deadlines', { view: 'OPEN', mine: true })
  const notifications = useNotifications({ size: 5 })
  const markRead = useMarkRead()
  const documents = useDocuments({ size: 8 })
  const { data: ordersCount } = useCount('/orders', {})
  const active = useCases({ status: pendingStatuses, sort: 'nextHearing,asc', size: 6 })

  if (isLoading) return <DashboardSkeleton />
  if (error || !data) return <ErrorState error={error} onRetry={() => refetch()} />

  const upcoming = data.upcomingHearings ?? []
  const next = upcoming.find((h) => new Date(h.scheduledAt) >= new Date())
  const overdue = stat(data, 'overdue')?.value ?? 0
  const latestOrder = data.recentOrders?.[0]
  const filingFile = () =>
    pickCase({ intent: 'upload', title: 'File a document', description: 'Choose the matter to file in. The upload form opens on its case page.' })

  return (
    <>
      <PageHeader
        eyebrow={`Counsel desk${user.barRegistrationNumber ? ` · Enrolment ${user.barRegistrationNumber}` : ''}`}
        title={`${greeting()}, ${firstName(user.fullName)}`}
        description={`${format(new Date(), 'EEEE, d MMMM yyyy')}. Here is what needs your attention across your matters.`}
        actions={
          <>
            <Button asChild>
              <Link to="/hearings?range=today">
                <ListOrdered />
                Cause list
              </Link>
            </Button>
            <Button variant="role" onClick={filingFile}>
              <FilePlus2 />
              File a document
            </Button>
          </>
        }
      />

      {/* What needs attention first: the next appearance, overdue work and unread notices. */}
      <section aria-label="Needs attention" className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <NextAppearance hearing={next} />
        <Link
          to="/deadlines?view=OVERDUE"
          className={cn(
            'flex flex-col justify-between rounded-xl border p-4 shadow-raised transition-shadow hover:shadow-lifted',
            overdue ? 'border-danger/25 bg-danger-soft/50' : 'border-line bg-surface',
          )}
        >
          <span className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
            <AlarmClock className={cn('size-4', overdue ? 'text-danger' : 'text-muted')} aria-hidden="true" />
            Overdue
          </span>
          <span className={cn('tabular mt-2 text-3xl font-semibold', overdue ? 'text-danger' : 'text-ink')}>{overdue}</span>
          <span className="text-xs text-muted">{overdue ? 'Deadlines past their due date' : 'Nothing is overdue'}</span>
        </Link>
        <Link
          to="/notifications"
          className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-raised transition-shadow hover:shadow-lifted"
        >
          <span className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
            <Bell className="size-4 text-muted" aria-hidden="true" />
            Unread notices
          </span>
          <span className="tabular mt-2 text-3xl font-semibold text-ink">{unread ?? '–'}</span>
          <span className="truncate text-xs text-muted">{latestOrder ? `Latest order: ${latestOrder.title}` : 'From the court and registry'}</span>
        </Link>
      </section>

      <KpiGrid className="mt-6">
        <KpiCard
          label="Active matters"
          value={stat(data, 'active')?.value}
          hint="Cases you appear in"
          icon={Briefcase}
          tone="role"
          to="/cases?status=FILED,UNDER_REVIEW,ACTIVE,AWAITING_DECISION"
        />
        <KpiCard label="Hearings this week" value={stat(data, 'week')?.value} hint="Next 7 days" icon={Gavel} to="/hearings?range=week" />
        <KpiCard
          label="Upcoming deadlines"
          value={stat(data, 'dueSoon')?.value}
          hint="Due within 7 days"
          icon={CalendarRange}
          tone={stat(data, 'dueSoon')?.value ? 'warning' : 'neutral'}
          to="/deadlines?view=DUE_SOON"
        />
        <KpiCard label="Pending filings" value={pendingTasks} hint="Open tasks assigned to you" icon={ListTodo} to="/deadlines" />
        <KpiCard label="Court orders" value={ordersCount} hint="Received across your matters" icon={ScrollText} to="/orders" />
        <KpiCard
          label="Decided matters"
          value={stat(data, 'decided')?.value}
          hint="Disposed or closed"
          icon={Gavel}
          tone="success"
          to="/cases?status=DISPOSED,CLOSED"
        />
      </KpiGrid>

      <QuickActions className="mt-6">
        <QuickAction icon={Search} label="Open matter" description="Find by number or party" onClick={openSearch} />
        <QuickAction icon={FilePlus2} label="File document" description="Into one of your matters" onClick={filingFile} />
        <QuickAction icon={Upload} label="Upload new version" description="Replace one of your filings" to="/documents" />
        <QuickAction icon={ListOrdered} label="View cause list" description="Today’s listings" to="/hearings?range=today" />
        <QuickAction icon={CalendarDays} label="Hearing schedule" description="Month calendar" to="/calendar" />
        <QuickAction icon={ScrollText} label="View orders" description="Orders received" to="/orders" />
      </QuickActions>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <Panel
            title="Upcoming hearings"
            description="Your listings over the next 14 days"
            icon={<Gavel />}
            actions={<PanelLink to="/calendar">Calendar</PanelLink>}
          >
            <WeekStrip hearings={upcoming} />
            <HearingAgenda hearings={upcoming} empty="None of your matters are listed in the next two weeks." />
          </Panel>

          <Panel
            title="My active cases"
            description="Pending matters, soonest listing first"
            icon={<Briefcase />}
            actions={<PanelLink to="/cases?status=FILED,UNDER_REVIEW,ACTIVE,AWAITING_DECISION">All matters</PanelLink>}
          >
            {active.isLoading ? (
              <SkeletonRows rows={3} />
            ) : (active.data?.content.length ?? 0) === 0 ? (
              <EmptyState compact icon={Briefcase} title="You have no pending matters" />
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {active.data!.content.map((item) => (
                  <Link
                    key={item.id}
                    to={`/cases/${item.id}`}
                    className="group flex min-w-0 flex-col rounded-lg border border-line bg-ivory/60 p-3.5 transition-[border-color,box-shadow] hover:border-line-strong hover:bg-surface hover:shadow-raised"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <CaseNumber value={item.caseNumber} />
                      <CaseStatusBadge status={item.status} />
                    </span>
                    <CaseTitle title={item.title} className="mt-1 line-clamp-2 text-[15px] leading-snug text-ink group-hover:underline" />
                    <span className="mt-auto pt-2 text-xs text-muted">
                      {item.nextHearingAt && new Date(item.nextHearingAt) < new Date() ? (
                        <span className="font-medium text-warning">Heard {formatDateTime(item.nextHearingAt)} · outcome awaited</span>
                      ) : item.nextHearingAt ? (
                        <span className="font-medium text-role">Next hearing {formatDateTime(item.nextHearingAt)}</span>
                      ) : (
                        'No hearing listed'
                      )}
                      <span className="block truncate">{item.judge ? `Before ${item.judge.fullName}` : 'Awaiting allocation'}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Document submissions"
            description="Latest filings in your matters"
            icon={<FileStack />}
            actions={<PanelLink to="/documents">Filings</PanelLink>}
          >
            {documents.isLoading ? (
              <SkeletonRows rows={4} />
            ) : (documents.data?.content.length ?? 0) === 0 ? (
              <EmptyState
                compact
                icon={FileText}
                title="No documents filed yet"
                action={
                  <Button size="sm" variant="role" onClick={filingFile}>
                    File a document
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {documents.data!.content.map((doc) => {
                  const mine = doc.uploadedBy.id === user.id
                  return (
                    <li key={doc.id}>
                      <Link
                        to={`/cases/${doc.courtCase.id}?tab=documents`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ivory sm:px-5"
                      >
                        <span
                          className={cn(
                            'grid size-8 shrink-0 place-items-center rounded-lg',
                            mine ? 'bg-role-soft text-role' : 'bg-sunken text-ink-soft',
                          )}
                        >
                          <FileText className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{doc.title}</span>
                          <span className="block truncate text-xs text-muted">
                            {documentTypeLabels[doc.documentType]} · {doc.courtCase.caseNumber} · {mine ? 'filed by you' : doc.uploadedBy.fullName}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-xs text-muted">
                          <span className="font-medium text-ink-soft">On record · v{doc.currentVersion}</span>
                          <span className="block">{timeAgo(doc.updatedAt)}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title="Critical deadlines" description="Overdue and due within 7 days" icon={<AlarmClock />} actions={<PanelLink to="/deadlines" />}>
            <DeadlineList deadlines={data.deadlines ?? []} empty="Nothing is due this week" />
          </Panel>
          <Panel title="Recently received orders" icon={<ScrollText />} actions={<PanelLink to="/orders" />}>
            <OrderList orders={data.recentOrders ?? []} empty="No orders in your matters yet" />
          </Panel>
          <Panel title="Notifications" icon={<Bell />} actions={<PanelLink to="/notifications" />}>
            {notifications.isLoading ? (
              <SkeletonRows rows={3} />
            ) : (notifications.data?.content.length ?? 0) === 0 ? (
              <EmptyState compact icon={Bell} title="You are all caught up" />
            ) : (
              <ul className="divide-y divide-line">
                {notifications.data!.content.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.read) markRead.mutate(item.id)
                        navigate(item.caseId ? `/cases/${item.caseId}` : '/notifications')
                      }}
                      className={cn(
                        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-ivory sm:px-5',
                        !item.read && 'bg-brand-soft/30',
                      )}
                    >
                      <span
                        className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.read ? 'bg-line-strong' : 'bg-seal')}
                        aria-label={item.read ? undefined : 'Unread'}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{item.title}</span>
                        <span className="line-clamp-2 block text-[13px] text-ink-soft">{item.message}</span>
                        <span className="mt-0.5 block text-xs text-muted">{timeAgo(item.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}

/** Counsel's first question every morning: where must I be next? */
function NextAppearance({ hearing }: { hearing?: Hearing }) {
  if (!hearing) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-raised">
        <span className="grid size-12 place-items-center rounded-xl bg-sunken text-muted">
          <CalendarDays className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">No appearances in the next two weeks</p>
          <p className="text-xs text-muted">New listings in your matters will appear here.</p>
        </div>
      </div>
    )
  }
  const day = parseISO(hearing.scheduledAt)
  return (
    <Link
      to={`/cases/${hearing.courtCase.id}?tab=hearings`}
      className="group relative flex flex-wrap items-center gap-5 overflow-hidden rounded-xl bg-role p-5 text-white shadow-lifted transition-colors hover:bg-role-strong"
    >
      <div className="w-[72px] shrink-0 overflow-hidden rounded-lg bg-white text-center text-ink">
        <p className="bg-ink py-0.5 text-[11px] font-semibold text-white">{format(day, 'MMM')}</p>
        <p className="tabular py-1 text-[1.9rem] leading-none font-semibold">{format(day, 'd')}</p>
        <p className="pb-1 text-[11px] text-muted">{format(day, 'EEE')}</p>
      </div>
      <div className="min-w-[13rem] flex-1">
        <p className="eyebrow text-white/70">Your next appearance · {relativeDay(hearing.scheduledAt)}</p>
        <p className="mt-1 text-xl font-semibold">
          {formatTime(hearing.scheduledAt)} <span className="text-sm font-normal text-white/75">{hearingTypeLabels[hearing.hearingType]}</span>
        </p>
        <CaseTitle title={hearing.courtCase.title} className="block truncate text-[16px] text-white group-hover:underline [&_em]:text-white/70" />
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-white/75">
          <span>{hearing.courtCase.caseNumber}</span>
          {hearing.courtroom && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {hearing.courtroom.name}
            </span>
          )}
          {hearing.judge && <span>Before {hearing.judge.fullName}</span>}
        </p>
      </div>
    </Link>
  )
}

/** The next seven days at a glance: how many of your matters are listed each day. */
function WeekStrip({ hearings }: { hearings: Hearing[] }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))
  return (
    <div className="grid grid-cols-7 border-b border-line">
      {days.map((day) => {
        const count = hearings.filter((h) => isSameDay(parseISO(h.scheduledAt), day)).length
        const sunday = day.getDay() === 0
        return (
          <div key={day.toISOString()} className={cn('border-r border-line px-1 py-2.5 text-center last:border-r-0', sunday && 'bg-ivory')}>
            <p className={cn('text-[11px] font-medium', isSameDay(day, new Date()) ? 'text-role' : 'text-muted')}>{format(day, 'EEE')}</p>
            <p className="tabular text-sm font-semibold text-ink">{format(day, 'd')}</p>
            <p className="mt-1 flex h-4 items-center justify-center" aria-label={`${count} hearing${count === 1 ? '' : 's'}`}>
              {count > 0 ? (
                <span className="tabular rounded-[5px] bg-role px-1.5 text-[10px] leading-4 font-semibold text-white">{count}</span>
              ) : (
                <span className="size-1 rounded-full bg-line-strong" aria-hidden="true" />
              )}
            </p>
          </div>
        )
      })}
    </div>
  )
}
