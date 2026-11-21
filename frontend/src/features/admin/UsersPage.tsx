import { KeyRound, MoreHorizontal, Pencil, Search, UserCheck, UserPlus, UserX, Users } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { useCourts, useCreateUser, useResetPassword, useSetUserActive, useUpdateUser, useUsers } from '@/api/admin'
import { useCurrentUser } from '@/auth/AuthContext'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, FormDialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, InlineAlert, SkeletonRows } from '@/components/ui/feedback'
import { Field, Input, Select } from '@/components/ui/form'
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/menu'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/panel'
import { Table, TD, TH, THead, TR } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { applyServerErrors, requiredText } from '@/lib/forms'
import { timeAgo } from '@/lib/format'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import { options, roleLabels } from '@/lib/labels'
import type { Role, User } from '@/lib/types'

const PASSWORD_RULE = { value: /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/, message: 'Use 8 or more characters with a letter and a number' }

export default function UsersPage() {
  useDocumentTitle('Users')
  const me = useCurrentUser()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('')
  const [page, setPage] = useState(0)
  const q = useDebounced(search, 300)
  const { data, isLoading, error, refetch, isFetching } = useUsers({
    q: q || undefined,
    role: role || undefined,
    active: status === '' ? undefined : status === 'active',
    page,
    size: 20,
  })
  const [dialog, setDialog] = useState<{ kind: 'create' } | { kind: 'edit' | 'password' | 'toggle'; user: User } | null>(null)
  const setActive = useSetUserActive()
  const close = (open: boolean) => !open && setDialog(null)

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts for judges, counsel, registry staff and administrators."
        actions={
          <Button variant="primary" onClick={() => setDialog({ kind: 'create' })}>
            <UserPlus />
            Add user
          </Button>
        }
      />
      <div className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} placeholder="Name, email or bar number" aria-label="Search users" className="pl-9" />
          </div>
          <Select value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(0) }} aria-label="Filter by role" className="w-44">
            <option value="">All roles</option>
            {options(roleLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as 'active' | 'inactive' | ''); setPage(0) }} aria-label="Filter by status" className="w-40">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </Select>
        </div>
        {isLoading && <SkeletonRows />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && <EmptyState icon={Users} title="No users match" />}
        {data && data.content.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            <Table>
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>Role</TH>
                  <TH>Court or enrolment</TH>
                  <TH>Last sign-in</TH>
                  <TH>Status</TH>
                  <TH className="text-right">
                    <span className="sr-only">Actions</span>
                  </TH>
                </tr>
              </THead>
              <tbody>
                {data.content.map((user) => (
                  <TR key={user.id}>
                    <TD>
                      <span className="flex items-center gap-3">
                        <Avatar name={user.fullName} role={user.role} size="sm" />
                        <span className="min-w-0">
                          <span className="block font-medium text-ink">
                            {user.fullName}
                            {user.id === me.id && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
                          </span>
                          <span className="block text-xs text-muted">{user.email}</span>
                        </span>
                      </span>
                    </TD>
                    <TD>
                      <span className="block text-sm text-ink">{roleLabels[user.role]}</span>
                      {user.designation && <span className="block text-xs text-muted">{user.designation}</span>}
                    </TD>
                    <TD className="text-sm text-ink-soft">{user.court?.name ?? user.barRegistrationNumber ?? '—'}</TD>
                    <TD className="text-sm whitespace-nowrap text-ink-soft">{user.lastLoginAt ? timeAgo(user.lastLoginAt) : 'Never'}</TD>
                    <TD>{user.active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="neutral" dot>Deactivated</Badge>}</TD>
                    <TD className="text-right">
                      <Menu
                        trigger={
                          <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${user.fullName}`}>
                            <MoreHorizontal />
                          </Button>
                        }
                      >
                        <MenuItem onSelect={() => setDialog({ kind: 'edit', user })}>
                          <Pencil />
                          Edit account
                        </MenuItem>
                        <MenuItem onSelect={() => setDialog({ kind: 'password', user })}>
                          <KeyRound />
                          Reset password
                        </MenuItem>
                        {user.id !== me.id && (
                          <>
                            <MenuSeparator />
                            {user.active ? (
                              <MenuItem tone="danger" onSelect={() => setDialog({ kind: 'toggle', user })}>
                                <UserX />
                                Deactivate
                              </MenuItem>
                            ) : (
                              <MenuItem onSelect={() => setActive.mutate({ id: user.id, active: true })}>
                                <UserCheck />
                                Reactivate
                              </MenuItem>
                            )}
                          </>
                        )}
                      </Menu>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination page={data} onChange={setPage} noun="users" />
          </div>
        )}
      </div>

      {dialog?.kind === 'create' && <UserDialog open onOpenChange={close} />}
      {dialog?.kind === 'edit' && <UserDialog user={dialog.user} open onOpenChange={close} />}
      {dialog?.kind === 'password' && <ResetPasswordDialog user={dialog.user} open onOpenChange={close} />}
      {dialog?.kind === 'toggle' && (
        <ConfirmDialog
          open
          onOpenChange={close}
          title="Deactivate account"
          description={
            <>
              {dialog.user.fullName} will be signed out immediately and will not be able to sign in. Their name stays on the cases and
              records they are part of. Judges with pending cases must have them reassigned first.
            </>
          }
          confirmLabel="Deactivate"
          tone="danger"
          loading={setActive.isPending}
          onConfirm={() => setActive.mutate({ id: dialog.user.id, active: false }, { onSuccess: () => setDialog(null) })}
        />
      )}
    </>
  )
}

interface UserForm {
  fullName: string
  email: string
  role: Role
  designation: string
  phone: string
  barRegistrationNumber: string
  courtId: string
  password: string
}

function UserDialog({ user, open, onOpenChange }: { user?: User; open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateUser()
  const update = useUpdateUser()
  const { data: courts } = useCourts()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, control, setError: setFieldError, formState } = useForm<UserForm>({
    defaultValues: {
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      role: user?.role ?? 'LAWYER',
      designation: user?.designation ?? '',
      phone: user?.phone ?? '',
      barRegistrationNumber: user?.barRegistrationNumber ?? '',
      courtId: user?.court ? String(user.court.id) : '',
      password: '',
    },
  })
  const role = useWatch({ control, name: 'role' })

  const submit = handleSubmit(async (values) => {
    setError(null)
    const payload = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      role: values.role,
      designation: values.designation.trim() || undefined,
      phone: values.phone.trim() || undefined,
      barRegistrationNumber: values.role === 'LAWYER' ? values.barRegistrationNumber.trim() : undefined,
      courtId: values.role === 'JUDGE' || values.role === 'STAFF' ? Number(values.courtId) : null,
    }
    try {
      if (user) await update.mutateAsync({ id: user.id, ...payload })
      else await create.mutateAsync({ ...payload, password: values.password })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e, setFieldError))
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user ? `Edit ${user.fullName}` : 'Add a user'}
      description={user ? 'Changing the role signs the person out so they start a fresh session.' : 'Share the temporary password securely; they can change it from their profile.'}
      submitLabel={user ? 'Save account' : 'Create account'}
      submitting={create.isPending || update.isPending}
      onSubmit={submit}
      size="lg"
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={formState.errors.fullName?.message}>
          {(field) => <Input {...field} {...register('fullName', requiredText('Enter a name'))} />}
        </Field>
        <Field label="Email" required error={formState.errors.email?.message}>
          {(field) => <Input {...field} type="email" {...register('email', requiredText('Enter an email address'))} />}
        </Field>
        <Field label="Role" required>
          {(field) => (
            <Select {...field} {...register('role')}>
              {options(roleLabels).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Designation" hint="For example “Additional District Judge”.">
          {(field) => <Input {...field} {...register('designation')} />}
        </Field>
        {role === 'LAWYER' && (
          <Field label="Bar registration number" required error={formState.errors.barRegistrationNumber?.message}>
            {(field) => <Input {...field} placeholder="MH/1123/2009" {...register('barRegistrationNumber', requiredText('Lawyers need a bar registration number'))} />}
          </Field>
        )}
        {(role === 'JUDGE' || role === 'STAFF') && (
          <Field label="Court" required error={formState.errors.courtId?.message}>
            {(field) => (
              <Select {...field} {...register('courtId', { required: 'Choose a court' })}>
                <option value="">Choose a court</option>
                {courts?.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Phone" error={formState.errors.phone?.message}>
          {(field) => <Input {...field} type="tel" {...register('phone')} />}
        </Field>
        {!user && (
          <Field label="Temporary password" required error={formState.errors.password?.message} hint="8 or more characters with a letter and a number.">
            {(field) => <Input {...field} type="text" autoComplete="off" {...register('password', { required: 'Set a temporary password', pattern: PASSWORD_RULE })} />}
          </Field>
        )}
      </div>
    </FormDialog>
  )
}

function ResetPasswordDialog({ user, open, onOpenChange }: { user: User; open: boolean; onOpenChange: (open: boolean) => void }) {
  const reset = useResetPassword()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm({ defaultValues: { newPassword: '' } })
  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      await reset.mutateAsync({ id: user.id, newPassword: values.newPassword })
      onOpenChange(false)
    } catch (e) {
      setError(applyServerErrors(e))
    }
  })
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reset password"
      description={`${user.fullName} will be signed out everywhere and must use the new password.`}
      submitLabel="Reset password"
      submitting={reset.isPending}
      onSubmit={submit}
      size="sm"
    >
      {error && <InlineAlert>{error}</InlineAlert>}
      <Field label="New password" required error={formState.errors.newPassword?.message}>
        {(field) => <Input {...field} type="text" autoComplete="off" {...register('newPassword', { required: 'Enter a password', pattern: PASSWORD_RULE })} />}
      </Field>
    </FormDialog>
  )
}
