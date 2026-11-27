import { format } from 'date-fns'
import { Dialog as RadixDialog } from 'radix-ui'
import { LogOut, Menu as MenuIcon, Search, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'

import { useUnreadCount } from '@/api/notifications'
import { useAuth, useCurrentUser } from '@/auth/AuthContext'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/menu'
import { cn } from '@/lib/cn'
import { roleLabels } from '@/lib/labels'

import { CasePickerDialog } from './CasePickerDialog'
import { CommandPalette } from './CommandPalette'
import { LogoMark, Wordmark } from './Logo'
import { workspaces } from './navigation'
import { NotificationBell } from './NotificationBell'
import { ShellActionsContext, useShellActions, type CasePickerRequest, type ShellActions } from './shellActions'
import { ConsoleSidebar, DeskSidebar } from './Sidebar'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function AppShell() {
  const user = useCurrentUser()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [picker, setPicker] = useState<CasePickerRequest | null>(null)
  const layout = workspaces[user.role].layout

  // The workspace accent applies everywhere, including dialogs rendered outside the shell.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.role = user.role
    return () => {
      delete root.dataset.role
    }
  }, [user.role])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const actions = useMemo<ShellActions>(() => ({ openSearch: () => setPaletteOpen(true), pickCase: setPicker }), [])

  return (
    <ShellActionsContext.Provider value={actions}>
      <div className="min-h-screen">
        <a href="#main" className="sr-only z-50 rounded-md bg-ink px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Skip to content
        </a>
        {layout === 'bench' ? <BenchFrame /> : <SidebarFrame console={layout === 'console'} />}
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        {picker && <CasePickerDialog request={picker} onClose={() => setPicker(null)} />}
      </div>
    </ShellActionsContext.Provider>
  )
}

// ---------------------------------------------------------------- shared pieces

function MobileDrawer({
  open,
  onOpenChange,
  children,
  dark,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  dark?: boolean
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-overlay-in" />
        <RadixDialog.Content className="fixed inset-y-0 left-0 z-50 w-[288px] max-w-[85vw] shadow-overlay focus:outline-none data-[state=open]:animate-overlay-in">
          <RadixDialog.Title className="sr-only">Navigation</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">Main navigation</RadixDialog.Description>
          {children}
          <RadixDialog.Close asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close navigation"
              className={cn('absolute top-4 right-3', dark && 'text-white/70 hover:bg-white/10 hover:text-white')}
            >
              <X />
            </Button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

function SearchButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 max-w-md min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3 text-left text-sm text-faint shadow-[0_1px_1px_rgb(15_27_45/0.03)] transition-colors hover:border-faint',
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
      <span className="flex-1 truncate">Find a case by number, party or counsel</span>
      <kbd className="hidden rounded border border-line bg-paper px-1.5 text-[11px] font-medium text-muted sm:inline">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
    </button>
  )
}

function AccountMenu() {
  const user = useCurrentUser()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <Menu
      trigger={
        <button type="button" className="ml-1 rounded-full" aria-label="Account menu">
          <Avatar name={user.fullName} role={user.role} />
        </button>
      }
    >
      <MenuLabel>
        <span className="block text-sm font-medium text-ink">{user.fullName}</span>
        <span className="block">{user.designation ?? roleLabels[user.role]}</span>
      </MenuLabel>
      <MenuSeparator />
      <MenuItem onSelect={() => navigate('/profile')}>
        <UserRound />
        Profile and password
      </MenuItem>
      <MenuItem onSelect={() => signOut('manual')}>
        <LogOut />
        Sign out
      </MenuItem>
    </Menu>
  )
}

/** Close the mobile drawer whenever the route changes. */
function useCloseOnNavigate(setOpen: (open: boolean) => void) {
  const { pathname, search } = useLocation()
  useEffect(() => setOpen(false), [pathname, search, setOpen])
}

// ---------------------------------------------------------------- sidebar layouts (console, desk)

