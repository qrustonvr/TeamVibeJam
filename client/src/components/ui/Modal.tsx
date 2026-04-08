import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0d1f0d 0%, #0a1a0a 100%)',
          border: '1px solid var(--gold-dim)',
          boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px var(--gold-dim)',
        }}
      >
        {title && (
          <div
            className="px-6 py-4 border-b font-display text-lg tracking-widest uppercase"
            style={{
              borderColor: 'var(--gold-dim)',
              color: 'var(--gold)',
            }}
          >
            {title}
          </div>
        )}
        <div className="px-6 py-6">{children}</div>
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-300 transition-colors text-xl leading-none font-body"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>,
    document.body,
  )
}
