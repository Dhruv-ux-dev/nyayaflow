import { CalendarPlus, FilePlus2, Gavel, ListPlus, MoreHorizontal, NotebookPen, Pencil, RefreshCcw, UserRoundPlus, UsersRound } from 'lucide-react'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { useCase } from '@/api/cases'
import { useCaseDeadlines } from '@/api/deadlines'
import { useCaseHearings } from '@/api/hearings'
import { useCaseDocuments, useCaseOrders, useCaseProceedings } from '@/api/records'
import { useCurrentUser } from '@/auth/AuthContext'
import { CaseStatusBadge, PriorityTag } from '@/components/domain/badges'
import { CaseNumber, CaseTitle } from '@/components/domain/CaseTitle'
import { LifecycleStrip } from '@/components/domain/LifecycleStrip'
import { PersonLine } from '@/components/domain/PersonLine'
import { homeCrumb, pageLabel } from '@/components/layout/navigation'
import { Button } from '@/components/ui/button'
import { ErrorState, Skeleton } from '@/components/ui/feedback'
import { Menu, MenuItem, MenuSeparator } from '@/components/ui/menu'
import { Breadcrumbs } from '@/components/ui/panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiError } from '@/lib/api'
import { formatDate, todayIso } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import { caseTypeLabels } from '@/lib/labels'
import { rememberCase } from '@/lib/recent'
import type { CaseDetail, Hearing } from '@/lib/types'

import { CaseDialogContext, type CaseDialog } from './caseDialogContext'
import { CaseRail } from './CaseRail'
import { AddLawyerDialog, AssignJudgeDialog, ChangeStatusDialog } from './dialogs/caseDialogs'
import { CancelHearingDialog, ConcludeHearingDialog, RescheduleHearingDialog, ScheduleHearingDialog } from './dialogs/hearingDialogs'
import {
  DeadlineDialog,
  EditDocumentDialog,
  IssueOrderDialog,
  NewVersionDialog,
  ProceedingDialog,
  UploadDocumentDialog,
} from './dialogs/recordDialogs'
import { ActivityTab } from './tabs/ActivityTab'
import { DeadlinesTab } from './tabs/DeadlinesTab'
import { DocumentsTab } from './tabs/DocumentsTab'
import { HearingsTab } from './tabs/HearingsTab'
import { OrdersTab } from './tabs/OrdersTab'
import { OverviewTab } from './tabs/OverviewTab'
import { PartiesTab } from './tabs/PartiesTab'
import { TimelineTab } from './tabs/TimelineTab'

const TABS = ['overview', 'parties', 'hearings', 'timeline', 'documents', 'orders', 'deadlines', 'activity'] as const
type Tab = (typeof TABS)[number]

/** Older links used a separate proceedings tab; the order sheet now lives under Hearings. */
function resolveTab(value: string | null): Tab {
  if (value === 'proceedings') return 'hearings'
  return TABS.includes(value as Tab) ? (value as Tab) : 'overview'
}

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
  return <CaseWorkspace courtCase={courtCase} />
}

/** The first hearing that has been held (or is today) and still awaits its outcome. */
function heldScheduled(hearings: Hearing[] | undefined) {
  return hearings
    ?.filter((h) => h.status === 'SCHEDULED' && h.scheduledAt.slice(0, 10) <= todayIso())
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0]
}

