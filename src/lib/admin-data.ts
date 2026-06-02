/**
 * ADMIN DATA — accès aux données des modules back-office.
 *
 * MOCK déterministe pour l'instant. Architecture cible Supabase :
 *   - Formulaires → table `form_submissions(id, source, stage, prenom, email, telephone, message, status, created_at)`
 *   - Médias      → table `media(id, type, title, platform, status, duration, published_at)` + Supabase Storage
 *   - Contenu     → table `content(id, type, title, slug, status, author, updated_at)`
 *
 * Chaque accesseur renvoie un tableau typé ; brancher Supabase consistera à
 * remplacer le corps par une requête `supabase.from(...).select(...)`.
 */

export type FormStatus = 'nouveau' | 'en_cours' | 'traite'
export interface FormSubmission {
  id: string
  source: string
  stage: string
  prenom: string
  email: string
  telephone?: string
  message?: string
  status: FormStatus
  date: string
}

export type MediaType = 'video' | 'audio' | 'image' | 'live'
export type MediaStatus = 'publie' | 'brouillon' | 'planifie'
export interface MediaItem {
  id: string
  type: MediaType
  titre: string
  plateforme: string
  duree?: string
  vues: number
  status: MediaStatus
  date: string
}

export type ContentType = 'page' | 'article' | 'temoignage' | 'verset' | 'annonce'
export type ContentStatus = 'publie' | 'brouillon' | 'planifie'
export interface ContentItem {
  id: string
  type: ContentType
  titre: string
  slug: string
  auteur: string
  status: ContentStatus
  maj: string
}

export function getFormSubmissions(): FormSubmission[] {
  return [
    { id: 'f-1042', source: 'integration', stage: 'integration', prenom: 'Amandine', email: 'amandine.k@email.com', telephone: '+33 6 12 34 56 78', message: 'Comment rejoindre une cellule à Paris ?', status: 'nouveau', date: '29 mai · 09:12' },
    { id: 'f-1041', source: 'servir', stage: 'serviteur', prenom: 'Fatou', email: 'fatou.d@email.com', telephone: '+221 77 123 45 67', message: "Je veux rejoindre l'équipe louange.", status: 'nouveau', date: '29 mai · 08:40' },
    { id: 'f-1040', source: 'partenaires', stage: 'leader', prenom: 'Samuel', email: 'samuel.o@email.com', message: 'Intéressé par le parcours leadership.', status: 'en_cours', date: '28 mai · 21:05' },
    { id: 'f-1039', source: 'rejoindre', stage: 'contact', prenom: 'Grâce', email: 'grace.n@email.com', telephone: '+243 81 222 33 44', message: 'Première visite, je suis touchée.', status: 'en_cours', date: '28 mai · 18:30' },
    { id: 'f-1038', source: 'contact', stage: 'contact', prenom: 'Jean-Pierre', email: 'jp.m@email.com', message: 'Besoin de prière pour ma famille.', status: 'traite', date: '28 mai · 14:22' },
    { id: 'f-1037', source: 'integration', stage: 'integration', prenom: 'Esther', email: 'esther.b@email.com', telephone: '+32 470 11 22 33', status: 'traite', date: '27 mai · 11:48' },
    { id: 'f-1036', source: 'servir', stage: 'serviteur', prenom: 'David', email: 'david.m@email.com', message: 'Disponible pour le média et le streaming.', status: 'traite', date: '27 mai · 10:03' },
  ]
}

export function getMediaItems(): MediaItem[] {
  return [
    { id: 'm-301', type: 'live', titre: 'Culte du Dimanche — 25 mai', plateforme: 'CIER', duree: '1h52', vues: 2847, status: 'publie', date: '25 mai' },
    { id: 'm-300', type: 'video', titre: 'Enseignement : Marcher par la foi', plateforme: 'CFIC', duree: '38min', vues: 1240, status: 'publie', date: '24 mai' },
    { id: 'm-299', type: 'audio', titre: 'Podcast — Fondements #12', plateforme: 'Podcast', duree: '27min', vues: 860, status: 'publie', date: '22 mai' },
    { id: 'm-298', type: 'video', titre: 'Témoignage de Fatou (Sénégal)', plateforme: 'Témoignages', duree: '6min', vues: 540, status: 'publie', date: '21 mai' },
    { id: 'm-297', type: 'live', titre: 'Veillée de prière Mahanaïm', plateforme: 'Mahanaïm', duree: '2h10', vues: 0, status: 'planifie', date: '31 mai' },
    { id: 'm-296', type: 'image', titre: 'Visuel série « Charbon & Lumière »', plateforme: 'CIER', vues: 0, status: 'brouillon', date: '20 mai' },
    { id: 'm-295', type: 'video', titre: 'École de Prière — Module 6', plateforme: 'CFIC', duree: '45min', vues: 312, status: 'brouillon', date: '19 mai' },
  ]
}

export function getContentItems(): ContentItem[] {
  return [
    { id: 'c-210', type: 'page', titre: 'Le Parcours du Royaume', slug: '/parcours', auteur: 'Équipe', status: 'publie', maj: 'Aujourd’hui' },
    { id: 'c-209', type: 'page', titre: 'Intégration', slug: '/integration', auteur: 'Équipe', status: 'publie', maj: 'Aujourd’hui' },
    { id: 'c-208', type: 'annonce', titre: 'Convention annuelle 2026', slug: '/annonces/convention-2026', auteur: 'Pasteur', status: 'planifie', maj: 'Hier' },
    { id: 'c-207', type: 'article', titre: '5 clés pour une vie de prière', slug: '/blog/cles-priere', auteur: 'M. Diallo', status: 'publie', maj: '27 mai' },
    { id: 'c-206', type: 'temoignage', titre: 'Délivrance & restauration — Samuel', slug: '/temoignages/samuel', auteur: 'Modération', status: 'brouillon', maj: '26 mai' },
    { id: 'c-205', type: 'verset', titre: 'Verset du jour — Jérémie 29:11', slug: '/verset/jour', auteur: 'Auto', status: 'publie', maj: '29 mai' },
    { id: 'c-204', type: 'page', titre: 'Servir', slug: '/servir', auteur: 'Équipe', status: 'publie', maj: 'Aujourd’hui' },
  ]
}
