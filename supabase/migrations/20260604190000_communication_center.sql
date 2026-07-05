-- ============================================================================
-- CENTRE DE COMMUNICATION (additif) — messagerie, campagnes, annonces, journal
-- ----------------------------------------------------------------------------
-- Réutilise le moteur Notifications (in-app) ; ajoute email ciblé, messagerie
-- 1:1, annonces et journal/tracking. Aucune table existante altérée.
-- ============================================================================

-- 1) Messagerie interne 1:1 ---------------------------------------------------
create table if not exists public.messages (
  id           uuid        primary key default gen_random_uuid(),
  sender_id    uuid        not null references public.profiles(id) on delete cascade,
  recipient_id uuid        not null references public.profiles(id) on delete cascade,
  body         text        not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_messages_recipient on public.messages (recipient_id, read_at);
create index if not exists idx_messages_pair on public.messages (sender_id, recipient_id, created_at desc);
alter table public.messages enable row level security;
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid());
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
exception when undefined_object then null;
end $$;

-- 2) Campagnes ciblées membres ------------------------------------------------
create table if not exists public.communication_campaigns (
  id               uuid        primary key default gen_random_uuid(),
  sujet            text        not null,
  body             text,
  channel          text        not null default 'in_app',   -- email | in_app | both
  target           jsonb       not null default '{}'::jsonb, -- {roles,statuts,pays,plateformes}
  template_id      uuid,
  status           text        not null default 'draft',     -- draft | scheduled | sent
  scheduled_at     timestamptz,
  sent_at          timestamptz,
  recipients_count int         not null default 0,
  opens_count      int         not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_comm_campaigns_status on public.communication_campaigns (status, created_at desc);
alter table public.communication_campaigns enable row level security;

-- 3) Modèles réutilisables ----------------------------------------------------
create table if not exists public.communication_templates (
  id         uuid        primary key default gen_random_uuid(),
  nom        text        not null,
  sujet      text,
  body       text,
  created_at timestamptz not null default now()
);
alter table public.communication_templates enable row level security;

-- 4) Annonces officielles -----------------------------------------------------
create table if not exists public.announcements (
  id          uuid        primary key default gen_random_uuid(),
  titre       text        not null,
  body        text,
  level       text        not null default 'info',   -- info | important | critique
  target      jsonb       not null default '{}'::jsonb,
  active_from timestamptz,
  active_until timestamptz,
  status      text        not null default 'active',  -- draft | active | archive
  created_at  timestamptz not null default now()
);
create index if not exists idx_announcements_status on public.announcements (status, created_at desc);
alter table public.announcements enable row level security;
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select to authenticated using (status = 'active');

-- 5) Journal + tracking d'ouverture ------------------------------------------
create table if not exists public.communication_log (
  id           uuid        primary key default gen_random_uuid(),
  campaign_id  uuid        references public.communication_campaigns(id) on delete cascade,
  channel      text        not null default 'email',  -- email | in_app
  recipient_id uuid        references public.profiles(id) on delete set null,
  email        text,
  status       text        not null default 'sent',   -- sent | failed | opened
  sent_at      timestamptz not null default now(),
  opened_at    timestamptz
);
create index if not exists idx_comm_log_campaign on public.communication_log (campaign_id);
alter table public.communication_log enable row level security;

notify pgrst, 'reload schema';
