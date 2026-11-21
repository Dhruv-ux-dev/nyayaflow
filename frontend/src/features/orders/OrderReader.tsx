import { Printer } from 'lucide-react'
import { Link } from 'react-router'

import { CaseTitle } from '@/components/domain/CaseTitle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { formatDate } from '@/lib/format'
import { hearingTypeLabels, orderTypeLabels } from '@/lib/labels'
import type { CourtOrder } from '@/lib/types'

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Opens a print-ready copy of the order in a new window. */
function printOrder(order: CourtOrder) {
  const win = window.open('', '_blank', 'width=820,height=1000')
  if (!win) return
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(order.courtCase.caseNumber)}: ${escape(order.title)}</title>
<style>body{font-family:Georgia,'Times New Roman',serif;color:#14213d;max-width:680px;margin:48px auto;line-height:1.6;font-size:15px}
h1{font-size:20px;margin:24px 0 4px}p.meta{font-family:system-ui,sans-serif;font-size:12px;color:#5f6a82;margin:0}
.content{white-space:pre-line;margin-top:24px}.sign{margin-top:56px;text-align:right}hr{border:0;border-top:1px solid #cdd2db;margin:16px 0}</style></head><body>
<p class="meta">${escape(order.courtCase.caseNumber)}</p><p>${escape(order.courtCase.title)}</p><hr>
<p class="meta">${escape(orderTypeLabels[order.orderType])} dated ${escape(formatDate(order.orderDate))}</p>
<h1>${escape(order.title)}</h1><div class="content">${escape(order.content)}</div>
<div class="sign">(${escape(order.issuedBy.fullName)})<br>${escape(order.issuedBy.designation ?? 'Judge')}</div>
</body></html>`)
  win.document.close()
  win.focus()
  win.print()
}

export function OrderReader({ order, onClose, showCaseLink = false }: { order: CourtOrder; onClose: () => void; showCaseLink?: boolean }) {
  const final = order.orderType === 'FINAL_ORDER' || order.orderType === 'JUDGMENT'
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={order.title}
      description={`${orderTypeLabels[order.orderType]} dated ${formatDate(order.orderDate)}`}
      footer={
        <>
          {showCaseLink && (
            <Button asChild variant="ghost">
              <Link to={`/cases/${order.courtCase.id}?tab=orders`} onClick={onClose}>
                Open case
              </Link>
            </Button>
          )}
          <Button onClick={() => printOrder(order)}>
            <Printer />
            Print
          </Button>
        </>
      }
    >
      <article>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-semibold text-ink-soft">{order.courtCase.caseNumber}</span>
          {final && <Badge tone="disposed">Decides the case</Badge>}
        </div>
        <CaseTitle title={order.courtCase.title} className="mt-0.5 block text-[17px] text-ink" />
        {order.hearing && (
          <p className="mt-1 text-xs text-muted">
            Passed at the {hearingTypeLabels[order.hearing.hearingType].toLowerCase()} on {formatDate(order.hearing.scheduledAt)}
          </p>
        )}
        <div className="mt-5 border-t border-line pt-5 font-serif text-[17px] leading-[1.75] whitespace-pre-line text-ink">{order.content}</div>
        <p className="mt-8 text-right font-serif text-[15px] text-ink-soft">
          ({order.issuedBy.fullName})
          <br />
          <span className="text-sm">{order.issuedBy.designation ?? 'Judge'}</span>
        </p>
        {order.remarks && <p className="mt-6 rounded-md bg-paper px-3 py-2 text-sm text-ink-soft">Remarks: {order.remarks}</p>}
      </article>
    </Dialog>
  )
}
