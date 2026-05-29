export type CategoriePriere = 'Famille' | 'Mariage' | 'Santé' | 'Finances' | 'Travail' | 'Délivrance' | 'Nation' | 'Spirituel' | 'Autre'

export interface PriereMock {
  id: string
  sujet: string
  description: string
  categorie: CategoriePriere
  date: string
  statut: 'active' | 'exaucée' | 'archivée'
  nb_priants: number
  is_urgente: boolean
  is_anonyme: boolean
  auteur?: string
  temoignage?: string
}

export const CATEGORIES_PRIERE: { label: CategoriePriere; emoji: string; couleur: string }[] = [
  { label: 'Famille', emoji: '👨‍👩‍👧‍👦', couleur: '#22C55E' },
  { label: 'Mariage', emoji: '💑', couleur: '#EC4899' },
  { label: 'Santé', emoji: '❤️‍🩹', couleur: '#EF4444' },
  { label: 'Finances', emoji: '💰', couleur: '#F59E0B' },
  { label: 'Travail', emoji: '💼', couleur: '#0EA5E9' },
  { label: 'Délivrance', emoji: '⛓️', couleur: '#8B5CF6' },
  { label: 'Nation', emoji: '🌍', couleur: '#D4AF37' },
  { label: 'Spirituel', emoji: '🙏', couleur: '#6366F1' },
  { label: 'Autre', emoji: '✨', couleur: '#64748B' },
]

export const MES_PRIERES: PriereMock[] = [
  { id: '1', sujet: 'Guérison de ma mère', description: 'Ma mère souffre d\'une maladie grave depuis 3 mois. Je crois en la guérison de Dieu et sollicite vos prières pour sa complète restauration.', categorie: 'Santé', date: '2026-05-01', statut: 'active', nb_priants: 127, is_urgente: true, is_anonyme: false, auteur: 'Jean D.' },
  { id: '2', sujet: 'Emploi et provision', description: 'Je cherche un emploi depuis 6 mois. Priez pour que Dieu ouvre les bonnes portes et pourvoit à mes besoins financiers.', categorie: 'Finances', date: '2026-04-15', statut: 'exaucée', nb_priants: 89, is_urgente: false, is_anonyme: false, auteur: 'Jean D.', temoignage: 'Dieu a répondu ! J\'ai trouvé un emploi la semaine dernière. Gloire à Dieu !' },
  { id: '3', sujet: 'Restauration de mon mariage', description: 'Mon couple traverse une période difficile. Priez pour la réconciliation, la paix et la restauration de notre foyer.', categorie: 'Mariage', date: '2026-04-28', statut: 'active', nb_priants: 234, is_urgente: false, is_anonyme: true },
  { id: '4', sujet: 'Protection durant mes voyages', description: 'Je voyage beaucoup pour le travail en Afrique de l\'Ouest. Priez pour ma protection et le bon déroulement de mes missions.', categorie: 'Travail', date: '2026-05-07', statut: 'active', nb_priants: 45, is_urgente: false, is_anonyme: false, auteur: 'Jean D.' },
]

export const PRIERES_COMMUNAUTE: PriereMock[] = [
  { id: '5', sujet: 'Paix en RDC', description: 'Intercédons pour la paix en République Démocratique du Congo et la protection des civils.', categorie: 'Nation', date: '2026-05-08', statut: 'active', nb_priants: 1089, is_urgente: true, is_anonyme: false, auteur: 'CIER Intercession' },
  { id: '6', sujet: 'Réunification familiale', description: 'Séparé de ma famille en Europe depuis 2 ans. Priez pour la réunification et les démarches administratives.', categorie: 'Famille', date: '2026-05-06', statut: 'active', nb_priants: 67, is_urgente: false, is_anonyme: false, auteur: 'Anonyme' },
  { id: '7', sujet: 'Délivrance et libération', description: 'Je lutte contre des liens spirituels depuis des années. Priez pour ma délivrance complète au nom de Jésus.', categorie: 'Délivrance', date: '2026-05-05', statut: 'active', nb_priants: 312, is_urgente: true, is_anonyme: true },
]
