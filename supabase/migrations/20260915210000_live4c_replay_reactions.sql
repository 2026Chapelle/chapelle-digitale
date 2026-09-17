begin;

do $live4c_reactions$
begin
  if exists (
    select 1 from public.live_replay_reactions limit 1
  ) then
    raise exception 'live4c_replay_reactions_not_empty';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.live_replay_reactions'::regclass
      and conname = 'live_replay_reactions_pkey'
      and contype = 'p'
      and lower(pg_get_constraintdef(oid)) =
        'primary key (cms_live_id, actor_key, reaction)'
  ) then
    raise exception 'live4c_replay_reactions_pkey_mismatch';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.live_replay_reactions'::regclass
      and conname = 'live_replay_reactions_reaction_check'
      and contype = 'c'
      and lower(pg_get_constraintdef(oid)) like '%prayer%'
      and lower(pg_get_constraintdef(oid)) like '%fire%'
      and lower(pg_get_constraintdef(oid)) like '%heart%'
      and lower(pg_get_constraintdef(oid)) like '%praise%'
      and lower(pg_get_constraintdef(oid)) like '%kingdom%'
  ) then
    raise exception 'live4c_replay_reactions_check_mismatch';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.organization_units'::regclass
      and conname = 'organization_units_org_id_unique'
      and contype = 'u'
      and lower(pg_get_constraintdef(oid)) =
        'unique (organization_id, id)'
  ) then
    raise exception 'live4c_organization_units_candidate_key_missing';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cms_lives'
      and column_name in ('organization_id', 'organization_unit_id')
  ) then
    raise exception 'live4c_cms_lives_organization_columns_already_exist';
  end if;

  if to_regclass('public.live_replay_reaction_settings') is not null then
    raise exception 'live4c_replay_reaction_settings_already_exists';
  end if;

  if to_regprocedure('public.cms_touch_updated_at()') is null then
    raise exception 'live4c_cms_touch_updated_at_missing';
  end if;
end
$live4c_reactions$;

alter table public.live_replay_reactions
  drop constraint live_replay_reactions_pkey;

alter table public.live_replay_reactions
  drop constraint live_replay_reactions_reaction_check;

alter table public.live_replay_reactions
  add constraint live_replay_reactions_reaction_check
  check (reaction in ('amen', 'receive', 'glory', 'thanks'));

alter table public.live_replay_reactions
  add constraint live_replay_reactions_pkey
  primary key (cms_live_id, actor_key);

alter table public.cms_lives
  add column organization_id uuid,
  add column organization_unit_id uuid,
  add constraint cms_lives_replay_unit_pair_check check (
    (organization_id is null and organization_unit_id is null)
    or (organization_id is not null and organization_unit_id is not null)
  ),
  add constraint cms_lives_replay_unit_org_fk
    foreign key (organization_id, organization_unit_id)
    references public.organization_units(organization_id, id)
    on delete restrict;

create index idx_cms_lives_replay_unit
  on public.cms_lives(organization_id, organization_unit_id)
  where organization_unit_id is not null;

create table public.live_replay_reaction_settings (
  cms_live_id uuid primary key
    references public.cms_lives(id)
    on delete cascade,
  enabled boolean not null default true,
  updated_by uuid
    references public.profiles(id)
    on delete set null,
  updated_at timestamptz not null default now()
);

create trigger trg_live_replay_reaction_settings_touch_updated_at
  before update on public.live_replay_reaction_settings
  for each row execute function public.cms_touch_updated_at();

alter table public.live_replay_reactions enable row level security;
alter table public.live_replay_reaction_settings enable row level security;
alter table public.live_replay_reaction_settings force row level security;
alter table public.live_replay_reactions force row level security;

revoke all on table public.live_replay_reactions
  from public, anon, authenticated;

revoke all on table public.live_replay_reaction_settings
  from public, anon, authenticated;

grant all on table public.live_replay_reaction_settings
  to service_role;

grant all on table public.live_replay_reactions
  to service_role;

-- ============================================================================
-- TASK 6D — ATOMIC REPLAY REACTION GUEST → MEMBER TRANSFER
-- ============================================================================

create or replace function public.live_replay_reaction_transfer(
  p_cms_live_id uuid,
  p_guest_actor_key text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $live4c_transfer$
declare
  v_member_actor_key text;
begin
  if p_cms_live_id is null or p_user_id is null then
    raise exception 'live4c_replay_reaction_transfer_invalid_identity';
  end if;

  if p_guest_actor_key is null
    or p_guest_actor_key !~ '^guest:[0-9a-f]{64}$'
  then
    raise exception 'live4c_replay_reaction_transfer_invalid_guest';
  end if;

  v_member_actor_key := 'member:' || p_user_id::text;

  perform actor_key
  from public.live_replay_reactions
  where cms_live_id = p_cms_live_id
    and actor_key in (p_guest_actor_key, v_member_actor_key)
  order by actor_key
  for update;

  if exists (
    select 1
    from public.live_replay_reactions
    where cms_live_id = p_cms_live_id
      and actor_key = v_member_actor_key
  ) then
    delete from public.live_replay_reactions
    where cms_live_id = p_cms_live_id
      and actor_key = p_guest_actor_key;
  else
    update public.live_replay_reactions
    set actor_key = v_member_actor_key,
        user_id = p_user_id,
        updated_at = now()
    where cms_live_id = p_cms_live_id
      and actor_key = p_guest_actor_key;
  end if;
end
$live4c_transfer$;

revoke all on function public.live_replay_reaction_transfer(uuid, text, uuid)
  from public, anon, authenticated;

grant execute on function public.live_replay_reaction_transfer(uuid, text, uuid)
  to service_role;

commit;
