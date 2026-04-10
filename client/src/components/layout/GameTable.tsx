import { ReactNode } from 'react'

interface GameTableProps {
  children: ReactNode
}

export function GameTable({ children }: GameTableProps) {
  return (
    <main className="flex-1 flex items-stretch justify-center p-4 overflow-visible relative">
      {/* Ambient room glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(40,0,0,0.25) 0%, transparent 70%)',
        }}
      />

      {/* Scanline shimmer */}
      <div className="table-scanline absolute inset-0 pointer-events-none overflow-hidden" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-screen-2xl flex flex-col">
        {children}
      </div>
    </main>
  )
}
