'use client'

import { useEffect, useId, useRef } from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Dialogue de confirmation accessible (native <dialog>).
 * Escape / Annuler / backdrop → onCancel ; focus initial sur Annuler.
 */
export function ConfirmAction({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) {
      if (!el.open) el.showModal()
      // focus trap léger : Annuler d'abord
      queueMicrotask(() => cancelRef.current?.focus())
    } else if (el.open) {
      el.close()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 m-auto max-w-md w-[min(100%,24rem)] rounded-2xl border border-white/10 bg-[#12101a] p-0 text-pearl shadow-2xl open:flex open:flex-col"
      style={{ background: 'rgba(18, 16, 26, 0.98)' }}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current && !busy) onCancel()
      }}
    >
      <div className="p-5 space-y-3">
        <h3 id={titleId} className="font-cinzel text-sm font-bold text-pearl">
          {title}
        </h3>
        <p id={descId} className="text-xs font-inter text-pearl/60 leading-relaxed whitespace-pre-line">
          {description}
        </p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            className="px-3 py-2 rounded-xl text-xs font-inter text-pearl/70 hover:bg-white/5 disabled:opacity-40"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            className={
              danger
                ? 'px-3 py-2 rounded-xl text-xs font-inter font-semibold bg-danger/20 text-danger border border-danger/40 disabled:opacity-40'
                : 'btn-gold-cinematic px-3 py-2 text-xs disabled:opacity-40'
            }
            onClick={onConfirm}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
