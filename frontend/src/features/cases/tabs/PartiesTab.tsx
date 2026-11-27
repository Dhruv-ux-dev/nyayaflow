import { Building2, Landmark, Mail, Phone, UserRound, UserRoundPlus, UserRoundX } from 'lucide-react'
import { useState } from 'react'

import { useRemoveLawyer } from '@/api/cases'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/feedback'
import { Tooltip } from '@/components/ui/menu'
import { Panel } from '@/components/ui/panel'
import { formatDate } from '@/lib/format'
import { partyTypeLabels, sideLabels } from '@/lib/labels'
import type { CaseDetail, CaseLawyer, PartySide, PartyType } from '@/lib/types'

import { useOpenCaseDialog } from '../caseDialogContext'

const partyIcon: Record<PartyType, typeof UserRound> = { INDIVIDUAL: UserRound, ORGANIZATION: Building2, GOVERNMENT: Landmark }

/** Each side of the case with its parties and the counsel appearing for it. */
export function PartiesTab({ courtCase }: { courtCase: CaseDetail }) {
  const open = useOpenCaseDialog()
  const remove = useRemoveLawyer(courtCase.id)
  const [removing, setRemoving] = useState<CaseLawyer | null>(null)
  const labels = sideLabels[courtCase.caseType]
  const canManage = courtCase.permissions.canManageLawyers

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {(['PETITIONER', 'RESPONDENT'] as PartySide[]).map((side) => {
          const parties = courtCase.parties.filter((party) => party.side === side)
          const counsel = courtCase.lawyers.filter((lawyer) => lawyer.side === side)
          return (
            <Panel
              key={side}
              title={labels[side]}
              description={`${parties.length} part${parties.length === 1 ? 'y' : 'ies'} · ${counsel.length} counsel`}
              headerClassName={side === 'PETITIONER' ? 'border-t-2 border-t-brand rounded-t-xl' : 'border-t-2 border-t-seal rounded-t-xl'}
            >
              <ul className="divide-y divide-line">
                {parties.map((party) => {
                  const Icon = partyIcon[party.partyType]
                  return (
                    <li key={party.id} className="flex gap-3 px-5 py-3.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sunken text-ink-soft">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-serif text-[16.5px] leading-snug text-ink">{party.name}</p>
                        <p className="text-xs text-muted">
                          {partyTypeLabels[party.partyType]}
                          {party.address ? ` · ${party.address}` : ''}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="border-t border-line bg-ivory/60 px-5 py-3">
                <p className="eyebrow mb-2 text-faint">Counsel for the {labels[side].toLowerCase()}</p>
                {counsel.length === 0 ? (
                  <p className="text-[13px] text-muted">No counsel has entered appearance.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {counsel.map((lawyer) => (
                      <li key={lawyer.lawyerId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Avatar name={lawyer.fullName} role="LAWYER" size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                            {lawyer.fullName}
                            {lawyer.leadCounsel && <Badge tone="seal">Lead counsel</Badge>}
                          </p>
                          <p className="text-xs text-muted">
                            {lawyer.barRegistrationNumber ? `Enrolment ${lawyer.barRegistrationNumber} · ` : ''}
                            appeared {formatDate(lawyer.addedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-muted">
                          <Tooltip content={lawyer.email}>
                            <a
                              href={`mailto:${lawyer.email}`}
                              className="grid size-8 place-items-center rounded-md hover:bg-sunken hover:text-ink"
                              aria-label={`Email ${lawyer.fullName}`}
                            >
                              <Mail className="size-4" />
                            </a>
                          </Tooltip>
                          {lawyer.phone && (
                            <Tooltip content={lawyer.phone}>
                              <a
                                href={`tel:${lawyer.phone.replace(/\s/g, '')}`}
                                className="grid size-8 place-items-center rounded-md hover:bg-sunken hover:text-ink"
                                aria-label={`Call ${lawyer.fullName}`}
                              >
                                <Phone className="size-4" />
                              </a>
                            </Tooltip>
                          )}
                          {canManage && (
                            <Tooltip content="Remove from case">
                              <button
                                type="button"
                                onClick={() => setRemoving(lawyer)}
                                className="grid size-8 place-items-center rounded-md hover:bg-danger-soft hover:text-danger"
                                aria-label={`Remove ${lawyer.fullName}`}
                              >
                                <UserRoundX className="size-4" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>
          )
        })}
      </div>

      {canManage && (
        <div className="flex justify-end">
          <Button variant="role" onClick={() => open({ kind: 'lawyer' })}>
            <UserRoundPlus />
            Add counsel
          </Button>
        </div>
      )}
      {courtCase.parties.length === 0 && <EmptyState icon={UserRound} title="No parties recorded" />}

      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(value) => !value && setRemoving(null)}
          title="Remove counsel"
          description={
            <>
              {removing.fullName} will lose access to <span className="font-medium text-ink">{courtCase.caseNumber}</span> and will be notified.
            </>
          }
          confirmLabel="Remove counsel"
          tone="danger"
          loading={remove.isPending}
          onConfirm={() => remove.mutate(removing.lawyerId, { onSuccess: () => setRemoving(null) })}
        />
      )}
    </div>
  )
}
