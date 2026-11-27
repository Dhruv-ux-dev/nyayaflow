import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'
import type { Role } from '@/lib/types'

const roleTint: Record<Role, string> = {
  ADMIN: 'bg-ink text-white',
  JUDGE: 'bg-seal text-white',
  LAWYER: 'bg-brand-soft text-brand-strong',
  STAFF: 'bg-teal-soft text-teal',
}

export function Avatar({ name, role, size = 'md', className }: { name: string; role?: Role; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold',
        { xs: 'size-6 text-[10px]', sm: 'size-7 text-[11px]', md: 'size-9 text-[13px]', lg: 'size-12 text-base' }[size],
        role ? roleTint[role] : 'bg-sunken text-ink-soft',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
