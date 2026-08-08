/**
 * Seed TypeScript — page CMS `chapelle-home` + 6 sections.
 * Contenu aligné sur le fallback validé Chapelle Next (lots 1–6).
 *
 * Usage :
 * - Admin guidé `/admin/chapelle-home` (bouton « Initialiser »)
 * - Ou POST via /api/admin/cms/pages + /api/admin/cms/sections
 *
 * Médias : chemins publics Chapelle Next (fallback local toujours valide).
 * Aucun SQL. Aucune migration. Aucune service role côté frontend Chapelle.
 */

export const CHAPELLE_HOME_PAGE_SLUG = 'chapelle-home' as const

export const chapelleHomePageSeed = {
  slug: CHAPELLE_HOME_PAGE_SLUG,
  title: 'Accueil La Chapelle',
  description:
    'Une maison pour grandir, servir et manifester le Royaume de Dieu.',
  seo_title: 'La Chapelle — Internationale des Élus du Royaume',
  seo_description:
    'Une maison pour grandir, servir et manifester le Royaume de Dieu.',
  og_image: '/images/hero/heros-chapelle.png',
  status: 'published' as const,
  sort_order: 0,
}

/** Destinations documentées (routes WP temporaires à bascule future). */
export const CHAPELLE_WP_ROUTES_TEMP = {
  ressources: 'https://www.chapelleduroyaume.org/ressources/',
  formations: 'https://www.chapelleduroyaume.org/courses/',
  integration: 'https://www.chapelleduroyaume.org/integration/',
  donner: 'https://www.chapelleduroyaume.org/donner/',
  rejoindre: 'https://www.chapelleduroyaume.org/rejoindre/',
  live: 'https://www.chapelleduroyaume.org/live/',
  mentions: 'https://www.chapelleduroyaume.org/mentions-legales/',
  privacy: 'https://www.chapelleduroyaume.org/politique-de-confidentialite/',
} as const

export type ChapelleSectionSeed = {
  page_slug: string
  key: string
  type: string
  title: string
  subtitle?: string | null
  body?: string | null
  image_url?: string | null
  cta_label?: string | null
  cta_href?: string | null
  data: Record<string, unknown>
  sort_order: number
  is_active: boolean
  status: 'published' | 'draft'
}

