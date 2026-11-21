import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'
import type { Role } from '@/lib/types'

const roleTint: Record<Role, string> = {
  ADMIN: 'bg-ink text-white',
  JUDGE: 'bg-seal text-white',
  LAWYER: 'bg-brand-soft text-brand-strong',
  STAFF: 'bg-[#e2f1ef] text-[#0e6b66]',
}

export function Avatar({ name, role, size = 'md', className }: { name: string; role?: Role; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold',
        size === 'sm' ? 'size-7 text-[11px]' : 'size-9 text-[13px]',
        role ? roleTint[role] : 'bg-sunken text-ink-soft',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
