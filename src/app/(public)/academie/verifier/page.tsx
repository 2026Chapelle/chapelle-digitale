'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, ShieldX, Search, ArrowLeft } from 'lucide-react'
import { getCredential, type Credential } from '@/lib/academie/credentials'
import { Certificate } from '@/components/academie/Certificate'

/* Vérification publique d'authenticité d'un certificat / diplôme de l'Académie. */

export default function VerifierPage() {
  const [code, setCode] = useState('')
  const [checked, setChecked] = useState(false)
  const [cred, setCred] = useState<Credential | null>(null)

  function verify(c: string) {
    const found = getCredential(c)
    setCred(found); setChecked(true)
  }

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const c = sp.get('code')
      if (c) { setCode(c); verify(c) }
    } catch { /* */ }
  }, [])

  return (
    <div className="min-h-screen bg-charbon pt-28 pb-20">
      <div className="container-cinematic max-w-3xl">
        <Link href="/member/dashboard/formations" className="inline-flex items-center gap-1.5 font-inter text-sm mb-6" style={{ color: 'rgba(245,230,216,0.4)' }}>
          <ArrowLeft className="w-4 h-4" /> Académie des Élus
        </Link>

        <div className="text-center mb-8">
          <div className="section-label-dark justify-center"><ShieldCheck className="w-3 h-3" /> Authenticité</div>
          <h1 className="heading-cinematic-lg mb-3">Vérifier un certificat</h1>
          <p className="font-inter text-sm max-w-lg mx-auto" style={{ color: 'rgba(245,230,216,0.55)' }}>
            Saisissez le numéro unique d&apos;un certificat ou diplôme (ex. AER-2026-000001) ou scannez son QR code.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); verify(code) }} className="flex flex-col sm:flex-row gap-2 mb-8 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(245,230,216,0.35)' }} />
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AER-2026-000001"
              className="input-cinematic pl-10 uppercase tracking-wider" />
          </div>
          <button type="submit" className="btn-gold-cinematic justify-center">Vérifier</button>
        </form>

        {checked && (
          cred ? (
            <div>
              <div className="card-cinematic p-4 mb-5 flex items-center gap-3" style={{ borderColor: 'rgba(34,197,94,0.4)' }}>
                <ShieldCheck className="w-6 h-6 flex-shrink-0" style={{ color: '#22C55E' }} />
                <div>
                  <p className="font-cinzel font-bold text-white">Certificat authentique</p>
                  <p className="font-inter text-xs" style={{ color: 'rgba(245,230,216,0.55)' }}>
                    {cred.type === 'diploma' ? 'Diplôme suprême' : 'Certificat de niveau'} · délivré à {cred.recipient} · {new Date(cred.issuedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <Certificate credential={cred} />
            </div>
          ) : (
            <div className="card-cinematic p-6 text-center">
              <ShieldX className="w-8 h-8 mx-auto mb-3" style={{ color: '#EF4444' }} />
              <p className="font-cinzel font-bold text-white mb-1">Aucun certificat ne correspond à ce numéro</p>
              <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>Vérifiez le numéro saisi. Les certificats sont délivrés à la validation d&apos;un niveau complet.</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
