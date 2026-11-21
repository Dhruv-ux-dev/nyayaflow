import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'

import { useCourts, useDirectory } from '@/api/admin'
import { useCase, useCreateCase, useUpdateCase, type CreateCaseInput } from '@/api/cases'
import { Button } from '@/components/ui/button'
import { ErrorState, InlineAlert, SkeletonRows } from '@/components/ui/feedback'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form'
import { PageHeader, Panel } from '@/components/ui/panel'
import { applyServerErrors, requiredText } from '@/lib/forms'
import { todayIso } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import { caseTypeLabels, options, partyTypeLabels, priorityLabels, sideLabels } from '@/lib/labels'
import type { CaseDetail, CaseType, PartySide, PartyType, Priority } from '@/lib/types'

interface PartyRow {
  side: PartySide
  partyType: PartyType
  name: string
  address: string
}

interface CounselRow {
  lawyerId: string
  side: PartySide
  leadCounsel: boolean
}

interface CaseForm {
  title: string
  caseType: CaseType
  priority: Priority
  filingDate: string
  description: string
  courtId: string
  courtroomId: string
  judgeId: string
  parties: PartyRow[]
  lawyers: CounselRow[]
}

const emptyParty = (side: PartySide): PartyRow => ({ side, partyType: 'INDIVIDUAL', name: '', address: '' })

export default function CaseFormPage() {
  const { caseId } = useParams()
  const id = caseId ? Number(caseId) : null
  const existing = useCase(id ?? 0)
  if (id) {
    if (existing.isLoading) return <SkeletonRows rows={8} />
    if (existing.error) return <ErrorState error={existing.error} onRetry={() => existing.refetch()} />
    if (existing.data) return <CaseFormBody existing={existing.data} />
  }
  return <CaseFormBody />
}

