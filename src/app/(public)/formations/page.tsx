'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  BookOpen, Clock, Award, ChevronRight, Search, Star, Zap,
  GraduationCap, Sparkles, Play,
} from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Type d'affichage dérivé du champ ADMINISTRABLE `formations.type` (ENUM existant :
 * cours | atelier | certification | parcours | masterclass). Aucune donnée figée :
 * l'admin pilote le type depuis /admin/formations. Fallback propre sur « Formation ».
 */
type DisplayType = 'Formation' | 'Programme' | 'Enseignement' | 'Parcours'

const TYPE_TABS = ['Tous', 'Parcours', 'Formation', 'Programme', 'Enseignement'] as const
type TypeTab = typeof TYPE_TABS[number]
const TYPE_TAB_LABEL: Record<TypeTab, string> = {
  Tous: 'Tous', Parcours: 'Parcours', Formation: 'Formations', Programme: 'Programmes', Enseignement: 'Enseignements',
}
const TYPE_CTA: Record<DisplayType, string> = {
  Parcours: 'Commencer le parcours', Formation: 'Suivre la formation',
  Programme: 'Découvrir le programme', Enseignement: "Regarder l'enseignement",
}

function deriveDisplayType(type?: string | null): DisplayType {
  switch ((type || '').toLowerCase()) {
    case 'masterclass': return 'Enseignement'
    case 'parcours': return 'Parcours'
    case 'certification': return 'Programme'
    default: return 'Formation' // cours | atelier | valeur absente → Formation
  }
}

/** Formation publiée réelle (table formations), normalisée pour l'affichage. */
interface PubFormation {
  id: string; slug: string; titre: string; description: string
  categorie: string; niveau: string; certifie: boolean; instructeur: string
  duree: string; image?: string | null; couleur: string; emoji: string
  displayType: DisplayType
}

function mapFormation(f: any): PubFormation {
  const niveau = f.niveau ? String(f.niveau) : ''
  return {
    id: f.id, slug: f.slug || '', titre: f.titre || 'Formation',
    description: f.contenu_court || f.description || '',
    categorie: niveau || (f.type ? String(f.type) : 'Formation'),
    niveau, certifie: !!f.certifiant, instructeur: f.instructeur_nom || 'Citadelle',
    duree: f.duree_heures ? `${f.duree_heures}h` : '',
    image: f.image_couverture || null, couleur: '#D4AF37', emoji: f.certifiant ? '🏆' : '📚',
    displayType: deriveDisplayType(f.type),
  }
}

