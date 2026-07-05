-- ============================================================================
-- COMMUNAUTÉ V1 — SCHÉMA (Supabase SQL Editor). Additif, idempotent, sans perte.
-- Chantier 3 · Lot 1. Étend public.groupes + public.membres_groupe.
-- Décisions : modèle canonique unique, cellule = type, plateforme obligatoire,
-- responsable_id = référence principale (leader_id devient miroir legacy),
-- niveau (default 1), is_primary (groupe principal unique par membre).
-- ============================================================================

-- 1) GROUPES — colonnes additives ------------------------------------------------
alter table public.groupes add column if not exists responsable_id uuid references public.profiles(id) on delete set null;
alter table public.groupes add column if not exists parent_id uuid references public.groupes(id) on delete set null;
alter table public.groupes add column if not exists niveau integer not null default 1;
alter table public.groupes add column if not exists code text;
alter table public.groupes add column if not exists pays text;
alter table public.groupes add column if not exists ville text;
alter table public.groupes add column if not exists zone text;
alter table public.groupes add column if not exists capacite_max integer;

-- Élargit les types autorisés (ajoute equipe_ministere). Idempotent.
alter table public.groupes drop constraint if exists groupes_type_check;
alter table public.groupes add constraint groupes_type_check
  check (type in ('cellule','groupe_priere','equipe_service','equipe_ministere','formation','departement'));

-- responsable_id = référence canonique ; backfill depuis leader_id legacy.
update public.groupes set responsable_id = leader_id
  where responsable_id is null and leader_id is not null;

-- plateforme_id OBLIGATOIRE — appliqué seulement si aucune ligne nulle (défensif).
do $$ begin
  if not exists (select 1 from public.groupes where plateforme_id is null) then
    alter table public.groupes alter column plateforme_id set not null;
  end if;
exception when others then null; end $$;

-- code unique (quand renseigné).
create unique index if not exists uq_groupes_code on public.groupes (code) where code is not null;

-- Index de scoping / lecture.
create index if not exists idx_groupes_plateforme on public.groupes (plateforme_id, statut);
create index if not exists idx_groupes_pays on public.groupes (pays, ville);
create index if not exists idx_groupes_parent on public.groupes (parent_id);
create index if not exists idx_groupes_responsable on public.groupes (responsable_id);

-- 2) MEMBRES_GROUPE — colonnes additives ----------------------------------------
alter table public.membres_groupe add column if not exists is_primary boolean not null default false;
alter table public.membres_groupe add column if not exists statut text not null default 'actif';
alter table public.membres_groupe add column if not exists date_sortie timestamptz;
alter table public.membres_groupe add column if not exists updated_at timestamptz not null default now();

alter table public.membres_groupe drop constraint if exists membres_groupe_statut_check;
alter table public.membres_groupe add constraint membres_groupe_statut_check
  check (statut in ('actif','en_attente','sorti'));

create index if not exists idx_membres_groupe_groupe on public.membres_groupe (groupe_id, statut);
create index if not exists idx_membres_groupe_user on public.membres_groupe (user_id);
-- Index de lookup du groupe principal (l'unicité est garantie par trigger, cf. §3).
create index if not exists idx_membres_groupe_primary on public.membres_groupe (user_id) where is_primary;

-- 3) TRIGGERS -------------------------------------------------------------------

-- a) responsable_id = source de vérité ; leader_id reste un miroir legacy.
create or replace function public.tg_groupes_responsable_sync() returns trigger
language plpgsql as $$
begin
  if new.responsable_id is null and new.leader_id is not null then
    new.responsable_id := new.leader_id;
  end if;
  new.leader_id := new.responsable_id;
  return new;
end; $$;
drop trigger if exists trg_groupes_responsable_sync on public.groupes;
create trigger trg_groupes_responsable_sync
  before insert or update on public.groupes
  for each row execute function public.tg_groupes_responsable_sync();

-- b) membres_count = nombre d'appartenances ACTIVES.
create or replace function public.tg_membres_count() returns trigger
language plpgsql as $$
declare gid uuid;
begin
  gid := coalesce(new.groupe_id, old.groupe_id);
  update public.groupes set membres_count = (
    select count(*) from public.membres_groupe where groupe_id = gid and statut = 'actif'
  ) where id = gid;
  return null;
end; $$;
drop trigger if exists trg_membres_count on public.membres_groupe;
create trigger trg_membres_count
  after insert or update or delete on public.membres_groupe
  for each row execute function public.tg_membres_count();

-- c) is_primary unique par membre + sync profiles.groupe_cellule_id si cellule.
--    (AFTER : on dé-marque les autres ; pas de récursion car is_primary=false.)
create or replace function public.tg_membres_primary() returns trigger
language plpgsql as $$
begin
  if new.is_primary then
    update public.membres_groupe set is_primary = false
      where user_id = new.user_id and groupe_id <> new.groupe_id and is_primary;
    update public.profiles p set groupe_cellule_id = new.groupe_id
      from public.groupes g
      where g.id = new.groupe_id and g.type = 'cellule' and p.id = new.user_id;
  end if;
  return null;
end; $$;
drop trigger if exists trg_membres_primary on public.membres_groupe;
create trigger trg_membres_primary
  after insert or update of is_primary on public.membres_groupe
  for each row execute function public.tg_membres_primary();

-- d) updated_at sur mise à jour d'appartenance.
create or replace function public.tg_membres_touch() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists trg_membres_touch on public.membres_groupe;
create trigger trg_membres_touch
  before update on public.membres_groupe
  for each row execute function public.tg_membres_touch();

-- 4) RLS ------------------------------------------------------------------------
-- Lecture annuaire (groupes actifs) pour les authentifiés ; écriture = service role.
alter table public.groupes enable row level security;
drop policy if exists groupes_read on public.groupes;
create policy groupes_read on public.groupes
  for select to authenticated using (statut = 'actif');

-- Un membre lit SES appartenances ; écriture = service role (API scopée).
alter table public.membres_groupe enable row level security;
drop policy if exists membres_groupe_self_read on public.membres_groupe;
create policy membres_groupe_self_read on public.membres_groupe
  for select to authenticated using (user_id = auth.uid());

notify pgrst, 'reload schema';
