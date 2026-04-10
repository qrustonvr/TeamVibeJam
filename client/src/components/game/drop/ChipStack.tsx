/**
 * ChipStack — renders poker chip sprites from chips.png
 *
 * Spritesheet: 1396 × 55 px, 22 chips in a single row.
 * Each chip occupies a 63 px cell; the chip circle is 55 px Ø, centred (4 px margin each side).
 *
 * Chip index → denomination mapping (visible labels in the sheet):
 *   0: 1¢   1: 5¢   2: 25¢
 *   3: 1    4: 5    5: 25    6: 100   7: 500
 *   8: 1K   9: 5K  10: 25K  11: 100K 12: 500K
 *  13: 1M  …
 */

const SHEET_W = 1396
const CELL_W  = 60   // px per chip cell in the source sheet
const CHIP_D  = 55   // chip circle diameter in the source sheet (= sheet height)
const MARGIN  = Math.round((CELL_W - CHIP_D) / 2) // 4 px

interface ChipDef { value: number; index: number }

// Denominations available in this game (stack starts at 1000, ante=10)
const CHIP_DEFS: ChipDef[] = [
  { value: 1000, index: 8  },
  { value: 500,  index: 7  },
  { value: 100,  index: 6  },
  { value: 25,   index: 5  },
  { value: 5,    index: 4  },
  { value: 1,    index: 3  },
]

function chipBreakdown(amount: number, maxTypes = 4): Array<ChipDef & { count: number }> {
  let remaining = Math.max(0, Math.round(amount))
  const result: Array<ChipDef & { count: number }> = []
  for (const d of CHIP_DEFS) {
    if (result.length >= maxTypes) break
    const count = Math.floor(remaining / d.value)
    if (count > 0) {
      result.push({ ...d, count: Math.min(count, 9) })
      remaining -= count * d.value
    }
  }
  return result
}

// ── Single chip sprite ────────────────────────────────────────────────────────

function ChipSprite({ index, size }: { index: number; size: number }) {
  const scale = size / CHIP_D
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: "url('/TeamVibeJam/assets/chips.png')",
        backgroundSize: `${Math.round(SHEET_W * scale)}px ${size}px`,
        backgroundPosition: `-${Math.round((index * CELL_W + MARGIN) * scale)}px 0`,
        backgroundRepeat: 'no-repeat',
        flexShrink: 0,
        imageRendering: 'auto',
      }}
    />
  )
}

// ── Stacked chip column (overlapping, like real chips) ────────────────────────

interface StackColumnProps {
  chipIndex: number
  count: number
  chipSize: number
}

function StackColumn({ chipIndex, count, chipSize }: StackColumnProps) {
  const overlap = Math.round(chipSize * 0.35) // how much each chip overlaps the one below
  const visibleChips = Math.min(count, 6)     // cap visual height
  const columnH = chipSize + (visibleChips - 1) * overlap

  return (
    <div style={{ position: 'relative', width: chipSize, height: columnH, flexShrink: 0 }}>
      {Array.from({ length: visibleChips }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: i * overlap,
            left: 0,
            filter: i === visibleChips - 1 ? 'none' : 'brightness(0.85)',
          }}
        >
          <ChipSprite index={chipIndex} size={chipSize} />
        </div>
      ))}
      {/* Count badge when more chips than we draw */}
      {count > 1 && (
        <div style={{
          position: 'absolute',
          top: -5,
          right: -5,
          background: 'rgba(0,0,0,0.85)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 8,
          fontSize: 8,
          fontFamily: 'var(--font-body)',
          color: '#fff',
          padding: '0 3px',
          lineHeight: '14px',
          minWidth: 14,
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          {count > 99 ? '99+' : count > 9 ? `${count}` : count}
        </div>
      )}
    </div>
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

interface ChipStackProps {
  amount: number
  chipSize?: number   // display size per chip in px
  maxTypes?: number   // max distinct denominations to show
  showLabel?: boolean // show ◆N amount below
  labelColor?: string
}

export function ChipStack({
  amount,
  chipSize = 28,
  maxTypes = 3,
  showLabel = true,
  labelColor = 'var(--gold)',
}: ChipStackProps) {
  if (amount <= 0) return null

  const chips = chipBreakdown(amount, maxTypes)
  if (chips.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
    }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
        {chips.map(c => (
          <StackColumn key={c.value} chipIndex={c.index} count={c.count} chipSize={chipSize} />
        ))}
      </div>
      {showLabel && (
        <div style={{
          fontSize: 9,
          fontFamily: 'var(--font-body)',
          color: labelColor,
          letterSpacing: 1,
        }}>
          ◆{amount}
        </div>
      )}
    </div>
  )
}
