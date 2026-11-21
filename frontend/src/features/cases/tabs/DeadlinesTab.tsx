import type { UseQueryResult } from '@tanstack/react-query'
import { ListPlus, ListChecks } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Panel } from '@/components/ui/panel'
import { DeadlineTable } from '@/features/deadlines/DeadlineTable'
import type { CaseDetail, Deadline } from '@/lib/types'

import { useOpenCaseDialog } from '../caseDialogContext'

export function DeadlinesTab({ courtCase, query }: { courtCase: CaseDetail; query: UseQueryResult<Deadline[]> }) {
  const open = useOpenCaseDialog()
  if (query.isLoading) return <SkeletonRows />
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  const deadlines = query.data ?? []
  const pending = deadlines.filter((d) => d.status !== 'COMPLETED')
  const completed = deadlines.filter((d) => d.status === 'COMPLETED')
  const add = courtCase.permissions.canManageDeadlines && (
    <Button size="sm" variant="primary" onClick={() => open({ kind: 'deadline' })}>
      <ListPlus />
      Add deadline
    </Button>
  )
  if (deadlines.length === 0) {
    return (
      <Panel title="Deadlines">
        <EmptyState icon={ListChecks} title="No deadlines set" description="Track filings, compliance and deposits with due dates and reminders." action={add} />
      </Panel>
    )
  }
  return (
    <div className="space-y-6">
      <Panel title="Open" description={pending.length ? 'Overdue items are highlighted' : 'Nothing is pending.'} actions={add}>
        {pending.length > 0 && <DeadlineTable deadlines={pending} onEdit={(deadline) => open({ kind: 'deadline', deadline })} />}
      </Panel>
      {completed.length > 0 && (
        <Panel title="Completed">
          <DeadlineTable deadlines={completed} />
        </Panel>
      )}
    </div>
  )
}
