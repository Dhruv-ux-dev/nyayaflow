import { cn } from '@/lib/cn'

/** A case file bound with red tape — the thing NyayaFlow exists to untie. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#14213d" />
      <path d="M9 8.5h9.5L23 13v10.5H9z" fill="#f5f6f8" />
      <path d="M18.5 8.5V13H23" fill="none" stroke="#c9ced8" strokeWidth="1.2" />
      <path d="M7 17.5h18" stroke="#8e2c3a" strokeWidth="2.6" />
      <path d="M12 12.5h4M12 21h8" stroke="#14213d" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-serif text-[1.35rem] font-semibold tracking-[-0.01em] text-ink">NyayaFlow</span>
    </span>
  )
}
