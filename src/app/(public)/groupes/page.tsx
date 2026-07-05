'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, MapPin, Globe, Search, ArrowRight, Video, Calendar, Loader2, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'

/**
 * Annuaire PUBLIC des groupes & cellules (lecture seule, anonyme).
 * Aucune donnée fictive : la liste est chargée depuis l'API /api/groupes.
 * Aucun chat, aucune liste de membres, aucune action d'écriture.
 * Un visiteur public n'est pas connecté : pas de bouton « Rejoindre » fonctionnel,
 * seulement une invitation à se connecter / s'inscrire.
 */

type Groupe = {
  id: string
  nom: string
  description: string | null
  type: string
  plateforme_id: string
  ville: string | null
  pays: string | null
  jour_reunion: string | null
  heure_reunion: string | null
  est_virtuel: boolean
  membres_count: number
  capacite_max: number | null
  statut: string
}

const PLATEFORMES: Record<string, string> = {
  'cier': 'CIER',
  'familles-chapelle': 'Familles de la Chapelle',
  'chapelle-familiale': 'Chapelle Familiale',
  'jeunesse': 'Jeunesse',
  'femmes-exceptions': "Femmes d'Exceptions",
  'cite-refuge': 'Cité du Refuge',
  'mahanaim': 'Mahanaïm',
  'cfic': 'CFIC / Académie des Élus',
}

const TYPES: Record<string, string> = {
  'cellule': 'Cellule',
  'groupe_priere': 'Groupe de prière',
  'equipe_service': 'Équipe de service',
  'equipe_ministere': 'Équipe de ministère',
  'formation': 'Formation',
  'departement': 'Département',
}

const plateformeLabel = (v: string) => PLATEFORMES[v] || v || '—'
const typeLabel = (v: string) => TYPES[v] || v || '—'

