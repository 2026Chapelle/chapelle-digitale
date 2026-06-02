import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cmsList, type CmsArticle } from '@/lib/cms'
import { siteUrl } from '@/lib/site-url'
import ShareButtons from '@/components/ui/ShareButtons'

export const dynamic = 'force-dynamic'

const fmt = (iso?: string) => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return '' }
}

async function getArticle(slug: string): Promise<CmsArticle | null> {
  const rows = await cmsList<CmsArticle>('cms_articles', { publicOnly: true, filter: { slug } })
  return rows?.[0] ?? null
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const a = await getArticle(params.slug)
  if (!a) return { title: 'Article introuvable' }
  return { title: `${a.title} — Citadelle du Royaume`, description: a.excerpt || undefined }
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const a = await getArticle(params.slug)
  if (!a) notFound()

  const shareUrl = siteUrl('/articles/' + a.slug)

  return (
    <article className="min-h-screen bg-abyss pb-20">
      {a.cover_url ? (
        /* HERO en overlay : image plein cadre + dégradé + titre par-dessus */
        <header className="relative w-full min-h-[58vh] md:min-h-[68vh] flex items-end overflow-hidden">
          <Image src={a.cover_url} alt={a.title} fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,3,8,0.45) 0%, rgba(5,3,8,0.55) 40%, rgba(5,3,8,0.95) 100%)' }} />
          <div className="relative z-10 container-royal max-w-3xl pb-12 pt-32">
            <Link href="/articles" className="inline-flex items-center gap-2 text-pearl/70 hover:text-gold text-sm font-inter mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Tous les articles
            </Link>
            {a.category && <div className="text-[11px] uppercase tracking-wider text-gold font-inter mb-3">{a.category}</div>}
            <h1 className="font-cinzel font-black text-pearl mb-4 text-balance" style={{ fontSize: 'clamp(1.9rem,4.5vw,3rem)', lineHeight: 1.05, textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
              {a.title}
            </h1>
            <div className="text-pearl/60 text-sm font-inter">
              {a.author || ''}{a.published_at ? ` · ${fmt(a.published_at)}` : ''}
            </div>
          </div>
        </header>
      ) : (
        <div className="container-royal max-w-3xl pt-28">
          <Link href="/articles" className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tous les articles
          </Link>
          {a.category && <div className="text-[11px] uppercase tracking-wider text-gold/70 font-inter mb-3">{a.category}</div>}
          <h1 className="font-cinzel font-black text-pearl mb-4" style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)', lineHeight: 1.1 }}>
            {a.title}
          </h1>
          <div className="text-pearl/40 text-sm font-inter">
            {a.author || ''}{a.published_at ? ` · ${fmt(a.published_at)}` : ''}
          </div>
        </div>
      )}

      <div className="container-royal max-w-3xl pt-8">
        <ShareButtons url={shareUrl} title={a.title} />
      </div>

      <div className="container-royal max-w-3xl pt-10">
        {a.excerpt && <p className="text-pearl/70 text-lg font-inter leading-relaxed mb-8">{a.excerpt}</p>}
        {a.body && (
          <div className="prose prose-invert max-w-none font-inter text-pearl/75 leading-relaxed whitespace-pre-wrap">
            {a.body}
          </div>
        )}

        <div className="mt-12 border-t border-pearl/10 pt-8">
          <ShareButtons url={shareUrl} title={a.title} />
        </div>
      </div>
    </article>
  )
}
