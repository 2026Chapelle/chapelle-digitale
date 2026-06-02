'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Radio, Plus, Play, Pause, Settings, Users, Eye,
  Calendar, Clock, Youtube, Facebook, Instagram,
  Tv, Activity, CheckCircle, AlertCircle, Trash2, Edit
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

type LiveStatut = 'en_cours' | 'planifie' | 'termine' | 'brouillon'

interface LiveEvent {
  id: string
  titre: string
  plateforme: string
  statut: LiveStatut
  date: string
  heure: string
  spectateurs?: number
  peak?: number
  duree?: string
  canaux: string[]
  description: string
  couleur: string
}

// Aucune donnée fictive : les lives se rempliront avec les diffusions réelles.
const LIVES: LiveEvent[] = []

const CANAL_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="w-3.5 h-3.5" />,
  facebook: <Facebook className="w-3.5 h-3.5" />,
  instagram: <Instagram className="w-3.5 h-3.5" />,
  cier: <Tv className="w-3.5 h-3.5" />,
}

const CANAL_COLORS: Record<string, string> = {
  youtube: '#EF4444',
  facebook: '#3B82F6',
  instagram: '#EC4899',
  cier: '#D4AF37',
}

const STATUT_CONFIG: Record<LiveStatut, { label: string; color: string; icon: typeof Radio }> = {
  en_cours: { label: 'En direct', color: '#EF4444', icon: Radio },
  planifie: { label: 'Planifié', color: '#D4AF37', icon: Calendar },
  termine: { label: 'Terminé', color: '#6B7280', icon: CheckCircle },
  brouillon: { label: 'Brouillon', color: '#0EA5E9', icon: Edit },
}

type StreamKey = { canal: string; key: string; status: string }
// Aucune donnée fictive : les clés de streaming se configureront avec les vraies valeurs.
const STREAM_KEYS: StreamKey[] = []

