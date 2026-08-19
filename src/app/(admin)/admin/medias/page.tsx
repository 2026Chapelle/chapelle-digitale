'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const TYPES = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Vidéo' },
  { value: 'audio', label: 'Audio' },
  { value: 'pdf', label: 'PDF' },
  { value: 'youtube', label: 'YouTube' },
]
const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

// PDF-2 — NATURE du document (distincte du « type » média ci-dessus).
const DOCUMENT_TYPES = [
  { value: '', label: '— (non précisé)' },
  { value: 'livre', label: 'Livre' },
  { value: 'livret', label: 'Livret' },
  { value: 'manuel', label: 'Manuel' },
  { value: 'workbook', label: 'Workbook' },
  { value: 'support_cours', label: 'Support de cours' },
  { value: 'fiche_etude', label: "Fiche d'étude" },
  { value: 'guide', label: 'Guide' },
  { value: 'declaration', label: 'Déclaration' },
  { value: 'programme', label: 'Programme' },
  { value: 'ressource', label: 'Ressource' },
  { value: 'autre', label: 'Autre' },
]
// PDF-2 — ACCÈS ÉDITORIAL (public|member|premium). N'est PAS un verrou : l'enforcement
// réel (bucket privé + URL signée + entitlement) relève de PDF-3.
const ACCESS_LEVELS = [
  { value: 'public', label: 'Public' },
  { value: 'member', label: 'Membre' },
  { value: 'premium', label: 'Premium' },
]

export default function AdminMediasPage() {
  return (
    <CmsManager
      resource="media"
      itemLabel="média"
      title={<>Média<span className="text-cinematic-gold">thèque</span></>}
      description="Bibliothèque de médias : images, vidéos, audio, PDF, YouTube. Les champs « Document » ne concernent que les PDF."
      statusField="status"
      fields={[
        { name: 'title', label: 'Titre', required: true },
        { name: 'type', label: 'Type', type: 'select', options: TYPES, default: 'image' },
        { name: 'url', label: 'Fichier (upload) / lien', type: 'file', required: true, accept: 'image/*,video/*,audio/*,application/pdf' },
        { name: 'thumbnail_url', label: 'Vignette / couverture', type: 'file', accept: 'image/*', hideInTable: true },
        { name: 'category', label: 'Catégorie', default: 'general' },
        { name: 'alt', label: 'Texte alternatif', hideInTable: true },
        { name: 'platform', label: 'Plateforme', hideInTable: true },
        { name: 'tags', label: 'Tags', type: 'tags', hideInTable: true },
        // ── PDF-2 : métadonnées documentaires (PDF uniquement) ──────────────
        { name: 'document_type', label: 'Document — Nature', type: 'select', options: DOCUMENT_TYPES, hideInTable: true },
        { name: 'access_level', label: 'Document — Accès (éditorial)', type: 'select', options: ACCESS_LEVELS, default: 'public', hideInTable: true },
        { name: 'visible_in_library', label: 'Document — Visible en bibliothèque', type: 'boolean', default: true, hideInTable: true },
        { name: 'slug', label: 'Document — Slug (optionnel)', hideInTable: true },
        { name: 'author', label: 'Document — Auteur', hideInTable: true },
        { name: 'page_count', label: 'Document — Nb pages', type: 'number', hideInTable: true },
        { name: 'description', label: 'Document — Description', type: 'textarea', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'published' },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
