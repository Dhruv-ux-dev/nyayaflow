import { AlertTriangle, Info, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('size-5 animate-spin text-current', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center text-muted" role="status" aria-label="Loading">
      <Spinner className="size-6" />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-sunken', className)} aria-hidden="true" />
}

/** Placeholder rows while a list loads. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3 p-4', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-3 grid size-10 place-items-center rounded-full bg-sunken text-muted">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      )}
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)} role="alert">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <p className="font-medium text-ink">This could not be loaded</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-medium text-brand hover:underline">
          Try again
        </button>
      )}
    </div>
  )
}

export function InlineAlert({
  tone = 'danger',
  title,
  children,
  className,
}: {
  tone?: 'danger' | 'warning' | 'info'
  title?: string
  children?: ReactNode
  className?: string
}) {
  const styles = {
    danger: 'border-danger/25 bg-danger-soft text-danger',
    warning: 'border-warning/25 bg-warning-soft text-warning',
    info: 'border-brand/20 bg-brand-soft text-brand-strong',
  }[tone]
  const Icon = tone === 'info' ? Info : AlertTriangle
  return (
    <div className={cn('flex gap-2.5 rounded-md border px-3 py-2.5 text-sm', styles, className)} role={tone === 'info' ? 'status' : 'alert'}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1 text-ink-soft">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children}
      </div>
    </div>
  )
}
