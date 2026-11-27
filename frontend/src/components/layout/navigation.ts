import {
  Bell,
  BookOpenCheck,
  Briefcase,
  CalendarDays,
  FileStack,
  FileText,
  FolderOpen,
  Gavel,
  History,
  Inbox,
  Landmark,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  ScrollText,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { Role } from '@/lib/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

/**
 * How the workspace frames the page:
 * - `console`: a dark midnight sidebar for system administration.
 * - `desk`: a light working sidebar with a primary action, for the registry and counsel.
 * - `bench`: no sidebar; a quiet top navigation that leaves the board in focus.
 */
export type ShellLayout = 'console' | 'desk' | 'bench'

/**
 * Each role works in its own workspace: the same records, but named, ordered and grouped around
 * that person's job. Page titles reuse these labels so the sidebar and the page always agree.
 */
export interface Workspace {
  name: string
  /** What the workspace is for, shown under its name. */
  purpose: string
  layout: ShellLayout
  nav: NavGroup[]
}

const item = (to: string, label: string, icon: LucideIcon): NavItem => ({ to, label, icon })

export const workspaces: Record<Role, Workspace> = {
  JUDGE: {
    name: 'Chambers',
    purpose: 'Your board, your cases and the orders you pass.',
    layout: 'bench',
    nav: [
      {
        items: [
          item('/', 'Today’s board', Gavel),
          item('/hearings', 'Cause list', ListOrdered),
          item('/calendar', 'Calendar', CalendarDays),
          item('/cases', 'My cases', FolderOpen),
          item('/orders', 'Orders & judgments', ScrollText),
        ],
      },
      {
        label: 'Case papers',
        items: [
          item('/documents', 'Documents on record', FileText),
          item('/deadlines', 'Deadlines', ListChecks),
          item('/notifications', 'Notifications', Bell),
        ],
      },
    ],
  },
  LAWYER: {
    name: 'Counsel desk',
    purpose: 'Matters you appear in, your listings and what is due.',
    layout: 'desk',
    nav: [
      {
        label: 'Practice',
        items: [
          item('/', 'Overview', LayoutDashboard),
          item('/cases', 'My matters', Briefcase),
          item('/hearings', 'My hearings', Gavel),
          item('/calendar', 'Calendar', CalendarDays),
          item('/deadlines', 'What’s due', ListChecks),
        ],
      },
      {
        label: 'From the court',
        items: [
          item('/orders', 'Orders received', ScrollText),
          item('/documents', 'Filings', FileStack),
          item('/notifications', 'Notifications', Bell),
        ],
      },
    ],
  },
  STAFF: {
    name: 'Registry',
    purpose: 'Registration, listing and the court’s records.',
    layout: 'desk',
    nav: [
      {
        label: 'Registry',
        items: [
          item('/', 'Registry desk', Inbox),
          item('/cases', 'Case register', BookOpenCheck),
          item('/hearings', 'Cause lists', ListOrdered),
          item('/calendar', 'Calendar', CalendarDays),
          item('/deadlines', 'Deadlines', ListChecks),
        ],
      },
      {
        label: 'Records',
        items: [
          item('/documents', 'Documents', FileText),
          item('/orders', 'Orders & judgments', ScrollText),
          item('/notifications', 'Notifications', Bell),
        ],
      },
    ],
  },
  ADMIN: {
    name: 'Administration',
    purpose: 'People, courts and how the system is used.',
    layout: 'console',
    nav: [
      {
        label: 'System',
        items: [
          item('/', 'Overview', LayoutDashboard),
          item('/admin/users', 'Users', Users),
          item('/admin/courts', 'Courts & rooms', Landmark),
          item('/admin/audit', 'Activity log', History),
        ],
      },
      {
        label: 'Court records',
        items: [
          item('/cases', 'Cases', FolderOpen),
          item('/hearings', 'Hearings', Gavel),
          item('/calendar', 'Calendar', CalendarDays),
          item('/deadlines', 'Deadlines', ListChecks),
          item('/documents', 'Documents', FileText),
          item('/orders', 'Orders & judgments', ScrollText),
          item('/notifications', 'Notifications', Bell),
        ],
      },
    ],
  },
}

/** The label this role's sidebar gives a page, for use as the page title. */
export function pageLabel(role: Role, path: string, fallback: string) {
  for (const group of workspaces[role].nav) {
    const match = group.items.find((entry) => entry.to === path)
    if (match) return match.label
  }
  return fallback
}

/** The home crumb for breadcrumbs: the workspace's dashboard. */
export function homeCrumb(role: Role) {
  return { label: pageLabel(role, '/', 'Home'), to: '/' }
}
