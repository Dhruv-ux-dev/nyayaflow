import { BookOpen, ScrollText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useOrders } from '@/api/records'
import { useCurrentUser } from '@/auth/AuthContext'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { homeCrumb, pageLabel } from '@/components/layout/navigation'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { Pagination } from '@/components/ui/pagination'
import { ListSheet, PageHeader } from '@/components/ui/panel'
import { FilterBar, SearchInput } from '@/components/ui/segmented'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import { options, orderTypeLabels } from '@/lib/labels'
import type { CourtOrder, OrderType } from '@/lib/types'

import { OrderReader } from './OrderReader'

export default function OrdersPage() {
  const user = useCurrentUser()
  const title = pageLabel(user.role, '/orders', 'Orders & judgments')
  useDocumentTitle(title)
  const [search, setSearch] = useState('')
  const [types, setTypes] = useState<OrderType[]>([])
  const [page, setPage] = useState(0)
  const [reading, setReading] = useState<CourtOrder | null>(null)
  const q = useDebounced(search, 300)
  const { data, isLoading, error, refetch, isFetching } = useOrders({ q: q || undefined, type: types, page, size: 20 })

  return (
    <>
      <PageHeader
        breadcrumbs={[homeCrumb(user.role), { label: title }]}
        title={title}
        description={
          user.role === 'LAWYER'
            ? 'Orders and judgments passed in your matters, newest first.'
            : 'The permanent record of orders and judgments in the cases you can see. Orders are never edited after issue.'
        }
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
              placeholder="Order title, case number or case title"
              label="Search orders"
              className="min-w-56"
            />
            <MultiSelect
              label="Type"
              options={options(orderTypeLabels)}
              value={types}
              onChange={(v) => {
                setTypes(v)
                setPage(0)
              }}
            />
          </FilterBar>
        }
      >
        {isLoading && <SkeletonRows />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && <EmptyState icon={ScrollText} title="No orders found" />}
        {data && data.content.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            <ul className="divide-y divide-line">
              {data.content.map((order) => {
                const final = order.orderType === 'FINAL_ORDER' || order.orderType === 'JUDGMENT'
                return (
                  <li key={order.id} className="grid gap-x-6 gap-y-2 px-4 py-4 sm:px-5 md:grid-cols-[2.5rem_minmax(0,1fr)_16rem]">
                    <span
                      className={cn(
                        'hidden size-10 place-items-center rounded-lg md:grid',
                        final ? 'bg-disposed-soft text-disposed' : 'bg-sunken text-ink-soft',
                      )}
                      aria-hidden="true"
                    >
                      <ScrollText className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Badge tone={final ? 'disposed' : order.orderType === 'DIRECTION' ? 'info' : 'neutral'}>
                          {orderTypeLabels[order.orderType]}
                        </Badge>
                        <span className="tabular">{formatDate(order.orderDate)}</span>
                        <span>by {order.issuedBy.fullName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReading(order)}
                        className="mt-1.5 text-left text-[15px] font-semibold text-ink hover:underline"
                      >
                        {order.title}
                      </button>
                      <p className="mt-0.5 line-clamp-2 max-w-[80ch] font-serif text-[15px] leading-relaxed text-ink-soft">{order.content}</p>
                      <button
                        type="button"
                        onClick={() => setReading(order)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
                      >
                        <BookOpen className="size-3.5" aria-hidden="true" />
                        Read order
                      </button>
                    </div>
                    <Link
                      to={`/cases/${order.courtCase.id}?tab=orders`}
                      className="min-w-0 self-start rounded-lg border border-line bg-ivory/60 px-3 py-2 transition-colors hover:bg-ivory"
                    >
                      <CaseNumber value={order.courtCase.caseNumber} />
                      <CaseTitle title={order.courtCase.title} className="block truncate text-sm text-ink-soft" />
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Pagination page={data} onChange={setPage} noun="orders" />
          </div>
        )}
      </ListSheet>
      {reading && <OrderReader order={reading} onClose={() => setReading(null)} showCaseLink />}
    </>
  )
}
