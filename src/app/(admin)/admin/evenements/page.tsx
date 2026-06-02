'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
]

export default function AdminEvenementsPage() {
  return (
    <CmsManager
      resource="events"
      itemLabel="événement"
      title={<>Événements</>}
      description="Agenda des événements (présentiel & en ligne)."
      statusField="status"
      fields={[
        { name: 'title', label: 'Titre', required: true },
        { name: 'slug', label: 'Slug', hideInTable: true },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'starts_at', label: 'Début', type: 'datetime' },
        { name: 'ends_at', label: 'Fin', type: 'datetime', hideInTable: true },
        { name: 'location', label: 'Lieu' },
        { name: 'is_online', label: 'En ligne', type: 'boolean', default: false },
        { name: 'cover_url', label: 'Affiche / image (téléverser ou URL)', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'whatsapp', label: 'WhatsApp (numéro ou lien du groupe)', placeholder: '+225 07 48 84 24 15 ou https://chat.whatsapp.com/…', hideInTable: true },
        { name: 'cta_label', label: 'Texte du bouton', hideInTable: true },
        { name: 'cta_href', label: 'Lien du bouton', type: 'url', hideInTable: true },
        { name: 'platform', label: 'Plateforme', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'draft' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
