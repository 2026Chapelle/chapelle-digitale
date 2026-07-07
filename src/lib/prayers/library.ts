/**
 * Bibliothèque de Prières (V2.3-B, Lot 1) — prières/guides ÉDITÉS par l'église.
 *
 * ⚠️ SÉCURITÉ : ce module contient le CONTENU COMPLET (`content`). Il ne doit être
 * importé QUE côté serveur (routes API). La partie publique (page /priere client)
 * ne reçoit QUE la projection `toPublicPrayerCard` (jamais `content`, jamais `pdf`).
 *
 * Aucune base de données, aucun SQL : contenu statique curé, prêt à lire.
 * Le champ `pdf` est prévu pour un lot ultérieur (téléchargement protégé) — NON utilisé ici.
 */

export type PrayerCategory =
  | 'Travail' | 'Délivrance' | 'Famille' | 'Santé' | 'Finances' | 'Spirituel'

export interface Prayer {
  id: string
  title: string
  category: PrayerCategory
  summary: string   // courte description (publique)
  excerpt: string   // extrait court (public)
  content: string   // contenu complet — RÉSERVÉ (jamais exposé publiquement)
  coverIcon: string // emoji simple
  pdf?: string      // optionnel — NON utilisé en Lot 1
  accessLevel: 'member'
}

/** Carte publique : strictement ce qui est montrable à un visiteur non connecté. */
export interface PublicPrayerCard {
  id: string
  title: string
  category: PrayerCategory
  summary: string
  excerpt: string
  coverIcon: string
  color: string
  accessLevel: 'member'
  locked: true
}

/** Vue membre : contenu complet, sans le champ `pdf` (réservé au Lot 2). */
export interface MemberPrayer {
  id: string
  title: string
  category: PrayerCategory
  summary: string
  content: string
  coverIcon: string
  color: string
  accessLevel: 'member'
}

export const CATEGORY_COLORS: Record<PrayerCategory, string> = {
  Travail: '#0EA5E9',
  Délivrance: '#8B5CF6',
  Famille: '#22C55E',
  Santé: '#EF4444',
  Finances: '#F59E0B',
  Spirituel: '#6366F1',
}

