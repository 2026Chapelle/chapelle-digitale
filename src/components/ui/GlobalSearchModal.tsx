'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, BookOpen, Play, Users, Calendar, FileText, ArrowRight, X, Flame, Heart, Headphones, Compass, MessageCircle } from 'lucide-react'
import Link from 'next/link'

const SEARCH_DATA = [
  {
    category: 'Formations',
    icon: BookOpen,
    color: '#8B5CF6',
    items: [
      { title: 'Les Fondements de la Foi', desc: 'Module 1 — 8 leçons', href: '/formations/fondements-foi', tags: ['foi', 'fondements', 'bible'] },
      { title: 'École du Prophète', desc: 'Formation prophétique avancée', href: '/formations/ecole-prophete', tags: ['prophétie', 'école', 'avancé'] },
      { title: 'Mariage & Famille', desc: 'Construire un foyer solide', href: '/formations/mariage-famille', tags: ['mariage', 'famille', 'couple'] },
      { title: 'Leadership Ministériel', desc: 'Former les serviteurs du Royaume', href: '/formations/leadership-ministeriel', tags: ['leadership', 'ministère', 'service'] },
      { title: 'Finances du Royaume', desc: 'Principes bibliques sur la prospérité', href: '/formations/finances-royaume', tags: ['finances', 'prospérité', 'argent'] },
    ]
  },
  {
    category: 'Plateformes',
    icon: Users,
    color: '#D4AF37',
    items: [
      { title: 'CIER — Corps Principal', desc: 'L\'Église au cœur du Royaume', href: '/plateformes/cier', tags: ['cier', 'principal', 'église'] },
      { title: 'Chapelle Familiale', desc: 'La famille au cœur de Dieu', href: '/plateformes/chapelle-familiale', tags: ['famille', 'chapelle'] },
      { title: 'CIER Jeunesse', desc: 'La génération en feu pour Dieu', href: '/plateformes/jeunesse', tags: ['jeunesse', 'jeunes', 'youth'] },
      { title: "Femmes d'Exceptions", desc: 'Femmes de destinée', href: '/plateformes/femmes-exceptions', tags: ['femmes', 'exceptions', 'destinée'] },
      { title: 'CFIC — Formation', desc: 'Institut de formation chrétienne', href: '/plateformes/cfic', tags: ['cfic', 'formation', 'institut'] },
      { title: 'Mahanaïm — Prière', desc: 'Camp de prière permanent', href: '/plateformes/mahanaim', tags: ['prière', 'mahanaim', 'intercession'] },
    ]
  },
  {
    category: 'Lives & Cultes',
    icon: Play,
    color: '#EF4444',
    items: [
      { title: 'Culte Dominical en Direct', desc: 'Chaque dimanche à 10h CET', href: '/live', tags: ['culte', 'dimanche', 'direct', 'live'] },
      { title: 'Soirée de Prière', desc: 'Mercredi 21h — Intercession mondiale', href: '/live', tags: ['prière', 'soirée', 'mercredi'] },
      { title: 'Replays & Archives', desc: 'Retrouver tous les cultes passés', href: '/member/dashboard/lives', tags: ['replay', 'archives'] },
    ]
  },
  {
    category: 'Événements',
    icon: Calendar,
    color: '#F59E0B',
    items: [
      { title: 'Convention Annuelle 2026', desc: '15-20 Août — Kinshasa & Online', href: '/evenements', tags: ['convention', 'annuelle', 'kinshasa'] },
      { title: 'Camp de Jeunesse', desc: '12-14 Juillet — Formation intensive', href: '/evenements', tags: ['camp', 'jeunesse', 'juillet'] },
      { title: 'Conférence des Femmes', desc: '5-6 Juin — « Femmes de Destinée »', href: '/evenements', tags: ['conférence', 'femmes', 'juin'] },
    ]
  },
  {
    category: 'Podcast',
    icon: Headphones,
    color: '#14B8A6',
    items: [
      { title: 'La Prière qui Change tout', desc: 'Épisode 12 · Série: Puissance de la Prière', href: '/podcast', tags: ['prière', 'puissance', 'podcast'] },
      { title: 'Identité en Christ', desc: 'Épisode 11 · Série: Fondements', href: '/podcast', tags: ['identité', 'christ', 'fondements', 'podcast'] },
      { title: 'Gérer ses Finances avec Foi', desc: 'Épisode 10 · Série: Vie Pratique', href: '/podcast', tags: ['finances', 'foi', 'pratique', 'podcast'] },
      { title: 'Le Don de Prophétie', desc: 'Épisode 9 · Série: Dons Spirituels', href: '/podcast', tags: ['prophétie', 'dons', 'spirituels', 'podcast'] },
      { title: 'Vaincre la Dépression', desc: 'Épisode 8 · Série: Santé Mentale & Foi', href: '/podcast', tags: ['dépression', 'santé', 'podcast'] },
    ]
  },
  {
    category: 'Espace Membre',
    icon: Compass,
    color: '#EC4899',
    items: [
      { title: 'Mon Parcours Disciple', desc: '5 étapes · Nouveau Croyant → Missionnaire', href: '/member/dashboard/parcours', tags: ['parcours', 'disciple', 'formation', 'étapes'] },
      { title: 'Messages & Conversations', desc: 'Messagerie directe avec la communauté', href: '/member/dashboard/messages', tags: ['messages', 'conversations', 'chat'] },
      { title: 'Paramètres du Compte', desc: 'Profil, sécurité, notifications', href: '/member/dashboard/parametres', tags: ['paramètres', 'profil', 'sécurité', '2fa', 'notifications'] },
      { title: 'Journal de Prière', desc: 'Mes prières et intentions quotidiennes', href: '/member/dashboard/prieres', tags: ['journal', 'prière', 'streak', 'dévotionnel'] },
      { title: 'Engagement & Badges', desc: 'Points XP, classement et récompenses', href: '/member/dashboard/engagement', tags: ['engagement', 'badges', 'xp', 'gamification'] },
    ]
  },
  {
    category: 'Pages',
    icon: FileText,
    color: '#22C55E',
    items: [
      { title: 'Faire un Don', desc: 'Soutenir le Royaume', href: '/dons', tags: ['don', 'dime', 'offrande'] },
      { title: 'Demander la Prière', desc: 'Soumettre une requête', href: '/priere', tags: ['prière', 'requête', 'intercession'] },
      { title: "Rejoindre l'Église", desc: 'Devenir membre de la CIER', href: '/rejoindre', tags: ['rejoindre', 'membre', 'inscription'] },
      { title: 'Notre Histoire', desc: 'Vision, mission & leadership', href: '/notre-histoire', tags: ['histoire', 'vision', 'mission'] },
      { title: 'Nous Contacter', desc: 'Coordonnées & formulaire', href: '/contact', tags: ['contact', 'email', 'téléphone'] },
      { title: 'Témoignages', desc: 'Histoires de transformation', href: '/temoignages', tags: ['témoignages', 'transformation', 'miracle'] },
      { title: 'Groupes & Cellules', desc: 'Rejoindre un groupe près de chez vous', href: '/groupes', tags: ['groupes', 'cellules', 'communauté'] },
    ]
  },
]

