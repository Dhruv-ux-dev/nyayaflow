import { FolderSearch, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { useCourts, useDirectory } from '@/api/admin'
import { useCases, type CaseQuery } from '@/api/cases'
import { useCurrentUser } from '@/auth/AuthContext'
import { can } from '@/auth/roles'
import { CaseStatusBadge, PriorityTag } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { pageLabel } from '@/components/layout/navigation'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Checkbox, Input, Select } from '@/components/ui/form'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/panel'
import { Table, TD, TH, THead, TR } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime, relativeDay } from '@/lib/format'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import { caseStatusLabels, caseTypeLabels, options, pendingStatuses, priorityLabels } from '@/lib/labels'
import type { CaseStatus, CaseSummary, CaseType, Priority } from '@/lib/types'

const sorts = [
  { value: 'filingDate,desc', label: 'Newest filings first' },
  { value: 'filingDate,asc', label: 'Oldest filings first' },
  { value: 'nextHearing,asc', label: 'Next hearing soonest' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'title,asc', label: 'Title A–Z' },
]

const list = <T extends string>(value: string | null) => (value ? (value.split(',').filter(Boolean) as T[]) : [])
const num = (value: string | null) => (value ? Number(value) : undefined)

export default function CaseListPage() {
  const user = useCurrentUser()
  const title = pageLabel(user.role, '/cases', 'Cases')
  useDocumentTitle(title)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const debouncedSearch = useDebounced(search, 300)
  const registry = can.registerCases(user.role)

  const query: CaseQuery = useMemo(
    () => ({
      q: params.get('q') ?? undefined,
      status: list<CaseStatus>(params.get('status')),
      type: list<CaseType>(params.get('type')),
      priority: list<Priority>(params.get('priority')),
      judgeId: num(params.get('judgeId')),
      courtId: num(params.get('courtId')),
      hasHearing: params.get('hasHearing') === 'true' ? true : undefined,
      unassigned: params.get('unassigned') === 'true' ? true : undefined,
      sort: params.get('sort') ?? 'filingDate,desc',
      page: num(params.get('page')) ?? 0,
      size: 20,
    }),
    [params],
  )
  const { data, isLoading, isFetching, error, refetch } = useCases(query)
  const { data: courts } = useCourts()
  const { data: judges } = useDirectory('JUDGE', can.viewDirectory(user.role))

  const update = (changes: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  // Typing updates the URL (debounced); navigating to a URL with ?q= updates the box.
  useEffect(() => {
    if ((params.get('q') ?? '') !== debouncedSearch) update({ q: debouncedSearch || undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])
  const urlQuery = params.get('q') ?? ''
  useEffect(() => setSearch(urlQuery), [urlQuery])

  const filterCount = ['status', 'type', 'priority', 'judgeId', 'courtId', 'hasHearing', 'unassigned'].filter((k) => params.get(k)).length
  const clearAll = () => {
    setSearch('')
    setParams(new URLSearchParams(params.get('sort') ? { sort: params.get('sort')! } : {}), { replace: true })
  }

  return (
    <>
      <PageHeader
        title={title}
        description={
          user.role === 'JUDGE'
            ? 'Cases allocated to you.'
            : user.role === 'LAWYER'
              ? 'Cases in which you appear as counsel.'
              : 'Every case registered across the courts.'
        }
        actions={
          registry && (
            <Button variant="primary" asChild>
              <Link to="/cases/new">
                <Plus />
                Register case
              </Link>
            </Button>
          )
        }
      />

      <div className="rounded-lg border border-line bg-surface">
        <div className="space-y-3 border-b border-line p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by case number, title, party, counsel or judge"
                aria-label="Search cases"
                className="pl-9"
              />
            </div>
            <Select value={query.sort} onChange={(event) => update({ sort: event.target.value }, false)} aria-label="Sort cases" className="lg:w-56">
              {sorts.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MultiSelect
              label="Status"
              options={options(caseStatusLabels)}
              value={query.status ?? []}
              onChange={(value) => update({ status: value.join(',') || undefined })}
              presets={[
                { label: 'Pending', values: pendingStatuses },
                { label: 'Decided', values: ['DISPOSED', 'CLOSED'] },
              ]}
            />
            <MultiSelect label="Type" options={options(caseTypeLabels)} value={query.type ?? []} onChange={(value) => update({ type: value.join(',') || undefined })} />
            <MultiSelect
              label="Priority"
              options={options(priorityLabels)}
              value={query.priority ?? []}
              onChange={(value) => update({ priority: value.join(',') || undefined })}
            />
            {judges && user.role !== 'JUDGE' && (
              <Select
                value={params.get('judgeId') ?? ''}
                onChange={(event) => update({ judgeId: event.target.value || undefined })}
                aria-label="Filter by judge"
                className="w-48"
              >
                <option value="">Any judge</option>
                {judges.map((judge) => (
                  <option key={judge.id} value={judge.id}>
                    {judge.fullName}
                  </option>
                ))}
              </Select>
            )}
            {courts && courts.length > 1 && (
              <Select value={params.get('courtId') ?? ''} onChange={(event) => update({ courtId: event.target.value || undefined })} aria-label="Filter by court" className="w-56">
                <option value="">All courts</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </Select>
            )}
            <Checkbox
              label="Has a hearing listed"
              checked={query.hasHearing === true}
              onChange={(event) => update({ hasHearing: event.target.checked ? 'true' : undefined })}
              className="ml-1"
            />
            {registry && (
              <Checkbox
                label="Without a judge"
                checked={query.unassigned === true}
                onChange={(event) => update({ unassigned: event.target.checked ? 'true' : undefined })}
                className="ml-1"
              />
            )}
            {(filterCount > 0 || query.q) && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="ml-auto">
                <X />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {isLoading && <SkeletonRows rows={8} />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && (
          <EmptyState
            icon={FolderSearch}
            title={filterCount || query.q ? 'No cases match these filters' : 'No cases yet'}
            description={filterCount || query.q ? 'Try a different search term or remove a filter.' : registry ? 'Register the first case to get started.' : undefined}
            action={
              filterCount || query.q ? (
                <Button onClick={clearAll}>Clear filters</Button>
              ) : registry ? (
                <Button variant="primary" asChild>
                  <Link to="/cases/new">Register case</Link>
                </Button>
              ) : undefined
            }
          />
        )}
        {data && data.content.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            <Table className="hidden md:block">
              <THead>
                <tr>
                  <TH className="w-[38%]">Case</TH>
                  <TH>Status</TH>
                  <TH>Judge</TH>
                  <TH>Next hearing</TH>
                  <TH>Filed</TH>
                </tr>
              </THead>
              <tbody>
                {data.content.map((item) => (
                  <CaseRow key={item.id} item={item} onOpen={() => navigate(`/cases/${item.id}`)} />
                ))}
              </tbody>
            </Table>
            <ul className="divide-y divide-line md:hidden">
              {data.content.map((item) => (
                <li key={item.id}>
                  <Link to={`/cases/${item.id}`} className="block px-4 py-3">
                    <span className="flex items-center justify-between gap-2">
                      <CaseNumber value={item.caseNumber} />
                      <CaseStatusBadge status={item.status} />
                    </span>
                    <CaseTitle title={item.title} className="mt-1 block text-[15px] text-ink" />
                    <span className="mt-1 block text-xs text-muted">
                      {item.nextHearingAt ? `Next hearing ${formatDateTime(item.nextHearingAt)}` : 'No hearing listed'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={data} onChange={(page) => update({ page: page ? String(page) : undefined }, false)} noun="cases" />
          </div>
        )}
      </div>
    </>
  )
}

function CaseRow({ item, onOpen }: { item: CaseSummary; onOpen: () => void }) {
  return (
    <TR className="cursor-pointer transition-colors hover:bg-paper" onClick={onOpen}>
      <TD>
        <span className="flex items-center gap-2">
          <Link to={`/cases/${item.id}`} onClick={(event) => event.stopPropagation()} className="hover:underline">
            <CaseNumber value={item.caseNumber} />
          </Link>
          <span className="text-xs text-muted">{caseTypeLabels[item.caseType]}</span>
          <PriorityTag priority={item.priority} quiet />
        </span>
        <CaseTitle title={item.title} className="mt-0.5 block text-[15px] leading-snug text-ink" />
        {item.lawyers.length > 0 && <span className="mt-0.5 block truncate text-xs text-muted">Counsel: {item.lawyers.join(', ')}</span>}
      </TD>
      <TD>
        <CaseStatusBadge status={item.status} />
      </TD>
      <TD className="text-sm text-ink-soft">{item.judge?.fullName ?? <span className="text-faint">Not assigned</span>}</TD>
      <TD className="whitespace-nowrap">
        {item.nextHearingAt ? (
          <>
            <span className="tabular block text-sm text-ink">{formatDateTime(item.nextHearingAt)}</span>
            <span className={cn('block text-xs', new Date(item.nextHearingAt) < new Date() ? 'font-medium text-danger' : 'text-muted')}>
              {new Date(item.nextHearingAt) < new Date() ? 'Outcome pending' : relativeDay(item.nextHearingAt)}
            </span>
          </>
        ) : (
          <span className="text-sm text-faint">None listed</span>
        )}
      </TD>
      <TD className="tabular text-sm whitespace-nowrap text-ink-soft">{formatDate(item.filingDate)}</TD>
    </TR>
  )
}
