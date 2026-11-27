import { addDays, format } from 'date-fns'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderOpen,
  History,
  Info,
  Landmark,
  Scale,
  UserPlus,
  Users,
} from 'lucide-react'
import { Link } from 'react-router'

import { useCourts, useDashboard } from '@/api/admin'
import { useCases } from '@/api/cases'
import { useHearings } from '@/api/hearings'
import { useCount, useCounts } from '@/api/insights'
import { useCurrentUser } from '@/auth/AuthContext'
import { CaseStatusBadge } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { Button } from '@/components/ui/button'
import { ErrorState, Skeleton } from '@/components/ui/feedback'
import { KpiCard, KpiGrid } from '@/components/ui/kpi'
import { PageHeader, Panel, PanelLink } from '@/components/ui/panel'
import { Table, TD, TH, THead, TR } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import { caseTypeLabels, pendingStatuses, roleLabels } from '@/lib/labels'
import type { CaseType, Role } from '@/lib/types'

import { BarList, Donut, statusSlices, TrendChart, TrendLegend } from './charts'
import { ActivityFeed } from './lists'
import { DashboardSkeleton, stat } from './shared'

const ROLES: Role[] = ['JUDGE', 'LAWYER', 'STAFF', 'ADMIN']
const roleColor: Record<Role, string> = { JUDGE: '#7f2335', LAWYER: '#2350b0', STAFF: '#0f6b66', ADMIN: '#0f1b2d' }
const iso = (date: Date) => format(date, 'yyyy-MM-dd')

