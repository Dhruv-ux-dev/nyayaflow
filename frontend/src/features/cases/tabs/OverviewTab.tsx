import { CalendarPlus, Mail, Phone, UserRoundX } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { useRemoveLawyer } from '@/api/cases'
import { DueLabel, HearingStatusBadge } from '@/components/domain/badges'
import { PersonLine } from '@/components/domain/PersonLine'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/menu'
import { Detail, Panel } from '@/components/ui/panel'
import { formatDate, formatTime, relativeDay, timeAgo } from '@/lib/format'
import { caseTypeLabels, hearingTypeLabels, orderTypeLabels, partyTypeLabels, sideLabels } from '@/lib/labels'
import type { CaseDetail, CaseLawyer, CourtOrder, Deadline, Hearing, PartySide } from '@/lib/types'

import { useOpenCaseDialog } from '../caseDialogContext'
import { HearingActions } from './HearingsTab'

export function OverviewTab({
  courtCase,
  hearings,
  deadlines,
  orders,
}: {
  courtCase: CaseDetail
  hearings?: Hearing[]
  deadlines?: Deadline[]
  orders?: CourtOrder[]
}) {
  const next = hearings?.filter((h) => h.status === 'SCHEDULED').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0]
  const openDeadlines = (deadlines ?? []).filter((d) => d.status !== 'COMPLETED')
  const latestOrder = orders?.[orders.length - 1]

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <NextHearing courtCase={courtCase} hearing={next} />
        {courtCase.description && (
          <Panel title="The matter">
            <p className="max-w-[72ch] px-4 py-4 font-serif text-[16px] leading-relaxed text-ink-soft">{courtCase.description}</p>
          </Panel>
        )}
        <Parties courtCase={courtCase} />
        <Counsel courtCase={courtCase} />
      </div>
      <div className="min-w-0 space-y-6">
        <Panel title="Case details">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-4 py-4">
            <Detail label="Case number">{courtCase.caseNumber}</Detail>
            <Detail label="Type">{caseTypeLabels[courtCase.caseType]}</Detail>
            <Detail label="Filed on">{formatDate(courtCase.filingDate)}</Detail>
            <Detail label="Courtroom">{courtCase.courtroom?.name ?? 'Not decided'}</Detail>
            <Detail label="Court" className="col-span-2">
              {courtCase.court.name}
            </Detail>
            <Detail label="Presiding judge" className="col-span-2">
              <span className="flex items-center justify-between gap-2">
                <PersonLine person={courtCase.judge} fallback="Awaiting allocation" />
                {courtCase.permissions.canAssignJudge && <AllocateButton reassign={Boolean(courtCase.judge)} />}
              </span>
            </Detail>
            {courtCase.disposedOn && <Detail label="Disposed on">{formatDate(courtCase.disposedOn)}</Detail>}
            {courtCase.closedOn && <Detail label="Closed on">{formatDate(courtCase.closedOn)}</Detail>}
            <Detail label="Registered by">{courtCase.createdBy?.fullName ?? '—'}</Detail>
            <Detail label="Last activity">{timeAgo(courtCase.updatedAt)}</Detail>
          </dl>
        </Panel>

        <Panel title="Open deadlines" actions={<TabLink tab="deadlines">All deadlines</TabLink>}>
          {openDeadlines.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted">Nothing is due in this case.</p>
          ) : (
            <ul className="divide-y divide-line">
              {openDeadlines.slice(0, 5).map((deadline) => (
                <li key={deadline.id} className="px-4 py-3">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{deadline.title}</span>
                    <DueLabel days={deadline.daysUntilDue} status={deadline.status} className="shrink-0 pt-0.5" />
                  </span>
                  <span className="text-xs text-muted">
                    {deadline.assignedTo?.fullName ?? 'Unassigned'}, due {formatDate(deadline.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Latest order" actions={<TabLink tab="orders">All orders</TabLink>}>
          {latestOrder ? (
            <div className="px-4 py-4">
              <p className="text-xs text-muted">
                {orderTypeLabels[latestOrder.orderType]}, {formatDate(latestOrder.orderDate)}
              </p>
              <p className="mt-0.5 font-medium text-ink">{latestOrder.title}</p>
              <p className="mt-2 line-clamp-4 font-serif text-[15px] leading-relaxed text-ink-soft">{latestOrder.content}</p>
            </div>
          ) : (
            <p className="px-4 py-4 text-sm text-muted">No orders have been issued.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}

function TabLink({ tab, children }: { tab: string; children: string }) {
  return (
    <Link to={`?tab=${tab}`} replace className="text-[13px] font-medium text-brand hover:underline">
      {children}
    </Link>
  )
}

function AllocateButton({ reassign }: { reassign: boolean }) {
  const open = useOpenCaseDialog()
  return (
    <Button size="sm" variant={reassign ? 'ghost' : 'primary'} onClick={() => open({ kind: 'assign' })}>
      {reassign ? 'Reassign' : 'Allocate'}
    </Button>
  )
}

function NextHearing({ courtCase, hearing }: { courtCase: CaseDetail; hearing?: Hearing }) {
  const open = useOpenCaseDialog()
  if (!hearing) {
    const reason = !courtCase.judge
      ? 'Allocate the case to a judge before listing it.'
      : courtCase.status === 'DISPOSED' || courtCase.status === 'CLOSED'
        ? 'The case has been decided; no further hearings are listed.'
        : 'No hearing is listed for this case.'
    return (
      <Panel title="Next hearing">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5">
          <p className="text-sm text-muted">{reason}</p>
          {courtCase.permissions.canScheduleHearing && (
            <Button variant="primary" size="sm" onClick={() => open({ kind: 'schedule' })}>
              <CalendarPlus />
              Schedule hearing
            </Button>
          )}
        </div>
      </Panel>
    )
  }
  const day = new Date(hearing.scheduledAt)
  return (
    <Panel title="Next hearing" actions={<HearingStatusBadge status={hearing.status} outcomePending={hearing.outcomePending} />}>
      <div className="flex flex-wrap items-start gap-5 px-4 py-4">
        <div className="w-[76px] shrink-0 overflow-hidden rounded-md border border-line text-center">
          <p className="bg-seal py-0.5 text-[11px] font-semibold text-white">{day.toLocaleString('en-IN', { month: 'short' })}</p>
          <p className="py-1 text-[1.9rem] leading-none font-semibold text-ink">{day.getDate()}</p>
          <p className="pb-1 text-[11px] text-muted">{day.toLocaleString('en-IN', { weekday: 'short' })}</p>
        </div>
        <div className="min-w-[13rem] flex-1">
          <p className="text-lg font-semibold text-ink">
            {formatTime(hearing.scheduledAt)}
            <span className="ml-2 text-sm font-normal text-muted">{relativeDay(hearing.scheduledAt)}</span>
          </p>
          <p className="text-sm text-ink-soft">
            {hearingTypeLabels[hearing.hearingType]}
            {hearing.courtroom ? ` in ${hearing.courtroom.name}` : ''}
            {hearing.judge ? `, before ${hearing.judge.fullName}` : ''}
          </p>
          {hearing.purpose && <p className="mt-1 text-sm text-muted">{hearing.purpose}</p>}
          {hearing.rescheduleCount > 0 && (
            <p className="mt-1 text-xs text-warning">
              Rescheduled {hearing.rescheduleCount === 1 ? 'once' : `${hearing.rescheduleCount} times`}
              {hearing.statusReason ? `. Last reason: ${hearing.statusReason}` : ''}
            </p>
          )}
        </div>
        <HearingActions courtCase={courtCase} hearing={hearing} />
      </div>
    </Panel>
  )
}

function Parties({ courtCase }: { courtCase: CaseDetail }) {
  const labels = sideLabels[courtCase.caseType]
  return (
    <Panel title="Parties">
      <div className="grid divide-line sm:grid-cols-2 sm:divide-x">
        {(['PETITIONER', 'RESPONDENT'] as PartySide[]).map((side) => (
          <div key={side} className="px-4 py-4">
            <p className="mb-2 text-xs font-medium text-muted">{labels[side]}</p>
            <ul className="space-y-3">
              {courtCase.parties
                .filter((party) => party.side === side)
                .map((party) => (
                  <li key={party.id}>
                    <p className="font-serif text-[16px] leading-snug text-ink">{party.name}</p>
                    <p className="text-xs text-muted">
                      {partyTypeLabels[party.partyType]}
                      {party.address ? `, ${party.address}` : ''}
                    </p>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Counsel({ courtCase }: { courtCase: CaseDetail }) {
  const open = useOpenCaseDialog()
  const remove = useRemoveLawyer(courtCase.id)
  const [removing, setRemoving] = useState<CaseLawyer | null>(null)
  const labels = sideLabels[courtCase.caseType]
  const canManage = courtCase.permissions.canManageLawyers

  return (
    <Panel
      title="Counsel"
      actions={
        canManage && (
          <Button size="sm" variant="ghost" onClick={() => open({ kind: 'lawyer' })}>
            Add counsel
          </Button>
        )
      }
    >
      {courtCase.lawyers.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted">No counsel has entered appearance.</p>
      ) : (
        <ul className="divide-y divide-line">
          {courtCase.lawyers.map((lawyer) => (
            <li key={lawyer.lawyerId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  {lawyer.fullName}
                  {lawyer.leadCounsel && <Badge tone="seal">Lead counsel</Badge>}
                </p>
                <p className="text-xs text-muted">
                  For the {labels[lawyer.side].toLowerCase()}
                  {lawyer.barRegistrationNumber ? `, enrolment ${lawyer.barRegistrationNumber}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 text-muted">
                <Tooltip content={lawyer.email}>
                  <a href={`mailto:${lawyer.email}`} className="grid size-8 place-items-center rounded-md hover:bg-sunken hover:text-ink" aria-label={`Email ${lawyer.fullName}`}>
                    <Mail className="size-4" />
                  </a>
                </Tooltip>
                {lawyer.phone && (
                  <Tooltip content={lawyer.phone}>
                    <a href={`tel:${lawyer.phone.replace(/\s/g, '')}`} className="grid size-8 place-items-center rounded-md hover:bg-sunken hover:text-ink" aria-label={`Call ${lawyer.fullName}`}>
                      <Phone className="size-4" />
                    </a>
                  </Tooltip>
                )}
                {canManage && (
                  <Tooltip content="Remove from case">
                    <button
                      type="button"
                      onClick={() => setRemoving(lawyer)}
                      className="grid size-8 place-items-center rounded-md hover:bg-danger-soft hover:text-danger"
                      aria-label={`Remove ${lawyer.fullName}`}
                    >
                      <UserRoundX className="size-4" />
                    </button>
                  </Tooltip>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(value) => !value && setRemoving(null)}
          title="Remove counsel"
          description={
            <>
              {removing.fullName} will lose access to <span className="font-medium text-ink">{courtCase.caseNumber}</span> and will be notified.
            </>
          }
          confirmLabel="Remove counsel"
          tone="danger"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(removing.lawyerId, { onSuccess: () => setRemoving(null) })}
        />
      )}
    </Panel>
  )
}
