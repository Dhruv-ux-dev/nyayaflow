import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '@/lib/cn'

import { Skeleton } from './feedback'

export type KpiTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'role'

const toneAccent: Record<KpiTone, { bar: string; icon: string; value: string }> = {
  neutral: { bar: 'bg-line-strong', icon: 'bg-sunken text-ink-soft', value: 'text-ink' },
  info: { bar: 'bg-brand', icon: 'bg-brand-soft text-brand', value: 'text-ink' },
  success: { bar: 'bg-success', icon: 'bg-success-soft text-success', value: 'text-ink' },
  warning: { bar: 'bg-warning', icon: 'bg-warning-soft text-warning', value: 'text-ink' },
  danger: { bar: 'bg-danger', icon: 'bg-danger-soft text-danger', value: 'text-danger' },
  role: { bar: 'bg-role', icon: 'bg-role-soft text-role', value: 'text-ink' },
}

/**
 * One key figure. The value is always a real count from the API; `loading` shows a placeholder
 * while it is fetched rather than a guessed number.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  to,
  loading,
  footer,
  className,
}: {
  label: string
  value: number | string | undefined
  hint?: ReactNode
  icon?: LucideIcon
  tone?: KpiTone
  to?: string | null
  loading?: boolean
  footer?: ReactNode
  className?: string
}) {
  const accent = toneAccent[tone]
  const numeric = typeof value === 'number'
  const body = (
    <>
      <span
        className={cn('absolute inset-x-0 top-0 h-[3px] rounded-t-xl opacity-0 transition-opacity', accent.bar, tone !== 'neutral' && 'opacity-100')}
        aria-hidden="true"
      />
      <span className="flex items-start justify-between gap-3">
        <span className="text-[13px] leading-snug font-medium text-muted">{label}</span>
        {Icon && (
          <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', accent.icon)}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </span>
      {loading || value === undefined ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <span
          className={cn(
            'tabular mt-1 block text-[1.9rem] leading-none font-semibold tracking-[-0.025em]',
            numeric && value === 0 ? 'text-ink' : accent.value,
          )}
        >
          {numeric ? value.toLocaleString('en-IN') : value}
        </span>
      )}
      {hint && <span className="mt-2 block truncate text-xs text-muted">{hint}</span>}
      {footer}
    </>
  )
  const classes = cn('relative block min-w-0 rounded-xl border border-line bg-surface px-4 py-4 shadow-raised', className)
  return to ? (
    <Link to={to} className={cn(classes, 'transition-[box-shadow,border-color] hover:border-line-strong hover:shadow-lifted')}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  )
}

export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6', className)}>{children}</div>
}

/** A compact figure used inside panels and headers: label above, number below. */
export function MiniStat({ label, value, tone = 'neutral', to }: { label: string; value: number | undefined; tone?: KpiTone; to?: string }) {
  const content = (
    <>
      <span className="block text-xs text-muted">{label}</span>
      {value === undefined ? (
        <Skeleton className="mt-1 h-6 w-10" />
      ) : (
        <span
          className={cn(
            'tabular mt-0.5 block text-xl font-semibold',
            value > 0 && tone === 'danger' ? 'text-danger' : value > 0 && tone === 'warning' ? 'text-warning' : 'text-ink',
          )}
        >
          {value.toLocaleString('en-IN')}
        </span>
      )}
    </>
  )
  return to ? (
    <Link to={to} className="block rounded-md px-1 transition-colors hover:bg-sunken/60">
      {content}
    </Link>
  ) : (
    <div className="px-1">{content}</div>
  )
}
