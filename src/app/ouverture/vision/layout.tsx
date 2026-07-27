import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

/**
 * Chrome public de /ouverture/vision.
 *
 * La campagne vit hors du groupe `(public)` pour que `/ouverture` puisse être
 * totalement immersive (ni header, ni navbar, ni footer, ni newsletter).
 * Ce layout local rend au seul sous-chemin `vision` exactement le même chrome
 * que `src/app/(public)/layout.tsx` — mêmes composants `Navbar` et `Footer`,
 * même conteneur `<main id="main-content">` visé par le lien d'évitement.
 *
 * Le layout public global reste inchangé : aucune autre page n'est affectée.
 */
export default function OuvertureVisionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
    </>
  )
}
