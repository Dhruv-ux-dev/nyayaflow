import { format } from 'date-fns'
import { NavLink } from 'react-router'

import { useUnreadCount } from '@/api/notifications'
import { useCurrentUser } from '@/auth/AuthContext'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/cn'
import { roleLabels } from '@/lib/labels'

import { Wordmark } from './Logo'
import { workspaces, type NavItem } from './navigation'

function NavEntry({ item, badge, onNavigate }: { item: NavItem; badge?: number; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors',
          isActive ? 'bg-role-soft font-semibold text-ink' : 'text-ink-soft hover:bg-sunken hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={cn('absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-role transition-opacity', isActive ? 'opacity-100' : 'opacity-0')}
          />
          <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-role' : 'text-muted group-hover:text-ink-soft')} aria-hidden="true" />
          <span className="flex-1 truncate">{item.label}</span>
          {badge ? (
            <span className="tabular rounded-full bg-seal px-1.5 text-[11px] leading-[18px] font-semibold text-white" aria-label={`${badge} unread`}>
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser()
  const { data: unread } = useUnreadCount()
  const workspace = workspaces[user.role]
  const context = user.court?.name ?? (user.barRegistrationNumber ? `Bar no. ${user.barRegistrationNumber}` : null)

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="px-5 pt-5 pb-4">
        <Wordmark />
      </div>
      <div className="mx-3 mb-4 rounded-lg border border-line bg-role-soft/60 px-3 py-3">
        <p className="font-serif text-lg leading-tight font-semibold text-role">{workspace.name}</p>
        <p className="mt-0.5 text-xs leading-snug text-ink-soft">{workspace.purpose}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3" aria-label="Main">
        {workspace.nav.map((group, index) => (
          <div key={group.label ?? index} className={cn('space-y-0.5', index > 0 && 'pt-5')}>
            {group.label && <p className="px-3 pb-1.5 text-xs font-medium text-faint">{group.label}</p>}
            {group.items.map((item) => (
              <NavEntry key={item.to} item={item} badge={item.to === '/notifications' ? unread : undefined} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} role={user.role} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.designation ?? roleLabels[user.role]}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
          {context ? <span className="block truncate">{context}</span> : null}
        </p>
      </div>
    </div>
  )
}
