import type { UseQueryResult } from '@tanstack/react-query'
import { CalendarPlus, CalendarX2, ClipboardCheck, Clock, Gavel, MoreHorizontal } from 'lucide-react'

import { HearingStatusBadge } from '@/components/domain/badges'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Menu, MenuItem } from '@/components/ui/menu'
import { Panel } from '@/components/ui/panel'
import { formatTime, formatWeekday, relativeDay, todayIso } from '@/lib/format'
import { hearingTypeLabels } from '@/lib/labels'
import type { CaseDetail, Hearing } from '@/lib/types'

import { useOpenCaseDialog } from '../caseDialogContext'

/** Outcome, reschedule and cancel actions for a scheduled hearing, gated by the case permissions. */
export function HearingActions({ courtCase, hearing }: { courtCase: CaseDetail; hearing: Hearing }) {
  const open = useOpenCaseDialog()
  if (hearing.status !== 'SCHEDULED' || !courtCase.permissions.canManageHearings) return null
  const held = hearing.scheduledAt.slice(0, 10) <= todayIso()
  return (
    <div className="flex items-center gap-1.5">
      {held && (
        <Button size="sm" variant={hearing.outcomePending ? 'primary' : 'secondary'} onClick={() => open({ kind: 'conclude', hearing })}>
          <ClipboardCheck />
          Record outcome
        </Button>
      )}
      <Menu
        trigger={
          <Button size="icon-sm" variant="ghost" aria-label="Hearing actions">
            <MoreHorizontal />
          </Button>
        }
      >
        <MenuItem onSelect={() => open({ kind: 'reschedule', hearing })}>
          <Clock />
          Reschedule
        </MenuItem>
        <MenuItem tone="danger" onSelect={() => open({ kind: 'cancel', hearing })}>
          <CalendarX2 />
          Cancel hearing
        </MenuItem>
      </Menu>
    </div>
  )
}

function HearingRow({ courtCase, hearing }: { courtCase: CaseDetail; hearing: Hearing }) {
  const detail =
    hearing.status === 'SCHEDULED' ? hearing.purpose : hearing.status === 'CANCELLED' ? hearing.statusReason : hearing.outcome
  return (
    <li className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3.5 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto]">
      <div>
        <p className="text-sm font-semibold text-ink">{formatWeekday(hearing.scheduledAt)}</p>
        <p className="tabular text-xs text-muted">
          {formatTime(hearing.scheduledAt)}–{formatTime(hearing.endsAt)}, {relativeDay(hearing.scheduledAt).toLowerCase()}
        </p>
      </div>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
          {hearingTypeLabels[hearing.hearingType]}
          <HearingStatusBadge status={hearing.status} outcomePending={hearing.outcomePending} />
        </p>
        <p className="text-xs text-muted">
          {hearing.courtroom?.name ?? 'Courtroom not set'}
          {hearing.judge ? `, before ${hearing.judge.fullName}` : ''}
          {hearing.rescheduleCount > 0 ? `. Rescheduled ${hearing.rescheduleCount}×` : ''}
        </p>
        {detail && <p className="mt-1 max-w-[72ch] text-sm text-ink-soft">{detail}</p>}
      </div>
      <div className="sm:pt-0.5">
        <HearingActions courtCase={courtCase} hearing={hearing} />
      </div>
    </li>
  )
}

export function HearingsTab({ courtCase, query }: { courtCase: CaseDetail; query: UseQueryResult<Hearing[]> }) {
  const open = useOpenCaseDialog()
  if (query.isLoading) return <SkeletonRows />
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  const hearings = query.data ?? []
  const upcoming = hearings.filter((h) => h.status === 'SCHEDULED')
  const past = hearings.filter((h) => h.status !== 'SCHEDULED').reverse()
  const scheduleButton = courtCase.permissions.canScheduleHearing && (
    <Button size="sm" variant="primary" onClick={() => open({ kind: 'schedule' })}>
      <CalendarPlus />
      Schedule hearing
    </Button>
  )

  if (hearings.length === 0) {
    return (
      <Panel title="Hearings">
        <EmptyState
          icon={Gavel}
          title="No hearings yet"
          description={courtCase.judge ? 'List the first hearing to put this case on the board.' : 'Allocate the case to a judge, then list its first hearing.'}
          action={scheduleButton}
        />
      </Panel>
    )
  }
  return (
    <div className="space-y-6">
      <Panel title="Listed" description={upcoming.length ? undefined : 'Nothing is listed.'} actions={scheduleButton}>
        {upcoming.length > 0 && (
          <ul className="divide-y divide-line">
            {upcoming.map((hearing) => (
              <HearingRow key={hearing.id} courtCase={courtCase} hearing={hearing} />
            ))}
          </ul>
        )}
      </Panel>
      {past.length > 0 && (
        <Panel title="Held and cancelled" description={`${past.length} earlier listing${past.length === 1 ? '' : 's'}, most recent first`}>
          <ul className="divide-y divide-line">
            {past.map((hearing) => (
              <HearingRow key={hearing.id} courtCase={courtCase} hearing={hearing} />
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
