import { Link } from 'react-router'

import { cn } from '@/lib/cn'
import type { DashboardStat, StatTone } from '@/lib/types'

const toneDot: Record<StatTone, string> = {
  neutral: 'bg-transparent',
  info: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

/** Key figures in one ruled strip, read left to right like a register's summary line. */
export function StatStrip({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat) => {
        const content = (
          <>
            <span className="flex items-center gap-1.5 text-[13px] text-muted">
              <span className={cn('size-1.5 rounded-full', toneDot[stat.tone])} aria-hidden="true" />
              {stat.label}
            </span>
            <span className={cn('mt-1 block text-[2rem] leading-none font-semibold tracking-[-0.02em]', stat.tone === 'danger' && stat.value > 0 ? 'text-danger' : 'text-ink')}>
              {stat.value.toLocaleString('en-IN')}
            </span>
            <span className="mt-2 block truncate text-xs text-muted">{stat.hint}</span>
          </>
        )
        const cell = 'block border-line px-4 py-4 [&:not(:last-child)]:border-r max-sm:[&:nth-child(2n)]:border-r-0 max-sm:[&:nth-child(n+3)]:border-t'
        return stat.link ? (
          <Link key={stat.key} to={stat.link} className={cn(cell, 'transition-colors hover:bg-paper')}>
            {content}
          </Link>
        ) : (
          <div key={stat.key} className={cell}>
            {content}
          </div>
        )
      })}
    </div>
  )
}
