import { ChevronDown, Download, Eye, FilePen, FileText, History, MoreHorizontal, Trash2, Upload } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { useDeleteDocument } from '@/api/records'
import { CaseNumber } from '@/components/domain/CaseTitle'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/menu'
import { Table, TD, TH, THead, TR } from '@/components/ui/table'
import { downloadFile, errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate, formatFileSize, timeAgo } from '@/lib/format'
import { documentTypeLabels } from '@/lib/labels'
import type { CaseDocument } from '@/lib/types'
import { EditDocumentDialog, NewVersionDialog } from '@/features/cases/dialogs/recordDialogs'

const viewable = (contentType: string) => contentType === 'application/pdf' || contentType.startsWith('image/')

async function fetchFile(document: CaseDocument, version?: number, open = false) {
  try {
    await downloadFile(`/documents/${document.id}/download`, { version, inline: open || undefined }, open)
  } catch (error) {
    toast.error(errorMessage(error))
  }
}

/** Documents with their versions. Used on the case page and on the cross-case documents page. */
export function DocumentTable({ documents, showCase = false }: { documents: CaseDocument[]; showCase?: boolean }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [dialog, setDialog] = useState<{ kind: 'version' | 'edit' | 'delete'; document: CaseDocument } | null>(null)
  const remove = useDeleteDocument()
  const close = (open: boolean) => !open && setDialog(null)

  return (
    <>
      <Table>
        <THead>
          <tr>
            <TH>Document</TH>
            {showCase && <TH>Case</TH>}
            <TH>Latest version</TH>
            <TH className="text-right">
              <span className="sr-only">Actions</span>
            </TH>
          </tr>
        </THead>
        <tbody>
          {documents.map((document) => {
            const latest = document.versions[0]
            const open = expanded === document.id
            return (
              <Fragment key={document.id}>
                <TR className={cn(open && 'border-b-0')}>
                  <TD className="min-w-[16rem]">
                    <div className="flex gap-3">
                      <FileText className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{document.title}</p>
                        <p className="text-xs text-muted">
                          {documentTypeLabels[document.documentType]}, filed by {document.uploadedBy.fullName} on {formatDate(document.createdAt)}
                        </p>
                        {document.description && <p className="mt-1 max-w-[60ch] text-[13px] text-ink-soft">{document.description}</p>}
                      </div>
                    </div>
                  </TD>
                  {showCase && (
                    <TD>
                      <Link to={`/cases/${document.courtCase.id}?tab=documents`} className="hover:underline">
                        <CaseNumber value={document.courtCase.caseNumber} />
                      </Link>
                      <p className="max-w-[240px] truncate text-xs text-muted">{document.courtCase.title}</p>
                    </TD>
                  )}
                  <TD className="whitespace-nowrap">
                    <p className="text-sm text-ink">
                      Version {document.currentVersion}
                      <span className="ml-1.5 text-xs text-muted">{formatFileSize(latest.sizeBytes)}</span>
                    </p>
                    <p className="text-xs text-muted">{timeAgo(latest.uploadedAt)}</p>
                  </TD>
                  <TD className="text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      {viewable(latest.contentType) && (
                        <Button size="icon-sm" variant="ghost" aria-label={`View ${document.title}`} title="View" onClick={() => fetchFile(document, undefined, true)}>
                          <Eye />
                        </Button>
                      )}
                      <Button size="icon-sm" variant="ghost" aria-label={`Download ${document.title}`} title="Download" onClick={() => fetchFile(document)}>
                        <Download />
                      </Button>
                      <Menu
                        trigger={
                          <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${document.title}`}>
                            <MoreHorizontal />
                          </Button>
                        }
                      >
                        <MenuItem onSelect={() => setExpanded(open ? null : document.id)}>
                          <History />
                          {open ? 'Hide versions' : `Version history (${document.versions.length})`}
                        </MenuItem>
                        {document.canModify && (
                          <>
                            <MenuItem onSelect={() => setDialog({ kind: 'version', document })}>
                              <Upload />
                              Upload new version
                            </MenuItem>
                            <MenuItem onSelect={() => setDialog({ kind: 'edit', document })}>
                              <FilePen />
                              Edit details
                            </MenuItem>
                            <MenuSeparator />
                            <MenuItem tone="danger" onSelect={() => setDialog({ kind: 'delete', document })}>
                              <Trash2 />
                              Remove from case file
                            </MenuItem>
                          </>
                        )}
                      </Menu>
                    </div>
                  </TD>
                </TR>
                {open && (
                  <tr className="border-b border-line">
                    <td colSpan={showCase ? 4 : 3} className="bg-paper/60 px-4 pb-3">
                      <ol className="ml-8 space-y-1.5 border-l border-line pl-4">
                        {document.versions.map((version) => (
                          <li key={version.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                            <span className="font-medium text-ink">Version {version.versionNumber}</span>
                            <span className="text-ink-soft">{version.originalFilename}</span>
                            <span className="text-muted">
                              {formatFileSize(version.sizeBytes)}, {version.uploadedBy.fullName}, {formatDate(version.uploadedAt)}
                            </span>
                            {version.changeNote && <span className="text-muted italic">“{version.changeNote}”</span>}
                            <span className="text-faint" title={`SHA-256 ${version.sha256}`}>
                              {version.sha256.slice(0, 10)}
                            </span>
                            <button type="button" onClick={() => fetchFile(document, version.versionNumber)} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                              <ChevronDown className="size-3.5 -rotate-90" aria-hidden="true" />
                              Download
                            </button>
                          </li>
                        ))}
                      </ol>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </Table>

      {dialog?.kind === 'version' && <NewVersionDialog document={dialog.document} open onOpenChange={close} />}
      {dialog?.kind === 'edit' && <EditDocumentDialog document={dialog.document} open onOpenChange={close} />}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          open
          onOpenChange={close}
          title="Remove document"
          description={
            <>
              <span className="font-medium text-ink">{dialog.document.title}</span> will be removed from the case file. The removal is
              recorded in the case activity and the stored file is retained.
            </>
          }
          confirmLabel="Remove document"
          tone="danger"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(dialog.document.id, { onSuccess: () => setDialog(null) })}
        />
      )}
    </>
  )
}
