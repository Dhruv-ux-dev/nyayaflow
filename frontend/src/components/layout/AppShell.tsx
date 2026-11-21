import { Dialog as RadixDialog } from 'radix-ui'
import { LogOut, Menu as MenuIcon, Plus, Search, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth, useCurrentUser } from '@/auth/AuthContext'
import { can } from '@/auth/roles'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/menu'
import { roleLabels } from '@/lib/labels'

import { workspaces } from './navigation'

import { CommandPalette } from './CommandPalette'
import { NotificationBell } from './NotificationBell'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const user = useCurrentUser()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

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

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only z-50 rounded-md bg-ink px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] border-r border-line lg:block">
        <Sidebar />
      </aside>

      <RadixDialog.Root open={navOpen} onOpenChange={setNavOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/35 data-[state=open]:animate-overlay-in lg:hidden" />
          <RadixDialog.Content className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-line shadow-overlay focus:outline-none lg:hidden">
            <RadixDialog.Title className="sr-only">Navigation</RadixDialog.Title>
            <RadixDialog.Description className="sr-only">Main navigation</RadixDialog.Description>
            <Sidebar onNavigate={() => setNavOpen(false)} />
            <RadixDialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close navigation" className="absolute top-4 right-3">
                <X />
              </Button>
            </RadixDialog.Close>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <div className="lg:pl-[248px]">
        <Topbar onOpenNav={() => setNavOpen(true)} onOpenSearch={() => setPaletteOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

function Topbar({ onOpenNav, onOpenSearch }: { onOpenNav: () => void; onOpenSearch: () => void }) {
  const user = useCurrentUser()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onCasePages = pathname === '/cases' || pathname === '/cases/new'
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-t-[3px] border-b border-t-role border-b-line bg-paper/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenNav} aria-label="Open navigation">
        <MenuIcon />
      </Button>
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex h-9 max-w-md flex-1 items-center gap-2.5 rounded-md border border-line-strong bg-surface px-3 text-left text-sm text-faint transition-colors hover:border-faint"
      >
        <Search className="size-4 text-muted" aria-hidden="true" />
        <span className="flex-1 truncate">Find a case</span>
        <kbd className="hidden rounded border border-line bg-paper px-1.5 text-[11px] font-medium text-muted sm:inline">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        <span className="mr-1 hidden items-center gap-2 rounded-full bg-role-soft px-3 py-1 text-[13px] font-medium text-role sm:inline-flex lg:hidden">
          <span className="size-1.5 rounded-full bg-role" aria-hidden="true" />
          {workspaces[user.role].name}
        </span>
        {can.registerCases(user.role) && !onCasePages && (
          <Button variant="primary" asChild className="hidden sm:inline-flex">
            <Link to="/cases/new">
              <Plus />
              Register case
            </Link>
          </Button>
        )}
        <NotificationBell />
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
      </div>
    </header>
  )
}
