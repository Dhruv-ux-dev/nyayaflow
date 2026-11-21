import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useCompleteDeadline, useDeleteDeadline, useReopenDeadline } from '@/api/deadlines'
import { DeadlineStatusBadge, DueLabel, PriorityTag } from '@/components/domain/badges'
import { CaseNumber } from '@/components/domain/CaseTitle'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Menu, MenuItem } from '@/components/ui/menu'
import { Table, TD, TH, THead, TR } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { Deadline } from '@/lib/types'

export function DeadlineTable({ deadlines, showCase = false, onEdit }: { deadlines: Deadline[]; showCase?: boolean; onEdit?: (deadline: Deadline) => void }) {
  const complete = useCompleteDeadline()
  const reopen = useReopenDeadline()
  const remove = useDeleteDeadline()
  const [deleting, setDeleting] = useState<Deadline | null>(null)

  return (
    <>
      <Table>
        <THead>
          <tr>
            <TH className="w-10">
              <span className="sr-only">Done</span>
            </TH>
            <TH>Deadline</TH>
            {showCase && <TH>Case</TH>}
            <TH>Due</TH>
            <TH>Assigned to</TH>
            <TH>Status</TH>
            <TH className="text-right">
              <span className="sr-only">Actions</span>
            </TH>
          </tr>
        </THead>
        <tbody>
          {deadlines.map((deadline) => {
            const done = deadline.status === 'COMPLETED'
            return (
              <TR key={deadline.id} className={cn(deadline.status === 'OVERDUE' && 'bg-danger-soft/30')}>
                <TD className="pr-0">
                  <button
                    type="button"
                    disabled={!deadline.canComplete || complete.isPending || reopen.isPending}
                    onClick={() => (done ? reopen.mutate(deadline.id) : complete.mutate(deadline.id))}
                    aria-label={done ? `Reopen ${deadline.title}` : `Mark ${deadline.title} as completed`}
                    title={deadline.canComplete ? (done ? 'Reopen' : 'Mark as completed') : undefined}
                    className={cn(
                      'grid size-5 place-items-center rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      done ? 'border-success bg-success text-white' : 'border-line-strong hover:border-success',
                    )}
                  >
                    {done && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                  </button>
                </TD>
                <TD className="min-w-[14rem]">
                  <p className={cn('font-medium', done ? 'text-muted line-through decoration-faint' : 'text-ink')}>{deadline.title}</p>
                  {deadline.description && <p className="mt-0.5 max-w-[56ch] text-[13px] text-muted">{deadline.description}</p>}
                  <PriorityTag priority={deadline.priority} quiet />
                </TD>
                {showCase && (
                  <TD>
                    <Link to={`/cases/${deadline.courtCase.id}?tab=deadlines`} className="hover:underline">
                      <CaseNumber value={deadline.courtCase.caseNumber} />
                    </Link>
                    <p className="max-w-[220px] truncate text-xs text-muted">{deadline.courtCase.title}</p>
                  </TD>
                )}
                <TD className="whitespace-nowrap">
                  <p className="tabular text-sm text-ink">{formatDate(deadline.dueDate)}</p>
                  <DueLabel days={deadline.daysUntilDue} status={deadline.status} />
                </TD>
                <TD className="text-sm text-ink-soft">{deadline.assignedTo?.fullName ?? <span className="text-faint">Unassigned</span>}</TD>
                <TD>
                  <DeadlineStatusBadge status={deadline.status} />
                  {done && deadline.completedBy && <p className="mt-1 text-xs text-muted">by {deadline.completedBy.fullName}</p>}
                </TD>
                <TD className="text-right">
                  {deadline.canEdit && (
                    <Menu
                      trigger={
                        <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${deadline.title}`}>
                          <MoreHorizontal />
                        </Button>
                      }
                    >
                      {onEdit && !done && (
                        <MenuItem onSelect={() => onEdit(deadline)}>
                          <Pencil />
                          Edit
                        </MenuItem>
                      )}
                      {done && (
                        <MenuItem onSelect={() => reopen.mutate(deadline.id)}>
                          <RotateCcw />
                          Reopen
                        </MenuItem>
                      )}
                      <MenuItem tone="danger" onSelect={() => setDeleting(deadline)}>
                        <Trash2 />
                        Delete
                      </MenuItem>
                    </Menu>
                  )}
                </TD>
              </TR>
            )
          })}
        </tbody>
      </Table>
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDeleting(null)}
          title="Delete deadline"
          description={`“${deleting.title}” will be deleted. This is recorded in the case activity.`}
          confirmLabel="Delete deadline"
          tone="danger"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        />
      )}
    </>
  )
}
