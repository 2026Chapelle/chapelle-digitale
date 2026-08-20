-- ============================================================================
-- PARCOURS DU ROYAUME — PERSISTANCE CANONIQUE (Phase 3B)
-- ----------------------------------------------------------------------------
-- 100 % ADDITIF. Aucun DROP, aucun rename destructif, aucune valeur legacy
-- modifiée, aucun backfill. Les axes sensibles vivent dans des TABLES DÉDIÉES
-- (jamais sur public.profiles, dont la policy SELECT expose anon).
-- CHECK textuels (pas de nouvel ENUM PG) → renommage/ajout de valeur réversible.
-- RLS restrictive dès la création. MinistryRole ≠ RBAC (aucune permission accordée).
-- Aucune route de mutation pastorale runtime n'est créée ici (frontière 3B/3C).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Helper d'autorité pastorale (SECURITY DEFINER, anti-récursion, fail-closed)
-- ----------------------------------------------------------------------------
create or replace function public.is_pastoral_responsable_of(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- (a) berger DIRECT du membre (scoping par troupeau via berger_id) — un berger ne voit
  --     QUE son troupeau, jamais tous les membres.
  -- (b) supervision pastorale haute (admin/super_admin/pasteur) — accès transverse assumé.
  --     'berger' est VOLONTAIREMENT exclu de cette liste globale (MAJOR-1) : sinon tout
  --     berger lirait les données spirituelles de TOUS les membres.
  select
    exists (select 1 from public.profiles t where t.id = p_member and t.berger_id = auth.uid())
    or exists (select 1 from public.profiles a where a.id = auth.uid()
               and a.role in ('admin','super_admin','pasteur'));
$$;
-- 'public' OBLIGATOIRE dans le revoke (sinon EXECUTE accordé par défaut à anon/authenticated).
revoke all on function public.is_pastoral_responsable_of(uuid) from public, anon;
grant execute on function public.is_pastoral_responsable_of(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 1) member_canonical_axes — GROWTH + COMMUNITY (1 ligne/membre)
-- ----------------------------------------------------------------------------
create table if not exists public.member_canonical_axes (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  growth_level text
    check (growth_level is null or growth_level in
      ('visitor','new_believer','disciple','servant','leader','worker','responsible','shepherd')),
  growth_review_state text not null default 'requires_review'
    check (growth_review_state in ('confirmed','requires_review')),
  community_status text
    check (community_status is null or community_status in
      ('visitor','contact','integrating','member')),
  community_review_state text not null default 'requires_review'
    check (community_review_state in ('confirmed','requires_review')),
  -- provenance SANS défaut (MAJOR-3) : toute écriture doit déclarer une provenance explicite.
  provenance text not null
    check (provenance in ('backfill','pastoral_validation','import','self_declared')),
  validated_by uuid references public.profiles(id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 'confirmed' exige un validateur humain, SAUF le backfill du PLANCHER exact ('visitor'),
  -- acte système sûr et non ambigu. L'exemption est BORNÉE au plancher (MAJOR-3) : impossible
  -- de « confirmer » un niveau supérieur sans validateur humain, même en provenance backfill.
  constraint mca_growth_confirmed_needs_validator check (
    growth_review_state <> 'confirmed' or validated_by is not null
    or (provenance = 'backfill' and growth_level = 'visitor')),
  constraint mca_community_confirmed_needs_validator check (
    community_review_state <> 'confirmed' or validated_by is not null
    or (provenance = 'backfill' and community_status = 'visitor'))
);
create index if not exists idx_mca_growth on public.member_canonical_axes (growth_level, growth_review_state);
create index if not exists idx_mca_community on public.member_canonical_axes (community_status, community_review_state);
create index if not exists idx_mca_review on public.member_canonical_axes (growth_review_state, community_review_state);

drop trigger if exists trg_mca_updated_at on public.member_canonical_axes;
create trigger trg_mca_updated_at before update on public.member_canonical_axes
  for each row execute function public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 2) ministry_role_registry — référentiel (clé, libellé, tier, validation requise)
-- ----------------------------------------------------------------------------
create table if not exists public.ministry_role_registry (
  key text primary key,
  label_fr text not null,
  authority_tier text not null check (authority_tier in ('care','ministry','leadership','oversight')),
  requires_human_validation boolean not null default false,
  sort_order int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.ministry_role_registry (key,label_fr,authority_tier,requires_human_validation,sort_order) values
  ('mentor','Mentor','care',false,10),
  ('servant','Serviteur','ministry',false,20),
  ('trainer','Formateur','ministry',false,30),
  ('integration_lead','Responsable intégration','ministry',true,40),
  ('cell_leader','Leader de cellule','leadership',true,50),
  ('team_leader','Responsable d''équipe','leadership',true,60),
  ('shepherd','Berger','oversight',true,70),
  ('pastor','Pasteur','oversight',true,80)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 3) member_ministry_roles — affectations (multi-rôle, historique in-table)
-- ----------------------------------------------------------------------------
create table if not exists public.member_ministry_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null references public.ministry_role_registry(key),
  status text not null default 'active' check (status in ('active','ended')),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id) on delete set null,
  ended_at timestamptz,
  ended_by uuid references public.profiles(id) on delete set null,
  provenance text,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mmr_ended_consistency check (
    (status = 'ended' and ended_at is not null) or (status = 'active' and ended_at is null))
);
-- Une seule affectation ACTIVE par (membre, rôle) ; les lignes 'ended' empilent l'historique.
create unique index if not exists uq_mmr_active on public.member_ministry_roles (profile_id, role_key)
  where status = 'active';
