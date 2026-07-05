-- ============================================================================
-- LOT C — ARCHITECTURE VIDÉO HYBRIDE (à exécuter dans Supabase SQL Editor)
-- Ajoute le choix de source par module + le bucket privé des vidéos internes.
-- Additif, conservateur (ne casse aucune vidéo YouTube existante). Idempotent.
-- ============================================================================

alter table public.formation_modules add column if not exists source_video text;
alter table public.formation_modules add column if not exists video_path text;

update public.formation_modules set source_video = case
    when source_video is not null and source_video <> '' then source_video
    when youtube_id is not null and youtube_id <> ''      then 'youtube'
    when video_url is not null and video_url <> ''        then 'internal'
    else 'none'
  end
  where source_video is null or source_video = '';

-- Bucket PRIVÉ pour les vidéos internes protégées (URLs signées côté serveur).
insert into storage.buckets (id, name, public)
  values ('media-videos', 'media-videos', false)
  on conflict (id) do nothing;

notify pgrst, 'reload schema';
