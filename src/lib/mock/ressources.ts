export interface RessourceMock {
  id: string
  titre: string
  description: string
  type: 'Audio' | 'Vidéo' | 'PDF' | 'Livre' | 'Podcast' | 'Dévotionnel'
  categorie: string
  auteur: string
  duree?: string
  nb_pages?: number
  emoji: string
  couleur: string
  date_ajout: string
  is_premium: boolean
  is_favori?: boolean
  nb_telechargements: number
  url?: string
}

export const RESSOURCES: RessourceMock[] = [
  { id: '1', titre: 'Prédication : La Puissance de l\'Amour', description: 'Un message puissant sur l\'amour de Dieu comme fondement de toute vie chrétienne.', type: 'Audio', categorie: 'Prédication', auteur: 'Rév. Emmanuel Nkosi', duree: '58 min', emoji: '🎙️', couleur: '#0EA5E9', date_ajout: '2026-05-05', is_premium: false, nb_telechargements: 1243 },
  { id: '2', titre: 'Guide de Prière — 21 Jours', description: 'Un guide complet pour un jeûne et une prière de 21 jours. Inclut des thèmes quotidiens, des versets et des sujets de prière.', type: 'PDF', categorie: 'Prière', auteur: 'CIER Editorial', nb_pages: 45, emoji: '📄', couleur: '#22C55E', date_ajout: '2026-04-20', is_premium: false, nb_telechargements: 3421, is_favori: true },
  { id: '3', titre: 'Culte du Dimanche 04 Mai 2026', description: 'Replay complet du culte principal : louange, adoration et message de la Parole.', type: 'Vidéo', categorie: 'Culte', auteur: 'CIER Global', duree: '2h 15min', emoji: '🎬', couleur: '#D4AF37', date_ajout: '2026-05-04', is_premium: false, nb_telechargements: 892 },
  { id: '4', titre: 'Livre : Fondations Royales', description: 'Un ouvrage de référence sur les fondements de la foi chrétienne. 12 chapitres essentiels pour chaque croyant.', type: 'Livre', categorie: 'Doctrine', auteur: 'Pasteur Paul Ngamba', nb_pages: 248, emoji: '📚', couleur: '#8B5CF6', date_ajout: '2026-03-15', is_premium: true, nb_telechargements: 567 },
  { id: '5', titre: 'Podcast : Leaders d\'Impact — Épisode 12', description: 'Discussion sur le leadership serviteur et comment influencer positivement votre sphère d\'influence.', type: 'Podcast', categorie: 'Leadership', auteur: 'Marie-Claire Mbeki', duree: '42 min', emoji: '🎧', couleur: '#F59E0B', date_ajout: '2026-05-02', is_premium: false, nb_telechargements: 345, is_favori: true },
  { id: '6', titre: 'Dévotionnel Quotidien — Mai 2026', description: '31 dévotions quotidiennes pour le mois de mai. Méditations, versets clés et prières du matin.', type: 'Dévotionnel', categorie: 'Dévotionnel', auteur: 'CIER Editorial', nb_pages: 62, emoji: '📔', couleur: '#EC4899', date_ajout: '2026-05-01', is_premium: false, nb_telechargements: 2108, is_favori: false },
  { id: '7', titre: 'Formation Complète : École de Prière', description: 'Accès à l\'intégralité des 8 modules de l\'École de Prière en format vidéo HD.', type: 'Vidéo', categorie: 'Formation', auteur: 'Rév. Emmanuel Nkosi', duree: '7h 30min', emoji: '🎬', couleur: '#0EA5E9', date_ajout: '2026-04-01', is_premium: true, nb_telechargements: 234 },
  { id: '8', titre: 'Guide Mariage Chrétien', description: 'Principes bibliques pour construire un mariage épanouissant et honorer Dieu dans votre foyer.', type: 'PDF', categorie: 'Famille', auteur: 'Pasteur Daniel & Ruth Koné', nb_pages: 78, emoji: '💑', couleur: '#EC4899', date_ajout: '2026-04-10', is_premium: true, nb_telechargements: 456 },
]
