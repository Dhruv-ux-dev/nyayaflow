import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/cn'

import { Popover } from './menu'

/** Filter control: a button showing the selection, opening a checklist. */
export function MultiSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  presets,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T[]
  onChange: (value: T[]) => void
  presets?: Array<{ label: string; values: T[] }>
}) {
  const summary =
    value.length === 0 ? label : value.length === 1 ? options.find((o) => o.value === value[0])?.label : `${label}: ${value.length}`
  const toggle = (item: T) => onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item])
  return (
    <Popover
      align="start"
      className="w-64 p-1.5"
      trigger={
        <button
          type="button"
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md border bg-surface px-3 text-sm whitespace-nowrap transition-colors hover:border-faint',
            value.length ? 'border-brand/50 text-ink' : 'border-line-strong text-ink-soft',
          )}
        >
          {summary}
          <ChevronDown className="size-4 text-muted" aria-hidden="true" />
        </button>
      }
    >
      {presets && (
        <div className="flex flex-wrap gap-1.5 border-b border-line px-1.5 pt-1 pb-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.values)}
              className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft hover:bg-sunken"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      <ul role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-72 overflow-y-auto py-1">
        {options.map((option) => {
          const selected = value.includes(option.value)
          return (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => toggle(option.value)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-ink hover:bg-sunken"
              >
                <span
                  className={cn('grid size-4 place-items-center rounded border', selected ? 'border-brand bg-brand text-white' : 'border-line-strong')}
                  aria-hidden="true"
                >
                  {selected && <Check className="size-3" strokeWidth={3} />}
                </span>
                {option.label}
              </button>
            </li>
          )
        })}
      </ul>
      {value.length > 0 && (
        <div className="border-t border-line px-1.5 pt-1.5">
          <button type="button" onClick={() => onChange([])} className="w-full rounded-md px-2 py-1 text-left text-xs font-medium text-brand hover:bg-sunken">
            Clear selection
          </button>
        </div>
      )}
    </Popover>
  )
}
