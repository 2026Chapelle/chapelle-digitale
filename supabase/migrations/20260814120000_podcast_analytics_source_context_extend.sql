-- =============================================================================
-- PODCAST-9 / D1 — Étend la whitelist `source_context` des événements d'écoute
-- =============================================================================
-- CONTEXTE (défaut réellement reproduit en navigateur pendant PODCAST-9) :
--  PODCAST-8 a introduit deux rails de recommandation qui émettent réellement
--  deux nouveaux contextes d'origine de lecture :
--    • 'personalized' = rail « Pour toi » (ranking par membre) ;
--    • 'popular'      = rail « Populaire dans La Voix du Royaume » (agrégat global).
--  La couche TypeScript (AUDIO_SOURCE_CONTEXTS, isAudioSourceContext) connaît déjà
--  ces valeurs et les transmet à l'ingestion, MAIS la contrainte CHECK d'origine
--  (`audio_listening_events_source_context_check`, migration 20260813120000) est
--  ANTÉRIEURE à PODCAST-8 et les ignore. PostgreSQL rejette donc l'INSERT ;
--  l'ingestion fire-and-forget avale l'erreur → le navigateur reçoit 204 alors
--  que RIEN n'est enregistré. Résultat : analytics 'personalized'/'popular' perdus.
--
-- CORRECTION (100 % ADDITIVE, aucune migration antérieure modifiée) :
--  On remplace UNIQUEMENT la contrainte CHECK par une whitelist STRICTE alignée
--  sur AUDIO_SOURCE_CONTEXTS (src/lib/podcast/audio-analytics.ts). Aucune donnée
--  n'est touchée (les lignes existantes respectaient déjà l'ancien sous-ensemble).
--  La sécurité append-only / service_role only reste inchangée.
--
-- INVARIANT à préserver (SQL ↔ TypeScript) : cette liste DOIT rester identique à
--  AUDIO_SOURCE_CONTEXTS. Toute nouvelle valeur passe par une migration additive.
-- =============================================================================

alter table public.audio_listening_events
  drop constraint if exists audio_listening_events_source_context_check;

alter table public.audio_listening_events
  add constraint audio_listening_events_source_context_check
  check (source_context is null or source_context in (
    'catalog','featured','new_release','continue_listening',
    'official_playlist','personal_playlist','homepage_instant','homepage_premium','direct',
    -- PODCAST-8 : rails de recommandation (deux dimensions DISTINCTES).
    'personalized','popular'
  ));

comment on constraint audio_listening_events_source_context_check
  on public.audio_listening_events is
  'PODCAST-9/D1 : whitelist stricte des contextes d''origine de lecture, alignée sur AUDIO_SOURCE_CONTEXTS (TypeScript). Étendue avec personalized/popular (PODCAST-8).';
