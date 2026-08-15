/**
 * DONNÉES DE DÉMONSTRATION — Lot V2.1B (UI / mock uniquement).
 *
 * ⚠️ AUCUNE de ces données n'est réelle, ni lue ni écrite en base. Aucune
 * connexion Supabase. Ce module sert uniquement à alimenter l'interface de
 * prévisualisation du CRM « nouveaux venus » (super admin superviseur).
 *
 * Territoire pastoral : un pasteur couvre PLUSIEURS pays ; chaque nouveau venu
 * a un pays de résidence, une zone pastorale et un pasteur responsable (simulé).
 * La progression réelle (statut, écriture, connexion) est réservée à V2.1C/D.
 */

export type StatutNV =
  | 'nouveau' | 'a_contacter' | 'contacte' | 'en_attente'
  | 'integre' | 'bapteme' | 'cellule' | 'formation' | 'archive'

export type SourceNV =
  | 'dimanche' | 'live' | 'whatsapp' | 'youtube' | 'invitation' | 'evenement' | 'autre'

export const STATUTS: { value: StatutNV; label: string; color: string }[] = [
  { value: 'nouveau', label: 'Nouveau', color: '#0EA5E9' },
  { value: 'a_contacter', label: 'À contacter', color: '#F59E0B' },
  { value: 'contacte', label: 'Contacté', color: '#8B5CF6' },
  { value: 'en_attente', label: 'En attente', color: '#EAB308' },
  { value: 'integre', label: 'Intégré', color: '#22C55E' },
  { value: 'bapteme', label: 'Baptême', color: '#14B8A6' },
  { value: 'cellule', label: 'Cellule', color: '#A855F7' },
  { value: 'formation', label: 'Formation', color: '#EC4899' },
  { value: 'archive', label: 'Archivé', color: '#6B7280' },
]

export const SOURCES: { value: SourceNV; label: string }[] = [
  { value: 'dimanche', label: 'Culte du dimanche' },
  { value: 'live', label: 'Live / streaming' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'invitation', label: "Invitation d'un ami" },
  { value: 'evenement', label: 'Événement' },
  { value: 'autre', label: 'Autre' },
]

export const STATUT_LABEL: Record<StatutNV, string> =
  Object.fromEntries(STATUTS.map((s) => [s.value, s.label])) as Record<StatutNV, string>
export const STATUT_COLOR: Record<StatutNV, string> =
  Object.fromEntries(STATUTS.map((s) => [s.value, s.color])) as Record<StatutNV, string>
export const SOURCE_LABEL: Record<SourceNV, string> =
  Object.fromEntries(SOURCES.map((s) => [s.value, s.label])) as Record<SourceNV, string>

/** Un pasteur = un territoire couvrant plusieurs pays (démo). */
export interface PasteurTerritoire { nom: string; zone: string; pays: string[] }
export const PASTEURS: PasteurTerritoire[] = [
  { nom: 'Pasteur Emmanuel', zone: "Afrique de l'Ouest", pays: ["Côte d'Ivoire", 'Sénégal', 'Mali', 'Togo'] },
  { nom: 'Pasteur Grâce', zone: 'Afrique Centrale', pays: ['RD Congo', 'Congo', 'Gabon', 'Cameroun'] },
  { nom: 'Pasteur David', zone: 'Europe francophone', pays: ['France', 'Belgique', 'Suisse'] },
  { nom: 'Pasteur Sarah', zone: 'Amérique du Nord', pays: ['Canada', 'États-Unis'] },
]

export interface NouveauVenu {
  id: string
  prenom: string
  nom: string
  telephone: string
  email: string | null
  source: SourceNV
  statut: StatutNV
  pays_residence: string
  zone_pastorale: string
  pasteur_responsable: string
  urgent: boolean
  date: string // ISO — démo
}

