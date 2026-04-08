import { ReactNode } from 'react'

interface GameTableProps {
  children: ReactNode
}

export function GameTable({ children }: GameTableProps) {
  return (
    <main className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Outer glow / ambient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(10,40,10,0.4) 0%, transparent 70%)',
        }}
      />

      {/* Table surface */}
      <div
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, var(--felt-green) 0%, var(--felt-dark) 70%, #050d05 100%)',
          border: '2px solid var(--gold-dim)',
          boxShadow: [
            '0 0 0 1px rgba(212,175,55,0.15)',
            '0 0 60px rgba(0,0,0,0.8)',
            'inset 0 0 120px rgba(0,0,0,0.4)',
            'inset 0 0 0 1px rgba(212,175,55,0.08)',
          ].join(', '),
          minHeight: '520px',
        }}
      >
        {/* Felt noise texture overlay */}
        <div className="table-felt-noise absolute inset-0 pointer-events-none" />

        {/* Scanline shimmer */}
        <div className="table-scanline absolute inset-0 pointer-events-none overflow-hidden" />

        {/* Gold trim inner border */}
        <div
          className="absolute inset-3 rounded-xl pointer-events-none"
          style={{
            border: '1px solid rgba(212,175,55,0.12)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center w-full h-full min-h-[520px]">
          {children}
        </div>
      </div>
    </main>
  )
}
