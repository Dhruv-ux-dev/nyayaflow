import type { UseQueryResult } from '@tanstack/react-query'
import { FilePlus2, Files } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Panel } from '@/components/ui/panel'
import { DocumentTable } from '@/features/documents/DocumentTable'
import type { CaseDetail, CaseDocument } from '@/lib/types'

import { useOpenCaseDialog } from '../caseDialogContext'

export function DocumentsTab({ courtCase, query }: { courtCase: CaseDetail; query: UseQueryResult<CaseDocument[]> }) {
  const open = useOpenCaseDialog()
  if (query.isLoading) return <SkeletonRows />
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  const documents = query.data ?? []
  const upload = courtCase.permissions.canUploadDocument && (
    <Button size="sm" variant="primary" onClick={() => open({ kind: 'upload' })}>
      <FilePlus2 />
      Upload document
    </Button>
  )
  return (
    <Panel title="Case file" description={documents.length ? `${documents.length} document${documents.length === 1 ? '' : 's'}, newest first` : undefined} actions={upload}>
      {documents.length === 0 ? (
        <EmptyState icon={Files} title="The case file is empty" description="Pleadings, evidence and other filings appear here once uploaded." action={upload} />
      ) : (
        <DocumentTable documents={documents} />
      )}
    </Panel>
  )
}