const PRAYERS: Prayer[] = [
  {
    id: 'priere-travail',
    title: 'Prière pour le travail',
    category: 'Travail',
    coverIcon: '💼',
    accessLevel: 'member',
    summary: 'Confier son activité, ses projets et ses mains au Seigneur.',
    excerpt: "Seigneur, affermis l'ouvrage de mes mains et ouvre devant moi les portes que toi seul peux ouvrir.",
    content:
      "Père céleste, je remets entre tes mains mon travail et mes projets. " +
      "Affermis l'ouvrage de mes mains, comme le demandait le psalmiste : « que l'œuvre de nos mains, affermis-la » (Psaume 90.17). " +
      "Donne-moi la sagesse pour bien décider, la fidélité pour bien servir, et l'intégrité en toute chose. " +
      "Ouvre devant moi les portes que toi seul peux ouvrir, et ferme celles qui ne viennent pas de toi. " +
      "Là où il y a la fatigue, renouvelle mes forces ; là où il y a l'inquiétude, donne ta paix. " +
      "Que je travaille de tout mon cœur comme pour le Seigneur et non pour les hommes (Colossiens 3.23). " +
      "Pourvois à mes besoins et à ceux de ma maison, et rends-moi une bénédiction pour ceux qui m'entourent. " +
      "Au nom de Jésus. Amen.",
  },
  {
    id: 'priere-delivrance',
    title: 'Prière de délivrance',
    category: 'Délivrance',
    coverIcon: '⛓️',
    accessLevel: 'member',
    summary: 'Se placer sous la protection et la liberté de Christ.',
    excerpt: "Seigneur, tu es mon refuge ; là où le Fils affranchit, on est réellement libre.",
    content:
      "Seigneur Jésus, je viens à toi tel que je suis, et je me place sous ta seigneurie. " +
      "Tu l'as dit : « si le Fils vous affranchit, vous serez réellement libres » (Jean 8.36). " +
      "Je renonce à toute œuvre des ténèbres et je m'attache à toi, la lumière du monde. " +
      "Couvre-moi de ta protection ; que ta paix garde mon cœur et mes pensées (Philippiens 4.7). " +
      "Revêts-moi de toutes les armes de Dieu afin que je tienne ferme (Éphésiens 6.11). " +
      "Je te confie mes combats, mes peurs et mes blessures ; guéris ce qui doit être guéri, restaure ce qui doit être restauré. " +
      "Aucune arme forgée contre moi ne prospérera (Ésaïe 54.17), car ma vie est cachée en toi. " +
      "Merci pour ta victoire à la croix. Au nom de Jésus. Amen.",
  },
  {
    id: 'priere-famille',
    title: 'Prière pour la famille',
    category: 'Famille',
    coverIcon: '👨‍👩‍👧‍👦',
    accessLevel: 'member',
    summary: 'Intercéder pour l\'unité, la paix et la foi du foyer.',
    excerpt: "Seigneur, bénis ma maison ; que nous te servions, moi et ma famille.",
    content:
      "Père, je te confie ma famille et mon foyer. " +
      "Comme Josué, je déclare : « moi et ma maison, nous servirons l'Éternel » (Josué 24.15). " +
      "Répands ta paix entre nous ; là où il y a des tensions, apporte la réconciliation ; là où il y a des silences, ramène le dialogue. " +
      "Garde nos enfants et nos proches sous ton aile ; qu'ils grandissent en sagesse et en grâce. " +
      "Apprends-nous à nous aimer avec patience et bonté, à nous supporter et à nous pardonner (Colossiens 3.13). " +
      "Fais de notre maison un lieu de repos, de prière et de bénédiction. " +
      "Protège ceux qui sont loin, console ceux qui souffrent, et unis-nous dans ton amour. " +
      "Au nom de Jésus. Amen.",
  },
  {
    id: 'priere-sante',
    title: 'Prière pour la santé',
    category: 'Santé',
    coverIcon: '❤️‍🩹',
    accessLevel: 'member',
    summary: 'Remettre son corps et sa guérison au Dieu qui restaure.',
    excerpt: "Seigneur, tu es celui qui guérit ; je remets mon corps et mes forces entre tes mains.",
    content:
      "Seigneur, tu es l'Éternel qui guérit (Exode 15.26). " +
      "Je remets entre tes mains mon corps, mes forces et ma santé. " +
      "Touche ce qui doit être touché, restaure ce qui est affaibli, et redonne-moi la vigueur selon ta volonté. " +
      "Bénis mon âme et n'oublie aucun de tes bienfaits : c'est toi qui pardonnes mes fautes et qui guéris mes maux (Psaume 103.2-3). " +
      "Donne sagesse à ceux qui me soignent et paix à ceux qui veillent sur moi. " +
      "Dans l'attente, soutiens ma foi ; que ta grâce me suffise et que ta force s'accomplisse dans ma faiblesse (2 Corinthiens 12.9). " +
      "Je m'appuie sur toi, mon Dieu, ma confiance. Au nom de Jésus. Amen.",
  },
  {
    id: 'priere-finances',
    title: 'Prière pour les finances',
    category: 'Finances',
    coverIcon: '💰',
    accessLevel: 'member',
    summary: 'Chercher la provision, la sagesse et la générosité de Dieu.',
    excerpt: "Seigneur, tu pourvois à tous mes besoins selon ta richesse ; enseigne-moi la sagesse.",
    content:
      "Père, tu es le Dieu qui pourvoit. " +
      "Ta Parole promet : « mon Dieu pourvoira à tous vos besoins selon sa richesse, avec gloire, en Jésus-Christ » (Philippiens 4.19). " +
      "Je te confie mes finances, mes charges et mes projets. " +
      "Donne-moi la sagesse pour administrer avec droiture ce que tu me confies, et la discipline pour ne pas m'endetter au-delà du raisonnable. " +
      "Délivre-moi de l'amour de l'argent et apprends-moi le contentement (1 Timothée 6.6-10). " +
      "Ouvre des portes de travail et de provision honnêtes ; bénis le fruit de mon labeur. " +
      "Rends-moi généreux, car il y a plus de bonheur à donner qu'à recevoir (Actes 20.35). " +
      "Que je te fasse confiance, aujourd'hui et pour demain. Au nom de Jésus. Amen.",
  },
  {
    id: 'priere-consecration',
    title: 'Prière de consécration spirituelle',
    category: 'Spirituel',
    coverIcon: '🙏',
    accessLevel: 'member',
    summary: "S'offrir à Dieu et rechercher sa présence chaque jour.",
    excerpt: "Seigneur, je m'offre à toi comme un sacrifice vivant ; renouvelle mon cœur.",
    content:
      "Seigneur, je réponds à ton amour en m'offrant à toi. " +
      "Je t'offre mon corps comme un sacrifice vivant, saint et agréable, ce qui est mon culte raisonnable (Romains 12.1). " +
      "Renouvelle mon intelligence et transforme-moi de l'intérieur. " +
      "Crée en moi un cœur pur et renouvelle en moi un esprit bien disposé (Psaume 51.12). " +
      "Que ta Parole soit une lampe à mes pieds et une lumière sur mon sentier (Psaume 119.105). " +
      "Remplis-moi de ton Esprit, conduis mes pas, et fais de moi un témoin de ta bonté. " +
      "Que je te cherche dès le matin et que je demeure en toi tout le jour, car sans toi je ne peux rien faire (Jean 15.5). " +
      "À toi la gloire, aujourd'hui et toujours. Au nom de Jésus. Amen.",
  },
]

