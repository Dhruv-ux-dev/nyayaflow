import { CalendarCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useDashboard } from '@/api/admin'
import { useCurrentUser } from '@/auth/AuthContext'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { pageLabel } from '@/components/layout/navigation'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { PageHeader, Panel } from '@/components/ui/panel'
import { format } from 'date-fns'
import { formatTime, relativeDay } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import { caseTypeLabels, hearingTypeLabels } from '@/lib/labels'
import type { CaseType, Dashboard, Hearing } from '@/lib/types'

import { CauseList } from './CauseList'
import { BarList, HearingLoadChart, InstitutionChart, StatusBars } from './charts'
import { ActivityFeed, CaseList, DeadlineList, HearingAgenda, OrderList, OutcomeList } from './lists'
import { StatStrip } from './StatStrip'

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

function count(n: number, one: string, many = `${one}s`) {
  return n === 0 ? `no ${many}` : `${n} ${n === 1 ? one : many}`
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** One sentence on where this person's work stands, built from their own figures. */
function summary(data: Dashboard) {
  const stat = (key: string) => data.stats.find((s) => s.key === key)?.value ?? 0
  switch (data.role) {
    case 'ADMIN':
      return `${count(stat('total'), 'case')} on record, ${stat('pending')} pending, and ${count(stat('users'), 'person', 'people')} with active accounts.`
    case 'STAFF':
      return `${count(stat('today'), 'matter')} listed today; ${stat('unallocated')} awaiting allocation and ${count(stat('outcomes'), 'outcome')} to record.`
    case 'JUDGE':
      return `${count(stat('today'), 'matter')} on your board today and ${count(stat('reserved'), 'judgment')} reserved.`
    case 'LAWYER':
      return `${count(stat('week'), 'listing')} this week and ${count(stat('dueSoon'), 'deadline')} due soon${stat('overdue') ? `, ${stat('overdue')} overdue` : ''}.`
  }
}

function ViewAll({ to, children = 'View all' }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="text-[13px] font-medium text-brand hover:underline">
      {children}
    </Link>
  )
}

export default function DashboardPage() {
  const user = useCurrentUser()
  useDocumentTitle(pageLabel(user.role, '/', 'Dashboard'))
  const { data, isLoading, error, refetch } = useDashboard()
  const firstName = user.fullName.split(' ')[0]

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={`${format(new Date(), 'EEEE, d MMMM')}. ${data ? capitalize(summary(data)) : ''}`}
      />
      {isLoading && <DashboardSkeleton />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && (
        <div className="space-y-6">
          <StatStrip stats={data.stats} />
          {data.role === 'ADMIN' && <AdminBoard data={data} />}
          {data.role === 'STAFF' && <StaffBoard data={data} />}
          {data.role === 'JUDGE' && <JudgeBoard data={data} />}
          {data.role === 'LAWYER' && <LawyerBoard data={data} />}
        </div>
      )}
    </>
  )
}

function TodayPanel({ data, showJudge }: { data: Dashboard; showJudge: boolean }) {
  const hearings = data.todaysHearings ?? []
  return (
    <Panel
      title="Today’s cause list"
      description={hearings.length ? `${hearings.length} matter${hearings.length === 1 ? '' : 's'} listed` : undefined}
      actions={<ViewAll to="/hearings?range=today">Open hearings</ViewAll>}
    >
      {hearings.length ? (
        <CauseList hearings={hearings} showJudge={showJudge} />
      ) : (
        <EmptyState icon={CalendarCheck} title="No matters are listed for today" description="Upcoming hearings appear below." className="py-10" />
      )}
    </Panel>
  )
}

function Columns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">{main}</div>
      <div className="min-w-0 space-y-6">{side}</div>
    </div>
  )
}

function AdminBoard({ data }: { data: Dashboard }) {
  const charts = data.charts ?? {}
  const flow = charts.institutionVsDisposal ?? []
  const instituted = flow.reduce((sum, m) => sum + m.instituted, 0)
  const disposed = flow.reduce((sum, m) => sum + m.disposed, 0)
  return (
    <Columns
      main={
        <>
          <Panel
            title="Institution and disposal"
            description={`${instituted} cases instituted and ${disposed} disposed in the last 12 months`}
          >
            <InstitutionChart data={flow} />
          </Panel>
          <TodayPanel data={data} showJudge />
          <Panel title="Recent activity" actions={<ViewAll to="/admin/audit">Open activity log</ViewAll>}>
            <ActivityFeed events={data.recentActivity ?? []} />
          </Panel>
        </>
      }
      side={
        <>
          <Panel title="Cases by status">
            <StatusBars data={charts.casesByStatus ?? []} />
          </Panel>
          <Panel title="Pending cases per judge">
            <BarList
              caption="Pending cases per judge"
              rows={(charts.pendingByJudge ?? []).map((j) => ({ key: j.key, label: j.label, value: j.count, href: `/cases?judgeId=${j.key}&status=FILED,UNDER_REVIEW,ACTIVE,AWAITING_DECISION` }))}
            />
          </Panel>
          {data.attention && (
            <Panel title={data.attention.title} description={data.attention.description} actions={<ViewAll to={data.attention.link} />}>
              <CaseList cases={data.attention.cases} empty="Every registered case has a judge" />
            </Panel>
          )}
          <Panel title="Pending cases by type">
            <BarList caption="Pending cases by type" rows={(charts.casesByType ?? []).map((t) => ({ key: t.key, label: caseTypeLabels[t.key as CaseType], value: t.count, href: `/cases?type=${t.key}` }))} />
          </Panel>
        </>
      }
    />
  )
}

