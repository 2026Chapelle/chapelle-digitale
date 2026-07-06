'use client'
/**
 * CRM pastoral — Nouveaux venus (Lot V2.1B : UI / mock uniquement).
 *
 * ⚠️ DÉMO : aucune donnée réelle, aucune écriture, aucune connexion Supabase.
 * Les boutons d'action sont purement visuels (message « Mode démo »). Supervisé
 * par le super admin. La connexion aux données réelles est réservée à V2.1C/D.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { ArrowLeft, Search, UserPlus, MapPin, AlertTriangle, Info, QrCode } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  MOCK_NOUVEAUX_VENUS, STATUTS, SOURCES, PAYS_MOCK,
  STATUT_LABEL, STATUT_COLOR, SOURCE_LABEL, type StatutNV,
} from '@/lib/mock/nouveaux-venus'

const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return iso } }

export default function NouveauxVenusPage() {
  const [q, setQ] = useState('')
  const [statut, setStatut] = useState<string>('')
  const [source, setSource] = useState<string>('')
  const [pays, setPays] = useState<string>('')
  const [demoMsg, setDemoMsg] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState('/nouveau-venu')

  // Préselection du filtre statut depuis l'URL (?statut=...) + URL absolue du QR — côté client uniquement.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const s = sp.get('statut'); if (s) setStatut(s)
      setQrUrl(`${window.location.origin}/nouveau-venu`)
    } catch { /* SSR-safe */ }
  }, [])

  const demo = (action: string) => setDemoMsg(`Mode démo — « ${action} » non enregistré (V2.1B).`)

  const filtered = useMemo(() => MOCK_NOUVEAUX_VENUS.filter((n) => {
    const mStatut = !statut || n.statut === statut
    const mSource = !source || n.source === source
    const mPays = !pays || n.pays_residence === pays
    const needle = q.trim().toLowerCase()
    const mSearch = !needle
      || `${n.prenom} ${n.nom}`.toLowerCase().includes(needle)
      || (n.email || '').toLowerCase().includes(needle)
      || n.telephone.toLowerCase().includes(needle)
    return mStatut && mSource && mPays && mSearch
  }), [q, statut, source, pays])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <Link href="/admin/pastoral" className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Centre de Gouvernement Pastoral
        </Link>

        <PageHeader
          eyebrow="CRM pastoral · supervisé par le super admin"
          title={<>Nouveaux <span className="text-cinematic-gold">venus</span></>}
          description="Accueil et suivi des nouveaux venus par territoire pastoral (un pasteur couvre plusieurs pays)."
        />

        {/* Bandeau DÉMO */}
        <div className="card-royal p-3 mb-6 flex items-center gap-2" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
          <Info className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
          <p className="font-inter text-xs" style={{ color: '#F59E0B' }}>
            Données de démonstration — aucune donnée réelle, aucune action enregistrée. Connexion aux données réelles prévue en V2.1C/D.
          </p>
        </div>

        {demoMsg && (
          <div className="card-royal p-3 mb-4 text-xs font-inter text-pearl/70 flex items-center justify-between">
            <span>{demoMsg}</span>
            <button onClick={() => setDemoMsg(null)} className="text-pearl/40 hover:text-gold">Fermer</button>
          </div>
        )}

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, email, téléphone…" className="input-royal pl-9" />
          </div>
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className="input-royal">
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="input-royal">
            <option value="">Toutes les sources</option>
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={pays} onChange={(e) => setPays(e.target.value)} className="input-royal">
            <option value="">Tous les pays</option>
            {PAYS_MOCK.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Tableau */}
        <div className="card-royal overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Territoire</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-pearl/35 font-inter">Aucun nouveau venu pour ces filtres.</td></tr>
                ) : filtered.map((n) => (
                  <tr key={n.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-pearl/85 font-inter flex items-center gap-1.5">
                      {n.urgent && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#EF4444' }} />}
                      {n.prenom} {n.nom}
                    </td>
                    <td className="px-4 py-3 text-pearl/60 font-inter whitespace-nowrap">{n.telephone}</td>
                    <td className="px-4 py-3 text-pearl/60 font-inter">{n.email || <span className="text-pearl/25">—</span>}</td>
                    <td className="px-4 py-3 text-pearl/60 font-inter">{SOURCE_LABEL[n.source]}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold font-inter"
                        style={{ background: `${STATUT_COLOR[n.statut as StatutNV]}22`, color: STATUT_COLOR[n.statut as StatutNV] }}>
                        {STATUT_LABEL[n.statut as StatutNV]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-pearl/60 font-inter">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-pearl/35" />{n.pays_residence}</span>
                      <span className="block text-[11px] text-pearl/35">{n.zone_pastorale}</span>
                    </td>
                    <td className="px-4 py-3 text-pearl/70 font-inter">{n.pasteur_responsable}</td>
                    <td className="px-4 py-3 text-pearl/50 font-inter whitespace-nowrap">{fmtDate(n.date)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => demo('Changer statut')} className="text-[11px] font-inter text-pearl/50 hover:text-gold px-2 py-1">Statut</button>
                      <button onClick={() => demo('Assigner')} className="text-[11px] font-inter text-pearl/50 hover:text-gold px-2 py-1">Assigner</button>
                      <button onClick={() => demo('Ajouter une note')} className="text-[11px] font-inter text-pearl/50 hover:text-gold px-2 py-1">Note</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bloc QR vers le formulaire public */}
        <div className="card-royal p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="p-3 rounded-xl bg-white flex-shrink-0">
            <QRCode value={qrUrl} size={128} bgColor="#FFFFFF" fgColor="#0c0a16" />
          </div>
          <div className="min-w-0">
            <h3 className="font-cinzel font-bold text-pearl text-base flex items-center gap-2 mb-1"><QrCode className="w-4 h-4 text-gold" /> Accueil des nouveaux venus</h3>
            <p className="font-inter text-sm text-pearl/55 mb-2">Affichez ce QR code (accueil, culte, événement) : il ouvre le formulaire public d'inscription.</p>
            <Link href="/nouveau-venu" className="inline-flex items-center gap-1.5 text-xs font-inter font-bold text-gold hover:gap-2 transition-all">
              <UserPlus className="w-3.5 h-3.5" /> Ouvrir /nouveau-venu
            </Link>
            <p className="font-inter text-[11px] text-pearl/30 mt-2 break-all">{qrUrl}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