export function AdminDashboard() {
  useDocumentTitle('Overview')
  const user = useCurrentUser()
  const { data, isLoading, error, refetch } = useDashboard()
  const { data: courts } = useCourts()
  const today = new Date()

  const roleCounts = useCounts(
    '/users',
    ROLES.map((role) => ({ key: role, query: { role, active: true } })),
  )
  const { data: inactiveUsers } = useCount('/users', { active: false })
  const { data: weekHearings } = useCount('/hearings', { from: iso(today), to: iso(addDays(today, 6)), status: ['SCHEDULED'] })
  const { data: overdue } = useCount('/deadlines', { view: 'OVERDUE' })
  const { data: unallocated } = useCount('/cases', { status: ['FILED'], unassigned: true })
  const past = useHearings({ to: iso(today), status: ['SCHEDULED'], direction: 'desc', size: 100 })
  const outcomes = past.data ? past.data.content.filter((h) => h.outcomePending).length : undefined
  const recent = useCases({ sort: 'filingDate,desc', size: 6 })

  const courtList = courts ?? []
  const pendingByCourt = useCounts(
    '/cases',
    courtList.map((c) => ({ key: c.id, query: { courtId: c.id, status: pendingStatuses } })),
  )
  const decidedByCourt = useCounts(
    '/cases',
    courtList.map((c) => ({ key: c.id, query: { courtId: c.id, status: ['DISPOSED', 'CLOSED'] } })),
  )
  const hearingsByCourt = useCounts(
    '/hearings',
    courtList.map((c) => ({ key: c.id, query: { courtId: c.id, from: iso(today), to: iso(addDays(today, 6)), status: ['SCHEDULED'] } })),
  )

  if (isLoading) return <DashboardSkeleton />
  if (error || !data) return <ErrorState error={error} onRetry={() => refetch()} />

  const charts = data.charts ?? {}
  const flow = charts.institutionVsDisposal ?? []
  const registered = flow.reduce((sum, m) => sum + m.instituted, 0)
  const disposed = flow.reduce((sum, m) => sum + m.disposed, 0)
  const rooms = courtList.reduce((sum, c) => sum + c.courtrooms.length, 0)
  const inactiveRooms = courtList.reduce((sum, c) => sum + c.courtrooms.filter((r) => !r.active).length, 0)
  const adminWork = [unallocated, outcomes, overdue].every((n) => n !== undefined) ? unallocated! + outcomes! + overdue! : undefined

  const alerts: Array<{ tone: 'danger' | 'warning' | 'info'; text: string; to: string }> = []
  if (outcomes)
    alerts.push({
      tone: 'danger',
      text: `${outcomes} held hearing${outcomes === 1 ? ' has' : 's have'} no recorded outcome`,
      to: '/hearings?range=pending',
    })
  if (overdue) alerts.push({ tone: 'danger', text: `${overdue} deadline${overdue === 1 ? ' is' : 's are'} overdue`, to: '/deadlines?view=OVERDUE' })
  if (unallocated)
    alerts.push({
      tone: 'warning',
      text: `${unallocated} filed case${unallocated === 1 ? '' : 's'} awaiting allocation to a judge`,
      to: '/cases?unassigned=true',
    })
  if (inactiveRooms)
    alerts.push({ tone: 'info', text: `${inactiveRooms} courtroom${inactiveRooms === 1 ? ' is' : 's are'} marked not in use`, to: '/admin/courts' })
  if (inactiveUsers)
    alerts.push({ tone: 'info', text: `${inactiveUsers} deactivated account${inactiveUsers === 1 ? '' : 's'}`, to: '/admin/users?status=inactive' })

  return (
    <>
      <PageHeader
        eyebrow="System console"
        title="System overview"
        description={`${format(today, 'EEEE, d MMMM yyyy')}. Operational figures across every court, read live from the register.`}
        actions={
          <>
            <Button asChild>
              <Link to="/admin/audit">
                <History />
                Activity log
              </Link>
            </Button>
            <Button variant="role" asChild>
              <Link to="/admin/users?new=1">
                <UserPlus />
                Add user
              </Link>
            </Button>
          </>
        }
      />

      <KpiGrid>
        <KpiCard
          label="Registered cases"
          value={stat(data, 'total')?.value}
          hint={`${stat(data, 'filings')?.value ?? 0} filed in the last 30 days`}
          icon={FolderOpen}
          to="/cases"
        />
        <KpiCard
          label="Active cases"
          value={stat(data, 'pending')?.value}
          hint="Filed, under review, active or reserved"
          icon={Scale}
          tone="info"
          to="/cases?status=FILED,UNDER_REVIEW,ACTIVE,AWAITING_DECISION"
        />
        <KpiCard label="Courts" value={courts?.length} hint={`${rooms} courtrooms configured`} icon={Landmark} to="/admin/courts" />
        <KpiCard label="Registered users" value={stat(data, 'users')?.value} hint="Active accounts" icon={Users} to="/admin/users" />
        <KpiCard
          label="Upcoming hearings"
          value={weekHearings}
          hint="Scheduled, next 7 days"
          icon={CalendarClock}
          tone="role"
          to="/hearings?range=week"
        />
        <KpiCard
          label="Pending admin actions"
          value={adminWork}
          hint="Allocation, outcomes and overdue items"
          icon={ClipboardList}
          tone={adminWork ? 'warning' : 'success'}
          to="#admin-work"
        />
      </KpiGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel
          title="Registration and disposal trends"
          description="Cases registered and disposed each month, last 12 months"
          actions={<TrendLegend />}
        >
          <dl className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
            {[
              { label: 'Registered', value: registered },
              { label: 'Disposed', value: disposed },
              { label: 'Disposal rate', value: registered ? `${Math.round((disposed / registered) * 100)}%` : '—' },
              { label: 'Net change in pendency', value: `${registered - disposed >= 0 ? '+' : ''}${registered - disposed}` },
            ].map((item) => (
              <div key={item.label} className="bg-surface px-5 py-3">
                <dt className="text-xs text-muted">{item.label}</dt>
                <dd className="tabular mt-0.5 text-lg font-semibold text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
          <TrendChart data={flow} />
        </Panel>
        <Panel title="Case distribution by status" description="Every case on record" actions={<PanelLink to="/cases" />}>
          <Donut slices={statusSlices(charts.casesByStatus ?? [])} centerLabel="cases" caption="Cases by status" />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel
          title="Court performance"
          description="Workload and disposal per court"
          actions={<PanelLink to="/admin/courts">Courts & rooms</PanelLink>}
          bodyClassName="overflow-hidden rounded-b-xl"
        >
          <Table>
            <THead>
              <tr>
                <TH>Court</TH>
                <TH className="text-right">Pending</TH>
                <TH className="text-right">Decided</TH>
                <TH className="min-w-40">Disposal share</TH>
                <TH className="text-right">Hearings · 7 days</TH>
              </tr>
            </THead>
            <tbody>
              {courtList.map((court) => {
                const pending = pendingByCourt.counts.get(court.id)
                const decided = decidedByCourt.counts.get(court.id)
                const share =
                  pending !== undefined && decided !== undefined && pending + decided > 0
                    ? Math.round((decided / (pending + decided)) * 100)
                    : undefined
                return (
                  <TR key={court.id} className="hover:bg-ivory">
                    <TD>
                      <Link to={`/cases?courtId=${court.id}`} className="font-medium text-ink hover:underline">
                        {court.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {court.code} · {court.courtrooms.filter((r) => r.active).length} active courtrooms
                        {!court.active && ' · not accepting cases'}
                      </p>
                    </TD>
                    <TD className="tabular text-right font-semibold">{pending ?? <Skeleton className="ml-auto h-4 w-6" />}</TD>
                    <TD className="tabular text-right">{decided ?? <Skeleton className="ml-auto h-4 w-6" />}</TD>
                    <TD>
                      {share === undefined ? (
                        <Skeleton className="h-2 w-full" />
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                            <span className="block h-full rounded-full bg-success" style={{ width: `${share}%` }} />
                          </span>
                          <span className="tabular w-9 text-right text-xs text-ink-soft">{share}%</span>
                        </span>
                      )}
                    </TD>
                    <TD className="tabular text-right">{hearingsByCourt.counts.get(court.id) ?? <Skeleton className="ml-auto h-4 w-6" />}</TD>
                  </TR>
                )
              })}
            </tbody>
          </Table>
          <div className="border-t border-line">
            <p className="eyebrow px-5 pt-4 text-faint">Court-wise workload · pending cases per judge</p>
            <BarList
              caption="Pending cases per judge"
              color="bg-ink/80"
              rows={(charts.pendingByJudge ?? []).map((j) => ({
                key: j.key,
                label: j.label,
                value: j.count,
                href: `/cases?judgeId=${j.key}&status=FILED,UNDER_REVIEW,ACTIVE,AWAITING_DECISION`,
              }))}
            />
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Users by role" description="Active accounts" actions={<PanelLink to="/admin/users">Manage</PanelLink>}>
            {roleCounts.loading ? (
              <Skeleton className="m-5 h-32" />
            ) : (
              <Donut
                caption="Active users by role"
                centerLabel="active users"
                slices={ROLES.map((role) => ({
                  key: role,
                  label: roleLabels[role],
                  value: roleCounts.counts.get(role) ?? 0,
                  color: roleColor[role],
                  href: `/admin/users?role=${role}`,
                }))}
              />
            )}
          </Panel>
          <Panel title="Pending cases by type" actions={<PanelLink to="/cases?status=FILED,UNDER_REVIEW,ACTIVE,AWAITING_DECISION" />}>
            <BarList
              caption="Pending cases by type"
              rows={(charts.casesByType ?? []).map((t) => ({
                key: t.key,
                label: caseTypeLabels[t.key as CaseType],
                value: t.count,
                href: `/cases?type=${t.key}`,
              }))}
            />
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_400px]">
        <Panel id="admin-work" title="Pending administrative work" description="Items that need someone to act">
          <ul className="divide-y divide-line">
            {[
              { label: 'Allocate filed cases to a judge', value: unallocated, to: '/cases?unassigned=true', tone: 'warning' },
              { label: 'Record outcomes of held hearings', value: outcomes, to: '/hearings?range=pending', tone: 'danger' },
              { label: 'Resolve overdue deadlines', value: overdue, to: '/deadlines?view=OVERDUE', tone: 'danger' },
              { label: 'Review deactivated accounts', value: inactiveUsers, to: '/admin/users?status=inactive', tone: 'neutral' },
            ].map((item) => (
              <li key={item.label}>
                <Link to={item.to} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ivory sm:px-5">
                  <span className="min-w-0 flex-1 text-sm text-ink">{item.label}</span>
                  {item.value === undefined ? (
                    <Skeleton className="h-5 w-8" />
                  ) : (
                    <span
                      className={cn(
                        'tabular min-w-8 rounded-md px-2 py-0.5 text-center text-sm font-semibold',
                        item.value === 0
                          ? 'bg-success-soft text-success'
                          : item.tone === 'danger'
                            ? 'bg-danger-soft text-danger'
                            : item.tone === 'warning'
                              ? 'bg-warning-soft text-warning'
                              : 'bg-sunken text-ink-soft',
                      )}
                    >
                      {item.value}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="System alerts" description="Derived from live records">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 px-5 py-6 text-sm text-success">
              <CheckCircle2 className="size-5" aria-hidden="true" />
              No issues need attention.
            </div>
          ) : (
            <ul className="space-y-2 p-4">
              {alerts.map((alert) => {
                const Icon = alert.tone === 'info' ? Info : AlertTriangle
                return (
                  <li key={alert.text}>
                    <Link
                      to={alert.to}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] transition-colors',
                        alert.tone === 'danger' && 'border-danger/20 bg-danger-soft/60 text-ink hover:bg-danger-soft',
                        alert.tone === 'warning' && 'border-warning/20 bg-warning-soft/60 text-ink hover:bg-warning-soft',
                        alert.tone === 'info' && 'border-line bg-ivory text-ink-soft hover:bg-sunken',
                      )}
                    >
                      <Icon
                        className={cn(
                          'mt-0.5 size-4 shrink-0',
                          alert.tone === 'danger' ? 'text-danger' : alert.tone === 'warning' ? 'text-warning' : 'text-muted',
                        )}
                        aria-hidden="true"
                      />
                      {alert.text}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Audit events"
          description="Latest recorded actions"
          actions={<PanelLink to="/admin/audit">Activity log</PanelLink>}
          className="lg:col-span-2 xl:col-span-1 xl:row-span-2"
        >
          <ActivityFeed events={(data.recentActivity ?? []).slice(0, 10)} />
        </Panel>

        <Panel
          title="Recent case registrations"
          actions={<PanelLink to="/cases" />}
          className="lg:col-span-2"
          bodyClassName="overflow-hidden rounded-b-xl"
        >
          {recent.isLoading ? (
            <Skeleton className="m-5 h-40" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Case</TH>
                  <TH>Filed</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <tbody>
                {(recent.data?.content ?? []).map((item) => (
                  <TR key={item.id} className="hover:bg-ivory">
                    <TD>
                      <Link to={`/cases/${item.id}`} className="group block">
                        <CaseNumber value={item.caseNumber} />
                        <CaseTitle title={item.title} className="block max-w-[26rem] truncate text-[15px] text-ink group-hover:underline" />
                      </Link>
                      <span className="text-xs text-muted">{item.judge ? `Before ${item.judge.fullName}` : 'Not yet allocated to a judge'}</span>
                    </TD>
                    <TD className="tabular text-sm whitespace-nowrap text-ink-soft">{formatDate(item.filingDate)}</TD>
                    <TD>
                      <CaseStatusBadge status={item.status} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted">
        <BadgeCheck className="size-3.5" aria-hidden="true" />
        Signed in as {user.fullName}. Every figure links to the list it was counted from.
      </p>
    </>
  )
}
