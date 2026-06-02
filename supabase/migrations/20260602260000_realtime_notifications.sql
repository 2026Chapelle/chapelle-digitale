-- ============================================================================
-- NOTIFICATIONS TEMPS RÉEL — source de vérité + état lu SERVEUR (multi-appareils)
-- ----------------------------------------------------------------------------
-- Remplace le polling 45s + localStorage par : table source + Supabase Realtime
-- (push instantané) + état lu/archivé persisté côté serveur, synchronisé sur
-- tous les appareils. Conçu pour 100k membres (1 connexion WebSocket/membre
-- au lieu de 100k requêtes/45s).
-- ============================================================================

-- Notifications CIBLÉES (user_id) ou DIFFUSÉES (audience). Écriture service role.
create table if not exists public.app_notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references public.profiles(id) on delete cascade, -- null = diffusion
  audience    text        not null default 'user',  -- user | members | all | admin
  type        text        not null default 'info',  -- don | priere | formation | achat | live | evenement | systeme…
  title       text        not null,
  body        text,
  href        text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_appnotif_user on public.app_notifications (user_id, created_at desc);
create index if not exists idx_appnotif_audience on public.app_notifications (audience, created_at desc);
alter table public.app_notifications enable row level security;
drop policy if exists appnotif_read on public.app_notifications;
-- Un membre lit ses notifs ciblées + les diffusions générales/membres.
create policy appnotif_read on public.app_notifications for select to authenticated
  using (user_id = auth.uid() or audience in ('members', 'all'));
-- (écriture : service role uniquement, aucune policy insert)

-- État lu/archivé PAR clé de notification (couvre AUSSI les notifs dérivées du
-- contenu, identifiées par une clé stable « type:id » — pas seulement app_notifications).
create table if not exists public.notification_reads (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  notif_key   text        not null,
  read_at     timestamptz not null default now(),
  archived_at timestamptz,
  primary key (user_id, notif_key)
);
alter table public.notification_reads enable row level security;
drop policy if exists nreads_rw on public.notification_reads;
create policy nreads_rw on public.notification_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Activer Supabase Realtime sur app_notifications (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_notifications'
  ) then
    alter publication supabase_realtime add table public.app_notifications;
  end if;
exception when undefined_object then
  -- publication absente (env local sans Realtime) : ignorer.
  null;
end $$;
