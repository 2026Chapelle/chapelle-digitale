'use client'
import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * Messagerie membre.
 * Aucune conversation fictive : la messagerie temps réel sera branchée à Supabase.
 * En attendant, état vide honnête (aucun faux contact, aucun faux message).
 */
export default function MessagesPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Espace Membre"
          title={<>Mes <span className="text-cinematic-gold">Messages</span></>}
          description="Échangez avec votre pasteur, votre berger et vos groupes."
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="card-royal text-center py-20 mt-2"
        >
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}>
            <MessageCircle className="w-7 h-7 text-gold" />
          </div>
          <p className="font-cinzel text-lg text-pearl/60">Aucune conversation pour le moment</p>
          <p className="font-inter text-sm text-pearl/35 mt-1 max-w-md mx-auto">
            La messagerie sera bientôt disponible. En attendant, vous pouvez déposer une demande de prière
            ou rejoindre un groupe pour entrer en contact avec la communauté.
          </p>
          <div className="flex flex-wrap gap-2.5 justify-center mt-6">
            <Link href="/member/dashboard/prieres" className="btn-gold text-sm px-5 py-2.5">Demande de prière</Link>
            <Link href="/member/dashboard/groupes" className="btn-royal text-sm px-5 py-2.5">Mes groupes</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