function CaseFormBody({ existing }: { existing?: CaseDetail }) {
  const editing = Boolean(existing)
  useDocumentTitle(editing ? `Edit ${existing?.caseNumber}` : 'Register case')
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const { data: courts } = useCourts()
  const { data: judges } = useDirectory('JUDGE', !editing)
  const { data: lawyers } = useDirectory('LAWYER', !editing)
  const createCase = useCreateCase()
  const updateCase = useUpdateCase(existing?.id ?? 0)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<CaseForm>({
    defaultValues: existing
      ? {
          title: existing.title,
          caseType: existing.caseType,
          priority: existing.priority,
          filingDate: existing.filingDate,
          description: existing.description ?? '',
          courtId: String(existing.court.id),
          courtroomId: existing.courtroom ? String(existing.courtroom.id) : '',
          judgeId: '',
          parties: existing.parties.map((p) => ({ side: p.side, partyType: p.partyType, name: p.name, address: p.address ?? '' })),
          lawyers: [],
        }
      : {
          title: '',
          caseType: 'CIVIL_SUIT',
          priority: 'NORMAL',
          filingDate: todayIso(),
          description: '',
          courtId: '',
          courtroomId: '',
          judgeId: '',
          parties: [emptyParty('PETITIONER'), emptyParty('RESPONDENT')],
          lawyers: [],
        },
  })
  const parties = useFieldArray({ control, name: 'parties' })
  const counsel = useFieldArray({ control, name: 'lawyers' })
  const [caseType, courtId, partyValues] = useWatch({ control, name: ['caseType', 'courtId', 'parties'] })
  const labels = sideLabels[caseType]

  // Default to the only/first court once courts load.
  useEffect(() => {
    if (!editing && courts?.length && !courtId) setValue('courtId', String(courts.find((c) => c.active)?.id ?? courts[0].id))
  }, [courts, courtId, editing, setValue])

  // Until the user types a title, propose one from the lead parties ("A v. B").
  const suggestedTitle = useMemo(() => {
    const petitioner = partyValues?.find((p) => p.side === 'PETITIONER' && p.name.trim())?.name.trim()
    const respondent = partyValues?.find((p) => p.side === 'RESPONDENT' && p.name.trim())?.name.trim()
    return petitioner && respondent ? `${petitioner} v. ${respondent}` : ''
  }, [partyValues])
  useEffect(() => {
    if (!editing && suggestedTitle && !getFieldState('title').isDirty) setValue('title', suggestedTitle)
  }, [suggestedTitle, editing, getFieldState, setValue])

  const court = courts?.find((c) => String(c.id) === courtId)
  const courtJudges = (judges ?? []).filter((j) => !courtId || !j.courtId || String(j.courtId) === courtId)

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    const partyPayload = values.parties.map((p) => ({ side: p.side, partyType: p.partyType, name: p.name.trim(), address: p.address.trim() || undefined }))
    try {
      if (existing) {
        await updateCase.mutateAsync({
          title: values.title.trim(),
          description: values.description.trim() || undefined,
          priority: values.priority,
          filingDate: values.filingDate,
          courtroomId: values.courtroomId ? Number(values.courtroomId) : null,
          parties: partyPayload,
          version: existing.version,
        })
        navigate(`/cases/${existing.id}`)
      } else {
        const payload: CreateCaseInput = {
          title: values.title.trim(),
          caseType: values.caseType,
          description: values.description.trim() || undefined,
          priority: values.priority,
          filingDate: values.filingDate,
          courtId: Number(values.courtId),
          courtroomId: values.courtroomId ? Number(values.courtroomId) : null,
          judgeId: values.judgeId ? Number(values.judgeId) : null,
          parties: partyPayload,
          lawyers: values.lawyers.map((l) => ({ lawyerId: Number(l.lawyerId), side: l.side, leadCounsel: l.leadCounsel })),
        }
        const created = await createCase.mutateAsync(payload)
        navigate(`/cases/${created.id}`)
      }
    } catch (error) {
      setFormError(applyServerErrors(error, setError))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })

  const back = existing ? `/cases/${existing.id}` : '/cases'
  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-4xl">
      <Link to={back} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {existing ? existing.caseNumber : 'Cases'}
      </Link>
      <PageHeader
        title={editing ? 'Edit case details' : 'Register a case'}
        description={
          editing
            ? 'Case type and court are fixed at registration because the case number is derived from them.'
            : 'The case number is issued automatically on registration, in the form TYPE/NUMBER/YEAR.'
        }
      />
      {formError && (
        <InlineAlert className="mb-5" title={editing ? 'The case could not be saved' : 'The case could not be registered'}>
          {formError}
        </InlineAlert>
      )}

      <div className="space-y-6">
        <Panel title="Case" bodyClassName="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Case type" required>
            {(field) => (
              <Select {...field} disabled={editing} {...register('caseType')}>
                {options(caseTypeLabels).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Filing date" required error={errors.filingDate?.message}>
            {(field) => <Input {...field} type="date" max={todayIso()} {...register('filingDate', { required: 'Enter the filing date' })} />}
          </Field>
          <Field label="Title" required error={errors.title?.message} hint="Filled in from the parties until you edit it." className="sm:col-span-2">
            {(field) => <Input {...field} placeholder="Petitioner v. Respondent" {...register('title', requiredText('Enter a case title'))} />}
          </Field>
          <Field label="Priority" required>
            {(field) => (
              <Select {...field} {...register('priority')}>
                {options(priorityLabels).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="hidden sm:block" />
          <Field label="Summary of the matter" error={errors.description?.message} className="sm:col-span-2">
            {(field) => <Textarea {...field} rows={3} placeholder="What the case is about and the relief sought" {...register('description')} />}
          </Field>
        </Panel>

        <Panel title="Court" bodyClassName="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Court" required error={errors.courtId?.message}>
            {(field) => (
              <Select {...field} disabled={editing} {...register('courtId', { required: 'Choose a court' })}>
                <option value="">Choose a court</option>
                {courts?.map((c) => (
                  <option key={c.id} value={c.id} disabled={!c.active}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Courtroom" hint="Optional; hearings default to this room.">
            {(field) => (
              <Select {...field} {...register('courtroomId')}>
                <option value="">Not decided yet</option>
                {court?.courtrooms
                  .filter((room) => room.active)
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                      {room.floor ? `, ${room.floor}` : ''}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          {!editing && (
            <Field label="Allocate to judge" hint="Optional. Allocating moves the case to Under review." className="sm:col-span-2">
              {(field) => (
                <Select {...field} {...register('judgeId')}>
                  <option value="">Allocate later</option>
                  {courtJudges.map((judge) => (
                    <option key={judge.id} value={judge.id}>
                      {judge.fullName}
                      {judge.designation ? `, ${judge.designation}` : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </Panel>

        <Panel
          title="Parties"
          description={`At least one ${labels.PETITIONER.toLowerCase()} and one ${labels.RESPONDENT.toLowerCase()}.`}
          bodyClassName="divide-y divide-line"
        >
          {(['PETITIONER', 'RESPONDENT'] as PartySide[]).map((side) => (
            <div key={side} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">{labels[side]} side</h3>
                <Button size="sm" variant="ghost" onClick={() => parties.append(emptyParty(side))}>
                  <Plus />
                  Add {labels[side].toLowerCase()}
                </Button>
              </div>
              <div className="space-y-3">
                {parties.fields.map((party, index) =>
                  party.side !== side ? null : (
                    <div key={party.id} className="grid gap-3 rounded-md border border-line bg-paper/50 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_auto]">
                      <Field label="Name" required error={errors.parties?.[index]?.name?.message}>
                        {(field) => <Input {...field} {...register(`parties.${index}.name`, requiredText('Enter the party’s name'))} />}
                      </Field>
                      <Field label="Type">
                        {(field) => (
                          <Select {...field} {...register(`parties.${index}.partyType`)}>
                            {options(partyTypeLabels).map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove party"
                          disabled={partyValues.filter((p) => p.side === side).length <= 1}
                          onClick={() => parties.remove(index)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <Field label="Address" className="sm:col-span-3">
                        {(field) => <Input {...field} {...register(`parties.${index}.address`)} />}
                      </Field>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </Panel>

        {!editing && (
          <Panel
            title="Counsel"
            description="Lawyers appearing in the case. They will see the case and be notified of hearings and orders."
            actions={
              <Button size="sm" variant="ghost" onClick={() => counsel.append({ lawyerId: '', side: 'PETITIONER', leadCounsel: counsel.fields.length === 0 })}>
                <Plus />
                Add counsel
              </Button>
            }
            bodyClassName="p-4"
          >
            {counsel.fields.length === 0 && <p className="text-sm text-muted">No counsel added. You can add them later from the case page.</p>}
            <div className="space-y-3">
              {counsel.fields.map((row, index) => (
                <div key={row.id} className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_auto_auto] sm:items-end">
                  <Field label="Lawyer" required error={errors.lawyers?.[index]?.lawyerId?.message}>
                    {(field) => (
                      <Select {...field} {...register(`lawyers.${index}.lawyerId`, { required: 'Choose a lawyer' })}>
                        <option value="">Choose a lawyer</option>
                        {lawyers?.map((lawyer) => (
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
                      <Select {...field} {...register(`lawyers.${index}.side`)}>
                        <option value="PETITIONER">{labels.PETITIONER}</option>
                        <option value="RESPONDENT">{labels.RESPONDENT}</option>
                      </Select>
                    )}
                  </Field>
                  <Checkbox label="Lead counsel" className="h-9" {...register(`lawyers.${index}.leadCounsel`)} />
                  <Button variant="ghost" size="icon" aria-label="Remove counsel" onClick={() => counsel.remove(index)}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-line bg-paper/95 py-4 backdrop-blur">
        <Button asChild variant="ghost">
          <Link to={back}>Cancel</Link>
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {editing ? 'Save changes' : 'Register case'}
        </Button>
      </div>
    </form>
  )
}
