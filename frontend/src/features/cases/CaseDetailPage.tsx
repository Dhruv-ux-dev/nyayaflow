import {
  ArrowLeft,
  CalendarPlus,
  FilePlus2,
  Gavel,
  ListPlus,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  RefreshCcw,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { useCase } from '@/api/cases'
import { useCaseDeadlines } from '@/api/deadlines'
import { useCaseHearings } from '@/api/hearings'
import { useCaseDocuments, useCaseOrders, useCaseProceedings } from '@/api/records'
import { CaseStatusBadge, PriorityTag } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { LifecycleStrip } from '@/components/domain/LifecycleStrip'
import { Button } from '@/components/ui/button'
import { ErrorState, Skeleton } from '@/components/ui/feedback'
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/lib/api'
import { caseTypeLabels } from '@/lib/labels'
import { useDocumentTitle } from '@/lib/hooks'
import type { CaseDetail } from '@/lib/types'

import { CaseDialogContext, type CaseDialog } from './caseDialogContext'
import { AddLawyerDialog, AssignJudgeDialog, ChangeStatusDialog } from './dialogs/caseDialogs'
import { CancelHearingDialog, ConcludeHearingDialog, RescheduleHearingDialog, ScheduleHearingDialog } from './dialogs/hearingDialogs'
import { DeadlineDialog, EditDocumentDialog, IssueOrderDialog, NewVersionDialog, ProceedingDialog, UploadDocumentDialog } from './dialogs/recordDialogs'
import { ActivityTab } from './tabs/ActivityTab'
import { DeadlinesTab } from './tabs/DeadlinesTab'
import { DocumentsTab } from './tabs/DocumentsTab'
import { HearingsTab } from './tabs/HearingsTab'
import { OrdersTab } from './tabs/OrdersTab'
import { OverviewTab } from './tabs/OverviewTab'
import { ProceedingsTab } from './tabs/ProceedingsTab'
import { TimelineTab } from './tabs/TimelineTab'

const TABS = ['overview', 'hearings', 'proceedings', 'documents', 'orders', 'deadlines', 'timeline', 'activity'] as const
type Tab = (typeof TABS)[number]

export default function CaseDetailPage() {
  const caseId = Number(useParams().caseId)
  const { data: courtCase, isLoading, error, refetch } = useCase(caseId)
  useDocumentTitle(courtCase?.caseNumber ?? 'Case')

  if (isLoading) return <DetailSkeleton />
  if (error) {
    const forbidden = error instanceof ApiError && (error.status === 403 || error.status === 404)
    return (
      <div className="py-10">
        <ErrorState error={error} onRetry={forbidden ? undefined : () => refetch()} />
        <p className="text-center">
          <Link to="/cases" className="text-sm font-medium text-brand hover:underline">
            Back to cases
          </Link>
        </p>
      </div>
    )
  }
  if (!courtCase) return null
  return <CaseDetail courtCase={courtCase} />
}

function CaseDetail({ courtCase }: { courtCase: CaseDetail }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [dialog, setDialog] = useState<CaseDialog | null>(null)
  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'overview'

  const hearings = useCaseHearings(courtCase.id)
  const documents = useCaseDocuments(courtCase.id)
  const proceedings = useCaseProceedings(courtCase.id)
  const orders = useCaseOrders(courtCase.id)
  const deadlines = useCaseDeadlines(courtCase.id)

  const p = courtCase.permissions
  const close = (open: boolean) => !open && setDialog(null)
  const openDeadlines = deadlines.data?.filter((d) => d.status !== 'COMPLETED').length

  return (
    <CaseDialogContext.Provider value={setDialog}>
      <Link to="/cases" className="no-print mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Cases
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-4xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <CaseNumber value={courtCase.caseNumber} className="text-sm" />
            <span className="text-sm text-muted">{caseTypeLabels[courtCase.caseType]}</span>
            <CaseStatusBadge status={courtCase.status} />
            <PriorityTag priority={courtCase.priority} quiet />
          </div>
          <h1 className="mt-1.5 text-[1.9rem] leading-[1.15] font-medium tracking-[-0.01em] text-ink">
            <CaseTitle title={courtCase.title} />
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {courtCase.court.name}
            {courtCase.courtroom ? `, ${courtCase.courtroom.name}` : ''}
            {courtCase.judge ? `. Before ${courtCase.judge.fullName}` : '. Awaiting allocation to a judge'}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          {p.canScheduleHearing && (
            <Button variant="primary" onClick={() => setDialog({ kind: 'schedule' })}>
              <CalendarPlus />
              Schedule hearing
            </Button>
          )}
          {p.canIssueOrder && (
            <Button variant={p.canScheduleHearing ? 'secondary' : 'primary'} onClick={() => setDialog({ kind: 'order' })}>
              <Gavel />
              Issue order
            </Button>
          )}
          {!p.canScheduleHearing && !p.canIssueOrder && p.canUploadDocument && (
            <Button variant="primary" onClick={() => setDialog({ kind: 'upload' })}>
              <FilePlus2 />
              Upload document
            </Button>
          )}
          {p.allowedStatusChanges.length > 0 && (
            <Button onClick={() => setDialog({ kind: 'status' })}>
              <RefreshCcw />
              Change status
            </Button>
          )}
          <CaseMenu courtCase={courtCase} onOpen={setDialog} onEdit={() => navigate(`/cases/${courtCase.id}/edit`)} />
        </div>
      </header>

      <section className="mb-6 overflow-x-auto rounded-lg border border-line bg-surface px-4 pt-5 pb-4" aria-label="Lifecycle">
        <LifecycleStrip status={courtCase.status} history={courtCase.statusHistory} />
      </section>

      <Tabs value={tab} onValueChange={(value) => setParams(value === 'overview' ? {} : { tab: value }, { replace: true })}>
        <TabsList className="no-print mb-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hearings" count={hearings.data?.length}>
            Hearings
          </TabsTrigger>
          <TabsTrigger value="proceedings" count={proceedings.data?.length}>
            Proceedings
          </TabsTrigger>
          <TabsTrigger value="documents" count={documents.data?.length}>
            Documents
          </TabsTrigger>
          <TabsTrigger value="orders" count={orders.data?.length}>
            Orders
          </TabsTrigger>
          <TabsTrigger value="deadlines" count={openDeadlines}>
            Deadlines
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab courtCase={courtCase} hearings={hearings.data} deadlines={deadlines.data} orders={orders.data} />
        </TabsContent>
        <TabsContent value="hearings">
          <HearingsTab courtCase={courtCase} query={hearings} />
        </TabsContent>
        <TabsContent value="proceedings">
          <ProceedingsTab courtCase={courtCase} query={proceedings} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab courtCase={courtCase} query={documents} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab courtCase={courtCase} query={orders} />
        </TabsContent>
        <TabsContent value="deadlines">
          <DeadlinesTab courtCase={courtCase} query={deadlines} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelineTab courtCase={courtCase} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab courtCase={courtCase} />
        </TabsContent>
      </Tabs>

      {dialog?.kind === 'status' && <ChangeStatusDialog courtCase={courtCase} open onOpenChange={close} />}
      {dialog?.kind === 'assign' && <AssignJudgeDialog courtCase={courtCase} open onOpenChange={close} />}
      {dialog?.kind === 'lawyer' && <AddLawyerDialog courtCase={courtCase} open onOpenChange={close} />}
      {dialog?.kind === 'schedule' && <ScheduleHearingDialog courtCase={courtCase} open onOpenChange={close} />}
      {dialog?.kind === 'reschedule' && <RescheduleHearingDialog courtCase={courtCase} hearing={dialog.hearing} open onOpenChange={close} />}
      {dialog?.kind === 'cancel' && <CancelHearingDialog hearing={dialog.hearing} open onOpenChange={close} />}
      {dialog?.kind === 'conclude' && <ConcludeHearingDialog courtCase={courtCase} hearing={dialog.hearing} open onOpenChange={close} />}
      {dialog?.kind === 'proceeding' && (
        <ProceedingDialog courtCase={courtCase} hearings={hearings.data ?? []} proceeding={dialog.proceeding} open onOpenChange={close} />
      )}
      {dialog?.kind === 'order' && <IssueOrderDialog courtCase={courtCase} hearings={hearings.data ?? []} open onOpenChange={close} />}
      {dialog?.kind === 'upload' && <UploadDocumentDialog courtCase={courtCase} open onOpenChange={close} />}
      {dialog?.kind === 'version' && <NewVersionDialog document={dialog.document} open onOpenChange={close} />}
      {dialog?.kind === 'editDocument' && <EditDocumentDialog document={dialog.document} open onOpenChange={close} />}
      {dialog?.kind === 'deadline' && <DeadlineDialog courtCase={courtCase} deadline={dialog.deadline} open onOpenChange={close} />}
    </CaseDialogContext.Provider>
  )
}

type MenuAction = { key: string; label: string; icon: typeof Pencil; action: () => void }

function CaseMenu({ courtCase, onOpen, onEdit }: { courtCase: CaseDetail; onOpen: (dialog: CaseDialog) => void; onEdit: () => void }) {
  const p = courtCase.permissions
  // Issuing orders, and uploading when it is the user's main action, already have header buttons.
  const uploadInHeader = !p.canScheduleHearing && !p.canIssueOrder && p.canUploadDocument
  const groups = [
    [
      p.canEdit && { key: 'edit', label: 'Edit case details', icon: Pencil, action: onEdit },
      p.canAssignJudge && { key: 'assign', label: courtCase.judge ? 'Reassign judge' : 'Allocate to judge', icon: UserRoundPlus, action: () => onOpen({ kind: 'assign' }) },
      p.canManageLawyers && { key: 'lawyer', label: 'Add counsel', icon: UsersRound, action: () => onOpen({ kind: 'lawyer' }) },
    ],
    [
      p.canUploadDocument && !uploadInHeader && { key: 'upload', label: 'Upload document', icon: FilePlus2, action: () => onOpen({ kind: 'upload' }) },
      p.canRecordProceeding && { key: 'proceeding', label: 'Record proceedings', icon: NotebookPen, action: () => onOpen({ kind: 'proceeding' }) },
      p.canManageDeadlines && { key: 'deadline', label: 'Add deadline', icon: ListPlus, action: () => onOpen({ kind: 'deadline' }) },
    ],
  ]
    .map((group) => group.filter(Boolean) as MenuAction[])
    .filter((group) => group.length > 0)

  if (groups.length === 0) return null
  return (
    <Menu
      trigger={
        <Button size="icon" aria-label="More actions">
          <MoreHorizontal />
        </Button>
      }
    >
      {groups.map((group, index) => (
        <Fragment key={group[0].key}>
          {index > 0 && <MenuSeparator />}
          {group.map((item) => (
            <MenuItem key={item.key} onSelect={item.action}>
              <item.icon />
              {item.label}
            </MenuItem>
          ))}
        </Fragment>
      ))}
    </Menu>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading case">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