function SidebarFrame({ console: dark }: { console: boolean }) {
  const user = useCurrentUser()
  const [navOpen, setNavOpen] = useState(false)
  const { openSearch } = useShellActions()
  useCloseOnNavigate(setNavOpen)
  const Sidebar = dark ? ConsoleSidebar : DeskSidebar

  return (
    <>
      <aside className={cn('no-print fixed inset-y-0 left-0 z-30 hidden w-[256px] lg:block', dark ? 'bg-midnight' : 'border-r border-line bg-ivory')}>
        <Sidebar />
      </aside>
      <MobileDrawer open={navOpen} onOpenChange={setNavOpen} dark={dark}>
        <Sidebar onNavigate={() => setNavOpen(false)} />
      </MobileDrawer>

      <div className="lg:pl-[256px] print:pl-0">
        <header className="no-print sticky top-0 z-20 flex h-15 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open navigation">
            <MenuIcon />
          </Button>
          <SearchButton onClick={openSearch} />
          <div className="ml-auto flex items-center gap-1.5">
            <span className="mr-1 hidden items-center gap-2 rounded-md bg-role-soft px-2.5 py-1 text-[13px] font-medium text-role sm:inline-flex lg:hidden">
              <span className="size-1.5 rounded-full bg-role" aria-hidden="true" />
              {workspaces[user.role].name}
            </span>
            <NotificationBell />
            <span className="lg:hidden">
              <AccountMenu />
            </span>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- bench layout (judge)

/**
 * Chambers: no sidebar. A single quiet bar carries the court's identity, today's date and the
 * navigation, so the board below gets the whole width and the bench's attention.
 */
function BenchFrame() {
  const user = useCurrentUser()
  const { openSearch } = useShellActions()
  const { data: unread } = useUnreadCount()
  const [navOpen, setNavOpen] = useState(false)
  useCloseOnNavigate(setNavOpen)
  const groups = workspaces[user.role].nav
  const primary = groups[0].items
  const secondary = groups.slice(1).flatMap((g) => g.items)

  const tab = (to: string, label: string, badge?: number) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'relative inline-flex h-12 items-center gap-1.5 px-1 text-[13.5px] whitespace-nowrap transition-colors',
          isActive ? 'font-semibold text-ink' : 'text-muted hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {badge ? <span className="tabular rounded-[5px] bg-seal px-1.5 text-[10px] leading-4 font-semibold text-white">{badge}</span> : null}
          <span
            aria-hidden="true"
            className={cn('absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-role transition-opacity', isActive ? 'opacity-100' : 'opacity-0')}
          />
        </>
      )}
    </NavLink>
  )

  return (
    <>
      <header className="no-print sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="h-[3px] bg-role" aria-hidden="true" />
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open navigation">
            <MenuIcon />
          </Button>
          <NavLink to="/" className="flex items-center gap-2.5" aria-label="Today’s board">
            <LogoMark className="size-7" />
            <span className="hidden font-serif text-lg font-semibold text-ink sm:inline">NyayaFlow</span>
          </NavLink>
          <span className="hidden h-6 w-px bg-line md:block" aria-hidden="true" />
          <div className="hidden min-w-0 md:block">
            <p className="font-serif text-[15px] leading-tight font-semibold text-role">Chambers</p>
            <p className="truncate text-[11px] text-muted">
              {user.court?.name ?? 'Court'} · {format(new Date(), 'EEE d MMM yyyy')}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={openSearch} aria-label="Find a case">
              <Search />
            </Button>
            <NotificationBell />
            <AccountMenu />
          </div>
        </div>
        <nav aria-label="Main" className="mx-auto hidden max-w-[1320px] items-center gap-6 border-t border-line px-4 sm:px-6 lg:flex lg:px-8">
          {primary.map((item) => tab(item.to, item.label))}
          <span className="h-5 w-px bg-line" aria-hidden="true" />
          {secondary.map((item) => tab(item.to, item.label, item.to === '/notifications' ? unread : undefined))}
        </nav>
      </header>
      <MobileDrawer open={navOpen} onOpenChange={setNavOpen}>
        <div className="flex h-full flex-col bg-surface">
          <div className="border-b border-line px-5 pt-5 pb-4">
            <Wordmark />
            <p className="mt-3 font-serif text-base font-semibold text-role">Chambers</p>
            <p className="text-xs text-muted">{user.court?.name}</p>
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
            {groups.map((group, index) => (
              <div key={group.label ?? index} className={cn('space-y-0.5', index > 0 && 'pt-4')}>
                {group.label && <p className="eyebrow px-3 pb-2 text-faint">{group.label}</p>}
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex h-10 items-center gap-3 rounded-lg px-3 text-sm',
                        isActive ? 'bg-role-soft font-semibold text-role' : 'text-ink-soft hover:bg-sunken',
                      )
                    }
                  >
                    <item.icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </MobileDrawer>
      <main id="main" className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </>
  )
}
