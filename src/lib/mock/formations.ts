export interface FormationMock {
  id: string
  slug: string
  titre: string
  description: string
  categorie: string
  duree: string
  nb_modules: number
  niveau: 'Débutant' | 'Intermédiaire' | 'Avancé'
  instructeur: string
  emoji: string
  couleur: string
  tags: string[]
  progression?: number
  statut?: 'non_commencé' | 'en_cours' | 'terminé'
  certifie: boolean
  nb_membres: number
}

export const FORMATIONS: FormationMock[] = [
  { id: '1', slug: 'ecole-de-priere', titre: 'École de Prière', description: 'Apprenez à développer une vie de prière profonde et efficace. Ce parcours transformera votre relation avec Dieu à travers des techniques bibliques et des exercices pratiques.', categorie: 'Prière', duree: '8 semaines', nb_modules: 8, niveau: 'Débutant', instructeur: 'Rév. Emmanuel Nkosi', emoji: '🙏', couleur: '#0EA5E9', tags: ['Prière', 'Disciple', 'Spiritualité'], progression: 65, statut: 'en_cours', certifie: true, nb_membres: 342 },
  { id: '2', slug: 'leader-de-demain', titre: 'Leader de Demain', description: 'Formation complète pour développer votre potentiel de leader selon les principes bibliques. Apprenez à influencer, inspirer et diriger avec intégrité.', categorie: 'Leadership', duree: '12 semaines', nb_modules: 12, niveau: 'Intermédiaire', instructeur: 'Rév. Marie-Claire Mbeki', emoji: '👑', couleur: '#D4AF37', tags: ['Leadership', 'Ministère', 'Caractère'], progression: 30, statut: 'en_cours', certifie: true, nb_membres: 218 },
  { id: '3', slug: 'fondements-de-la-foi', titre: 'Fondements de la Foi', description: 'Les bases doctrinales essentielles pour tout croyant. Une formation solide sur la Bible, la théologie et la vie chrétienne.', categorie: 'Doctrine', duree: '6 semaines', nb_modules: 6, niveau: 'Débutant', instructeur: 'Rév. Paul Ngamba', emoji: '📖', couleur: '#22C55E', tags: ['Bible', 'Doctrine', 'Foi'], progression: 100, statut: 'terminé', certifie: true, nb_membres: 567 },
  { id: '4', slug: 'intercession-prophetique', titre: 'Intercession Prophétique', description: 'Entrez dans la dimension prophétique de la prière et apprenez à intercéder pour les nations, les familles et les ministères.', categorie: 'Intercession', duree: '10 semaines', nb_modules: 10, niveau: 'Avancé', instructeur: 'Prophète Samuel Aboah', emoji: '🔥', couleur: '#EF4444', tags: ['Prophétique', 'Intercession', 'Nations'], statut: 'non_commencé', certifie: true, nb_membres: 189 },
  { id: '5', slug: 'mariage-et-famille', titre: 'Mariage & Famille Selon Dieu', description: 'Construire un foyer solide sur des fondements bibliques. Formation pratique pour les couples et les familles.', categorie: 'Famille', duree: '8 semaines', nb_modules: 9, niveau: 'Intermédiaire', instructeur: 'Pasteur Daniel & Ruth Koné', emoji: '💑', couleur: '#EC4899', tags: ['Mariage', 'Famille', 'Couple'], statut: 'non_commencé', certifie: false, nb_membres: 298 },
  { id: '6', slug: 'finance-et-stewardship', titre: 'Finance & Intendance', description: 'Gérez vos finances selon les principes bibliques et découvrez comment honorer Dieu et prospérer selon Sa volonté.', categorie: 'Finances', duree: '5 semaines', nb_modules: 5, niveau: 'Débutant', instructeur: 'Frère Jonas Tchamba', emoji: '💰', couleur: '#F59E0B', tags: ['Finances', 'Dîme', 'Prospérité'], statut: 'non_commencé', certifie: false, nb_membres: 423 },
  { id: '7', slug: 'evangelisation-et-missions', titre: 'Évangélisation & Missions', description: 'Comment porter l\'Évangile à votre entourage et aux nations. Stratégies bibliques et pratiques pour témoigner efficacement.', categorie: 'Missions', duree: '7 semaines', nb_modules: 7, niveau: 'Intermédiaire', instructeur: 'Évangéliste Grace Osei', emoji: '🌍', couleur: '#8B5CF6', tags: ['Missions', 'Évangélisation', 'Nations'], statut: 'non_commencé', certifie: true, nb_membres: 156 },
]

export const MODULES_ECOLE_PRIERE = [
  { id: '1', titre: 'Introduction à la Prière', duree: '45 min', termine: true },
  { id: '2', titre: 'Les Fondements Bibliques', duree: '60 min', termine: true },
  { id: '3', titre: 'Les Types de Prière', duree: '50 min', termine: true },
  { id: '4', titre: 'La Prière de Jeûne', duree: '55 min', termine: true },
  { id: '5', titre: 'Prier avec la Parole', duree: '50 min', termine: true },
  { id: '6', titre: 'La Prière Corporative', duree: '45 min', termine: false, actuel: true },
  { id: '7', titre: 'La Guerre Spirituelle', duree: '70 min', termine: false },
  { id: '8', titre: 'Devenir un Intercesseur', duree: '60 min', termine: false },
]
