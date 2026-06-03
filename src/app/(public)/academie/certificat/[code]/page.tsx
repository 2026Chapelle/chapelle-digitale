'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye, ShieldX } from 'lucide-react'
import { getCredential, type Credential } from '@/lib/academie/credentials'
import { Certificate } from '@/components/academie/Certificate'

/* Visualisation / impression d'un certificat ou diplôme, ou aperçu du modèle.
   Codes spéciaux : « apercu-niveau » et « apercu-diplome ». */

function sample(code: string): Credential | null {
  if (code === 'apercu-niveau') {
    return { code: 'AER-2026-000001', type: 'certificate', recipient: '[ Prénom NOM ]', title: 'Fondements du Royaume', ref: 'apercu', issuedAt: new Date().toISOString(), hash: 'apercu' }
  }
  if (code === 'apercu-diplome') {
    return { code: 'AER-2026-000777', type: 'diploma', recipient: '[ Prénom NOM ]', title: 'Diplôme des Bâtisseurs du Royaume', ref: 'apercu', mention: 'Excellence Royale', issuedAt: new Date().toISOString(), hash: 'apercu' }
  }
  return null
}

export default function CertificatPage({ params }: { params: { code: string } }) {
  const isPreview = params.code.startsWith('apercu')
  const cred = useMemo(() => (isPreview ? sample(params.code) : getCredential(params.code)), [params.code, isPreview])

  return (
    <div className="min-h-screen bg-charbon pt-28 pb-20">
      <div className="container-cinematic max-w-4xl">
        <Link href="/member/dashboard/formations" className="inline-flex items-center gap-1.5 font-inter text-sm mb-6 print:hidden" style={{ color: 'rgba(245,230,216,0.4)' }}>
          <ArrowLeft className="w-4 h-4" /> Académie des Élus
        </Link>

        {isPreview && (
          <div className="card-cinematic p-3 mb-5 flex items-center gap-2.5 print:hidden">
            <Eye className="w-4 h-4 text-gold" />
            <p className="font-inter text-sm text-pearl/70">Aperçu du modèle officiel — le nom et le numéro réels seront générés à la validation.</p>
          </div>
        )}

        {cred ? (
          <Certificate credential={cred} />
        ) : (
          <div className="card-cinematic p-8 text-center">
            <ShieldX className="w-8 h-8 mx-auto mb-3" style={{ color: '#EF4444' }} />
            <p className="font-cinzel font-bold text-white mb-1">Certificat introuvable</p>
            <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>Aucun document ne correspond à ce numéro.</p>
            <Link href="/academie/verifier" className="btn-glass-cinematic inline-flex mt-4">Vérifier un numéro</Link>
          </div>
        )}
      </div>
    </div>
  )
}
