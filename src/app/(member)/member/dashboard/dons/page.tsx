'use client'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  Heart, DollarSign, TrendingUp, Crown, ArrowRight, Download, CheckCircle,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'

const DonsChart = dynamic(() => import('./DonsChart'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full rounded-xl animate-pulse"
      style={{
        background:
          'linear-gradient(180deg, rgba(212,175,55,0.04) 0%, rgba(212,175,55,0.01) 100%)',
        border: '1px solid rgba(212,175,55,0.06)',
      }}
    />
  ),
})

/** Don réel du membre (aucune donnée de démonstration). */
type Don = { id: string; type: string; montant: number; date: string; statut: string; recu: boolean; reference: string }

/** Paliers Partenaire du Royaume selon le cumul des dons (FCFA). */
const PARTNER_TIERS = [
  { nom: 'Royal', min: 1_000_000, color: '#D4AF37', emoji: '👑' },
  { nom: 'Or', min: 200_000, color: '#EAB308', emoji: '🥇' },
  { nom: 'Argent', min: 50_000, color: '#9CA3AF', emoji: '🥈' },
  { nom: 'Bronze', min: 5_000, color: '#B45309', emoji: '🥉' },
]
function partnerTier(total: number) {
  return PARTNER_TIERS.find((t) => total >= t.min) || null
}

const TYPE_COLORS: Record<string, string> = {
  'Dîme': '#D4AF37',
  'Offrande': '#EC4899',
  'Partenariat': '#8B5CF6',
  'Don libre': '#22C55E',
  'Construction Temple': '#F97316',
  'Missions': '#0EA5E9',
}

/** Libellés FR des types de dons (enum Supabase → affichage). */
const DON_TYPE_LABELS: Record<string, string> = {
  dime: 'Dîme', offrande: 'Offrande', partenariat: 'Partenariat',
  don: 'Don libre', projet: 'Missions', promesse: 'Promesse',
}

/** Mappe l'historique réel (/api/member/dons) vers le format d'affichage. */
function mapDons(dons: any[]): Don[] {
  return (dons || []).map((d) => ({
    id: String(d.id).slice(0, 8).toUpperCase(),
    type: DON_TYPE_LABELS[d.type] || 'Don libre',
    montant: Number(d.montant) || 0,
    date: (d.date_creation || '').slice(0, 10),
    statut: d.statut === 'complete' ? 'validé' : d.statut,
    recu: !!d.recu_envoye,
    reference: d.reference || '',
  }))
}

const MOIS_ABBR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

