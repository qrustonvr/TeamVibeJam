import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: [
    'bg-gradient-to-b from-red-800 to-red-950',
    'border border-red-600/50',
    'text-[#e8ddd8]',
    'hover:from-red-700 hover:to-red-900',
    'active:from-red-950 active:to-black',
    'shadow-[0_2px_12px_rgba(196,30,58,0.4)]',
    'hover:shadow-[0_4px_20px_rgba(196,30,58,0.65)]',
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
