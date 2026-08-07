import { HomeSections } from '@/components/sections/HomeSections'

/**
 * Accès technique TEMPORAIRE à la Home V3 pendant l'ouverture publique
 * (09 août 2026) : la racine `/` sert alors la page d'ouverture (rewrite dans
 * next.config.js). Cette route réutilise le composant `HomeSections` — aucune
 * copie de contenu, aucune divergence possible avec la vraie home. `noindex`
 * pour ne pas être référencée. À SUPPRIMER avec le rewrite après la campagne :
 * `/` redevient alors la Home V3 et cette route n'a plus lieu d'être.
 */
export const revalidate = 3600

export const metadata = {
  title: 'Citadelle — Accueil (aperçu technique)',
  robots: { index: false, follow: false },
}

export default function AccueilPreview() {
  return <HomeSections />
}