const QUICK_LINKS = [
  { label: 'Culte en Direct', href: '/live', icon: Flame, color: '#EF4444' },
  { label: 'Faire un Don', href: '/dons', icon: Heart, color: '#D4AF37' },
  { label: 'Mes Formations', href: '/member/dashboard/formations', icon: BookOpen, color: '#8B5CF6' },
  { label: 'Podcast', href: '/podcast', icon: Headphones, color: '#14B8A6' },
  { label: 'Mon Parcours', href: '/member/dashboard/parcours', icon: Compass, color: '#EC4899' },
  { label: 'Messages', href: '/member/dashboard/messages', icon: MessageCircle, color: '#0EA5E9' },
]

interface SearchResult {
  category: string
  icon: React.ElementType
  color: string
  title: string
  desc: string
  href: string
}

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return }
    const lower = q.toLowerCase()
    const found: SearchResult[] = []
    for (const group of SEARCH_DATA) {
      for (const item of group.items) {
        const hit =
          item.title.toLowerCase().includes(lower) ||
          item.desc.toLowerCase().includes(lower) ||
          item.tags.some(t => t.includes(lower))
        if (hit) {
          found.push({ category: group.category, icon: group.icon, color: group.color, ...item })
        }
      }
    }
    setResults(found)
    setSelectedIdx(0)
  }, [])

  useEffect(() => { search(query) }, [query, search])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && results[selectedIdx]) {
        window.location.href = results[selectedIdx].href
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, results, selectedIdx, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
            style={{ background: 'rgba(8,2,20,0.98)', border: '1px solid rgba(212,175,55,0.18)' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Recherche globale CIER"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-pearl/[0.06]">
              <Search className="w-5 h-5 text-pearl/30 flex-shrink-0" aria-hidden />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher formations, cultes, plateformes…"
                aria-label="Rechercher dans CIER"
                className="flex-1 bg-transparent text-pearl font-inter text-base outline-none placeholder:text-pearl/25"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-pearl/30 hover:text-pearl/60 transition-colors"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-pearl/20 font-inter bg-pearl/5 px-2 py-1 rounded-lg">
                <span className="font-bold">ESC</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {/* Results */}
              {query && results.length > 0 && (
                <div className="p-3">
                  {results.map((r, i) => (
                    <Link
                      key={`${r.href}-${i}`}
                      href={r.href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-100 group"
                      style={{
                        background: i === selectedIdx ? 'rgba(212,175,55,0.06)' : 'transparent',
                      }}
                      onMouseEnter={() => setSelectedIdx(i)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${r.color}15` }}>
                        <r.icon className="w-3.5 h-3.5" style={{ color: r.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-pearl font-inter truncate">{r.title}</div>
                        <div className="text-[11px] text-pearl/35 font-inter truncate">{r.desc}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-pearl/25 font-inter hidden sm:block">{r.category}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-pearl/20 group-hover:text-pearl/50 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* No results */}
              {query && results.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center" role="status" aria-live="polite">
                  <div
                    className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center"
                    style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)' }}
                  >
                    <Search className="w-5 h-5 text-gold/70" aria-hidden />
                  </div>
                  <p className="font-inter text-sm text-pearl/40">Aucun résultat pour <span className="text-pearl/70">« {query} »</span></p>
                  <p className="font-inter text-xs text-pearl/25 mt-1">Essayez un autre mot-clé</p>
                </div>
              )}

              {/* Quick links — empty state */}
              {!query && (
                <div className="p-5">
                  <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-pearl/25 font-inter mb-3">Accès rapides</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                    {QUICK_LINKS.map(link => (
                      <Link key={link.href} href={link.href} onClick={onClose}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-pearl/[0.04] transition-colors group">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${link.color}15` }}>
                          <link.icon className="w-3.5 h-3.5" style={{ color: link.color }} />
                        </div>
                        <span className="text-sm font-inter font-medium text-pearl/60 group-hover:text-pearl/90 transition-colors">{link.label}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-pearl/25 font-inter mb-3">Catégories</div>
                  <div className="flex flex-wrap gap-2">
                    {SEARCH_DATA.map(group => (
                      <button key={group.category}
                        onClick={() => setQuery(group.category.toLowerCase())}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-inter font-medium transition-all hover:scale-105"
                        style={{ background: `${group.color}12`, color: group.color, border: `1px solid ${group.color}25` }}>
                        <group.icon className="w-3 h-3" />
                        {group.category}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-pearl/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] text-pearl/20 font-inter">
                <span>↑↓ naviguer</span>
                <span>↵ ouvrir</span>
                <span>ESC fermer</span>
              </div>
              <div className="text-[10px] text-pearl/15 font-inter">CIER Search</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
