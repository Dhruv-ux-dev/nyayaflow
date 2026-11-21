import { Files, Search } from 'lucide-react'
import { useState } from 'react'

import { useDocuments } from '@/api/records'
import { useCurrentUser } from '@/auth/AuthContext'
import { pageLabel } from '@/components/layout/navigation'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Input } from '@/components/ui/form'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/panel'
import { cn } from '@/lib/cn'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import { documentTypeLabels, options } from '@/lib/labels'
import type { DocumentType } from '@/lib/types'

import { DocumentTable } from './DocumentTable'

export default function DocumentsPage() {
  const user = useCurrentUser()
  const title = pageLabel(user.role, '/documents', 'Documents')
  useDocumentTitle(title)
  const [search, setSearch] = useState('')
  const [types, setTypes] = useState<DocumentType[]>([])
  const [page, setPage] = useState(0)
  const q = useDebounced(search, 300)
  const { data, isLoading, error, refetch, isFetching } = useDocuments({ q: q || undefined, type: types, page, size: 20 })

  return (
    <>
      <PageHeader
        title={title}
        description={`Filings across ${user.role === 'ADMIN' || user.role === 'STAFF' ? 'all cases' : 'your cases'}, most recently changed first. Upload from a case page.`}
      />
      <div className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 sm:p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Document title, case number or case title"
              aria-label="Search documents"
              className="pl-9"
            />
          </div>
          <MultiSelect label="Type" options={options(documentTypeLabels)} value={types} onChange={(v) => { setTypes(v); setPage(0) }} />
        </div>
        {isLoading && <SkeletonRows />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && <EmptyState icon={Files} title={q || types.length ? 'No documents match' : 'No documents yet'} />}
        {data && data.content.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            <DocumentTable documents={data.content} showCase />
            <Pagination page={data} onChange={setPage} noun="documents" />
          </div>
        )}
      </div>
    </>
  )
}
