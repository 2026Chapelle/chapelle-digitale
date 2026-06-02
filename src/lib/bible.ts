/**
 * BIBLE — Louis Segond (LSG) + plan de lecture annuel.
 *
 * Architecture volontairement LÉGÈRE et ÉVOLUTIVE :
 *   • Seules les MÉTADONNÉES des livres sont embarquées (66 entrées) — le texte
 *     n'est JAMAIS embarqué : il est récupéré à la demande via /api/bible
 *     (proxy serveur vers une API LSG publique). Voir src/app/api/bible/route.ts.
 *   • Le plan annuel (365 jours) est CALCULÉ à partir des métadonnées, donc aucun
 *     gros tableau statique dans le bundle.
 *   • Pour une future version premium (texte hors-ligne, autres versions), il
 *     suffit de changer la source dans l'API — l'UI reste inchangée.
 */

export interface BibleBook {
  /** Identifiant canonique 1..66 (ordre protestant), compatible API bolls.life. */
  id: number
  nom: string
  /** Abréviation courte. */
  abbr: string
  /** Nombre de chapitres. */
  chapitres: number
  testament: 'AT' | 'NT'
}

export const BIBLE_BOOKS: BibleBook[] = [
  { id: 1, nom: 'Genèse', abbr: 'Gen', chapitres: 50, testament: 'AT' },
  { id: 2, nom: 'Exode', abbr: 'Exo', chapitres: 40, testament: 'AT' },
  { id: 3, nom: 'Lévitique', abbr: 'Lév', chapitres: 27, testament: 'AT' },
  { id: 4, nom: 'Nombres', abbr: 'Nom', chapitres: 36, testament: 'AT' },
  { id: 5, nom: 'Deutéronome', abbr: 'Deu', chapitres: 34, testament: 'AT' },
  { id: 6, nom: 'Josué', abbr: 'Jos', chapitres: 24, testament: 'AT' },
  { id: 7, nom: 'Juges', abbr: 'Jug', chapitres: 21, testament: 'AT' },
  { id: 8, nom: 'Ruth', abbr: 'Rut', chapitres: 4, testament: 'AT' },
  { id: 9, nom: '1 Samuel', abbr: '1Sa', chapitres: 31, testament: 'AT' },
  { id: 10, nom: '2 Samuel', abbr: '2Sa', chapitres: 24, testament: 'AT' },
  { id: 11, nom: '1 Rois', abbr: '1Ro', chapitres: 22, testament: 'AT' },
  { id: 12, nom: '2 Rois', abbr: '2Ro', chapitres: 25, testament: 'AT' },
  { id: 13, nom: '1 Chroniques', abbr: '1Ch', chapitres: 29, testament: 'AT' },
  { id: 14, nom: '2 Chroniques', abbr: '2Ch', chapitres: 36, testament: 'AT' },
  { id: 15, nom: 'Esdras', abbr: 'Esd', chapitres: 10, testament: 'AT' },
  { id: 16, nom: 'Néhémie', abbr: 'Néh', chapitres: 13, testament: 'AT' },
  { id: 17, nom: 'Esther', abbr: 'Est', chapitres: 10, testament: 'AT' },
  { id: 18, nom: 'Job', abbr: 'Job', chapitres: 42, testament: 'AT' },
  { id: 19, nom: 'Psaumes', abbr: 'Psa', chapitres: 150, testament: 'AT' },
  { id: 20, nom: 'Proverbes', abbr: 'Pro', chapitres: 31, testament: 'AT' },
  { id: 21, nom: 'Ecclésiaste', abbr: 'Ecc', chapitres: 12, testament: 'AT' },
  { id: 22, nom: 'Cantique des Cantiques', abbr: 'Can', chapitres: 8, testament: 'AT' },
  { id: 23, nom: 'Ésaïe', abbr: 'Ésa', chapitres: 66, testament: 'AT' },
  { id: 24, nom: 'Jérémie', abbr: 'Jér', chapitres: 52, testament: 'AT' },
  { id: 25, nom: 'Lamentations', abbr: 'Lam', chapitres: 5, testament: 'AT' },
  { id: 26, nom: 'Ézéchiel', abbr: 'Ézé', chapitres: 48, testament: 'AT' },
  { id: 27, nom: 'Daniel', abbr: 'Dan', chapitres: 12, testament: 'AT' },
  { id: 28, nom: 'Osée', abbr: 'Osé', chapitres: 14, testament: 'AT' },
  { id: 29, nom: 'Joël', abbr: 'Joë', chapitres: 3, testament: 'AT' },
  { id: 30, nom: 'Amos', abbr: 'Amo', chapitres: 9, testament: 'AT' },
  { id: 31, nom: 'Abdias', abbr: 'Abd', chapitres: 1, testament: 'AT' },
  { id: 32, nom: 'Jonas', abbr: 'Jon', chapitres: 4, testament: 'AT' },
  { id: 33, nom: 'Michée', abbr: 'Mic', chapitres: 7, testament: 'AT' },
  { id: 34, nom: 'Nahum', abbr: 'Nah', chapitres: 3, testament: 'AT' },
  { id: 35, nom: 'Habacuc', abbr: 'Hab', chapitres: 3, testament: 'AT' },
  { id: 36, nom: 'Sophonie', abbr: 'Sop', chapitres: 3, testament: 'AT' },
  { id: 37, nom: 'Aggée', abbr: 'Agg', chapitres: 2, testament: 'AT' },
  { id: 38, nom: 'Zacharie', abbr: 'Zac', chapitres: 14, testament: 'AT' },
  { id: 39, nom: 'Malachie', abbr: 'Mal', chapitres: 4, testament: 'AT' },
  { id: 40, nom: 'Matthieu', abbr: 'Mat', chapitres: 28, testament: 'NT' },
  { id: 41, nom: 'Marc', abbr: 'Mar', chapitres: 16, testament: 'NT' },
  { id: 42, nom: 'Luc', abbr: 'Luc', chapitres: 24, testament: 'NT' },
  { id: 43, nom: 'Jean', abbr: 'Jea', chapitres: 21, testament: 'NT' },
  { id: 44, nom: 'Actes', abbr: 'Act', chapitres: 28, testament: 'NT' },
  { id: 45, nom: 'Romains', abbr: 'Rom', chapitres: 16, testament: 'NT' },
  { id: 46, nom: '1 Corinthiens', abbr: '1Co', chapitres: 16, testament: 'NT' },
  { id: 47, nom: '2 Corinthiens', abbr: '2Co', chapitres: 13, testament: 'NT' },
  { id: 48, nom: 'Galates', abbr: 'Gal', chapitres: 6, testament: 'NT' },
  { id: 49, nom: 'Éphésiens', abbr: 'Éph', chapitres: 6, testament: 'NT' },
  { id: 50, nom: 'Philippiens', abbr: 'Phi', chapitres: 4, testament: 'NT' },
  { id: 51, nom: 'Colossiens', abbr: 'Col', chapitres: 4, testament: 'NT' },
  { id: 52, nom: '1 Thessaloniciens', abbr: '1Th', chapitres: 5, testament: 'NT' },
  { id: 53, nom: '2 Thessaloniciens', abbr: '2Th', chapitres: 3, testament: 'NT' },
  { id: 54, nom: '1 Timothée', abbr: '1Ti', chapitres: 6, testament: 'NT' },
  { id: 55, nom: '2 Timothée', abbr: '2Ti', chapitres: 4, testament: 'NT' },
  { id: 56, nom: 'Tite', abbr: 'Tit', chapitres: 3, testament: 'NT' },
  { id: 57, nom: 'Philémon', abbr: 'Phm', chapitres: 1, testament: 'NT' },
  { id: 58, nom: 'Hébreux', abbr: 'Héb', chapitres: 13, testament: 'NT' },
  { id: 59, nom: 'Jacques', abbr: 'Jac', chapitres: 5, testament: 'NT' },
  { id: 60, nom: '1 Pierre', abbr: '1Pi', chapitres: 5, testament: 'NT' },
  { id: 61, nom: '2 Pierre', abbr: '2Pi', chapitres: 3, testament: 'NT' },
  { id: 62, nom: '1 Jean', abbr: '1Je', chapitres: 5, testament: 'NT' },
  { id: 63, nom: '2 Jean', abbr: '2Je', chapitres: 1, testament: 'NT' },
  { id: 64, nom: '3 Jean', abbr: '3Je', chapitres: 1, testament: 'NT' },
  { id: 65, nom: 'Jude', abbr: 'Jud', chapitres: 1, testament: 'NT' },
  { id: 66, nom: 'Apocalypse', abbr: 'Apo', chapitres: 22, testament: 'NT' },
]