function CaseWorkspace({ courtCase }: { courtCase: CaseDetail }) {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [dialog, setDialog] = useState<CaseDialog | null>(null)
  const tab = resolveTab(params.get('tab'))

  const hearings = useCaseHearings(courtCase.id)
  const documents = useCaseDocuments(courtCase.id)
  const proceedings = useCaseProceedings(courtCase.id)
  const orders = useCaseOrders(courtCase.id)
  const deadlines = useCaseDeadlines(courtCase.id)

  const p = courtCase.permissions
  const close = (open: boolean) => !open && setDialog(null)
  const openDeadlines = deadlines.data?.filter((d) => d.status !== 'COMPLETED').length
  const listLabel = pageLabel(user.role, '/cases', 'Cases')

  useEffect(() => {
    rememberCase(user.id, { id: courtCase.id, caseNumber: courtCase.caseNumber, title: courtCase.title })
  }, [user.id, courtCase.id, courtCase.caseNumber, courtCase.title])

  // Actions started elsewhere (dashboards, the case picker) arrive as ?action=… and open here,
  // but only when the server says this user may perform them on this case.
  const action = params.get('action')
  const hearingParam = params.get('hearing')
  const hearingsReady = !hearings.isLoading
  useEffect(() => {
    if (!action) return
    if (action === 'conclude' && !hearingsReady) return
    const clear = () => {
      const next = new URLSearchParams(params)
      next.delete('action')
      next.delete('hearing')
      setParams(next, { replace: true })
    }
    const deny = (message: string) => toast.error(message)
    switch (action) {
      case 'assign':
        if (p.canAssignJudge) setDialog({ kind: 'assign' })
        else deny('You cannot allocate this case to a judge.')
        break
      case 'schedule':
        if (p.canScheduleHearing) setDialog({ kind: 'schedule' })
        else
          deny(courtCase.judge ? 'A hearing cannot be scheduled in this case right now.' : 'Allocate the case to a judge before listing a hearing.')
        break
      case 'order':
        if (p.canIssueOrder) setDialog({ kind: 'order' })
        else deny('Orders can only be issued by the presiding judge while the case is pending.')
        break
      case 'upload':
        if (p.canUploadDocument) setDialog({ kind: 'upload' })
        else deny('You cannot upload documents to this case.')
        break
      case 'deadline':
        if (p.canManageDeadlines) setDialog({ kind: 'deadline' })
        else deny('You cannot add deadlines to this case.')
        break
      case 'conclude': {
        const target = hearings.data?.find((h) => String(h.id) === hearingParam && h.status === 'SCHEDULED') ?? heldScheduled(hearings.data)
        if (!p.canManageHearings) deny('You cannot record hearing outcomes in this case.')
        else if (!target) toast.info('No held hearing in this case is waiting for an outcome.')
        else setDialog({ kind: 'conclude', hearing: target })
        break
      }
    }
    clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, hearingsReady])

  const changeTab = (value: string) => setParams(value === 'overview' ? {} : { tab: value }, { replace: true })

  return (
    <CaseDialogContext.Provider value={setDialog}>
      <Breadcrumbs items={[homeCrumb(user.role), { label: listLabel, to: '/cases' }, { label: courtCase.caseNumber }]} />

      <header className="mb-5 overflow-hidden rounded-xl border border-line bg-surface shadow-raised">
        <div className="h-1 bg-role" aria-hidden="true" />
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="rounded-md border border-line bg-ivory px-2 py-0.5">
                <CaseNumber value={courtCase.caseNumber} className="text-sm text-ink" />
              </span>
              <span className="text-sm text-muted">{caseTypeLabels[courtCase.caseType]}</span>
              <CaseStatusBadge status={courtCase.status} />
              <PriorityTag priority={courtCase.priority} />
            </div>
            <h1 className="mt-2.5 text-[1.65rem] leading-[1.15] font-medium tracking-[-0.01em] text-ink sm:text-[2rem]">
              <CaseTitle title={courtCase.title} />
            </h1>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            {p.canScheduleHearing && (
              <Button variant="role" onClick={() => setDialog({ kind: 'schedule' })}>
                <CalendarPlus />
                Schedule hearing
              </Button>
            )}
            {p.canIssueOrder && (
              <Button variant={p.canScheduleHearing ? 'secondary' : 'role'} onClick={() => setDialog({ kind: 'order' })}>
                <Gavel />
                Issue order
              </Button>
            )}
            {!p.canScheduleHearing && !p.canIssueOrder && p.canUploadDocument && (
              <Button variant="role" onClick={() => setDialog({ kind: 'upload' })}>
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
        </div>
        <dl className="grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <HeaderFact label="Court">
            {courtCase.court.name}
            {courtCase.courtroom && <span className="block text-xs text-muted">{courtCase.courtroom.name}</span>}
          </HeaderFact>
          <HeaderFact label="Assigned judge">
            <PersonLine person={courtCase.judge} fallback="Awaiting allocation" />
          </HeaderFact>
          <HeaderFact label="Filed">
            {formatDate(courtCase.filingDate)}
            <span className="block text-xs text-muted">Registered by {courtCase.createdBy?.fullName ?? '—'}</span>
          </HeaderFact>
          <HeaderFact label={courtCase.closedOn ? 'Closed' : courtCase.disposedOn ? 'Disposed' : 'Counsel'}>
            {courtCase.closedOn
              ? formatDate(courtCase.closedOn)
              : courtCase.disposedOn
                ? formatDate(courtCase.disposedOn)
                : courtCase.lawyers.length
                  ? `${courtCase.lawyers.length} on record`
                  : 'None on record'}
          </HeaderFact>
        </dl>
        <section className="scrollbar-none overflow-x-auto border-t border-line bg-ivory/60 px-5 pt-4 pb-3 sm:px-6" aria-label="Lifecycle">
          <LifecycleStrip status={courtCase.status} history={courtCase.statusHistory} />
        </section>
      </header>

      <Tabs value={tab} onValueChange={changeTab} className="min-w-0">
        <TabsList className="no-print mb-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parties" count={courtCase.parties.length + courtCase.lawyers.length}>
            Parties & counsel
          </TabsTrigger>
          <TabsTrigger value="hearings" count={hearings.data?.length}>
            Hearings
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents" count={documents.data?.length}>
            Documents
          </TabsTrigger>
          <TabsTrigger value="orders" count={orders.data?.length}>
            Orders & judgments
          </TabsTrigger>
          <TabsTrigger value="deadlines" count={openDeadlines}>
            Deadlines
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <TabsContent value="overview" className="animate-fade-up">
              <OverviewTab courtCase={courtCase} hearings={hearings.data} documents={documents.data} orders={orders.data} onTab={changeTab} />
            </TabsContent>
            <TabsContent value="parties" className="animate-fade-up">
              <PartiesTab courtCase={courtCase} />
            </TabsContent>
            <TabsContent value="hearings" className="animate-fade-up">
              <HearingsTab courtCase={courtCase} query={hearings} proceedings={proceedings} />
            </TabsContent>
            <TabsContent value="timeline" className="animate-fade-up">
              <TimelineTab courtCase={courtCase} />
            </TabsContent>
            <TabsContent value="documents" className="animate-fade-up">
              <DocumentsTab courtCase={courtCase} query={documents} />
            </TabsContent>
            <TabsContent value="orders" className="animate-fade-up">
              <OrdersTab courtCase={courtCase} query={orders} />
            </TabsContent>
            <TabsContent value="deadlines" className="animate-fade-up">
              <DeadlinesTab courtCase={courtCase} query={deadlines} />
            </TabsContent>
            <TabsContent value="activity" className="animate-fade-up">
              <ActivityTab courtCase={courtCase} />
            </TabsContent>
          </div>
          <CaseRail courtCase={courtCase} hearings={hearings.data} deadlines={deadlines.data} orders={orders.data} onTab={changeTab} />
        </div>
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

function HeaderFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-surface px-5 py-3 sm:px-6">
      <dt className="eyebrow text-faint">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
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
      p.canAssignJudge && {
        key: 'assign',
        label: courtCase.judge ? 'Reassign judge' : 'Allocate to judge',
        icon: UserRoundPlus,
        action: () => onOpen({ kind: 'assign' }),
      },
      p.canManageLawyers && { key: 'lawyer', label: 'Add counsel', icon: UsersRound, action: () => onOpen({ kind: 'lawyer' }) },
    ],
    [
      p.canUploadDocument &&
        !uploadInHeader && { key: 'upload', label: 'Upload document', icon: FilePlus2, action: () => onOpen({ kind: 'upload' }) },
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
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}
