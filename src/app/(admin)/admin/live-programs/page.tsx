'use client'
/**
 * Admin — Programmes / Émissions Live (table live_programs, migration 20260819150000).
 *
 * Définition PERMANENTE d'une émission récurrente. Les OCCURRENCES réelles (directs +
 * replays) restent gérées dans « Lives & Cultes » (cms_lives), rattachées via program_id.
 *
 * 100 % réutilisation de l'infrastructure CMS existante : CmsManager + /api/admin/cms
 * (ressource « live-programs » → table live_programs via l'alias du resolver). Aucun
 * framework admin parallèle.
 */
import { CmsManager } from '@/components/features/admin/CmsManager'

export default function AdminLiveProgramsPage() {
  return (
    <CmsManager
      resource="live-programs"
      itemLabel="programme"
      title={<>Programmes Live</>}
      description="Émissions récurrentes (définition permanente). Les directs et replays réels se gèrent dans « Lives & Cultes » et se rattachent à un programme."
      statusField="status"
      previewable={false}
      fields={[
        { name: 'title', label: 'Titre', required: true, placeholder: 'Ex. Matinale de prière' },
        { name: 'slug', label: 'Slug', required: true, placeholder: 'ex. matinale-de-priere', help: 'Identifiant éditorial stable et unique.' },
        { name: 'description', label: 'Description', type: 'textarea', hideInTable: true },
        { name: 'image_url', label: 'Image de couverture (URL)', type: 'url', hideInTable: true },
        {
          name: 'weekdays', label: 'Jours de diffusion', type: 'tags', hideInTable: true,
          help: 'Jours récurrents en chiffres : 0=dimanche, 1=lundi … 6=samedi (ex. 1, 3, 5). Laisser vide pour un horaire variable / spécial (voir « Note d’horaire »).',
        },
        {
          name: 'start_time', label: 'Heure (locale)', type: 'text', hideInTable: true, placeholder: 'HH:MM',
          help: 'Heure locale récurrente au format 24 h (ex. 05:30). Le fuseau est géré séparément.',
        },
        { name: 'timezone', label: 'Fuseau horaire', type: 'text', hideInTable: true, default: 'Africa/Abidjan', help: 'Identifiant IANA (défaut : Africa/Abidjan).' },
        { name: 'schedule_note', label: 'Note d’horaire', type: 'text', hideInTable: true, placeholder: 'Ex. Selon programmation', help: 'Précision éditoriale pour les programmes irréguliers.' },
        {
          name: 'youtube_playlist_id', label: 'Playlist YouTube', type: 'text', hideInTable: true,
          placeholder: 'ID (list=…) ou URL de playlist', help: 'ID de playlist YouTube. Une URL complète est acceptée : seul l’ID sera conservé.',
        },
        { name: 'is_active', label: 'Actif', type: 'boolean', default: true },
        { name: 'sort_order', label: 'Ordre', type: 'number', hideInTable: true, default: 0 },
      ]}
    />
  )
}