function StaffBoard({ data }: { data: Dashboard }) {
  return (
    <Columns
      main={
        <>
          <TodayPanel data={data} showJudge />
          <Panel title="Next 7 days" actions={<ViewAll to="/hearings?range=week" />}>
            <HearingAgenda hearings={data.upcomingHearings ?? []} />
          </Panel>
          <Panel title="Recent case activity">
            <ActivityFeed events={data.recentActivity ?? []} />
          </Panel>
        </>
      }
      side={
        <>
          <Panel title="Outcomes pending" description="Held hearings with no result recorded">
            <OutcomeList hearings={data.pendingOutcomes ?? []} />
          </Panel>
          {data.attention && (
            <Panel title={data.attention.title} description={data.attention.description} actions={<ViewAll to={data.attention.link} />}>
              <CaseList cases={data.attention.cases} empty="Every registered case has a judge" />
            </Panel>
          )}
          <Panel title="Deadlines" description="Overdue and due within 7 days" actions={<ViewAll to="/deadlines" />}>
            <DeadlineList deadlines={data.deadlines ?? []} />
          </Panel>
          <Panel title="Hearings per day" description="Scheduled, next two weeks">
            <HearingLoadChart data={data.charts?.hearingLoad ?? []} />
          </Panel>
        </>
      }
    />
  )
}

function JudgeBoard({ data }: { data: Dashboard }) {
  return (
    <Columns
      main={
        <>
          <TodayPanel data={data} showJudge={false} />
          <Panel title="Coming up" description="Your next 7 days" actions={<ViewAll to="/calendar">Open calendar</ViewAll>}>
            <HearingAgenda hearings={data.upcomingHearings ?? []} />
          </Panel>
          <Panel title="Recent orders" actions={<ViewAll to="/orders" />}>
            <OrderList orders={data.recentOrders ?? []} />
          </Panel>
        </>
      }
      side={
        <>
          {data.attention && (
            <Panel title={data.attention.title} description={data.attention.description}>
              <CaseList cases={data.attention.cases} empty="No judgments are reserved" />
            </Panel>
          )}
          <Panel title="Outcomes pending" description="Your held hearings with no result">
            <OutcomeList hearings={data.pendingOutcomes ?? []} />
          </Panel>
          <Panel title="Deadlines in your cases" actions={<ViewAll to="/deadlines" />}>
            <DeadlineList deadlines={data.deadlines ?? []} />
          </Panel>
          <Panel title="Your cases by status">
            <StatusBars data={data.charts?.casesByStatus ?? []} />
          </Panel>
          <Panel title="Recent activity in your cases">
            <ActivityFeed events={(data.recentActivity ?? []).slice(0, 8)} />
          </Panel>
        </>
      }
    />
  )
}

function LawyerBoard({ data }: { data: Dashboard }) {
  return (
    <Columns
      main={
        <>
          <NextAppearance hearings={data.upcomingHearings ?? []} />
          <Panel title="Your hearings" description="Next 14 days" actions={<ViewAll to="/calendar">Open calendar</ViewAll>}>
            <HearingAgenda hearings={data.upcomingHearings ?? []} empty="None of your matters are listed in the next two weeks." />
          </Panel>
          {data.attention && (
            <Panel title={data.attention.title} description={data.attention.description} actions={<ViewAll to={data.attention.link} />}>
              <CaseList cases={data.attention.cases} empty="You have no cases yet" />
            </Panel>
          )}
        </>
      }
      side={
        <>
          <Panel title="Deadlines" description="Overdue and due within 7 days" actions={<ViewAll to="/deadlines" />}>
            <DeadlineList deadlines={data.deadlines ?? []} />
          </Panel>
          <Panel title="Recent orders" actions={<ViewAll to="/orders" />}>
            <OrderList orders={data.recentOrders ?? []} />
          </Panel>
          <Panel title="Recent activity in your cases">
            <ActivityFeed events={(data.recentActivity ?? []).slice(0, 8)} />
          </Panel>
        </>
      }
    />
  )
}

/** Counsel's first question every morning: where must I be next? */
function NextAppearance({ hearings }: { hearings: Hearing[] }) {
  const now = new Date()
  const next = hearings.find((h) => new Date(h.scheduledAt) >= now)
  if (!next) return null
  const day = new Date(next.scheduledAt)
  return (
    <Link
      to={`/cases/${next.courtCase.id}?tab=hearings`}
      className="group flex flex-wrap items-center gap-5 rounded-lg border border-line border-l-4 border-l-role bg-surface px-5 py-4 transition-colors hover:bg-role-soft/40"
    >
      <div className="w-[76px] shrink-0 overflow-hidden rounded-md border border-line text-center">
        <p className="bg-role py-0.5 text-[11px] font-semibold text-white">{day.toLocaleString('en-IN', { month: 'short' })}</p>
        <p className="py-1 text-[1.9rem] leading-none font-semibold text-ink">{day.getDate()}</p>
        <p className="pb-1 text-[11px] text-muted">{day.toLocaleString('en-IN', { weekday: 'short' })}</p>
      </div>
      <div className="min-w-[14rem] flex-1">
        <p className="text-sm font-medium text-role">Your next appearance</p>
        <p className="mt-0.5 text-lg font-semibold text-ink">
          {formatTime(next.scheduledAt)}
          <span className="ml-2 text-sm font-normal text-muted">{relativeDay(next.scheduledAt)}</span>
        </p>
        <CaseTitle title={next.courtCase.title} className="block text-[15px] text-ink group-hover:underline" />
        <p className="text-sm text-muted">
          <CaseNumber value={next.courtCase.caseNumber} />
          {`. ${hearingTypeLabels[next.hearingType]}`}
          {next.courtroom ? ` in ${next.courtroom.name}` : ''}
          {next.judge ? `, before ${next.judge.fullName}` : ''}
        </p>
      </div>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <Skeleton className="h-[108px] w-full" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  )
}
