import { useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCourts } from '@/api/admin'
import { fetchConflicts, useCancelHearing, useConcludeHearing, useRescheduleHearing, useScheduleHearing } from '@/api/hearings'
import { FormDialog } from '@/components/ui/dialog'
import { InlineAlert, Spinner } from '@/components/ui/feedback'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { applyServerErrors } from '@/lib/forms'
import { formatDateTime, formatTime, todayIso } from '@/lib/format'
import { useDebounced } from '@/lib/hooks'
import { hearingTypeLabels, options } from '@/lib/labels'
import type { CaseDetail, Hearing, HearingType, SchedulingConflict } from '@/lib/types'

// ---------------------------------------------------------------- slot picking

export interface Slot {
  date: string
  time: string
  duration: number
  courtroomId: string
}

const TIMES = Array.from({ length: 31 }, (_, i) => {
  const minutes = 9 * 60 + 30 + i * 15
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})
const DURATIONS = [15, 30, 45, 60, 90, 120]

/** The next day the court sits (courts do not sit on Sundays). */
function nextCourtDay() {
  let day = addDays(new Date(), 1)
  if (day.getDay() === 0) day = addDays(day, 1)
  return format(day, 'yyyy-MM-dd')
}

export function defaultSlot(courtCase: CaseDetail): Slot {
  return { date: nextCourtDay(), time: '10:30', duration: 30, courtroomId: courtCase.courtroom ? String(courtCase.courtroom.id) : '' }
}

export const slotStart = (slot: Slot) => `${slot.date}T${slot.time}:00`

