import { format } from 'date-fns'
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileUp,
  FolderOpen,
  Gavel,
  History,
  Hourglass,
  PenLine,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import { useDashboard } from '@/api/admin'
import { useCases } from '@/api/cases'
import { useCurrentUser } from '@/auth/AuthContext'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { useShellActions } from '@/components/layout/shellActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/feedback'
import { MiniStat } from '@/components/ui/kpi'
import { Panel, PanelLink } from '@/components/ui/panel'
import { cn } from '@/lib/cn'
import { formatDate, formatTime, formatWeekday, relativeDay, timeAgo } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import { hearingTypeLabels, pendingStatuses } from '@/lib/labels'
import { useRecentCases } from '@/lib/recent'
import type { CaseSummary, Hearing } from '@/lib/types'

import { Donut, statusSlices } from './charts'
import { ActivityFeed, HearingAgenda, OrderList, OutcomeList } from './lists'
import { DashboardSkeleton, firstName, stat } from './shared'

type BoardState = 'heard' | 'adjourned' | 'cancelled' | 'pending' | 'next' | 'listed'

function boardState(hearing: Hearing, nextId: number | undefined): BoardState {
  if (hearing.status === 'COMPLETED') return 'heard'
  if (hearing.status === 'ADJOURNED') return 'adjourned'
  if (hearing.status === 'CANCELLED') return 'cancelled'
  if (new Date(hearing.scheduledAt) < new Date()) return 'pending'
  return hearing.id === nextId ? 'next' : 'listed'
}

