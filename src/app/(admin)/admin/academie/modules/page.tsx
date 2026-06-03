'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const STATUS = [{ value: 'published', label: 'Publié' }, { value: 'planned', label: 'À venir' }, { value: 'archived', label: 'Archivé' }]
const UNLOCK = [{ value: 'open', label: 'Ouvert' }, { value: 'sequential', label: 'Séquentiel' }, { value: 'time', label: 'Programmé' }]

export default function AdminAcademieModules() {
  return (
    <CmsManager
      apiBase="/api/admin/academy" resource="modules" itemLabel="module" previewable={false}
      statusField="status" statusColumn="status" publishedValue="published" draftValue="planned"
      eyebrow="Académie des Élus"
      title={<>Gérer les <span className="text-cinematic-gold">Modules</span></>}
      description="120 modules (6 niveaux × 20). Couverture, miniature, manuel PDF, vidéo YouTube, badge, déblocage. Requiert la migration academy poussée."
      fields={[
        { name: 'ordre', label: 'Ordre', type: 'number', default: 1 },
        { name: 'titre', label: 'Titre', required: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'planned' },
        { name: 'sous_titre', label: 'Sous-titre', hideInTable: true },
        { name: 'slug', label: 'Slug (URL)', hideInTable: true, placeholder: 'entrer-dans-le-royaume' },
        { name: 'level_id', label: 'Niveau (id)', hideInTable: true, placeholder: 'uuid du niveau (cf. Niveaux)' },
        { name: 'apropos', label: 'À propos du module', type: 'textarea', hideInTable: true },
        { name: 'cover_url', label: 'Couverture', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'thumbnail_url', label: 'Miniature vidéo', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'pdf_path', label: 'Manuel PDF', type: 'file', accept: 'application/pdf', hideInTable: true },
        { name: 'video_url', label: 'Vidéo YouTube (URL)', hideInTable: true, placeholder: 'https://youtu.be/…' },
        { name: 'badge_id', label: 'Badge décerné (id)', hideInTable: true, placeholder: 'uuid du badge' },
        { name: 'unlock_mode', label: 'Déblocage', type: 'select', options: UNLOCK, default: 'sequential', hideInTable: true },
        { name: 'xp', label: 'XP', type: 'number', default: 100, hideInTable: true },
      ]}
    />
  )
}