export const chapelleHomeSectionSeeds: ChapelleSectionSeed[] = [
  {
    page_slug: CHAPELLE_HOME_PAGE_SLUG,
    key: 'header',
    type: 'header',
    title: 'Header',
    image_url: '/images/brand/logo-or-chapelle.png',
    cta_label: 'EN DIRECT',
    cta_href: CHAPELLE_WP_ROUTES_TEMP.live,
    data: {
      logoUrl: '/images/brand/logo-or-chapelle.png',
      logoAlt: 'Chapelle Royale',
      nav: [
        { label: 'Accueil', href: '#accueil', visible: true },
        { label: 'Notre vision', href: '#eglise', visible: true },
        { label: 'Parcours', href: '#parcours', visible: true },
        { label: 'Ressources', href: CHAPELLE_WP_ROUTES_TEMP.ressources, visible: true },
        { label: 'Formations', href: CHAPELLE_WP_ROUTES_TEMP.formations, visible: true },
        { label: 'Intégration', href: CHAPELLE_WP_ROUTES_TEMP.integration, visible: true },
        { label: 'Donner', href: CHAPELLE_WP_ROUTES_TEMP.donner, visible: true },
        { label: 'Contact', href: '#contact', visible: true },
      ],
      ctaLiveLabel: 'EN DIRECT',
      ctaLiveHref: CHAPELLE_WP_ROUTES_TEMP.live,
      ctaJoinLabel: 'Rejoindre Citadelle',
      ctaJoinHref: CHAPELLE_WP_ROUTES_TEMP.rejoindre,
    },
    sort_order: 0,
    is_active: true,
    status: 'published',
  },
  {
    page_slug: CHAPELLE_HOME_PAGE_SLUG,
    key: 'hero',
    type: 'hero',
    title: 'Rejoins une maison',
    subtitle: 'LA CHAPELLE',
    body: 'Une communauté spirituelle mondiale, digitale et missionnaire — ouverte aux nations, ancrée dans la Présence de Dieu.',
    image_url: '/images/hero/heros-chapelle.png',
    cta_label: 'Découvrir La Chapelle',
    cta_href: '#eglise',
    data: {
      imageUrl: '/images/hero/heros-chapelle.png',
      imageAlt: '',
      objectPosition: 'subject-right',
      kicker: 'LA CHAPELLE',
      titleLine1: 'Rejoins une maison',
      titleLine2Prefix: 'qui',
      accentWord: 'bâtit',
      titleLine2Suffix: 'des vies.',
      subtitle:
        'Une communauté spirituelle mondiale, digitale et missionnaire — ouverte aux nations, ancrée dans la Présence de Dieu.',
      ctaPrimaryLabel: 'Découvrir La Chapelle',
      ctaPrimaryHref: '#eglise',
      ctaSecondaryLabel: 'Rejoindre Citadelle',
      ctaSecondaryHref: CHAPELLE_WP_ROUTES_TEMP.rejoindre,
      scheduleLabel: 'Culte de Célébration Royale · Dimanche · 10h30',
    },
    sort_order: 1,
    is_active: true,
    status: 'published',
  },
  {
    page_slug: CHAPELLE_HOME_PAGE_SLUG,
    key: 'vision',
    type: 'vision',
    title: 'Une maison qui forme,',
    subtitle: 'NOTRE VISION',
    body: 'La Chapelle Internationale des Élus du Royaume est une communauté spirituelle appelée à bâtir des hommes et des femmes enracinés dans la Présence de Dieu, affermis dans leur identité et préparés à manifester le Royaume dans chaque sphère de la société.',
    image_url: '/images/vision/reverend-doxa-portrait.png',
    data: {
      portraitUrl: '/images/vision/reverend-doxa-portrait.png',
      portraitAlt: 'Révérend Doxa Salomon, conducteur de La Chapelle',
      kicker: 'NOTRE VISION',
      titleLine1: 'Une maison qui forme,',
      titleLine2Prefix: 'équipe et',
      accentWord: 'envoie',
      titleLine2Suffix: '.',
      body: 'La Chapelle Internationale des Élus du Royaume est une communauté spirituelle appelée à bâtir des hommes et des femmes enracinés dans la Présence de Dieu, affermis dans leur identité et préparés à manifester le Royaume dans chaque sphère de la société.',
      leadershipName: 'Conduite par le Révérend Doxa Salomon',
      leadershipText:
        'Une vision pastorale, prophétique et missionnaire au service de la transformation des vies.',
      pillars: [
        {
          index: '01',
          title: 'Former',
          description:
            'Enraciner chacun dans la Parole, la foi et l’identité du Royaume.',
        },
        {
          index: '02',
          title: 'Équiper',
          description:
            'Développer les dons, la maturité et la capacité de servir.',
        },
        {
          index: '03',
          title: 'Envoyer',
          description:
            'Faire de chaque croyant un témoin, un bâtisseur et une influence.',
        },
      ],
    },
    sort_order: 2,
    is_active: true,
    status: 'published',
  },
  {
    page_slug: CHAPELLE_HOME_PAGE_SLUG,
    key: 'journey',
    type: 'journey',
    title: 'Une place t’',
    subtitle: 'TA PROCHAINE ÉTAPE',
    body: 'Que tu découvres La Chapelle, que tu souhaites rejoindre la communauté ou grandir dans ton appel, Citadelle t’accompagne dans la prochaine étape.',
    data: {
      kicker: 'TA PROCHAINE ÉTAPE',
      titleLine1Prefix: 'Une place t’',
      accentWord: 'attend',
      titleLine2: 'dans cette maison.',
      intro:
        'Que tu découvres La Chapelle, que tu souhaites rejoindre la communauté ou grandir dans ton appel, Citadelle t’accompagne dans la prochaine étape.',
      cards: [
        {
          index: '01',
          title: 'Découvrir',
          description:
            'Prépare ta première visite, découvre la maison et fais-nous savoir que tu es nouveau.',
          ctaLabel: 'Je découvre La Chapelle',
          ctaHref: CHAPELLE_WP_ROUTES_TEMP.integration,
        },
        {
          index: '02',
          title: 'Appartenir',
          description:
            'Crée ton espace, rejoins la communauté, participe aux événements et reste connecté à la vie de La Chapelle.',
          ctaLabel: 'Je rejoins la communauté',
          ctaHref: CHAPELLE_WP_ROUTES_TEMP.rejoindre,
        },
        {
          index: '03',
          title: 'Grandir',
          description:
            'Accède aux parcours, formations et ressources qui t’aideront à progresser dans la foi et le service.',
          ctaLabel: 'Je commence mon parcours',
          ctaHref: CHAPELLE_WP_ROUTES_TEMP.formations,
        },
      ],
    },
    sort_order: 3,
    is_active: true,
    status: 'published',
  },
  {
    page_slug: CHAPELLE_HOME_PAGE_SLUG,
    key: 'contact',
    type: 'contact',
    title: 'Ta place est ici.',
    subtitle: 'NOUS REJOINDRE',
    body: 'Viens vivre un temps de foi, de communion et de transformation avec La Chapelle Internationale des Élus du Royaume.',
    cta_label: 'Rejoindre Citadelle',
    cta_href: CHAPELLE_WP_ROUTES_TEMP.rejoindre,
    data: {
      kicker: 'NOUS REJOINDRE',
      title: 'Ta place est ici.',
      body: 'Viens vivre un temps de foi, de communion et de transformation avec La Chapelle Internationale des Élus du Royaume.',
      address: 'Abidjan, Côte d’Ivoire',
      mapsUrl:
        'https://www.google.com/maps/search/?api=1&query=Abidjan%2C%20C%C3%B4te%20d%27Ivoire',
      email: 'info@chapelleduroyaume.org',
      phone: null,
      schedule: [
        { name: 'Matinale de Prière', detail: 'Lundi · Mercredi · Vendredi · 05h30' },
        { name: 'École du Royaume', detail: 'Mercredi · 19h30' },
        { name: 'Vendredi de Puissance', detail: 'Vendredi · 19h30' },
        { name: 'Culte de Célébration Royale', detail: 'Dimanche · 10h30' },
      ],
      ctaJoinLabel: 'Rejoindre Citadelle',
      ctaJoinHref: CHAPELLE_WP_ROUTES_TEMP.rejoindre,
      ctaLiveLabel: 'Regarder en direct',
      ctaLiveHref: CHAPELLE_WP_ROUTES_TEMP.live,
    },
    sort_order: 4,
    is_active: true,
    status: 'published',
  },
  {
    page_slug: CHAPELLE_HOME_PAGE_SLUG,
    key: 'footer',
    type: 'footer',
    title: 'Chapelle Royale',
    body: 'L’église en ligne au service du Royaume. Une maison spirituelle pour grandir, servir et régner.',
    image_url: '/images/brand/logo-or-chapelle.png',
    data: {
      logoUrl: '/images/brand/logo-or-chapelle.png',
      brandName: 'Chapelle Royale',
      tagline:
        'L’église en ligne au service du Royaume. Une maison spirituelle pour grandir, servir et régner.',
      nav: [
        { label: 'Accueil', href: '#accueil', visible: true },
        { label: 'Notre vision', href: '#eglise', visible: true },
        { label: 'Parcours', href: '#parcours', visible: true },
        { label: 'Contact', href: '#contact', visible: true },
      ],
      useful: [
        { label: 'Citadelle', href: CHAPELLE_WP_ROUTES_TEMP.rejoindre, visible: true },
        { label: 'En direct', href: CHAPELLE_WP_ROUTES_TEMP.live, visible: true },
        { label: 'Donner', href: CHAPELLE_WP_ROUTES_TEMP.donner, visible: true },
      ],
      social: {
        youtube: 'https://www.youtube.com/@ChapelleRoyaleTV',
        facebook: 'https://www.facebook.com/Chapelleduroyaume/',
        instagram: null,
        tiktok: null,
      },
      address: 'Abidjan, Côte d’Ivoire',
      mapsUrl:
        'https://www.google.com/maps/search/?api=1&query=Abidjan%2C%20C%C3%B4te%20d%27Ivoire',
      email: 'info@chapelleduroyaume.org',
      legalMentionsHref: CHAPELLE_WP_ROUTES_TEMP.mentions,
      legalPrivacyHref: CHAPELLE_WP_ROUTES_TEMP.privacy,
      copyrightName: 'La Chapelle Internationale des Élus du Royaume',
    },
    sort_order: 5,
    is_active: true,
    status: 'published',
  },
]

/** Clés de section attendues (ordre d’affichage admin). */
export const CHAPELLE_SECTION_KEYS = [
  'header',
  'hero',
  'vision',
  'journey',
  'contact',
  'footer',
] as const

/**
 * Valide un href éditable admin (aligné lecteur public Chapelle).
 * Interdit javascript:, data:, protocoles non HTTP(S), // proto-relative.
 */
export function isSafeAdminHref(href: string): boolean {
  const h = href.trim()
  if (!h) return false
  if (/^javascript:/i.test(h) || /^data:/i.test(h) || /^vbscript:/i.test(h)) return false
  if (h.startsWith('#') && h.length > 1) return true
  if (h.startsWith('mailto:') || h.startsWith('tel:')) return true
  if (/^https:\/\//i.test(h)) return true
  if (/^http:\/\/localhost/i.test(h)) return true
  if (h.startsWith('/') && !h.startsWith('//')) return true
  return false
}
