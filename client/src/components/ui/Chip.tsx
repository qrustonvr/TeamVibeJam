interface ChipProps {
  value: number
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}

const chipColor = (value: number) => {
  if (value <= 10) return { bg: 'bg-white', text: 'text-gray-900', border: '#e5e7eb' }
  if (value <= 25) return { bg: 'bg-blue-600', text: 'text-white', border: '#3b82f6' }
  if (value <= 50) return { bg: 'bg-red-600', text: 'text-white', border: '#ef4444' }
  return { bg: 'bg-gray-900', text: 'text-[var(--gold)]', border: 'var(--gold)' }
}

export function Chip({ value, selected = false, disabled = false, onClick }: ChipProps) {
  const { bg, text, border } = chipColor(value)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Bet ${value}`}
      aria-pressed={selected}
      className={[
        'relative w-16 h-16 rounded-full',
        'flex items-center justify-center',
        'font-body font-bold text-sm',
        'transition-all duration-150 ease-out',
        'select-none outline-none',
        bg,
        text,
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        !disabled && !selected ? 'hover:scale-110 hover:-translate-y-1 hover:brightness-110' : '',
        selected ? 'scale-110 -translate-y-2' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        boxShadow: selected
          ? `0 0 0 3px ${border}, 0 0 0 5px rgba(0,0,0,0.5), 0 0 20px var(--gold), inset 0 0 0 2px rgba(255,255,255,0.15)`
          : `0 0 0 3px ${border}, 0 0 0 5px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.1)`,
      }}
    >
      {/* Ridged border dashes */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `repeating-conic-gradient(rgba(255,255,255,0.15) 0deg 10deg, transparent 10deg 20deg)`,
          borderRadius: '50%',
        }}
      />
      <span className="relative z-10 leading-none">{value}</span>
    </button>
  )
}