export const BIBLE_BOOK_BY_ID = new Map(BIBLE_BOOKS.map((b) => [b.id, b]))

export interface ChapterRef { bookId: number; book: string; chapitre: number }
export interface PlanDay { jour: number; lectures: ChapterRef[] }

/** Liste à plat de tous les chapitres de la Bible, dans l'ordre canonique. */
function allChapters(): ChapterRef[] {
  const out: ChapterRef[] = []
  for (const b of BIBLE_BOOKS) {
    for (let c = 1; c <= b.chapitres; c++) out.push({ bookId: b.id, book: b.nom, chapitre: c })
  }
  return out
}

export const TOTAL_JOURS = 365
let _plan: PlanDay[] | null = null

/**
 * Plan de lecture annuel : la Bible entière en 365 jours, répartie
 * régulièrement (~3 à 4 chapitres/jour), dans l'ordre canonique.
 */
export function getAnnualPlan(): PlanDay[] {
  if (_plan) return _plan
  const chapters = allChapters()
  const total = chapters.length
  const plan: PlanDay[] = []
  for (let d = 0; d < TOTAL_JOURS; d++) {
    const start = Math.floor((d * total) / TOTAL_JOURS)
    const end = Math.floor(((d + 1) * total) / TOTAL_JOURS)
    plan.push({ jour: d + 1, lectures: chapters.slice(start, end) })
  }
  _plan = plan
  return plan
}

