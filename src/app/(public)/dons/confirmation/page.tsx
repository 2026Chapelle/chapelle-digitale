'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, Heart, ArrowRight, Receipt } from 'lucide-react'

function ConfirmationContent() {
  const sp = useSearchParams()
  const programme = sp.get('programme') || sp.get('program')
  const ref = sp.get('ref') || sp.get('reference')

  return (
    <div className="min-h-screen bg-abyss pt-28 pb-20">
      <div className="container-royal max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="card-royal text-center p-8 md:p-12" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring' }}
            className="w-16 h-16 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </motion.div>

          <div className="section-label justify-center mb-3">Merci infiniment</div>
          <h1 className="font-cinzel text-2xl md:text-3xl font-black text-pearl mb-3">
            Votre générosité fait la différence
          </h1>
          <p className="font-inter text-pearl/55 text-sm leading-relaxed mb-6 max-w-md mx-auto">
            Du fond du cœur, merci pour votre don{programme ? <> en faveur de <strong className="text-pearl/80">{programme}</strong></> : ''}.
            Il soutient l&apos;œuvre de Dieu et la croissance de Son Royaume. Que Dieu vous le rende au centuple.
          </p>

          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 mb-6 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-2 text-xs text-pearl/50 font-inter">
              <Receipt className="w-4 h-4 text-gold" />
              Un reçu et un message de remerciement vous sont envoyés par email dès confirmation du paiement.
            </div>
            {ref && <p className="font-inter text-[11px] text-pearl/35 mt-2">Référence : <strong className="text-pearl/60">{ref}</strong></p>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/member/dashboard/dons" className="btn-gold text-sm px-6 py-3 inline-flex items-center gap-2">
              <Heart className="w-4 h-4" /> Voir mes dons
            </Link>
            <Link href="/" className="btn-ghost text-sm px-6 py-3 inline-flex items-center gap-2">
              Retour à l&apos;accueil <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function DonConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-abyss" />}>
      <ConfirmationContent />
    </Suspense>
  )
}
