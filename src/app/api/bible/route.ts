import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { BIBLE_BOOK_BY_ID } from '@/lib/bible'

/**
 * Proxy de lecture biblique — Louis Segond (LSG) par défaut.
 *   GET /api/bible?book=<1..66>&chapter=<n>
 *
 * Le texte n'est PAS embarqué dans l'app : il est récupéré à la demande,
 * côté serveur (évite tout souci CORS, source interchangeable).
 *
 * Robustesse (la Bible doit TOUJOURS répondre) :
 *  - chaque appel upstream a un timeout strict (AbortController) ;
 *  - on tente une CHAÎNE de sources sur DEUX hôtes indépendants, dans cet
 *    ordre de préférence (Segond d'abord, puis versions FR proches) ;
 *  - on ne renvoie 502 que si TOUTES les sources échouent.
 *
 * Réponse : { ok, reference, translation, verses:[{verse,text}] } | { ok:false }.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // dépend des query params (book/chapter)

type Verse = { verse: number; text: string }

// Numérotation des livres identique (1..66) sur les deux hôtes.
type Source = {
  host: string
  label: string // nom affiché de la traduction réellement servie
  url: (book: number, chapter: number) => string
  parse: (data: any) => Verse[]
}

const cleanText = (t: unknown) =>
  String(t ?? '')
    .replace(/<[^>]+>/g, '') // balises éventuelles
    .replace(/\s+/g, ' ')
    .trim()

const normalize = (rows: any[]): Verse[] =>
  (Array.isArray(rows) ? rows : [])
    .map((v) => ({ verse: Number(v.verse), text: cleanText(v.text) }))
    .filter((v) => v.verse && v.text)

// bolls.life renvoie un tableau plat [{verse,text}]
const bolls = (code: string, label: string): Source => ({
  host: 'bolls.life',
  label,
  url: (b, c) => `https://bolls.life/get-text/${code}/${b}/${c}/`,
  parse: (data) => normalize(data),
})

// getbible.net renvoie { verses: [{verse,text}] }
const getbible = (code: string, label: string): Source => ({
  host: 'getbible.net',
  label,
  url: (b, c) => `https://api.getbible.net/v2/${code}/${b}/${c}.json`,
  parse: (data) => normalize(data?.verses),
})

// Ordre de préférence : Segond 1910 sur les deux hôtes en tête, puis replis FR proches.
const SOURCES: Source[] = [
  bolls('FRLSG', 'Louis Segond (1910)'),
  getbible('ls1910', 'Louis Segond (1910)'),
  bolls('NBS', 'Nouvelle Bible Segond'),
  bolls('BDS', 'Bible du Semeur'),
  bolls('FRDBY', 'Bible Darby'),
  getbible('darby', 'Bible Darby'),
  getbible('martin', 'Bible Martin'),
]

async function fetchVerses(src: Source, book: number, chapter: number): Promise<Verse[] | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 9000) // 9 s par source
  try {
    const r = await fetch(src.url(book, chapter), {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 86400 }, // mise en cache 24 h par référence
    })
    if (!r.ok) return null
    const verses = src.parse(await r.json())
    return verses.length ? verses : null
  } catch {
    return null // timeout / réseau / parse -> on passe à la source suivante
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const book = parseInt(searchParams.get('book') || '', 10)
  const chapter = parseInt(searchParams.get('chapter') || '', 10)

  const meta = BIBLE_BOOK_BY_ID.get(book)
  if (!meta || !chapter || chapter < 1 || chapter > meta.chapitres) {
    return NextResponse.json({ ok: false, message: 'Référence invalide.' }, { status: 400 })
  }

  const reference = `${meta.nom} ${chapter}`

  for (const src of SOURCES) {
    const verses = await fetchVerses(src, book, chapter)
    if (verses) {
      return NextResponse.json(
        { ok: true, reference, translation: src.label, verses },
        {
          // Le texte d'un chapitre est immuable : cache CDN/navigateur agressif.
          headers: {
            'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
          },
        },
      )
    }
  }

  return NextResponse.json(
    { ok: false, reference, message: 'Texte momentanément indisponible.' },
    { status: 502 },
  )
}
