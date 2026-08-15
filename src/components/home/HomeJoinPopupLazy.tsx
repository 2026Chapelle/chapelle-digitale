'use client'
import dynamic from 'next/dynamic'

/**
 * V2.10-A perf : le popup première visite ne rend AUCUN DOM avant 25 s (`if (!open) return null`).
 * On sort donc son JS du bundle initial de l'accueil via un import dynamique (ssr:false) — chargé
 * uniquement côté client, sans impact SSR ni CLS. Comportement identique (ouverture à 25 s).
 */
const HomeJoinPopup = dynamic(
  () => import('./HomeJoinPopup').then((m) => m.HomeJoinPopup),
  { ssr: false },
)

export function HomeJoinPopupLazy() {
  return <HomeJoinPopup />
}
