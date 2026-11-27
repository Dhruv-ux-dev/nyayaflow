import { ListChecks } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { useDeadlines } from '@/api/deadlines'
import { useCurrentUser } from '@/auth/AuthContext'
import { useCounts } from '@/api/insights'
import { homeCrumb, pageLabel } from '@/components/layout/navigation'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Checkbox } from '@/components/ui/form'
import { Pagination } from '@/components/ui/pagination'
import { ListSheet, PageHeader } from '@/components/ui/panel'
import { FilterBar, SearchInput, SegmentedTabs } from '@/components/ui/segmented'
import { cn } from '@/lib/cn'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import type { DeadlineView } from '@/lib/types'

import { DeadlineTable } from './DeadlineTable'

const views: Array<{ key: DeadlineView; label: string; empty: string }> = [
  { key: 'OPEN', label: 'Open', empty: 'Nothing is pending' },
  { key: 'OVERDUE', label: 'Overdue', empty: 'Nothing is overdue' },
  { key: 'DUE_SOON', label: 'Due in 7 days', empty: 'Nothing is due this week' },
  { key: 'COMPLETED', label: 'Completed', empty: 'No completed deadlines yet' },
  { key: 'ALL', label: 'All', empty: 'No deadlines yet' },
]

export default function DeadlinesPage() {
  const user = useCurrentUser()
  const title = pageLabel(user.role, '/deadlines', 'Deadlines')
  useDocumentTitle(title)
  const [params, setParams] = useSearchParams()
  const view = (views.some((v) => v.key === params.get('view')) ? params.get('view') : 'OPEN') as DeadlineView
  const [mine, setMine] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const q = useDebounced(search, 300)
  const { data, isLoading, error, refetch, isFetching } = useDeadlines({ view, mine, q: q || undefined, page, size: 25 })
  const viewCounts = useCounts(
    '/deadlines',
    views.map((v) => ({ key: v.key, query: { view: v.key, mine } })),
  )

  return (
    <>
      <PageHeader
        breadcrumbs={[homeCrumb(user.role), { label: title }]}
        title={title}
        description={
          user.role === 'LAWYER' ? 'Filings, compliance and tasks due in your matters.' : 'Tasks and compliance dates across the cases you can see.'
        }
      />
      <SegmentedTabs
        label="Deadlines"
        className="mb-4"
        value={view}
        onChange={(key) => {
          setPage(0)
          setParams(key === 'OPEN' ? {} : { view: key }, { replace: true })
        }}
        options={views.map((v) => ({ value: v.key, label: v.label, count: viewCounts.counts.get(v.key), alert: v.key === 'OVERDUE' }))}
      />
      <ListSheet
        toolbar={
          <FilterBar>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(0)
              }}
              placeholder="Deadline or case number"
              label="Search deadlines"
              className="min-w-56"
            />
            <Checkbox
              label="Assigned to me"
              checked={mine}
              onChange={(e) => {
                setMine(e.target.checked)
                setPage(0)
              }}
            />
          </FilterBar>
        }
      >
        {isLoading && <SkeletonRows />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && <EmptyState icon={ListChecks} title={views.find((v) => v.key === view)!.empty} />}
        {data && data.content.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            <DeadlineTable deadlines={data.content} showCase />
            <Pagination page={data} onChange={setPage} noun="deadlines" />
          </div>
        )}
      </ListSheet>
    </>
  )
}
