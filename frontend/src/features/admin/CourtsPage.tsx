import { DoorOpen, Landmark, MapPin, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useCourts, useSaveCourt, useSaveCourtroom } from '@/api/admin'
import { useCounts } from '@/api/insights'
import { useCurrentUser } from '@/auth/AuthContext'
import { homeCrumb } from '@/components/layout/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, InlineAlert, SkeletonRows } from '@/components/ui/feedback'
import { Checkbox, Field, Input } from '@/components/ui/form'
import { PageHeader } from '@/components/ui/panel'
import { cn } from '@/lib/cn'
import { pendingStatuses } from '@/lib/labels'
import { Link } from 'react-router'
import { applyServerErrors, requiredText } from '@/lib/forms'
import { useDocumentTitle } from '@/lib/hooks'
import type { Court, Courtroom } from '@/lib/types'

type DialogState = { kind: 'court'; court?: Court } | { kind: 'room'; court: Court; room?: Courtroom }

export default function CourtsPage() {
  useDocumentTitle('Courts & rooms')
  const me = useCurrentUser()
  const { data: courts, isLoading, error, refetch } = useCourts()
  const pending = useCounts(
    '/cases',
    (courts ?? []).map((c) => ({ key: c.id, query: { courtId: c.id, status: pendingStatuses } })),
  )
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const close = (open: boolean) => !open && setDialog(null)

  return (
    <>
      <PageHeader
        breadcrumbs={[homeCrumb(me.role), { label: 'Courts & rooms' }]}
        eyebrow="Configuration"
        title="Courts and courtrooms"
        description="Where cases are registered and hearings are listed. Inactive courtrooms stay on past records but cannot be booked."
        actions={
          <Button variant="role" onClick={() => setDialog({ kind: 'court' })}>
            <Plus />
            Add court
          </Button>
        }
      />
      {isLoading && <SkeletonRows />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {courts && courts.length === 0 && <EmptyState icon={Landmark} title="No courts configured" />}
      <div className="grid gap-6 lg:grid-cols-2">
        {courts?.map((court) => {
          const activeRooms = court.courtrooms.filter((room) => room.active).length
          return (
            <section key={court.id} className="overflow-hidden rounded-xl border border-line bg-surface shadow-raised">
              <header className="flex items-start gap-4 border-b border-line px-5 py-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-midnight text-white">
                  <Landmark className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="flex flex-wrap items-center gap-2 font-serif text-lg leading-tight font-medium text-ink">
                    {court.name}
                    {court.active ? (
                      <Badge tone="success" dot>
                        Accepting cases
                      </Badge>
                    ) : (
                      <Badge>Inactive</Badge>
                    )}
                  </h2>
                  <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {court.code} · {court.address ?? court.city}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'court', court })}>
                  <Pencil />
                  Edit
                </Button>
              </header>
              <dl className="grid grid-cols-3 gap-px border-b border-line bg-line text-center">
                <div className="bg-surface px-3 py-2.5">
                  <dt className="text-xs text-muted">Courtrooms</dt>
                  <dd className="tabular text-lg font-semibold text-ink">{court.courtrooms.length}</dd>
                </div>
                <div className="bg-surface px-3 py-2.5">
                  <dt className="text-xs text-muted">In use</dt>
                  <dd className="tabular text-lg font-semibold text-ink">{activeRooms}</dd>
                </div>
                <Link
                  to={`/cases?courtId=${court.id}&status=FILED,UNDER_REVIEW,ACTIVE,AWAITING_DECISION`}
                  className="bg-surface px-3 py-2.5 transition-colors hover:bg-ivory"
                >
                  <dt className="text-xs text-muted">Pending cases</dt>
                  <dd className="tabular text-lg font-semibold text-ink">{pending.counts.get(court.id) ?? '–'}</dd>
                </Link>
              </dl>
              <ul className="grid gap-2 p-4 sm:grid-cols-2">
                {court.courtrooms.map((room) => (
                  <li
                    key={room.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2.5',
                      room.active ? 'border-line bg-ivory/60' : 'border-dashed border-line-strong bg-surface',
                    )}
                  >
                    <DoorOpen className={cn('size-4 shrink-0', room.active ? 'text-teal' : 'text-faint')} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm font-medium', room.active ? 'text-ink' : 'text-muted')}>{room.name}</span>
                      <span className="block truncate text-xs text-muted">{room.active ? (room.floor ?? 'Floor not recorded') : 'Not in use'}</span>
                    </span>
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit ${room.name}`} onClick={() => setDialog({ kind: 'room', court, room })}>
                      <Pencil />
                    </Button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => setDialog({ kind: 'room', court })}
                    className="flex h-full min-h-[54px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong text-sm font-medium text-ink-soft transition-colors hover:border-role hover:text-role"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add courtroom
                  </button>
                </li>
              </ul>
            </section>
          )
        })}
      </div>
      {dialog?.kind === 'court' && <CourtDialog court={dialog.court} onOpenChange={close} />}
      {dialog?.kind === 'room' && <RoomDialog court={dialog.court} room={dialog.room} onOpenChange={close} />}
    </>
  )
}

function CourtDialog({ court, onOpenChange }: { court?: Court; onOpenChange: (open: boolean) => void }) {
  const save = useSaveCourt()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState,
  } = useForm({
    defaultValues: {
      code: court?.code ?? '',
      name: court?.name ?? '',
      city: court?.city ?? '',
      address: court?.address ?? '',
      active: court?.active ?? true,
    },
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
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title={court ? 'Edit court' : 'Add a court'}
      submitLabel="Save court"
      submitting={save.isPending}
      onSubmit={submit}
    >
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
  const { register, handleSubmit, formState } = useForm({
    defaultValues: { name: room?.name ?? '', floor: room?.floor ?? '', active: room?.active ?? true },
  })
  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      await save.mutateAsync({
        id: room?.id,
        courtId: court.id,
        name: values.name.trim(),
        floor: values.floor.trim() || undefined,
        active: values.active,
      })
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
