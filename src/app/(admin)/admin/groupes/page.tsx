'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Loader2, Users, Check, X, Plus, Pencil, Archive, Trash2, Crown, Star, UserPlus,
  MapPin, Calendar, Video, Filter, Inbox, Layers, ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'

/* ------------------------------------------------------------------ */
/* Référentiels fixes (value → label)                                  */
/* ------------------------------------------------------------------ */
const PLATEFORMES: { value: string; label: string }[] = [
  { value: 'cier', label: 'CIER' },
  { value: 'familles-chapelle', label: 'Familles de la Chapelle' },
  { value: 'chapelle-familiale', label: 'Chapelle Familiale' },
  { value: 'jeunesse', label: 'Jeunesse' },
  { value: 'femmes-exceptions', label: "Femmes d'Exceptions" },
  { value: 'cite-refuge', label: 'Cité du Refuge' },
  { value: 'mahanaim', label: 'Mahanaïm' },
  { value: 'cfic', label: 'CFIC / Académie des Élus' },
]
const TYPES: { value: string; label: string }[] = [
  { value: 'cellule', label: 'Cellule' },
  { value: 'groupe_priere', label: 'Groupe de prière' },
  { value: 'equipe_service', label: 'Équipe de service' },
  { value: 'equipe_ministere', label: 'Équipe de ministère' },
  { value: 'formation', label: 'Formation (cohorte)' },
  { value: 'departement', label: 'Département' },
]
const plateformeLabel = (v?: string) => PLATEFORMES.find((p) => p.value === v)?.label || v || '—'
const typeLabel = (v?: string) => TYPES.find((t) => t.value === v)?.label || v || '—'
const roleLabel = (r?: string) => r === 'leader' ? 'Leader' : r === 'co-leader' ? 'Co-leader' : 'Membre'

const fmt = (s?: string | null) => { if (!s) return '—'; try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return s } }

const statutBadge = (s?: string) =>
  s === 'actif' ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' }
    : s === 'en_attente' ? { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
      : s === 'sorti' || s === 'refuse' || s === 'inactif' ? { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }
        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }

const API = '/api/admin/groupes'

/* ------------------------------------------------------------------ */
/* Type du formulaire de groupe                                        */
/* ------------------------------------------------------------------ */
type GroupForm = {
  id?: string
  nom: string
  plateforme_id: string
  type: string
  description: string
  pays: string
  ville: string
  zone: string
  niveau: string
  capacite_max: string
  jour_reunion: string
  heure_reunion: string
  lieu_reunion: string
  est_virtuel: boolean
  reunion_url: string
  code: string
  responsable_id: string
}
const emptyForm = (): GroupForm => ({
  nom: '', plateforme_id: '', type: 'cellule', description: '', pays: '', ville: '', zone: '',
  niveau: '', capacite_max: '', jour_reunion: '', heure_reunion: '', lieu_reunion: '',
  est_virtuel: false, reunion_url: '', code: '', responsable_id: '',
})

