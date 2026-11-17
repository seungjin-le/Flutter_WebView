import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive'
type ButtonSize = 'default' | 'sm' | 'icon'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const base =
  'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-transparent text-sm leading-5 font-medium outline-none transition-all duration-150 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  default: 'bg-primary text-white shadow-control hover:bg-primary-hover',
  outline:
    'border-border bg-white text-foreground shadow-control hover:bg-muted hover:text-accent-foreground',
  ghost: 'text-foreground hover:bg-muted hover:text-accent-foreground',
  destructive:
    'bg-destructive/10 text-destructive-foreground hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20',
}

const sizes: Record<ButtonSize, string> = {
  default: 'h-9 gap-2 px-4 py-2',
  sm: 'h-8 gap-1.5 px-2.5',
  icon: 'size-9',
}

export const Button = ({
  variant = 'default',
  size = 'default',
  type = 'button',
  className,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={[base, variants[variant], sizes[size], className].filter(Boolean).join(' ')}
    {...rest}
  />
)
