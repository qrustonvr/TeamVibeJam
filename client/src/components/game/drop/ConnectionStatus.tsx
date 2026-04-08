interface ConnectionStatusProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  roomCode?: string | null
}

export function ConnectionStatus({ status, roomCode }: ConnectionStatusProps) {
  const colors = {
    connected: '#22c55e',
    connecting: '#f59e0b',
    reconnecting: '#f59e0b',
    disconnected: '#ef4444',
  }
  const labels = {
    connected: 'Connected',
    connecting: 'Connecting…',
    reconnecting: 'Reconnecting…',
    disconnected: 'Disconnected',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
      color: 'var(--gold-dim)', fontFamily: 'var(--font-body)',
    }}>
      {roomCode && (
        <span style={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: 2, marginRight: 4 }}>
          {roomCode}
        </span>
      )}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: colors[status],
        boxShadow: `0 0 6px ${colors[status]}`,
        animation: status !== 'connected' ? 'pulse-slow 1.5s ease-in-out infinite' : 'none',
      }} />
      <span>{labels[status]}</span>
    </div>
  )
}
