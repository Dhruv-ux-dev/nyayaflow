import type { Role } from '@/lib/types'

/** UI-level capability checks by role. Case-specific permissions come from the API. */
export const can = {
  registerCases: (role: Role) => role === 'STAFF' || role === 'ADMIN',
  viewDirectory: (role: Role) => role !== 'LAWYER',
  administer: (role: Role) => role === 'ADMIN',
  manageDeadlines: (role: Role) => role !== 'LAWYER',
}