/* ================================================================== */
export default function AdminGroupesPage() {
  const [tab, setTab] = useState<'groupes' | 'demandes'>('groupes')

  // Onglet groupes
  const [groups, setGroups] = useState<any[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [errGroups, setErrGroups] = useState<string | null>(null)
  const [fPlateforme, setFPlateforme] = useState('')
  const [fType, setFType] = useState('')
  const [fStatut, setFStatut] = useState('')

  // Modale formulaire
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<GroupForm>(emptyForm())
  const [savingForm, setSavingForm] = useState(false)

  // Panneau membres
  const [membersOf, setMembersOf] = useState<any | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [newMemberId, setNewMemberId] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'leader' | 'co-leader' | 'membre'>('membre')

  // Onglet demandes
  const [requests, setRequests] = useState<any[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [errRequests, setErrRequests] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)

  /* ---------------- Chargements ---------------- */
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true); setErrGroups(null)
    try {
      const qs = new URLSearchParams()
      if (fPlateforme) qs.set('plateforme_id', fPlateforme)
      if (fType) qs.set('type', fType)
      if (fStatut) qs.set('statut', fStatut)
      const r = await fetch(`${API}${qs.toString() ? `?${qs}` : ''}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setGroups(j.data || [])
      else setErrGroups(j.message || 'Erreur de chargement')
    } catch { setErrGroups('Erreur réseau') }
    setLoadingGroups(false)
  }, [fPlateforme, fType, fStatut])

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true); setErrRequests(null)
    try {
      const r = await fetch(`${API}?requests=1`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setRequests(j.data || [])
      else setErrRequests(j.message || 'Erreur de chargement')
    } catch { setErrRequests('Erreur réseau') }
    setLoadingRequests(false)
  }, [])

  const loadMembers = useCallback(async (groupeId: string) => {
    setLoadingMembers(true)
    try {
      const r = await fetch(`${API}?members=${encodeURIComponent(groupeId)}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setMembers(j.data || [])
      else { setMembers([]); toast.error(j.message || 'Erreur') }
    } catch { setMembers([]); toast.error('Erreur réseau') }
    setLoadingMembers(false)
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])
  useEffect(() => { loadRequests() }, [loadRequests])

  /* ---------------- POST générique ---------------- */
  const post = useCallback(async (body: Record<string, unknown>): Promise<boolean> => {
    setBusy(true)
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      const j = await r.json()
      if (j.ok) { toast.success(j.message || 'Action effectuée ✓'); return true }
      toast.error(j.message || 'Échec de l’action')
      return false
    } catch { toast.error('Erreur réseau'); return false }
    finally { setBusy(false) }
  }, [])

  /* ---------------- Formulaire création / édition ---------------- */
  function openCreate() { setForm(emptyForm()); setShowForm(true) }
  function openEdit(g: any) {
    setForm({
      id: g.id,
      nom: g.nom || '',
      plateforme_id: g.plateforme_id || '',
      type: g.type || 'cellule',
      description: g.description || '',
      pays: g.pays || '',
      ville: g.ville || '',
      zone: g.zone || '',
      niveau: g.niveau != null ? String(g.niveau) : '',
      capacite_max: g.capacite_max != null ? String(g.capacite_max) : '',
      jour_reunion: g.jour_reunion || '',
      heure_reunion: g.heure_reunion || '',
      lieu_reunion: g.lieu_reunion || '',
      est_virtuel: !!g.est_virtuel,
      reunion_url: g.reunion_url || '',
      code: g.code || '',
      responsable_id: g.responsable_id || '',
    })
    setShowForm(true)
  }

  async function submitForm() {
    if (!form.nom.trim()) { toast.error('Le nom est obligatoire.'); return }
    if (!form.plateforme_id) { toast.error('La plateforme est obligatoire.'); return }
    setSavingForm(true)
    const payload: Record<string, unknown> = {
      action: form.id ? 'update' : 'create',
      ...(form.id ? { id: form.id } : {}),
      nom: form.nom.trim(),
      plateforme_id: form.plateforme_id,
      type: form.type,
      description: form.description.trim() || null,
      pays: form.pays.trim() || null,
      ville: form.ville.trim() || null,
      zone: form.zone.trim() || null,
      niveau: form.niveau.trim() === '' ? null : Number(form.niveau),
      capacite_max: form.capacite_max.trim() === '' ? null : Number(form.capacite_max),
      jour_reunion: form.jour_reunion.trim() || null,
      heure_reunion: form.heure_reunion.trim() || null,
      lieu_reunion: form.lieu_reunion.trim() || null,
      est_virtuel: form.est_virtuel,
      reunion_url: form.reunion_url.trim() || null,
      code: form.code.trim() || null,
      responsable_id: form.responsable_id.trim() || null,
    }
    const ok = await post(payload)
    setSavingForm(false)
    if (ok) { setShowForm(false); setForm(emptyForm()); await loadGroups() }
  }

  async function archiveGroup(g: any) {
    if (!confirm(`Archiver le groupe « ${g.nom} » ? Il passera au statut inactif.`)) return
    if (await post({ action: 'archive', id: g.id })) await loadGroups()
  }

  /* ---------------- Membres ---------------- */
  function openMembers(g: any) { setMembersOf(g); loadMembers(g.id) }
  function closeMembers() { setMembersOf(null); setMembers([]); setNewMemberId(''); setNewMemberRole('membre') }

  async function reloadMembersAndGroups() {
    if (membersOf) await loadMembers(membersOf.id)
    await loadGroups()
  }

  async function addMember() {
    if (!membersOf) return
    if (!newMemberId.trim()) { toast.error('Saisissez l’identifiant (user_id) du membre.'); return }
    const ok = await post({ action: 'add_member', groupe_id: membersOf.id, user_id: newMemberId.trim(), role: newMemberRole })
    if (ok) { setNewMemberId(''); setNewMemberRole('membre'); await reloadMembersAndGroups() }
  }
  async function setMemberRole(userId: string, role: string) {
    if (!membersOf) return
    if (await post({ action: 'set_role', groupe_id: membersOf.id, user_id: userId, role })) await reloadMembersAndGroups()
  }
  async function setPrimary(userId: string) {
    if (!membersOf) return
    if (await post({ action: 'set_primary', groupe_id: membersOf.id, user_id: userId })) await reloadMembersAndGroups()
  }
  async function removeMember(userId: string, nom?: string) {
    if (!membersOf) return
    if (!confirm(`Retirer ${nom || 'ce membre'} du groupe ?`)) return
    if (await post({ action: 'remove_member', groupe_id: membersOf.id, user_id: userId })) await reloadMembersAndGroups()
  }

  /* ---------------- Demandes ---------------- */
  const pending = requests.filter((r) => r.statut === 'en_attente')
  async function approveRequest(id: string) {
    if (await post({ action: 'approve_request', id })) { await loadRequests(); await loadGroups() }
  }
  async function rejectRequest(id: string) {
    if (!confirm('Refuser cette demande ?')) return
    if (await post({ action: 'reject_request', id })) await loadRequests()
  }

  /* ================================================================ */
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={<>Groupes & <span className="text-cinematic-gold">Cellules</span></>}
          description="Pilotez les cellules, équipes et cohortes : composition, leadership et demandes d’adhésion."
        />

        {/* Onglets */}
        <div className="flex items-center gap-2 mb-6">
          <TabButton active={tab === 'groupes'} onClick={() => setTab('groupes')} icon={Layers} label="Groupes" count={groups.length} />
          <TabButton active={tab === 'demandes'} onClick={() => setTab('demandes')} icon={Inbox} label="Demandes" count={pending.length} highlight={pending.length > 0} />
        </div>

        {/* ---------------- ONGLET GROUPES ---------------- */}
        {tab === 'groupes' && (
          <>
            {/* Filtres + nouveau */}
            <div className="card-cinematic p-4 mb-5 flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-1.5 text-pearl/40 text-xs font-inter mr-1"><Filter className="w-3.5 h-3.5" /> Filtres</div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[11px] text-pearl/40 font-inter mb-1">Plateforme</label>
                <select className="input-royal w-full" value={fPlateforme} onChange={(e) => setFPlateforme(e.target.value)}>
                  <option value="">Toutes</option>
                  {PLATEFORMES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[11px] text-pearl/40 font-inter mb-1">Type</label>
                <select className="input-royal w-full" value={fType} onChange={(e) => setFType(e.target.value)}>
                  <option value="">Tous</option>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-[11px] text-pearl/40 font-inter mb-1">Statut</label>
                <select className="input-royal w-full" value={fStatut} onChange={(e) => setFStatut(e.target.value)}>
                  <option value="">Tous</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
              <button onClick={openCreate} className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2 whitespace-nowrap">
                <Plus className="w-4 h-4" /> Nouveau groupe
              </button>
            </div>

            {errGroups && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{errGroups}</div>}

            {loadingGroups ? (
              <SkeletonTable />
            ) : groups.length === 0 ? (
              <EmptyState icon={Users} text="Aucun groupe ne correspond à ces filtres." />
            ) : (
              <div className="card-cinematic overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                      <th className="px-4 py-3">Groupe</th>
                      <th className="px-4 py-3">Plateforme</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Localisation</th>
                      <th className="px-4 py-3 text-center">Membres</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="text-pearl/85 font-inter flex items-center gap-2">
                            {g.nom}
                            {g.est_virtuel && <Video className="w-3.5 h-3.5 text-gold/60" />}
                          </div>
                          {g.code && <div className="text-pearl/30 text-xs font-inter">Code : {g.code}</div>}
                        </td>
                        <td className="px-4 py-3 text-pearl/60 font-inter">{plateformeLabel(g.plateforme_id)}</td>
                        <td className="px-4 py-3 text-pearl/60 font-inter">{typeLabel(g.type)}</td>
                        <td className="px-4 py-3 text-pearl/50 font-inter text-xs">
                          {[g.ville, g.pays].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-pearl/70 font-inter">
                          {g.membres_count ?? 0}{g.capacite_max ? <span className="text-pearl/30">/{g.capacite_max}</span> : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize" style={statutBadge(g.statut)}>{g.statut}</span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => openMembers(g)} className="text-pearl/40 hover:text-gold p-1.5" title="Gérer les membres"><Users className="w-4 h-4" /></button>
                          <button onClick={() => openEdit(g)} className="text-pearl/40 hover:text-gold p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
                          {g.statut !== 'inactif' && (
                            <button onClick={() => archiveGroup(g)} className="text-pearl/40 hover:text-red-400 p-1.5" title="Archiver"><Archive className="w-4 h-4" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ---------------- ONGLET DEMANDES ---------------- */}
        {tab === 'demandes' && (
          <>
            {errRequests && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{errRequests}</div>}
            {loadingRequests ? (
              <SkeletonTable />
            ) : pending.length === 0 ? (
              <EmptyState icon={Inbox} text="Aucune demande d’adhésion en attente." />
            ) : (
              <div className="card-cinematic overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                      <th className="px-4 py-3">Membre</th>
                      <th className="px-4 py-3">Groupe</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((r) => (
                      <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="text-pearl/80 font-inter">{r.user_nom || 'Membre'}</div>
                          <div className="text-pearl/30 text-xs font-inter">{r.user_email}</div>
                        </td>
                        <td className="px-4 py-3 text-pearl/60 font-inter">{r.group_nom}</td>
                        <td className="px-4 py-3 text-pearl/40 text-xs font-inter">{fmt(r.created_at)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button disabled={busy} onClick={() => approveRequest(r.id)} className="text-pearl/40 hover:text-green-400 p-1.5 disabled:opacity-40" title="Approuver"><Check className="w-4 h-4" /></button>
                          <button disabled={busy} onClick={() => rejectRequest(r.id)} className="text-pearl/40 hover:text-red-400 p-1.5 disabled:opacity-40" title="Refuser"><X className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------------- MODALE FORMULAIRE GROUPE ---------------- */}
      {showForm && (
        <Modal onClose={() => !savingForm && setShowForm(false)} title={form.id ? 'Modifier le groupe' : 'Nouveau groupe'} icon={Layers}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nom *" full>
              <input className="input-royal w-full" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom du groupe" />
            </Field>
            <Field label="Plateforme *">
              <select className="input-royal w-full" value={form.plateforme_id} onChange={(e) => setForm({ ...form, plateforme_id: e.target.value })}>
                <option value="">— Sélectionner —</option>
                {PLATEFORMES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select className="input-royal w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Description" full>
              <textarea className="input-royal w-full resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Vocation et objectif du groupe…" />
            </Field>
            <Field label="Pays">
              <input className="input-royal w-full" value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })} />
            </Field>
            <Field label="Ville">
              <input className="input-royal w-full" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
            </Field>
            <Field label="Zone / quartier">
              <input className="input-royal w-full" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
            </Field>
            <Field label="Code (adhésion)">
              <input className="input-royal w-full" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Optionnel" />
            </Field>
            <Field label="Niveau">
              <input type="number" className="input-royal w-full" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Capacité max.">
              <input type="number" className="input-royal w-full" value={form.capacite_max} onChange={(e) => setForm({ ...form, capacite_max: e.target.value })} placeholder="Illimité si vide" />
            </Field>
            <Field label="Jour de réunion">
              <input className="input-royal w-full" value={form.jour_reunion} onChange={(e) => setForm({ ...form, jour_reunion: e.target.value })} placeholder="Ex. Mardi" />
            </Field>
            <Field label="Heure de réunion">
              <input className="input-royal w-full" value={form.heure_reunion} onChange={(e) => setForm({ ...form, heure_reunion: e.target.value })} placeholder="Ex. 19h00" />
            </Field>
            <Field label="Lieu de réunion" full>
              <input className="input-royal w-full" value={form.lieu_reunion} onChange={(e) => setForm({ ...form, lieu_reunion: e.target.value })} placeholder="Adresse ou lieu" />
            </Field>
            <Field label="Responsable (user_id)">
              <input className="input-royal w-full" value={form.responsable_id} onChange={(e) => setForm({ ...form, responsable_id: e.target.value })} placeholder="Optionnel" />
            </Field>
            <Field label="Réunion virtuelle">
              <label className="flex items-center gap-2 text-sm text-pearl/70 font-inter h-[42px]">
                <input type="checkbox" className="accent-[#D4AF37] w-4 h-4" checked={form.est_virtuel} onChange={(e) => setForm({ ...form, est_virtuel: e.target.checked })} />
                Réunion en ligne
              </label>
            </Field>
            {form.est_virtuel && (
              <Field label="Lien de réunion" full>
                <input className="input-royal w-full" value={form.reunion_url} onChange={(e) => setForm({ ...form, reunion_url: e.target.value })} placeholder="https://…" />
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowForm(false)} disabled={savingForm} className="btn-ghost text-sm px-4 py-2.5">Annuler</button>
            <button onClick={submitForm} disabled={savingForm} className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50">
              {savingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {form.id ? 'Enregistrer' : 'Créer le groupe'}
            </button>
          </div>
        </Modal>
      )}

      {/* ---------------- PANNEAU MEMBRES ---------------- */}
      {membersOf && (
        <Modal onClose={closeMembers} title={`Membres — ${membersOf.nom}`} icon={Users} wide>
          {/* Ajout d'un membre */}
          <div className="card-royal mb-5">
            <p className="font-cinzel font-bold text-pearl text-sm mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-gold" /> Ajouter un membre</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] text-pearl/40 font-inter mb-1">Identifiant du membre (user_id)</label>
                <input className="input-royal w-full" value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} placeholder="UUID du profil" />
              </div>
              <div className="min-w-[150px]">
                <label className="block text-[11px] text-pearl/40 font-inter mb-1">Rôle</label>
                <select className="input-royal w-full" value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as any)}>
                  <option value="membre">Membre</option>
                  <option value="co-leader">Co-leader</option>
                  <option value="leader">Leader</option>
                </select>
              </div>
              <button onClick={addMember} disabled={busy || !newMemberId.trim()} className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2 disabled:opacity-50">
                <UserPlus className="w-4 h-4" /> Ajouter
              </button>
            </div>
          </div>

          {/* Liste des membres */}
          {loadingMembers ? (
            <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-8"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des membres…</div>
          ) : members.length === 0 ? (
            <EmptyState icon={Users} text="Ce groupe n’a encore aucun membre." />
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const p = m.profile
                const name = p ? `${p.prenom || ''} ${p.nom || ''}`.trim() || p.email || m.user_id : m.user_id
                return (
                  <div key={m.user_id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-inter text-sm text-pearl/85 truncate">{name}</span>
                        {m.is_primary && (
                          <span className="text-[9px] font-inter font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}><Star className="w-2.5 h-2.5" /> Principal</span>
                        )}
                        {m.statut && m.statut !== 'actif' && (
                          <span className="text-[9px] font-inter px-1.5 py-0.5 rounded-full capitalize" style={statutBadge(m.statut)}>{m.statut.replace('_', ' ')}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-pearl/35 font-inter mt-0.5 flex flex-wrap gap-x-2">
                        {p?.email && <span>{p.email}</span>}
                        {(p?.ville || p?.pays) && <span>· {[p.ville, p.pays].filter(Boolean).join(', ')}</span>}
                        {m.date_adhesion && <span>· Depuis {fmt(m.date_adhesion)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        className="input-royal text-xs py-1.5 px-2 w-[120px]"
                        value={m.role || 'membre'}
                        onChange={(e) => setMemberRole(m.user_id, e.target.value)}
                        disabled={busy}
                        title="Nomination"
                      >
                        <option value="membre">Membre</option>
                        <option value="co-leader">Co-leader</option>
                        <option value="leader">Leader</option>
                      </select>
                      {!m.is_primary && (
                        <button onClick={() => setPrimary(m.user_id)} disabled={busy} className="text-pearl/40 hover:text-gold p-1.5 disabled:opacity-40" title="Définir comme principal"><Star className="w-4 h-4" /></button>
                      )}
                      {m.role === 'leader' && <Crown className="w-4 h-4 text-gold/60" />}
                      <button onClick={() => removeMember(m.user_id, name)} disabled={busy} className="text-pearl/40 hover:text-red-400 p-1.5 disabled:opacity-40" title="Retirer du groupe"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

/* ================================================================== */
/* Sous-composants UI                                                  */
/* ================================================================== */
function TabButton({ active, onClick, icon: Icon, label, count, highlight }: { active: boolean; onClick: () => void; icon: any; label: string; count?: number; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-inter inline-flex items-center gap-2 transition-colors ${active ? 'text-abyss' : 'text-pearl/55 hover:text-pearl/80'}`}
      style={active ? { background: '#D4AF37' } : { background: 'rgba(255,255,255,0.04)' }}
    >
      <Icon className="w-4 h-4" /> {label}
      {typeof count === 'number' && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={active ? { background: 'rgba(0,0,0,0.18)', color: '#1a1a1a' } : highlight ? { background: 'rgba(245,158,11,0.18)', color: '#F59E0B' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{count}</span>
      )}
    </button>
  )
}

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-[11px] text-pearl/45 font-inter mb-1">{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, icon: Icon, children, onClose, wide }: { title: string; icon: any; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(5,7,12,0.78)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className={`card-royal w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} my-8`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cinzel font-bold text-pearl text-lg flex items-center gap-2 min-w-0">
            <Icon className="w-5 h-5 text-gold flex-shrink-0" /> <span className="truncate">{title}</span>
          </h2>
          <button onClick={onClose} className="text-pearl/40 hover:text-pearl p-1.5 flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="card-cinematic p-4 space-y-3">
      <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm pb-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">
      <Icon className="w-7 h-7 mx-auto mb-3 text-gold/50" />
      {text}
    </div>
  )
}
