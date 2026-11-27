import { addDays, format, subDays } from 'date-fns'
import { CalendarDays, Gavel, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useCourts, useDirectory } from '@/api/admin'
import { useHearings, type HearingQuery } from '@/api/hearings'
import { useCurrentUser } from '@/auth/AuthContext'
import { can } from '@/auth/roles'
import { HearingStatusBadge } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { useCounts } from '@/api/insights'
import { homeCrumb, pageLabel } from '@/components/layout/navigation'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Select } from '@/components/ui/form'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { Pagination } from '@/components/ui/pagination'
import { ListSheet, PageHeader } from '@/components/ui/panel'
import { FilterBar, SearchInput, SegmentedTabs } from '@/components/ui/segmented'
import { CauseList } from '@/features/dashboard/CauseList'
import { cn } from '@/lib/cn'
import { formatDate, formatTime, formatWeekday, relativeDay } from '@/lib/format'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import { hearingStatusLabels, hearingTypeLabels, options } from '@/lib/labels'
import type { Hearing, HearingStatus, HearingType } from '@/lib/types'

type Range = 'today' | 'week' | 'upcoming' | 'past' | 'pending'

const ranges: Array<{ key: Range; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Next 7 days' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'pending', label: 'Outcome pending' },
  { key: 'past', label: 'Past' },
]

const iso = (date: Date) => format(date, 'yyyy-MM-dd')

function rangeQuery(range: Range): HearingQuery {
  const today = new Date()
  switch (range) {
    case 'today':
      return { from: iso(today), to: iso(today), direction: 'asc' }
    case 'week':
      return { from: iso(today), to: iso(addDays(today, 6)), direction: 'asc', status: ['SCHEDULED'] }
    case 'upcoming':
      return { from: iso(today), direction: 'asc', status: ['SCHEDULED'] }
    case 'pending':
      return { to: iso(today), direction: 'desc', status: ['SCHEDULED'] }
    case 'past':
      return { from: iso(subDays(today, 90)), to: iso(subDays(today, 1)), direction: 'desc' }
  }
}

export default function HearingsPage() {
  const user = useCurrentUser()
  const title = pageLabel(user.role, '/hearings', 'Hearings')
  useDocumentTitle(title)
  const [params, setParams] = useSearchParams()
  const range = (ranges.some((r) => r.key === params.get('range')) ? params.get('range') : 'today') as Range
  const [statuses, setStatuses] = useState<HearingStatus[]>([])
  const [types, setTypes] = useState<HearingType[]>([])
  const [judgeId, setJudgeId] = useState('')
  const [courtroomId, setCourtroomId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const q = useDebounced(search, 300)
  const { data: judges } = useDirectory('JUDGE', can.viewDirectory(user.role) && user.role !== 'JUDGE')
  const { data: courts } = useCourts()

  const query = useMemo<HearingQuery>(() => {
    const base = rangeQuery(range)
    return {
      ...base,
      status: statuses.length ? statuses : base.status,
      type: types,
      judgeId: judgeId ? Number(judgeId) : undefined,
      courtroomId: courtroomId ? Number(courtroomId) : undefined,
      q: q || undefined,
      page,
      size: range === 'today' ? 100 : 30,
    }
  }, [range, statuses, types, judgeId, courtroomId, q, page])
  const { data, isLoading, error, refetch, isFetching } = useHearings(query)
  const now = new Date()
  const hearings = (data?.content ?? []).filter((h) => range !== 'pending' || new Date(h.scheduledAt) < now)
  const rangeCounts = useCounts(
    '/hearings',
    (['today', 'week', 'upcoming'] as Range[]).map((key) => {
      const base = rangeQuery(key)
      return { key, query: { from: base.from, to: base.to, status: base.status } }
    }),
  )

  const selectRange = (key: Range) => {
    setPage(0)
    setStatuses([])
    setParams(key === 'today' ? {} : { range: key }, { replace: true })
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[homeCrumb(user.role), { label: title }]}
        title={title}
        description={
          user.role === 'JUDGE'
            ? 'Matters listed before you, by day and courtroom.'
            : user.role === 'LAWYER'
              ? 'Listings in the matters you appear in.'
              : 'Daily cause lists across all courtrooms.'
        }
        actions={
          <>
            {range === 'today' && hearings.length > 0 && (
              <Button onClick={() => window.print()}>
                <Printer />
                Print cause list
              </Button>
            )}
            <Button asChild>
              <Link to="/calendar">
                <CalendarDays />
                Calendar view
              </Link>
            </Button>
          </>
        }
      />

      <SegmentedTabs
        label="Period"
        className="no-print mb-4"
        value={range}
        onChange={selectRange}
        options={ranges.map((r) => ({ value: r.key, label: r.label, count: rangeCounts.counts.get(r.key) }))}
      />

      <p className="mb-3 hidden font-serif text-xl print:block">Cause list for {formatDate(new Date())}</p>

      <ListSheet
        className="print-plain"
        toolbar={
          <FilterBar className="no-print">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(0)
              }}
              placeholder="Case number or title"
              label="Search hearings"
              className="min-w-56"
            />
            {range !== 'pending' && range !== 'week' && range !== 'upcoming' && (
              <MultiSelect
                label="Status"
                options={options(hearingStatusLabels)}
                value={statuses}
                onChange={(v) => {
                  setStatuses(v)
                  setPage(0)
                }}
              />
            )}
            <MultiSelect
              label="Type"
              options={options(hearingTypeLabels)}
              value={types}
              onChange={(v) => {
                setTypes(v)
                setPage(0)
              }}
            />
            {judges && (
              <Select
                value={judgeId}
                onChange={(e) => {
                  setJudgeId(e.target.value)
                  setPage(0)
                }}
                aria-label="Filter by judge"
                className="w-48"
              >
                <option value="">Any judge</option>
                {judges.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.fullName}
                  </option>
                ))}
              </Select>
            )}
            <Select
              value={courtroomId}
              onChange={(e) => {
                setCourtroomId(e.target.value)
                setPage(0)
              }}
              aria-label="Filter by courtroom"
              className="w-52"
            >
              <option value="">Any courtroom</option>
              {courts?.map((court) => (
                <optgroup key={court.id} label={court.name}>
                  {court.courtrooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </FilterBar>
        }
      >
        {isLoading && <SkeletonRows rows={6} />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && hearings.length === 0 && (
          <EmptyState
            icon={Gavel}
            title={
              range === 'today'
                ? 'No matters are listed for today'
                : range === 'pending'
                  ? 'Every held hearing has an outcome'
                  : 'No hearings in this period'
            }
            description={range === 'today' ? 'Check the next 7 days or the calendar.' : undefined}
          />
        )}
        {data && hearings.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            {range === 'today' ? <CauseList hearings={hearings} showJudge={user.role !== 'JUDGE'} /> : <DayGroups hearings={hearings} />}
            {range !== 'today' && <Pagination page={data} onChange={setPage} noun="hearings" />}
          </div>
        )}
      </ListSheet>
    </>
  )
}

