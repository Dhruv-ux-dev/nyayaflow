import { ArrowRight, FileText, Scale } from 'lucide-react'

import { useCaseTimeline } from '@/api/cases'
import { HearingStatusBadge } from '@/components/domain/badges'
import { Panel } from '@/components/ui/panel'
import { Skeleton } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'
import { formatDate, formatTime, relativeDay, timeAgo } from '@/lib/format'
import { caseStatusLabels, documentTypeLabels, hearingTypeLabels, partyTypeLabels, sideLabels } from '@/lib/labels'
import type { CaseDetail, CaseDocument, CaseStatus, CourtOrder, Hearing, PartySide } from '@/lib/types'

function TabButton({ tab, onTab, children }: { tab: string; onTab: (tab: string) => void; children: string }) {
  return (
    <button type="button" onClick={() => onTab(tab)} className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
      {children}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </button>
  )
}

/** The case in one view: what it is about, who is on each side, where it stands and what happened lately. */
export function OverviewTab({
  courtCase,
  hearings,
  documents,
  orders,
  onTab,
}: {
  courtCase: CaseDetail
  hearings?: Hearing[]
  documents?: CaseDocument[]
  orders?: CourtOrder[]
  onTab: (tab: string) => void
}) {
  const labels = sideLabels[courtCase.caseType]
  const held = (hearings ?? []).filter((h) => h.status === 'COMPLETED' || h.status === 'ADJOURNED')
  const lastHeld = held[held.length - 1]

  return (
    <div className="space-y-6">
      <Panel title="The matter" icon={<Scale />}>
        <div className="px-5 py-4">
          {courtCase.description ? (
            <p className="max-w-[72ch] font-serif text-[16.5px] leading-relaxed text-ink-soft">{courtCase.description}</p>
          ) : (
            <p className="text-sm text-muted">No summary of the matter was recorded at registration.</p>
          )}
        </div>
        <div className="grid border-t border-line sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {(['PETITIONER', 'RESPONDENT'] as PartySide[]).map((side, index) => (
            <div key={side} className={cn('px-5 py-4', index === 1 && 'sm:order-3')}>
              <p className="eyebrow text-faint">{labels[side]}</p>
              <ul className="mt-1.5 space-y-1.5">
                {courtCase.parties
                  .filter((party) => party.side === side)
                  .map((party) => (
                    <li key={party.id}>
                      <p className="font-serif text-[16px] leading-snug text-ink">{party.name}</p>
                      <p className="text-xs text-muted">{partyTypeLabels[party.partyType]}</p>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          <div className="hidden items-center justify-center border-x border-line px-4 sm:order-2 sm:flex" aria-hidden="true">
            <span className="font-serif text-lg text-faint italic">v.</span>
          </div>
        </div>
        <div className="flex justify-end border-t border-line px-5 py-2.5">
          <TabButton tab="parties" onTab={onTab}>
            Parties and counsel
          </TabButton>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Hearing record"
          actions={
            <TabButton tab="hearings" onTab={onTab}>
              All hearings
            </TabButton>
          }
        >
          <dl className="grid grid-cols-3 gap-px border-b border-line bg-line text-center">
            {[
              { label: 'Listed', value: hearings?.length },
              { label: 'Held', value: held.length },
              { label: 'Adjourned', value: hearings?.filter((h) => h.status === 'ADJOURNED').length },
            ].map((item) => (
              <div key={item.label} className="bg-surface px-3 py-3">
                <dt className="text-xs text-muted">{item.label}</dt>
                <dd className="tabular text-xl font-semibold text-ink">{item.value ?? '–'}</dd>
              </div>
            ))}
          </dl>
          {lastHeld ? (
            <div className="px-5 py-4">
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                Last heard {formatDate(lastHeld.scheduledAt)} at {formatTime(lastHeld.scheduledAt)}
                <HearingStatusBadge status={lastHeld.status} />
              </p>
              <p className="mt-1 text-sm font-medium text-ink">{hearingTypeLabels[lastHeld.hearingType]}</p>
              {lastHeld.outcome && <p className="mt-1 text-[13px] text-ink-soft">{lastHeld.outcome}</p>}
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-muted">No hearing has been held yet.</p>
          )}
        </Panel>

        <Panel
          title="Recent documents"
          actions={
            <TabButton tab="documents" onTab={onTab}>
              Case file
            </TabButton>
          }
        >
          {!documents ? (
            <Skeleton className="m-5 h-24" />
          ) : documents.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">The case file is empty.</p>
          ) : (
            <ul className="divide-y divide-line">
              {documents.slice(0, 4).map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 px-5 py-2.5">
                  <FileText className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{doc.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {documentTypeLabels[doc.documentType]} · {doc.uploadedBy.fullName}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-faint">{timeAgo(doc.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <RecentDevelopments courtCase={courtCase} onTab={onTab} orders={orders?.length ?? 0} />
    </div>
  )
}

/** The last few events from the case timeline, newest first. */
function RecentDevelopments({ courtCase, onTab, orders }: { courtCase: CaseDetail; onTab: (tab: string) => void; orders: number }) {
  const { data, isLoading } = useCaseTimeline(courtCase.id)
  const now = new Date()
  const past = (data ?? [])
    .filter((entry) => new Date(entry.occurredAt) <= now)
    .slice(-6)
    .reverse()
  return (
    <Panel
      title="Recent developments"
      description={`${courtCase.statusHistory.length} status change${courtCase.statusHistory.length === 1 ? '' : 's'} · ${orders} order${orders === 1 ? '' : 's'} on record`}
      actions={
        <TabButton tab="timeline" onTab={onTab}>
          Full timeline
        </TabButton>
      }
    >
      {isLoading ? (
        <Skeleton className="m-5 h-32" />
      ) : past.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">Nothing has happened in this case yet.</p>
      ) : (
        <ol className="px-5 py-4">
          {past.map((entry, index) => (
            <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < past.length - 1 && <span className="absolute top-3 bottom-0 left-[5px] w-px bg-line" aria-hidden="true" />}
              <span
                className={cn(
                  'relative mt-1.5 size-[11px] shrink-0 rounded-full border-2',
                  entry.milestone ? 'border-role bg-role' : 'border-line-strong bg-surface',
                )}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm text-ink">{entry.kind === 'STATUS' ? `Status: ${caseStatusLabels[entry.tag as CaseStatus]}` : entry.title}</p>
                <p className="text-xs text-muted">
                  {formatDate(entry.occurredAt)} · {relativeDay(entry.occurredAt)}
                  {entry.actor ? ` · ${entry.actor}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
