'use client'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare, CheckCircle, XCircle, Clock,
  Star, Search, Eye, Flag, Trash2, ThumbsUp, Globe, Filter as FilterIcon,
  Sparkles, AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

type Statut = 'en_attente' | 'approuve' | 'rejete'

interface Temoignage {
  id: string
  auteur: string
  avatar: string
  pays: string
  drapeau: string
  plateforme: string
  contenu: string
  note: number
  statut: Statut
  date: string
  likes: number
  categorie: string
  couleur: string
}

const TEMOIGNAGES_DATA: Temoignage[] = [
  {
    id: '1', auteur: 'Grâce Kouassi', avatar: 'GK', pays: 'Côte d\'Ivoire', drapeau: '🇨🇮',
    plateforme: 'CIER', couleur: '#EC4899',
    contenu: 'Depuis que j\'ai rejoint CIER, ma vie a été totalement transformée. Les formations bibliques m\'ont donné une profondeur que je n\'avais jamais connue. Je suis passée de visiteur à leader de cellule en 8 mois. Dieu est bon !',
    note: 5, statut: 'approuve', date: '2026-05-08', likes: 127, categorie: 'Transformation spirituelle',
  },
  {
    id: '2', auteur: 'Paul Mbeki', avatar: 'PM', pays: 'RDC', drapeau: '🇨🇩',
    plateforme: 'Jeunesse', couleur: '#6366F1',
    contenu: 'La plateforme Jeunesse de CIER m\'a permis de trouver ma voie. Je suis arrivé perdu et découragé. Aujourd\'hui j\'ai une vision claire pour ma vie. Les lives du dimanche me rechargent chaque semaine.',
    note: 5, statut: 'approuve', date: '2026-05-07', likes: 89, categorie: 'Vocation & Vision',
  },
  {
    id: '3', auteur: 'Marie-Claire Durand', avatar: 'MD', pays: 'France', drapeau: '🇫🇷',
    plateforme: 'Femmes d\'Exceptions', couleur: '#EC4899',
    contenu: 'En tant que femme de la diaspora, je me sentais seule dans ma foi. CIER m\'a connecté à une communauté incroyable. Je me sens comprise, soutenue et encouragée à devenir la femme de Dieu que je suis appelée à être.',
    note: 5, statut: 'en_attente', date: '2026-05-09', likes: 0, categorie: 'Communauté & Appartenance',
  },
  {
    id: '4', auteur: 'Joseph Nkurunziza', avatar: 'JN', pays: 'Burundi', drapeau: '🇧🇮',
    plateforme: 'CFIC', couleur: '#8B5CF6',
    contenu: 'La formation CFIC a changé ma façon de lire la Bible. Chaque module est un trésor. J\'ai appris plus en 3 mois qu\'en 10 ans d\'église traditionnelle. Je recommande CIER à tous mes amis.',
    note: 4, statut: 'approuve', date: '2026-05-06', likes: 56, categorie: 'Formation biblique',
  },
  {
    id: '5', auteur: 'Sandra Osei', avatar: 'SO', pays: 'Ghana', drapeau: '🇬🇭',
    plateforme: 'CIER', couleur: '#D4AF37',
    contenu: 'Le mur de prière de CIER est incroyable. En 24 heures, ma demande avait reçu plus de 200 priants. J\'ai vécu un miracle de guérison dont je rends gloire à Dieu. Cette église est vraiment différente.',
    note: 5, statut: 'en_attente', date: '2026-05-09', likes: 0, categorie: 'Miracle & Guérison',
  },
  {
    id: '6', auteur: 'Pierre Kamga', avatar: 'PK', pays: 'Cameroun', drapeau: '🇨🇲',
    plateforme: 'Chapelle Familiale', couleur: '#F97316',
    contenu: 'Contenu inapproprié signalé par plusieurs membres. À examiner avant publication.',
    note: 2, statut: 'rejete', date: '2026-05-05', likes: 0, categorie: 'Autre',
  },
]

const STATUT_CONFIG: Record<Statut, { label: string; color: string; icon: typeof CheckCircle }> = {
  approuve: { label: 'Approuvé', color: '#22C55E', icon: CheckCircle },
  en_attente: { label: 'En attente', color: '#F59E0B', icon: Clock },
  rejete: { label: 'Rejeté', color: '#EF4444', icon: XCircle },
}

