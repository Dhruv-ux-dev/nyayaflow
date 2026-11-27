import { format, subDays } from 'date-fns'
import {
  CalendarCheck,
  CalendarPlus,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FilePlus2,
  FileSearch,
  FileText,
  Gavel,
  Inbox,
  ListOrdered,
  Plus,
  Printer,
  Timer,
  UserRoundPlus,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useDashboard } from '@/api/admin'
import { useCases } from '@/api/cases'
import { useCount } from '@/api/insights'
import { useDocuments } from '@/api/records'
import { useCurrentUser } from '@/auth/AuthContext'
import { PriorityTag } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { useShellActions } from '@/components/layout/shellActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { KpiCard, KpiGrid } from '@/components/ui/kpi'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader, Panel, PanelLink } from '@/components/ui/panel'
import { SearchInput, SegmentedTabs } from '@/components/ui/segmented'
import { Table, TD, TH, THead, TR } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { formatDate, relativeDay, timeAgo } from '@/lib/format'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import { caseTypeLabels, documentTypeLabels } from '@/lib/labels'
import type { CaseStatus, CaseSummary } from '@/lib/types'

import { CauseList } from './CauseList'
import { HearingLoadChart } from './charts'
import { ActivityFeed, DeadlineList, HearingAgenda, OutcomeList } from './lists'
import { DashboardSkeleton, QuickAction, QuickActions, stat } from './shared'

type QueueView = 'all' | 'FILED' | 'UNDER_REVIEW'

/** What the registry has to do next with a case in the filing queue, and where that is done. */
function nextAction(item: CaseSummary): { label: string; to: string; urgent?: boolean } {
  if (!item.judge) return { label: 'Allocate judge', to: `/cases/${item.id}?action=assign`, urgent: true }
  if (!item.nextHearingAt) return { label: 'List first hearing', to: `/cases/${item.id}?action=schedule`, urgent: true }
  if (new Date(item.nextHearingAt) < new Date()) return { label: 'Record outcome', to: `/cases/${item.id}?tab=hearings`, urgent: true }
  return { label: `Listed ${relativeDay(item.nextHearingAt).toLowerCase()}`, to: `/cases/${item.id}?tab=hearings` }
}

function stage(item: CaseSummary) {
  if (item.status === 'FILED')
    return (
      <Badge tone="warning" dot>
        Awaiting allocation
      </Badge>
    )
  if (!item.nextHearingAt)
    return (
      <Badge tone="review" dot>
        Allocated · not listed
      </Badge>
    )
  return (
    <Badge tone="teal" dot>
      Listed
    </Badge>
  )
}