/** Jeu de démonstration (fictif). */
export const MOCK_NOUVEAUX_VENUS: NouveauVenu[] = [
  { id: 'nv-001', prenom: 'Kévin', nom: 'Assalé', telephone: '+225 07 00 00 01', email: 'kevin.demo@example.com', source: 'dimanche', statut: 'nouveau', pays_residence: "Côte d'Ivoire", zone_pastorale: "Afrique de l'Ouest", pasteur_responsable: 'Pasteur Emmanuel', urgent: false, date: '2026-07-01' },
  { id: 'nv-002', prenom: 'Awa', nom: 'Diallo', telephone: '+221 77 00 00 02', email: null, source: 'live', statut: 'a_contacter', pays_residence: 'Sénégal', zone_pastorale: "Afrique de l'Ouest", pasteur_responsable: 'Pasteur Emmanuel', urgent: true, date: '2026-07-02' },
  { id: 'nv-003', prenom: 'Jonathan', nom: 'Mbala', telephone: '+243 81 00 00 03', email: 'jonathan.demo@example.com', source: 'whatsapp', statut: 'contacte', pays_residence: 'RD Congo', zone_pastorale: 'Afrique Centrale', pasteur_responsable: 'Pasteur Grâce', urgent: false, date: '2026-07-03' },
  { id: 'nv-004', prenom: 'Esther', nom: 'Ngoma', telephone: '+242 06 00 00 04', email: 'esther.demo@example.com', source: 'youtube', statut: 'en_attente', pays_residence: 'Congo', zone_pastorale: 'Afrique Centrale', pasteur_responsable: 'Pasteur Grâce', urgent: true, date: '2026-07-03' },
  { id: 'nv-005', prenom: 'Marie', nom: 'Dupont', telephone: '+33 6 00 00 00 05', email: 'marie.demo@example.com', source: 'invitation', statut: 'integre', pays_residence: 'France', zone_pastorale: 'Europe francophone', pasteur_responsable: 'Pasteur David', urgent: false, date: '2026-07-04' },
  { id: 'nv-006', prenom: 'Luc', nom: 'Bernard', telephone: '+32 4 00 00 00 06', email: null, source: 'evenement', statut: 'formation', pays_residence: 'Belgique', zone_pastorale: 'Europe francophone', pasteur_responsable: 'Pasteur David', urgent: false, date: '2026-07-04' },
  { id: 'nv-007', prenom: 'Sarah', nom: 'Tremblay', telephone: '+1 514 000 00 07', email: 'sarah.demo@example.com', source: 'youtube', statut: 'cellule', pays_residence: 'Canada', zone_pastorale: 'Amérique du Nord', pasteur_responsable: 'Pasteur Sarah', urgent: false, date: '2026-07-05' },
  { id: 'nv-008', prenom: 'Emmanuel', nom: 'Koffi', telephone: '+228 90 00 00 08', email: 'emmanuel.demo@example.com', source: 'dimanche', statut: 'bapteme', pays_residence: 'Togo', zone_pastorale: "Afrique de l'Ouest", pasteur_responsable: 'Pasteur Emmanuel', urgent: false, date: '2026-07-05' },
  { id: 'nv-009', prenom: 'Grâce', nom: 'Eyenga', telephone: '+237 6 00 00 00 09', email: null, source: 'whatsapp', statut: 'a_contacter', pays_residence: 'Cameroun', zone_pastorale: 'Afrique Centrale', pasteur_responsable: 'Pasteur Grâce', urgent: true, date: '2026-07-06' },
  { id: 'nv-010', prenom: 'Daniel', nom: 'Martin', telephone: '+41 79 000 00 10', email: 'daniel.demo@example.com', source: 'autre', statut: 'nouveau', pays_residence: 'Suisse', zone_pastorale: 'Europe francophone', pasteur_responsable: 'Pasteur David', urgent: false, date: '2026-07-06' },
]

/** Liste des pays présents dans le mock (pour le filtre territoire). */
export const PAYS_MOCK: string[] = Array.from(new Set(MOCK_NOUVEAUX_VENUS.map((n) => n.pays_residence))).sort()

export interface NvStats {
  ce_mois: number
  a_contacter: number
  integres: number
  suivis_urgents: number
  membres_actifs: number
}

/** Statistiques dérivées du mock (cohérentes avec la table). Valeurs de démo. */
export function mockStats(list: NouveauVenu[] = MOCK_NOUVEAUX_VENUS): NvStats {
  return {
    ce_mois: list.length,
    a_contacter: list.filter((n) => n.statut === 'a_contacter').length,
    integres: list.filter((n) => n.statut === 'integre').length,
    suivis_urgents: list.filter((n) => n.urgent).length,
    membres_actifs: 128, // valeur de démonstration
  }
}
