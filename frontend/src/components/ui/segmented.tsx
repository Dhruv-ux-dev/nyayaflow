import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Input } from './form'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  count?: number
  /** Highlights the count, for example overdue items. */
  alert?: boolean
}

/**
 * A row of mutually exclusive views ("Today", "Next 7 days", ...). Rendered as a tablist so
 * keyboard and screen-reader users get the same model as the visual pill group.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Array<SegmentOption<T>>
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('scrollbar-none inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-sunken/70 p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-all',
              selected ? 'bg-surface text-ink shadow-raised ring-1 ring-line' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'tabular rounded-[5px] px-1.5 text-[11px] leading-[18px] font-semibold',
                  option.alert && option.count > 0 ? 'bg-danger text-white' : selected ? 'bg-role-soft text-role' : 'bg-line/80 text-ink-soft',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Search box with a leading icon and a clear button. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
}) {
  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label} className="pr-8 pl-9" />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-faint hover:bg-sunken hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/** Toolbar row for list pages: search first, then filters, wrapping on small screens. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
}
