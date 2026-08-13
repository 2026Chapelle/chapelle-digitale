-- =============================================================================
-- PODCAST-3 — Playlists audio (officielles Citadelle + personnelles membre)
-- =============================================================================
-- Deux familles DISTINCTES via `playlist_type` :
--   • 'official' → gérées par Admin/Super Admin (via service_role + isAdminRequest,
--     comme le CMS). owner_user_id = NULL. Lecture publique/membre selon `visibility`.
--   • 'personal' → gérées par le membre lui-même (client authentifié + RLS owner-only).
-- Une playlist est une ORGANISATION éditoriale : elle ne déverrouille JAMAIS l'access_level
-- d'un épisode (le verrou premium/membre reste porté par cms_podcasts).
-- 100% ADDITIF. RLS stricte. Réf. cms_podcasts (aucune duplication de données podcast).
-- =============================================================================

create table if not exists public.audio_playlists (
  id            uuid        primary key default gen_random_uuid(),
  playlist_type text        not null default 'personal' check (playlist_type in ('official','personal')),
  owner_user_id uuid        references auth.users(id) on delete cascade,   -- NULL si official
  title         text        not null,
  description   text,
  cover_url     text,
  visibility    text        not null default 'private' check (visibility in ('private','members','public')),
  created_by    uuid        references auth.users(id) on delete set null,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ( (playlist_type = 'official' and owner_user_id is null)
       or (playlist_type = 'personal' and owner_user_id is not null) )
);

create table if not exists public.audio_playlist_items (
  id          uuid        primary key default gen_random_uuid(),
  playlist_id uuid        not null references public.audio_playlists(id) on delete cascade,
  podcast_id  uuid        not null references public.cms_podcasts(id)    on delete cascade,
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  unique (playlist_id, podcast_id)                        -- pas deux fois le même épisode
);

create index if not exists idx_audio_playlists_owner   on public.audio_playlists (owner_user_id, updated_at desc);
create index if not exists idx_audio_playlists_official on public.audio_playlists (playlist_type, visibility, sort_order);
create index if not exists idx_audio_playlist_items_pl  on public.audio_playlist_items (playlist_id, position);

drop trigger if exists trg_audio_playlists_touch on public.audio_playlists;
create trigger trg_audio_playlists_touch before update on public.audio_playlists
  for each row execute function public.cms_touch_updated_at();

-- ── Helpers SECURITY DEFINER (évitent la récursion RLS dans les policies d'items) ──
create or replace function public.playlist_owned_by_me(p_playlist_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.audio_playlists p
    where p.id = p_playlist_id and p.playlist_type = 'personal' and p.owner_user_id = auth.uid()
  );
$$;
create or replace function public.playlist_visible_to_me(p_playlist_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.audio_playlists p
    where p.id = p_playlist_id and (
         p.visibility = 'public'
      or (p.visibility = 'members' and auth.uid() is not null)
      or (p.playlist_type = 'personal' and p.owner_user_id = auth.uid())
    )
  );
$$;
revoke all on function public.playlist_owned_by_me(uuid)   from public;
revoke all on function public.playlist_visible_to_me(uuid) from public;
grant execute on function public.playlist_owned_by_me(uuid)   to anon, authenticated, service_role;
grant execute on function public.playlist_visible_to_me(uuid) to anon, authenticated, service_role;

-- ── RLS audio_playlists ─────────────────────────────────────────────────────
alter table public.audio_playlists enable row level security;
grant select, insert, update, delete on public.audio_playlists to authenticated;
grant select on public.audio_playlists to anon;

-- Lecture : sa personnelle OU officielle publique (anon) / publique|membre (authenticated).
drop policy if exists audio_playlists_read_anon on public.audio_playlists;
create policy audio_playlists_read_anon on public.audio_playlists for select to anon
  using (playlist_type = 'official' and visibility = 'public');
drop policy if exists audio_playlists_read_auth on public.audio_playlists;
create policy audio_playlists_read_auth on public.audio_playlists for select to authenticated
  using ( (playlist_type = 'personal' and owner_user_id = auth.uid())
       or (playlist_type = 'official' and visibility in ('public','members')) );

-- Écriture : UNIQUEMENT sa personnelle (les officielles passent par service_role/admin API).
drop policy if exists audio_playlists_insert_own on public.audio_playlists;
create policy audio_playlists_insert_own on public.audio_playlists for insert to authenticated
  with check (playlist_type = 'personal' and owner_user_id = auth.uid());
drop policy if exists audio_playlists_update_own on public.audio_playlists;
create policy audio_playlists_update_own on public.audio_playlists for update to authenticated
  using (playlist_type = 'personal' and owner_user_id = auth.uid())
  with check (playlist_type = 'personal' and owner_user_id = auth.uid());
drop policy if exists audio_playlists_delete_own on public.audio_playlists;
create policy audio_playlists_delete_own on public.audio_playlists for delete to authenticated
  using (playlist_type = 'personal' and owner_user_id = auth.uid());

-- ── RLS audio_playlist_items ────────────────────────────────────────────────
alter table public.audio_playlist_items enable row level security;
grant select, insert, update, delete on public.audio_playlist_items to authenticated;
grant select on public.audio_playlist_items to anon;

-- Lecture : items d'une playlist visible.
drop policy if exists audio_playlist_items_read_anon on public.audio_playlist_items;
create policy audio_playlist_items_read_anon on public.audio_playlist_items for select to anon
  using (public.playlist_visible_to_me(playlist_id));
drop policy if exists audio_playlist_items_read_auth on public.audio_playlist_items;
create policy audio_playlist_items_read_auth on public.audio_playlist_items for select to authenticated
  using (public.playlist_visible_to_me(playlist_id));

-- Écriture : UNIQUEMENT items d'une playlist personnelle possédée.
drop policy if exists audio_playlist_items_insert_own on public.audio_playlist_items;
create policy audio_playlist_items_insert_own on public.audio_playlist_items for insert to authenticated
  with check (public.playlist_owned_by_me(playlist_id));
drop policy if exists audio_playlist_items_update_own on public.audio_playlist_items;
create policy audio_playlist_items_update_own on public.audio_playlist_items for update to authenticated
  using (public.playlist_owned_by_me(playlist_id)) with check (public.playlist_owned_by_me(playlist_id));
drop policy if exists audio_playlist_items_delete_own on public.audio_playlist_items;
create policy audio_playlist_items_delete_own on public.audio_playlist_items for delete to authenticated
  using (public.playlist_owned_by_me(playlist_id));
-- anon/authenticated : aucune écriture sur les officielles ; service_role (admin API) = bypassrls.
