'use client'
/** HUB-4 — STUB (chantier 4 remplit). Panneau « Comprendre ces données » :
 *  dictionnaire canonique des métriques (definition/source/freshness/how to read/
 *  what good/bad means/what to do/limitations). Accessible mobile + desktop. */
export default function GuideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-abyss p-6 text-sm text-pearl/60"
        onClick={(e) => e.stopPropagation()}
      >
        Guide d’interprétation — (stub)
      </div>
    </div>
  )
}
