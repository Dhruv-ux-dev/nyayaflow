import { FileUp, UploadCloud } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { useForm } from 'react-hook-form'

import { useDirectory } from '@/api/admin'
import { useCreateDeadline, useUpdateDeadline } from '@/api/deadlines'
import { useAddDocumentVersion, useIssueOrder, useRecordProceeding, useUpdateDocument, useUpdateProceeding, useUploadDocument } from '@/api/records'
import { useCurrentUser } from '@/auth/AuthContext'
import { FormDialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/ui/feedback'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { cn } from '@/lib/cn'
import { applyServerErrors, requiredText } from '@/lib/forms'
import { formatDateTime, formatFileSize, todayIso } from '@/lib/format'
import { documentTypeLabels, hearingTypeLabels, options, orderTypeLabels, priorityLabels } from '@/lib/labels'
import type { CaseDetail, CaseDocument, Deadline, DocumentType, Hearing, OrderType, Priority, Proceeding } from '@/lib/types'

interface Base {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const ACCEPT = '.pdf,.doc,.docx,.odt,.rtf,.txt,.jpg,.jpeg,.png'

// ---------------------------------------------------------------- proceedings

export function ProceedingDialog({
  courtCase,
  hearings,
  proceeding,
  open,
  onOpenChange,
}: Base & { courtCase: CaseDetail; hearings: Hearing[]; proceeding?: Proceeding }) {
  const record = useRecordProceeding(courtCase.id)
  const update = useUpdateProceeding()
  const [error, setError] = useState<string | null>(null)
  const held = hearings.filter((h) => h.status === 'COMPLETED' || h.status === 'ADJOURNED' || (h.status === 'SCHEDULED' && h.outcomePending))
  const { register, handleSubmit, setValue, setError: setFieldError, formState } = useForm({
    defaultValues: {
      hearingId: held.length ? String(held[held.length - 1].id) : '',
      proceedingDate: held.length ? held[held.length - 1].scheduledAt.slice(0, 10) : todayIso(),
      summary: proceeding?.summary ?? '',
      remarks: proceeding?.remarks ?? '',
    },
  })

  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      if (proceeding) {
        await update.mutateAsync({ id: proceeding.id, summary: values.summary.trim(), remarks: values.remarks.trim() || undefined })
      } else {
        await record.mutateAsync({
          hearingId: values.hearingId ? Number(values.hearingId) : null,
          proceedingDate: values.proceedingDate,
          summary: values.summary.trim(),
          remarks: values.remarks.trim() || undefined,
        })
      }
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e, setFieldError))
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={proceeding ? 'Correct proceedings' : 'Record proceedings'}
      description={proceeding ? 'Only the person who recorded an entry can correct it.' : 'An entry in the case’s order sheet for a date.'}
      submitLabel={proceeding ? 'Save correction' : 'Record proceedings'}
      submitting={record.isPending || update.isPending}
      onSubmit={submit}
      size="lg"
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      {!proceeding && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hearing">
            {(field) => (
              <Select
                {...field}
                {...register('hearingId', {
                  onChange: (event) => {
                    const hearing = held.find((h) => String(h.id) === event.target.value)
                    if (hearing) setValue('proceedingDate', hearing.scheduledAt.slice(0, 10))
                  },
                })}
              >
                <option value="">Not tied to a hearing</option>
                {held.map((h) => (
                  <option key={h.id} value={h.id}>
                    {formatDateTime(h.scheduledAt)}: {hearingTypeLabels[h.hearingType]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Date of proceedings" required error={formState.errors.proceedingDate?.message}>
            {(field) => <Input {...field} type="date" max={todayIso()} {...register('proceedingDate', { required: 'Choose a date' })} />}
          </Field>
        </div>
      )}
      <Field label="What transpired" required error={formState.errors.summary?.message}>
        {(field) => <Textarea {...field} rows={6} {...register('summary', requiredText('Describe what happened'))} />}
      </Field>
      <Field label="Remarks (optional)">
        {(field) => <Textarea {...field} rows={2} {...register('remarks')} />}
      </Field>
    </FormDialog>
  )
}

// ---------------------------------------------------------------- orders

export function IssueOrderDialog({ courtCase, hearings, open, onOpenChange }: Base & { courtCase: CaseDetail; hearings: Hearing[] }) {
  const issue = useIssueOrder(courtCase.id)
  const [error, setError] = useState<string | null>(null)
  const recent = hearings.filter((h) => h.status !== 'CANCELLED' && h.scheduledAt.slice(0, 10) <= todayIso()).reverse()
  const { register, handleSubmit, watch, setError: setFieldError, formState } = useForm({
    defaultValues: {
      orderType: 'INTERIM_ORDER' as OrderType,
      title: '',
      orderDate: todayIso(),
      hearingId: recent[0] && recent[0].scheduledAt.slice(0, 10) === todayIso() ? String(recent[0].id) : '',
      content: '',
      remarks: '',
    },
  })
  const type = watch('orderType')
  const final = type === 'FINAL_ORDER' || type === 'JUDGMENT'

  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      await issue.mutateAsync({
        orderType: values.orderType,
        title: values.title.trim(),
        content: values.content.trim(),
        remarks: values.remarks.trim() || undefined,
        orderDate: values.orderDate,
        hearingId: values.hearingId ? Number(values.hearingId) : null,
      })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e, setFieldError))
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Issue an order"
      description="Orders become part of the permanent record and cannot be edited after issue."
      submitLabel={final ? `Issue ${orderTypeLabels[type].toLowerCase()}` : 'Issue order'}
      submitting={issue.isPending}
      onSubmit={submit}
      size="lg"
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      {final && (
        <InlineAlert tone="warning" title="This decides the case">
          Issuing a {orderTypeLabels[type].toLowerCase()} marks the case as Disposed and vacates any hearings still listed.
        </InlineAlert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" required>
          {(field) => (
            <Select {...field} {...register('orderType')}>
              {options(orderTypeLabels).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Order date" required error={formState.errors.orderDate?.message}>
          {(field) => <Input {...field} type="date" min={courtCase.filingDate} max={todayIso()} {...register('orderDate', { required: 'Choose a date' })} />}
        </Field>
      </div>
      <Field label="Title" required error={formState.errors.title?.message} hint="For example “Interim stay on demolition”.">
        {(field) => <Input {...field} {...register('title', requiredText('Give the order a title'))} />}
      </Field>
      <Field label="Passed at hearing">
        {(field) => (
          <Select {...field} {...register('hearingId')}>
            <option value="">Not tied to a hearing (in chambers)</option>
            {recent.map((h) => (
              <option key={h.id} value={h.id}>
                {formatDateTime(h.scheduledAt)}: {hearingTypeLabels[h.hearingType]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Text of the order" required error={formState.errors.content?.message}>
        {(field) => <Textarea {...field} rows={9} className="font-serif text-[15px] leading-relaxed" {...register('content', requiredText('Write the order'))} />}
      </Field>
      <Field label="Remarks (optional)" hint="Internal note, not part of the order text.">
        {(field) => <Input {...field} {...register('remarks')} />}
      </Field>
    </FormDialog>
  )
}

// ---------------------------------------------------------------- documents

function FileDrop({ file, onFile, error }: { file: File | null; onFile: (file: File | null) => void; error?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setOver(false)
    if (event.dataTransfer.files[0]) onFile(event.dataTransfer.files[0])
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
          over ? 'border-brand bg-brand-soft/40' : error ? 'border-danger/50' : 'border-line-strong hover:border-faint hover:bg-paper',
        )}
      >
        {file ? (
          <>
            <FileUp className="size-6 text-brand" aria-hidden="true" />
            <span className="mt-2 text-sm font-medium text-ink">{file.name}</span>
            <span className="text-xs text-muted">{formatFileSize(file.size)}. Click to choose a different file.</span>
          </>
        ) : (
          <>
            <UploadCloud className="size-6 text-muted" aria-hidden="true" />
            <span className="mt-2 text-sm font-medium text-ink">Drop a file here or click to browse</span>
            <span className="text-xs text-muted">PDF, Word, ODT, RTF, text or image, up to 20 MB</span>
          </>
        )}
      </button>
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" onChange={(event) => onFile(event.target.files?.[0] ?? null)} aria-label="Choose file" />
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  )
}

function validateFile(file: File | null) {
  if (!file) return 'Choose a file to upload.'
  if (file.size > MAX_UPLOAD_BYTES) return 'The file is larger than 20 MB.'
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ACCEPT.split(',').includes(`.${extension}`)) return 'This file type is not accepted.'
  return null
}

/** "list-of_witnesses.pdf" becomes "List of witnesses". */
function titleFromFilename(name: string) {
  const words = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function UploadDocumentDialog({ courtCase, open, onOpenChange }: Base & { courtCase: CaseDetail }) {
  const upload = useUploadDocument(courtCase.id)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, setValue, getValues } = useForm({
    defaultValues: { title: '', documentType: 'APPLICATION' as DocumentType, description: '' },
  })

  const chooseFile = (next: File | null) => {
    setFile(next)
    setFileError(undefined)
    if (next && !getValues('title')) setValue('title', titleFromFilename(next.name))
  }

  const submit = handleSubmit(async (values) => {
    const problem = validateFile(file)
    if (problem) return setFileError(problem)
    setError(null)
    try {
      await upload.mutateAsync({ file: file!, title: values.title.trim() || undefined, documentType: values.documentType, description: values.description.trim() || undefined })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e))
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Upload a document"
      description={`Filed to ${courtCase.caseNumber}. The judge and counsel are notified.`}
      submitLabel="Upload"
      submitting={upload.isPending}
      onSubmit={submit}
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <FileDrop file={file} onFile={chooseFile} error={fileError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" required>
          {(field) => (
            <Select {...field} {...register('documentType')}>
              {options(documentTypeLabels).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Title">
          {(field) => <Input {...field} maxLength={255} {...register('title')} />}
        </Field>
      </div>
      <Field label="Description (optional)">
        {(field) => <Textarea {...field} rows={2} maxLength={5000} {...register('description')} />}
      </Field>
    </FormDialog>
  )
}

export function NewVersionDialog({ document, open, onOpenChange }: Base & { document: CaseDocument }) {
  const addVersion = useAddDocumentVersion()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string>()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const problem = validateFile(file)
    if (problem) return setFileError(problem)
    setError(null)
    try {
      await addVersion.mutateAsync({ id: document.id, file: file!, changeNote: note.trim() || undefined })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Upload a new version"
      description={`${document.title} is at version ${document.currentVersion}. Earlier versions stay available.`}
      submitLabel={`Upload version ${document.currentVersion + 1}`}
      submitting={addVersion.isPending}
      onSubmit={submit}
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <FileDrop
        file={file}
        onFile={(next) => {
          setFile(next)
          setFileError(undefined)
        }}
        error={fileError}
      />
      <Field label="What changed (optional)">
        {(field) => <Input {...field} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}
      </Field>
    </FormDialog>
  )
}

export function EditDocumentDialog({ document, open, onOpenChange }: Base & { document: CaseDocument }) {
  const update = useUpdateDocument()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm({
    defaultValues: { title: document.title, documentType: document.documentType, description: document.description ?? '' },
  })
  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      await update.mutateAsync({ id: document.id, title: values.title.trim(), documentType: values.documentType, description: values.description.trim() || undefined })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e))
    }
  })
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Edit document details" submitLabel="Save" submitting={update.isPending} onSubmit={submit}>
      {error && <InlineAlert>{error}</InlineAlert>}
      <Field label="Title" required error={formState.errors.title?.message}>
        {(field) => <Input {...field} maxLength={255} {...register('title', requiredText('Enter a title'))} />}
      </Field>
      <Field label="Type" required>
        {(field) => (
          <Select {...field} {...register('documentType')}>
            {options(documentTypeLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Description">
        {(field) => <Textarea {...field} rows={3} maxLength={5000} {...register('description')} />}
      </Field>
    </FormDialog>
  )
}

// ---------------------------------------------------------------- deadlines

export function DeadlineDialog({ courtCase, deadline, open, onOpenChange }: Base & { courtCase: CaseDetail; deadline?: Deadline }) {
  const user = useCurrentUser()
  const create = useCreateDeadline(courtCase.id)
  const update = useUpdateDeadline()
  const { data: staff } = useDirectory('STAFF', user.role !== 'LAWYER')
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, setError: setFieldError, formState } = useForm({
    defaultValues: {
      title: deadline?.title ?? '',
      description: deadline?.description ?? '',
      dueDate: deadline?.dueDate ?? '',
      priority: (deadline?.priority ?? 'NORMAL') as Priority,
      assignedToId: deadline?.assignedTo ? String(deadline.assignedTo.id) : '',
    },
  })

  const submit = handleSubmit(async (values) => {
    setError(null)
    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      dueDate: values.dueDate,
      priority: values.priority,
      assignedToId: values.assignedToId ? Number(values.assignedToId) : null,
    }
    try {
      if (deadline) await update.mutateAsync({ id: deadline.id, ...payload })
      else await create.mutateAsync(payload)
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e, setFieldError))
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={deadline ? 'Edit deadline' : 'Add a deadline'}
      description="Assignees are reminded as the due date approaches."
      submitLabel={deadline ? 'Save deadline' : 'Add deadline'}
      submitting={create.isPending || update.isPending}
      onSubmit={submit}
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <Field label="What needs to be done" required error={formState.errors.title?.message}>
        {(field) => <Input {...field} maxLength={200} placeholder="For example “File written statement”" {...register('title', requiredText('Describe the task'))} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due date" required error={formState.errors.dueDate?.message}>
          {(field) => <Input {...field} type="date" min={deadline ? undefined : todayIso()} {...register('dueDate', { required: 'Choose a due date' })} />}
        </Field>
        <Field label="Priority">
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
      </div>
      <Field label="Assigned to" hint="Counsel in the case, the presiding judge or registry staff.">
        {(field) => (
          <Select {...field} {...register('assignedToId')}>
            <option value="">Unassigned (everyone on the case is reminded)</option>
            <optgroup label="Counsel">
              {courtCase.lawyers.map((l) => (
                <option key={l.lawyerId} value={l.lawyerId}>
                  {l.fullName}
                </option>
              ))}
            </optgroup>
            {courtCase.judge && (
              <optgroup label="Bench">
                <option value={courtCase.judge.id}>{courtCase.judge.fullName}</option>
              </optgroup>
            )}
            {staff && staff.length > 0 && (
              <optgroup label="Registry">
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                    {s.designation ? `, ${s.designation}` : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        )}
      </Field>
      <Field label="Details (optional)">
        {(field) => <Textarea {...field} rows={3} maxLength={5000} {...register('description')} />}
      </Field>
    </FormDialog>
  )
}
