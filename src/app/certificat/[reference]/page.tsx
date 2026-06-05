'use client'
import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { Loader2, Printer, ShieldCheck, ShieldX, ArrowLeft, Share2, Check } from 'lucide-react'
import Link from 'next/link'

interface Certificat { titre: string; type: string; reference: string; delivre_le: string; nom: string }

/** Métadonnées de présentation selon le TYPE de certificat (premium, type-aware). */
function typeMeta(type: string) {
  switch (type) {
    case 'integration':
      return { label: "Certificat d'Intégration", sub: "Programme d'Intégration de la Citadelle", body: "pour avoir accompli avec fidélité l'intégralité du Programme d'Intégration — Nouveau Croyant, Je Découvre la Maison, Je Stabilise Ma Foi et Je Deviens un Disciple Actif", accent: '#C49A20', showSubject: false }
    case 'diploma':
      return { label: 'Diplôme', sub: 'Académie des Élus · CFIC', body: "pour avoir validé avec excellence l'intégralité du parcours de formation de l'Académie des Élus", accent: '#7C3AED', showSubject: false }
    case 'niveau':
      return { label: 'Certificat de Niveau', sub: 'Académie des Élus · CFIC', body: "pour avoir validé avec succès l'intégralité de ce niveau de l'Académie des Élus", accent: '#7C3AED', showSubject: true }
    case 'parcours':
      return { label: 'Certificat de Parcours', sub: 'Parcours de transformation', body: 'pour avoir accompli avec fidélité et persévérance ce parcours', accent: '#C49A20', showSubject: true }
    default:
      return { label: 'Certificat de Formation', sub: 'Formation certifiante', body: 'pour avoir accompli avec fidélité et excellence cette formation', accent: '#C49A20', showSubject: true }
  }
}

const PAPER = '#FBF8F0'
const INK = '#1A1A2E'
const PURPLE = '#4B0082'

