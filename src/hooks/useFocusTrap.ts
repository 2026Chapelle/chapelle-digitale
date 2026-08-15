'use client'
/**
 * PODCAST-9 / D3 — Piège à focus accessible réutilisable pour modales / sheets.
 *
 * Fournit, pour un conteneur de dialogue (role="dialog" aria-modal="true") :
 *   • focus initial correct à l'ouverture (ref fournie, sinon 1er élément focusable) ;
 *   • Tab / Shift+Tab qui bouclent DANS le conteneur (jamais de fuite vers l'arrière-plan) ;
 *   • Échap qui déclenche la fermeture (via onEscape) ;
 *   • restauration du focus sur l'élément déclencheur à la fermeture.
 *
 * Aucune dépendance externe. N'altère PAS l'aria/labels existants du conteneur :
 * on lit uniquement ses éléments focusables. Le clic sur l'overlay (fermeture) reste
 * géré par le composant appelant.
 *
 * Usage :
 *   const panelRef = useFocusTrap<HTMLDivElement>(open, { onEscape: onClose, initialFocusRef: closeRef })
 *   <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true">…</div>
 */
import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface FocusTrapOptions {
  /** Appelé quand Échap est pressé (fermeture). */
  onEscape?: () => void
  /** Élément à focaliser en priorité à l'ouverture (sinon 1er focusable). */
  initialFocusRef?: RefObject<HTMLElement>
}

export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  options: FocusTrapOptions = {},
): RefObject<T> {
  const containerRef = useRef<T>(null)
  // Refs « live » : évitent de relancer l'effet (donc de re-focaliser) à chaque
  // nouvelle closure d'onEscape / initialFocusRef passée par le parent.
  const onEscapeRef = useRef(options.onEscape)
  onEscapeRef.current = options.onEscape
  const initialFocusRef = options.initialFocusRef

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container || typeof document === 'undefined') return

    // Élément à re-focaliser à la fermeture (le déclencheur qui avait le focus).
    const previouslyFocused = document.activeElement as HTMLElement | null

    const getFocusable = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0)

    // Focus initial (après le rendu du conteneur).
    const initial = initialFocusRef?.current ?? getFocusable()[0] ?? container
    initial.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscapeRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = getFocusable()
      if (focusables.length === 0) {
        // Rien de focalisable → garder le focus sur le conteneur.
        e.preventDefault()
        container.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const activeEl = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      // Restaure le focus sur le déclencheur (s'il est encore dans le DOM).
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
    // initialFocusRef est stable (ref objet) ; onEscape est lu via onEscapeRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return containerRef
}
