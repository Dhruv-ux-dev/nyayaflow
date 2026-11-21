import { Bell } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '@/api/notifications'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { Popover } from '@/components/ui/menu'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import type { NotificationItem } from '@/lib/types'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: unread = 0 } = useUnreadCount()

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="w-[min(380px,calc(100vw-1.5rem))]"
      trigger={
        <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className="relative">
          <Bell />
          {unread > 0 && (
            <span className="tabular absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-seal px-1 text-[10px] leading-4 font-semibold text-white ring-2 ring-surface">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      }
    >
      {open && <NotificationPreview onClose={() => setOpen(false)} />}
    </Popover>
  )
}

function NotificationPreview({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { data, isLoading } = useNotifications({ size: 8 })
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const items = data?.content ?? []

  const openItem = (item: NotificationItem) => {
    if (!item.read) markRead.mutate(item.id)
    onClose()
    navigate(item.caseId ? `/cases/${item.caseId}` : '/notifications')
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-semibold text-ink">Notifications</p>
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
        >
          Mark all as read
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {isLoading && (
          <div className="grid place-items-center py-8 text-muted">
            <Spinner />
          </div>
        )}
        {!isLoading && items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">You are all caught up.</p>}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openItem(item)}
            className={cn('flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-paper', !item.read && 'bg-brand-soft/40')}
          >
            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.read ? 'bg-transparent' : 'bg-seal')} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{item.title}</span>
              <span className="mt-0.5 line-clamp-2 block text-[13px] text-ink-soft">{item.message}</span>
              <span className="mt-1 block text-xs text-muted">{timeAgo(item.createdAt)}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="border-t border-line px-4 py-2.5 text-center">
        <Link to="/notifications" onClick={onClose} className="text-[13px] font-medium text-brand hover:underline">
          View all notifications
        </Link>
      </div>
    </div>
  )
}
