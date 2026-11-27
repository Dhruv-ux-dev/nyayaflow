import { format } from 'date-fns'
import { FilePlus2, LogOut, Plus, Search, UserRound } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router'

import { useUnreadCount } from '@/api/notifications'
import { useAuth, useCurrentUser } from '@/auth/AuthContext'
import { Avatar } from '@/components/ui/avatar'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/menu'
import { cn } from '@/lib/cn'
import { roleLabels } from '@/lib/labels'

import { Wordmark } from './Logo'
import { workspaces, type NavItem } from './navigation'
import { useShellActions } from './shellActions'

type Tone = 'dark' | 'light'

function NavEntry({ item, badge, onNavigate, tone }: { item: NavItem; badge?: number; onNavigate?: () => void; tone: Tone }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors',
          tone === 'dark'
            ? isActive
              ? 'bg-white/[0.09] font-medium text-white'
              : 'text-white/65 hover:bg-white/[0.05] hover:text-white'
            : isActive
              ? 'bg-surface font-semibold text-ink shadow-raised ring-1 ring-line'
              : 'text-ink-soft hover:bg-surface/70 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className={cn('absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full', tone === 'dark' ? 'bg-[#c9a96e]' : 'bg-role')}
            />
          )}
          <Icon
            className={cn(
              'size-[17px] shrink-0',
              tone === 'dark'
                ? isActive
                  ? 'text-[#e2c99a]'
                  : 'text-white/45 group-hover:text-white/80'
                : isActive
                  ? 'text-role'
                  : 'text-muted group-hover:text-ink-soft',
            )}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{item.label}</span>
          {badge ? (
            <span className="tabular rounded-[5px] bg-seal px-1.5 text-[11px] leading-[18px] font-semibold text-white" aria-label={`${badge} unread`}>
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

function NavGroups({ tone, onNavigate }: { tone: Tone; onNavigate?: () => void }) {
  const user = useCurrentUser()
  const { data: unread } = useUnreadCount()
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
      {workspaces[user.role].nav.map((group, index) => (
        <div key={group.label ?? index} className={cn('space-y-0.5', index > 0 && 'pt-5')}>
          {group.label && <p className={cn('eyebrow px-3 pb-2', tone === 'dark' ? 'text-white/35' : 'text-faint')}>{group.label}</p>}
          {group.items.map((item) => (
            <NavEntry key={item.to} item={item} tone={tone} badge={item.to === '/notifications' ? unread : undefined} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  )
}

function AccountFooter({ tone, onNavigate }: { tone: Tone; onNavigate?: () => void }) {
  const user = useCurrentUser()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <div className={cn('border-t px-3 py-3', tone === 'dark' ? 'border-white/10' : 'border-line')}>
      <Menu
        align="start"
        trigger={
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
              tone === 'dark' ? 'hover:bg-white/[0.06]' : 'hover:bg-surface',
            )}
            aria-label="Account menu"
          >
            <Avatar name={user.fullName} role={user.role} size="sm" className={tone === 'dark' ? 'ring-1 ring-white/20' : undefined} />
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-[13px] font-medium', tone === 'dark' ? 'text-white' : 'text-ink')}>{user.fullName}</span>
              <span className={cn('block truncate text-xs', tone === 'dark' ? 'text-white/50' : 'text-muted')}>
                {user.designation ?? roleLabels[user.role]}
              </span>
            </span>
          </button>
        }
      >
        <MenuLabel>{user.email}</MenuLabel>
        <MenuSeparator />
        <MenuItem
          onSelect={() => {
            onNavigate?.()
            navigate('/profile')
          }}
        >
          <UserRound />
          Profile and password
        </MenuItem>
        <MenuItem onSelect={() => signOut('manual')}>
          <LogOut />
          Sign out
        </MenuItem>
      </Menu>
    </div>
  )
}

/** Administration: a dark midnight console with the system areas first. */
export function ConsoleSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { openSearch } = useShellActions()
  return (
    <div className="flex h-full flex-col bg-midnight text-white">
      <div className="px-5 pt-5 pb-4">
        <Wordmark inverted />
      </div>
      <div className="mx-3 mb-4 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
        <div className="min-w-0">
          <p className="eyebrow text-[#e2c99a]">Administration</p>
          <p className="mt-0.5 truncate text-xs text-white/55">System console</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          onNavigate?.()
          openSearch()
        }}
        className="mx-3 mb-4 flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-left text-[13px] text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="flex-1">Find a case</span>
        <kbd className="rounded border border-white/15 px-1.5 text-[10px]">/</kbd>
      </button>
      <NavGroups tone="dark" onNavigate={onNavigate} />
      <AccountFooter tone="dark" onNavigate={onNavigate} />
    </div>
  )
}

/** Registry and counsel: a light working sidebar with the workspace's primary action on top. */
export function DeskSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser()
  const { pickCase } = useShellActions()
  const workspace = workspaces[user.role]
  const context = user.court?.name ?? (user.barRegistrationNumber ? `Enrolment ${user.barRegistrationNumber}` : null)

  return (
    <div className="flex h-full flex-col bg-ivory">
      <div className="px-5 pt-5 pb-4">
        <Wordmark />
      </div>
      <div className="mx-3 mb-3 rounded-xl border border-line bg-surface px-3.5 py-3 shadow-raised">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-role" aria-hidden="true" />
          <p className="font-serif text-[1.05rem] leading-tight font-semibold text-ink">{workspace.name}</p>
        </div>
        <p className="mt-1 text-xs leading-snug text-muted">{context ?? workspace.purpose}</p>
        <p className="mt-2 border-t border-line pt-2 text-[11px] text-faint">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>
      <div className="mx-3 mb-5">
        {user.role === 'STAFF' || user.role === 'ADMIN' ? (
          <Link
            to="/cases/new"
            onClick={onNavigate}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-role text-sm font-medium text-white shadow-[inset_0_-1px_0_rgb(0_0_0/0.16)] transition-colors hover:bg-role-strong"
          >
            <Plus className="size-4" aria-hidden="true" />
            Register case
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              onNavigate?.()
              pickCase({
                intent: 'upload',
                title: 'File a document',
                description: 'Choose the matter to file in. The upload form opens on its case page.',
              })
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-role text-sm font-medium text-white shadow-[inset_0_-1px_0_rgb(0_0_0/0.16)] transition-colors hover:bg-role-strong"
          >
            <FilePlus2 className="size-4" aria-hidden="true" />
            File a document
          </button>
        )}
      </div>
      <NavGroups tone="light" onNavigate={onNavigate} />
      <AccountFooter tone="light" onNavigate={onNavigate} />
    </div>
  )
}
