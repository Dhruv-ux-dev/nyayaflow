import { History, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useAuditLog } from '@/api/admin'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Input, Select } from '@/components/ui/form'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/panel'
import { Table, TD, TH, THead, TR } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import { auditCategoryLabels, options } from '@/lib/labels'
import type { AuditCategory } from '@/lib/types'

export default function AuditPage() {
  useDocumentTitle('Activity log')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<AuditCategory | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const q = useDebounced(search, 300)
  const { data, isLoading, error, refetch, isFetching } = useAuditLog({
    q: q || undefined,
    category: category || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    size: 30,
  })
  const reset = () => setPage(0)

  return (
    <>
      <PageHeader title="Activity log" description="Every significant action in NyayaFlow: sign-ins, account changes, configuration and case events." />
      <div className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); reset() }} placeholder="Person or description" aria-label="Search activity" className="pl-9" />
          </div>
          <Select value={category} onChange={(e) => { setCategory(e.target.value as AuditCategory | ''); reset() }} aria-label="Filter by area" className="w-44">
            <option value="">All areas</option>
            {options(auditCategoryLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted">
            From
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset() }} className="w-40" />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            to
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); reset() }} className="w-40" />
          </label>
        </div>
        {isLoading && <SkeletonRows />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && <EmptyState icon={History} title="No activity matches" />}
        {data && data.content.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            <Table>
              <THead>
                <tr>
                  <TH>When</TH>
                  <TH>Who</TH>
                  <TH>What happened</TH>
                  <TH>Area</TH>
                </tr>
              </THead>
              <tbody>
                {data.content.map((event) => (
                  <TR key={event.id}>
                    <TD className="tabular text-[13px] whitespace-nowrap text-muted">{formatDateTime(event.occurredAt)}</TD>
                    <TD className="text-sm whitespace-nowrap text-ink">{event.actorName ?? 'System'}</TD>
                    <TD className="text-sm text-ink-soft">
                      {event.caseId ? (
                        <Link to={`/cases/${event.caseId}?tab=activity`} className="hover:text-ink hover:underline">
                          {event.summary}
                        </Link>
                      ) : (
                        event.summary
                      )}
                    </TD>
                    <TD className="text-xs whitespace-nowrap text-muted">{auditCategoryLabels[event.category]}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination page={data} onChange={setPage} noun="events" />
          </div>
        )}
      </div>
    </>
  )
}
