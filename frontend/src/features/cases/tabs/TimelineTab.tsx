import { FileText, Flag, FolderPlus, Gavel, NotebookPen, ScrollText, UserCheck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Panel } from '@/components/ui/panel'
import { useCaseTimeline } from '@/api/cases'
import { cn } from '@/lib/cn'
import { formatDate, formatTime } from '@/lib/format'
import { caseStatusLabels, documentTypeLabels, hearingStatusLabels, orderTypeLabels } from '@/lib/labels'
import type { CaseDetail, CaseStatus, DocumentType, HearingStatus, OrderType, TimelineEntry, TimelineKind } from '@/lib/types'

const kindIcon: Record<TimelineKind, LucideIcon> = {
  FILED: FolderPlus,
  ASSIGNMENT: UserCheck,
  STATUS: Flag,
  HEARING: Gavel,
  PROCEEDING: NotebookPen,
  DOCUMENT: FileText,
  ORDER: ScrollText,
}

const filters: Array<{ key: string; label: string; kinds: TimelineKind[] | null }> = [
  { key: 'all', label: 'Everything', kinds: null },
  { key: 'milestones', label: 'Milestones', kinds: ['FILED', 'ASSIGNMENT', 'STATUS', 'ORDER'] },
  { key: 'hearings', label: 'Hearings and proceedings', kinds: ['HEARING', 'PROCEEDING'] },
  { key: 'documents', label: 'Documents', kinds: ['DOCUMENT'] },
  { key: 'orders', label: 'Orders', kinds: ['ORDER'] },
]

/** Titles use the interface's own labels; the tag adds what the title does not already say. */
function present(entry: TimelineEntry): { title: string; tag: string | null } {
  switch (entry.kind) {
    case 'STATUS':
      return { title: `Status: ${caseStatusLabels[entry.tag as CaseStatus]}`, tag: null }
    case 'DOCUMENT':
      return { title: `${documentTypeLabels[entry.tag as DocumentType]} filed`, tag: null }
    case 'HEARING':
      return { title: entry.title, tag: hearingStatusLabels[entry.tag as HearingStatus] }
    case 'ORDER':
      return { title: entry.title, tag: orderTypeLabels[entry.tag as OrderType] }
    default:
      return { title: entry.title, tag: null }
  }
}

/**
 * The life of the case at a glance, set out like an order sheet: dates in the margin, events
 * beside them, the present marked, and what is listed next shown after it.
 */
export function TimelineTab({ courtCase }: { courtCase: CaseDetail }) {
  const { data, isLoading, error, refetch } = useCaseTimeline(courtCase.id)
  const [filter, setFilter] = useState('all')
  if (isLoading) return <SkeletonRows />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />

  const kinds = filters.find((f) => f.key === filter)?.kinds
  const entries = (data ?? []).filter((entry) => !kinds || kinds.includes(entry.kind))
  const days = new Map<string, TimelineEntry[]>()
  for (const entry of entries) {
    const day = entry.occurredAt.slice(0, 10)
    days.set(day, [...(days.get(day) ?? []), entry])
  }
  const now = new Date()
  let todayMarked = false

  return (
    <Panel
      title="Timeline"
      description="From filing to the latest listing"
      actions={
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                filter === f.key ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:bg-sunken',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      <ol>
        {[...days.entries()].map(([day, items]) => {
          const future = new Date(items[0].occurredAt) > now
          const showToday = future && !todayMarked
          if (showToday) todayMarked = true
          return (
            <li key={day}>
              {showToday && (
                <div className="flex items-center gap-3 px-4 py-2" aria-label="Today">
                  <span className="text-xs font-semibold text-seal">Today</span>
                  <span className="h-px flex-1 bg-seal/40" aria-hidden="true" />
                </div>
              )}
              <div className="grid grid-cols-[minmax(0,1fr)] border-b border-line last:border-b-0 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
                <div className="border-line px-4 pt-3.5 sm:border-r sm:pb-3.5">
                  <p className={cn('tabular text-sm font-semibold', future ? 'text-brand' : 'text-ink')}>{formatDate(day)}</p>
                </div>
                <ul className="relative px-4 py-2">
                  {items.map((entry) => {
                    const Icon = kindIcon[entry.kind]
                    const { title, tag } = present(entry)
                    const cancelled = entry.tag === 'CANCELLED'
                    return (
                      <li key={entry.id} className="relative flex gap-3 py-1.5">
                        <span
                          className={cn(
                            'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border',
                            entry.upcoming
                              ? 'border-dashed border-brand text-brand'
                              : entry.milestone
                                ? 'border-ink bg-ink text-white'
                                : 'border-line-strong bg-surface text-muted',
                          )}
                          aria-hidden="true"
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <div className={cn('min-w-0 flex-1', cancelled && 'opacity-60')}>
                          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                            <span className={cn('font-medium text-ink', cancelled && 'line-through decoration-faint')}>{title}</span>
                            {tag && <span className="text-xs text-muted">{tag}</span>}
                            {entry.upcoming && <span className="text-xs font-medium text-brand">Upcoming</span>}
                          </p>
                          {entry.description && <p className="mt-0.5 max-w-[72ch] text-[13px] text-ink-soft">{entry.description}</p>}
                          <p className="mt-0.5 text-xs text-faint">
                            {entry.kind === 'HEARING' || entry.kind === 'ORDER' || entry.kind === 'DOCUMENT' ? `${formatTime(entry.occurredAt)}` : null}
                            {entry.actor ? `${entry.kind === 'HEARING' || entry.kind === 'ORDER' || entry.kind === 'DOCUMENT' ? ', ' : ''}${entry.actor}` : ''}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}