/** Format monétaire FCFA (Côte d'Ivoire). Ex : 10 000 FCFA. */
const fcfa = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} FCFA`

export default function MesDonsPage() {
  const [filter, setFilter] = useState('Tous')
  // Aucune donnée fictive : l'historique démarre vide et n'est rempli que par le réel.
  const [dons, setDons] = useState<Don[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/member/dons', { credentials: 'same-origin' })
        if (!r.ok) { if (!cancelled) setLoaded(true); return }
        const j = await r.json()
        if (cancelled) return
        if (j.ok) setDons(mapDons(j.data?.dons || []))
      } catch { /* reste vide */ }
      finally { if (!cancelled) setLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [])

  const totalGlobal = dons.reduce((acc, d) => acc + d.montant, 0)
  const moisCourant = `-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const totalMois = dons.filter(d => d.date.includes(moisCourant)).reduce((acc, d) => acc + d.montant, 0)
  const nbDons = dons.length
  const types = Array.from(new Set(dons.map(d => d.type)))
  const filtered = filter === 'Tous' ? dons : dons.filter(d => d.type === filter)
  const hasDons = dons.length > 0
  const tier = partnerTier(totalGlobal)
  const nextTier = [...PARTNER_TIERS].reverse().find((t) => totalGlobal < t.min)

  // Évolution mensuelle calculée UNIQUEMENT à partir des dons réels.
  const historique = useMemo(() => {
    const byMonth = new Map<number, number>()
    for (const d of dons) {
      const m = Number((d.date || '').slice(5, 7)) - 1
      if (m >= 0 && m < 12) byMonth.set(m, (byMonth.get(m) || 0) + d.montant)
    }
    const months = Array.from(byMonth.keys()).sort((a, b) => a - b)
    return months.map((m) => ({ mois: MOIS_ABBR[m], montant: byMonth.get(m) || 0 }))
  }, [dons])

  const kpis: { label: string; value: string; icon: LucideIcon; color: string }[] = [
    { label: 'Total 2026', value: fcfa(totalGlobal), icon: DollarSign, color: '#D4AF37' },
    { label: 'Ce mois', value: fcfa(totalMois), icon: TrendingUp, color: '#22C55E' },
    { label: 'Dons effectués', value: String(nbDons), icon: Heart, color: '#EC4899' },
    { label: 'Badge Partenaire', value: tier ? `${tier.emoji} ${tier.nom}` : (hasDons ? 'Sympathisant' : '—'), icon: Crown, color: tier?.color || '#8B5CF6' },
  ]

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Espace Membre"
          title={<>Mes <span className="text-cinematic-gold">Dons</span></>}
          description="Historique de vos contributions au Royaume."
          actions={
            <Link href="/dons" className="btn-gold text-sm py-2.5 px-5">
              <Heart className="w-4 h-4" />
              Faire un Don
            </Link>
          }
        />

        {/* État vide honnête tant qu'aucun don réel n'existe */}
        {!hasDons ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="card-royal text-center py-16 mt-2"
          >
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}>
              <Heart className="w-7 h-7 text-gold" />
            </div>
            <div className="font-cinzel text-2xl font-black text-gold mb-1">0 FCFA</div>
            <p className="font-cinzel text-lg text-pearl/60">
              {loaded ? 'Aucun don enregistré pour le moment' : 'Chargement…'}
            </p>
            <p className="font-inter text-sm text-pearl/35 mt-1 max-w-md mx-auto">
              Vos contributions apparaîtront ici dès votre premier don. Commencez dès aujourd'hui à soutenir l'œuvre.
            </p>
            <Link href="/dons" className="btn-gold text-sm py-2.5 px-6 mt-6 inline-flex">
              Faire un don <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <>
            {/* KPI (réels) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {kpis.map((kpi, i) => (
                <motion.div key={kpi.label}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="card-royal">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${kpi.color}18` }}>
                      <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                    </div>
                  </div>
                  <div className="font-cinzel text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
                  <div className="text-[11px] text-pearl/35 font-inter mt-0.5">{kpi.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Badges Partenaire du Royaume (selon le cumul réel) */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="card-royal mb-8">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2"><Crown className="w-4 h-4 text-gold" /> Badge Partenaire</h3>
                {tier
                  ? <span className="text-xs font-inter px-3 py-1 rounded-full font-semibold" style={{ background: `${tier.color}1A`, color: tier.color, border: `1px solid ${tier.color}40` }}>{tier.emoji} Palier {tier.nom}</span>
                  : <span className="text-xs font-inter text-pearl/40">Premier don pour débloquer Bronze</span>}
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {[...PARTNER_TIERS].reverse().map((t) => {
                  const atteint = totalGlobal >= t.min
                  return (
                    <div key={t.nom} className="rounded-xl p-3 text-center" style={{ background: atteint ? `${t.color}15` : 'rgba(255,255,255,0.02)', border: `1px solid ${atteint ? `${t.color}45` : 'rgba(255,255,255,0.06)'}`, opacity: atteint ? 1 : 0.5 }}>
                      <div className="text-2xl mb-1" style={{ filter: atteint ? 'none' : 'grayscale(1)' }}>{t.emoji}</div>
                      <div className="font-cinzel text-xs font-bold" style={{ color: atteint ? t.color : 'rgba(245,243,238,0.5)' }}>{t.nom}</div>
                      <div className="text-[9px] font-inter text-pearl/35 mt-0.5">{t.min.toLocaleString('fr-FR')} FCFA</div>
                    </div>
                  )
                })}
              </div>
              {nextTier && (
                <p className="font-inter text-[11px] text-pearl/40 mt-3 text-center">
                  Plus que <span className="text-gold font-semibold">{(nextTier.min - totalGlobal).toLocaleString('fr-FR')} FCFA</span> pour atteindre le palier {nextTier.emoji} {nextTier.nom}.
                </p>
              )}
            </motion.div>

            {/* Évolution (réelle) */}
            {historique.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="card-royal mb-8">
                <h3 className="font-cinzel text-sm font-bold text-pearl mb-5">Évolution de mes Dons</h3>
                <div className="h-[180px]">
                  <DonsChart data={historique} />
                </div>
              </motion.div>
            )}

            {/* Transactions (réelles) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="card-royal overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2">
                  <Heart className="w-4 h-4 text-gold" />
                  Historique des Transactions
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="input-royal text-xs py-1.5 px-3 w-36"
                  >
                    <option>Tous</option>
                    {types.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-pearl/[0.04]">
                      {['Référence', 'Type de don', 'Montant', 'Date', 'Statut', 'Reçu'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-pearl/30 uppercase tracking-wider font-inter">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((don, i) => (
                      <motion.tr key={don.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.04 * i }}
                        className="border-b border-pearl/[0.03] hover:bg-pearl/[0.02] transition-colors"
                      >
                        <td className="px-3 py-3 text-[10px] font-mono text-pearl/35">{don.reference || don.id}</td>
                        <td className="px-3 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-inter"
                            style={{ background: `${TYPE_COLORS[don.type] || '#6B7280'}15`, color: TYPE_COLORS[don.type] || '#6B7280' }}>
                            {don.type}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-cinzel text-sm font-black text-gold">{fcfa(don.montant)}</span>
                        </td>
                        <td className="px-3 py-3 text-xs text-pearl/40 font-inter">{don.date}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-[10px] text-green-400 font-inter">{don.statut || 'Validé'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {don.reference ? (
                            <a href={`/recu/${encodeURIComponent(don.reference)}`} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-inter text-gold hover:underline">
                              <Download className="w-3 h-3" /> Reçu
                            </a>
                          ) : (
                            <span className="text-[10px] text-pearl/25 font-inter">—</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 pt-5 border-t border-pearl/5 flex items-center justify-between">
                <p className="text-xs text-pearl/30 font-inter">
                  Total en 2026 : <span className="text-gold font-bold font-cinzel">{fcfa(totalGlobal)}</span>
                </p>
                <Link href="/dons" className="btn-gold text-xs py-2 px-4">
                  Faire un don
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          </>
        )}

        {/* Partenariat — invitation (CTA, pas une donnée) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mt-6 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(212,175,55,0.06) 100%)', border: '1px solid rgba(212,175,55,0.15)' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gold/15 flex items-center justify-center flex-shrink-0">
            <Crown className="w-8 h-8 text-gold" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-cinzel text-base font-bold text-pearl mb-1">Devenir Partenaire du Royaume</h3>
            <p className="font-inter text-xs text-pearl/45">
              En tant que partenaire mensuel, vous recevez des rapports d'impact personnalisés, un accès prioritaire aux formations premium et la possibilité de participer aux consultations pastorales.
            </p>
          </div>
          <Link href="/dons" className="btn-gold flex-shrink-0 text-sm">
            Devenir Partenaire
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