export default function AdminTemoignagesPage() {
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<Statut | ''>('')
  const [items, setItems] = useState(TEMOIGNAGES_DATA)

  const filtered = useMemo(
    () =>
      items.filter((t) => {
        const matchSearch =
          t.auteur.toLowerCase().includes(search.toLowerCase()) ||
          t.contenu.toLowerCase().includes(search.toLowerCase()) ||
          t.pays.toLowerCase().includes(search.toLowerCase()) ||
          t.categorie.toLowerCase().includes(search.toLowerCase())
        const matchStatut = !statutFilter || t.statut === statutFilter
        return matchSearch && matchStatut
      }),
    [items, search, statutFilter],
  )

  // Always show pending first, then by date desc
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.statut === 'en_attente' && b.statut !== 'en_attente') return -1
        if (a.statut !== 'en_attente' && b.statut === 'en_attente') return 1
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      }),
    [filtered],
  )

  const updateStatut = (id: string, statut: Statut) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, statut } : t)))
  }
  const approveAllPending = () => {
    setItems((prev) => prev.map((t) => (t.statut === 'en_attente' ? { ...t, statut: 'approuve' as Statut } : t)))
  }
  const remove = (id: string) => setItems((prev) => prev.filter((t) => t.id !== id))

  const total = items.length
  const approuves = items.filter((t) => t.statut === 'approuve').length
  const enAttente = items.filter((t) => t.statut === 'en_attente').length
  const rejetes = items.filter((t) => t.statut === 'rejete').length
  const totalLikes = items.reduce((s, t) => s + t.likes, 0)
  const ratedItems = items.filter((t) => t.statut === 'approuve')
  const avgRating = ratedItems.length
    ? (ratedItems.reduce((s, t) => s + t.note, 0) / ratedItems.length).toFixed(1)
    : '—'

  const STATS = [
    { label: 'Total témoignages', value: total, icon: MessageSquare, color: '#D4AF37' },
    { label: 'En attente', value: enAttente, icon: Clock, color: '#F59E0B', highlight: enAttente > 0 },
    { label: 'Approuvés', value: approuves, icon: CheckCircle, color: '#22C55E' },
    { label: 'Note moyenne', value: `${avgRating} ★`, icon: Star, color: '#8B5CF6' },
  ] as const

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={<>Témoignages <span className="text-cinematic-gold">& Modération</span></>}
          description="Valider et gérer les témoignages de la communauté."
        />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6"
        >
          {STATS.map((s) => (
            <div
              key={s.label}
              className={`card-royal py-5 ${'highlight' in s && s.highlight ? 'border-amber-500/40' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}
                >
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <div className="font-cinzel text-xl md:text-2xl font-bold text-pearl leading-none truncate">
                    {s.value}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-pearl/40 font-inter mt-1">
                    {s.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Pending queue alert */}
        {enAttente > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card-royal mb-6 flex flex-col md:flex-row md:items-center gap-4 border-amber-500/30 bg-amber-500/[0.04]"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/15 border border-amber-500/30 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="font-cinzel text-sm font-bold text-pearl">
                  {enAttente} {enAttente > 1 ? 'témoignages' : 'témoignage'} en attente de modération
                </div>
                <p className="text-xs text-pearl/45 font-inter mt-0.5">
                  Validez ou rejetez pour publier sur la page publique <code className="text-pearl/60">/temoignages</code>.
                </p>
              </div>
            </div>
            <div className="flex gap-2 self-stretch md:self-auto">
              <button
                onClick={() => setStatutFilter('en_attente')}
                className="btn-royal text-xs px-3 py-2 inline-flex items-center gap-1.5"
              >
                <FilterIcon className="w-3.5 h-3.5" /> Voir la file
              </button>
              <button
                onClick={approveAllPending}
                className="btn-gold text-xs px-3 py-2 inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Approuver tout
              </button>
            </div>
          </motion.div>
        )}

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-royal mb-6 flex flex-col md:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
            <input
              className="input-royal w-full pl-11"
              placeholder="Rechercher un témoignage, un auteur, un pays..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['', 'en_attente', 'approuve', 'rejete'] as const).map((s) => {
              const config = s ? STATUT_CONFIG[s] : null
              const count = !s
                ? total
                : s === 'en_attente'
                ? enAttente
                : s === 'approuve'
                ? approuves
                : rejetes
              const isActive = statutFilter === s
              return (
                <button
                  key={s}
                  onClick={() => setStatutFilter(s)}
                  className="px-3.5 py-2 rounded-xl text-xs font-inter font-medium transition-all inline-flex items-center gap-1.5"
                  style={{
                    background: isActive
                      ? config
                        ? `${config.color}20`
                        : 'rgba(212,175,55,0.18)'
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${
                      isActive
                        ? config
                          ? `${config.color}40`
                          : 'rgba(212,175,55,0.3)'
                        : 'rgba(255,255,255,0.08)'
                    }`,
                    color: isActive ? (config ? config.color : '#D4AF37') : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {s ? config?.label : 'Tous'}
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* List */}
        <div className="space-y-3">
          {sorted.map((t, i) => {
            const config = STATUT_CONFIG[t.statut]
            const isPending = t.statut === 'en_attente'
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * i }}
                className={`card-royal relative ${isPending ? 'border-amber-500/30 bg-amber-500/[0.025]' : ''}`}
              >
                {isPending && (
                  <div
                    className="absolute left-0 top-4 bottom-4 w-1 rounded-r"
                    style={{ background: '#F59E0B' }}
                  />
                )}
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold text-abyss flex-shrink-0 font-cinzel"
                    style={{ background: t.couleur }}
                  >
                    {t.avatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-inter text-sm font-semibold text-pearl">{t.auteur}</span>
                          <span className="text-sm">{t.drapeau}</span>
                          <span className="text-[10px] text-pearl/40 font-inter">{t.pays}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-pearl/30 font-inter">{t.plateforme}</span>
                          <span className="text-pearl/20">·</span>
                          <span className="text-[10px] text-pearl/30 font-inter">{t.date}</span>
                          <span className="text-pearl/20">·</span>
                          <span
                            className="text-[10px] font-inter px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}
                          >
                            {t.categorie}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className="w-3 h-3"
                              style={{ color: idx < t.note ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}
                              fill={idx < t.note ? '#D4AF37' : 'none'}
                            />
                          ))}
                        </div>
                        <div
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                          style={{ background: `${config.color}15`, border: `1px solid ${config.color}30` }}
                        >
                          <config.icon className="w-3 h-3" style={{ color: config.color }} />
                          <span className="text-[10px] font-semibold font-inter" style={{ color: config.color }}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="font-inter text-sm text-pearl/65 leading-relaxed mb-3">{t.contenu}</p>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-pearl/35 text-xs font-inter">
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {t.likes}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {t.statut === 'approuve' ? `${(t.likes * 17 + 100).toLocaleString('fr-FR')} vues` : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.statut !== 'approuve' && (
                          <button
                            onClick={() => updateStatut(t.id, 'approuve')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-all"
                            style={{
                              background: 'rgba(34,197,94,0.1)',
                              border: '1px solid rgba(34,197,94,0.25)',
                              color: '#22C55E',
                            }}
                          >
                            <CheckCircle className="w-3 h-3" />
                            Approuver
                          </button>
                        )}
                        {t.statut !== 'rejete' && (
                          <button
                            onClick={() => updateStatut(t.id, 'rejete')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-all"
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.2)',
                              color: '#EF4444',
                            }}
                          >
                            <XCircle className="w-3 h-3" />
                            Rejeter
                          </button>
                        )}
                        <button
                          onClick={() => remove(t.id)}
                          className="p-1.5 rounded-lg hover:bg-pearl/10 transition-colors"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-pearl/30 hover:text-red-400" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-pearl/10 transition-colors" aria-label="Signaler">
                          <Flag className="w-3.5 h-3.5 text-pearl/30" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-pearl/10 transition-colors" aria-label="Aperçu public">
                          <Globe className="w-3.5 h-3.5 text-pearl/30" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-20 card-royal">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              <MessageSquare className="w-7 h-7 text-gold" />
            </div>
            <p className="font-cinzel text-lg text-pearl/60">Aucun témoignage trouvé</p>
            <p className="font-inter text-sm text-pearl/30 mt-1">Essayez de modifier vos filtres ou votre recherche.</p>
          </div>
        )}

        <div className="text-[11px] text-pearl/30 font-inter text-center mt-8">
          {totalLikes.toLocaleString('fr-FR')} likes cumulés sur l'ensemble des témoignages publiés.
        </div>
      </div>
    </div>
  )
}
