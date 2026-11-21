import { ListChecks, Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { useDeadlines } from '@/api/deadlines'
import { useCurrentUser } from '@/auth/AuthContext'
import { pageLabel } from '@/components/layout/navigation'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Checkbox, Input } from '@/components/ui/form'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/panel'
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

  return (
    <>
      <PageHeader
        title={title}
        description={user.role === 'LAWYER' ? 'Tasks and compliance dates in your cases.' : 'Tasks and compliance dates across the cases you can see.'}
      />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Deadlines">
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => {
              setPage(0)
              setParams(v.key === 'OPEN' ? {} : { view: v.key }, { replace: true })
            }}
            className={cn(
              '-mb-px h-10 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
              view === v.key ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3 sm:p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Deadline or case number"
              aria-label="Search deadlines"
              className="pl-9"
            />
          </div>
          <Checkbox
            label="Assigned to me"
            checked={mine}
            onChange={(e) => {
              setMine(e.target.checked)
              setPage(0)
            }}
          />
        </div>
        {isLoading && <SkeletonRows />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && <EmptyState icon={ListChecks} title={views.find((v) => v.key === view)!.empty} />}
        {data && data.content.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            <DeadlineTable deadlines={data.content} showCase />
            <Pagination page={data} onChange={setPage} noun="deadlines" />
          </div>
        )}
      </div>
    </>
  )
}
