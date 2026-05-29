'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Home, Compass, BookOpen, Heart } from 'lucide-react'

const SUGGESTIONS = [
  { label: 'Formations', href: '/formations', icon: BookOpen },
  { label: 'Prière', href: '/priere', icon: Heart },
  { label: 'Plateformes', href: '/plateformes', icon: Compass },
]

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#050505' }}>

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full opacity-[0.12] blur-[160px]"
          style={{ background: 'radial-gradient(ellipse, #4B0082 0%, #D4AF37 60%, transparent 100%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] rounded-full opacity-[0.08] blur-[120px]"
          style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative text-center max-w-lg w-full"
      >
        {/* 404 */}
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-cinzel font-black select-none leading-none mb-2"
          style={{
            fontSize: 'clamp(5rem, 18vw, 9rem)',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.9) 0%, rgba(212,175,55,0.35) 50%, rgba(139,92,246,0.4) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </motion.div>

        {/* Decorative mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 200 }}
          className="mb-6 flex justify-center"
        >
          <Image
            src="/images/logo-mark.png"
            alt="CIER"
            width={48}
            height={48}
            className="w-12 h-12 object-contain drop-shadow-[0_2px_14px_rgba(212,175,55,0.5)]"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-cinzel text-xl md:text-2xl font-bold text-white mb-3"
        >
          Page Introuvable
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="font-inter text-sm mb-10 leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          Cette page n&apos;existe pas ou a été déplacée.<br />
          Que la Parole vous guide vers votre destination.
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-10"
        >
          <Link href="/"
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-inter font-bold text-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00', boxShadow: '0 4px 24px rgba(212,175,55,0.35)' }}>
            <Home className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>
          <Link href="/priere"
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-inter font-medium text-sm transition-all hover:-translate-y-0.5"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)' }}>
            <Heart className="w-4 h-4" />
            Espace Prière
          </Link>
        </motion.div>

        {/* Quick suggestions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-[10px] font-inter uppercase tracking-[0.25em] mb-4" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Vous cherchiez peut-être
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {SUGGESTIONS.map(s => (
              <Link key={s.href} href={s.href}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-inter transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
                <s.icon className="w-3 h-3" />
                {s.label}
              </Link>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
