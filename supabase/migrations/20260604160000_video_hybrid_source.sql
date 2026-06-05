-- ============================================================================
-- LOT C — ARCHITECTURE VIDÉO HYBRIDE (YouTube + interne Citadelle)
-- ----------------------------------------------------------------------------
-- Additif. Chaque module choisit sa source : 'youtube' | 'internal' | 'none'.
-- N'altère AUCUNE vidéo YouTube existante (backfill conservateur). Prépare la
-- migration PROGRESSIVE vers des vidéos internes protégées (bucket privé +
-- URLs signées). Recharge le cache PostgREST à la fin.
-- ============================================================================

-- 1) Colonnes de source vidéo sur les modules --------------------------------
alter table public.formation_modules add column if not exists source_video text;
alter table public.formation_modules add column if not exists video_path text;  -- objet dans le bucket privé (vidéo interne)

-- Backfill conservateur : déduit la source de l'existant sans rien casser.
update public.formation_modules set source_video = case
    when source_video is not null and source_video <> '' then source_video
    when youtube_id is not null and youtube_id <> ''      then 'youtube'
    when video_url is not null and video_url <> ''        then 'internal'
    else 'none'
  end
  where source_video is null or source_video = '';

-- 2) Bucket PRIVÉ pour les vidéos internes protégées -------------------------
-- (les images/PDF restent dans le bucket public 'media'). Accès servi via URL
-- signée générée côté serveur, uniquement aux membres inscrits + module débloqué.
insert into storage.buckets (id, name, public)
  values ('media-videos', 'media-videos', false)
  on conflict (id) do nothing;

notify pgrst, 'reload schema';
