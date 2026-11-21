import { DropdownMenu, Popover as RadixPopover, Tooltip as RadixTooltip } from 'radix-ui'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

const surface = 'z-50 rounded-lg border border-line bg-surface shadow-overlay data-[state=open]:animate-pop-in'

export function Menu({ trigger, children, align = 'end' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={6} className={cn(surface, 'min-w-48 p-1')}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function MenuItem({
  children,
  onSelect,
  tone,
  disabled,
}: {
  children: ReactNode
  onSelect: () => void
  tone?: 'danger'
  disabled?: boolean
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none select-none [&_svg]:size-4 [&_svg]:text-muted',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-sunken',
        tone === 'danger' ? 'text-danger [&_svg]:text-danger' : 'text-ink',
      )}
    >
      {children}
    </DropdownMenu.Item>
  )
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-line" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className="px-2.5 pt-1.5 pb-1 text-xs text-muted">{children}</DropdownMenu.Label>
}

export function Popover({
  trigger,
  children,
  align = 'end',
  open,
  onOpenChange,
  className,
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content align={align} sideOffset={8} collisionPadding={12} className={cn(surface, className)}>
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <RadixTooltip.Root delayDuration={300}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          sideOffset={6}
          className="z-50 max-w-64 rounded-md bg-ink px-2.5 py-1.5 text-xs leading-snug text-white shadow-overlay data-[state=delayed-open]:animate-pop-in"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}

export const TooltipProvider = RadixTooltip.Provider
