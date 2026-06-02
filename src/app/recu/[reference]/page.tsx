'use client'
import { useEffect, useState } from 'react'
import { Loader2, Printer, ArrowLeft, ShieldCheck, ShieldX } from 'lucide-react'
import Link from 'next/link'

interface Recu { nom: string; montant: number; devise: string; reference: string; date: string; methode: string }

export default function RecuPage({ params }: { params: { reference: string } }) {
  const reference = decodeURIComponent(params.reference || '')
  const [recu, setRecu] = useState<Recu | null>(null)
  const [valide, setValide] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch(`/api/recu/${encodeURIComponent(reference)}`)
        const j = await r.json()
        setValide(!!j.valide)
        if (j.valide && j.recu) setRecu(j.recu)
      } catch { setValide(false) }
      setLoading(false)
    })()
  }, [reference])

  const dateLabel = recu?.date ? new Date(recu.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const montant = recu ? `${recu.montant.toLocaleString('fr-FR')} ${recu.devise}` : ''

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader2 className="w-7 h-7 animate-spin text-gold" /></div>
  if (!valide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6 text-center">
        <ShieldX className="w-14 h-14 text-red-400 mb-4" />
        <h1 className="font-cinzel text-2xl font-black text-gray-800 mb-2">Reçu introuvable</h1>
        <p className="font-inter text-sm text-gray-500 max-w-md mb-6">Aucun don confirmé ne correspond à la référence <strong>{reference}</strong>.</p>
        <Link href="/member/dashboard/dons" className="inline-flex items-center gap-2 text-sm font-inter font-semibold text-gold"><ArrowLeft className="w-4 h-4" /> Mes dons</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4 portrait; margin: 14mm } .no-print { display: none !important } body { background: #fff } }`}</style>

      <div className="no-print max-w-[760px] mx-auto mb-6 flex items-center justify-between gap-3">
        <Link href="/member/dashboard/dons" className="inline-flex items-center gap-2 text-sm font-inter font-semibold text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /> Mes dons</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm font-inter font-semibold rounded-full px-5 py-2.5" style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
          <Printer className="w-4 h-4" /> Télécharger / Imprimer (PDF)
        </button>
      </div>

      <div className="max-w-[760px] mx-auto bg-white shadow-2xl print:shadow-none rounded-2xl print:rounded-none overflow-hidden">
        <div className="px-8 py-7" style={{ background: 'linear-gradient(135deg, #4B0082, #0E0E12)' }}>
          <div className="font-cinzel tracking-[2px] uppercase text-[12px]" style={{ color: '#D4AF37' }}>Citadelle du Royaume</div>
          <div className="font-cinzel text-2xl font-black text-white mt-1">Reçu de don</div>
          <div className="font-inter text-xs mt-1" style={{ color: 'rgba(245,243,238,0.6)' }}>Reçu N° {recu!.reference}</div>
        </div>

        <div className="p-8">
          <div className="flex items-center gap-2 text-emerald-600 mb-6"><ShieldCheck className="w-4 h-4" /> <span className="font-inter text-sm font-semibold">Don confirmé</span></div>

          <table className="w-full text-sm font-inter mb-6">
            <tbody>
              {[
                ['Bénéficiaire', 'La Chapelle Internationale des Élus du Royaume'],
                ['Donateur', recu!.nom],
                ['Montant', montant],
                ['Date', dateLabel],
                ['Référence Chariow', recu!.reference],
                ['Mode de paiement', recu!.methode],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100">
                  <td className="py-2.5 text-gray-400">{k}</td>
                  <td className="py-2.5 text-right text-gray-800 font-semibold">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
            <div className="font-cinzel text-xs font-bold mb-1" style={{ color: '#B8901F' }}>📖 Luc 6:38</div>
            <div className="font-cormorant italic text-gray-700">« Donnez, et il vous sera donné. »</div>
          </div>

          <p className="font-inter text-sm text-gray-600 mb-1">Avec notre profonde gratitude,</p>
          <p className="font-inter text-sm text-gray-800"><strong>Rev. Doxa Salomon</strong> — Pasteur Fondateur</p>
          <p className="font-inter text-[11px] text-gray-400 mt-6 pt-4 border-t border-gray-100">Abidjan, Côte d'Ivoire · chapelleduroyaume.org · Ce reçu confirme l'enregistrement de votre don.</p>
        </div>
      </div>
    </div>
  )
}
