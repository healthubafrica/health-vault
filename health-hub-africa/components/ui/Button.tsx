import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'emergency' | 'emergency-outline' | 'whatsapp' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary-dark)] text-white hover:bg-[var(--color-primary)] active:bg-[var(--color-primary-dark)] disabled:opacity-50 shadow-sm',
  secondary:
    'border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] active:bg-[var(--color-primary)]/20 disabled:opacity-50',
  emergency:
    'bg-[#C0392B] text-white hover:bg-[#a93226] active:bg-[#922b21] disabled:opacity-50 shadow-sm',
  'emergency-outline':
    'border border-[#C0392B] text-[#C0392B] hover:bg-[#C0392B]/10 disabled:opacity-50',
  whatsapp:
    'bg-[#25D366] text-white hover:bg-[#1da851] disabled:opacity-50 shadow-sm',
  ghost:
    'text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[11px] font-bold rounded-xl gap-1.5 uppercase tracking-wider',
  md: 'h-10 px-4.5 text-xs font-bold rounded-2xl gap-2 uppercase tracking-wider',
  lg: 'h-13 px-5 text-sm font-extrabold rounded-2xl gap-2 uppercase tracking-wider',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = 'Button'
