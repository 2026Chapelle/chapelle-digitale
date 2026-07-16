'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, Bell, Shield, Globe, Palette, CreditCard,
  Mail, Smartphone, Save, Eye, EyeOff, Key, Users,
  Database, Zap, Check, ChevronRight, Download, Loader2,
  Church, Flame, Crown, Heart, BookOpen, Home, HandHeart,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { PasskeysManager } from './PasskeysManager'
import { OrganizationEssentialsForm } from './OrganizationEssentialsForm'
import { UnitHierarchyNav, type HierarchyUnit } from './UnitHierarchyNav'
import { UnitSettingsForm } from './UnitSettingsForm'
import { PastoralSettingsPanel } from './PastoralSettingsPanel'

const SECTIONS = [
  { id: 'general', label: 'Général', icon: Settings, color: '#D4AF37' },
  { id: 'hierarchie', label: 'Hiérarchie & unité', icon: Church, color: '#D4AF37' },
  { id: 'pastoral', label: 'Parcours pastoral', icon: BookOpen, color: '#8B5CF6' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: '#0EA5E9' },
  { id: 'securite', label: 'Sécurité', icon: Shield, color: '#EF4444' },
  { id: 'plateformes', label: 'Plateformes', icon: Globe, color: '#22C55E' },
  { id: 'paiements', label: 'Paiements', icon: CreditCard, color: '#8B5CF6' },
  { id: 'emails', label: 'Emails', icon: Mail, color: '#F59E0B' },
]

