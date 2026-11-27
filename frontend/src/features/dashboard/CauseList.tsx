import { DoorOpen } from 'lucide-react'
import { Link } from 'react-router'

import { HearingStatusBadge } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { formatTime } from '@/lib/format'
import { hearingTypeLabels } from '@/lib/labels'
import type { Hearing } from '@/lib/types'

/**
 * Hearings grouped by courtroom and numbered in order of listing — the shape of a court's daily
 * cause list, which is how registry and bench already read their day.
 */
export function CauseList({ hearings, showJudge = true }: { hearings: Hearing[]; showJudge?: boolean }) {
  const rooms = new Map<string, Hearing[]>()
  for (const hearing of [...hearings].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))) {
    const key = hearing.courtroom?.name ?? 'Courtroom to be assigned'
    rooms.set(key, [...(rooms.get(key) ?? []), hearing])
  }
  return (
    <div className="divide-y divide-line">
      {[...rooms.entries()].map(([room, items]) => (
        <div key={room} className="break-inside-avoid">
          <div className="flex items-center justify-between gap-3 bg-ivory px-4 py-2 sm:px-5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <DoorOpen className="size-3.5 text-muted" aria-hidden="true" />
              {room}
              <span className="font-normal text-muted">
                · {items.length} matter{items.length === 1 ? '' : 's'}
              </span>
            </p>
            {showJudge && items[0].judge && <p className="truncate text-xs text-muted">Before {items[0].judge.fullName}</p>}
          </div>
          <ol>
            {items.map((hearing, index) => (
              <li key={hearing.id} className="border-t border-line first:border-t-0">
                <Link
                  to={`/cases/${hearing.courtCase.id}?tab=hearings`}
                  className="grid grid-cols-[1.75rem_3.25rem_minmax(0,1fr)] items-start gap-x-3 px-4 py-3 transition-colors hover:bg-ivory sm:grid-cols-[1.75rem_3.25rem_minmax(0,1fr)_auto] sm:px-5"
                >
                  <span className="tabular pt-0.5 text-sm text-faint">{index + 1}.</span>
                  <span className="tabular pt-0.5 text-sm font-semibold text-ink">{formatTime(hearing.scheduledAt)}</span>
                  <span className="min-w-0">
                    <CaseNumber value={hearing.courtCase.caseNumber} />
                    <CaseTitle title={hearing.courtCase.title} className="block truncate text-[15px] text-ink" />
                    <span className="block truncate text-xs text-muted">
                      {hearingTypeLabels[hearing.hearingType]}
                      {hearing.purpose ? `: ${hearing.purpose}` : ''}
                    </span>
                  </span>
                  <span className="col-start-3 mt-1.5 sm:col-start-auto sm:mt-0">
                    <HearingStatusBadge status={hearing.status} outcomePending={hearing.outcomePending} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}
