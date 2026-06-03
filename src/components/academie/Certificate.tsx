'use client'
import QRCode from 'react-qr-code'
import { Printer } from 'lucide-react'
import { AcademySeal, type SealVariant } from './AcademySeal'
import type { Credential } from '@/lib/academie/credentials'

/* ============================================================
   Certificate — rendu premium imprimable (PDF via navigateur) d'un
   certificat de niveau ou du diplôme suprême. Sceau académique + QR de
   vérification + numéro unique + signature + date.
   ============================================================ */

export function Certificate({ credential, showActions = true }: { credential: Credential; showActions?: boolean }) {
  const isDiploma = credential.type === 'diploma'
  const seal: SealVariant = isDiploma ? 'or' : 'violet'
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/academie/verifier?code=${credential.code}`
    : `/academie/verifier?code=${credential.code}`
  const date = new Date(credential.issuedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="w-full">
      {showActions && (
        <div className="flex justify-end mb-3 print:hidden">
          <button onClick={() => window.print()} className="btn-gold-cinematic text-sm">
            <Printer className="w-4 h-4" /> Télécharger / Imprimer (PDF)
          </button>
        </div>
      )}

      <div className="cert-print relative mx-auto" style={{
        maxWidth: 820, aspectRatio: '1.414/1',
        background: 'linear-gradient(160deg, #0c0a16 0%, #14101f 55%, #0c0a16 100%)',
        border: '2px solid rgba(212,175,55,0.5)', borderRadius: 16,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)', padding: 'clamp(20px, 4vw, 48px)',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}>
        {/* Double liseré */}
        <div className="absolute inset-3 pointer-events-none" style={{ border: '1px solid rgba(212,175,55,0.3)', borderRadius: 10 }} />
        {/* Filigrane sceau */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.06 }}>
          <AcademySeal variant={seal} size={420} />
        </div>

        <div className="relative h-full flex flex-col items-center text-center">
          <div className="flex items-center justify-between w-full">
            <AcademySeal variant={seal} size={64} />
            <div className="text-right">
              <p className="font-cinzel text-[10px] tracking-[0.3em] uppercase" style={{ color: 'rgba(245,230,216,0.5)' }}>Académie des Élus</p>
              <p className="font-inter text-[9px]" style={{ color: 'rgba(245,230,216,0.35)' }}>CFIC · La Chapelle Internationale des Élus du Royaume</p>
            </div>
          </div>

          <p className="font-cinzel font-black tracking-[0.2em] uppercase mt-4 mb-1"
            style={{ fontSize: 'clamp(1.1rem, 2.6vw, 1.7rem)', color: '#F5E6A7' }}>
            {isDiploma ? 'Diplôme' : 'Certificat de Niveau'}
          </p>
          {isDiploma && <p className="font-cinzel text-base md:text-lg text-white mb-1">des Bâtisseurs du Royaume</p>}

          <p className="font-cormorant italic text-sm mt-3" style={{ color: 'rgba(245,230,216,0.6)' }}>Décerné à</p>
          <p className="font-cinzel font-bold text-white my-1" style={{ fontSize: 'clamp(1.3rem, 3.4vw, 2.2rem)' }}>
            {credential.recipient || '—'}
          </p>

          <p className="font-inter text-xs md:text-sm max-w-xl leading-relaxed mt-2" style={{ color: 'rgba(245,230,216,0.65)' }}>
            {isDiploma
              ? "pour avoir validé avec succès l'intégralité du parcours de formation de l'Académie des Élus."
              : <>pour avoir validé avec succès l&apos;intégralité du parcours : <span className="font-semibold" style={{ color: '#F5E6A7' }}>{credential.title}</span>.</>}
          </p>

          {isDiploma && credential.mention && (
            <p className="mt-3 inline-block font-cinzel text-sm font-bold px-4 py-1 rounded-full"
              style={{ background: 'rgba(212,175,55,0.14)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.35)' }}>
              Mention : {credential.mention}
            </p>
          )}

          <div className="flex-1" />

          <div className="flex items-end justify-between w-full mt-4">
            <div className="text-left">
              <p className="font-cormorant italic mb-0.5" style={{ fontSize: 'clamp(1.2rem,2.6vw,1.7rem)', color: '#F5E6A7', lineHeight: 1 }}>Doxa Salomon</p>
              <div className="w-40 border-t mb-1" style={{ borderColor: 'rgba(245,230,216,0.3)' }} />
              <p className="font-cinzel text-xs font-bold" style={{ color: 'rgba(245,230,216,0.8)' }}>Rév. Doxa Salomon</p>
              <p className="font-inter text-[10px]" style={{ color: 'rgba(245,230,216,0.45)' }}>Directeur de l&apos;Académie des Élus · CFIC</p>
              <p className="font-inter text-[10px] mt-1" style={{ color: 'rgba(245,230,216,0.4)' }}>Délivré le {date}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div style={{ background: '#fff', padding: 5, borderRadius: 6 }}>
                <QRCode value={verifyUrl} size={64} />
              </div>
              <p className="font-inter text-[9px] tracking-wider" style={{ color: 'rgba(245,230,216,0.55)' }}>{credential.code}</p>
              <p className="font-inter text-[8px]" style={{ color: 'rgba(245,230,216,0.3)' }}>Vérifiable sur /academie/verifier</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
