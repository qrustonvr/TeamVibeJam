export function Footer() {
  return (
    <footer
      className="w-full px-6 py-3 flex items-center justify-between font-body text-xs tracking-widest"
      style={{
        background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 100%)',
        borderTop: '1px solid var(--gold-dim)',
        color: 'var(--gold-dim)',
      }}
    >
      <span className="uppercase opacity-60">Team Vibe Jam &mdash; 2025</span>
      <span className="uppercase opacity-60">Built with React + Vite</span>
    </footer>
  )
}
