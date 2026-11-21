import { Bell, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '@/api/notifications'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/feedback'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/panel'
import { cn } from '@/lib/cn'
import { formatDateTime, timeAgo } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import type { NotificationItem } from '@/lib/types'

export default function NotificationsPage() {
  useDocumentTitle('Notifications')
  const navigate = useNavigate()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(0)
  const { data, isLoading, error, refetch } = useNotifications({ unreadOnly, page, size: 20 })
  const { data: unread = 0 } = useUnreadCount()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const open = (item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id)
    if (item.caseId) navigate(`/cases/${item.caseId}`)
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : 'You are all caught up.'}
        actions={
          <Button onClick={() => markAllRead.mutate()} disabled={!unread} loading={markAllRead.isPending}>
            <CheckCheck />
            Mark all as read
          </Button>
        }
      />
      <div className="mb-4 flex gap-1 border-b border-line" role="tablist" aria-label="Filter">
        {[
          { key: false, label: 'All' },
          { key: true, label: 'Unread' },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={unreadOnly === tab.key}
            onClick={() => {
              setUnreadOnly(tab.key)
              setPage(0)
            }}
            className={cn(
              '-mb-px h-10 border-b-2 px-3 text-sm font-medium transition-colors',
              unreadOnly === tab.key ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-line bg-surface">
        {isLoading && <SkeletonRows />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.content.length === 0 && (
          <EmptyState icon={Bell} title={unreadOnly ? 'No unread notifications' : 'No notifications yet'} description="You will be notified about hearings, filings, orders and deadlines in your cases." />
        )}
        {data && data.content.length > 0 && (
          <>
            <ul className="divide-y divide-line">
              {data.content.map((item) => (
                <li key={item.id} className={cn('flex gap-3 px-4 py-3.5', !item.read && 'bg-brand-soft/30')}>
                  <span className={cn('mt-2 size-2 shrink-0 rounded-full', item.read ? 'bg-transparent' : 'bg-seal')} aria-label={item.read ? undefined : 'Unread'} />
                  <button type="button" onClick={() => open(item)} className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-medium text-ink">{item.title}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{item.message}</span>
                    <span className="mt-1 block text-xs text-muted" title={formatDateTime(item.createdAt)}>
                      {timeAgo(item.createdAt)}
                    </span>
                  </button>
                  {!item.read && (
                    <Button size="sm" variant="ghost" onClick={() => markRead.mutate(item.id)} className="self-center">
                      Mark as read
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <Pagination page={data} onChange={setPage} noun="notifications" />
          </>
        )}
      </div>
    </>
  )
}
