'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Send, Mail, Bell, MessageSquare, Plus, Users,
  CheckCircle, Clock, TrendingUp, Eye, Mouse,
  Target, Zap, Calendar, ChevronRight, Edit, Copy, Trash2
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

type CanalType = 'email' | 'push' | 'sms' | 'whatsapp'
type StatutCampagne = 'active' | 'brouillon' | 'terminee' | 'planifiee'

interface Campagne {
  id: string
  nom: string
  canal: CanalType
  statut: StatutCampagne
  cible: string
  envoyes: number
  ouverts: number
  cliques: number
  date: string
  couleur: string
}

// Aucune donnée fictive : les campagnes se rempliront avec les données réelles.
const CAMPAGNES: Campagne[] = []

const CANAL_ICONS: Record<CanalType, React.ReactNode> = {
  email: <Mail className="w-3.5 h-3.5" />,
  push: <Bell className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  whatsapp: <MessageSquare className="w-3.5 h-3.5" />,
}

const CANAL_COLORS: Record<CanalType, string> = {
  email: '#0EA5E9',
  push: '#8B5CF6',
  sms: '#22C55E',
  whatsapp: '#22C55E',
}

const STATUT_CONFIG: Record<StatutCampagne, { label: string; color: string }> = {
  active: { label: 'En cours', color: '#22C55E' },
  brouillon: { label: 'Brouillon', color: '#6B7280' },
  terminee: { label: 'Terminée', color: '#0EA5E9' },
  planifiee: { label: 'Planifiée', color: '#D4AF37' },
}

type Template = { id: string; nom: string; canal: string; utilisations: number; couleur: string }
// Aucune donnée fictive : les templates se rempliront avec les données réelles.
const TEMPLATES: Template[] = []

