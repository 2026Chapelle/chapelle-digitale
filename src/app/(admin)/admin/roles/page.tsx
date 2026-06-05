'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, ShieldCheck, Eye, Check, X, Users, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { getPermissions, ALL_PERMISSIONS, PERMISSION_LABELS, MATRIX_ROLES, ASSIGNABLE_ROLES } from '@/lib/permissions'

// Menu membre de base (visible par tous) — miroir de MemberSidebar.
const BASE_MEMBER_MENU = [
  'Tableau de bord', 'Mon Profil', 'Mes Formations', 'La Bible', 'Enseignements', 'Articles',
  'Mes Lives', 'Mes Ressources', 'Mes Événements', 'Mes Prières', 'Cure d\'âme', 'Mes Groupes',
  'Mes Dons', 'Mes Achats', 'Mon Parcours', 'Mon Engagement', 'Notifications', 'Messages', 'Paramètres',
]
const CONDITIONAL_MENU: { label: string; perm: typeof ALL_PERMISSIONS[number] }[] = [
  { label: 'Espace Formateur', perm: 'can_access_formateur_space' },
  { label: 'Espace Intégration', perm: 'can_access_integration_space' },
  { label: 'Tableau National', perm: 'can_access_national_dashboard' },
]
const roleLabel = (v: string) => ASSIGNABLE_ROLES.find((r) => r.value === v)?.label || v

const ROLE_DESCRIPTIONS: Record<string, string> = {
  membre: 'Membre standard : son espace personnel uniquement, aucun accès spécialisé.',
  berger: 'Berger : accès pédagogique complet à tous les parcours (sans aucun droit administratif).',
  formateur: 'Formateur : gère ses formations et suit les apprenants (Espace Formateur).',
  responsable_integration: 'Responsable intégration : suivi des nouveaux membres (Espace Intégration).',
  responsable_national: 'Responsable national : pilotage de son périmètre (Tableau National).',
  pasteur_national: 'Pasteur national : gouvernement national (Tableau National).',
  admin: 'Administrateur : accès complet à la plateforme et à la gouvernance.',
  super_admin: 'Super Admin : accès total + gestion des rôles administrateurs.',
}
const ROLE_ROUTES: { perm: typeof ALL_PERMISSIONS[number]; route: string; label: string }[] = [
  { perm: 'can_access_formateur_space', route: '/member/dashboard/formateur', label: 'Espace Formateur' },
  { perm: 'can_access_integration_space', route: '/member/dashboard/integration', label: 'Espace Intégration' },
  { perm: 'can_access_national_dashboard', route: '/member/dashboard/nation', label: 'Tableau National' },
  { perm: 'can_access_admin', route: '/admin', label: 'Administration' },
]

