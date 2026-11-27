import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { cn } from '@/lib/cn'

/** A bordered white sheet with an optional header row. */
export function Panel({
  title,
  description,
  actions,
  icon,
  children,
  className,
  bodyClassName,
  headerClassName,
  id,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Small leading glyph for the header. */
  icon?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  headerClassName?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('min-w-0 rounded-xl border border-line bg-surface shadow-raised', className)}>
      {(title || actions) && (
        <header className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-5', headerClassName)}>
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <span className="grid size-7 shrink-0 place-items-center rounded-md bg-sunken text-ink-soft [&_svg]:size-4">{icon}</span>}
            <div className="min-w-0">
              {title && <h2 className="text-[15px] leading-tight font-semibold text-ink">{title}</h2>}
              {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('no-print mb-2', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="size-3.5 text-faint" aria-hidden="true" />}
            {item.to ? (
              <Link to={item.to} className="rounded-sm transition-colors hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-soft">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * Page title block. Titles are set in the serif face; an eyebrow names the workspace area and
 * breadcrumbs show where the page sits.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  breadcrumbs,
  children,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
  breadcrumbs?: Crumb[]
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1.5 text-role">{eyebrow}</p>}
          <h1 className="font-serif text-[1.75rem] leading-[1.15] font-medium tracking-[-0.015em] text-ink sm:text-[2rem]">{title}</h1>
          {description && <p className="mt-1.5 max-w-[70ch] text-sm text-muted">{description}</p>}
          {children}
        </div>
        {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/** Labelled value in detail views. */
export function Detail({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="eyebrow text-faint">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  )
}

/** A white sheet that holds a toolbar and a list or table: the standard list-page container. */
export function ListSheet({ toolbar, children, className }: { toolbar?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-raised', className)}>
      {toolbar && <div className="border-b border-line bg-surface p-3 sm:px-4">{toolbar}</div>}
      {children}
    </div>
  )
}

/** "View all" style link used in panel headers. */
export function PanelLink({ to, children = 'View all' }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-0.5 text-[13px] font-medium text-brand hover:text-brand-strong hover:underline">
      {children}
      <ChevronRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}
