import { cookies } from 'next/headers'
import Image from 'next/image'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isValidAdminToken } from '@/lib/admin-auth'

/**
 * Aperçu admin sécurisé d'un contenu (publié OU brouillon).
 *   /preview/<type>/<id>
 * Accès réservé : cookie admin `cier_admin`. Lecture via service role → permet
 * de prévisualiser les brouillons sans les rendre publics.
 */
export const dynamic = 'force-dynamic'

// Mappe le "type" d'URL vers la table cms_*.
const TABLE_MAP: Record<string, string> = {
  pages: 'cms_pages', page: 'cms_pages',
  articles: 'cms_articles', article: 'cms_articles',
  events: 'cms_events', event: 'cms_events', evenements: 'cms_events',
  lives: 'cms_lives', live: 'cms_lives',
  media: 'cms_media', medias: 'cms_media',
  podcasts: 'cms_podcasts', podcast: 'cms_podcasts',
  testimonies: 'cms_testimonies', temoignages: 'cms_testimonies',
  enseignements: 'cms_teachings', teachings: 'cms_teachings', formation: 'cms_teachings',
  modules: 'formation_modules', formation_modules: 'formation_modules',
  parcours: 'parcours',
  formations: 'formations',
}

function youtubeId(url?: string): string | null {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([\w-]{11})/)
  return m ? m[1] : (/^[\w-]{11}$/.test(url) ? url : null)
}

const fmt = (s?: string) => { if (!s) return ''; try { return new Date(s).toLocaleString('fr-FR') } catch { return s } }

export default async function PreviewPage({ params, searchParams }: { params: { type: string; id: string }; searchParams?: { vue?: string } }) {
  const mobile = searchParams?.vue === 'mobile'
  // Garde : admin uniquement.
  if (!isValidAdminToken(cookies().get('cier_admin')?.value)) {
    return <Centered title="Accès réservé" text="Cet aperçu est réservé à l'administration connectée." />
  }
  const table = TABLE_MAP[params.type]
  if (!table) return <Centered title="Type inconnu" text={`Aucun aperçu pour « ${params.type} ».`} />
  if (IS_DEMO_MODE) return <Centered title="Mode démo" text="Connectez Supabase pour prévisualiser les contenus réels." />

  const { data: row, error } = await supabaseAdmin.from(table).select('*').eq('id', params.id).single()
  if (error || !row) return <Centered title="Contenu introuvable" text="Cet élément n'existe pas (ou a été supprimé)." />

  const title = row.title || row.titre || row.public_title || row.author_name || 'Sans titre'
  const cover = row.cover_url || row.image_url || row.image_couverture || row.og_image || row.thumbnail_url || (table === 'cms_media' && row.type === 'image' ? row.url : null)
  const body = row.body || row.contenu_texte || row.description || null
  const yt = youtubeId(row.youtube_url || row.video_url || row.youtube_id)
  const pdfUrl = row.pdf_url || null
  const isPdf = table === 'cms_media' && (row.type === 'pdf' || /\.pdf($|\?)/i.test(row.url || ''))
  const audio = row.audio_url || (table === 'cms_media' && row.type === 'audio' ? row.url : null)
  const dateStr = fmt(row.published_at || row.starts_at || row.scheduled_at)
  const published = ['published', 'live', 'approved', 'scheduled', 'ended'].includes(row.status) || row.statut === 'publie' || row.is_active === true

  return (
    <div className="min-h-screen bg-abyss pt-10 pb-20">
      {/* Bandeau aperçu + bascule Desktop / Mobile */}
      <div className="sticky top-0 z-10 w-full py-2 text-xs font-inter font-semibold flex items-center justify-center gap-4"
        style={{ background: published ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.18)', color: published ? '#22C55E' : '#F59E0B' }}>
        <span>APERÇU ADMIN — {published ? 'Contenu publié' : 'Brouillon (non visible du public)'}</span>
        <span className="inline-flex gap-1 rounded-lg overflow-hidden border border-white/10">
          <a href={`/preview/${params.type}/${params.id}`} className="px-2 py-0.5" style={{ background: mobile ? 'transparent' : 'rgba(255,255,255,0.12)', color: '#fff' }}>Desktop</a>
          <a href={`/preview/${params.type}/${params.id}?vue=mobile`} className="px-2 py-0.5" style={{ background: mobile ? 'rgba(255,255,255,0.12)' : 'transparent', color: '#fff' }}>Mobile</a>
        </span>
      </div>

      <div className={`container-royal mt-8 ${mobile ? 'max-w-[420px] rounded-2xl border border-white/10 py-6 px-4' : 'max-w-3xl'}`}>
        {row.category && <div className="text-[11px] uppercase tracking-wider text-gold/70 font-inter mb-3">{row.category}</div>}
        <h1 className="font-cinzel font-black text-pearl mb-3" style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)', lineHeight: 1.1 }}>{title}</h1>
        <div className="text-pearl/40 text-sm font-inter mb-6">
          {row.author || row.speaker || ''}{dateStr ? ` · ${dateStr}` : ''}{row.location ? ` · ${row.location}` : ''}
          <span className="ml-2 px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>statut : {row.status ?? row.statut ?? (row.is_active ? 'actif' : 'inactif')}</span>
        </div>

        {yt ? (
          <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 mb-8" style={{ aspectRatio: '16/9' }}>
            <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${yt}`} title={title} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
          </div>
        ) : cover ? (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 border border-white/5">
            <Image src={cover} alt={title} fill sizes="(max-width:768px) 100vw, 768px" className="object-cover" />
          </div>
        ) : null}

        {row.excerpt && <p className="text-pearl/70 text-lg font-inter leading-relaxed mb-6">{row.excerpt}</p>}
        {body && <div className="prose prose-invert max-w-none font-inter text-pearl/75 leading-relaxed whitespace-pre-wrap mb-8">{body}</div>}

        {isPdf && (
          <a href={row.url} target="_blank" rel="noreferrer" className="btn-gold-cinematic px-5 py-2.5 text-sm inline-flex">📄 Ouvrir le PDF</a>
        )}
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-gold-cinematic px-5 py-2.5 text-sm inline-flex mt-4">📄 Document PDF du module</a>
        )}
        {audio && (
          <audio controls src={audio} className="w-full mt-4">Votre navigateur ne supporte pas l'audio.</audio>
        )}
        {row.cta_href && (
          <a href={row.cta_href} target="_blank" rel="noreferrer" className="btn-gold-cinematic px-5 py-2.5 text-sm inline-flex mt-4">{row.cta_label || 'Découvrir'}</a>
        )}
        {table === 'cms_media' && !isPdf && !yt && !cover && row.url && (
          <a href={row.url} target="_blank" rel="noreferrer" className="text-gold/80 hover:text-gold break-all font-inter">{row.url}</a>
        )}
      </div>
    </div>
  )
}

function Centered({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-h-screen bg-abyss flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="font-cinzel text-xl font-bold text-pearl mb-2">{title}</h1>
        <p className="text-pearl/50 font-inter text-sm">{text}</p>
      </div>
    </div>
  )
}
