'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'published', label: 'Visible' }, { value: 'draft', label: 'Masqué' }]
const BLOCKS = [
  { value: 'hero', label: 'Hero (accueil)' },
  { value: 'live', label: 'Live & cultes' },
  { value: 'platforms', label: 'Plateformes' },
  { value: 'impact', label: 'Vision / Impact' },
  { value: 'formations', label: 'Formations' },
  { value: 'prayer', label: 'Prière' },
  { value: 'testimonials', label: 'Témoignages' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'join', label: 'Rejoindre' },
]

export default function AdminHomepageBlocksPage() {
  return (
    <CmsManager
      resource="homepage_blocks"
      itemLabel="bloc d'accueil"
      title={<>Accueil <span className="text-cinematic-gold">administrable</span></>}
      description="Pilotez chaque section de la page d'accueil : ordre (glisser), visibilité, titre, sous-titre, image et bouton — sans toucher au code. Les animations premium sont conservées."
      statusField="status"
      fields={[
        { name: 'block_key', label: 'Section', type: 'select', options: BLOCKS, required: true },
        { name: 'title', label: 'Titre', hideInTable: false },
        { name: 'subtitle', label: 'Sous-titre', type: 'textarea', hideInTable: true },
        { name: 'body', label: 'Contenu', type: 'textarea', hideInTable: true },
        { name: 'image_url', label: 'Image', type: 'file', hideInTable: true },
        { name: 'cta_label', label: 'Texte du bouton', hideInTable: true },
        { name: 'cta_href', label: 'Lien du bouton', placeholder: 'ex: /rejoindre', hideInTable: true },
        { name: 'status', label: 'Visibilité', type: 'select', options: STATUS, default: 'published' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