export function RegistryDashboard() {
  useDocumentTitle('Registry desk')
  const user = useCurrentUser()
  const { pickCase } = useShellActions()
  const { data, isLoading, error, refetch } = useDashboard()
  const { data: underReview } = useCount('/cases', { status: ['UNDER_REVIEW'] })
  const { data: newFilings } = useCount('/cases', { filedFrom: format(subDays(new Date(), 6), 'yyyy-MM-dd') })
  const documents = useDocuments({ size: 6 })

  if (isLoading) return <DashboardSkeleton />
  if (error || !data) return <ErrorState error={error} onRetry={() => refetch()} />

  const today = data.todaysHearings ?? []

  return (
    <>
      <PageHeader
        eyebrow={`Registry · ${user.court?.name ?? 'All courts'}`}
        title="Registry desk"
        description={`${format(new Date(), 'EEEE, d MMMM yyyy')}. Filings to process, today’s listings and what is falling due.`}
        actions={
          <>
            <Button asChild>
              <Link to="/hearings?range=today">
                <Printer />
                Today’s cause list
              </Link>
            </Button>
            <Button variant="role" asChild>
              <Link to="/cases/new">
                <Plus />
                Register case
              </Link>
            </Button>
          </>
        }
      />

      <QuickActions>
        <QuickAction primary icon={FilePlus2} label="Register case" description="New filing into the register" to="/cases/new" />
        <QuickAction icon={FileSearch} label="Review filing" description="Open the filing queue" to="#filing-queue" />
        <QuickAction
          icon={CalendarPlus}
          label="Schedule hearing"
          description="List an allocated case"
          onClick={() =>
            pickCase({ intent: 'schedule', title: 'Schedule a hearing', filter: { status: ['UNDER_REVIEW', 'ACTIVE', 'AWAITING_DECISION'] } })
          }
        />
        <QuickAction
          icon={UserRoundPlus}
          label="Assign judge"
          description="Allocate a filed case"
          onClick={() => pickCase({ intent: 'assign', title: 'Allocate to a judge', filter: { status: ['FILED', 'UNDER_REVIEW', 'ACTIVE'] } })}
        />
        <QuickAction
          icon={FileCheck2}
          label="Upload documents"
          description="Add to a case file"
          onClick={() => pickCase({ intent: 'upload', title: 'Upload a document' })}
        />
        <QuickAction icon={ListOrdered} label="Prepare cause list" description="Today, by courtroom" to="/hearings?range=today" />
      </QuickActions>

      <KpiGrid className="mt-6">
        <KpiCard
          label="New filings"
          value={newFilings}
          hint="Registered in the last 7 days"
          icon={Inbox}
          tone="role"
          to="/cases?sort=filingDate,desc"
        />
        <KpiCard
          label="Awaiting allocation"
          value={stat(data, 'unallocated')?.value}
          hint="Filed cases without a judge"
          icon={UserRoundPlus}
          tone={stat(data, 'unallocated')?.value ? 'warning' : 'neutral'}
          to="/cases?unassigned=true"
        />
        <KpiCard
          label="Awaiting first listing"
          value={underReview}
          hint="Allocated, under review"
          icon={CalendarPlus}
          to="/cases?status=UNDER_REVIEW"
        />
        <KpiCard
          label="Hearings today"
          value={stat(data, 'today')?.value}
          hint="Across all courtrooms"
          icon={Gavel}
          tone="info"
          to="/hearings?range=today"
        />
        <KpiCard
          label="Outcomes pending"
          value={stat(data, 'outcomes')?.value}
          hint="Held, no result recorded"
          icon={ClipboardCheck}
          tone={stat(data, 'outcomes')?.value ? 'danger' : 'neutral'}
          to="/hearings?range=pending"
        />
        <KpiCard
          label="Overdue deadlines"
          value={stat(data, 'overdue')?.value}
          hint="Across all cases"
          icon={Timer}
          tone={stat(data, 'overdue')?.value ? 'danger' : 'neutral'}
          to="/deadlines?view=OVERDUE"
        />
      </KpiGrid>

      <FilingQueue />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <Panel
            title="Today’s hearings"
            description={today.length ? `${today.length} matter${today.length === 1 ? '' : 's'} listed, by courtroom` : undefined}
            icon={<CalendarCheck />}
            actions={<PanelLink to="/hearings?range=today">Cause lists</PanelLink>}
          >
            {today.length ? (
              <CauseList hearings={today} />
            ) : (
              <EmptyState compact icon={CalendarCheck} title="No matters are listed for today" description="Upcoming listings are shown below." />
            )}
          </Panel>
          <Panel title="Next 7 days" actions={<PanelLink to="/hearings?range=week" />}>
            <HearingAgenda hearings={data.upcomingHearings ?? []} />
          </Panel>
        </div>
        <div className="min-w-0 space-y-6">
          <Panel title="Outcomes to record" description="Held hearings with no result" icon={<ClipboardCheck />}>
            <OutcomeList hearings={data.pendingOutcomes ?? []} actionLabel="Record outcome" />
          </Panel>
          <Panel title="Upcoming deadlines" description="Overdue and due within 7 days" actions={<PanelLink to="/deadlines" />}>
            <DeadlineList deadlines={data.deadlines ?? []} />
          </Panel>
          <Panel title="Listing load" description="Scheduled hearings per day, next two weeks">
            <HearingLoadChart data={data.charts?.hearingLoad ?? []} color="#0f6b66" />
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel
          title="Document verification"
          description="Most recently filed or changed documents; check each on its case file"
          icon={<FileText />}
          actions={<PanelLink to="/documents" />}
        >
          {documents.isLoading ? (
            <SkeletonRows rows={4} />
          ) : (documents.data?.content.length ?? 0) === 0 ? (
            <EmptyState compact icon={FileText} title="No documents on file" />
          ) : (
            <ul className="divide-y divide-line">
              {documents.data!.content.map((doc) => (
                <li key={doc.id}>
                  <Link
                    to={`/cases/${doc.courtCase.id}?tab=documents`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ivory sm:px-5"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sunken text-ink-soft">
                      <FileText className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{doc.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {documentTypeLabels[doc.documentType]} · {doc.courtCase.caseNumber} · {doc.uploadedBy.fullName}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted">
                      v{doc.currentVersion}
                      <span className="block">{timeAgo(doc.updatedAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent registry activity" actions={<PanelLink to="/cases?sort=updatedAt,desc">Recently updated</PanelLink>}>
          <ActivityFeed events={(data.recentActivity ?? []).slice(0, 8)} />
        </Panel>
      </div>
    </>
  )
}

function FilingQueue() {
  const [view, setView] = useState<QueueView>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const q = useDebounced(search.trim(), 300)
  const statuses: CaseStatus[] = view === 'all' ? ['FILED', 'UNDER_REVIEW'] : [view]
  const { data, isLoading, error, refetch, isFetching } = useCases({ status: statuses, q: q || undefined, sort: 'filingDate,asc', page, size: 8 })
  const { data: filedCount } = useCount('/cases', { status: ['FILED'] })
  const { data: reviewCount } = useCount('/cases', { status: ['UNDER_REVIEW'] })

  return (
    <section
      id="filing-queue"
      className="mt-6 scroll-mt-24 overflow-hidden rounded-xl border border-line bg-surface shadow-raised"
      aria-labelledby="filing-queue-title"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-b from-role-soft/50 to-surface px-4 py-4 sm:px-5">
        <div>
          <p className="eyebrow text-role">Work queue</p>
          <h2 id="filing-queue-title" className="font-serif text-xl font-medium text-ink">
            Filing queue
          </h2>
          <p className="text-[13px] text-muted">Registered matters still with the registry, oldest first.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <SegmentedTabs
            label="Queue"
            value={view}
            onChange={(v) => {
              setView(v)
              setPage(0)
            }}
            options={[
              { value: 'all', label: 'All', count: filedCount !== undefined && reviewCount !== undefined ? filedCount + reviewCount : undefined },
              { value: 'FILED', label: 'Awaiting allocation', count: filedCount },
              { value: 'UNDER_REVIEW', label: 'Awaiting listing', count: reviewCount },
            ]}
          />
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(0)
            }}
            placeholder="Search the queue"
            label="Search the filing queue"
            className="min-w-48 lg:w-56 lg:flex-none"
          />
        </div>
      </header>
      {isLoading && <SkeletonRows rows={5} />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && data.content.length === 0 && (
        <EmptyState
          compact
          icon={Inbox}
          title={q ? 'No filings match' : 'The filing queue is clear'}
          description={q ? undefined : 'Every registered case has been allocated and listed.'}
        />
      )}
      {data && data.content.length > 0 && (
        <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
          <Table className="hidden lg:block">
            <THead>
              <tr>
                <TH>Filing reference</TH>
                <TH className="w-[34%]">Case title · counsel</TH>
                <TH>Filed</TH>
                <TH>Registry stage</TH>
                <TH>Priority</TH>
                <TH className="text-right">Next action</TH>
              </tr>
            </THead>
            <tbody>
              {data.content.map((item) => {
                const action = nextAction(item)
                return (
                  <TR key={item.id} className="hover:bg-ivory">
                    <TD className="whitespace-nowrap">
                      <Link to={`/cases/${item.id}`} className="hover:underline">
                        <CaseNumber value={item.caseNumber} />
                      </Link>
                      <span className="block text-xs text-muted">{caseTypeLabels[item.caseType]}</span>
                    </TD>
                    <TD>
                      <CaseTitle title={item.title} className="block max-w-[24rem] truncate text-[15px] text-ink" />
                      <span className="block max-w-[24rem] truncate text-xs text-muted">
                        {item.lawyers.length ? `Counsel: ${item.lawyers.join(', ')}` : 'No counsel on record'}
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap">
                      <span className="tabular block text-sm text-ink">{formatDate(item.filingDate)}</span>
                      <span className="text-xs text-muted">{relativeDay(item.filingDate)}</span>
                    </TD>
                    <TD>{stage(item)}</TD>
                    <TD>
                      <PriorityTag priority={item.priority} />
                    </TD>
                    <TD className="text-right whitespace-nowrap">
                      <Button size="sm" variant={action.urgent ? 'role' : 'secondary'} asChild>
                        <Link to={action.to}>
                          {action.label}
                          <ChevronRight />
                        </Link>
                      </Button>
                    </TD>
                  </TR>
                )
              })}
            </tbody>
          </Table>
          <ul className="divide-y divide-line lg:hidden">
            {data.content.map((item) => {
              const action = nextAction(item)
              return (
                <li key={item.id} className="px-4 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/cases/${item.id}`}>
                      <CaseNumber value={item.caseNumber} />
                    </Link>
                    {stage(item)}
                  </div>
                  <CaseTitle title={item.title} className="mt-1 block text-[15px] text-ink" />
                  <p className="mt-0.5 text-xs text-muted">
                    {caseTypeLabels[item.caseType]} · filed {formatDate(item.filingDate)}
                    {item.lawyers.length ? ` · ${item.lawyers.join(', ')}` : ''}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <PriorityTag priority={item.priority} />
                    <Button size="sm" variant={action.urgent ? 'role' : 'secondary'} asChild>
                      <Link to={action.to}>{action.label}</Link>
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
          <Pagination page={data} onChange={setPage} noun="filings" />
        </div>
      )}
    </section>
  )
}
