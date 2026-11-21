import { Check } from 'lucide-react'

import { toneClasses } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { caseStatusHints, caseStatusLabels, caseStatuses } from '@/lib/labels'
import type { CaseStatus, StatusChange } from '@/lib/types'

import { caseStatusTone } from './badges'

const halo: Record<CaseStatus, string> = {
  FILED: 'ring-filed/20',
  UNDER_REVIEW: 'ring-review/20',
  ACTIVE: 'ring-active/20',
  AWAITING_DECISION: 'ring-reserved/25',
  DISPOSED: 'ring-disposed/20',
  CLOSED: 'ring-closed/20',
}

/**
 * The case's progress through the lifecycle, read left to right like the stamps on a file cover:
 * each stage it has reached carries the date it got there.
 */
export function LifecycleStrip({ status, history }: { status: CaseStatus; history: StatusChange[] }) {
  const reachedOn = new Map<CaseStatus, string>()
  for (const change of history) {
    if (!reachedOn.has(change.toStatus)) reachedOn.set(change.toStatus, change.changedAt)
  }
  const currentIndex = caseStatuses.indexOf(status)

  return (
    <ol className="flex min-w-[640px] items-start" aria-label="Case lifecycle">
      {caseStatuses.map((stage, index) => {
        const isCurrent = stage === status
        const reached = reachedOn.has(stage) && index <= currentIndex
        const skipped = !reached && index < currentIndex
        const tone = toneClasses[caseStatusTone[stage]]
        return (
          <li key={stage} className="relative flex-1" aria-current={isCurrent ? 'step' : undefined}>
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-[11px] right-1/2 left-[-50%] mx-3 border-t-2',
                  index <= currentIndex ? 'border-ink/70' : 'border-dashed border-line-strong',
                )}
              />
            )}
            <div className="relative flex flex-col items-center px-1 text-center" title={caseStatusHints[stage]}>
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full border-2 bg-surface',
                  isCurrent && cn('border-transparent ring-4', tone.dot, halo[stage]),
                  reached && !isCurrent && 'border-ink bg-ink text-white',
                  !reached && !isCurrent && 'border-line-strong',
                )}
              >
                {reached && !isCurrent && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                {isCurrent && <span className="size-2 rounded-full bg-white" aria-hidden="true" />}
              </span>
              <span className={cn('mt-2 text-[13px] leading-tight', isCurrent ? cn('font-semibold', tone.text) : reached ? 'font-medium text-ink' : 'text-faint')}>
                {caseStatusLabels[stage]}
              </span>
              <span className="tabular mt-0.5 text-xs text-muted">
                {reached ? formatDate(reachedOn.get(stage)) : skipped ? 'Skipped' : ' '}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