/** Projection PUBLIQUE — ne retourne JAMAIS `content` ni `pdf`. */
export function toPublicPrayerCard(prayer: Prayer): PublicPrayerCard {
  return {
    id: prayer.id,
    title: prayer.title,
    category: prayer.category,
    summary: prayer.summary,
    excerpt: prayer.excerpt,
    coverIcon: prayer.coverIcon,
    color: CATEGORY_COLORS[prayer.category] || '#D4AF37',
    accessLevel: prayer.accessLevel,
    locked: true,
  }
}

/** Cartes publiques (aperçu libre). */
export function listPublicPrayerCards(): PublicPrayerCard[] {
  return PRAYERS.map(toPublicPrayerCard)
}

/** Vue membre : contenu complet, sans `pdf`. */
export function toMemberPrayer(prayer: Prayer): MemberPrayer {
  return {
    id: prayer.id,
    title: prayer.title,
    category: prayer.category,
    summary: prayer.summary,
    content: prayer.content,
    coverIcon: prayer.coverIcon,
    color: CATEGORY_COLORS[prayer.category] || '#D4AF37',
    accessLevel: prayer.accessLevel,
  }
}

/** Liste complète pour les membres connectés (contenu inclus). */
export function listMemberPrayers(): MemberPrayer[] {
  return PRAYERS.map(toMemberPrayer)
}

/** Détail complet par id (membre connecté). Renvoie null si inconnu. */
export function getFullPrayer(id: string): MemberPrayer | null {
  const p = PRAYERS.find((x) => x.id === id)
  return p ? toMemberPrayer(p) : null
}

/** Catégories présentes dans la bibliothèque (ordre d'apparition, sans doublon). */
export function listPrayerCategories(): PrayerCategory[] {
  const seen = new Set<PrayerCategory>()
  const out: PrayerCategory[] = []
  for (const p of PRAYERS) {
    if (!seen.has(p.category)) { seen.add(p.category); out.push(p.category) }
  }
  return out
}
