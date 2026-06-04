'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Shield, Star, Crown, Sparkles } from 'lucide-react'
import { GivingButton } from '@/components/features/giving/GivingWidget'
import type { GivingProduct } from '@/lib/giving'
import { GIVING_FALLBACK } from '@/lib/giving'

const TYPE_EMOJI: Record<string, string> = {
  don: '💛', offrande: '🌹', inscription: '⭐', acces: '🗝️', partenariat: '👑',
}

// Causes soutenues (sans compteur de collecte fictif). La contribution se fait via Chariow.
const CAMPAGNES = [
  { id: '1', titre: 'Construction du Temple', description: 'Contribuez à la construction de notre temple pour accueillir plus de familles.', image: '🏛️', color: '#D4AF37' },
  { id: '2', titre: 'Missions Évangéliques', description: "Financer l'envoi de missionnaires dans les nations.", image: '🌍', color: '#22C55E' },
  { id: '3', titre: 'Bourses Étudiants CFIC', description: 'Permettre aux jeunes sans ressources d\'accéder à la formation théologique.', image: '📖', color: '#8B5CF6' },
]

export default function DonsPage() {
  // Catalogue administrable (Chariow) — fallback statique garanti.
  const [products, setProducts] = useState<GivingProduct[]>(GIVING_FALLBACK)

  useEffect(() => {
    let active = true
    fetch('/api/giving/products', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (active && json?.ok && Array.isArray(json.products) && json.products.length) {
          setProducts(json.products)
        }
      })
      .catch(() => { /* garde le fallback */ })
    return () => { active = false }
  }, [])

  return (
    <div className="min-h-screen bg-abyss pt-20">
      {/* Hero */}
      <div className="relative border-b border-pearl/5 pb-16 pt-16">
        <div className="absolute inset-0 bg-mesh" />
        <div className="relative container-royal text-center">
          <div className="section-label justify-center mb-4">Donner & Semer</div>
          <h1 className="font-cinzel text-4xl md:text-5xl font-black text-pearl mb-4">
            Soutenir
            <span className="text-gradient-gold block">l’œuvre du Royaume</span>
          </h1>
          <p className="text-pearl/50 font-inter text-lg max-w-2xl mx-auto mb-6">
            « Donnez, et il vous sera donné. » — Luc 6:38
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-pearl/40 flex-wrap">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-green-400" /> Paiement 100% sécurisé</span>
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-gold" /> Reçu disponible</span>
            <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-gold" /> Transparent & responsable</span>
          </div>
        </div>
      </div>

      <div className="container-royal py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Produits de soutien — left */}
          <div className="lg:col-span-3 space-y-5">
            <h2 className="font-cinzel text-xl font-bold text-pearl mb-2">Comment soutenir</h2>
            <p className="font-inter text-sm text-pearl/45 mb-4">
              Choisissez la manière qui vous correspond. Vous serez redirigé vers notre espace de paiement sécurisé.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
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
                    <div className="mt-5">
                      <GivingButton product={p} full />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 mt-6 text-xs text-pearl/30">
              <Shield className="w-3.5 h-3.5 text-green-400" />
              <span>Paiement sécurisé • Aucune donnée bancaire stockée sur ce site</span>
            </div>
          </div>

          {/* Right — Campaigns + impact */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-cinzel text-lg font-bold text-pearl mb-4">Campagnes Actives</h2>
              <div className="space-y-4">
                {CAMPAGNES.map((camp, i) => (
                  <motion.div key={camp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card-royal">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${camp.color}15` }}>
                        {camp.image}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-cinzel text-sm font-bold text-pearl mb-1">{camp.titre}</h3>
                        <p className="text-xs text-pearl/50 font-inter">{camp.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="card-royal">
              <h3 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4 text-gold" />
                Où va votre don
              </h3>
              <div className="space-y-3">
                {[
                  { action: 'Accompagnement des familles', icon: '👨‍👩‍👧‍👦' },
                  { action: 'Formation des disciples (CFIC)', icon: '📖' },
                  { action: 'Missions vers les nations', icon: '🌍' },
                  { action: 'Œuvre sociale & entraide', icon: '💚' },
                ].map((item) => (
                  <div key={item.action} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center">{item.icon}</span>
                    <span className="flex-1 text-sm text-pearl/60 font-inter">{item.action}</span>
                  </div>
                ))}
              </div>
              <p className="font-inter text-[11px] text-pearl/35 mt-4 pt-3 border-t border-pearl/5">
                Chaque don sert directement l&apos;œuvre. Un reçu vous est remis pour chaque contribution.
              </p>
            </div>

            <div className="card-royal text-center">
              <Sparkles className="w-5 h-5 text-gold mx-auto mb-2" />
              <p className="font-cormorant italic text-pearl/60 text-sm leading-relaxed">
                « Que celui qui sème abondamment moissonne abondamment. »<br />
                <span className="text-xs not-italic font-inter text-gold/70">— 2 Corinthiens 9:6</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
