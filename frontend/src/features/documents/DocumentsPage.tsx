import { FilePlus2, Files } from 'lucide-react'
import { useState } from 'react'

import { useDocuments } from '@/api/records'
import { useCurrentUser } from '@/auth/AuthContext'
import { homeCrumb, pageLabel } from '@/components/layout/navigation'
import { useShellActions } from '@/components/layout/shellActions'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { Pagination } from '@/components/ui/pagination'
import { ListSheet, PageHeader } from '@/components/ui/panel'
import { FilterBar, SearchInput } from '@/components/ui/segmented'
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
  const { pickCase } = useShellActions()
  // Judges, counsel and registry staff can upload into cases they work on; administrators cannot.
  const canUpload = user.role !== 'ADMIN'

  return (
    <>
      <PageHeader
        breadcrumbs={[homeCrumb(user.role), { label: title }]}
        title={title}
        description={`Filings across ${user.role === 'ADMIN' || user.role === 'STAFF' ? 'all cases' : 'your cases'}, most recently changed first. Every version is kept with its checksum.`}
        actions={
          canUpload && (
            <Button
              variant="role"
              onClick={() => pickCase({ intent: 'upload', title: 'Upload a document', description: 'Choose the case file to add it to.' })}
            >
              <FilePlus2 />
              Upload document
            </Button>
          )
        }
      />
      <ListSheet
        toolbar={
          <FilterBar>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(0)
              }}
              placeholder="Document title, case number or case title"
              label="Search documents"
              className="min-w-56"
            />
            <MultiSelect
              label="Type"
              options={options(documentTypeLabels)}
              value={types}
              onChange={(v) => {
                setTypes(v)
                setPage(0)
              }}
            />
          </FilterBar>
        }
      >
        {isLoading && <SkeletonRows />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && <EmptyState icon={Files} title={q || types.length ? 'No documents match' : 'No documents yet'} />}
        {data && data.content.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            <DocumentTable documents={data.content} showCase />
            <Pagination page={data} onChange={setPage} noun="documents" />
          </div>
        )}
      </ListSheet>
    </>
  )
}
