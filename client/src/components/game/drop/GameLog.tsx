import { useEffect, useRef } from 'react'

interface GameLogProps {
  messages: string[]
}

export function GameLog({ messages }: GameLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)',
      border: '1px solid rgba(212,175,55,0.2)',
      borderRadius: 8,
      padding: '8px 12px',
      maxHeight: 100,
      overflowY: 'auto',
      fontFamily: 'var(--font-body)',
      fontSize: 11,
    }}>
      {messages.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Waiting for game to start…</div>
      )}
      {messages.map((msg, i) => (
        <div key={i} style={{
          color: i === messages.length - 1 ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
          padding: '1px 0',
          transition: 'color 0.3s',
        }}>
          {msg}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
