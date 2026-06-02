'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Save, Lock, Check, Camera, Loader2, Church, Flame, Crown, Users, Heart, BookOpen, Home, HandHeart,
  type LucideIcon,
} from 'lucide-react'
import { PARCOURS_DISCIPLE, BADGES } from '@/lib/constants'
import { useAuth } from '@/components/providers/AuthProvider'
import { getBrowserClient } from '@/lib/supabase-browser'
import toast from 'react-hot-toast'

/** Vue de secours (mode démo, Supabase non configuré). */
const DEMO_VIEW = {
  prenom: 'Jean', nom: 'Démo', email: 'demo@chapelleduroyaume.org', pays: 'France', ville: 'Paris',
  telephone: '', avatar_url: '', score: 72, etape: 3, role: 'Disciple',
  since: '15 Jan 2026', plateforme: 'cier', formations: 4, badges: 3,
}

type Plateforme = { id: string; name: string; icon: LucideIcon; color: string }
const PLATEFORMES: Plateforme[] = [
  { id: 'cier',                name: 'CIER Global',        icon: Church,    color: '#D4AF37' },
  { id: 'jeunesse',            name: 'Jeunesse',           icon: Flame,     color: '#EF4444' },
  { id: 'femmes-exceptions',   name: 'Femmes Exceptions',  icon: Crown,     color: '#EC4899' },
  { id: 'chapelle-familiale',  name: 'Chapelle Familiale', icon: Users,     color: '#F97316' },
  { id: 'mahanaim',            name: 'Intercession',       icon: Heart,     color: '#8B5CF6' },
  { id: 'cfic',                name: 'Académie CFIC',      icon: BookOpen,  color: '#0EA5E9' },
  { id: 'cite-refuge',         name: 'Cité du Refuge',     icon: Home,      color: '#22C55E' },
  { id: 'familles-chapelle',   name: 'Familles',           icon: HandHeart, color: '#F59E0B' },
]

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

