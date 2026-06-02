'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, Phone, Mail, MessageSquare, Plus,
  Filter, MapPin, Star, Clock, ChevronRight,
  User, Tags, ArrowUpRight, Activity, Heart,
  BookOpen, TrendingUp, Send, Calendar
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

type Tag = 'Prospect' | 'Nouveau' | 'Actif' | 'Leader' | 'Intercesseur' | 'Donateur' | 'Inactif'

interface Contact {
  id: string
  prenom: string
  nom: string
  email: string
  phone: string
  pays: string
  drapeau: string
  plateforme: string
  tags: Tag[]
  score: number
  dernierContact: string
  statut: 'chaud' | 'tiede' | 'froid'
  notes: number
  couleur: string
  suiviPar: string
}

// Aucune donnée fictive : le CRM se remplira avec les contacts réels (Supabase / FluentCRM).
const CONTACTS: Contact[] = []

const STATUT_CONFIG = {
  chaud: { label: 'Chaud', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
  tiede: { label: 'Tiède', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  froid: { label: 'Froid', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.25)' },
}

const TAG_COLORS: Record<Tag, string> = {
  'Prospect': '#6B7280',
  'Nouveau': '#3B82F6',
  'Actif': '#22C55E',
  'Leader': '#D4AF37',
  'Intercesseur': '#0EA5E9',
  'Donateur': '#F59E0B',
  'Inactif': '#EF4444',
}

const PIPELINE_STAGES = [
  { id: 'prospect', label: 'Prospects', count: 0, color: '#6B7280' },
  { id: 'contact', label: 'Premier contact', count: 0, color: '#3B82F6' },
  { id: 'interesse', label: 'Intéressé', count: 0, color: '#F59E0B' },
  { id: 'membre', label: 'Membre actif', count: 0, color: '#22C55E' },
  { id: 'leader', label: 'Leader', count: 0, color: '#D4AF37' },
]

export default function AdminCRMPage() {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'pipeline'>('list')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [statutFilter, setStatutFilter] = useState('')

  const filtered = CONTACTS.filter(c => {
    const matchSearch = `${c.prenom} ${c.nom} ${c.email}`.toLowerCase().includes(search.toLowerCase())
    const matchStatut = !statutFilter || c.statut === statutFilter
    return matchSearch && matchStatut
  })

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>CRM <span className="text-cinematic-gold">Ministériel</span></>}
          description="Gestion des relations & suivi pastoral personnalisé."
          actions={
            <>
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {(['list', 'pipeline'] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-all"
                    style={{
                      background: view === v ? 'rgba(212,175,55,0.15)' : 'transparent',
                      color: view === v ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                    }}>
                    {v === 'list' ? 'Liste' : 'Pipeline'}
                  </button>
                ))}
              </div>
              <button className="btn-gold flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Nouveau contact
              </button>
            </>
          }
        />

        {/* KPI row */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
        >
          {[
            { label: 'Total contacts', value: String(CONTACTS.length), icon: Users, color: '#D4AF37' },
            { label: 'Contacts chauds', value: String(CONTACTS.filter(c => c.statut === 'chaud').length), icon: Activity, color: '#EF4444' },
            { label: 'Suivis actifs', value: String(CONTACTS.filter(c => c.suiviPar && c.suiviPar !== 'Non assigné').length), icon: Heart, color: '#EC4899' },
            { label: 'À contacter', value: '0', icon: Clock, color: '#F59E0B' },
            { label: 'Convertis/mois', value: '0', icon: TrendingUp, color: '#22C55E' },
          ].map((kpi, i) => (
            <div key={kpi.label} className="card-royal py-4 text-center">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
                style={{ background: `${kpi.color}18` }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <div className="font-cinzel text-xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-[10px] text-pearl/35 font-inter mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </motion.div>

        {view === 'pipeline' ? (
          /* Pipeline view */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-4"
          >
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.id} className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <div>
                    <div className="font-inter text-xs font-semibold" style={{ color: stage.color }}>{stage.label}</div>
                    <div className="font-cinzel text-lg font-black text-pearl">{stage.count}</div>
                  </div>
                  <div className="w-2 h-8 rounded-full" style={{ background: `${stage.color}40` }} />
                </div>
                {CONTACTS.slice(0, 2).map((c, i) => (
                  <div key={i} className="card-royal p-3 cursor-pointer" onClick={() => setSelectedContact(c)}
                    style={{ borderLeft: `2px solid ${stage.color}40` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-abyss"
                        style={{ background: c.couleur }}>
                        {c.prenom[0]}{c.nom[0]}
                      </div>
                      <div>
                        <p className="font-inter text-xs font-semibold text-pearl">{c.prenom} {c.nom[0]}.</p>
                        <p className="text-[10px] text-pearl/30">{c.drapeau} {c.pays}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-inter px-1.5 py-0.5 rounded"
                        style={{ background: `${stage.color}15`, color: stage.color }}>
                        Score {c.score}
                      </span>
                      <span className="text-[10px] text-pearl/25 font-inter">{c.dernierContact.slice(5)}</span>
                    </div>
                  </div>
                ))}
                <button className="w-full py-2 rounded-xl text-xs font-inter text-pearl/25 hover:text-gold transition-colors"
                  style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                  + Ajouter
                </button>
              </div>
            ))}
          </motion.div>
        ) : (
          /* List view */
          <div className="flex gap-6">
            {/* Main list */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className={`${selectedContact ? 'flex-1' : 'w-full'} space-y-4`}
            >
              {/* Filters */}
              <div className="card-royal flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
                  <input className="input-royal w-full pl-11" placeholder="Rechercher..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  {[{ v: '', l: 'Tous' }, { v: 'chaud', l: '🔴 Chaud' }, { v: 'tiede', l: '🟡 Tiède' }, { v: 'froid', l: '⚫ Froid' }].map(f => (
                    <button key={f.v} onClick={() => setStatutFilter(f.v)}
                      className="px-3 py-2 rounded-xl text-xs font-inter transition-all"
                      style={{
                        background: statutFilter === f.v ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${statutFilter === f.v ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        color: statutFilter === f.v ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                      }}>
                      {f.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filtered.length === 0 && (
                  <div className="card-royal text-center py-16">
                    <Users className="w-8 h-8 mx-auto mb-3 text-gold/40" />
                    <p className="font-cinzel text-pearl/60">Aucun contact pour le moment</p>
                    <p className="font-inter text-xs text-pearl/30 mt-1">Les contacts réels apparaîtront ici.</p>
                  </div>
                )}
                {filtered.map((contact, i) => {
                  const statusCfg = STATUT_CONFIG[contact.statut]
                  const isSelected = selectedContact?.id === contact.id
                  return (
                    <motion.div key={contact.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.02 * i }}
                      onClick={() => setSelectedContact(isSelected ? null : contact)}
                      className="card-royal cursor-pointer transition-all duration-200"
                      style={{
                        borderColor: isSelected ? 'rgba(212,175,55,0.3)' : undefined,
                        boxShadow: isSelected ? '0 0 20px rgba(212,175,55,0.08)' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-abyss font-cinzel flex-shrink-0"
                          style={{ background: contact.couleur }}>
                          {contact.prenom[0]}{contact.nom[0]}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-inter text-sm font-semibold text-pearl">
                              {contact.prenom} {contact.nom}
                            </span>
                            <span className="text-sm">{contact.drapeau}</span>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full font-inter"
                              style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}
                            >
                              {statusCfg.label}
                            </span>
                            {contact.tags.map(tag => (
                              <span key={tag} className="text-[9px] font-inter px-1.5 py-0.5 rounded-full"
                                style={{ background: `${TAG_COLORS[tag]}18`, color: TAG_COLORS[tag] }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-pearl/30 font-inter">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{contact.pays}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{contact.dernierContact}</span>
                          </div>
                        </div>

                        {/* Score + actions */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-center hidden md:block">
                            <div className="font-cinzel text-lg font-black" style={{ color: '#D4AF37' }}>{contact.score}</div>
                            <div className="text-[9px] text-pearl/25 font-inter">score</div>
                          </div>
                          <div className="flex gap-1.5">
                            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-pearl/10 transition-colors"
                              title="Email">
                              <Mail className="w-3.5 h-3.5 text-pearl/40" />
                            </button>
                            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-pearl/10 transition-colors"
                              title="Message">
                              <MessageSquare className="w-3.5 h-3.5 text-pearl/40" />
                            </button>
                            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-pearl/10 transition-colors"
                              title="Appel">
                              <Phone className="w-3.5 h-3.5 text-pearl/40" />
                            </button>
                          </div>
                          <ChevronRight
                            className="w-4 h-4 transition-transform"
                            style={{ color: 'rgba(255,255,255,0.2)', transform: isSelected ? 'rotate(90deg)' : 'none' }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* Contact detail panel */}
            <AnimatePresence>
              {selectedContact && (
                <motion.div
                  initial={{ opacity: 0, x: 20, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: '340px' }}
                  exit={{ opacity: 0, x: 20, width: 0 }}
                  className="flex-shrink-0 space-y-4 overflow-hidden"
                  style={{ minWidth: '340px' }}
                >
                  {/* Profile card */}
                  <div className="card-royal">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-abyss font-cinzel"
                          style={{ background: selectedContact.couleur }}>
                          {selectedContact.prenom[0]}{selectedContact.nom[0]}
                        </div>
                        <div>
                          <h3 className="font-cinzel text-base font-bold text-pearl">
                            {selectedContact.prenom} {selectedContact.nom}
                          </h3>
                          <p className="text-xs text-pearl/40 font-inter">{selectedContact.drapeau} {selectedContact.pays}</p>
                          <p className="text-xs text-gold/60 font-inter">{selectedContact.plateforme}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedContact(null)} className="text-pearl/30 hover:text-pearl text-sm">✕</button>
                    </div>

                    {/* Score circle */}
                    <div className="flex items-center gap-4 mb-4 p-3 rounded-xl"
                      style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)' }}>
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                          <circle cx="32" cy="32" r="26" fill="none" stroke="#D4AF37" strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 26}`}
                            strokeDashoffset={`${2 * Math.PI * 26 * (1 - selectedContact.score / 100)}`} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-cinzel text-lg font-black" style={{ color: '#D4AF37' }}>{selectedContact.score}</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-inter text-xs text-pearl/50">Score d'engagement</p>
                        <p className="font-inter text-sm font-semibold text-pearl mt-0.5">
                          {selectedContact.score >= 80 ? 'Excellent' : selectedContact.score >= 60 ? 'Bon' : 'À améliorer'}
                        </p>
                        <p className="font-inter text-[10px] text-pearl/30 mt-0.5">Suivi par {selectedContact.suiviPar}</p>
                      </div>
                    </div>

                    {/* Contact info */}
                    <div className="space-y-2 mb-4">
                      {[
                        { icon: Mail, value: selectedContact.email },
                        { icon: Phone, value: selectedContact.phone },
                        { icon: Calendar, value: `Dernier contact: ${selectedContact.dernierContact}` },
                      ].map(({ icon: Icon, value }) => (
                        <div key={value} className="flex items-center gap-2.5 text-xs font-inter text-pearl/50">
                          <Icon className="w-3.5 h-3.5 text-gold/40 flex-shrink-0" />
                          {value}
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {selectedContact.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-inter font-semibold px-2 py-1 rounded-full"
                          style={{ background: `${TAG_COLORS[tag]}18`, color: TAG_COLORS[tag], border: `1px solid ${TAG_COLORS[tag]}30` }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Quick actions */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: Mail, label: 'Email', color: '#0EA5E9' },
                        { icon: MessageSquare, label: 'Message', color: '#22C55E' },
                        { icon: Phone, label: 'Appel', color: '#D4AF37' },
                      ].map((action) => (
                        <button key={action.label}
                          className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-inter font-medium transition-all"
                          style={{ background: `${action.color}10`, border: `1px solid ${action.color}20`, color: action.color }}>
                          <action.icon className="w-4 h-4" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="card-royal">
                    <h4 className="font-cinzel text-xs font-bold text-pearl mb-3 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-gold" />
                      Notes pastorales ({selectedContact.notes})
                    </h4>
                    <div className="space-y-2 mb-3">
                      <p className="text-xs text-pearl/25 font-inter text-center py-3">Aucune note pour l'instant</p>
                    </div>
                    <div className="relative">
                      <textarea
                        className="input-royal w-full h-16 resize-none text-xs pr-10"
                        placeholder="Ajouter une note pastorale..."
                      />
                      <button className="absolute bottom-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: 'rgba(212,175,55,0.15)' }}>
                        <Send className="w-3 h-3 text-gold" />
                      </button>
                    </div>
                  </div>

                  {/* Spiritual journey */}
                  <div className="card-royal">
                    <h4 className="font-cinzel text-xs font-bold text-pearl mb-3 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-gold" />
                      Parcours Spirituel
                    </h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Formations en cours', value: '0', icon: BookOpen, color: '#8B5CF6' },
                        { label: 'Prières soumises', value: '0', icon: Heart, color: '#EC4899' },
                        { label: 'Score engagement', value: `${selectedContact.score}/100`, icon: Star, color: '#D4AF37' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2">
                            <item.icon className="w-3 h-3" style={{ color: item.color }} />
                            <span className="text-xs font-inter text-pearl/45">{item.label}</span>
                          </div>
                          <span className="text-xs font-cinzel font-bold" style={{ color: item.color }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
