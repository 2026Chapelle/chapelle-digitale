'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'
import { ParcoursFormationsManager } from '@/components/features/admin/ParcoursFormationsManager'

const CATEGORIES = [
  { value: 'conversion', label: 'Nouveau converti' },
  { value: 'priere', label: 'Vie de prière' },
  { value: 'saint_esprit', label: 'Saint-Esprit' },
  { value: 'discipulat', label: 'Discipulat' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'ministere', label: 'Ministère' },
  { value: 'famille', label: 'Mariage & Famille' },
  { value: 'finances', label: 'Finances du Royaume' },
]
const ETAPES = [
  { value: 'visiteur', label: 'Visiteur' },
  { value: 'converti', label: 'Converti' },
  { value: 'membre', label: 'Membre' },
  { value: 'disciple', label: 'Disciple' },
  { value: 'serviteur', label: 'Serviteur' },
  { value: 'responsable', label: 'Responsable' },
  { value: 'envoye', label: 'Envoyé' },
]
const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

export default function AdminParcoursPage() {
  return (
    <>
    <CmsManager
      apiBase="/api/admin/lms"
      resource="parcours"
      previewable={true}
      itemLabel="parcours"
      title={<>Parcours de <span className="text-cinematic-gold">transformation</span></>}
      description="Parcours du tunnel Visiteur → Envoyé. Regroupez plusieurs formations par étape spirituelle."
      statusField="status"
      fields={[
        { name: 'titre', label: 'Titre', required: true },
        { name: 'slug', label: 'Slug (URL)', required: true, placeholder: 'vie-de-priere' },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'categorie', label: 'Catégorie', type: 'select', options: CATEGORIES, default: 'discipulat' },
        { name: 'etape_tunnel', label: 'Étape du tunnel', type: 'select', options: ETAPES, default: 'membre' },
        { name: 'cover_url', label: 'Image de couverture', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'langue', label: 'Langue', default: 'fr', hideInTable: true },
        { name: 'ordre', label: 'Ordre', type: 'number', default: 0 },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'published' },
      ]}
    />
    <ParcoursFormationsManager />
    </>
  )
}
