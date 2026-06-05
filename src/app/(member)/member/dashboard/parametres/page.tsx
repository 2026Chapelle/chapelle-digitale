'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  User, Lock, Bell, Shield, Trash2, Eye, EyeOff,
  Camera, Check, ChevronRight, Globe, Mail, Phone, Save, Volume2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/components/providers/AuthProvider'
import { getBrowserClient } from '@/lib/supabase-browser'
import { getLiveSoundEnabled, setLiveSoundEnabled, playLiveChime } from '@/lib/live-sound'

const TABS = [
  { id: 'profil', label: 'Profil', icon: User },
  { id: 'securite', label: 'Sécurité', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'confidentialite', label: 'Confidentialité', icon: Shield },
]

const NOTIF_PREFS = [
  { id: 'lives', label: 'Alertes Live & Cultes', desc: 'Notification 15 min avant chaque culte en direct', defaultOn: true },
  { id: 'prieres', label: 'Réponses à mes prières', desc: 'Quand la communauté intercède pour vous', defaultOn: true },
  { id: 'formations', label: 'Nouveaux contenus', desc: 'Formations, podcasts et ressources publiés', defaultOn: true },
  { id: 'evenements', label: 'Événements à venir', desc: 'Rappels pour les événements auxquels vous êtes inscrit', defaultOn: true },
  { id: 'messages', label: 'Messages directs', desc: 'Quand un membre vous envoie un message', defaultOn: false },
  { id: 'newsletter', label: 'Newsletter hebdomadaire', desc: 'Résumé hebdomadaire de la communauté', defaultOn: false },
  { id: 'dons', label: 'Confirmations de dons', desc: 'Reçu et confirmation pour chaque don', defaultOn: true },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
      style={{ background: on ? 'linear-gradient(135deg, #D4AF37, #C49A20)' : 'rgba(255,255,255,0.1)' }}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
        animate={{ left: on ? 'calc(100% - 20px)' : '4px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState('profil')
  const [showOldPw, setShowOldPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_PREFS.map(n => [n.id, n.defaultOn]))
  )
  const [liveSound, setLiveSound] = useState(false)
  useEffect(() => { setLiveSound(getLiveSoundEnabled()) }, [])
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showGroupe: true,
    showDons: false,
    showEngagement: true,
    allowMessages: true,
    showInSearch: true,
  })
  const { user, isDemo } = useAuth()
  const [profileForm, setProfileForm] = useState({
    prenom: '', nom: '', email: '', telephone: '', ville: '', pays: '', bio: '',
  })
  const [pwForm, setPwForm] = useState({ ancien: '', nouveau: '', confirmer: '' })

  // Chargement du vrai profil (clé anon + RLS).
  useEffect(() => {
    if (isDemo || !user?.id) return
    const client = getBrowserClient()
    if (!client) return
    client.from('profiles').select('prenom, nom, email, telephone, ville, pays').eq('id', user.id).single()
      .then(({ data: p }) => {
        if (p) setProfileForm((f) => ({
          ...f, prenom: p.prenom ?? '', nom: p.nom ?? '', email: p.email ?? user.email ?? '',
          telephone: p.telephone ?? '', ville: p.ville ?? '', pays: p.pays ?? '',
        }))
      })
  }, [isDemo, user])

  const save = async () => {
    setSaving(true)
    try {
      const client = getBrowserClient()
      if (!isDemo && client && user?.id) {
        const { error } = await client.from('profiles').update({
          prenom: profileForm.prenom, nom: profileForm.nom,
          telephone: profileForm.telephone, ville: profileForm.ville, pays: profileForm.pays,
        }).eq('id', user.id)
        if (error) { toast.error(error.message); setSaving(false); return }
      }
      toast.success('Paramètres sauvegardés ✓')
    } catch { toast.error('Erreur réseau') }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-cinzel text-2xl font-black text-white mb-1">Paramètres</h1>
        <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Gérez votre compte et vos préférences</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 flex-1 justify-center py-2.5 px-3 rounded-xl font-inter text-xs font-semibold transition-all"
            style={{
              background: activeTab === t.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.35)',
            }}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* PROFIL TAB */}
        {activeTab === 'profil' && (
          <motion.div key="profil" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Avatar */}
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-inter font-semibold text-white text-sm mb-5">Photo de profil</h3>
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-cinzel font-black text-2xl"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #8B5CF6)', color: '#fff' }}>
                    {(profileForm.prenom[0] || '✦').toUpperCase()}
                  </div>
                  <Link href="/member/dashboard/profil" className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)' }} title="Changer la photo">
                    <Camera className="w-3.5 h-3.5 text-[#1A0F00]" />
                  </Link>
                </div>
                <div>
                  <div className="font-inter text-sm font-semibold text-white">{`${profileForm.prenom} ${profileForm.nom}`.trim() || 'Mon compte'}</div>
                  <div className="text-xs font-inter mt-0.5" style={{ color: '#D4AF37' }}>{profileForm.email}</div>
                  <Link href="/member/dashboard/profil" className="text-xs font-inter mt-2 underline inline-block" style={{ color: 'rgba(255,255,255,0.35)' }}>Changer la photo</Link>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 rounded-2xl space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-inter font-semibold text-white text-sm mb-1">Informations personnelles</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'prenom', label: 'Prénom', icon: User },
                  { key: 'nom', label: 'Nom', icon: User },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-inter font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.label}</label>
                    <input
                      value={profileForm[f.key as keyof typeof profileForm]}
                      onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl font-inter text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                ))}
              </div>
              {[
                { key: 'email', label: 'Email', icon: Mail, type: 'email' },
                { key: 'telephone', label: 'Téléphone', icon: Phone, type: 'tel' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-inter font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={profileForm[f.key as keyof typeof profileForm]}
                    onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl font-inter text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                {[{ key: 'ville', label: 'Ville' }, { key: 'pays', label: 'Pays' }].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-inter font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.label}</label>
                    <input
                      value={profileForm[f.key as keyof typeof profileForm]}
                      onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl font-inter text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-inter font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Bio</label>
                <textarea
                  rows={3}
                  value={profileForm.bio}
                  onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl font-inter text-sm text-white outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <div className="text-right text-[10px] font-inter mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {profileForm.bio.length}/200
                </div>
              </div>
            </div>

            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-inter font-bold text-sm transition-all hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
              {saving
                ? <><div className="w-4 h-4 border-2 border-[#1A0F00]/30 border-t-[#1A0F00] rounded-full animate-spin" />Sauvegarde…</>
                : <><Save className="w-4 h-4" />Sauvegarder les modifications</>
              }
            </button>
          </motion.div>
        )}

        {/* SÉCURITÉ TAB */}
        {activeTab === 'securite' && (
          <motion.div key="securite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="p-6 rounded-2xl space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-inter font-semibold text-white text-sm">Changer le mot de passe</h3>
              {[
                { key: 'ancien', label: 'Mot de passe actuel', show: showOldPw, toggle: () => setShowOldPw(v => !v) },
                { key: 'nouveau', label: 'Nouveau mot de passe', show: showNewPw, toggle: () => setShowNewPw(v => !v) },
                { key: 'confirmer', label: 'Confirmer le nouveau mot de passe', show: showNewPw, toggle: () => setShowNewPw(v => !v) },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-inter font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.label}</label>
                  <div className="relative">
                    <input
                      type={f.show ? 'text' : 'password'}
                      value={pwForm[f.key as keyof typeof pwForm]}
                      onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-3 pr-10 py-2.5 rounded-xl font-inter text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                    <button onClick={f.toggle} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              {/* Password strength */}
              {pwForm.nouveau && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-inter" style={{ color: 'rgba(255,255,255,0.4)' }}>Force du mot de passe</div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div key={level} className="flex-1 h-1 rounded-full transition-all"
                        style={{ background: pwForm.nouveau.length >= level * 3 ? (level <= 2 ? '#EF4444' : level === 3 ? '#F59E0B' : '#22C55E') : 'rgba(255,255,255,0.1)' }} />
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => { toast.success('Mot de passe mis à jour ✓'); setPwForm({ ancien: '', nouveau: '', confirmer: '' }) }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-inter font-bold text-sm transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
                <Lock className="w-4 h-4" />
                Mettre à jour le mot de passe
              </button>
            </div>

            {/* 2FA */}
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-inter font-semibold text-white text-sm mb-1">Authentification à deux facteurs</h3>
                  <p className="text-xs font-inter" style={{ color: 'rgba(255,255,255,0.4)' }}>Ajoutez une couche de sécurité supplémentaire à votre compte</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-inter text-xs font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
                  <Check className="w-3.5 h-3.5" />
                  Activer
                </button>
              </div>
            </div>

            {/* Sessions */}
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-inter font-semibold text-white text-sm mb-4">Sessions actives</h3>
              {[
                { device: 'Chrome · Windows 11', location: 'Paris, France', time: 'Maintenant', current: true },
                { device: 'Safari · iPhone 15', location: 'Paris, France', time: 'Il y a 2h', current: false },
                { device: 'Firefox · MacBook', location: 'Lyon, France', time: 'Hier', current: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between py-3" style={{ borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div>
                    <div className="text-sm font-inter font-medium text-white flex items-center gap-2">
                      {s.device}
                      {s.current && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Actuelle</span>}
                    </div>
                    <div className="text-[11px] font-inter mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.location} · {s.time}</div>
                  </div>
                  {!s.current && (
                    <button className="text-xs font-inter px-3 py-1.5 rounded-lg transition-all hover:bg-red-500/10"
                      style={{ color: 'rgba(239,68,68,0.7)' }}
                      onClick={() => toast.success('Session révoquée')}>
                      Révoquer
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Danger zone */}
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <h3 className="font-inter font-semibold text-sm mb-1" style={{ color: '#EF4444' }}>Zone de danger</h3>
              <p className="text-xs font-inter mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>La suppression de votre compte est irréversible. Toutes vos données seront perdues.</p>
              <button
                onClick={() => toast.error('Action non disponible en mode démo')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-inter text-xs font-semibold transition-all"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer mon compte
              </button>
            </div>
          </motion.div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-inter font-semibold text-white text-sm mb-5">Préférences de notifications</h3>
              <div className="space-y-5">
                {NOTIF_PREFS.map(n => (
                  <div key={n.id} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-inter text-sm font-medium text-white">{n.label}</div>
                      <div className="text-[11px] font-inter mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{n.desc}</div>
                    </div>
                    <Toggle on={notifs[n.id]} onChange={v => setNotifs(p => ({ ...p, [n.id]: v }))} />
                  </div>
                ))}
              </div>
            </div>

            {/* Son des alertes live (préférence réelle, par appareil) */}
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Volume2 className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
                  <div className="min-w-0">
                    <div className="font-inter text-sm font-medium text-white">Activer le son des alertes live</div>
                    <div className="text-[11px] font-inter mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Un bip court et discret quand un live démarre (si votre navigateur l'autorise).</div>
                  </div>
                </div>
                <Toggle on={liveSound} onChange={(v) => { setLiveSound(v); setLiveSoundEnabled(v); if (v) void playLiveChime() }} />
              </div>
            </div>

            {/* Channels */}
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-inter font-semibold text-white text-sm mb-4">Canaux de notification</h3>
              {[
                { label: 'Notifications push (navigateur)', icon: Bell, active: true },
                { label: 'Email', icon: Mail, active: true },
                { label: 'WhatsApp', icon: Globe, active: false },
              ].map((c, i) => (
                <div key={i} className="flex items-center justify-between py-3" style={{ borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    <c.icon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    <span className="text-sm font-inter text-white">{c.label}</span>
                  </div>
                  <Toggle on={c.active} onChange={() => {}} />
                </div>
              ))}
            </div>

            <button onClick={save}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-inter font-bold text-sm transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
              <Save className="w-4 h-4" />
              Sauvegarder les préférences
            </button>
          </motion.div>
        )}

        {/* CONFIDENTIALITÉ TAB */}
        {activeTab === 'confidentialite' && (
          <motion.div key="confidentialite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-inter font-semibold text-white text-sm mb-5">Visibilité du profil</h3>
              <div className="space-y-5">
                {[
                  { key: 'profilePublic', label: 'Profil public', desc: 'Votre profil est visible par les autres membres' },
                  { key: 'showGroupe', label: 'Afficher mon groupe', desc: 'Les autres membres voient votre groupe de cellule' },
                  { key: 'showEngagement', label: 'Afficher mes badges', desc: 'Vos badges et niveau d\'engagement sont visibles' },
                  { key: 'showDons', label: 'Afficher mes dons', desc: 'Votre statut de partenaire est visible publiquement' },
                  { key: 'allowMessages', label: 'Autoriser les messages', desc: 'Les membres peuvent vous envoyer des messages directs' },
                  { key: 'showInSearch', label: 'Apparaître dans la recherche', desc: 'Vous pouvez être trouvé via la recherche communautaire' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-inter text-sm font-medium text-white">{item.label}</div>
                      <div className="text-[11px] font-inter mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.desc}</div>
                    </div>
                    <Toggle
                      on={privacy[item.key as keyof typeof privacy]}
                      onChange={v => setPrivacy(p => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Data */}
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-inter font-semibold text-white text-sm mb-4">Vos données</h3>
              <div className="space-y-3">
                {[
                  { label: 'Télécharger mes données', desc: 'Export JSON de toutes vos données CIER', action: 'Télécharger' },
                  { label: 'Rapport de confidentialité', desc: 'Voir comment vos données sont utilisées', action: 'Consulter' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div>
                      <div className="text-sm font-inter font-medium text-white">{item.label}</div>
                      <div className="text-[11px] font-inter mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.desc}</div>
                    </div>
                    <button
                      onClick={() => toast.success('Fonctionnalité bientôt disponible')}
                      className="flex items-center gap-1 text-xs font-inter font-semibold transition-colors"
                      style={{ color: '#D4AF37' }}>
                      {item.action}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={save}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-inter font-bold text-sm transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
