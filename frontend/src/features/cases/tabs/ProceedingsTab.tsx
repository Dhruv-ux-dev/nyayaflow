import type { UseQueryResult } from '@tanstack/react-query'
import { NotebookPen, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Panel } from '@/components/ui/panel'
import { formatDate, formatTime } from '@/lib/format'
import { hearingTypeLabels } from '@/lib/labels'
import type { CaseDetail, Proceeding } from '@/lib/types'

import { useOpenCaseDialog } from '../caseDialogContext'

/** Proceedings laid out like a court order sheet: the date in the margin, the record beside it. */
export function ProceedingsTab({ courtCase, query }: { courtCase: CaseDetail; query: UseQueryResult<Proceeding[]> }) {
  const open = useOpenCaseDialog()
  if (query.isLoading) return <SkeletonRows />
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  const proceedings = query.data ?? []
  const recordButton = courtCase.permissions.canRecordProceeding && (
    <Button size="sm" variant="primary" onClick={() => open({ kind: 'proceeding' })}>
      <NotebookPen />
      Record proceedings
    </Button>
  )
  return (
    <Panel title="Order sheet" description="What transpired on each date, oldest first" actions={recordButton}>
      {proceedings.length === 0 ? (
        <EmptyState icon={NotebookPen} title="No proceedings recorded" description="Proceedings are usually recorded when a hearing’s outcome is saved." />
      ) : (
        <ol>
          {proceedings.map((proceeding, index) => (
            <li key={proceeding.id} className="grid grid-cols-[minmax(0,1fr)] border-b border-line last:border-b-0 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
              <div className="border-line px-4 pt-4 sm:border-r sm:pb-4">
                <p className="tabular text-sm font-semibold text-ink">{formatDate(proceeding.proceedingDate)}</p>
                {proceeding.hearing && (
                  <p className="text-xs text-muted">
                    {hearingTypeLabels[proceeding.hearing.hearingType]}, {formatTime(proceeding.hearing.scheduledAt)}
                  </p>
                )}
                <p className="mt-1 text-xs text-faint">Entry {index + 1}</p>
              </div>
              <div className="px-4 py-4">
                <p className="max-w-[75ch] font-serif text-[16px] leading-relaxed whitespace-pre-line text-ink">{proceeding.summary}</p>
                {proceeding.remarks && <p className="mt-2 max-w-[75ch] text-sm text-ink-soft">Remarks: {proceeding.remarks}</p>}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    Recorded by {proceeding.recordedBy.fullName}
                    {proceeding.updatedAt !== proceeding.createdAt ? ', corrected later' : ''}
                  </p>
                  {proceeding.editable && (
                    <Button size="sm" variant="ghost" onClick={() => open({ kind: 'proceeding', proceeding })}>
                      <Pencil />
                      Correct
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
