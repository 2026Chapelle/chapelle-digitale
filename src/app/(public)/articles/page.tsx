import Link from 'next/link'
import Image from 'next/image'
import { Newspaper, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { cmsList, type CmsArticle } from '@/lib/cms'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Articles — Citadelle du Royaume',
  description: 'Articles, enseignements écrits et actualités de la Citadelle du Royaume.',
}

const fmt = (iso?: string) => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return '' }
}

export default async function ArticlesPage() {
  const articles = (await cmsList<CmsArticle>('cms_articles', { publicOnly: true })) ?? []

  return (
    <div className="min-h-screen bg-abyss pt-28 pb-20">
      <div className="container-royal">
        <PageHeader
          eyebrow="Le blog de la Citadelle"
          title={<>Arti<span className="text-cinematic-gold">cles</span></>}
          description="Enseignements écrits, réflexions et actualités du Royaume."
        />

        {articles.length === 0 ? (
          <div className="card-cinematic p-10 text-center">
            <Newspaper className="w-8 h-8 text-gold/50 mx-auto mb-3" />
            <p className="text-pearl/50 font-inter">Aucun article publié pour le moment. Revenez bientôt.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a) => (
              <Link key={a.id} href={`/articles/${a.slug}`} className="group card-cinematic overflow-hidden flex flex-col">
                <div className="relative aspect-[16/9] bg-white/5 overflow-hidden">
                  {a.cover_url ? (
                    <Image src={a.cover_url} alt={a.title} fill sizes="(max-width:768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Newspaper className="w-8 h-8 text-gold/30" />
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  {a.category && <span className="text-[11px] uppercase tracking-wider text-gold/70 font-inter mb-2">{a.category}</span>}
                  <h2 className="font-cinzel font-bold text-pearl text-base mb-2 line-clamp-2">{a.title}</h2>
                  {a.excerpt && <p className="text-pearl/45 text-sm font-inter line-clamp-3 flex-1">{a.excerpt}</p>}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <span className="text-pearl/30 text-xs font-inter">{a.author || ''}{a.published_at ? ` · ${fmt(a.published_at)}` : ''}</span>
                    <ArrowRight className="w-4 h-4 text-gold/60 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