const stateBadge: Record<BoardState, { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' | 'seal' | 'info' }> = {
  heard: { label: 'Heard', tone: 'success' },
  adjourned: { label: 'Adjourned', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  pending: { label: 'Outcome pending', tone: 'danger' },
  next: { label: 'Next up', tone: 'seal' },
  listed: { label: 'Listed', tone: 'info' },
}

export function JudgeDashboard() {
  useDocumentTitle('Today’s board')
  const user = useCurrentUser()
  const { openSearch, pickCase } = useShellActions()
  const { data, isLoading, error, refetch } = useDashboard()
  // The judge's own pending cases, for parties and counsel on the board (the API scopes this list).
  const { data: myCases } = useCases({ status: pendingStatuses, sort: 'nextHearing,asc', size: 100 })
  const recent = useRecentCases(user.id)

  if (isLoading) return <DashboardSkeleton kpis={4} />
  if (error || !data) return <ErrorState error={error} onRetry={() => refetch()} />

  const caseMap = new Map<number, CaseSummary>((myCases?.content ?? []).map((c) => [c.id, c]))
  const today = [...(data.todaysHearings ?? [])].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const upcoming = data.upcomingHearings ?? []
  const reserved = data.attention?.cases ?? []
  const outcomes = data.pendingOutcomes ?? []

  const quick: Array<{ icon: LucideIcon; label: string; onClick: () => void }> = [
    { icon: Search, label: 'Open case', onClick: openSearch },
    {
      icon: ClipboardCheck,
      label: 'Record hearing outcome',
      onClick: () =>
        pickCase({
          intent: 'conclude',
          title: 'Record a hearing outcome',
          description: 'Choose the case whose hearing was held.',
          filter: { status: ['UNDER_REVIEW', 'ACTIVE', 'AWAITING_DECISION'] },
        }),
    },
    {
      icon: PenLine,
      label: 'Prepare order',
      onClick: () => pickCase({ intent: 'order', title: 'Prepare an order', filter: { status: ['UNDER_REVIEW', 'ACTIVE', 'AWAITING_DECISION'] } }),
    },
    {
      icon: FileUp,
      label: 'Upload judgment',
      onClick: () =>
        pickCase({ intent: 'upload', title: 'Upload a judgment copy', description: 'Choose the case; the upload form opens on its file.' }),
    },
    { icon: History, label: 'View case history', onClick: () => pickCase({ intent: 'history', title: 'View case history' }) },
  ]

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="eyebrow text-role">Chambers · {user.court?.name ?? 'Court'}</p>
          <h1 className="mt-1.5 font-serif text-[2.1rem] leading-[1.1] font-medium tracking-[-0.015em] text-ink sm:text-[2.5rem]">
            {format(new Date(), 'EEEE, d MMMM')}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {today.length ? `${today.length} matter${today.length === 1 ? '' : 's'} on your board today` : 'No matters on your board today'},{' '}
            {firstName(user.fullName)}.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <MiniStat label="Pending before you" value={stat(data, 'pending')?.value} to="/cases?status=UNDER_REVIEW,ACTIVE,AWAITING_DECISION" />
          <MiniStat label="Judgments reserved" value={stat(data, 'reserved')?.value} tone="warning" to="/cases?status=AWAITING_DECISION" />
          <MiniStat label="Outcomes pending" value={stat(data, 'outcomes')?.value} tone="danger" to="/hearings?range=pending" />
          <MiniStat label="Overdue deadlines" value={stat(data, 'overdue')?.value} tone="danger" to="/deadlines?view=OVERDUE" />
        </dl>
      </section>

      <div className="no-print mb-6 flex flex-wrap gap-2" role="group" aria-label="Quick actions">
        {quick.map((action) => (
          <Button key={action.label} onClick={action.onClick} className="rounded-full">
            <action.icon />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Below xl the two columns dissolve into one stream, ordered by what the bench needs first. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 max-xl:contents xl:space-y-6">
          <div className="order-1 min-w-0">
            <TodaysBoard hearings={today} upcoming={upcoming} caseMap={caseMap} />
          </div>

          <Panel
            className="order-4"
            title="Upcoming hearings"
            description="Your next 7 days"
            icon={<CalendarClock />}
            actions={<PanelLink to="/calendar">Calendar</PanelLink>}
          >
            <HearingAgenda hearings={upcoming} showJudge={false} empty="Nothing is listed before you in the next week." />
          </Panel>

          <Panel className="order-7" title="Recent judicial activity" description="In the cases allocated to you">
            <ActivityFeed events={(data.recentActivity ?? []).slice(0, 8)} />
          </Panel>
        </div>

        <div className="min-w-0 max-xl:contents xl:space-y-6">
          <Panel className="order-2" title="Judgments reserved" description="Arguments concluded; awaiting your decision" icon={<Hourglass />}>
            {reserved.length === 0 ? (
              <EmptyState compact icon={CheckCircle2} title="No judgments are reserved" />
            ) : (
              <ul className="divide-y divide-line">
                {reserved.map((item) => (
                  <li key={item.id} className="px-4 py-3 sm:px-5">
                    <Link to={`/cases/${item.id}`} className="group block">
                      <CaseNumber value={item.caseNumber} />
                      <CaseTitle title={item.title} className="block truncate text-[15px] text-ink group-hover:underline" />
                      <span className="text-xs text-muted">Last activity {timeAgo(item.updatedAt)}</span>
                    </Link>
                    <Button size="sm" variant="role" asChild className="mt-2">
                      <Link to={`/cases/${item.id}?action=order`}>
                        <PenLine />
                        Prepare judgment
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="order-3" title="Orders pending" description="Held hearings awaiting an outcome and order" icon={<ClipboardCheck />}>
            <OutcomeList hearings={outcomes} actionLabel="Record outcome" />
          </Panel>

          <Panel className="order-5" title="My assigned cases" actions={<PanelLink to="/cases">My cases</PanelLink>}>
            <Donut slices={statusSlices(data.charts?.casesByStatus ?? [])} centerLabel="assigned" caption="Your cases by status" />
          </Panel>

          <Panel className="order-6" title="Recently opened" description="Cases you opened on this device" icon={<BookOpen />}>
            {recent.length === 0 ? (
              <p className="px-5 py-5 text-sm text-muted">Cases you open will be listed here for quick return.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <Link to={`/cases/${item.id}`} className="block px-4 py-2.5 transition-colors hover:bg-ivory sm:px-5">
                      <span className="flex items-center justify-between gap-2">
                        <CaseNumber value={item.caseNumber} />
                        <span className="text-xs text-faint">{timeAgo(item.openedAt)}</span>
                      </span>
                      <CaseTitle title={item.title} className="block truncate text-sm text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="order-8" title="Recent orders" actions={<PanelLink to="/orders" />}>
            <OrderList orders={data.recentOrders ?? []} />
          </Panel>
        </div>
      </div>
    </>
  )
}

/**
 * The day's board: every matter in order of listing with parties, counsel and how far the court
 * has got. When nothing is listed today, the next sitting is shown instead.
 */
function TodaysBoard({ hearings, upcoming, caseMap }: { hearings: Hearing[]; upcoming: Hearing[]; caseMap: Map<number, CaseSummary> }) {
  const done = hearings.filter((h) => h.status !== 'SCHEDULED').length
  const next = hearings.find((h) => h.status === 'SCHEDULED' && new Date(h.scheduledAt) >= new Date())
  const progress = hearings.length ? Math.round((done / hearings.length) * 100) : 0
  const nextDay = upcoming[0]?.scheduledAt.slice(0, 10)
  const nextSitting = nextDay ? upcoming.filter((h) => h.scheduledAt.startsWith(nextDay)) : []

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-lifted" aria-labelledby="board-title">
      <header className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-role text-white">
              <Gavel className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 id="board-title" className="font-serif text-xl leading-tight font-medium text-ink">
                Today’s board
              </h2>
              <p className="text-[13px] text-muted">
                {hearings.length ? `${done} of ${hearings.length} matters dealt with` : 'No sitting listed for today'}
              </p>
            </div>
          </div>
          <PanelLink to="/hearings?range=today">Cause list</PanelLink>
        </div>
        {hearings.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Board progress"
            >
              <div className="h-full rounded-full bg-role transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="tabular text-xs font-medium text-ink-soft">{progress}%</span>
          </div>
        )}
      </header>

      {hearings.length === 0 ? (
        <div>
          <EmptyState
            compact
            icon={Clock}
            title="No matters are listed before you today"
            description={
              nextDay
                ? `Your next sitting is ${formatWeekday(nextDay)} (${relativeDay(nextDay).toLowerCase()}).`
                : 'Nothing is listed in the coming week.'
            }
          />
          {nextSitting.length > 0 && (
            <div className="border-t border-line">
              <p className="eyebrow bg-ivory px-5 py-2 text-faint">Next sitting · {formatDate(nextDay)}</p>
              <ol className="divide-y divide-line">
                {nextSitting.map((hearing) => (
                  <BoardRow key={hearing.id} hearing={hearing} summary={caseMap.get(hearing.courtCase.id)} state="listed" />
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : (
        <ol className="divide-y divide-line">
          {hearings.map((hearing) => (
            <BoardRow key={hearing.id} hearing={hearing} summary={caseMap.get(hearing.courtCase.id)} state={boardState(hearing, next?.id)} />
          ))}
        </ol>
      )}
    </section>
  )
}

function BoardRow({ hearing, summary, state }: { hearing: Hearing; summary?: CaseSummary; state: BoardState }) {
  const badge = stateBadge[state]
  const caseId = hearing.courtCase.id
  return (
    <li
      className={cn(
        'relative grid gap-x-4 gap-y-2 px-5 py-4 sm:grid-cols-[6rem_minmax(0,1fr)]',
        state === 'next' && 'bg-role-soft/40',
        state === 'cancelled' && 'opacity-60',
      )}
    >
      {state === 'next' && <span className="absolute inset-y-0 left-0 w-[3px] bg-role" aria-hidden="true" />}
      <div className="flex items-baseline gap-2 sm:block">
        <p className="tabular text-lg leading-none font-semibold text-ink">{formatTime(hearing.scheduledAt)}</p>
        <p className="tabular text-xs text-muted sm:mt-1">to {formatTime(hearing.endsAt)}</p>
        <p className="text-xs text-muted sm:mt-1">{hearing.courtroom?.name ?? 'Room TBA'}</p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CaseNumber value={hearing.courtCase.caseNumber} />
          <Badge tone={badge.tone} dot>
            {badge.label}
          </Badge>
          <span className="text-xs text-muted">{hearingTypeLabels[hearing.hearingType]}</span>
        </div>
        <Link to={`/cases/${caseId}`} className="mt-0.5 block hover:underline">
          <CaseTitle title={hearing.courtCase.title} className="text-[17px] leading-snug text-ink" />
        </Link>
        <dl className="mt-1.5 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="sr-only">Parties</dt>
            <dd className="truncate text-ink-soft">
              <span className="text-muted">Parties: </span>
              {summary?.petitioner && summary.respondent ? `${summary.petitioner} · ${summary.respondent}` : hearing.courtCase.parties}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="sr-only">Counsel</dt>
            <dd className="truncate text-muted">{summary?.lawyers.length ? `Counsel: ${summary.lawyers.join(', ')}` : 'No counsel on record'}</dd>
          </div>
        </dl>
        {hearing.purpose && state !== 'heard' && <p className="mt-1 text-[13px] text-muted">{hearing.purpose}</p>}
        {hearing.outcome && (state === 'heard' || state === 'adjourned') && (
          <p className="mt-1 text-[13px] text-ink-soft">Outcome: {hearing.outcome}</p>
        )}
        <div className="no-print mt-3 flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" asChild>
            <Link to={`/cases/${caseId}`}>
              <FolderOpen />
              Open case
            </Link>
          </Button>
          {state === 'pending' && (
            <Button size="sm" variant="role" asChild>
              <Link to={`/cases/${caseId}?action=conclude&hearing=${hearing.id}`}>
                <ClipboardCheck />
                Record outcome
              </Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/cases/${caseId}?action=order`}>
              <PenLine />
              Prepare order
            </Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/cases/${caseId}?tab=timeline`}>
              <History />
              History
            </Link>
          </Button>
        </div>
      </div>
    </li>
  )
}
