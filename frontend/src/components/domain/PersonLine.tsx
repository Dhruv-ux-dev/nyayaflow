import { Avatar } from '@/components/ui/avatar'
import type { UserRef } from '@/lib/types'

export function PersonLine({ person, fallback = 'Not assigned', size = 'sm' }: { person: UserRef | null; fallback?: string; size?: 'sm' | 'md' }) {
  if (!person) return <span className="text-sm text-faint">{fallback}</span>
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={person.fullName} role={person.role} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{person.fullName}</span>
        {person.designation && <span className="block truncate text-xs text-muted">{person.designation}</span>}
      </span>
    </span>
  )
}
