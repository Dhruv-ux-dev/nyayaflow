import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Skeleton } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'
import type { Dashboard } from '@/lib/types'

export function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

export function firstName(fullName: string) {
  return fullName.split(' ')[0]
}

/** A figure from the role dashboard's stat list, by key. */
export function stat(data: Dashboard | undefined, key: string) {
  return data?.stats.find((s) => s.key === key)
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

interface QuickActionProps {
  icon: LucideIcon
  label: string
  description?: string
  to?: string
  onClick?: () => void
  /** Draws the action in the workspace accent. */
  primary?: boolean
}

/** A shortcut that performs a real action: a link to a working page, or a picker that leads to one. */
export function QuickAction({ icon: Icon, label, description, to, onClick, primary }: QuickActionProps) {
  const classes = cn(
    'group flex min-w-0 items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-[border-color,box-shadow,background-color]',
    primary
      ? 'border-transparent bg-role text-white shadow-raised hover:bg-role-strong'
      : 'border-line bg-surface shadow-raised hover:border-line-strong hover:shadow-lifted',
  )
  const body = (
    <>
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', primary ? 'bg-white/15 text-white' : 'bg-role-soft text-role')}>
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-semibold', primary ? 'text-white' : 'text-ink')}>{label}</span>
        {description && <span className={cn('block truncate text-xs', primary ? 'text-white/75' : 'text-muted')}>{description}</span>}
      </span>
      <ArrowUpRight
        className={cn(
          'size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
          primary ? 'text-white/70' : 'text-faint',
        )}
        aria-hidden="true"
      />
    </>
  )
  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {body}
    </button>
  )
}

export function QuickActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6', className)}>{children}</div>
}

export function DashboardSkeleton({ kpis = 6 }: { kpis?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: kpis }, (_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}

/** Section label that sits between dashboard bands. */
export function BandTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="eyebrow text-muted">{children}</h2>
      {aside}
    </div>
  )
}
