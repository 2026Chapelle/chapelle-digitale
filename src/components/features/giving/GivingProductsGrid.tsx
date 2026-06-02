'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GivingButton } from './GivingWidget'
import type { GivingProduct } from '@/lib/giving'
import { GIVING_FALLBACK } from '@/lib/giving'

const TYPE_EMOJI: Record<string, string> = {
  don: '💛', offrande: '🌹', inscription: '⭐', acces: '🗝️', partenariat: '👑',
}

/**
 * Grille de produits de soutien (Chariow) administrable.
 * Filtre optionnel par `page`. Fallback statique garanti.
 */
export function GivingProductsGrid({ page, columns = 3 }: { page?: string; columns?: 2 | 3 }) {
  const initial = page ? GIVING_FALLBACK.filter((p) => p.page === page) : GIVING_FALLBACK
  const [products, setProducts] = useState<GivingProduct[]>(initial.length ? initial : GIVING_FALLBACK)

  useEffect(() => {
    let active = true
    const url = page ? `/api/giving/products?page=${encodeURIComponent(page)}` : '/api/giving/products'
    fetch(url, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (active && json?.ok && Array.isArray(json.products) && json.products.length) {
          setProducts(json.products)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [page])

  return (
    <div className={`grid gap-5 ${columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
      {products.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-3xl border border-gold/15 overflow-hidden flex flex-col"
          style={{ background: 'linear-gradient(145deg, #0a0018 0%, #050505 100%)' }}
        >
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${p.button_color}, ${p.button_color}88)` }} />
          <div className="p-6 flex flex-col flex-1">
            <div className="text-3xl mb-3">{TYPE_EMOJI[p.type] || '💛'}</div>
            <h3 className="font-cinzel text-base font-bold text-pearl mb-1.5">{p.public_title}</h3>
            <p className="font-inter text-sm text-pearl/50 leading-relaxed flex-1">{p.public_description}</p>
            <div className="mt-5"><GivingButton product={p} full /></div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
