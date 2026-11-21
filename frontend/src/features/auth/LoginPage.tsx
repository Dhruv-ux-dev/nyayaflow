import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router'

import { useAuth } from '@/auth/AuthContext'
import { LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/ui/feedback'
import { Field, Input } from '@/components/ui/form'
import { errorMessage } from '@/lib/api'
import { caseStatusLabels, caseStatuses } from '@/lib/labels'
import { useDocumentTitle } from '@/lib/hooks'

const DEMO_PASSWORD = 'Demo@123'
const demoAccounts = [
  { label: 'Court staff', name: 'Neha Kapoor, Registrar', email: 'staff@nyayaflow.test' },
  { label: 'Judge', name: 'Meera Raghavan', email: 'judge@nyayaflow.test' },
  { label: 'Lawyer', name: 'Rohan Deshpande', email: 'lawyer@nyayaflow.test' },
  { label: 'Administrator', name: 'Aarav Mehta', email: 'admin@nyayaflow.test' },
]
const showDemoAccounts = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false'

interface LoginForm {
  email: string
  password: string
}

export function LoginPage() {
  useDocumentTitle('Sign in')
  const { user, signIn, signOutReason } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ defaultValues: { email: '', password: '' } })

  const next = params.get('next')
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
  if (user) return <Navigate to={destination} replace />

  const submit = handleSubmit(async ({ email, password }) => {
    setError(null)
    try {
      await signIn(email, password)
      navigate(destination, { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    }
  })

  const signInAsDemo = (email: string) => {
    setValue('email', email)
    setValue('password', DEMO_PASSWORD)
    void submit()
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink px-12 py-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <LogoMark className="size-9 ring-1 ring-white/20" />
          <span className="font-serif text-2xl font-semibold">NyayaFlow</span>
        </div>
        <div className="max-w-xl">
          <h1 className="font-serif text-[2.75rem] leading-[1.08] font-medium tracking-[-0.015em] text-balance">
            Every case, from the day it is filed to the day it is closed.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
            Registry, bench and bar work from one record: who is involved, what has happened, what is listed next and
            which deadlines are approaching.
          </p>
          <ol className="mt-12 grid grid-cols-6 gap-0" aria-label="Case lifecycle">
            {caseStatuses.map((status, index) => (
              <li key={status} className="relative pt-5">
                <span className="absolute top-[7px] right-0 left-0 border-t border-white/25" aria-hidden="true" />
                <span
                  className={`absolute top-0 left-0 size-3.5 rounded-full border-2 ${index < 3 ? 'border-white bg-white' : 'border-white/40 bg-ink'}`}
                  aria-hidden="true"
                />
                <span className={`block pr-2 text-xs leading-snug ${index < 3 ? 'text-white' : 'text-white/55'}`}>
                  {caseStatusLabels[status]}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-white/45">An educational project. Fictional courts, people and cases.</p>
        <span className="absolute top-0 right-16 bottom-0 w-[7px] bg-seal/90" aria-hidden="true" />
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark />
            <span className="font-serif text-xl font-semibold">NyayaFlow</span>
          </div>
          <h2 className="font-serif text-[1.9rem] leading-tight font-medium text-ink">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted">Use the account issued by your court’s administrator.</p>

          {signOutReason === 'expired' && !error && (
            <InlineAlert tone="info" className="mt-6">
              Your session ended. Sign in again to continue where you left off.
            </InlineAlert>
          )}
          {error && (
            <InlineAlert className="mt-6" title="Could not sign in">
              {error}
            </InlineAlert>
          )}

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <Field label="Email" error={errors.email?.message}>
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  autoComplete="username"
                  autoFocus
                  {...register('email', { required: 'Enter your email address' })}
                />
              )}
            </Field>
            <Field label="Password" error={errors.password?.message}>
              {(field) => (
                <Input {...field} type="password" autoComplete="current-password" {...register('password', { required: 'Enter your password' })} />
              )}
            </Field>
            <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={isSubmitting}>
              Sign in
            </Button>
          </form>

          {showDemoAccounts && (
            <div className="mt-10">
              <p className="text-[13px] font-medium text-ink-soft">Demo accounts</p>
              <p className="mt-0.5 text-xs text-muted">Each role sees a different NyayaFlow. Password for all: {DEMO_PASSWORD}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => signInAsDemo(account.email)}
                    className="rounded-md border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-paper disabled:opacity-60"
                  >
                    <span className="block text-sm font-medium text-ink">{account.label}</span>
                    <span className="block truncate text-xs text-muted">{account.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