export default function GroupesPage() {
  // Détection de session (cookies) : un membre connecté doit voir « Rejoindre »,
  // pas « Connectez-vous ». Réutilise le hook d'auth existant (source de vérité).
  const { user } = useAuth()
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [searchQuery, setSearchQuery] = useState('')
  const [plateformeFilter, setPlateformeFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [paysFilter, setPaysFilter] = useState('')
  const [villeFilter, setVilleFilter] = useState('')

  // Chargement initial (lecture seule) — l'API reste filtrée côté client ensuite.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fetch('/api/groupes', { cache: 'no-store' })
      .then(r => r.json())
      .then((json: any) => {
        if (!active) return
        if (json?.ok && Array.isArray(json.data)) {
          setGroupes(json.data as Groupe[])
        } else {
          setGroupes([])
          if (json && json.ok === false) setError(json.message || 'Erreur de chargement')
        }
      })
      .catch(() => {
        if (active) setError('Impossible de charger les groupes pour le moment.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  // Liste des pays présents dans les données (select dérivé)
  const paysOptions = useMemo(() => {
    const set = new Set<string>()
    groupes.forEach(g => { if (g.pays) set.add(g.pays) })
    return Array.from(set).sort()
  }, [groupes])

  // Filtrage côté client (filtres + recherche texte)
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return groupes.filter(g => {
      if (plateformeFilter && g.plateforme_id !== plateformeFilter) return false
      if (typeFilter && g.type !== typeFilter) return false
      if (paysFilter && (g.pays || '') !== paysFilter) return false
      if (villeFilter && !(g.ville || '').toLowerCase().includes(villeFilter.trim().toLowerCase())) return false
      if (q) {
        const hay = `${g.nom} ${g.ville || ''} ${g.pays || ''} ${plateformeLabel(g.plateforme_id)} ${typeLabel(g.type)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [groupes, plateformeFilter, typeFilter, paysFilter, villeFilter, searchQuery])

  const hasActiveFilters = !!(searchQuery || plateformeFilter || typeFilter || paysFilter || villeFilter)
  const resetFilters = () => {
    setSearchQuery(''); setPlateformeFilter(''); setTypeFilter(''); setPaysFilter(''); setVilleFilter('')
  }

  return (
    <div className="min-h-screen bg-abyss">
      {/* Hero */}
      <div className="relative pt-32 pb-16 border-b border-pearl/5">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />
        <div className="relative container-royal text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-label justify-center mb-4">Communauté</div>
            <h1 className="font-cinzel text-4xl md:text-5xl font-black text-pearl mb-4">
              Groupes &
              <span className="text-gradient-gold block">Cellules</span>
            </h1>
            <p className="font-inter text-pearl/50 max-w-xl mx-auto mb-8">
              Rejoignez une cellule près de chez vous ou en ligne. La communauté chrétienne se vit aussi en petit groupe.
            </p>

            {/* Présentation (sans chiffres fictifs) */}
            <div className="flex items-center justify-center gap-6 text-xs text-pearl/40 flex-wrap">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gold" /> En présentiel</span>
              <span className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5 text-gold" /> En ligne</span>
              <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-gold" /> Partout dans le monde</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container-royal py-12">
        {/* Filtres — affichés dès qu'au moins un groupe est publié */}
        {!loading && groupes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mb-8 space-y-4"
          >
            {/* Recherche texte */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, ville, plateforme…"
                className="input-royal pl-11 w-full"
              />
            </div>

            {/* Sélecteurs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={plateformeFilter}
                onChange={e => setPlateformeFilter(e.target.value)}
                className="input-royal w-full"
                aria-label="Filtrer par plateforme"
              >
                <option value="">Toutes les plateformes</option>
                {Object.entries(PLATEFORMES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="input-royal w-full"
                aria-label="Filtrer par type"
              >
                <option value="">Tous les types</option>
                {Object.entries(TYPES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              <select
                value={paysFilter}
                onChange={e => setPaysFilter(e.target.value)}
                className="input-royal w-full"
                aria-label="Filtrer par pays"
              >
                <option value="">Tous les pays</option>
                {paysOptions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <input
                type="text"
                value={villeFilter}
                onChange={e => setVilleFilter(e.target.value)}
                placeholder="Ville…"
                className="input-royal w-full"
                aria-label="Filtrer par ville"
              />
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between text-xs text-pearl/40 font-inter">
                <span>{filtered.length} groupe{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}</span>
                <button onClick={resetFilters} className="text-gold hover:underline">
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div>
            <div className="flex items-center justify-center gap-2 text-pearl/40 font-inter text-sm mb-8">
              <Loader2 className="w-4 h-4 animate-spin text-gold" />
              Chargement des groupes…
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card-royal animate-pulse">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-pearl/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-2 w-1/2 rounded bg-pearl/5" />
                      <div className="h-3 w-3/4 rounded bg-pearl/10" />
                    </div>
                  </div>
                  <div className="h-3 w-2/3 rounded bg-pearl/5 mb-3" />
                  <div className="h-3 w-full rounded bg-pearl/5 mb-2" />
                  <div className="h-3 w-5/6 rounded bg-pearl/5 mb-4" />
                  <div className="h-1 w-full rounded-full bg-pearl/5 mb-4" />
                  <div className="h-8 w-full rounded-xl bg-pearl/5" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Erreur honnête */}
        {!loading && error && (
          <div className="text-center py-16 card-royal mb-12">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="font-cinzel text-lg text-pearl/50">{error}</p>
            <p className="font-inter text-sm text-pearl/30 mt-2">
              Veuillez réessayer dans un instant.
            </p>
          </div>
        )}

        {/* Grille */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
              {filtered.map((g, i) => {
                const cap = g.capacite_max && g.capacite_max > 0 ? g.capacite_max : 0
                const membres = g.membres_count ?? 0
                const pct = cap > 0 ? Math.min(100, Math.round((membres / cap) * 100)) : 0
                const enLigne = g.est_virtuel
                const lieu = [g.ville, g.pays].filter(Boolean).join(', ')
                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    className="card-royal group hover:-translate-y-1 transition-all duration-300 flex flex-col"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                          style={{ background: 'rgba(212,175,55,0.12)' }}>
                          <Users className="w-5 h-5 text-gold" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-inter text-gold truncate">{plateformeLabel(g.plateforme_id)}</div>
                          <div className="font-cinzel text-xs font-bold text-pearl leading-tight">{g.nom}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-inter shrink-0"
                        style={{ color: enLigne ? '#0EA5E9' : '#22C55E' }}>
                        {enLigne ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {enLigne ? 'En ligne' : 'Présentiel'}
                      </div>
                    </div>

                    {/* Type */}
                    <div className="mb-3">
                      <span className="text-[9px] font-inter px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(212,175,55,0.10)', color: '#D4AF37' }}>
                        {typeLabel(g.type)}
                      </span>
                    </div>

                    {/* Lieu */}
                    {lieu && (
                      <div className="flex items-center gap-1.5 text-xs text-pearl/40 font-inter mb-3">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{lieu}</span>
                      </div>
                    )}

                    {/* Description */}
                    {g.description && (
                      <p className="font-inter text-xs text-pearl/45 leading-relaxed mb-4 line-clamp-2">
                        {g.description}
                      </p>
                    )}

                    {/* Horaire */}
                    {(g.jour_reunion || g.heure_reunion) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-pearl/35 font-inter mb-4">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {[g.jour_reunion, g.heure_reunion].filter(Boolean).join(' · ')}
                      </div>
                    )}

                    {/* Capacité */}
                    <div className="mb-4 mt-auto">
                      <div className="flex items-center justify-between text-[10px] font-inter mb-1.5">
                        <span className="text-pearl/35 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {membres} membre{membres > 1 ? 's' : ''}
                          {cap > 0 && <span className="text-pearl/25"> / {cap}</span>}
                        </span>
                        {cap > 0 && <span className="text-gold">{pct}%</span>}
                      </div>
                      {cap > 0 && (
                        <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#D4AF37' }} />
                        </div>
                      )}
                    </div>

                    {/* CTA selon l'état de connexion (cookies) : Rejoindre si connecté, sinon login. */}
                    {user?.id ? (
                      <Link
                        href="/member/dashboard/groupes"
                        className="w-full py-2 rounded-xl text-xs font-inter font-semibold transition-all flex items-center justify-center gap-1.5"
                        style={{
                          background: 'rgba(212,175,55,0.18)',
                          color: '#D4AF37',
                          border: '1px solid rgba(212,175,55,0.35)',
                        }}
                      >
                        <Users className="w-3 h-3" />
                        Rejoindre ce groupe
                      </Link>
                    ) : (
                      <Link
                        href="/login?next=/groupes"
                        className="w-full py-2 rounded-xl text-xs font-inter font-semibold transition-all flex items-center justify-center gap-1.5"
                        style={{
                          background: 'rgba(212,175,55,0.12)',
                          color: '#D4AF37',
                          border: '1px solid rgba(212,175,55,0.25)',
                        }}
                      >
                        <LogIn className="w-3 h-3" />
                        Connectez-vous pour rejoindre
                      </Link>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* État vide honnête */}
            {filtered.length === 0 && (
              <div className="text-center py-16 card-royal mb-12">
                <div className="text-4xl mb-4">🏠</div>
                <p className="font-cinzel text-lg text-pearl/50">
                  {groupes.length === 0 ? 'Les groupes seront bientôt publiés ici' : 'Aucun groupe trouvé'}
                </p>
                <p className="font-inter text-sm text-pearl/30 mt-2">
                  {groupes.length === 0
                    ? 'Nos cellules et groupes de croissance sont en cours de référencement. Vous pouvez déjà rejoindre la communauté ou initier un groupe.'
                    : 'Essayez avec d\'autres critères.'}
                </p>
                {groupes.length > 0 && hasActiveFilters && (
                  <button onClick={resetFilters} className="btn-ghost px-6 py-2.5 text-sm mt-5">
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* CTA final */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl p-8 md:p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(15,8,32,0.9) 0%, rgba(26,5,53,0.9) 100%)',
            border: '1px solid rgba(212,175,55,0.15)',
          }}
        >
          <div className="text-4xl mb-5">🏠</div>
          <h2 className="font-cinzel text-2xl md:text-3xl font-black text-pearl mb-4">
            Pas encore de groupe <span className="text-gradient-gold">près de vous ?</span>
          </h2>
          <p className="font-inter text-pearl/50 mb-8 max-w-lg mx-auto">
            Vous pouvez devenir l&apos;initiateur d&apos;une cellule dans votre ville ou en ligne. Notre équipe vous accompagne dans la création et la gestion de votre groupe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="btn-gold px-8 py-3.5 text-sm">
              Créer un groupe
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/rejoindre" className="btn-ghost px-8 py-3.5 text-sm">
              Rejoindre la CIER
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