function DayGroups({ hearings }: { hearings: Hearing[] }) {
  const days = new Map<string, Hearing[]>()
  for (const hearing of hearings) {
    const day = hearing.scheduledAt.slice(0, 10)
    days.set(day, [...(days.get(day) ?? []), hearing])
  }
  return (
    <div>
      {[...days.entries()].map(([day, items]) => (
        <section key={day} aria-label={formatWeekday(day)}>
          <h2 className="flex items-baseline gap-2 border-b border-line bg-ivory px-4 py-2 text-[13px] font-semibold text-ink sm:px-5">
            {formatWeekday(day)}
            <span className="font-normal text-muted">{relativeDay(day)}</span>
          </h2>
          <ul className="divide-y divide-line">
            {items.map((hearing) => (
              <li key={hearing.id}>
                <Link
                  to={`/cases/${hearing.courtCase.id}?tab=hearings`}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 px-4 py-3 transition-colors hover:bg-ivory sm:grid-cols-[3.5rem_minmax(0,1fr)_12rem_auto] sm:px-5"
                >
                  <span className="tabular pt-0.5 text-sm font-semibold text-ink">{formatTime(hearing.scheduledAt)}</span>
                  <span className="min-w-0">
                    <CaseNumber value={hearing.courtCase.caseNumber} />
                    <CaseTitle title={hearing.courtCase.title} className="block truncate text-[15px] text-ink" />
                    <span className="block truncate text-xs text-muted">
                      {hearingTypeLabels[hearing.hearingType]}
                      {hearing.status === 'SCHEDULED'
                        ? hearing.purpose
                          ? `: ${hearing.purpose}`
                          : ''
                        : hearing.outcome
                          ? `: ${hearing.outcome}`
                          : ''}
                    </span>
                  </span>
                  <span className="col-start-2 text-xs text-muted sm:col-start-auto sm:pt-1">
                    {hearing.courtroom?.name}
                    {hearing.judge ? <span className="block">{hearing.judge.fullName}</span> : null}
                  </span>
                  <span className="col-start-2 mt-1 sm:col-start-auto sm:mt-0">
                    <HearingStatusBadge status={hearing.status} outcomePending={hearing.outcomePending} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
