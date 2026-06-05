'use client'
import { CmsManager } from '@/components/features/admin/CmsManager'

const TYPES = [
  { value: 'youtube', label: 'Vidéo YouTube (non répertoriée)' },
  { value: 'video', label: 'Vidéo (URL)' },
  { value: 'pdf', label: 'PDF' },
  { value: 'texte', label: 'Texte' },
  { value: 'quiz', label: 'Quiz (à venir)' },
]
// Source vidéo (architecture hybride Lot C) : YouTube (nocookie) OU interne Citadelle.
const SOURCES_VIDEO = [
  { value: 'youtube', label: 'YouTube (nocookie)' },
  { value: 'internal', label: 'Vidéo interne Citadelle (sécurisée)' },
  { value: 'none', label: 'Aucune / en préparation' },
]
const ACCES = [
  { value: 'public', label: 'Public' },
  { value: 'membre', label: 'Membre connecté' },
  { value: 'membre_actif', label: 'Membre actif' },
  { value: 'disciple', label: 'Disciple' },
  { value: 'leader', label: 'Leader' },
]
const STATUS = [{ value: 'draft', label: 'Brouillon' }, { value: 'published', label: 'Publié' }]

export default function AdminModulesPage() {
  return (
    <CmsManager
      apiBase="/api/admin/lms"
      resource="formation_modules"
      previewable={true}
      itemLabel="module"
      title={<>Modules de <span className="text-cinematic-gold">formation</span></>}
      description="Modules d'une formation : vidéo YouTube non répertoriée, PDF, accès par statut, prérequis."
      statusField="status"
      fields={[
        { name: 'formation_id', label: 'ID Formation', required: true, placeholder: 'UUID de la formation (voir module Formations)' },
        { name: 'ordre', label: 'Ordre', type: 'number', default: 0 },
        { name: 'titre', label: 'Titre', required: true },
        { name: 'type', label: 'Type', type: 'select', options: TYPES, default: 'youtube' },
        { name: 'source_video', label: 'Source vidéo', type: 'select', options: SOURCES_VIDEO, default: 'youtube', hideInTable: true },
        { name: 'youtube_id', label: 'ID vidéo YouTube (si source YouTube)', placeholder: 'ex: dQw4w9WgXcQ', hideInTable: true },
        { name: 'video_path', label: 'Vidéo interne — chemin bucket privé media-videos', placeholder: 'videos/mon-fichier.mp4', hideInTable: true },
        { name: 'video_url', label: 'URL vidéo (alternative / interne directe)', type: 'url', hideInTable: true },
        { name: 'pdf_url', label: 'PDF attaché', type: 'file', accept: 'application/pdf', hideInTable: true },
        { name: 'contenu_texte', label: 'Contenu texte', type: 'textarea', hideInTable: true },
        { name: 'duree_minutes', label: 'Durée (minutes)', type: 'number', default: 0, hideInTable: true },
        { name: 'acces_min_statut', label: 'Accès minimum', type: 'select', options: ACCES, default: 'membre' },
        { name: 'prerequis_module_id', label: 'Prérequis (ID module)', placeholder: 'UUID du module requis', hideInTable: true },
        { name: 'langue', label: 'Langue', default: 'fr', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'published' },
      ]}
    />
  )
}
