import { addDays, format, subDays } from 'date-fns'
import { CalendarDays, Gavel, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useCourts, useDirectory } from '@/api/admin'
import { useHearings, type HearingQuery } from '@/api/hearings'
import { useCurrentUser } from '@/auth/AuthContext'
import { can } from '@/auth/roles'
import { HearingStatusBadge } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { pageLabel } from '@/components/layout/navigation'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Input, Select } from '@/components/ui/form'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/panel'
import { CauseList } from '@/features/dashboard/CauseList'
import { cn } from '@/lib/cn'
import { formatTime, formatWeekday, relativeDay } from '@/lib/format'
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

  const selectRange = (key: Range) => {
    setPage(0)
    setStatuses([])
    setParams(key === 'today' ? {} : { range: key }, { replace: true })
  }

  return (
    <>
      <PageHeader
        title={title}
        description={user.role === 'JUDGE' ? 'Your board.' : user.role === 'LAWYER' ? 'Listings in the cases you appear in.' : 'Listings across all courtrooms.'}
        actions={
          <Button asChild>
            <Link to="/calendar">
              <CalendarDays />
              Calendar view
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Period">
        {ranges.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={range === r.key}
            onClick={() => selectRange(r.key)}
            className={cn(
              '-mb-px h-10 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
              range === r.key ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Case number or title"
              aria-label="Search hearings"
              className="pl-9"
            />
          </div>
          {range !== 'pending' && range !== 'week' && range !== 'upcoming' && (
            <MultiSelect label="Status" options={options(hearingStatusLabels)} value={statuses} onChange={(v) => { setStatuses(v); setPage(0) }} />
          )}
          <MultiSelect label="Type" options={options(hearingTypeLabels)} value={types} onChange={(v) => { setTypes(v); setPage(0) }} />
          {judges && (
            <Select value={judgeId} onChange={(e) => { setJudgeId(e.target.value); setPage(0) }} aria-label="Filter by judge" className="w-48">
              <option value="">Any judge</option>
              {judges.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.fullName}
                </option>
              ))}
            </Select>
          )}
          <Select value={courtroomId} onChange={(e) => { setCourtroomId(e.target.value); setPage(0) }} aria-label="Filter by courtroom" className="w-52">
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
        </div>

        {isLoading && <SkeletonRows rows={6} />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && hearings.length === 0 && (
          <EmptyState
            icon={Gavel}
            title={range === 'today' ? 'No matters are listed for today' : range === 'pending' ? 'Every held hearing has an outcome' : 'No hearings in this period'}
            description={range === 'today' ? 'Check the next 7 days or the calendar.' : undefined}
          />
        )}
        {data && hearings.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            {range === 'today' ? <CauseList hearings={hearings} showJudge={user.role !== 'JUDGE'} /> : <DayGroups hearings={hearings} />}
            {range !== 'today' && <Pagination page={data} onChange={setPage} noun="hearings" />}
          </div>
        )}
      </div>
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
          <h2 className="flex items-baseline gap-2 border-b border-line bg-paper/70 px-4 py-2 text-[13px] font-semibold text-ink">
            {formatWeekday(day)}
            <span className="font-normal text-muted">{relativeDay(day)}</span>
          </h2>
          <ul className="divide-y divide-line">
            {items.map((hearing) => (
              <li key={hearing.id}>
                <Link
                  to={`/cases/${hearing.courtCase.id}?tab=hearings`}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 px-4 py-3 transition-colors hover:bg-paper sm:grid-cols-[3.5rem_minmax(0,1fr)_12rem_auto]"
                >
                  <span className="tabular pt-0.5 text-sm font-semibold text-ink">{formatTime(hearing.scheduledAt)}</span>
                  <span className="min-w-0">
                    <CaseNumber value={hearing.courtCase.caseNumber} />
                    <CaseTitle title={hearing.courtCase.title} className="block truncate text-[15px] text-ink" />
                    <span className="block truncate text-xs text-muted">
                      {hearingTypeLabels[hearing.hearingType]}
                      {hearing.status === 'SCHEDULED' ? (hearing.purpose ? `: ${hearing.purpose}` : '') : hearing.outcome ? `: ${hearing.outcome}` : ''}
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