export default function CertificatPage({ params }: { params: { reference: string } }) {
  const reference = decodeURIComponent(params.reference || '')
  const [cert, setCert] = useState<Certificat | null>(null)
  const [valide, setValide] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifyUrl, setVerifyUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') setVerifyUrl(window.location.href)
    ;(async () => {
      try {
        const r = await fetch(`/api/certificat/${encodeURIComponent(reference)}`)
        const j = await r.json()
        setValide(!!j.valide)
        if (j.valide && j.certificat) setCert(j.certificat)
      } catch { setValide(false) }
      setLoading(false)
    })()
  }, [reference])

  async function share() {
    const url = verifyUrl || (typeof window !== 'undefined' ? window.location.href : '')
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: cert?.titre || 'Certificat', url })
      } else {
        await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000)
      }
    } catch { /* annulé */ }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#EEE9DF' }}><Loader2 className="w-7 h-7 animate-spin" style={{ color: '#C49A20' }} /></div>

  if (!valide || !cert) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#EEE9DF' }}>
        <ShieldX className="w-14 h-14 text-red-400 mb-4" />
        <h1 className="font-cinzel text-2xl font-black text-gray-800 mb-2">Certificat introuvable</h1>
        <p className="font-inter text-sm text-gray-500 max-w-md mb-6">Aucun certificat ne correspond à la référence <strong>{reference}</strong>. Vérifiez le code ou contactez la Citadelle.</p>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-inter font-semibold" style={{ color: '#C49A20' }}><ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil</Link>
      </div>
    )
  }

  const meta = typeMeta(cert.type)
  const dateLabel = cert.delivre_le ? new Date(cert.delivre_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const subject = cert.titre.replace(/^Certificat\s*[—-]\s*/i, '').trim()

  return (
    <div className="min-h-screen py-8 px-4 print:p-0" style={{ background: '#EEE9DF' }}>
      <style>{`@media print { @page { size: A4 landscape; margin: 0 } .no-print { display: none !important } body { background: #fff } }`}</style>

      {/* Barre d'actions */}
      <div className="no-print max-w-[1000px] mx-auto mb-6 flex items-center justify-between gap-3 flex-wrap">
        <Link href="/member/dashboard/formations" className="inline-flex items-center gap-2 text-sm font-inter font-semibold text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /> Mes formations</Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-inter text-emerald-700 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200"><ShieldCheck className="w-3.5 h-3.5" /> Certificat authentique</span>
          <button onClick={share} className="inline-flex items-center gap-2 text-sm font-inter font-semibold rounded-full px-4 py-2.5 border" style={{ borderColor: '#C49A20', color: '#8a6d12' }}>
            {copied ? <><Check className="w-4 h-4" /> Lien copié</> : <><Share2 className="w-4 h-4" /> Partager</>}
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm font-inter font-semibold rounded-full px-5 py-2.5" style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
            <Printer className="w-4 h-4" /> Télécharger (PDF)
          </button>
        </div>
      </div>

      {/* Certificat premium */}
      <div className="max-w-[1000px] mx-auto shadow-2xl print:shadow-none relative overflow-hidden" style={{ aspectRatio: '1.414 / 1', background: PAPER }}>
        {/* Filigrane logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.05 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-mark.png" alt="" style={{ width: '46%', objectFit: 'contain' }} />
        </div>

        <div className="relative w-full h-full p-[3%] flex">
          {/* Cadre doré double */}
          <div className="absolute inset-[1.8%] border-[3px] rounded-sm" style={{ borderColor: meta.accent }} />
          <div className="absolute inset-[2.8%] border rounded-sm" style={{ borderColor: `${meta.accent}66` }} />
          {/* Ornements de coin */}
          {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h]) => (
            <div key={`${v}${h}`} className="absolute" style={{ [v]: '3.6%', [h]: '3.6%', width: '4%', height: '4%', borderTop: v === 'top' ? `2px solid ${meta.accent}` : 'none', borderBottom: v === 'bottom' ? `2px solid ${meta.accent}` : 'none', borderLeft: h === 'left' ? `2px solid ${meta.accent}` : 'none', borderRight: h === 'right' ? `2px solid ${meta.accent}` : 'none' } as any} />
          ))}

          <div className="relative flex flex-col items-center justify-between w-full text-center py-[3.5%] px-[6%]">
            {/* En-tête */}
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-mark.png" alt="Logo officiel CIER" style={{ height: '4.2vw', maxHeight: 68, margin: '0 auto 0.5vw', display: 'block', objectFit: 'contain' }} />
              <div className="font-cinzel tracking-[0.3em] uppercase" style={{ color: PURPLE, fontSize: '1.05vw' }}>La Chapelle Internationale des Élus du Royaume</div>
              <div className="font-inter uppercase tracking-[0.25em] mt-1" style={{ color: '#9a8a5a', fontSize: '0.7vw' }}>{meta.sub}</div>
              <div className="mx-auto my-2 h-px w-24" style={{ background: meta.accent }} />
              <h1 className="font-cinzel font-black uppercase tracking-wide" style={{ fontSize: '2.8vw', color: INK, letterSpacing: '0.05em' }}>{meta.label}</h1>
            </div>

            {/* Corps */}
            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 w-full">
              <p className="font-inter text-gray-400" style={{ fontSize: '0.95vw' }}>Décerné à</p>
              <p className="font-cinzel font-black" style={{ fontSize: '2.5vw', color: PURPLE }}>{cert.nom}</p>
              <p className="font-inter text-gray-500 max-w-[78%]" style={{ fontSize: '0.95vw', lineHeight: 1.5 }}>{meta.body}</p>
              {meta.showSubject && subject && <p className="font-cinzel font-bold text-gray-800 mt-1" style={{ fontSize: '1.4vw' }}>« {subject} »</p>}
            </div>

            {/* Mention d'authenticité */}
            <div className="font-inter italic text-gray-400" style={{ fontSize: '0.72vw', marginBottom: '0.6vw' }}>
              Certificat authentique délivré par la Citadelle — vérifiable en ligne par QR Code.
            </div>

            {/* Pied : signature · sceau · QR */}
            <div className="w-full flex items-end justify-between" style={{ fontSize: '0.82vw' }}>
              <div className="text-left">
                <div className="font-cormorant italic text-gray-800" style={{ fontSize: '1.5vw', lineHeight: 1 }}>Rév. Doxa Salomon</div>
                <div className="mt-1 h-px w-44" style={{ background: '#9CA3AF' }} />
                <div className="font-inter text-gray-600 mt-1 font-semibold">Rév. Doxa Salomon</div>
                <div className="font-inter text-gray-400">Direction Pastorale · CIER</div>
              </div>

              {/* Sceau officiel : logo dans un anneau doré */}
              <div className="flex flex-col items-center">
                <div className="rounded-full flex items-center justify-center" style={{ width: '5vw', height: '5vw', maxWidth: 76, maxHeight: 76, border: `2px solid ${meta.accent}`, boxShadow: `0 0 0 3px ${meta.accent}22 inset` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/logo-mark.png" alt="Sceau" style={{ width: '60%', objectFit: 'contain' }} />
                </div>
                <div className="font-inter uppercase tracking-widest text-gray-400 mt-1" style={{ fontSize: '0.6vw' }}>Sceau officiel</div>
                <div className="font-inter text-gray-400">Délivré le {dateLabel}</div>
              </div>

              <div className="flex flex-col items-center">
                <div style={{ background: PAPER, padding: 4 }}>
                  {verifyUrl && <QRCode value={verifyUrl} size={96} bgColor={PAPER} fgColor={INK} style={{ width: '6vw', height: '6vw', maxWidth: 96, maxHeight: 96 }} />}
                </div>
                <div className="font-inter font-semibold text-gray-500 mt-1">Réf. {cert.reference}</div>
                <div className="font-inter text-gray-400">Scanner pour vérifier</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
