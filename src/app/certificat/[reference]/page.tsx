'use client'
import { useEffect, useState } from 'react'
import { Loader2, Printer, ShieldCheck, ShieldX, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Certificat {
  titre: string
  type: string
  reference: string
  delivre_le: string
  nom: string
}

export default function CertificatPage({ params }: { params: { reference: string } }) {
  const reference = decodeURIComponent(params.reference || '')
  const [cert, setCert] = useState<Certificat | null>(null)
  const [valide, setValide] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifyUrl, setVerifyUrl] = useState('')

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

  const dateLabel = cert?.delivre_le
    ? new Date(cert.delivre_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const qrSrc = verifyUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=130x130&margin=0&data=${encodeURIComponent(verifyUrl)}`
    : ''

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader2 className="w-7 h-7 animate-spin text-gold" /></div>
  }

  if (!valide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6 text-center">
        <ShieldX className="w-14 h-14 text-red-400 mb-4" />
        <h1 className="font-cinzel text-2xl font-black text-gray-800 mb-2">Certificat introuvable</h1>
        <p className="font-inter text-sm text-gray-500 max-w-md mb-6">Aucun certificat ne correspond à la référence <strong>{reference}</strong>. Vérifiez le code ou contactez la Chapelle.</p>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-inter font-semibold text-gold"><ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:p-0">
      {/* Impression A4 paysage */}
      <style>{`@media print { @page { size: A4 landscape; margin: 0 } .no-print { display: none !important } body { background: #fff } }`}</style>

      {/* Barre d'actions (masquée à l'impression) */}
      <div className="no-print max-w-[1000px] mx-auto mb-6 flex items-center justify-between gap-3">
        <Link href="/member/dashboard/formations" className="inline-flex items-center gap-2 text-sm font-inter font-semibold text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Mes formations
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-inter text-emerald-600 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Certificat authentique
          </span>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm font-inter font-semibold rounded-full px-5 py-2.5"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
            <Printer className="w-4 h-4" /> Télécharger / Imprimer (PDF)
          </button>
        </div>
      </div>

      {/* Certificat */}
      <div className="max-w-[1000px] mx-auto bg-white shadow-2xl print:shadow-none" style={{ aspectRatio: '1.414 / 1' }}>
        <div className="relative w-full h-full p-[3%] flex">
          {/* Cadre doré */}
          <div className="absolute inset-[2%] border-[3px] rounded-sm" style={{ borderColor: '#D4AF37' }} />
          <div className="absolute inset-[3%] border rounded-sm" style={{ borderColor: '#D4AF3766' }} />

          <div className="relative flex flex-col items-center justify-between w-full text-center py-[3%] px-[5%]">
            {/* En-tête */}
            <div>
              <div className="font-cinzel text-[1.1vw] tracking-[0.3em] uppercase" style={{ color: '#4B0082' }}>La Chapelle Internationale des Élus du Royaume</div>
              <div className="mx-auto my-3 h-px w-24" style={{ background: '#D4AF37' }} />
              <h1 className="font-cinzel font-black uppercase tracking-wide" style={{ fontSize: '3vw', color: '#1A1A2E', letterSpacing: '0.05em' }}>
                Certificat
              </h1>
              <p className="font-cormorant italic text-gray-500" style={{ fontSize: '1.3vw' }}>
                {cert?.type === 'parcours' ? "d'accomplissement de parcours" : "d'accomplissement"}
              </p>
            </div>

            {/* Corps */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2 w-full">
              <p className="font-inter text-gray-400" style={{ fontSize: '1vw' }}>Décerné à</p>
              <p className="font-cinzel font-black" style={{ fontSize: '2.6vw', color: '#4B0082' }}>{cert?.nom}</p>
              <p className="font-inter text-gray-500 max-w-[70%]" style={{ fontSize: '1vw' }}>
                pour avoir accompli avec fidélité et excellence
              </p>
              <p className="font-cinzel font-bold text-gray-800" style={{ fontSize: '1.5vw' }}>« {cert?.titre.replace(/^Certificat — /, '')} »</p>
            </div>

            {/* Pied : signature · sceau · QR */}
            <div className="w-full flex items-end justify-between" style={{ fontSize: '0.85vw' }}>
              <div className="text-left">
                <div className="font-cormorant italic text-gray-700" style={{ fontSize: '1.4vw' }}>Citadelle du Royaume</div>
                <div className="mt-1 h-px w-40" style={{ background: '#9CA3AF' }} />
                <div className="font-inter text-gray-500 mt-1">Direction Pastorale</div>
              </div>

              <div className="flex flex-col items-center">
                <div className="font-cinzel font-black" style={{ color: '#D4AF37', fontSize: '1.6vw' }}>✦</div>
                <div className="font-inter text-gray-400 mt-1">Délivré le {dateLabel}</div>
                <div className="font-inter text-gray-400">Réf. {cert?.reference}</div>
              </div>

              <div className="flex flex-col items-center">
                {qrSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrSrc} alt="QR de vérification" style={{ width: '7vw', height: '7vw', maxWidth: 110, maxHeight: 110 }} />
                )}
                <div className="font-inter text-gray-400 mt-1">Vérifier l&apos;authenticité</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
