import { ArrowRight, FolderSearch } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useCases } from '@/api/cases'
import { CaseStatusBadge } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { SearchInput } from '@/components/ui/segmented'
import { useDebounced } from '@/lib/hooks'

import { caseIntentPath, type CasePickerRequest } from './shellActions'

/** Choose the case an action applies to; the case page then opens the matching form. */
export function CasePickerDialog({ request, onClose }: { request: CasePickerRequest; onClose: () => void }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim(), 250)
  const { data, isLoading, error, refetch, isFetching } = useCases({ sort: 'updatedAt,desc', size: 8, ...request.filter, q: q || undefined })

  const pick = (id: number) => {
    onClose()
    navigate(caseIntentPath(id, request.intent))
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={request.title}
      description={request.description ?? 'Choose the case this applies to.'}
      size="lg"
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Case number, title, party or counsel" label="Search cases" className="mb-3" />
      {isLoading && <SkeletonRows rows={4} className="p-0" />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && data.content.length === 0 && (
        <EmptyState compact icon={FolderSearch} title={q ? `No cases match “${q}”` : 'No cases are available for this action'} />
      )}
      {data && data.content.length > 0 && (
        <ul className={`divide-y divide-line overflow-hidden rounded-lg border border-line transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          {data.content.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => pick(item.id)}
                className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-ivory"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <CaseNumber value={item.caseNumber} />
                    <CaseStatusBadge status={item.status} />
                  </span>
                  <CaseTitle title={item.title} className="mt-0.5 block truncate text-[15px] text-ink" />
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && data.totalElements > data.content.length && (
        <p className="mt-2 text-xs text-muted">
          Showing {data.content.length} of {data.totalElements}. Search to narrow the list.
        </p>
      )}
    </Dialog>
  )
}