export default function FormationsPublicPage() {
  const [items, setItems] = useState<PubFormation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategorie, setActiveCategorie] = useState('Tout')
  const [activeType, setActiveType] = useState<TypeTab>('Tous')

  useEffect(() => {
    if (IS_DEMO_MODE) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('formations')
          .select('id, titre, slug, niveau, type, certifiant, instructeur_nom, contenu_court, image_couverture, duree_heures, statut')
          .eq('statut', 'publie').order('created_at', { ascending: false })
        if (!cancelled && data) setItems(data.map(mapFormation))
      } catch { /* vide */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(() => ['Tout', ...Array.from(new Set(items.map((f) => f.categorie).filter(Boolean)))], [items])

  const filtered = items.filter((f) => {
    const matchType = activeType === 'Tous' || f.displayType === activeType
    const matchCat = activeCategorie === 'Tout' || f.categorie === activeCategorie
    const matchSearch = !search || f.titre.toLowerCase().includes(search.toLowerCase()) || f.instructeur.toLowerCase().includes(search.toLowerCase())
    return matchType && matchCat && matchSearch
  })

  // Porte d'entrée « nouveau croyant » : dérivée du réel (aucun lien codé en dur).
  const nouveauCroyant = items.find((f) => f.slug === 'nouveau-croyant')

  const stats = [
    { value: String(items.length), label: 'Formations', icon: BookOpen, color: '#D4AF37' },
    { value: String(items.filter((f) => f.certifie).length), label: 'Certifiantes', icon: Award, color: '#22C55E' },
    { value: String(new Set(items.map((f) => f.instructeur)).size), label: 'Instructeurs', icon: Star, color: '#EC4899' },
  ]

  return (
    <div className="min-h-screen pb-20">
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-12 px-4">
        <div className="absolute inset-0 pointer-events-none"><div className="halo-gold w-[1100px] h-[600px] -top-40 left-1/2 -translate-x-1/2" /></div>
        <div className="max-w-3xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="section-label-dark justify-center"><GraduationCap className="w-3 h-3" /> Académie Spirituelle</div>
            <h1 className="heading-cinematic-xl mb-6">Grandir avec <span className="text-cinematic-gold">La Citadelle</span></h1>
            <p className="text-base md:text-lg font-inter leading-relaxed mb-8 mx-auto max-w-lg" style={{ color: 'rgba(245,230,216,0.6)' }}>
              Formations, programmes, enseignements et parcours pour accompagner votre croissance spirituelle.
            </p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(245,230,216,0.4)' }} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une formation, un instructeur..." className="input-cinematic pl-11" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-cinematic overflow-hidden animate-pulse">
                <div className="h-44" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="p-5 space-y-3">
                  <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.06)', width: '40%' }} />
                  <div className="h-4 rounded" style={{ background: 'rgba(255,255,255,0.08)', width: '80%' }} />
                  <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.05)', width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 card-cinematic">
            <div className="text-5xl mb-4">📚</div>
            <p className="font-cinzel text-xl text-white mb-2">Aucune formation publiée pour le moment</p>
            <p className="font-inter text-sm mb-6" style={{ color: 'rgba(245,230,216,0.45)' }}>Revenez bientôt — de nouveaux parcours arrivent.</p>
            <Link href="/rejoindre" className="btn-gold-cinematic inline-flex"><Zap className="w-4 h-4" /> Rejoindre la CIER</Link>
          </div>
        ) : (
          <>
            {/* Stats réelles */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-10">
              {stats.map((s) => (
                <div key={s.label} className="card-cinematic p-5 text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2" style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <div className="font-cinzel font-black text-2xl text-white">{s.value}</div>
                  <div className="font-inter text-[11px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(245,230,216,0.45)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Porte d'entrée nouveau croyant — affichée seulement si le parcours existe réellement */}
            {nouveauCroyant && activeType === 'Tous' && !search && (
              <Link href={`/formations/${nouveauCroyant.slug}`} className="card-cinematic-gold flex items-center gap-4 p-5 mb-8 group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: 'rgba(212,175,55,0.15)' }}>🕊️</div>
                <div className="flex-1 min-w-0">
                  <p className="font-cinzel font-bold text-white text-base">Nouveau dans la foi ?</p>
                  <p className="font-inter text-xs" style={{ color: 'rgba(245,230,216,0.6)' }}>Commencez ici : le Parcours Nouveau Croyant vous guide pas à pas.</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-inter font-bold flex-shrink-0 transition-all group-hover:gap-2" style={{ color: '#D4AF37' }}>Commencer <ChevronRight className="w-3.5 h-3.5" /></span>
              </Link>
            )}

            {/* Onglets par TYPE de contenu — dérivés du champ administrable formations.type */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {TYPE_TABS.map((t) => {
                const active = activeType === t
                return (
                  <button key={t} onClick={() => setActiveType(t)}
                    className="px-4 py-2 rounded-full text-xs font-inter font-semibold transition-all whitespace-nowrap"
                    style={active
                      ? { background: 'linear-gradient(135deg, #F5E6A7, #D4AF37)', color: '#1A0F00', boxShadow: '0 4px 16px rgba(212,175,55,0.4)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,216,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {TYPE_TAB_LABEL[t]}
                  </button>
                )
              })}
            </div>

            {/* Filtres par niveau (dérivés du réel) */}
            {categories.length > 2 && (
              <div className="flex gap-2 flex-wrap mb-8">
                {categories.map((cat) => {
                  const active = activeCategorie === cat
                  return (
                    <button key={cat} onClick={() => setActiveCategorie(cat)}
                      className="px-4 py-2 rounded-full text-xs font-inter font-semibold transition-all capitalize"
                      style={active
                        ? { background: 'linear-gradient(135deg, #F5E6A7, #D4AF37)', color: '#1A0F00', boxShadow: '0 4px 16px rgba(212,175,55,0.4)' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(245,230,216,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {cat}
                    </button>
                  )
                })}
              </div>
            )}

            <h3 className="font-cinzel text-lg font-bold text-white mb-6 flex items-center gap-3">
              <Sparkles className="w-4 h-4" style={{ color: '#D4AF37' }} /> {activeType === 'Tous' ? 'Tout le contenu' : TYPE_TAB_LABEL[activeType]}
            </h3>

            {/* Les enseignements ont leur espace dédié (/enseignements) — renvoi, jamais une grille dupliquée */}
            {activeType === 'Enseignement' && (
              <Link href="/enseignements" className="card-cinematic flex items-center gap-4 p-6 mb-6 group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: 'rgba(212,175,55,0.12)' }}>🎧</div>
                <div className="flex-1 min-w-0">
                  <p className="font-cinzel font-bold text-white text-base">Les enseignements ont leur espace dédié</p>
                  <p className="font-inter text-xs" style={{ color: 'rgba(245,230,216,0.55)' }}>Messages, prédications et masterclass à écouter librement.</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-inter font-bold flex-shrink-0 transition-all group-hover:gap-2" style={{ color: '#D4AF37' }}>Découvrir <ChevronRight className="w-3.5 h-3.5" /></span>
              </Link>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((f, i) => (
                <motion.div key={f.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + (i % 9) * 0.05 }}>
                  <FormationCard f={f} />
                </motion.div>
              ))}
            </div>
            {filtered.length === 0 && activeType !== 'Enseignement' && (
              <div className="text-center py-16 card-cinematic">
                <p className="font-cinzel text-lg text-white mb-1">
                  {activeType === 'Tous' ? 'Aucune formation trouvée' : `Aucun contenu « ${TYPE_TAB_LABEL[activeType]} » pour l'instant`}
                </p>
                <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.45)' }}>
                  {search ? 'Essayez un autre terme ou une autre catégorie.' : 'Revenez bientôt — de nouveaux contenus arrivent.'}
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="mt-16 card-cinematic-gold p-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.18) 0%, transparent 60%)' }} />
              <div className="relative">
                <h2 className="font-cinzel text-3xl md:text-4xl font-black text-cinematic-gold mb-3 leading-tight">Accédez à toutes les formations</h2>
                <p className="font-inter text-base mb-8 max-w-md mx-auto" style={{ color: 'rgba(245,230,216,0.65)' }}>
                  Rejoignez la CIER pour suivre les parcours, les replays et un cheminement de disciple personnalisé.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/rejoindre" className="btn-gold-cinematic"><Zap className="w-4 h-4" /> Rejoindre la CIER</Link>
                  <Link href="/login" className="btn-glass-cinematic">Déjà membre ? Se connecter</Link>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function FormationCard({ f }: { f: PubFormation }) {
  return (
    <Link href={`/formations/${f.slug}`} className="flex flex-col h-full card-cinematic overflow-hidden group">
      <div className="relative h-44 flex-shrink-0 overflow-hidden">
        {f.image ? (
          <Image src={f.image} alt={f.titre} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
            style={{ background: `radial-gradient(circle at 30% 30%, ${f.couleur}55 0%, transparent 60%), linear-gradient(135deg, ${f.couleur}25 0%, #050308 100%)` }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(5,3,8,0.85) 100%)' }} />
        {!f.image && <div className="absolute inset-0 flex items-center justify-center"><span className="text-7xl drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]">{f.emoji}</span></div>}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="chip-gold backdrop-blur-md">{f.displayType}</span>
          {f.niveau && (
            <span className="text-[9px] font-inter font-bold tracking-widest uppercase px-2 py-0.5 rounded-full backdrop-blur-md capitalize"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.2)' }}>{f.niveau}</span>
          )}
          {f.certifie && <span className="chip-gold backdrop-blur-md"><Award className="w-2.5 h-2.5" /> Certifié</span>}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.25)', border: '2px solid rgba(212,175,55,0.6)', backdropFilter: 'blur(20px)' }}>
            <Play className="w-5 h-5 ml-0.5" fill="#FFFFFF" color="#FFFFFF" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          {f.categorie && <span className="text-[10px] font-inter font-bold tracking-widest uppercase block mb-1 capitalize" style={{ color: f.couleur }}>{f.categorie}</span>}
          <h3 className="font-cinzel font-bold text-base text-white leading-tight line-clamp-2">{f.titre}</h3>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <p className="text-xs font-inter mb-1" style={{ color: 'rgba(245,230,216,0.45)' }}>
          par <span className="font-semibold" style={{ color: 'rgba(245,230,216,0.7)' }}>{f.instructeur}</span>
        </p>
        {f.description && <p className="text-xs font-inter leading-relaxed line-clamp-2 mb-4" style={{ color: 'rgba(245,230,216,0.5)' }}>{f.description}</p>}
        <div className="flex items-center justify-between pt-3 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3 text-xs font-inter" style={{ color: 'rgba(245,230,216,0.4)' }}>
            {f.duree && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{f.duree}</span>}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-inter font-bold transition-all group-hover:gap-2" style={{ color: f.couleur }}>
            {TYPE_CTA[f.displayType]} <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
