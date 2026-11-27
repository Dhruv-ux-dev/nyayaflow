import { ArrowRight, Eye, EyeOff, Gavel, KeyRound, Lock, Mail, Scale, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router'

import { useAuth } from '@/auth/AuthContext'
import { LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'
import { InlineAlert, Spinner } from '@/components/ui/feedback'
import { Field, Input } from '@/components/ui/form'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { caseStatusLabels, caseStatuses } from '@/lib/labels'
import { useDocumentTitle } from '@/lib/hooks'

const DEMO_PASSWORD = 'Demo@123'
const demoAccounts: Array<{ label: string; name: string; email: string; workspace: string; icon: LucideIcon; tone: string }> = [
  {
    label: 'Court staff',
    name: 'Neha Kapoor, Registrar',
    email: 'staff@nyayaflow.test',
    workspace: 'Registry desk',
    icon: Users,
    tone: 'bg-teal-soft text-teal',
  },
  { label: 'Judge', name: 'Meera Raghavan', email: 'judge@nyayaflow.test', workspace: 'Chambers', icon: Gavel, tone: 'bg-seal-soft text-seal' },
  {
    label: 'Lawyer',
    name: 'Rohan Deshpande',
    email: 'lawyer@nyayaflow.test',
    workspace: 'Counsel desk',
    icon: Scale,
    tone: 'bg-brand-soft text-brand',
  },
  {
    label: 'Administrator',
    name: 'Aarav Mehta',
    email: 'admin@nyayaflow.test',
    workspace: 'System console',
    icon: ShieldCheck,
    tone: 'bg-sunken text-ink',
  },
]
const showDemoAccounts = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  const [showPassword, setShowPassword] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [demoPending, setDemoPending] = useState<string | null>(null)
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
      await signIn(email.trim(), password)
      navigate(destination, { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setDemoPending(null)
    }
  })

  /** The role buttons fill in the demo account for that role and sign in with it. */
  const signInAsDemo = (email: string) => {
    setDemoPending(email)
    setValue('email', email, { shouldValidate: true })
    setValue('password', DEMO_PASSWORD, { shouldValidate: true })
    void submit()
  }

  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-midnight px-12 py-10 text-white lg:flex xl:px-16">
        {/* Fine ruled lines, like the margin of an order sheet. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(0deg,#fff_0,#fff_1px,transparent_1px,transparent_32px)]"
        />
        <span className="absolute top-0 right-20 bottom-0 w-[6px] bg-seal/90" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <LogoMark inverted className="size-9" />
          <span className="font-serif text-2xl font-semibold">NyayaFlow</span>
        </div>
        <div className="relative max-w-xl">
          <p className="eyebrow text-[#e2c99a]">Court case lifecycle management</p>
          <h1 className="mt-4 font-serif text-[2.9rem] leading-[1.06] font-medium tracking-[-0.015em] text-balance">
            Every case, from the day it is filed to the day it is closed.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/65">
            Registry, bench and bar work from one authoritative record: who is involved, what has happened, what is listed next and which deadlines
            are approaching.
          </p>
          <ol className="mt-12 grid grid-cols-6" aria-label="Case lifecycle">
            {caseStatuses.map((status, index) => (
              <li key={status} className="relative pt-6">
                <span className="absolute top-[8px] right-0 left-0 border-t border-white/20" aria-hidden="true" />
                <span
                  className={cn(
                    'absolute top-0 left-0 size-[17px] rounded-full border-2',
                    index < 3 ? 'border-[#e2c99a] bg-[#e2c99a]' : 'border-white/35 bg-midnight',
                  )}
                  aria-hidden="true"
                />
                <span className={cn('block pr-2 text-xs leading-snug', index < 3 ? 'text-white' : 'text-white/50')}>{caseStatusLabels[status]}</span>
              </li>
            ))}
          </ol>
          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-6 text-sm">
            {[
              { label: 'Registry', text: 'Filing queue, allocation and cause lists' },
              { label: 'Bench', text: 'The day’s board, orders and judgments' },
              { label: 'Bar', text: 'Matters, listings and what is due' },
            ].map((item) => (
              <div key={item.label}>
                <dt className="font-serif text-base text-white">{item.label}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-white/55">{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="relative text-xs text-white/40">An educational project. Fictional courts, people and cases.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark />
            <span className="font-serif text-xl font-semibold">NyayaFlow</span>
          </div>
          <p className="eyebrow text-muted">Welcome back</p>
          <h2 className="mt-1 font-serif text-[2rem] leading-tight font-medium text-ink">Sign in to NyayaFlow</h2>
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

          <form onSubmit={submit} noValidate className="mt-6 space-y-4 rounded-xl border border-line bg-surface p-5 shadow-raised sm:p-6">
            <Field label="Email" error={errors.email?.message}>
              {(field) => (
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
                  <Input
                    {...field}
                    type="email"
                    autoComplete="username"
                    autoFocus
                    placeholder="name@court.example"
                    className="h-10 pl-9"
                    {...register('email', {
                      required: 'Enter your email address',
                      pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address' },
                    })}
                  />
                </div>
              )}
            </Field>
            <Field label="Password" error={errors.password?.message}>
              {(field) => (
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
                  <Input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="h-10 pr-10 pl-9"
                    {...register('password', { required: 'Enter your password' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              )}
            </Field>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen((v) => !v)}
                aria-expanded={forgotOpen}
                className="text-[13px] font-medium text-brand hover:underline"
              >
                Forgot password?
              </button>
            </div>
            {forgotOpen && (
              <div className="flex gap-2.5 rounded-lg border border-line bg-ivory px-3 py-2.5 text-[13px] text-ink-soft">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                <p>
                  NyayaFlow does not send reset emails. Ask your court’s administrator to reset your password; you can then change it from your
                  profile.
                </p>
              </div>
            )}
            <Button type="submit" variant="primary" size="lg" className="h-11 w-full justify-center" loading={isSubmitting && !demoPending}>
              Sign in
              {!isSubmitting && <ArrowRight />}
            </Button>
          </form>

          {showDemoAccounts && (
            <div className="mt-8">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
                <p className="eyebrow text-faint">Or explore a demo workspace</p>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </div>
              <p className="mt-2 text-center text-xs text-muted">Each role sees a different NyayaFlow. Password for all: {DEMO_PASSWORD}</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => signInAsDemo(account.email)}
                    className="group flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-left shadow-[0_1px_1px_rgb(15_27_45/0.03)] transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-raised disabled:opacity-60"
                  >
                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', account.tone)}>
                      {demoPending === account.email ? <Spinner className="size-4" /> : <account.icon className="size-4" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{account.label}</span>
                      <span className="block truncate text-xs text-muted">{account.name}</span>
                      <span className="block truncate text-[11px] text-faint">{account.workspace}</span>
                    </span>
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