export default function AdminRolesPage() {
  const [summary, setSummary] = useState<{ counts: { label: string; count: number }[]; recent: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [simRole, setSimRole] = useState('membre')
  const [simStatut, setSimStatut] = useState('membre_actif')

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/roles/summary', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.ok && j.data) setSummary(j.data)
      } catch { /* noop */ }
      setLoading(false)
    })()
  }, [])

  const simPerms = useMemo(() => Array.from(getPermissions({ role: simRole, membre_statut: simStatut })), [simRole, simStatut])
  const simMenus = useMemo(() => {
    const set = getPermissions({ role: simRole, membre_statut: simStatut })
    return [...BASE_MEMBER_MENU, ...CONDITIONAL_MENU.filter((c) => set.has(c.perm)).map((c) => c.label)]
  }, [simRole, simStatut])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Gouvernement pastoral" title={<>Rôles & <span className="text-cinematic-gold">Accès</span></>}
          description="Source unique de vérité : ce que chaque rôle débloque, simulateur « Voir comme », répartition." />

        {/* Simulateur « Voir comme » */}
        <div className="card-royal mb-6">
          <h2 className="font-cinzel font-bold text-pearl text-sm mb-1 flex items-center gap-2"><Eye className="w-4 h-4 text-gold" /> Voir comme — simulateur (aucun impact)</h2>
          <p className="text-xs text-pearl/45 font-inter mb-4">Prévisualisez l'expérience d'un rôle sans créer de compte ni modifier de session.</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-4 max-w-xl">
            <div>
              <label className="block text-[11px] text-pearl/45 font-inter mb-1">Rôle fonctionnel</label>
              <select className="input-royal w-full" value={simRole} onChange={(e) => setSimRole(e.target.value)}>
                {ASSIGNABLE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-pearl/45 font-inter mb-1">Statut spirituel</label>
              <select className="input-royal w-full" value={simStatut} onChange={(e) => setSimStatut(e.target.value)}>
                {['visiteur', 'nouveau_membre', 'membre_actif', 'disciple', 'leader_cellule', 'berger', 'pasteur'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-2">Menus visibles ({simMenus.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {simMenus.map((m) => (
                  <span key={m} className="text-[11px] font-inter px-2 py-0.5 rounded-full" style={{ background: CONDITIONAL_MENU.some((c) => c.label === m) ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', color: CONDITIONAL_MENU.some((c) => c.label === m) ? '#22C55E' : 'rgba(255,255,255,0.6)' }}>{m}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-2">Permissions ({simPerms.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {simPerms.length === 0 ? <span className="text-[11px] text-pearl/35 font-inter">Membre standard — aucun accès spécial.</span>
                  : simPerms.map((perm) => <span key={perm} className="text-[10px] font-inter px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{PERMISSION_LABELS[perm]}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Matrice rôle × permissions */}
        <div className="card-royal overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gold" /><h2 className="font-cinzel font-bold text-pearl text-sm">Matrice des permissions</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                  <th className="px-4 py-3">Permission</th>
                  {MATRIX_ROLES.map((r) => <th key={r} className="px-3 py-3 text-center font-poppins">{r.replace('_', ' ')}</th>)}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map((perm) => (
                  <tr key={perm} className="border-b border-white/[0.03]">
                    <td className="px-4 py-2.5 text-pearl/70 font-inter">{PERMISSION_LABELS[perm]}</td>
                    {MATRIX_ROLES.map((r) => {
                      const ok = getPermissions({ role: r, membre_statut: r === 'berger' ? 'berger' : undefined }).has(perm)
                      return <td key={r} className="px-3 py-2.5 text-center">{ok ? <Check className="w-4 h-4 mx-auto text-emerald-400" /> : <X className="w-3.5 h-3.5 mx-auto text-pearl/15" />}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description des rôles : menus + routes débloqués */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {MATRIX_ROLES.map((r) => {
            const set = getPermissions({ role: r, membre_statut: r === 'berger' ? 'berger' : undefined })
            const menus = CONDITIONAL_MENU.filter((c) => set.has(c.perm)).map((c) => c.label)
            const routes = ROLE_ROUTES.filter((x) => set.has(x.perm))
            return (
              <div key={r} className="card-royal">
                <h3 className="font-cinzel font-bold text-pearl text-sm mb-1 capitalize">{roleLabel(r)}</h3>
                <p className="text-[11px] text-pearl/50 font-inter mb-3 leading-relaxed">{ROLE_DESCRIPTIONS[r] || ''}</p>
                <p className="text-[10px] uppercase tracking-wider text-pearl/35 font-inter mb-1">Menus spécialisés</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {menus.length === 0 ? <span className="text-[11px] text-pearl/35 font-inter">Espace membre uniquement</span>
                    : menus.map((m) => <span key={m} className="text-[10px] font-inter px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>{m}</span>)}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-pearl/35 font-inter mb-1">Routes protégées</p>
                <div className="flex flex-wrap gap-1.5">
                  {routes.length === 0 ? <span className="text-[11px] text-pearl/35 font-inter">—</span>
                    : routes.map((x) => <span key={x.route} className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)' }}>{x.route}</span>)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Répartition + derniers changements */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-royal">
            <h3 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-gold" /> Répartition par rôle</h3>
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-gold" /> : (
              <div className="space-y-2">
                {(summary?.counts || []).map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-sm font-inter">
                    <span className="text-pearl/65 capitalize">{roleLabel(c.label)}</span>
                    <span className="text-pearl/40">{c.count}</span>
                  </div>
                ))}
                {(!summary?.counts || summary.counts.length === 0) && !loading && <p className="text-xs text-pearl/35 font-inter">Aucune donnée.</p>}
              </div>
            )}
          </div>
          <div className="card-royal">
            <h3 className="font-cinzel font-bold text-pearl text-sm mb-4">Derniers changements de rôle</h3>
            {(summary?.recent || []).length === 0 ? <p className="text-xs text-pearl/35 font-inter">Aucun changement récent.</p> : (
              <div className="space-y-2">
                {summary!.recent.map((r: any, i: number) => (
                  <div key={i} className="text-xs font-inter text-pearl/55 flex items-center gap-2">
                    <span className="text-pearl/30">{new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{r.detail?.ancien_role || '—'} → <span className="text-gold">{r.detail?.nouveau_role || '?'}</span></span>
                    {r.member_id && <Link href={`/admin/membres/${r.member_id}`} className="text-gold/60 hover:text-gold ml-auto inline-flex items-center gap-0.5">fiche <ArrowRight className="w-3 h-3" /></Link>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
