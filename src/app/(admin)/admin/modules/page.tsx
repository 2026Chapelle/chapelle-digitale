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

/** Extraction sûre d'un ID YouTube (11 car.) depuis une URL variée. null si non sûr. */
function extractYouTubeId(url?: string): string | null {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([\w-]{11})/)
  return m ? m[1] : (/^[\w-]{11}$/.test(url) ? url : null)
}

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
        { name: 'formation_id', label: 'Formation', required: true, type: 'ref-select', refResource: 'formations',
          emptyLabel: '— Choisir une formation —',
          refLabel: (r) => `${r.titre || 'Sans titre'} — ${r.statut === 'publie' ? 'publié' : r.statut === 'archive' ? 'archivé' : 'brouillon'}`,
          placeholder: 'UUID de la formation (repli si liste indisponible)' },
        { name: 'ordre', label: 'Ordre', type: 'number', default: 0 },
        { name: 'titre', label: 'Titre', required: true },
        { name: 'type', label: 'Type', type: 'select', options: TYPES, default: 'youtube' },
        { name: '__media', label: 'Vidéo depuis la médiathèque', hideInTable: true, type: 'media-select',
          refResource: 'media', refApiBase: '/api/admin/cms',
          mediaFilter: (m) => ['youtube', 'video'].includes(String(m.type || '').toLowerCase()),
          mediaApply: (m, ed) => {
            const t = String(m.type || '').toLowerCase()
            const patch: Record<string, any> = {}
            if (t === 'youtube') {
              patch.source_video = 'youtube'; patch.type = 'youtube'
              const id = extractYouTubeId(m.url); if (id) patch.youtube_id = id
              patch.video_url = m.url || ''
            } else {
              patch.source_video = 'internal'; patch.type = 'video'
              patch.video_url = m.url || ''
            }
            if (!ed.titre && m.title) patch.titre = m.title
            return patch
          } },
        { name: 'source_video', label: 'Source vidéo', type: 'select', options: SOURCES_VIDEO, default: 'youtube', hideInTable: true },
        { name: 'youtube_id', label: 'ID vidéo YouTube (si source YouTube)', placeholder: 'ex: dQw4w9WgXcQ', hideInTable: true },
        { name: 'video_path', label: 'Vidéo interne — chemin bucket privé media-videos', placeholder: 'videos/mon-fichier.mp4', hideInTable: true },
        { name: 'video_url', label: 'URL vidéo (alternative / interne directe)', type: 'url', hideInTable: true },
        { name: 'pdf_url', label: 'PDF attaché', type: 'file', accept: 'application/pdf', hideInTable: true },
        { name: 'contenu_texte', label: 'Contenu texte', type: 'textarea', hideInTable: true },
        { name: 'duree_minutes', label: 'Durée (minutes)', type: 'number', default: 0, hideInTable: true },
        { name: 'acces_min_statut', label: 'Accès minimum', type: 'select', options: ACCES, default: 'membre' },
        { name: 'prerequis_module_id', label: 'Prérequis (module)', hideInTable: true, type: 'ref-select', refResource: 'formation_modules',
          emptyLabel: 'Aucun prérequis',
          refFilter: (r, ed) => r.id !== ed.id && (!ed.formation_id || r.formation_id === ed.formation_id),
          refLabel: (r) => `${r.titre || 'Module'} · ordre ${r.ordre ?? '?'} · ${r.status === 'published' ? 'publié' : 'brouillon'}`,
          placeholder: 'UUID du module requis (repli si liste indisponible)' },
        { name: 'langue', label: 'Langue', default: 'fr', hideInTable: true },
        { name: 'status', label: 'Statut', type: 'select', options: STATUS, default: 'published' },
      ]}
    />
  )
}