create index if not exists idx_mmr_profile_active on public.member_ministry_roles (profile_id) where status = 'active';
create index if not exists idx_mmr_role on public.member_ministry_roles (role_key) where status = 'active';

drop trigger if exists trg_mmr_updated_at on public.member_ministry_roles;
create trigger trg_mmr_updated_at before update on public.member_ministry_roles
  for each row execute function public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 4) member_canonical_axis_changes — audit APPEND-ONLY
-- ----------------------------------------------------------------------------
create table if not exists public.member_canonical_axis_changes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  axis text not null check (axis in ('growth_level','community_status','ministry_role')),
  old_value text,
  new_value text,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_label text,
  justification text,
  provenance text,
  created_at timestamptz not null default now()
);
create index if not exists idx_mcac_profile on public.member_canonical_axis_changes (profile_id, created_at desc);

create or replace function public.member_canonical_axis_changes_immutable()
returns trigger language plpgsql as $$
begin raise exception 'member_canonical_axis_changes is append-only'; end; $$;
drop trigger if exists trg_mcac_no_update on public.member_canonical_axis_changes;
create trigger trg_mcac_no_update before update on public.member_canonical_axis_changes
  for each row execute function public.member_canonical_axis_changes_immutable();
drop trigger if exists trg_mcac_no_delete on public.member_canonical_axis_changes;
create trigger trg_mcac_no_delete before delete on public.member_canonical_axis_changes
  for each row execute function public.member_canonical_axis_changes_immutable();

-- ----------------------------------------------------------------------------
-- 5) RLS — deny-by-default, aucun accès anon, écriture service_role uniquement
-- ----------------------------------------------------------------------------
-- Patron GOLD (user_entitlements / membre_statut_history) : revoke anon+authenticated,
-- grant select authenticated, policies TO authenticated bornées, writes service_role.

-- 5a) member_canonical_axes
alter table public.member_canonical_axes enable row level security;
alter table public.member_canonical_axes force row level security;
revoke all on public.member_canonical_axes from anon, authenticated;
grant select on public.member_canonical_axes to authenticated;
grant select, insert, update on public.member_canonical_axes to service_role;
drop policy if exists mca_select_own on public.member_canonical_axes;
create policy mca_select_own on public.member_canonical_axes for select to authenticated
  using (profile_id = auth.uid());
drop policy if exists mca_select_responsable on public.member_canonical_axes;
create policy mca_select_responsable on public.member_canonical_axes for select to authenticated
  using (public.is_pastoral_responsable_of(profile_id));

-- 5b) ministry_role_registry — référentiel public en lecture (libellés UI), pas de PII
alter table public.ministry_role_registry enable row level security;
alter table public.ministry_role_registry force row level security;  -- MINOR-2 : cohérence
revoke all on public.ministry_role_registry from anon;
grant select on public.ministry_role_registry to authenticated;
grant select, insert, update on public.ministry_role_registry to service_role;
drop policy if exists mrr_select_auth on public.ministry_role_registry;
create policy mrr_select_auth on public.ministry_role_registry for select to authenticated using (true);

-- 5c) member_ministry_roles
alter table public.member_ministry_roles enable row level security;
alter table public.member_ministry_roles force row level security;
revoke all on public.member_ministry_roles from anon, authenticated;
grant select on public.member_ministry_roles to authenticated;
grant select, insert, update on public.member_ministry_roles to service_role;
drop policy if exists mmr_select_own on public.member_ministry_roles;
create policy mmr_select_own on public.member_ministry_roles for select to authenticated
  using (profile_id = auth.uid());
drop policy if exists mmr_select_responsable on public.member_ministry_roles;
create policy mmr_select_responsable on public.member_ministry_roles for select to authenticated
  using (public.is_pastoral_responsable_of(profile_id));

-- 5d) member_canonical_axis_changes — audit : lecture responsable/own, écriture service_role, jamais modifiable
alter table public.member_canonical_axis_changes enable row level security;
alter table public.member_canonical_axis_changes force row level security;
revoke all on public.member_canonical_axis_changes from anon, authenticated;
grant select on public.member_canonical_axis_changes to authenticated;
grant select, insert on public.member_canonical_axis_changes to service_role;  -- append-only (pas d'update/delete)
-- MAJOR-2 : le MEMBRE ne lit PAS son propre audit (justification/actor/provenance =
-- raisonnement pastoral interne). Aucune policy 'own' ici. Lecture = responsables uniquement
-- (+ service_role via bypass). Une éventuelle vue caviardée pour le membre relèverait de 3C.
drop policy if exists mcac_select_own on public.member_canonical_axis_changes;
drop policy if exists mcac_select_responsable on public.member_canonical_axis_changes;
create policy mcac_select_responsable on public.member_canonical_axis_changes for select to authenticated
  using (public.is_pastoral_responsable_of(profile_id));

notify pgrst, 'reload schema';
