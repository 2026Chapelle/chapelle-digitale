export interface EvenementMock {
  id: string
  titre: string
  description: string
  type: 'Culte' | 'Prière' | 'Formation' | 'Conférence' | 'Live' | 'Retraite'
  date: string
  heure: string
  heure_fin?: string
  lieu: string
  en_ligne: boolean
  lien_live?: string
  emoji: string
  couleur: string
  nb_inscrits: number
  capacite?: number
  plateforme?: string
  est_inscrit?: boolean
  est_passe?: boolean
}

export const EVENEMENTS: EvenementMock[] = [
  { id: '1', titre: 'Culte Principal du Dimanche', description: 'Rejoignez-nous pour le culte principal hebdomadaire, un temps de louange, d\'adoration et de la Parole de Dieu.', type: 'Culte', date: '2026-05-11', heure: '10:00', heure_fin: '12:30', lieu: 'En ligne & Présence', en_ligne: true, lien_live: '/live', emoji: '⛪', couleur: '#D4AF37', nb_inscrits: 1247, plateforme: 'CIER Global', est_inscrit: true },
  { id: '2', titre: 'Nuit de Prière — Intercession des Nations', description: 'Une nuit entière consacrée à l\'intercession pour les nations africaines et la diaspora. Venez armé de foi.', type: 'Prière', date: '2026-05-15', heure: '22:00', heure_fin: '04:00', lieu: 'En ligne', en_ligne: true, emoji: '🌙', couleur: '#8B5CF6', nb_inscrits: 456, plateforme: 'Intercession', est_inscrit: false },
  { id: '3', titre: 'Conférence Leadership Chrétien 2026', description: 'Une conférence internationale réunissant des leaders chrétiens africains pour tracer la route du leadership de demain.', type: 'Conférence', date: '2026-05-22', heure: '09:00', heure_fin: '18:00', lieu: 'Paris, France', en_ligne: true, emoji: '👑', couleur: '#D4AF37', nb_inscrits: 892, capacite: 1000, est_inscrit: false },
  { id: '4', titre: 'Formation École de Prière — Session 6', description: 'Session de formation en direct pour les participants de l\'École de Prière. Module : La Prière Corporative.', type: 'Formation', date: '2026-05-17', heure: '15:00', heure_fin: '16:30', lieu: 'Zoom', en_ligne: true, emoji: '📚', couleur: '#0EA5E9', nb_inscrits: 89, est_inscrit: true },
  { id: '5', titre: 'Retraite Spirituelle — Hommes', description: 'Une retraite de 3 jours pour les hommes de la plateforme CIER Hommes. Un temps de ressourcement, de prière et de fraternité.', type: 'Retraite', date: '2026-06-06', heure: '08:00', lieu: 'Abidjan, Côte d\'Ivoire', en_ligne: false, emoji: '⛺', couleur: '#22C55E', nb_inscrits: 67, capacite: 100, plateforme: 'Hommes', est_inscrit: false },
  { id: '6', titre: 'Live Jeunesse — Shout to the Lord', description: 'Soirée de louange et d\'adoration spéciale jeunesse avec des artistes chrétiens contemporains.', type: 'Live', date: '2026-05-18', heure: '19:00', heure_fin: '22:00', lieu: 'En ligne', en_ligne: true, lien_live: '/live', emoji: '🎵', couleur: '#EC4899', nb_inscrits: 312, plateforme: 'Jeunesse', est_inscrit: false },
  { id: '7', titre: 'Culte de Pentecôte', description: 'Célébration spéciale de la Pentecôte avec ministère du Saint-Esprit, témoignages et communion fraternelle.', type: 'Culte', date: '2026-06-08', heure: '10:00', heure_fin: '13:00', lieu: 'En ligne & Présence', en_ligne: true, emoji: '🕊️', couleur: '#F59E0B', nb_inscrits: 1089, est_inscrit: false },
  { id: '8', titre: 'Groupe de Prière Femmes', description: 'Rassemblement hebdomadaire des femmes de la plateforme pour la prière, le partage et l\'encouragement mutuel.', type: 'Prière', date: '2026-05-09', heure: '20:00', heure_fin: '21:30', lieu: 'WhatsApp / Zoom', en_ligne: true, emoji: '🌸', couleur: '#EC4899', nb_inscrits: 234, plateforme: 'Femmes Exceptions', est_inscrit: true, est_passe: true },
]
