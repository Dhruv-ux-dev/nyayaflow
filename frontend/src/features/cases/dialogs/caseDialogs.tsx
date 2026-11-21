import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useDirectory } from '@/api/admin'
import { useAddLawyer, useAssignJudge, useChangeStatus } from '@/api/cases'
import { caseStatusTone } from '@/components/domain/badges'
import { toneClasses } from '@/components/ui/badge'
import { FormDialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/ui/feedback'
import { Checkbox, Field, Select, Textarea } from '@/components/ui/form'
import { cn } from '@/lib/cn'
import { applyServerErrors } from '@/lib/forms'
import { caseStatusHints, caseStatusLabels, sideLabels } from '@/lib/labels'
import type { CaseDetail, CaseStatus, PartySide } from '@/lib/types'

interface DialogBase {
  courtCase: CaseDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangeStatusDialog({ courtCase, open, onOpenChange }: DialogBase) {
  const allowed = courtCase.permissions.allowedStatusChanges
  const [status, setStatus] = useState<CaseStatus | null>(allowed[0] ?? null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const change = useChangeStatus(courtCase.id)
  const noteRequired = status === 'DISPOSED' || status === 'CLOSED'

  const submit = async () => {
    if (!status) return
    if (noteRequired && !note.trim()) {
      setError(`Add a note recording why the case is being ${caseStatusLabels[status].toLowerCase()}.`)
      return
    }
    setError(null)
    try {
      await change.mutateAsync({ status, note: note.trim() || undefined })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change case status"
      description={`Currently ${caseStatusLabels[courtCase.status]}. Only the next valid stages for your role are offered.`}
      submitLabel="Update status"
      submitting={change.isPending}
      onSubmit={submit}
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      {status === 'DISPOSED' && (
        <InlineAlert tone="warning">Disposing of the case vacates every hearing still listed for it.</InlineAlert>
      )}
      <fieldset className="space-y-2">
        <legend className="mb-2 text-[13px] font-medium text-ink-soft">Move to</legend>
        {allowed.map((option) => (
          <label
            key={option}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors',
              status === option ? 'border-brand bg-brand-soft/50' : 'border-line hover:bg-paper',
            )}
          >
            <input type="radio" name="status" value={option} checked={status === option} onChange={() => setStatus(option)} className="mt-1 accent-brand" />
            <span>
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <span className={cn('size-2 rounded-full', toneClasses[caseStatusTone[option]].dot)} aria-hidden="true" />
                {caseStatusLabels[option]}
              </span>
              <span className="block text-xs text-muted">{caseStatusHints[option]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Field label={noteRequired ? 'Note' : 'Note (optional)'} required={noteRequired} hint="Recorded in the case history.">
        {(field) => <Textarea {...field} rows={3} value={note} onChange={(event) => setNote(event.target.value)} />}
      </Field>
    </FormDialog>
  )
}

export function AssignJudgeDialog({ courtCase, open, onOpenChange }: DialogBase) {
  const { data: judges, isLoading } = useDirectory('JUDGE')
  const assign = useAssignJudge(courtCase.id)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<{ judgeId: string; note: string }>({
    defaultValues: { judgeId: courtCase.judge ? String(courtCase.judge.id) : '', note: '' },
  })
  const eligible = (judges ?? []).filter((j) => !j.courtId || j.courtId === courtCase.court.id)

  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      await assign.mutateAsync({ judgeId: Number(values.judgeId), note: values.note.trim() || undefined })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e))
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={courtCase.judge ? 'Reassign judge' : 'Allocate to a judge'}
      description={`Judges sitting at ${courtCase.court.name}.`}
      submitLabel={courtCase.judge ? 'Reassign' : 'Allocate'}
      submitting={assign.isPending}
      onSubmit={submit}
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      {courtCase.status === 'FILED' && (
        <InlineAlert tone="info">Allocating the case moves it from Filed to Under review.</InlineAlert>
      )}
      {courtCase.judge && <InlineAlert tone="info">Upcoming hearings move to the new judge’s board.</InlineAlert>}
      <Field label="Judge" required error={formState.errors.judgeId?.message}>
        {(field) => (
          <Select {...field} disabled={isLoading} {...register('judgeId', { required: 'Choose a judge' })}>
            <option value="">Choose a judge</option>
            {eligible.map((judge) => (
              <option key={judge.id} value={judge.id}>
                {judge.fullName}
                {judge.designation ? `, ${judge.designation}` : ''}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Note (optional)" hint="For example, the reason for a transfer.">
        {(field) => <Textarea {...field} rows={2} {...register('note')} />}
      </Field>
    </FormDialog>
  )
}

export function AddLawyerDialog({ courtCase, open, onOpenChange }: DialogBase) {
  const { data: lawyers, isLoading } = useDirectory('LAWYER')
  const addLawyer = useAddLawyer(courtCase.id)
  const [error, setError] = useState<string | null>(null)
  const labels = sideLabels[courtCase.caseType]
  const { register, handleSubmit, formState } = useForm<{ lawyerId: string; side: PartySide; leadCounsel: boolean }>({
    defaultValues: { lawyerId: '', side: 'PETITIONER', leadCounsel: false },
  })
  const appearing = new Set(courtCase.lawyers.map((l) => l.lawyerId))

  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      await addLawyer.mutateAsync({ lawyerId: Number(values.lawyerId), side: values.side, leadCounsel: values.leadCounsel })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e))
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add counsel"
      description="The lawyer will be able to see this case and will be notified of hearings and orders."
      submitLabel="Add counsel"
      submitting={addLawyer.isPending}
      onSubmit={submit}
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <Field label="Lawyer" required error={formState.errors.lawyerId?.message}>
        {(field) => (
          <Select {...field} disabled={isLoading} {...register('lawyerId', { required: 'Choose a lawyer' })}>
            <option value="">Choose a lawyer</option>
            {lawyers
              ?.filter((l) => !appearing.has(l.id))
              .map((lawyer) => (
                <option key={lawyer.id} value={lawyer.id}>
                  {lawyer.fullName}
                  {lawyer.barRegistrationNumber ? ` (${lawyer.barRegistrationNumber})` : ''}
                </option>
              ))}
          </Select>
        )}
      </Field>
      <Field label="Appearing for">
        {(field) => (
          <Select {...field} {...register('side')}>
            <option value="PETITIONER">{labels.PETITIONER}</option>
            <option value="RESPONDENT">{labels.RESPONDENT}</option>
          </Select>
        )}
      </Field>
      <Checkbox label="Lead counsel for this side" {...register('leadCounsel')} />
    </FormDialog>
  )
}