export default function ProfilPage() {
  const { user, isDemo } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(!isDemo)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Données serveur (lecture seule + meta)
  const [meta, setMeta] = useState({
    email: '', avatar_url: '', score: 0, etape: 0, role: 'Membre',
    since: '', formations: 0, badges: 0,
  })
  // Champs éditables
  const [form, setForm] = useState({
    prenom: '', nom: '', pays: '', ville: '', telephone: '', plateforme_principale: 'cier',
  })

  // Mot de passe
  const [pwd, setPwd] = useState({ next: '', confirm: '' })
  const [pwdSaving, setPwdSaving] = useState(false)

  const hydrateFromDemo = useCallback(() => {
    setForm({
      prenom: DEMO_VIEW.prenom, nom: DEMO_VIEW.nom, pays: DEMO_VIEW.pays,
      ville: DEMO_VIEW.ville, telephone: DEMO_VIEW.telephone, plateforme_principale: DEMO_VIEW.plateforme,
    })
    setMeta({
      email: DEMO_VIEW.email, avatar_url: DEMO_VIEW.avatar_url, score: DEMO_VIEW.score,
      etape: DEMO_VIEW.etape, role: DEMO_VIEW.role, since: DEMO_VIEW.since,
      formations: DEMO_VIEW.formations, badges: DEMO_VIEW.badges,
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isDemo) { hydrateFromDemo(); return }
    let cancelled = false
    ;(async () => {
      try {
        const client = getBrowserClient()
        if (!client || !user?.id) { setMeta((m) => ({ ...m, email: user?.email ?? '' })); return }
        // Lecture du PROPRE profil via la clé anon + RLS (auth.uid() = id).
        const { data: p } = await client.from('profiles').select('*').eq('id', user.id).single()
        if (cancelled) return
        if (p) {
          setForm({
            prenom: p.prenom ?? '', nom: p.nom ?? '', pays: p.pays ?? '',
            ville: p.ville ?? '', telephone: p.telephone ?? '',
            plateforme_principale: p.plateforme_principale ?? 'cier',
          })
          setMeta({
            email: p.email ?? user?.email ?? '',
            avatar_url: p.avatar_url ?? '',
            score: p.score_engagement ?? 0,
            etape: p.parcours_disciple_etape ?? 0,
            role: (p.membre_statut || p.role || 'Membre') as string,
            since: fmtDate(p.date_inscription),
            formations: 0,
            badges: 0,
          })
        } else {
          setMeta((m) => ({ ...m, email: user?.email ?? '' }))
        }
      } catch {
        setMeta((m) => ({ ...m, email: user?.email ?? '' }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isDemo, user, hydrateFromDemo])

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSave() {
    if (isDemo) { setSaved(true); setTimeout(() => setSaved(false), 2000); return }
    const client = getBrowserClient()
    if (!client || !user?.id) { toast.error('Session expirée — reconnectez-vous.'); return }
    setSaving(true)
    try {
      // Mise à jour de SON propre profil via la clé anon + RLS (jamais service_role).
      const { error } = await client.from('profiles').update({
        prenom: form.prenom, nom: form.nom, pays: form.pays,
        ville: form.ville, telephone: form.telephone,
        plateforme_principale: form.plateforme_principale,
      }).eq('id', user.id)
      if (error) toast.error(error.message)
      else { setSaved(true); toast.success('Profil mis à jour ✨'); setTimeout(() => setSaved(false), 2000) }
    } catch (e: any) { toast.error(e?.message || 'Erreur réseau') }
    setSaving(false)
  }

  async function handleAvatar(file: File) {
    if (isDemo) { toast('Disponible une fois connecté à Supabase.'); return }
    const client = getBrowserClient()
    if (!client || !user?.id) { toast.error('Session expirée — reconnectez-vous.'); return }
    if (!file.type.startsWith('image/')) { toast.error('Choisissez une image.'); return }
    setUploading(true)
    try {
      // Upload dans le bucket avatars (clé anon + RLS : dossier = id du membre).
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: upErr } = await client.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { toast.error(upErr.message); setUploading(false); return }
      const { data: pub } = client.storage.from('avatars').getPublicUrl(path)
      // Cache-buster pour rafraîchir l'affichage après remplacement.
      const url = `${pub.publicUrl}?v=${Date.now()}`
      const { error: updErr } = await client.from('profiles').update({ avatar_url: pub.publicUrl }).eq('id', user.id)
      if (updErr) toast.error(updErr.message)
      else { setMeta((m) => ({ ...m, avatar_url: url })); toast.success('Photo mise à jour 📸') }
    } catch (e: any) { toast.error(e?.message || 'Erreur réseau') }
    setUploading(false)
  }

  async function handlePassword() {
    if (pwd.next.length < 8) { toast.error('8 caractères minimum.'); return }
    if (pwd.next !== pwd.confirm) { toast.error('Les mots de passe ne correspondent pas.'); return }
    if (isDemo) { toast('Disponible une fois connecté à Supabase.'); return }
    setPwdSaving(true)
    try {
      const client = getBrowserClient()
      const { error } = await client!.auth.updateUser({ password: pwd.next })
      if (error) toast.error(error.message)
      else { toast.success('Mot de passe mis à jour 🔒'); setPwd({ next: '', confirm: '' }) }
    } catch { toast.error('Erreur') }
    setPwdSaving(false)
  }

  const etapeIdx = Math.min(Math.max(meta.etape, 0), PARCOURS_DISCIPLE.length - 1)
  const etapeActuelle = PARCOURS_DISCIPLE[etapeIdx]
  const initials = `${(form.prenom[0] || '').toUpperCase()}${(form.nom[0] || '').toUpperCase()}` || '✦'
  const selectedName = PLATEFORMES.find((p) => p.id === form.plateforme_principale)?.name ?? '—'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl p-8 mb-8"
          style={{ background: 'linear-gradient(135deg, #0a0018 0%, #1a0033 50%, #0a000f 100%)' }}
        >
          <div className="absolute top-0 right-0 w-[400px] h-[300px] opacity-20 blur-[80px]"
            style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
          <div className="absolute inset-0 border border-gold/15 rounded-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
            {/* Avatar (cliquable → upload) */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-3xl font-cinzel font-black shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #4B0082, #D4AF37)',
                  boxShadow: '0 12px 32px rgba(75,0,130,0.35), 0 0 0 1px rgba(212,175,55,0.25) inset',
                }}
                title="Changer la photo"
              >
                {meta.avatar_url ? (
                  <Image src={meta.avatar_url} alt="Photo de profil" fill sizes="96px" className="object-cover" />
                ) : (
                  <span className="text-white tracking-wider">{initials}</span>
                )}
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatar(f); e.target.value = '' }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="section-label mb-2">Mon Profil</div>
              <h1
                className="font-cinzel font-black text-pearl mb-3 text-balance"
                style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
              >
                {form.prenom} {form.nom}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="badge-gold capitalize">{meta.role}</span>
                <span className="text-pearl/45 text-sm font-inter">Membre depuis le {meta.since}</span>
                <span className="hidden sm:inline text-pearl/20">·</span>
                <span className="text-pearl/45 text-sm font-inter">{form.pays || '—'}</span>
              </div>
            </div>

            {/* Score circle */}
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle
                    cx="48" cy="48" r="40" fill="none"
                    stroke="url(#profGrad)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - meta.score / 100)}`}
                  />
                  <defs>
                    <linearGradient id="profGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#4B0082" />
                      <stop offset="100%" stopColor="#D4AF37" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-cinzel font-black text-gold text-xl leading-none">{meta.score}</span>
                  <span className="text-pearl/30 text-[10px]">/ 100</span>
                </div>
              </div>
              <p className="text-xs text-pearl/40 mt-1 font-inter">Score Engagement</p>
            </div>
          </div>
        </motion.div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Profile form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Form card */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-6">Informations Personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="section-label block mb-2">Prénom</label>
                  <input className="input-royal w-full" value={form.prenom} onChange={(e) => set('prenom', e.target.value)} placeholder="Votre prénom" />
                </div>
                <div>
                  <label className="section-label block mb-2">Nom</label>
                  <input className="input-royal w-full" value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Votre nom" />
                </div>
                <div>
                  <label className="section-label block mb-2">Email</label>
                  <input className="input-royal w-full opacity-50 cursor-not-allowed" value={meta.email} readOnly />
                </div>
                <div>
                  <label className="section-label block mb-2">Téléphone</label>
                  <input className="input-royal w-full" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="+33 6 …" />
                </div>
                <div>
                  <label className="section-label block mb-2">Pays</label>
                  <input className="input-royal w-full" value={form.pays} onChange={(e) => set('pays', e.target.value)} placeholder="Votre pays" />
                </div>
                <div>
                  <label className="section-label block mb-2">Ville</label>
                  <input className="input-royal w-full" value={form.ville} onChange={(e) => set('ville', e.target.value)} placeholder="Votre ville" />
                </div>
              </div>

              <button onClick={handleSave} disabled={saving} className="btn-gold mt-6 flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving ? 'Sauvegarde…' : saved ? 'Sauvegardé !' : 'Sauvegarder'}
              </button>
            </div>

            {/* Platform selection */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-2">Ma Plateforme</h2>
              <p className="text-pearl/40 text-sm font-inter mb-5">Choisissez votre communauté principale</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PLATEFORMES.map((p) => {
                  const isSelected = form.plateforme_principale === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => set('plateforme_principale', p.id)}
                      className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all duration-300 ${
                        isSelected ? 'border-gold bg-gold/10' : 'border-pearl/10 bg-pearl/[0.02] hover:border-pearl/25 hover:bg-pearl/[0.04]'
                      }`}
                      style={isSelected ? { boxShadow: `0 8px 24px ${p.color}25, 0 0 0 1px ${p.color}40 inset` } : undefined}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300"
                        style={{ background: isSelected ? `${p.color}22` : `${p.color}12`, border: `1px solid ${p.color}${isSelected ? '50' : '25'}` }}>
                        <p.icon className="w-5 h-5" style={{ color: p.color }} />
                      </div>
                      <span className={`text-xs font-inter font-semibold text-center leading-tight ${isSelected ? 'text-pearl' : 'text-pearl/55'}`}>{p.name}</span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gold flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Change password */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-5 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gold" />
                Changer le mot de passe
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="section-label block mb-2">Nouveau mot de passe</label>
                  <input type="password" className="input-royal w-full" placeholder="••••••••" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} />
                </div>
                <div>
                  <label className="section-label block mb-2">Confirmer</label>
                  <input type="password" className="input-royal w-full" placeholder="••••••••" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
                </div>
              </div>
              <button onClick={handlePassword} disabled={pwdSaving} className="btn-royal mt-4 disabled:opacity-50">
                {pwdSaving ? 'Mise à jour…' : 'Mettre à jour'}
              </button>
            </div>
          </motion.div>

          {/* Right — Spiritual profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Parcours disciple */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-5">Parcours Disciple</h2>
              <div className="space-y-3">
                {PARCOURS_DISCIPLE.map((p, i) => {
                  const isCurrent = i === etapeIdx
                  const isCompleted = i < etapeIdx
                  return (
                  <div key={p.etape} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: i <= etapeIdx ? p.couleur : 'rgba(255,255,255,0.05)',
                        color: i <= etapeIdx ? '#050505' : 'rgba(255,255,255,0.2)',
                        boxShadow: isCurrent ? `0 0 12px ${p.couleur}55` : 'none',
                      }}>
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : isCurrent ? <span className="block w-1.5 h-1.5 rounded-full bg-current" /> : i + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold font-inter ${isCurrent ? 'text-pearl' : isCompleted ? 'text-pearl/60' : 'text-pearl/25'}`}>{p.nom}</p>
                      <p className={`text-xs font-inter ${isCurrent ? 'text-pearl/50' : 'text-pearl/20'}`}>{p.description}</p>
                    </div>
                    {isCurrent && <span className="badge-gold text-[9px]">Actuel</span>}
                  </div>
                  )
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-5">Profil Spirituel</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-pearl/5">
                  <span className="text-sm text-pearl/50 font-inter">Score d'engagement</span>
                  <span className="font-cinzel font-bold text-gold">{meta.score} / 100</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-pearl/5">
                  <span className="text-sm text-pearl/50 font-inter">Plateforme</span>
                  <span className="text-sm text-pearl font-semibold">{selectedName}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-pearl/50 font-inter">Étape actuelle</span>
                  <span className="text-sm font-semibold" style={{ color: etapeActuelle.couleur }}>{etapeActuelle.nom}</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-4">Badges du Royaume</h2>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {BADGES.slice(0, 10).map((badge, i) => {
                  const unlocked = i < meta.badges
                  return (
                    <div key={badge.id} title={badge.nom}
                      className="aspect-square rounded-xl flex items-center justify-center transition-all"
                      style={{
                        background: unlocked ? `${badge.couleur}20` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${unlocked ? `${badge.couleur}35` : 'rgba(255,255,255,0.05)'}`,
                        opacity: unlocked ? 1 : 0.4,
                      }}>
                      <badge.icone className="w-4 h-4"
                        style={{ color: unlocked ? badge.couleur : 'rgba(255,255,255,0.25)' }}
                        fill={unlocked && badge.rare ? badge.couleur : 'transparent'} />
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-pearl/30 font-inter">{meta.badges} badge(s) débloqué(s) sur 10</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
