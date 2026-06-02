'use client'
/**
 * OFFRANDE EN DIRECT — bouton + modal premium pour donner SANS quitter le live.
 *
 * Le lecteur reste monté derrière la modale (overlay) : aucun rechargement, aucun
 * départ de page. Paiement via le widget Chariow intégré (repli lien direct
 * garanti). L'intention est tracée avec source=live + programme concerné.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, HandCoins, X, Loader2, ShieldCheck, ExternalLink } from 'lucide-react'
import type { GivingProduct } from '@/lib/giving'
import { ChariowEmbed, GivingButton } from './GivingWidget'

interface Props {
  programme: string
}

const OFFER_TYPES = new Set(['don', 'offrande', 'partenariat'])

export default function LiveOffering({ programme }: Props) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<GivingProduct[]>([])
  const [selected, setSelected] = useState<GivingProduct | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function ensureProducts() {
    if (loaded) return
    setLoading(true)
    try {
      const r = await fetch('/api/dons')
      const j = await r.json()
      const list: GivingProduct[] = (j.data || []).filter((p: GivingProduct) => OFFER_TYPES.has(p.type))
      const finalList = list.length ? list : (j.data || [])
      setProducts(finalList)
      setSelected(finalList[0] ?? null)
    } catch { /* vide */ }
    setLoading(false); setLoaded(true)
  }

  function openModal(slugHint?: string) {
    setOpen(true)
    ensureProducts()
    // Trace l'intention (source=live + programme).
    try {
      fetch('/api/dons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slugHint, source: 'live', programme }),
      })
    } catch { /* non bloquant */ }
  }

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const confirmHref = `/dons/confirmation?source=live&programme=${encodeURIComponent(programme)}`

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => openModal()}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-inter text-sm font-bold transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
          <HandCoins className="w-4 h-4" /> Faire mon offrande
        </button>
        <button onClick={() => openModal()}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-inter text-sm font-semibold border border-gold/30 text-gold hover:bg-gold/10 transition-all">
          <Heart className="w-4 h-4" /> Soutenir ce programme
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-3xl border border-gold/25 bg-abyss p-4 sm:p-6"
              style={{ background: 'linear-gradient(160deg, #14101f, #0b0810)' }}>
              <button onClick={() => setOpen(false)} aria-label="Fermer"
                className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-pearl/15 text-pearl/70 hover:text-pearl">
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center mx-auto mb-3">
                  <HandCoins className="w-5 h-5 text-gold" />
                </div>
                <h2 className="font-cinzel text-lg font-black text-pearl">Faire mon offrande</h2>
                <p className="font-inter text-xs text-pearl/45 mt-1">Le direct continue — votre offrande s&apos;ouvre ici, sans quitter le culte.</p>
                {programme && <p className="font-inter text-[11px] text-gold/70 mt-1">{programme}</p>}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
              ) : !selected ? (
                <p className="text-center text-sm text-pearl/40 font-inter py-8">Aucune option d&apos;offrande disponible pour le moment.</p>
              ) : (
                <>
                  {products.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-4 justify-center">
                      {products.map((p) => (
                        <button key={p.id} onClick={() => setSelected(p)}
                          className={`text-xs font-inter font-semibold px-3 py-1.5 rounded-full border transition-all ${
                            selected.id === p.id ? 'bg-gold text-black border-transparent' : 'bg-white/5 text-pearl/60 border-pearl/10 hover:text-pearl'
                          }`}>
                          {p.public_title}
                        </button>
                      ))}
                    </div>
                  )}

                  {selected.public_description && (
                    <p className="font-inter text-xs text-pearl/50 text-center mb-4">{selected.public_description}</p>
                  )}

                  {/* Widget Chariow intégré (repli lien direct garanti dans le composant). */}
                  <div className="mb-3">
                    <ChariowEmbed key={selected.id} product={selected} />
                  </div>
                  <GivingButton product={selected} full />

                  <div className="mt-4 pt-4 border-t border-white/5 text-center space-y-2">
                    <p className="inline-flex items-center gap-1.5 text-[11px] text-pearl/40 font-inter">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70" /> Paiement sécurisé · reçu envoyé par email
                    </p>
                    <a href={confirmHref} className="block text-[11px] text-gold/70 hover:text-gold font-inter inline-flex items-center gap-1 justify-center">
                      J&apos;ai fait mon offrande <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
