-- =============================================================================
-- CHAPELLE — 11. Fonctions RBAC (helpers réutilisés par TOUTES les RLS)
-- =============================================================================
-- Principe (core §6.2) : droit effectif = max(niveau global, niveau membership).
-- Fonctions SECURITY DEFINER + search_path figé (sécurité).
-- =============================================================================
set search_path = chapelle, public;

-- Rang hiérarchique d'un rôle (immuable — n'exige pas la table roles seedée)
create or replace function chapelle.role_level(r chapelle.role_key)
returns integer
language sql
immutable
as $$
  select case r
    when 'visiteur'               then 0
    when 'membre'                 then 10
    when 'serviteur'              then 20
    when 'leader_cellule'         then 30
    when 'responsable_plateforme' then 40
    when 'pasteur'                then 90
    when 'admin'                  then 100
    else 0
  end;
$$;

-- members.id du compte connecté (null si visiteur anonyme)
create or replace function chapelle.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = chapelle, public, pg_temp
as $$
  select id from chapelle.members where auth_user_id = auth.uid();
$$;

-- Rôle global de l'utilisateur courant (défaut visiteur)
create or replace function chapelle.current_global_role()
returns chapelle.role_key
language sql
stable
security definer
set search_path = chapelle, public, pg_temp
as $$
  select coalesce(
    (select role_global from chapelle.members where auth_user_id = auth.uid()),
    'visiteur'::chapelle.role_key
  );
$$;

-- L'utilisateur a-t-il au moins ce rôle GLOBAL ?
create or replace function chapelle.has_global_role(min_role chapelle.role_key)
returns boolean
language sql
stable
security definer
set search_path = chapelle, public, pg_temp
as $$
  select chapelle.role_level(chapelle.current_global_role()) >= chapelle.role_level(min_role);
$$;

-- L'utilisateur a-t-il au moins ce rôle SUR LA PLATEFORME p (global OU membership) ?
create or replace function chapelle.has_platform_role(p uuid, min_role chapelle.role_key)
returns boolean
language sql
stable
security definer
set search_path = chapelle, public, pg_temp
as $$
  select greatest(
    chapelle.role_level(chapelle.current_global_role()),
    coalesce((
      select max(chapelle.role_level(m.role))
      from chapelle.memberships m
      where m.platform_id = p
        and m.member_id = chapelle.current_member_id()
    ), 0)
  ) >= chapelle.role_level(min_role);
$$;

-- platform_id depuis le slug (pratique pour les policies/seed)
create or replace function chapelle.platform_id(slug_in text)
returns uuid
language sql
stable
security definer
set search_path = chapelle, public, pg_temp
as $$
  select id from chapelle.platforms where slug = slug_in;
$$;

-- Cité du Refuge : l'utilisateur est-il affecté à ce dossier (référent ou assignment) ?
create or replace function chapelle.refuge_is_assigned(case_in uuid)
returns boolean
language sql
stable
security definer
set search_path = chapelle, public, pg_temp
as $$
  select exists (
    select 1 from chapelle.cite_refuge_cases c
    where c.id = case_in and c.accompagnateur_referent_id = chapelle.current_member_id()
  ) or exists (
    select 1 from chapelle.cite_refuge_assignments a
    where a.case_id = case_in
      and a.accompagnant_member_id = chapelle.current_member_id()
      and a.actif = true
  );
$$;
