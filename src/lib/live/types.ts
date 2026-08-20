/**
 * TYPES LIVE — modèle de domaine pour le direct/vidéo (Citadelle).
 *
 * Source de vérité : table `cms_lives`. Ce fichier ne définit AUCUNE liste
 * de programmes en dur — les émissions réelles proviennent des données.
 *
 * Module PUR (aucune dépendance UI/réseau) → testable et réutilisable côté
 * serveur comme client.
 */
import type { ResolvedVideoSource } from '@/lib/video'

/** État calculé d'un live, dérivé des colonnes `cms_lives` + horloge. */
export type LiveState = 'upcoming' | 'live' | 'ended' | 'replay'

/**
 * Forme brute d'une ligne `cms_lives` telle que lue depuis Supabase.
 * Tous les champs optionnels/nullable reflètent le schéma réel de la table.
 */
export interface RawCmsLive {
  id?: string
  title: string
  description?: string | null
  youtube_url?: string | null
  video_url?: string | null
  cover_url?: string | null
  scheduled_at?: string | null
  is_live?: boolean | null
  platform?: string | null
  status?: string | null
  sort_order?: number | null
}

/**
 * Live normalisé, prêt à l'affichage : état calculé, date parsée, source
 * vidéo résolue et miniature de repli déterminés une fois pour toutes.
 */
export interface NormalizedLive {
  id: string | null
  title: string
  description: string | null
  state: LiveState
  scheduledAt: Date | null
  isLive: boolean
  platform: string | null
  source: ResolvedVideoSource
  thumbnailUrl: string | null
  hasPlayableVideo: boolean
  raw: RawCmsLive
}
