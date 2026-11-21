import type { UseQueryResult } from '@tanstack/react-query'
import { Gavel, ScrollText } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Panel } from '@/components/ui/panel'
import { OrderReader } from '@/features/orders/OrderReader'
import { formatDate } from '@/lib/format'
import { orderTypeLabels } from '@/lib/labels'
import type { CaseDetail, CourtOrder } from '@/lib/types'

import { useOpenCaseDialog } from '../caseDialogContext'

export function OrdersTab({ courtCase, query }: { courtCase: CaseDetail; query: UseQueryResult<CourtOrder[]> }) {
  const open = useOpenCaseDialog()
  const [reading, setReading] = useState<CourtOrder | null>(null)
  if (query.isLoading) return <SkeletonRows />
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  const orders = query.data ?? []
  const issue = courtCase.permissions.canIssueOrder && (
    <Button size="sm" variant="primary" onClick={() => open({ kind: 'order' })}>
      <Gavel />
      Issue order
    </Button>
  )
  return (
    <Panel title="Orders and judgments" description="Part of the permanent record; orders are never edited after issue." actions={issue}>
      {orders.length === 0 ? (
        <EmptyState icon={ScrollText} title="No orders have been issued" action={issue} />
      ) : (
        <ol className="divide-y divide-line">
          {orders.map((order) => {
            const final = order.orderType === 'FINAL_ORDER' || order.orderType === 'JUDGMENT'
            return (
              <li key={order.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge tone={final ? 'disposed' : order.orderType === 'DIRECTION' ? 'info' : 'neutral'}>{orderTypeLabels[order.orderType]}</Badge>
                  <span className="tabular">{formatDate(order.orderDate)}</span>
                  <span>by {order.issuedBy.fullName}</span>
                </div>
                <button type="button" onClick={() => setReading(order)} className="mt-1.5 text-left text-[15px] font-semibold text-ink hover:underline">
                  {order.title}
                </button>
                <p className="mt-1 line-clamp-2 max-w-[80ch] font-serif text-[15px] leading-relaxed text-ink-soft">{order.content}</p>
                <button type="button" onClick={() => setReading(order)} className="mt-1 text-[13px] font-medium text-brand hover:underline">
                  Read full order
                </button>
              </li>
            )
          })}
        </ol>
      )}
      {reading && <OrderReader order={reading} onClose={() => setReading(null)} />}
    </Panel>
  )
}
