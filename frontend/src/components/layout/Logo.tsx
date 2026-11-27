import { cn } from '@/lib/cn'

/** A case file bound with red tape — the thing NyayaFlow exists to untie. */
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={inverted ? '#f7f5f0' : '#0f1b2d'} />
      <path d="M9 8.5h9.5L23 13v10.5H9z" fill={inverted ? '#0f1b2d' : '#f7f5f0'} />
      <path d="M18.5 8.5V13H23" fill="none" stroke={inverted ? '#5d6577' : '#c9c4b8'} strokeWidth="1.2" />
      <path d="M7 17.5h18" stroke="#9b2c40" strokeWidth="2.6" />
      <path d="M12 12.5h4M12 21h8" stroke={inverted ? '#f7f5f0' : '#0f1b2d'} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark inverted={inverted} />
      <span className={cn('font-serif text-[1.35rem] font-semibold tracking-[-0.01em]', inverted ? 'text-white' : 'text-ink')}>NyayaFlow</span>
    </span>
  )
}
