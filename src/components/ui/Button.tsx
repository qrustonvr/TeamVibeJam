import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: [
    'bg-gradient-to-b from-emerald-600 to-emerald-800',
    'border border-emerald-500/60',
    'text-white',
    'hover:from-emerald-500 hover:to-emerald-700',
    'active:from-emerald-800 active:to-emerald-900',
    'shadow-[0_2px_12px_rgba(16,185,129,0.3)]',
    'hover:shadow-[0_4px_20px_rgba(16,185,129,0.5)]',
  ].join(' '),
  danger: [
    'bg-gradient-to-b from-red-700 to-red-900',
    'border border-red-500/60',
    'text-white',
    'hover:from-red-600 hover:to-red-800',
    'active:from-red-900 active:to-red-950',
    'shadow-[0_2px_12px_rgba(220,38,38,0.3)]',
    'hover:shadow-[0_4px_20px_rgba(220,38,38,0.5)]',
  ].join(' '),
  ghost: [
    'bg-transparent',
    'border border-[var(--gold-dim)]',
    'text-[var(--gold-dim)]',
    'hover:border-[var(--gold)] hover:text-[var(--gold)]',
    'hover:bg-[var(--gold)]/5',
    'active:bg-[var(--gold)]/10',
  ].join(' '),
}

export function Button({ variant = 'primary', fullWidth, className = '', children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        'font-body font-600 tracking-widest uppercase text-sm',
        'px-6 py-3 rounded',
        'transition-all duration-150 ease-out',
        'cursor-pointer select-none',
        variantClasses[variant],
        fullWidth ? 'w-full' : '',
        disabled
          ? 'opacity-40 cursor-not-allowed pointer-events-none'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
