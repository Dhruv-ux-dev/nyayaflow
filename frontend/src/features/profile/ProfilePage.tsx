import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useAction } from '@/api/mutation'
import { useAuth, useCurrentUser } from '@/auth/AuthContext'
import { homeCrumb, workspaces } from '@/components/layout/navigation'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/ui/feedback'
import { Field, Input } from '@/components/ui/form'
import { Detail, PageHeader, Panel } from '@/components/ui/panel'
import { api } from '@/lib/api'
import { applyServerErrors, requiredText } from '@/lib/forms'
import { formatDateTime } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import { roleLabels } from '@/lib/labels'
import type { LoginResponse, User } from '@/lib/types'

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,100}$/

export default function ProfilePage() {
  useDocumentTitle('Profile')
  const user = useCurrentUser()
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader breadcrumbs={[homeCrumb(user.role), { label: 'Profile' }]} title="Profile" description="Your account details and password." />
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="self-start overflow-hidden rounded-xl border border-line bg-surface shadow-raised">
          <div className="h-16 bg-role" aria-hidden="true" />
          <div className="-mt-8 px-5 pb-5">
            <Avatar name={user.fullName} role={user.role} size="lg" className="ring-4 ring-surface" />
            <p className="mt-3 font-serif text-xl leading-tight font-medium text-ink">{user.fullName}</p>
            <p className="text-sm text-muted">{user.designation ?? roleLabels[user.role]}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{roleLabels[user.role]}</Badge>
              <Badge tone="info">{workspaces[user.role].name}</Badge>
            </div>
            <dl className="mt-5 space-y-3.5 border-t border-line pt-4">
              <Detail label="Email (sign-in)">{user.email}</Detail>
              {user.court && <Detail label="Court">{user.court.name}</Detail>}
              {user.barRegistrationNumber && <Detail label="Bar registration">{user.barRegistrationNumber}</Detail>}
              <Detail label="Last sign-in">{formatDateTime(user.lastLoginAt)}</Detail>
            </dl>
            <p className="mt-4 text-xs text-muted">Your email, role and court are managed by an administrator.</p>
          </div>
        </aside>
        <div className="min-w-0 space-y-6">
          <ProfileForm user={user} />
          <PasswordForm />
        </div>
      </div>
    </div>
  )
}

function ProfileForm({ user }: { user: User }) {
  const { setUser } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const save = useAction((values: { fullName: string; phone?: string }) => api.put<User>('/auth/me', values), { success: 'Profile saved' })
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState,
  } = useForm({ defaultValues: { fullName: user.fullName, phone: user.phone ?? '' } })
  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      setUser(await save.mutateAsync({ fullName: values.fullName.trim(), phone: values.phone.trim() || undefined }))
    } catch (e) {
      setError(applyServerErrors(e, setFieldError))
    }
  })
  return (
    <Panel title="Contact details">
      <form onSubmit={submit} noValidate className="space-y-4 p-5">
        {error && <InlineAlert>{error}</InlineAlert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={formState.errors.fullName?.message}>
            {(field) => <Input {...field} autoComplete="name" {...register('fullName', requiredText('Enter your name'))} />}
          </Field>
          <Field label="Phone" error={formState.errors.phone?.message}>
            {(field) => <Input {...field} type="tel" autoComplete="tel" {...register('phone')} />}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="role" loading={save.isPending}>
            Save details
          </Button>
        </div>
      </form>
    </Panel>
  )
}

function PasswordForm() {
  const { acceptSession } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const change = useAction((values: { currentPassword: string; newPassword: string }) => api.put<LoginResponse>('/auth/me/password', values))
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError: setFieldError,
    formState,
  } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  })
  const submit = handleSubmit(async (values) => {
    setError(null)
    try {
      const session = await change.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      acceptSession(session)
      reset()
      toast.success('Password changed. Any other signed-in sessions have been ended.')
    } catch (e) {
      setError(applyServerErrors(e, setFieldError))
    }
  })
  return (
    <Panel title="Change password" description="At least 8 characters, with a letter and a number.">
      <form onSubmit={submit} noValidate className="space-y-4 p-5">
        {error && <InlineAlert>{error}</InlineAlert>}
        <Field label="Current password" required error={formState.errors.currentPassword?.message}>
          {(field) => (
            <Input
              {...field}
              type="password"
              autoComplete="current-password"
              {...register('currentPassword', { required: 'Enter your current password' })}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" required error={formState.errors.newPassword?.message}>
            {(field) => (
              <Input
                {...field}
                type="password"
                autoComplete="new-password"
                {...register('newPassword', {
                  required: 'Choose a new password',
                  pattern: { value: PASSWORD_RULE, message: 'Use 8 or more characters with a letter and a number' },
                })}
              />
            )}
          </Field>
          <Field label="Confirm new password" required error={formState.errors.confirm?.message}>
            {(field) => (
              <Input
                {...field}
                type="password"
                autoComplete="new-password"
                {...register('confirm', { validate: (value) => value === watch('newPassword') || 'The passwords do not match' })}
              />
            )}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="role" loading={change.isPending}>
            Change password
          </Button>
        </div>
      </form>
    </Panel>
  )
}
