export interface MembreMock {
  id: string
  prenom: string
  nom: string
  email: string
  pays: string
  ville?: string
  plateforme: string
  role: 'visiteur' | 'membre' | 'disciple' | 'serviteur' | 'leader' | 'pasteur' | 'admin'
  statut: 'actif' | 'inactif' | 'suspendu'
  score_engagement: number
  etape_parcours: number
  date_inscription: string
  avatar?: string
  formations_suivies: number
  prieres_soumises: number
}

export const MEMBRES: MembreMock[] = [
  { id: '1', prenom: 'Jean', nom: 'Dupont', email: 'jean.dupont@email.com', pays: 'France', ville: 'Paris', plateforme: 'CIER Global', role: 'disciple', statut: 'actif', score_engagement: 72, etape_parcours: 3, date_inscription: '2026-01-15', formations_suivies: 4, prieres_soumises: 23 },
  { id: '2', prenom: 'Grâce', nom: 'Mbeki', email: 'grace.mbeki@email.com', pays: 'Belgique', ville: 'Bruxelles', plateforme: 'Femmes Exceptions', role: 'leader', statut: 'actif', score_engagement: 91, etape_parcours: 6, date_inscription: '2025-08-20', formations_suivies: 8, prieres_soumises: 67 },
  { id: '3', prenom: 'Samuel', nom: 'Koné', email: 'samuel.kone@email.com', pays: 'Côte d\'Ivoire', ville: 'Abidjan', plateforme: 'Jeunesse', role: 'membre', statut: 'actif', score_engagement: 45, etape_parcours: 2, date_inscription: '2026-03-01', formations_suivies: 2, prieres_soumises: 8 },
  { id: '4', prenom: 'Rachel', nom: 'Nzinga', email: 'rachel.nzinga@email.com', pays: 'RDC', ville: 'Kinshasa', plateforme: 'Académie', role: 'serviteur', statut: 'actif', score_engagement: 84, etape_parcours: 5, date_inscription: '2025-11-10', formations_suivies: 6, prieres_soumises: 45 },
  { id: '5', prenom: 'Pierre', nom: 'Atangana', email: 'pierre.atangana@email.com', pays: 'Cameroun', ville: 'Douala', plateforme: 'Hommes', role: 'disciple', statut: 'actif', score_engagement: 58, etape_parcours: 3, date_inscription: '2026-02-14', formations_suivies: 3, prieres_soumises: 15 },
  { id: '6', prenom: 'Esther', nom: 'Diallo', email: 'esther.diallo@email.com', pays: 'Sénégal', ville: 'Dakar', plateforme: 'Famille', role: 'membre', statut: 'inactif', score_engagement: 22, etape_parcours: 1, date_inscription: '2026-04-05', formations_suivies: 1, prieres_soumises: 3 },
  { id: '7', prenom: 'David', nom: 'Osei', email: 'david.osei@email.com', pays: 'Ghana', ville: 'Accra', plateforme: 'Intercession', role: 'leader', statut: 'actif', score_engagement: 96, etape_parcours: 7, date_inscription: '2025-05-20', formations_suivies: 12, prieres_soumises: 189 },
  { id: '8', prenom: 'Marie', nom: 'Tchamba', email: 'marie.tchamba@email.com', pays: 'Canada', ville: 'Montréal', plateforme: 'CIER Global', role: 'disciple', statut: 'actif', score_engagement: 67, etape_parcours: 4, date_inscription: '2025-12-01', formations_suivies: 5, prieres_soumises: 34 },
]
