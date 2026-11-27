import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/cn'
import type { Page } from '@/lib/types'

import { Button } from './button'

/** Page numbers to show: first, last, and a window around the current page, with gaps as null. */
function pageWindow(current: number, total: number): Array<number | null> {
  const pages = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total))
  const sorted = [...pages].sort((a, b) => a - b)
  const result: Array<number | null> = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push(null)
    result.push(page)
  })
  return result
}

export function Pagination({ page, onChange, noun = 'results' }: { page: Page<unknown>; onChange: (page: number) => void; noun?: string }) {
  if (page.totalElements === 0) return null
  const from = page.page * page.size + 1
  const to = Math.min((page.page + 1) * page.size, page.totalElements)
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ivory px-4 py-2.5 text-[13px] text-muted"
    >
      <p className="tabular">
        <span className="font-medium text-ink-soft">
          {from}–{to}
        </span>{' '}
        of {page.totalElements.toLocaleString('en-IN')} {noun}
      </p>
      {page.totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="Previous page" disabled={page.page === 0} onClick={() => onChange(page.page - 1)}>
            <ChevronLeft />
          </Button>
          {pageWindow(page.page, page.totalPages).map((n, i) =>
            n === null ? (
              <span key={`gap-${i}`} className="px-1 text-faint" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                aria-current={n === page.page ? 'page' : undefined}
                aria-label={`Page ${n + 1}`}
                className={cn(
                  'tabular hidden h-8 min-w-8 rounded-md px-2 text-[13px] font-medium transition-colors sm:inline-block',
                  n === page.page ? 'bg-ink text-white' : 'text-ink-soft hover:bg-sunken',
                )}
              >
                {n + 1}
              </button>
            ),
          )}
          <span className="tabular px-1 sm:hidden">
            {page.page + 1} / {page.totalPages}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Next page"
            disabled={page.page + 1 >= page.totalPages}
            onClick={() => onChange(page.page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </nav>
  )
}
