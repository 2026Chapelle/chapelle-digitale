'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const NIVEAUX = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
  { value: 'expert', label: 'Expert' },
]
const TYPES = [
  { value: 'cours', label: 'Cours' },
  { value: 'atelier', label: 'Atelier' },
  { value: 'certification', label: 'Certification' },
  { value: 'parcours', label: 'Parcours' },
  { value: 'masterclass', label: 'Masterclass' },
]
const STATUTS = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'publie', label: 'Publié' },
  { value: 'archive', label: 'Archivé' },
]

export default function AdminFormationsPage() {
  return (
    <CmsManager
      apiBase="/api/admin/lms"
      resource="formations"
      previewable={false}
      itemLabel="formation"
      title={<>Formations <span className="text-cinematic-gold">(LMS)</span></>}
      description="Créez les formations, puis ajoutez-leur des modules dans « Modules de formation »."
      statusField="status"
      statusColumn="statut"
      publishedValue="publie"
      draftValue="brouillon"
      fields={[
        { name: 'titre', label: 'Titre', required: true },
        { name: 'slug', label: 'Slug (URL)', required: true, placeholder: 'ecole-de-priere' },
        { name: 'contenu_court', label: 'Résumé court', hideInTable: true },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'instructeur_nom', label: 'Instructeur', default: '' },
        { name: 'niveau', label: 'Niveau', type: 'select', options: NIVEAUX, default: 'debutant' },
        { name: 'type', label: 'Type', type: 'select', options: TYPES, default: 'cours', hideInTable: true },
        { name: 'image_couverture', label: 'Image de couverture', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'duree_heures', label: 'Durée (heures)', type: 'number', default: 0, hideInTable: true },
        { name: 'gratuit', label: 'Gratuite', type: 'boolean', default: true, hideInTable: true },
        { name: 'certifiant', label: 'Certifiante', type: 'boolean', default: false, hideInTable: true },
        { name: 'statut', label: 'Statut', type: 'select', options: STATUTS, default: 'brouillon' },
      ]}
    />
  )
}
