import { Tabs as RadixTabs } from 'radix-ui'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export const Tabs = RadixTabs.Root
export const TabsContent = RadixTabs.Content

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RadixTabs.List className={cn('flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]', className)}>
      {children}
    </RadixTabs.List>
  )
}

export function TabsTrigger({ value, children, count }: { value: string; children: ReactNode; count?: number }) {
  return (
    <RadixTabs.Trigger
      value={value}
      className={cn(
        '-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-muted',
        'transition-colors hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink',
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="tabular rounded-full bg-sunken px-1.5 text-[11px] leading-[18px] text-ink-soft">{count}</span>
      )}
    </RadixTabs.Trigger>
  )
}
