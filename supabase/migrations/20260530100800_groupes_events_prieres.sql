-- ============================================================================
-- LOT FINAL — Adhésions groupes, inscriptions événements, demandes de prière
-- ----------------------------------------------------------------------------
-- NOUVELLE migration (ne modifie aucune migration validée). Trois tables avec
-- insertion publique (anon/authenticated) sous RLS ; lecture/gestion réservées
-- au back-office (service role). Statuts texte (pas d'enum) pour rester souple.
-- ============================================================================

-- 1) Demandes d'adhésion à un groupe ----------------------------------------
create table if not exists public.group_join_requests (
  id          uuid        primary key default gen_random_uuid(),
  group_id    text,
  group_nom   text        not null,
  user_id     uuid,
  user_nom    text,
  user_email  text,
  message     text,
  statut      text        not null default 'en_attente',  -- en_attente | accepte | refuse
  created_at  timestamptz not null default now()
);
create index if not exists idx_gjr_created on public.group_join_requests (created_at desc);
alter table public.group_join_requests enable row level security;
drop policy if exists gjr_insert on public.group_join_requests;
create policy gjr_insert on public.group_join_requests for insert
  to anon, authenticated with check (true);

-- 2) Inscriptions / rappels d'événements ------------------------------------
create table if not exists public.event_registrations (
  id           uuid        primary key default gen_random_uuid(),
  event_id     text,
  event_titre  text        not null,
  user_id      uuid,
  user_nom     text,
  user_email   text,
  type         text        not null default 'inscription', -- inscription | rappel | participation
  statut       text        not null default 'confirme',
  created_at   timestamptz not null default now()
);
create index if not exists idx_evtreg_created on public.event_registrations (created_at desc);
alter table public.event_registrations enable row level security;
drop policy if exists evtreg_insert on public.event_registrations;
create policy evtreg_insert on public.event_registrations for insert
  to anon, authenticated with check (true);

-- 3) Demandes de prière (publiques + membres) -------------------------------
create table if not exists public.priere_demandes (
  id           uuid        primary key default gen_random_uuid(),
  nom          text,
  email        text,
  user_id      uuid,
  sujet        text        not null,
  description  text,
  categorie    text        default 'general',
  urgence      text        default 'normale',   -- normale | elevee | critique
  anonyme      boolean     not null default false,
  statut       text        not null default 'nouvelle', -- nouvelle | en_priere | traitee | temoignage
  created_at   timestamptz not null default now()
);
create index if not exists idx_priere_created on public.priere_demandes (created_at desc);
create index if not exists idx_priere_statut on public.priere_demandes (statut);
alter table public.priere_demandes enable row level security;
drop policy if exists priere_insert on public.priere_demandes;
create policy priere_insert on public.priere_demandes for insert
  to anon, authenticated with check (true);
-- Lecture publique des demandes NON anonymes en cours de prière (mur de prière).
drop policy if exists priere_public_read on public.priere_demandes;
create policy priere_public_read on public.priere_demandes for select
  to anon, authenticated using (anonyme = false and statut in ('nouvelle','en_priere'));