export default function AdminLivePage() {
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<'lives' | 'config' | 'stats'>('lives')
  const liveActuel = LIVES.find(l => l.statut === 'en_cours')

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>Gestion <span className="text-cinematic-gold">Lives &amp; Streaming</span></>}
          description="Planifier, diffuser et analyser vos cultes en direct."
          actions={
            <button onClick={() => setShowForm(true)} className="btn-gold flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Nouveau live
            </button>
          }
        />

        {/* Live en cours - banner */}
        {liveActuel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl p-6 mb-8"
            style={{
              background: 'linear-gradient(135deg, #0a0018 0%, #1a0033 100%)',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            <div className="absolute inset-0 opacity-20"
              style={{ background: 'radial-gradient(ellipse at 80% 50%, #EF444440, transparent 60%)' }} />
            <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Radio className="w-5 h-5 text-red-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold font-inter text-red-400 uppercase tracking-wider">EN DIRECT MAINTENANT</span>
                  </div>
                  <h3 className="font-cinzel text-lg font-bold text-pearl">{liveActuel.titre}</h3>
                  <p className="text-xs text-pearl/40 font-inter">{liveActuel.plateforme} · Débuté à {liveActuel.heure}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="font-cinzel text-2xl font-black text-red-400">
                    {liveActuel.spectateurs?.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-pearl/30 font-inter">spectateurs</div>
                </div>
                <div className="text-center">
                  <div className="font-cinzel text-2xl font-black text-gold">
                    {liveActuel.duree}
                  </div>
                  <div className="text-[10px] text-pearl/30 font-inter">durée</div>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-inter font-semibold"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                    <Activity className="w-4 h-4" />
                    Voir le live
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-inter font-semibold"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                    <Pause className="w-4 h-4" />
                    Terminer
                  </button>
                </div>
              </div>
            </div>

            {/* Canal badges */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-pearl/[0.05]">
              <span className="text-[10px] text-pearl/25 font-inter mr-1">Diffusion sur :</span>
              {liveActuel.canaux.map(c => (
                <div key={c} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: `${CANAL_COLORS[c]}20`, color: CANAL_COLORS[c], border: `1px solid ${CANAL_COLORS[c]}30` }}>
                  {CANAL_ICONS[c]}
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {[
            { key: 'lives', label: 'Programme' },
            { key: 'config', label: 'Configuration streaming' },
            { key: 'stats', label: 'Statistiques' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className="px-4 py-2 rounded-lg text-sm font-inter font-medium transition-all"
              style={{
                background: tab === t.key ? 'rgba(212,175,55,0.15)' : 'transparent',
                color: tab === t.key ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                border: tab === t.key ? '1px solid rgba(212,175,55,0.25)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'lives' && (
          <div className="space-y-4">
            {LIVES.length === 0 && (
              <div className="card-royal text-center py-16">
                <Radio className="w-8 h-8 mx-auto mb-3 text-gold/40" />
                <p className="font-cinzel text-pearl/60">Aucun live programmé pour le moment</p>
                <p className="font-inter text-xs text-pearl/30 mt-1">Créez un live pour commencer.</p>
              </div>
            )}
            {LIVES.map((live, i) => {
              const cfg = STATUT_CONFIG[live.statut]
              return (
                <motion.div
                  key={live.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i }}
                  className="card-royal"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${live.couleur}15`, border: `1px solid ${live.couleur}25` }}>
                      <cfg.icon className="w-5 h-5" style={{ color: live.statut === 'en_cours' ? '#EF4444' : live.couleur, animation: live.statut === 'en_cours' ? 'pulse 2s infinite' : undefined }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-inter text-sm font-semibold text-pearl">{live.titre}</h3>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${cfg.color}15`, color: cfg.color }}>
                              {live.statut === 'en_cours' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />}
                              {cfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-pearl/35 font-inter">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{live.date}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{live.heure}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px]"
                              style={{ background: `${live.couleur}15`, color: live.couleur }}>
                              {live.plateforme}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-pearl/10 transition-colors">
                            <Edit className="w-3.5 h-3.5 text-pearl/30" />
                          </button>
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-pearl/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-pearl/30" />
                          </button>
                        </div>
                      </div>

                      {(live.spectateurs || live.peak) ? (
                        <div className="flex items-center gap-4 mt-2">
                          {live.spectateurs !== undefined && live.spectateurs > 0 && (
                            <span className="flex items-center gap-1 text-xs font-inter text-pearl/50">
                              <Users className="w-3 h-3 text-red-400" /> {live.spectateurs.toLocaleString()} actuels
                            </span>
                          )}
                          {live.peak && live.peak > 0 && (
                            <span className="flex items-center gap-1 text-xs font-inter text-pearl/50">
                              <Eye className="w-3 h-3 text-gold" /> {live.peak.toLocaleString()} peak
                            </span>
                          )}
                          {live.duree && (
                            <span className="flex items-center gap-1 text-xs font-inter text-pearl/50">
                              <Clock className="w-3 h-3" /> {live.duree}
                            </span>
                          )}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-1.5 mt-2">
                        {live.canaux.map(c => (
                          <div key={c} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px]"
                            style={{ background: `${CANAL_COLORS[c]}12`, color: CANAL_COLORS[c] }}>
                            {CANAL_ICONS[c]}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {tab === 'config' && (
          <div className="space-y-6">
            <div className="card-royal">
              <h2 className="font-cinzel text-sm font-bold text-pearl mb-6 flex items-center gap-2">
                <Settings className="w-4 h-4 text-gold" />
                Clés de Streaming RTMP
              </h2>
              <div className="space-y-4">
                {STREAM_KEYS.length === 0 && (
                  <p className="font-inter text-sm text-pearl/30 py-4">Aucune clé de streaming configurée.</p>
                )}
                {STREAM_KEYS.map((sk) => (
                  <div key={sk.canal} className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p className="font-inter text-sm font-semibold text-pearl">{sk.canal}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-xs text-green-400 font-inter">Connecté</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <input type="password" value={sk.key} readOnly className="input-royal w-full font-mono text-xs" />
                    </div>
                    <button className="text-xs font-inter text-gold/60 hover:text-gold transition-colors">Régénérer</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-royal">
              <h2 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2">
                <Tv className="w-4 h-4 text-gold" />
                Destinations de Diffusion
              </h2>
              <div className="space-y-3">
                {[
                  { nom: 'YouTube CIER', icon: Youtube, actif: false, abonnes: '0', color: '#EF4444' },
                  { nom: 'Facebook CIER', icon: Facebook, actif: false, abonnes: '0', color: '#3B82F6' },
                  { nom: 'Instagram Live', icon: Instagram, actif: false, abonnes: '0', color: '#EC4899' },
                  { nom: 'Plateforme CIER', icon: Tv, actif: false, abonnes: '0', color: '#D4AF37' },
                ].map((canal) => (
                  <div key={canal.nom} className="flex items-center gap-3 p-3.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${canal.color}18` }}>
                      <canal.icon className="w-4 h-4" style={{ color: canal.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-inter text-sm font-semibold text-pearl">{canal.nom}</p>
                      <p className="text-[10px] text-pearl/30 font-inter">{canal.abonnes} abonnés</p>
                    </div>
                    <button
                      className="w-10 h-5 rounded-full relative flex-shrink-0 transition-all"
                      style={{ background: canal.actif ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.1)' }}
                    >
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ left: canal.actif ? '22px' : '2px' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { label: 'Vues totales', value: '0', icon: Eye, color: '#D4AF37', sub: 'tous les lives' },
              { label: 'Spectateurs peak', value: '0', icon: Users, color: '#EF4444', sub: 'record' },
              { label: 'Lives ce mois', value: '0', icon: Radio, color: '#22C55E', sub: 'diffusés' },
              { label: 'Durée totale', value: '0h', icon: Clock, color: '#8B5CF6', sub: 'diffusées ce mois' },
              { label: 'Pays atteints', value: '0', icon: Tv, color: '#0EA5E9', sub: 'ce mois' },
              { label: 'Replays vus', value: '0', icon: Play, color: '#F97316', sub: 'après diffusion' },
            ].map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i }}
                className="card-royal">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${s.color}18` }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div className="font-cinzel text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="font-inter text-sm text-pearl/70 mt-1">{s.label}</div>
                <div className="font-inter text-xs text-pearl/25 mt-0.5">{s.sub}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* New live modal */}
        {showForm && (
          <div className="admin-modal-overlay flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-modal-box p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-cinzel text-lg font-bold text-pearl">Nouveau Live</h2>
                <button onClick={() => setShowForm(false)} className="text-pearl/40 hover:text-pearl">✕</button>
              </div>
              <div className="space-y-4">
                <input className="input-royal w-full" placeholder="Titre du live" />
                <textarea className="input-royal w-full h-20 resize-none" placeholder="Description..." />
                <div className="grid grid-cols-2 gap-3">
                  <select className="input-royal">
                    <option>Plateforme</option>
                    {['CIER Global', 'Jeunesse', 'Mahanaïm', 'CFIC', "Femmes d'Exceptions"].map(p => <option key={p}>{p}</option>)}
                  </select>
                  <select className="input-royal">
                    <option>Type</option>
                    {['Culte', 'Prière', 'Formation', 'Conférence', 'Veillée'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" className="input-royal" />
                  <input type="time" className="input-royal" />
                </div>
                <div>
                  <label className="text-xs text-pearl/50 font-inter mb-2 block">Canaux de diffusion</label>
                  <div className="flex gap-2 flex-wrap">
                    {['YouTube', 'Facebook', 'Instagram', 'CIER Platform'].map(c => (
                      <button key={c}
                        className="px-3 py-1.5 rounded-lg text-xs font-inter transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-3">Brouillon</button>
                  <button onClick={() => setShowForm(false)} className="btn-gold flex-1 py-3 flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" /> Planifier le live
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
