-- =============================================================================
-- PODCAST-2 — Progression audio personnelle (« Continuer l'écoute »)
-- =============================================================================
-- Persistance SERVEUR (multi-appareils) de la position de lecture par membre.
-- 100% ADDITIF. RLS STRICTE : chaque membre ne voit/modifie QUE sa progression.
-- NB : progression PERSONNELLE ≠ analytics d'écoute globale (lot PODCAST-4 dédié,
--      événements audio séparés) — cette table ne doit pas être détournée pour l'admin.
-- =============================================================================

create table if not exists public.audio_progress (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id)      on delete cascade,
  podcast_id       uuid        not null references public.cms_podcasts(id) on delete cascade,
  position_seconds integer     not null default 0  check (position_seconds >= 0),
  duration_seconds integer     check (duration_seconds is null or duration_seconds >= 0),
  completed        boolean     not null default false,
  last_played_at   timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, podcast_id)
);

-- Index : liste « Continuer l'écoute » (par membre, plus récent d'abord).
create index if not exists idx_audio_progress_user_recent
  on public.audio_progress (user_id, last_played_at desc);

-- updated_at auto (réutilise le trigger générique CMS).
drop trigger if exists trg_audio_progress_touch on public.audio_progress;
create trigger trg_audio_progress_touch before update on public.audio_progress
  for each row execute function public.cms_touch_updated_at();

-- ── RLS : isolation stricte par utilisateur ─────────────────────────────────
alter table public.audio_progress enable row level security;

-- Grants table-level (RLS = filtre AU-DESSUS du GRANT). anon volontairement EXCLU.
grant select, insert, update, delete on public.audio_progress to authenticated;

drop policy if exists audio_progress_select_own on public.audio_progress;
create policy audio_progress_select_own on public.audio_progress
  for select to authenticated using (user_id = auth.uid());

drop policy if exists audio_progress_insert_own on public.audio_progress;
create policy audio_progress_insert_own on public.audio_progress
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists audio_progress_update_own on public.audio_progress;
create policy audio_progress_update_own on public.audio_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists audio_progress_delete_own on public.audio_progress;
create policy audio_progress_delete_own on public.audio_progress
  for delete to authenticated using (user_id = auth.uid());
-- anon : AUCUNE policy → aucun accès. service_role : BYPASSRLS (supabase) pour l'admin futur.
