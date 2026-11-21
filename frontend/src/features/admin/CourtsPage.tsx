import { DoorOpen, Landmark, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useCourts, useSaveCourt, useSaveCourtroom } from '@/api/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, InlineAlert, SkeletonRows } from '@/components/ui/feedback'
import { Checkbox, Field, Input } from '@/components/ui/form'
import { PageHeader, Panel } from '@/components/ui/panel'
import { applyServerErrors, requiredText } from '@/lib/forms'
import { useDocumentTitle } from '@/lib/hooks'
import type { Court, Courtroom } from '@/lib/types'

type DialogState = { kind: 'court'; court?: Court } | { kind: 'room'; court: Court; room?: Courtroom }

export default function CourtsPage() {
  useDocumentTitle('Courts & rooms')
  const { data: courts, isLoading, error, refetch } = useCourts()
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const close = (open: boolean) => !open && setDialog(null)

  return (
    <>
      <PageHeader
        title="Courts and courtrooms"
        description="Where cases are registered and hearings are listed. Inactive courtrooms stay on past records but cannot be booked."
        actions={
          <Button variant="primary" onClick={() => setDialog({ kind: 'court' })}>
            <Plus />
            Add court
          </Button>
        }
      />
      {isLoading && <SkeletonRows />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {courts && courts.length === 0 && <EmptyState icon={Landmark} title="No courts configured" />}
      <div className="grid gap-6 lg:grid-cols-2">
        {courts?.map((court) => (
          <Panel
            key={court.id}
            title={
              <span className="flex items-center gap-2">
                {court.name}
                {!court.active && <Badge>Inactive</Badge>}
              </span>
            }
            description={`${court.code}, ${court.address ?? court.city}`}
            actions={
              <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'court', court })}>
                <Pencil />
                Edit
              </Button>
            }
          >
            <ul className="divide-y divide-line">
              {court.courtrooms.map((room) => (
                <li key={room.id} className="flex items-center gap-3 px-4 py-2.5">
                  <DoorOpen className="size-4 text-muted" aria-hidden="true" />
                  <span className="flex-1 text-sm text-ink">
                    {room.name}
                    {room.floor && <span className="ml-2 text-xs text-muted">{room.floor}</span>}
                  </span>
                  {!room.active && <Badge>Not in use</Badge>}
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${room.name}`} onClick={() => setDialog({ kind: 'room', court, room })}>
                    <Pencil />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2.5">
              <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'room', court })}>
                <Plus />
                Add courtroom
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      {dialog?.kind === 'court' && <CourtDialog court={dialog.court} onOpenChange={close} />}
      {dialog?.kind === 'room' && <RoomDialog court={dialog.court} room={dialog.room} onOpenChange={close} />}
    </>
  )
}

function CourtDialog({ court, onOpenChange }: { court?: Court; onOpenChange: (open: boolean) => void }) {
  const save = useSaveCourt()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, setError: setFieldError, formState } = useForm({
    defaultValues: { code: court?.code ?? '', name: court?.name ?? '', city: court?.city ?? '', address: court?.address ?? '', active: court?.active ?? true },
  })
  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      await save.mutateAsync({ id: court?.id, ...values, address: values.address.trim() || undefined })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e, setFieldError))
    }
  })
  return (
    <FormDialog open onOpenChange={onOpenChange} title={court ? 'Edit court' : 'Add a court'} submitLabel="Save court" submitting={save.isPending} onSubmit={submit}>
      {error && <InlineAlert>{error}</InlineAlert>}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <Field label="Code" required error={formState.errors.code?.message}>
          {(field) => <Input {...field} maxLength={20} {...register('code', requiredText('Enter a short code'))} />}
        </Field>
        <Field label="Name" required error={formState.errors.name?.message}>
          {(field) => <Input {...field} {...register('name', requiredText('Enter the court’s name'))} />}
        </Field>
      </div>
      <Field label="City" required error={formState.errors.city?.message}>
        {(field) => <Input {...field} {...register('city', requiredText('Enter the city'))} />}
      </Field>
      <Field label="Address">{(field) => <Input {...field} {...register('address')} />}</Field>
      <Checkbox label="Accepting new cases" {...register('active')} />
    </FormDialog>
  )
}

function RoomDialog({ court, room, onOpenChange }: { court: Court; room?: Courtroom; onOpenChange: (open: boolean) => void }) {
  const save = useSaveCourtroom()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm({ defaultValues: { name: room?.name ?? '', floor: room?.floor ?? '', active: room?.active ?? true } })
  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      await save.mutateAsync({ id: room?.id, courtId: court.id, name: values.name.trim(), floor: values.floor.trim() || undefined, active: values.active })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e))
    }
  })
  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={room ? 'Edit courtroom' : 'Add a courtroom'}
      description={court.name}
      submitLabel="Save courtroom"
      submitting={save.isPending}
      onSubmit={submit}
      size="sm"
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <Field label="Name" required error={formState.errors.name?.message}>
        {(field) => <Input {...field} placeholder="Court Room 5" {...register('name', requiredText('Enter a name'))} />}
      </Field>
      <Field label="Floor">{(field) => <Input {...field} {...register('floor')} />}</Field>
      <Checkbox label="In use for hearings" {...register('active')} />
    </FormDialog>
  )
}
