import { cn } from '@/lib/cn'
import { splitCaseTitle } from '@/lib/format'

/** Case title in legal-citation style: "Sharma Builders v. Gupta Infra", with an italic "v.". */
export function CaseTitle({ title, className }: { title: string; className?: string }) {
  const parts = splitCaseTitle(title)
  return (
    <span className={cn('font-serif', className)}>
      {parts ? (
        <>
          {parts[0]} <em className="px-0.5 font-normal text-muted italic">v.</em> {parts[1]}
        </>
      ) : (
        title
      )}
    </span>
  )
}

export function CaseNumber({ value, className }: { value: string; className?: string }) {
  return <span className={cn('tabular text-[13px] font-semibold tracking-[0.01em] text-ink-soft', className)}>{value}</span>
}