export default function AdminParametresPage() {
  const [activeSection, setActiveSection] = useState('general')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeUnit, setActiveUnit] = useState<HierarchyUnit | null>(null)
  const [form, setForm] = useState({
    churchName: '',
    slogan: '',
    email: '',
    phone: '',
    timezone: '',
    language: '',
    currency: '',
    apiKey: '••••••••••••••••••••••••••',
    emailProvider: 'resend',
    emailFrom: '',
    emailFromName: '',
    maintenanceMode: false,
    registrationOpen: true,
    requireEmailVerification: true,
    allowGuestPrayers: true,
    showLiveViewerCount: true,
    twoFactorAdmin: true,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>Paramètres <span className="text-cinematic-gold">Organisation</span></>}
          description="Hiérarchie mondiale, identité, unités et parcours pastoral (ERP Lot 5)."
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar nav */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="card-royal h-fit"
          >
            <nav className="space-y-0.5">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-inter font-medium transition-all"
                  style={{
                    background: activeSection === s.id ? `${s.color}15` : 'transparent',
                    color: activeSection === s.id ? s.color : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${activeSection === s.id ? `${s.color}30` : 'transparent'}`,
                  }}
                >
                  <s.icon className="w-4 h-4 flex-shrink-0" />
                  {s.label}
                  {activeSection === s.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </button>
              ))}
            </nav>
          </motion.div>

          {/* Content */}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-3 space-y-6"
          >
            {activeSection === 'hierarchie' && (
              <>
                <UnitHierarchyNav
                  activeUnitId={activeUnit?.id || null}
                  onSelect={setActiveUnit}
                />
                <UnitSettingsForm
                  unitId={activeUnit?.id || null}
                  unitLabel={activeUnit?.name}
                  unitType={activeUnit?.unit_type}
                />
              </>
            )}

            {activeSection === 'pastoral' && <PastoralSettingsPanel />}

            {activeSection === 'general' && (
              <>
                <LivretSetting />
                <OrganizationEssentialsForm />
                <UnitHierarchyNav
                  activeUnitId={activeUnit?.id || null}
                  onSelect={setActiveUnit}
                />
                <UnitSettingsForm
                  unitId={activeUnit?.id || null}
                  unitLabel={activeUnit?.name}
                  unitType={activeUnit?.unit_type}
                />

                <div className="card-royal">
                  <h2 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gold" />
                    Fonctionnalités Plateforme
                    <span className="text-[10px] text-pearl/30 font-inter font-normal ml-2">(legacy mock)</span>
                  </h2>
                  <div className="space-y-4">
                    {[
                      { key: 'registrationOpen', label: 'Inscriptions ouvertes', desc: 'Permettre aux nouveaux membres de s\'inscrire' },
                      { key: 'requireEmailVerification', label: 'Vérification email obligatoire', desc: 'L\'email doit être confirmé avant l\'accès au membre' },
                      { key: 'allowGuestPrayers', label: 'Prières invités', desc: 'Les visiteurs non connectés peuvent soumettre des prières' },
                      { key: 'showLiveViewerCount', label: 'Afficher le nombre de spectateurs', desc: 'Montrer le compteur en temps réel sur les lives' },
                      { key: 'maintenanceMode', label: 'Mode maintenance', desc: 'Afficher une page de maintenance pour les visiteurs' },
                    ].map((toggle) => (
                      <div key={toggle.key} className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-pearl/[0.02] transition-colors">
                        <div>
                          <p className="font-inter text-sm font-semibold text-pearl">{toggle.label}</p>
                          <p className="font-inter text-xs text-pearl/35 mt-0.5">{toggle.desc}</p>
                        </div>
                        <button
                          onClick={() => setForm(prev => ({ ...prev, [toggle.key]: !(prev as any)[toggle.key] }))}
                          className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300"
                          style={{
                            background: (form as any)[toggle.key] ? 'rgba(212,175,55,0.8)' : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          <div
                            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                            style={{ left: (form as any)[toggle.key] ? '22px' : '2px' }}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeSection === 'notifications' && (
              <div className="card-royal">
                <h2 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gold" />
                  Paramètres de Notification
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      category: 'Email',
                      icon: Mail,
                      items: ['Nouvel inscription', 'Demande de prière', 'Nouveau don', 'Événement à venir', 'Formation complétée'],
                    },
                    {
                      category: 'Push (mobile)',
                      icon: Smartphone,
                      items: ['Live en cours', 'Réponse à ma prière', 'Nouveau message', 'Badge débloqué'],
                    },
                  ].map((group) => (
                    <div key={group.category}>
                      <div className="flex items-center gap-2 mb-3">
                        <group.icon className="w-4 h-4 text-gold" />
                        <span className="font-cinzel text-xs font-bold text-pearl">{group.category}</span>
                      </div>
                      <div className="space-y-2 pl-6">
                        {group.items.map((item) => (
                          <div key={item} className="flex items-center justify-between py-2 border-b border-pearl/[0.04]">
                            <span className="font-inter text-sm text-pearl/60">{item}</span>
                            <button
                              className="w-10 h-5 rounded-full transition-all duration-200 relative"
                              style={{ background: 'rgba(212,175,55,0.7)' }}
                            >
                              <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white shadow" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'securite' && (
              <>
              <PasskeysManager />
              <div className="card-royal">
                <h2 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gold" />
                  Sécurité & Accès
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">
                      Authentification 2FA pour admins
                    </label>
                    <div className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="font-inter text-sm text-green-400">Activé — Tous les admins doivent utiliser 2FA</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">Clé API Principale</label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        className="input-royal w-full pr-12 font-mono text-sm"
                        value={form.apiKey}
                        readOnly
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-pearl/40 hover:text-pearl"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">Sessions actives</label>
                    <div className="p-3 rounded-xl text-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="font-inter text-xs text-pearl/40">Aucune session active à afficher.</p>
                    </div>
                  </div>
                </div>
              </div>
              </>
            )}

            {activeSection === 'paiements' && (
              <div className="card-royal">
                <h2 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gold" />
                  Configuration Paiements (Chariow)
                </h2>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="font-inter text-sm font-semibold text-green-300">Chariow — liens & widgets opérationnels</span>
                    </div>
                    <p className="font-inter text-xs text-green-400/60">Aucune donnée bancaire stockée. Le paiement se déroule chez Chariow.</p>
                  </div>
                  <div>
                    <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">Domaine boutique Chariow</label>
                    <input className="input-royal w-full font-mono text-sm" value="zrqcqzjz.mychariow.shop" readOnly />
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
                    <p className="font-inter text-sm text-pearl/70 mb-2">
                      Les produits de don/offrande/partenariat se gèrent dans le module dédié.
                    </p>
                    <a href="/admin/dons" className="btn-gold-cinematic px-4 py-2 text-xs inline-flex">Ouvrir « Dons & Offrandes »</a>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'emails' && (
              <div className="card-royal">
                <h2 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gold" />
                  Configuration Email
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">Fournisseur</label>
                      <select className="input-royal w-full" value={form.emailProvider}
                        onChange={e => setForm({ ...form, emailProvider: e.target.value })}>
                        <option value="resend">Resend</option>
                        <option value="sendgrid">SendGrid</option>
                        <option value="mailgun">Mailgun</option>
                        <option value="smtp">SMTP personnalisé</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">Email d'envoi</label>
                      <input className="input-royal w-full" value={form.emailFrom}
                        onChange={e => setForm({ ...form, emailFrom: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">Nom d'expéditeur</label>
                    <input className="input-royal w-full" value={form.emailFromName}
                      onChange={e => setForm({ ...form, emailFromName: e.target.value })} />
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
                    <p className="font-inter text-xs text-gold/70">
                      Clé API Resend configurée · Domaine chapelleduroyaume.org vérifié · DKIM et SPF actifs
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'plateformes' && (
              <div className="card-royal">
                <h2 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gold" />
                  Plateformes Ministérielles
                </h2>
                <div className="space-y-3">
                  {([
                    { nom: 'CIER',                     icon: Church,    actif: true,  membres: 0, couleur: '#D4AF37' },
                    { nom: 'Jeunesse',                 icon: Flame,     actif: true,  membres: 0, couleur: '#6366F1' },
                    { nom: "Femmes d'Exceptions",      icon: Crown,     actif: true,  membres: 0, couleur: '#EC4899' },
                    { nom: 'Chapelle Familiale',       icon: Users,     actif: true,  membres: 0, couleur: '#F97316' },
                    { nom: 'CFIC',                     icon: BookOpen,  actif: true,  membres: 0, couleur: '#8B5CF6' },
                    { nom: 'Mahanaïm',                 icon: Heart,     actif: true,  membres: 0, couleur: '#0EA5E9' },
                    { nom: 'Cité du Refuge',           icon: Home,      actif: false, membres: 0, couleur: '#14B8A6' },
                    { nom: 'Familles de la Chapelle',  icon: HandHeart, actif: true,  membres: 0, couleur: '#22C55E' },
                  ] as { nom: string; icon: LucideIcon; actif: boolean; membres: number; couleur: string }[]).map((p) => (
                    <div key={p.nom} className="flex items-center gap-4 p-3.5 rounded-xl transition-colors"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${p.couleur}18`, border: `1px solid ${p.couleur}35` }}
                      >
                        <p.icon className="w-5 h-5" style={{ color: p.couleur }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-inter text-sm font-semibold text-pearl truncate">{p.nom}</p>
                        <p className="font-inter text-xs text-pearl/35 mt-0.5">{p.membres.toLocaleString('fr')} membres</p>
                      </div>
                      <div className="text-xs font-inter font-semibold px-2.5 py-1 rounded-full hidden sm:block"
                        style={{
                          background: p.actif ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                          color: p.actif ? '#22C55E' : '#6B7280',
                          border: `1px solid ${p.actif ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.2)'}`,
                        }}>
                        {p.actif ? 'Active' : 'Inactive'}
                      </div>
                      <button className="p-1.5 rounded-lg hover:bg-pearl/10 transition-colors">
                        <Settings className="w-3.5 h-3.5 text-pearl/30" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
            <motion.button
              onClick={handleSave}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-inter text-sm font-semibold transition-all duration-300"
              style={{
                background: saved
                  ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                  : 'linear-gradient(135deg, #D4AF37, #C49A20)',
                color: '#1A0F00',
                boxShadow: saved ? '0 4px 20px rgba(34,197,94,0.3)' : '0 4px 20px rgba(212,175,55,0.3)',
              }}
            >
              {saved ? (
                <><Check className="w-4 h-4" /> Paramètres sauvegardés</>
              ) : (
                <><Save className="w-4 h-4" /> Sauvegarder les modifications</>
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

/**
 * Réglage RÉEL « Livret d'Accueil (URL) » → cms_settings.livret_accueil_url.
 * Autonome : ne touche pas au formulaire général. Réutilise l'API CMS existante.
 */
function LivretSetting() {
  const [url, setUrl] = useState('')
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (IS_DEMO_MODE) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('cms_settings').select('value').eq('key', 'livret_accueil_url').maybeSingle()
        if (cancelled) return
        if (data) {
          setExists(true)
          const v = data.value
          setUrl(typeof v === 'string' ? v : (v && typeof v === 'object' && 'url' in v ? String((v as any).url) : ''))
        }
      } catch { /* clé absente */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  async function save() {
    setSaving(true); setError(null)
    try {
      const method = exists ? 'PATCH' : 'POST'
      const r = await fetch('/api/admin/cms/settings', {
        method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ key: 'livret_accueil_url', value: url.trim(), label: "Livret d'Accueil (URL)", groupe: 'general' }),
      })
      const j = await r.json()
      if (j.ok) { setExists(true); setSaved(true); setTimeout(() => setSaved(false), 2500) }
      else setError(j.message || 'Échec de l’enregistrement')
    } catch { setError('Erreur réseau') }
    setSaving(false)
  }

  return (
    <div className="card-royal">
      <h2 className="font-cinzel text-sm font-bold text-pearl mb-1.5 flex items-center gap-2">
        <Download className="w-4 h-4 text-gold" />
        Livret d'Accueil
      </h2>
      <p className="text-[11px] text-pearl/40 font-inter mb-4">
        URL du PDF (téléversez-le d'abord dans <strong>Médias</strong>, puis collez son lien ici). Il apparaîtra dans le parcours d'intégration et l'email de bienvenue.
      </p>
      <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">Livret d'Accueil (URL)</label>
      <div className="flex gap-2">
        <input
          className="input-royal flex-1" placeholder="https://…/storage/v1/object/public/media/documents/livret.pdf"
          value={url} disabled={loading}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button onClick={save} disabled={saving || loading} className="btn-gold-cinematic px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Enregistré' : 'Enregistrer'}
        </button>
      </div>
      {error && <p className="text-[11px] text-danger font-inter mt-2">{error}</p>}
      {url && !error && (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-gold/80 hover:text-gold font-inter mt-2">
          <Download className="w-3 h-3" /> Tester le lien
        </a>
      )}
    </div>
  )
}
