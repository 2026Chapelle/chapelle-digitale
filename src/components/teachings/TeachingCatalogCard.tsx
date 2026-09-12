import Image from 'next/image'
import Link from 'next/link'

import {
  BookOpen,
  GraduationCap,
  LockKeyhole,
  Play,
} from 'lucide-react'

import {
  normalizeAccessLevel,
  type TeachingCatalogItem,
} from '@/lib/teachings/teaching-access'

export function TeachingCatalogCard({
  teaching,
}: {
  teaching: TeachingCatalogItem
}) {
  const accessLevel = normalizeAccessLevel(teaching.access_level)
  const isProtected = accessLevel !== 'public'
  const slug = teaching.slug?.trim() || ''
  const canOpen = !isProtected && Boolean(slug)

  return (
    <article className="card-cinematic overflow-hidden flex flex-col group">
      <div className="relative aspect-[16/9] bg-white/5 overflow-hidden">
        {teaching.cover_url ? (
          <Image
            src={teaching.cover_url}
            alt={teaching.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-gold/25" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-abyss/70 via-transparent to-transparent" />

        {isProtected && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-abyss/85 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-wider text-pearl/85">
            <LockKeyhole className="w-3 h-3 text-gold" />
            {accessLevel === 'premium' ? 'Premium' : 'Membres'}
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h2 className="font-cinzel font-bold text-pearl text-lg leading-snug mb-2 line-clamp-2">
          {teaching.title}
        </h2>

        <p className="text-pearl/40 text-xs font-inter mb-4">
          {teaching.scripture || ''}
          {teaching.scripture && teaching.speaker ? ' · ' : ''}
          {teaching.speaker || ''}
        </p>

        {!isProtected && teaching.description && (
          <p className="text-pearl/60 text-sm font-inter leading-relaxed line-clamp-2 mb-5">
            {teaching.description}
          </p>
        )}

        {isProtected && (
          <p className="text-pearl/50 text-sm font-inter leading-relaxed mb-5">
            {accessLevel === 'premium'
              ? 'Réservé aux membres disposant de l’accès Premium Enseignements.'
              : 'Réservé aux membres de Citadelle.'}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-white/5">
          {canOpen ? (
            <Link
              href={`/enseignements/${slug}`}
              className="btn-gold-cinematic px-4 py-2 text-xs inline-flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              Regarder
            </Link>
          ) : isProtected ? (
            <span className="inline-flex items-center gap-2 text-xs text-gold/70 font-inter">
              <LockKeyhole className="w-3.5 h-3.5" />
              {accessLevel === 'premium'
                ? 'Accès Premium'
                : 'Connexion membre requise'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs text-pearl/40 font-inter">
              <BookOpen className="w-3.5 h-3.5" />
              Bientôt disponible
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
