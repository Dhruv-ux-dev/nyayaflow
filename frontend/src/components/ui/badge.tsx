import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type Tone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'filed'
  | 'review'
  | 'active'
  | 'reserved'
  | 'disposed'
  | 'closed'
  | 'seal'

export const toneClasses: Record<Tone, { badge: string; dot: string; text: string }> = {
  neutral: { badge: 'bg-sunken text-ink-soft', dot: 'bg-faint', text: 'text-ink-soft' },
  info: { badge: 'bg-brand-soft text-brand-strong', dot: 'bg-brand', text: 'text-brand' },
  success: { badge: 'bg-success-soft text-success', dot: 'bg-success', text: 'text-success' },
  warning: { badge: 'bg-warning-soft text-warning', dot: 'bg-warning', text: 'text-warning' },
  danger: { badge: 'bg-danger-soft text-danger', dot: 'bg-danger', text: 'text-danger' },
  filed: { badge: 'bg-filed-soft text-filed', dot: 'bg-filed', text: 'text-filed' },
  review: { badge: 'bg-review-soft text-review', dot: 'bg-review', text: 'text-review' },
  active: { badge: 'bg-active-soft text-active', dot: 'bg-active', text: 'text-active' },
  reserved: { badge: 'bg-reserved-soft text-reserved', dot: 'bg-reserved', text: 'text-reserved' },
  disposed: { badge: 'bg-disposed-soft text-disposed', dot: 'bg-disposed', text: 'text-disposed' },
  closed: { badge: 'bg-closed-soft text-closed', dot: 'bg-closed', text: 'text-closed' },
  seal: { badge: 'bg-seal-soft text-seal', dot: 'bg-seal', text: 'text-seal' },
}

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
  className,
  title,
}: {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap',
        toneClasses[tone].badge,
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', toneClasses[tone].dot)} aria-hidden="true" />}
      {children}
    </span>
  )
}
