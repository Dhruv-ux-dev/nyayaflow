import { isToday, isYesterday, parseISO } from 'date-fns'
import {
  Bell,
  CalendarClock,
  CalendarX2,
  CheckCheck,
  ClipboardCheck,
  FileText,
  Flag,
  Gavel,
  ListChecks,
  NotebookPen,
  ScrollText,
  UserCog,
  UserRoundCheck,
  UserRoundMinus,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '@/api/notifications'
import { useCurrentUser } from '@/auth/AuthContext'
import { homeCrumb } from '@/components/layout/navigation'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Pagination } from '@/components/ui/pagination'
import { ListSheet, PageHeader } from '@/components/ui/panel'
import { SegmentedTabs } from '@/components/ui/segmented'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime, timeAgo } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import type { NotificationItem, NotificationType } from '@/lib/types'

const typeIcon: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  CASE_ASSIGNED: { icon: UserRoundCheck, tone: 'bg-review-soft text-review' },
  CASE_UNASSIGNED: { icon: UserRoundMinus, tone: 'bg-sunken text-ink-soft' },
  LAWYER_ADDED: { icon: UserRoundPlus, tone: 'bg-brand-soft text-brand' },
  LAWYER_REMOVED: { icon: UserRoundMinus, tone: 'bg-sunken text-ink-soft' },
  CASE_STATUS_CHANGED: { icon: Flag, tone: 'bg-teal-soft text-teal' },
  HEARING_SCHEDULED: { icon: CalendarClock, tone: 'bg-brand-soft text-brand' },
  HEARING_RESCHEDULED: { icon: CalendarClock, tone: 'bg-warning-soft text-warning' },
  HEARING_CANCELLED: { icon: CalendarX2, tone: 'bg-danger-soft text-danger' },
  HEARING_CONCLUDED: { icon: Gavel, tone: 'bg-success-soft text-success' },
  DOCUMENT_UPLOADED: { icon: FileText, tone: 'bg-sunken text-ink-soft' },
  PROCEEDING_RECORDED: { icon: NotebookPen, tone: 'bg-sunken text-ink-soft' },
  ORDER_ISSUED: { icon: ScrollText, tone: 'bg-seal-soft text-seal' },
  DEADLINE_ASSIGNED: { icon: ListChecks, tone: 'bg-brand-soft text-brand' },
  DEADLINE_APPROACHING: { icon: ClipboardCheck, tone: 'bg-warning-soft text-warning' },
  ACCOUNT_UPDATED: { icon: UserCog, tone: 'bg-sunken text-ink-soft' },
}

function dayGroup(value: string) {
  const date = parseISO(value)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return formatDate(date)
}

export default function NotificationsPage() {
  useDocumentTitle('Notifications')
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(0)
  const { data, isLoading, error, refetch, isFetching } = useNotifications({ unreadOnly, page, size: 20 })
  const { data: unread = 0 } = useUnreadCount()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const open = (item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id)
    if (item.caseId) navigate(`/cases/${item.caseId}`)
  }

  const groups = new Map<string, NotificationItem[]>()
  for (const item of data?.content ?? []) {
    const key = dayGroup(item.createdAt)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        breadcrumbs={[homeCrumb(user.role), { label: 'Notifications' }]}
        title="Notifications"
        description={unread ? `${unread} unread. Select one to open its case.` : 'You are all caught up.'}
        actions={
          <Button onClick={() => markAllRead.mutate()} disabled={!unread} loading={markAllRead.isPending}>
            <CheckCheck />
            Mark all as read
          </Button>
        }
      />
      <SegmentedTabs
        label="Filter"
        className="mb-4"
        value={unreadOnly ? 'unread' : 'all'}
        onChange={(value) => {
          setUnreadOnly(value === 'unread')
          setPage(0)
        }}
        options={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread', count: unread },
        ]}
      />
      <ListSheet>
        {isLoading && <SkeletonRows />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && (
          <EmptyState
            icon={Bell}
            title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
            description="You will be notified about hearings, filings, orders and deadlines in your cases."
          />
        )}
        {data && data.content.length > 0 && (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            {[...groups.entries()].map(([group, items]) => (
              <section key={group} aria-label={group}>
                <h2 className="eyebrow border-b border-line bg-ivory px-4 py-2 text-faint sm:px-5">{group}</h2>
                <ul className="divide-y divide-line">
                  {items.map((item) => {
                    const meta = typeIcon[item.type] ?? { icon: Bell, tone: 'bg-sunken text-ink-soft' }
                    return (
                      <li key={item.id} className={cn('relative flex gap-3 px-4 py-3.5 sm:px-5', !item.read && 'bg-brand-soft/25')}>
                        {!item.read && <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-seal" aria-hidden="true" />}
                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', meta.tone)}>
                          <meta.icon className="size-4" aria-hidden="true" />
                        </span>
                        <button type="button" onClick={() => open(item)} className="min-w-0 flex-1 text-left">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className={cn('text-sm text-ink', !item.read && 'font-semibold')}>{item.title}</span>
                            {!item.read && <span className="sr-only">Unread</span>}
                          </span>
                          <span className="mt-0.5 block text-sm text-ink-soft">{item.message}</span>
                          <span className="mt-1 block text-xs text-muted" title={formatDateTime(item.createdAt)}>
                            {timeAgo(item.createdAt)}
                            {item.caseId ? ' · open case' : ''}
                          </span>
                        </button>
                        {!item.read && (
                          <Button size="sm" variant="ghost" onClick={() => markRead.mutate(item.id)} className="self-center">
                            Mark as read
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
            <Pagination page={data} onChange={setPage} noun="notifications" />
          </div>
        )}
      </ListSheet>
    </div>
  )
}
