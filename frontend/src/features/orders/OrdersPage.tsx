import { ScrollText, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useOrders } from '@/api/records'
import { useCurrentUser } from '@/auth/AuthContext'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { pageLabel } from '@/components/layout/navigation'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Input } from '@/components/ui/form'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/panel'
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
      <PageHeader title={title} description="Every order issued in the cases you can see, newest first." />
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
              placeholder="Order title, case number or case title"
              aria-label="Search orders"
              className="pl-9"
            />
          </div>
          <MultiSelect label="Type" options={options(orderTypeLabels)} value={types} onChange={(v) => { setTypes(v); setPage(0) }} />
        </div>
        {isLoading && <SkeletonRows />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && <EmptyState icon={ScrollText} title="No orders found" />}
        {data && data.content.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            <ul className="divide-y divide-line">
              {data.content.map((order) => {
                const final = order.orderType === 'FINAL_ORDER' || order.orderType === 'JUDGMENT'
                return (
                  <li key={order.id} className="grid gap-x-6 gap-y-1 px-4 py-4 md:grid-cols-[minmax(0,1fr)_16rem]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Badge tone={final ? 'disposed' : order.orderType === 'DIRECTION' ? 'info' : 'neutral'}>{orderTypeLabels[order.orderType]}</Badge>
                        <span className="tabular">{formatDate(order.orderDate)}</span>
                        <span>by {order.issuedBy.fullName}</span>
                      </div>
                      <button type="button" onClick={() => setReading(order)} className="mt-1.5 text-left text-[15px] font-semibold text-ink hover:underline">
                        {order.title}
                      </button>
                      <p className="mt-0.5 line-clamp-2 max-w-[80ch] font-serif text-[15px] leading-relaxed text-ink-soft">{order.content}</p>
                    </div>
                    <Link to={`/cases/${order.courtCase.id}?tab=orders`} className="min-w-0 self-start rounded-md px-0 py-1 hover:underline md:px-3">
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
      </div>
      {reading && <OrderReader order={reading} onClose={() => setReading(null)} showCaseLink />}
    </>
  )
}
