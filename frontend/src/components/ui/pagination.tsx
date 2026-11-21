import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { Page } from '@/lib/types'

import { Button } from './button'

export function Pagination({ page, onChange, noun = 'results' }: { page: Page<unknown>; onChange: (page: number) => void; noun?: string }) {
  if (page.totalElements === 0) return null
  const from = page.page * page.size + 1
  const to = Math.min((page.page + 1) * page.size, page.totalElements)
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13px] text-muted">
      <p className="tabular">
        {from}–{to} of {page.totalElements} {noun}
      </p>
      {page.totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="Previous page" disabled={page.page === 0} onClick={() => onChange(page.page - 1)}>
            <ChevronLeft />
          </Button>
          <span className="tabular px-1">
            Page {page.page + 1} of {page.totalPages}
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
    </div>
  )
}
