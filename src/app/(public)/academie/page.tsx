import { redirect } from 'next/navigation'

/**
 * L'Académie des Élus n'est PAS une plateforme séparée : elle vit dans le
 * parcours de croissance existant, sous « Mes Formations ». Toute arrivée sur
 * /academie est redirigée vers l'espace membre (un seul parcours cohérent).
 */
export default function AcademieIndexRedirect() {
  redirect('/member/dashboard/formations')
}
