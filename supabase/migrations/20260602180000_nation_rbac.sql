-- ============================================================================
-- RBAC PAR NATION — accès pastoral limité par pays
-- ----------------------------------------------------------------------------
-- Rôles : super_admin (toutes nations), nation_pastor (son pays), platform_admin,
-- intercesseur (déjà existant). Table d'affectation responsable↔pays.
-- La PORTÉE est imposée CÔTÉ SERVEUR (API), jamais seulement par l'UI.
-- Additif & idempotent.
-- ============================================================================

alter type public.user_role add value if not exists 'super_admin';
alter type public.user_role add value if not exists 'nation_pastor';
alter type public.user_role add value if not exists 'platform_admin';

create table if not exists public.nation_responsables (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  pays        text        not null,
  role        text        not null default 'nation_pastor',  -- nation_pastor | platform_admin
  plateforme  text,                                          -- si platform_admin
  actif       boolean     not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, pays)
);
create index if not exists idx_nation_resp_user on public.nation_responsables (user_id);
create index if not exists idx_nation_resp_pays on public.nation_responsables (pays);

alter table public.nation_responsables enable row level security;
-- Un responsable peut LIRE sa propre affectation (pour connaître son périmètre).
drop policy if exists nation_resp_select_own on public.nation_responsables;
create policy nation_resp_select_own on public.nation_responsables for select
  to authenticated using (user_id = auth.uid());
-- Attribution / retrait via service role (super_admin en back-office).

-- Journal des accès sensibles (consultations de données par nation).
create table if not exists public.sensitive_access_logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references public.profiles(id) on delete set null,
  email       text,
  role        text,
  scope_pays  text,
  action      text        not null,   -- nation_dashboard_view | …
  created_at  timestamptz not null default now()
);
create index if not exists idx_sensitive_created on public.sensitive_access_logs (created_at desc);
alter table public.sensitive_access_logs enable row level security;
-- Aucune policy : accès réservé au service role (back-office).