/** Index du jour de l'année (0..364) pour une date donnée. */
export function dayOfYearIndex(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const day = Math.floor(diff / 86_400_000) // ms/jour
  return Math.min(TOTAL_JOURS - 1, Math.max(0, day - 1))
}

/** Référence lisible : « Genèse 1 ». */
export function refLabel(r: ChapterRef): string {
  return `${r.book} ${r.chapitre}`
}

/** Résumé compact des lectures d'un jour : « Genèse 1–3 ». */
export function dayLabel(day: PlanDay): string {
  if (!day.lectures.length) return ''
  // Regroupe par livre pour un libellé court.
  const parts: string[] = []
  let i = 0
  while (i < day.lectures.length) {
    const book = day.lectures[i].book
    let j = i
    while (j + 1 < day.lectures.length && day.lectures[j + 1].book === book) j++
    const first = day.lectures[i].chapitre
    const last = day.lectures[j].chapitre
    parts.push(first === last ? `${book} ${first}` : `${book} ${first}–${last}`)
    i = j + 1
  }
  return parts.join(' · ')
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

/**
 * Analyse une référence saisie (« Jean 3 », « 1 cor 13 », « genese 1 »).
 * Renvoie le livre + chapitre si reconnu.
 */
export function parseReference(input: string): ChapterRef | null {
  const raw = normalize(input)
  const m = raw.match(/^(.*?)(\d+)\s*$/)
  if (!m) return null
  const namePart = m[1].trim()
  const chap = parseInt(m[2], 10)
  if (!namePart || !chap) return null
  // Cherche par nom complet, abréviation, ou préfixe.
  const book = BIBLE_BOOKS.find((b) => {
    const n = normalize(b.nom)
    const a = normalize(b.abbr)
    return n === namePart || a === namePart || n.startsWith(namePart) || namePart.startsWith(a)
  })
  if (!book) return null
  if (chap < 1 || chap > book.chapitres) return null
  return { bookId: book.id, book: book.nom, chapitre: chap }
}