export default function AdminCommunicationsPage() {
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'campagnes' | 'templates' | 'automatisations'>('campagnes')

  const totalEnvoyes = CAMPAGNES.reduce((acc, c) => acc + c.envoyes, 0)
  const totalOuverts = CAMPAGNES.reduce((acc, c) => acc + c.ouverts, 0)
  const totalCliques = CAMPAGNES.reduce((acc, c) => acc + c.cliques, 0)
  const tauxOuvertureGlobal = totalEnvoyes > 0 ? Math.round((totalOuverts / totalEnvoyes) * 100) : 0
  const tauxClicGlobal = totalEnvoyes > 0 ? Math.round((totalCliques / totalEnvoyes) * 1000) / 10 : 0
  const campagnesActives = CAMPAGNES.filter((c) => c.statut === 'active').length

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>Communications <span className="text-cinematic-gold">& Campagnes</span></>}
          description="Email, push, SMS et automations ministérielles."
          actions={
            <button onClick={() => setShowForm(true)} className="btn-gold flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Nouvelle campagne
            </button>
          }
        />

        {/* KPI */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Envois ce mois', value: totalEnvoyes.toLocaleString(), icon: Send, color: '#D4AF37' },
            { label: 'Taux ouverture', value: `${tauxOuvertureGlobal}%`, icon: Eye, color: '#22C55E' },
            { label: 'Taux de clic', value: `${tauxClicGlobal}%`, icon: Mouse, color: '#0EA5E9' },
            { label: 'Campagnes actives', value: String(campagnesActives), icon: Zap, color: '#8B5CF6' },
          ].map((k, i) => (
            <div key={k.label} className="card-royal text-center py-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${k.color}18` }}>
                <k.icon className="w-4.5 h-4.5" style={{ color: k.color }} />
              </div>
              <div className="font-cinzel text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[10px] text-pearl/35 font-inter mt-0.5">{k.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['campagnes', 'templates', 'automatisations'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-inter font-medium transition-all capitalize"
              style={{
                background: activeTab === tab ? 'rgba(212,175,55,0.15)' : 'transparent',
                color: activeTab === tab ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                border: activeTab === tab ? '1px solid rgba(212,175,55,0.25)' : '1px solid transparent',
              }}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'campagnes' && (
          <div className="space-y-4">
            {CAMPAGNES.length === 0 && (
              <div className="card-royal text-center py-16">
                <Send className="w-8 h-8 mx-auto mb-3 text-gold/40" />
                <p className="font-cinzel text-pearl/60">Aucune campagne pour le moment</p>
                <p className="font-inter text-xs text-pearl/30 mt-1">Créez une campagne pour commencer.</p>
              </div>
            )}
            {CAMPAGNES.map((camp, i) => {
              const statutCfg = STATUT_CONFIG[camp.statut]
              const tauxOuverture = camp.envoyes > 0 ? Math.round((camp.ouverts / camp.envoyes) * 100) : 0
              const tauxClic = camp.envoyes > 0 ? Math.round((camp.cliques / camp.envoyes) * 100) : 0
              return (
                <motion.div key={camp.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="card-royal"
                >
                  <div className="flex items-start gap-4">
                    {/* Canal icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${CANAL_COLORS[camp.canal]}18`, border: `1px solid ${CANAL_COLORS[camp.canal]}25` }}>
                      <span style={{ color: CANAL_COLORS[camp.canal] }}>{CANAL_ICONS[camp.canal]}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-inter text-sm font-semibold text-pearl">{camp.nom}</h3>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-pearl/35 font-inter">
                            <span className="flex items-center gap-1"><Target className="w-3 h-3" />{camp.cible}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{camp.date}</span>
                            <span>·</span>
                            <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: `${CANAL_COLORS[camp.canal]}15`, color: CANAL_COLORS[camp.canal] }}>
                              {camp.canal}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full font-inter"
                            style={{ background: `${statutCfg.color}15`, color: statutCfg.color, border: `1px solid ${statutCfg.color}30` }}>
                            {statutCfg.label}
                          </span>
                          <div className="flex gap-1">
                            {[Edit, Copy, Trash2].map((Icon, j) => (
                              <button key={j} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-pearl/10 transition-colors">
                                <Icon className="w-3 h-3 text-pearl/30" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {camp.envoyes > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: 'Envoyés', value: camp.envoyes.toLocaleString(), color: camp.couleur },
                            { label: 'Ouvertures', value: `${camp.ouverts.toLocaleString()} (${tauxOuverture}%)`, color: '#22C55E' },
                            { label: 'Clics', value: `${camp.cliques.toLocaleString()} (${tauxClic}%)`, color: '#0EA5E9' },
                          ].map((stat) => (
                            <div key={stat.label}>
                              <div className="font-cinzel text-base font-bold" style={{ color: stat.color }}>{stat.value}</div>
                              <div className="text-[10px] text-pearl/30 font-inter">{stat.label}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {camp.statut === 'brouillon' && (
                        <div className="flex gap-2 mt-3">
                          <button className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
                            <Edit className="w-3 h-3" /> Modifier
                          </button>
                          <button className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1.5">
                            <Send className="w-3 h-3" /> Envoyer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((t, i) => (
              <motion.div key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="card-royal group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${t.couleur}18` }}>
                    {t.canal === 'email' ? <Mail className="w-4 h-4" style={{ color: t.couleur }} />
                      : <Bell className="w-4 h-4" style={{ color: t.couleur }} />}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-pearl/10">
                      <Edit className="w-3 h-3 text-pearl/40" />
                    </button>
                    <button className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-pearl/10">
                      <Copy className="w-3 h-3 text-pearl/40" />
                    </button>
                  </div>
                </div>
                <h3 className="font-inter text-sm font-semibold text-pearl mb-1">{t.nom}</h3>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-pearl/35 font-inter">{t.utilisations} utilisations</span>
                  <span className="uppercase font-bold px-1.5 py-0.5 rounded text-[9px]"
                    style={{ background: `${CANAL_COLORS[t.canal as CanalType]}15`, color: CANAL_COLORS[t.canal as CanalType] }}>
                    {t.canal}
                  </span>
                </div>
              </motion.div>
            ))}

            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 min-h-[120px] transition-all duration-200"
              style={{ border: '2px dashed rgba(212,175,55,0.15)', color: 'rgba(212,175,55,0.4)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(212,175,55,0.35)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(212,175,55,0.04)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(212,175,55,0.15)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              <Plus className="w-7 h-7" />
              <span className="font-inter text-sm font-medium">Nouveau template</span>
            </motion.button>
          </div>
        )}

        {activeTab === 'automatisations' && (
          <div className="space-y-4">
            <div className="card-royal mb-4">
              <div className="flex items-center gap-3 mb-1">
                <Zap className="w-4 h-4 text-gold" />
                <h3 className="font-cinzel text-sm font-bold text-pearl">Automations Actives</h3>
              </div>
              <p className="text-xs text-pearl/35 font-inter">Séquences déclenchées automatiquement selon les actions des membres</p>
            </div>
            {([] as { nom: string; declencheur: string; actions: string[]; actif: boolean; declenche: number; couleur: string }[]).length === 0 && (
              <div className="card-royal text-center py-12">
                <Zap className="w-8 h-8 mx-auto mb-3 text-gold/40" />
                <p className="font-cinzel text-pearl/60">Aucune automatisation configurée</p>
                <p className="font-inter text-xs text-pearl/30 mt-1">Les séquences automatiques apparaîtront ici.</p>
              </div>
            )}
            {([] as { nom: string; declencheur: string; actions: string[]; actif: boolean; declenche: number; couleur: string }[]).map((auto, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i }}
                className="card-royal"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-inter text-sm font-semibold text-pearl">{auto.nom}</h3>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: auto.actif ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                          color: auto.actif ? '#22C55E' : '#6B7280',
                        }}>
                        {auto.actif ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <p className="text-[11px] text-pearl/40 font-inter mb-3">
                      <span className="text-gold/60">Déclencheur:</span> {auto.declencheur}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {auto.actions.map((action, j) => (
                        <div key={j} className="flex items-center gap-1.5 text-[10px] font-inter text-pearl/45 px-2 py-1 rounded-lg"
                          style={{ background: `${auto.couleur}10`, border: `1px solid ${auto.couleur}20` }}>
                          <ChevronRight className="w-2.5 h-2.5" style={{ color: auto.couleur }} />
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-cinzel text-lg font-black" style={{ color: auto.couleur }}>{auto.declenche.toLocaleString()}</div>
                    <div className="text-[9px] text-pearl/25 font-inter">déclenchements</div>
                    <button className="mt-2 w-10 h-5 rounded-full relative flex-shrink-0 block ml-auto transition-all"
                      style={{ background: auto.actif ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.1)' }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                        style={{ left: auto.actif ? '22px' : '2px' }} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create campaign modal */}
        {showForm && (
          <div className="admin-modal-overlay flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-modal-box p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-cinzel text-lg font-bold text-pearl">Nouvelle Campagne</h2>
                <button onClick={() => setShowForm(false)} className="text-pearl/40 hover:text-pearl">✕</button>
              </div>
              <div className="space-y-4">
                <input className="input-royal w-full" placeholder="Nom de la campagne" />
                <div className="grid grid-cols-2 gap-3">
                  <select className="input-royal">
                    <option>Canal — Email</option>
                    <option>Canal — Push</option>
                    <option>Canal — SMS</option>
                    <option>Canal — WhatsApp</option>
                  </select>
                  <select className="input-royal">
                    <option>Tous les membres</option>
                    <option>Membres actifs</option>
                    <option>Disciples + Leaders</option>
                    <option>Partenaires</option>
                    <option>Nouveaux membres</option>
                  </select>
                </div>
                <input className="input-royal w-full" placeholder="Objet de l'email / Titre de la notification" />
                <textarea className="input-royal w-full h-32 resize-none" placeholder="Contenu du message..." />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-pearl/50 font-inter mb-1.5 block">Date d'envoi</label>
                    <input type="datetime-local" className="input-royal w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-pearl/50 font-inter mb-1.5 block">Template</label>
                    <select className="input-royal w-full">
                      <option>Sans template</option>
                      {TEMPLATES.map(t => <option key={t.id}>{t.nom}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-3">Enregistrer brouillon</button>
                  <button onClick={() => setShowForm(false)} className="btn-gold flex-1 py-3 flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Planifier l'envoi
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
