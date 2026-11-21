import { useState } from 'react'

import { useCaseActivity } from '@/api/cases'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Pagination } from '@/components/ui/pagination'
import { Panel } from '@/components/ui/panel'
import { formatDateTime } from '@/lib/format'
import { auditCategoryLabels } from '@/lib/labels'
import type { CaseDetail } from '@/lib/types'

/** Who did what and when: the raw audit trail of this case, newest first. */
export function ActivityTab({ courtCase }: { courtCase: CaseDetail }) {
  const [page, setPage] = useState(0)
  const { data, isLoading, error, refetch } = useCaseActivity(courtCase.id, page)
  if (isLoading) return <SkeletonRows />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  return (
    <Panel title="Activity" description="Every change made to this case, as recorded by the system">
      {!data || data.content.length === 0 ? (
        <EmptyState title="No activity recorded" />
      ) : (
        <>
          <ol className="divide-y divide-line">
            {data.content.map((event) => (
              <li key={event.id} className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-0.5 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)_8rem]">
                <span className="tabular text-xs text-muted sm:pt-0.5">{formatDateTime(event.occurredAt)}</span>
                <span className="text-sm text-ink-soft">
                  <span className="font-medium text-ink">{event.actorName ?? 'System'}</span>: {event.summary}
                </span>
                <span className="text-xs text-faint sm:text-right">{auditCategoryLabels[event.category]}</span>
              </li>
            ))}
          </ol>
          <Pagination page={data} onChange={setPage} noun="events" />
        </>
      )}
    </Panel>
  )
}
