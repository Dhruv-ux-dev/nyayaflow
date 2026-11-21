import {
  Bell,
  CalendarDays,
  FileText,
  FolderOpen,
  Gavel,
  History,
  Landmark,
  LayoutDashboard,
  ListChecks,
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
 * Each role works in its own workspace: the same records, but named, ordered and grouped around
 * that person's job. Page titles reuse these labels so the sidebar and the page always agree.
 */
export interface Workspace {
  name: string
  /** What the workspace is for, shown under its name. */
  purpose: string
  nav: NavGroup[]
}

const item = (to: string, label: string, icon: LucideIcon): NavItem => ({ to, label, icon })

export const workspaces: Record<Role, Workspace> = {
  JUDGE: {
    name: 'Chambers',
    purpose: 'Your board, your cases and the orders you pass.',
    nav: [
      {
        items: [
          item('/', 'Today’s board', LayoutDashboard),
          item('/hearings', 'Cause list', Gavel),
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
    nav: [
      {
        items: [
          item('/', 'Overview', LayoutDashboard),
          item('/cases', 'My matters', FolderOpen),
          item('/hearings', 'My hearings', Gavel),
          item('/calendar', 'Calendar', CalendarDays),
          item('/deadlines', 'What’s due', ListChecks),
        ],
      },
      {
        label: 'From the court',
        items: [
          item('/orders', 'Orders received', ScrollText),
          item('/documents', 'Filings', FileText),
          item('/notifications', 'Notifications', Bell),
        ],
      },
    ],
  },
  STAFF: {
    name: 'Registry',
    purpose: 'Registration, listing and the court’s records.',
    nav: [
      {
        items: [
          item('/', 'Registry desk', LayoutDashboard),
          item('/cases', 'Case register', FolderOpen),
          item('/hearings', 'Cause lists', Gavel),
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
    nav: [
      {
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
