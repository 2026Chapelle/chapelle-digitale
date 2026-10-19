-- École des Sentinelles V1 — support audio explicite pour les modules LMS.
-- Migration additive uniquement : elle ne modifie aucune règle de progression.
alter table public.formation_modules
  add column if not exists audio_url text;

comment on column public.formation_modules.audio_url is
  'URL audio du module LMS. Distincte de video_url afin de ne pas détourner le support vidéo.';
