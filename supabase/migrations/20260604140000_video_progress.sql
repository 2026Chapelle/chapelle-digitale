-- ============================================================================
-- PROGRESSION VIDÉO PERSISTANTE (Lot B)
-- ----------------------------------------------------------------------------
-- Sauvegarde le visionnage réel par (membre, module) : survit à la déconnexion,
-- au changement d'appareil, à la fermeture du navigateur et à l'actualisation.
-- Sert : validation 90 %, reprise de lecture (last_position), déblocage PDF.
-- Additif, RLS. N'altère AUCUNE table existante.
-- ============================================================================

create table if not exists public.video_progress (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  module_id       uuid        not null references public.formation_modules(id) on delete cascade,
  formation_id    uuid        references public.formations(id) on delete cascade,
  watched_seconds int         not null default 0,
  video_duration  int         not null default 0,
  percent_watched int         not null default 0,
  completed       boolean     not null default false,
  last_position   int         not null default 0,
  updated_at      timestamptz not null default now(),
  unique (user_id, module_id)
);
create index if not exists idx_vp_user_formation on public.video_progress (user_id, formation_id);

alter table public.video_progress enable row level security;

-- Le membre lit/écrit SA propre progression (les routes serveur passent en
-- service role ; ces policies sécurisent aussi un accès client direct éventuel).
drop policy if exists vp_select_own on public.video_progress;
create policy vp_select_own on public.video_progress for select
  to authenticated using (user_id = auth.uid());
drop policy if exists vp_insert_own on public.video_progress;
create policy vp_insert_own on public.video_progress for insert
  to authenticated with check (user_id = auth.uid());
drop policy if exists vp_update_own on public.video_progress;
create policy vp_update_own on public.video_progress for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
