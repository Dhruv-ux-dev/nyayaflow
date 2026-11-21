import { Slot } from 'radix-ui'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

import { Spinner } from './feedback'

const variants = {
  primary: 'bg-brand text-white shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] hover:bg-brand-strong',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken hover:border-faint/60',
  ghost: 'text-ink-soft hover:bg-sunken hover:text-ink',
  danger: 'bg-danger text-white hover:bg-[#a42a22]',
  'danger-ghost': 'text-danger hover:bg-danger-soft',
} as const

const sizes = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
  icon: 'h-9 w-9 justify-center',
  'icon-sm': 'h-8 w-8 justify-center',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
  /** Render the child element (for example a router Link) with button styling. */
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, asChild = false, className, disabled, children, type, ...props },
  ref,
) {
  const classes = cn(
    'inline-flex shrink-0 items-center rounded-md font-medium whitespace-nowrap transition-colors',
    'disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0',
    variants[variant],
    sizes[size],
    className,
  )
  if (asChild) {
    return (
      <Slot.Root ref={ref} className={classes} {...props}>
        {children}
      </Slot.Root>
    )
  }
  return (
    <button ref={ref} type={type ?? 'button'} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
})