function SlotFields({ slot, onChange, courtId }: { slot: Slot; onChange: (slot: Slot) => void; courtId: number }) {
  const { data: courts } = useCourts()
  const rooms = courts?.find((c) => c.id === courtId)?.courtrooms.filter((r) => r.active) ?? []
  const isSunday = slot.date && new Date(`${slot.date}T00:00:00`).getDay() === 0
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Date" required error={isSunday ? 'Courts do not sit on Sundays' : undefined}>
        {(field) => <Input {...field} type="date" min={todayIso()} value={slot.date} onChange={(e) => onChange({ ...slot, date: e.target.value })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Time" required>
          {(field) => (
            <Select {...field} value={slot.time} onChange={(e) => onChange({ ...slot, time: e.target.value })}>
              {TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Duration">
          {(field) => (
            <Select {...field} value={slot.duration} onChange={(e) => onChange({ ...slot, duration: Number(e.target.value) })}>
              {DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Courtroom" required className="sm:col-span-2">
        {(field) => (
          <Select {...field} value={slot.courtroomId} onChange={(e) => onChange({ ...slot, courtroomId: e.target.value })}>
            <option value="">Choose a courtroom</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
                {room.floor ? `, ${room.floor}` : ''}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  )
}

/**
 * Checks the chosen slot against the judge's and the courtroom's existing listings while the user
 * is still choosing, so clashes surface before submitting rather than as an error after.
 */
function ConflictCheck({
  caseId,
  slot,
  excludeHearingId,
  override,
  onOverrideChange,
  serverConflicts,
}: {
  caseId: number
  slot: Slot
  excludeHearingId?: number
  override: boolean
  onOverrideChange: (value: boolean) => void
  serverConflicts: SchedulingConflict[] | null
}) {
  // Debounce a primitive key: a fresh object each render would never settle.
  const key = useDebounced(
    JSON.stringify({ caseId, scheduledAt: slotStart(slot), durationMinutes: slot.duration, courtroomId: slot.courtroomId ? Number(slot.courtroomId) : undefined, excludeHearingId }),
    350,
  )
  const params = useMemo(() => JSON.parse(key) as Parameters<typeof fetchConflicts>[0], [key])
  const ready = Boolean(slot.date && slot.time && slot.courtroomId)
  const { data, isFetching } = useQuery({
    queryKey: ['conflicts', params],
    queryFn: () => fetchConflicts(params),
    enabled: ready,
    staleTime: 0,
  })
  const conflicts = serverConflicts ?? data ?? []

  if (!ready) return null
  if (isFetching && !data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Spinner className="size-4" /> Checking the judge’s and courtroom’s board…
      </p>
    )
  }
  if (conflicts.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        The judge and the courtroom are free at this time.
      </p>
    )
  }
  return (
    <InlineAlert tone="warning" title="This slot clashes with another listing">
      <ul className="space-y-1">
        {conflicts.map((conflict) => (
          <li key={conflict.hearingId}>
            <span className="font-medium text-ink">{conflict.caseNumber}</span> at {formatTime(conflict.scheduledAt)}–{formatTime(conflict.endsAt)}
            {': '}
            {conflict.reasons
              .map((reason) => (reason === 'JUDGE_BUSY' ? `${conflict.judgeName ?? 'the judge'} is sitting` : `${conflict.courtroomName} is in use`))
              .join(' and ')}
          </li>
        ))}
      </ul>
      <Checkbox label="Schedule anyway" checked={override} onChange={(e) => onOverrideChange(e.target.checked)} className="mt-2 text-ink" />
    </InlineAlert>
  )
}

function conflictsFrom(error: unknown) {
  return error instanceof ApiError && error.code === 'SCHEDULING_CONFLICT' ? (error.details as SchedulingConflict[]) : null
}

interface CaseDialogProps {
  courtCase: CaseDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ---------------------------------------------------------------- schedule

export function ScheduleHearingDialog({ courtCase, open, onOpenChange }: CaseDialogProps) {
  const schedule = useScheduleHearing(courtCase.id)
  const [slot, setSlot] = useState<Slot>(() => defaultSlot(courtCase))
  const [type, setType] = useState<HearingType>(courtCase.status === 'UNDER_REVIEW' ? 'FIRST_HEARING' : 'ARGUMENTS')
  const [purpose, setPurpose] = useState('')
  const [override, setOverride] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverConflicts, setServerConflicts] = useState<SchedulingConflict[] | null>(null)

  const changeSlot = (next: Slot) => {
    setSlot(next)
    setServerConflicts(null)
    setOverride(false)
  }

  const submit = async () => {
    if (!slot.courtroomId) return setError('Choose a courtroom.')
    setError(null)
    try {
      await schedule.mutateAsync({
        scheduledAt: slotStart(slot),
        durationMinutes: slot.duration,
        hearingType: type,
        courtroomId: Number(slot.courtroomId),
        purpose: purpose.trim() || undefined,
        overrideConflicts: override,
      })
      onOpenChange(false)
    } catch (e) {
      const conflicts = conflictsFrom(e)
      if (conflicts) setServerConflicts(conflicts)
      else setError(applyServerErrors(e))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule a hearing"
      description={`${courtCase.caseNumber}, before ${courtCase.judge?.fullName ?? 'the assigned judge'}.`}
      submitLabel="Schedule hearing"
      submitting={schedule.isPending}
      onSubmit={submit}
      size="lg"
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <Field label="Hearing type" required>
        {(field) => (
          <Select {...field} value={type} onChange={(e) => setType(e.target.value as HearingType)}>
            {options(hearingTypeLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <SlotFields slot={slot} onChange={changeSlot} courtId={courtCase.court.id} />
      <ConflictCheck caseId={courtCase.id} slot={slot} override={override} onOverrideChange={setOverride} serverConflicts={serverConflicts} />
      <Field label="Purpose (optional)" hint="Shown on the cause list, for example “Cross-examination of PW-2”.">
        {(field) => <Input {...field} value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={1000} />}
      </Field>
    </FormDialog>
  )
}

// ---------------------------------------------------------------- reschedule / cancel

export function RescheduleHearingDialog({ courtCase, hearing, open, onOpenChange }: CaseDialogProps & { hearing: Hearing }) {
  const reschedule = useRescheduleHearing()
  const [slot, setSlot] = useState<Slot>(() => ({
    date: hearing.scheduledAt.slice(0, 10),
    time: hearing.scheduledAt.slice(11, 16),
    duration: hearing.durationMinutes,
    courtroomId: hearing.courtroom ? String(hearing.courtroom.id) : '',
  }))
  const [reason, setReason] = useState('')
  const [override, setOverride] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverConflicts, setServerConflicts] = useState<SchedulingConflict[] | null>(null)

  const submit = async () => {
    if (!reason.trim()) return setError('Give a reason for rescheduling; it is shared with the parties.')
    setError(null)
    try {
      await reschedule.mutateAsync({
        id: hearing.id,
        scheduledAt: slotStart(slot),
        durationMinutes: slot.duration,
        courtroomId: slot.courtroomId ? Number(slot.courtroomId) : undefined,
        reason: reason.trim(),
        overrideConflicts: override,
      })
      onOpenChange(false)
    } catch (e) {
      const conflicts = conflictsFrom(e)
      if (conflicts) setServerConflicts(conflicts)
      else setError(applyServerErrors(e))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reschedule hearing"
      description={`${hearingTypeLabels[hearing.hearingType]}, currently ${formatDateTime(hearing.scheduledAt)}.`}
      submitLabel="Reschedule"
      submitting={reschedule.isPending}
      onSubmit={submit}
      size="lg"
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <SlotFields
        slot={slot}
        onChange={(next) => {
          setSlot(next)
          setServerConflicts(null)
          setOverride(false)
        }}
        courtId={courtCase.court.id}
      />
      <ConflictCheck
        caseId={courtCase.id}
        slot={slot}
        excludeHearingId={hearing.id}
        override={override}
        onOverrideChange={setOverride}
        serverConflicts={serverConflicts}
      />
      <Field label="Reason" required hint="Sent to the judge and counsel with the new date.">
        {(field) => <Textarea {...field} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />}
      </Field>
    </FormDialog>
  )
}

export function CancelHearingDialog({ hearing, open, onOpenChange }: { hearing: Hearing; open: boolean; onOpenChange: (open: boolean) => void }) {
  const cancel = useCancelHearing()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!reason.trim()) return setError('Give a reason for cancelling; it is shared with the parties.')
    try {
      await cancel.mutateAsync({ id: hearing.id, reason: reason.trim() })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel hearing"
      description={`${hearingTypeLabels[hearing.hearingType]} on ${formatDateTime(hearing.scheduledAt)}.`}
      submitLabel="Cancel hearing"
      submitVariant="danger"
      submitting={cancel.isPending}
      onSubmit={submit}
      size="sm"
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <Field label="Reason" required>
        {(field) => <Textarea {...field} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />}
      </Field>
    </FormDialog>
  )
}

// ---------------------------------------------------------------- conclude

/** End-of-hearing workflow: result, proceedings and the next date, saved together. */
export function ConcludeHearingDialog({ courtCase, hearing, open, onOpenChange }: CaseDialogProps & { hearing: Hearing }) {
  const conclude = useConcludeHearing()
  const canRecord = courtCase.permissions.canRecordProceeding
  const canListNext = courtCase.permissions.canScheduleHearing
  const [result, setResult] = useState<'COMPLETED' | 'ADJOURNED'>('COMPLETED')
  const [outcome, setOutcome] = useState('')
  const [withProceeding, setWithProceeding] = useState(canRecord)
  const [summary, setSummary] = useState('')
  const [remarks, setRemarks] = useState('')
  const [withNext, setWithNext] = useState(canListNext)
  const [slot, setSlot] = useState<Slot>(() => ({ ...defaultSlot(courtCase), courtroomId: hearing.courtroom ? String(hearing.courtroom.id) : defaultSlot(courtCase).courtroomId }))
  const [nextType, setNextType] = useState<HearingType>(hearing.hearingType)
  const [nextPurpose, setNextPurpose] = useState('')
  const [override, setOverride] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverConflicts, setServerConflicts] = useState<SchedulingConflict[] | null>(null)

  const submit = async () => {
    if (!outcome.trim()) return setError('Record the outcome of the hearing.')
    if (withProceeding && !summary.trim()) return setError('Add a summary of the proceedings, or untick “Record proceedings”.')
    if (withNext && !slot.courtroomId) return setError('Choose a courtroom for the next hearing.')
    setError(null)
    try {
      await conclude.mutateAsync({
        id: hearing.id,
        result,
        outcome: outcome.trim(),
        proceeding: withProceeding ? { summary: summary.trim(), remarks: remarks.trim() || undefined } : undefined,
        nextHearing: withNext
          ? {
              scheduledAt: slotStart(slot),
              durationMinutes: slot.duration,
              hearingType: nextType,
              courtroomId: Number(slot.courtroomId),
              purpose: nextPurpose.trim() || undefined,
              overrideConflicts: override,
            }
          : undefined,
      })
      onOpenChange(false)
    } catch (e) {
      const conflicts = conflictsFrom(e)
      if (conflicts) setServerConflicts(conflicts)
      else setError(applyServerErrors(e))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record hearing outcome"
      description={`${hearingTypeLabels[hearing.hearingType]} on ${formatDateTime(hearing.scheduledAt)}${hearing.courtroom ? `, ${hearing.courtroom.name}` : ''}.`}
      submitLabel="Save outcome"
      submitting={conclude.isPending}
      onSubmit={submit}
      size="lg"
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-ink-soft">Result</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['COMPLETED', 'Heard', 'The matter was taken up'],
              ['ADJOURNED', 'Adjourned', 'Put off without substantive hearing'],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={cn('flex cursor-pointer gap-3 rounded-md border px-3 py-2.5', result === value ? 'border-brand bg-brand-soft/50' : 'border-line hover:bg-paper')}
            >
              <input type="radio" name="result" value={value} checked={result === value} onChange={() => setResult(value)} className="mt-1 accent-brand" />
              <span>
                <span className="block text-sm font-medium text-ink">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Outcome" required hint="One or two lines; shared with the parties.">
        {(field) => <Textarea {...field} rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} maxLength={5000} />}
      </Field>

      {canRecord && (
        <div className="rounded-md border border-line">
          <div className="px-3 py-2.5">
            <Checkbox label="Record proceedings for this date" checked={withProceeding} onChange={(e) => setWithProceeding(e.target.checked)} />
          </div>
          {withProceeding && (
            <div className="space-y-3 border-t border-line p-3">
              <Field label="What transpired" required>
                {(field) => <Textarea {...field} rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={10000} />}
              </Field>
              <Field label="Remarks (optional)">
                {(field) => <Input {...field} value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={5000} />}
              </Field>
            </div>
          )}
        </div>
      )}

      {canListNext && (
      <div className="rounded-md border border-line">
        <div className="px-3 py-2.5">
          <Checkbox label="List the next hearing" checked={withNext} onChange={(e) => setWithNext(e.target.checked)} />
        </div>
        {withNext && (
          <div className="space-y-4 border-t border-line p-3">
            <Field label="Next hearing type">
              {(field) => (
                <Select {...field} value={nextType} onChange={(e) => setNextType(e.target.value as HearingType)}>
                  {options(hearingTypeLabels).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <SlotFields
              slot={slot}
              onChange={(next) => {
                setSlot(next)
                setServerConflicts(null)
                setOverride(false)
              }}
              courtId={courtCase.court.id}
            />
            <ConflictCheck caseId={courtCase.id} slot={slot} override={override} onOverrideChange={setOverride} serverConflicts={serverConflicts} />
            <Field label="Purpose (optional)">
              {(field) => <Input {...field} value={nextPurpose} onChange={(e) => setNextPurpose(e.target.value)} maxLength={1000} />}
            </Field>
          </div>
        )}
      </div>
      )}
    </FormDialog>
  )
}
