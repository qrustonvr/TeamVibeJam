/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        'felt-green': 'var(--felt-green)',
        'felt-dark': 'var(--felt-dark)',
        gold: 'var(--gold)',
        'gold-dim': 'var(--gold-dim)',
        'chip-red': 'var(--chip-red)',
        'chip-blue': 'var(--chip-blue)',
        'chip-black': 'var(--chip-black)',
        'chip-white': 'var(--chip-white)',
      },
      boxShadow: {
        'chip': '0 0 0 3px currentColor, 0 0 0 5px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.15)',
        'chip-selected': '0 0 0 3px currentColor, 0 0 0 6px var(--gold), 0 0 16px var(--gold), inset 0 0 0 2px rgba(255,255,255,0.2)',
        'gold-border': '0 0 0 1px var(--gold-dim), 0 0 32px rgba(212,175,55,0.1)',
        'table': 'inset 0 0 120px rgba(0,0,0,0.6), 0 0 60px rgba(0,0,0,0.8)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glow: {
          '0%': { textShadow: '0 0 8px var(--gold-dim)' },
          '100%': { textShadow: '0 0 24px var(--gold), 0 0 48px rgba(212,175,55,0.4)' },
        },
      },
    },
  },
  plugins: [],
}
