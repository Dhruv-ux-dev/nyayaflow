import { Dialog as RadixDialog } from 'radix-ui'
import { CornerDownLeft, FolderOpen, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useCases } from '@/api/cases'
import { CaseStatusBadge } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { Spinner } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'
import { useDebounced } from '@/lib/hooks'

/** Jump to any case by number, title, party, counsel or judge. Opens with Ctrl/⌘+K or "/". */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const term = useDebounced(query.trim(), 200)
  const { data, isFetching } = useCases({ q: term, size: 8, sort: 'updatedAt,desc' }, open && term.length > 0)
  const results = term ? (data?.content ?? []) : []

  const close = (value: boolean) => {
    if (!value) {
      setQuery('')
      setActive(0)
    }
    onOpenChange(value)
  }

  const go = (path: string) => {
    close(false)
    navigate(path)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, results.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && term) {
      event.preventDefault()
      if (active < results.length) go(`/cases/${results[active].id}`)
      else go(`/cases?q=${encodeURIComponent(term)}`)
    }
  }

  return (
    <RadixDialog.Root open={open} onOpenChange={close}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/30 data-[state=open]:animate-overlay-in" />
        <RadixDialog.Content
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-overlay focus:outline-none"
          onKeyDown={onKeyDown}
        >
          <RadixDialog.Title className="sr-only">Find a case</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">Search by case number, title, party, counsel or judge</RadixDialog.Description>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-5 text-muted" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              placeholder="Case number, title, party, counsel or judge"
              className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
              aria-label="Search cases"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="command-results"
            />
            {isFetching && <Spinner className="size-4 text-muted" />}
          </div>
          <div id="command-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
            {!term && (
              <p className="px-3 py-6 text-center text-sm text-muted">
                Try <span className="font-medium text-ink-soft">CS/2</span>, <span className="font-medium text-ink-soft">Sharma</span> or a
                lawyer’s name.
              </p>
            )}
            {results.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(`/cases/${item.id}`)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left', index === active && 'bg-sunken')}
              >
                <FolderOpen className="size-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <CaseNumber value={item.caseNumber} />
                  <CaseTitle title={item.title} className="block truncate text-[15px] text-ink" />
                </span>
                <CaseStatusBadge status={item.status} />
              </button>
            ))}
            {term && !isFetching && results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted">No cases match “{term}”.</p>
            )}
            {term && (
              <button
                type="button"
                role="option"
                aria-selected={active === results.length}
                onMouseEnter={() => setActive(results.length)}
                onClick={() => go(`/cases?q=${encodeURIComponent(term)}`)}
                className={cn(
                  'mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-ink-soft',
                  active === results.length && 'bg-sunken',
                )}
              >
                <span>
                  Show all results for <span className="font-medium text-ink">“{term}”</span>
                </span>
                <CornerDownLeft className="size-4 text-muted" aria-hidden="true" />
              </button>
            )}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
