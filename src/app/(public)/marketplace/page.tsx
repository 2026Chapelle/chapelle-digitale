'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, BookOpen, GraduationCap, Ticket, Repeat, FileText, Package, ExternalLink, Loader2, Search } from 'lucide-react'
import Link from 'next/link'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { HERO_IMAGES } from '@/lib/images'

interface Produit {
  id: string; slug: string; titre: string; description: string | null; type: string
  prix: number; devise: string; cover_url: string | null; lien_achat: string | null
  acces_type: string; plateforme: string | null
}

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  ebook: { label: 'E-book', icon: BookOpen, color: '#0EA5E9' },
  livre: { label: 'Livre', icon: BookOpen, color: '#8B5CF6' },
  masterclass: { label: 'Masterclass', icon: GraduationCap, color: '#D4AF37' },
  formation: { label: 'Formation', icon: GraduationCap, color: '#22C55E' },
  billet: { label: 'Billet', icon: Ticket, color: '#EC4899' },
  abonnement: { label: 'Abonnement', icon: Repeat, color: '#F59E0B' },
  numerique: { label: 'Numérique', icon: FileText, color: '#0EA5E9' },
  physique: { label: 'Produit', icon: Package, color: '#A855F7' },
}
const meta = (t: string) => TYPE_META[t] || TYPE_META.numerique

export default function MarketplacePage() {
  const [produits, setProduits] = useState<Produit[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (IS_DEMO_MODE) { setLoaded(true); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('marketplace_products')
          .select('id, slug, titre, description, type, prix, devise, cover_url, lien_achat, acces_type, plateforme')
          .eq('actif', true).order('created_at', { ascending: false })
        if (!cancelled && data) setProduits(data as Produit[])
      } catch { /* */ }
      finally { if (!cancelled) setLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [])

  const types = useMemo(() => Array.from(new Set(produits.map((p) => p.type))), [produits])
  const filtered = produits.filter((p) =>
    (filter === 'all' || p.type === filter) &&
    (!q || p.titre.toLowerCase().includes(q.toLowerCase()) || (p.description || '').toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <div className="min-h-screen pb-32">
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-12 px-4">
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <PremiumImage image={HERO_IMAGES.worship} fill priority overlay="heavy" sizes="100vw" />
        </div>
        <div className="absolute inset-0 pointer-events-none"><div className="halo-gold w-[900px] h-[500px] -top-20 left-1/2 -translate-x-1/2" /></div>
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-inter text-xs font-bold tracking-[0.25em] uppercase mb-6 backdrop-blur-md"
              style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.3)', color: '#F5E6A7' }}>
              <ShoppingBag className="w-3.5 h-3.5" /> Boutique du Royaume
            </div>
            <h1 className="heading-cinematic-xl mb-5">Ressources pour<span className="block text-cinematic-gold">Grandir & Servir</span></h1>
            <p className="font-inter text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(245,230,216,0.6)' }}>
              E-books, masterclass, formations, billets d'événements — un seul lieu pour vous équiper spirituellement.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
        {/* Filtres */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(245,230,216,0.3)' }} />
            <input type="text" placeholder="Rechercher une ressource…" value={q} onChange={(e) => setQ(e.target.value)} className="input-cinematic pl-11" />
          </div>
        </div>
        {types.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-8">
            {['all', ...types].map((t) => (
              <button key={t} onClick={() => setFilter(t)}
                className="px-4 py-2 rounded-full text-xs font-inter font-semibold transition-all"
                style={filter === t ? { background: 'linear-gradient(135deg,#D4AF37,#92721A)', color: '#1A0F00' } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,216,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {t === 'all' ? 'Tout' : meta(t).label}
              </button>
            ))}
          </div>
        )}

        {/* Grille */}
        {!loaded ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-16 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="card-cinematic text-center py-20">
            <ShoppingBag className="w-8 h-8 mx-auto mb-3 text-gold/40" />
            <p className="font-cinzel text-xl text-white mb-2">{q || filter !== 'all' ? 'Aucune ressource trouvée' : 'La boutique ouvre bientôt'}</p>
            <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.45)' }}>Nos premières ressources arrivent très prochainement.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((p, i) => {
              const M = meta(p.type)
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="card-cinematic overflow-hidden flex flex-col">
                  <div className="relative aspect-[16/10] overflow-hidden" style={{ background: `${M.color}10` }}>
                    {p.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover_url} alt={p.titre} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center"><M.icon className="w-10 h-10" style={{ color: `${M.color}80` }} /></div>
                    )}
                    <span className="absolute top-3 left-3 text-[10px] font-bold font-inter px-2.5 py-1 rounded-full" style={{ background: `${M.color}25`, color: '#fff', border: `1px solid ${M.color}50` }}>{M.label}</span>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-cinzel text-lg font-bold text-white mb-1.5 leading-snug">{p.titre}</h3>
                    {p.description && <p className="font-inter text-xs mb-4 line-clamp-2" style={{ color: 'rgba(245,230,216,0.5)' }}>{p.description}</p>}
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <span className="font-cinzel text-lg font-black text-cinematic-gold">{p.prix > 0 ? `${p.prix.toLocaleString('fr-FR')} ${p.devise}` : 'Gratuit'}</span>
                      {p.lien_achat ? (
                        <a href={p.lien_achat} target="_blank" rel="noopener noreferrer" data-track="achat" data-track-label={p.titre}
                          className="btn-gold-cinematic text-sm py-2 px-4 inline-flex items-center gap-1.5">Obtenir <ExternalLink className="w-3.5 h-3.5" /></a>
                      ) : (
                        <span className="text-xs font-inter px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(245,230,216,0.4)' }}>Bientôt</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        <div className="text-center mt-12">
          <Link href="/member/dashboard/achats" className="font-inter text-sm text-gold/70 hover:text-gold inline-flex items-center gap-1.5">
            Déjà acheté ? Accéder à mes ressources <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
