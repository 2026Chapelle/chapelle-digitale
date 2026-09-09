-- CITADELLE — LIVE 4B.1
-- Shared reaction foundation. This migration is versioned only; it is not
-- applied by this task.

begin;

create or replace function public.live_reaction_stats_valid(value jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  reaction_key text;
  unique_value numeric;
  action_value numeric;
  unique_actors numeric;
  total_actions numeric;
  unique_sum numeric := 0;
  actions_sum numeric := 0;
begin
  if value is null
     or jsonb_typeof(value) <> 'object'
     or value - array['uniqueActors', 'totalActions', 'uniqueByType', 'actionsByType'] <> '{}'::jsonb
     or not (value ?& array['uniqueActors', 'totalActions', 'uniqueByType', 'actionsByType'])
     or jsonb_typeof(value -> 'uniqueByType') <> 'object'
     or jsonb_typeof(value -> 'actionsByType') <> 'object'
     or (value -> 'uniqueByType') - array['prayer', 'fire', 'heart', 'praise', 'kingdom'] <> '{}'::jsonb
     or (value -> 'actionsByType') - array['prayer', 'fire', 'heart', 'praise', 'kingdom'] <> '{}'::jsonb
     or not ((value -> 'uniqueByType') ?& array['prayer', 'fire', 'heart', 'praise', 'kingdom'])
     or not ((value -> 'actionsByType') ?& array['prayer', 'fire', 'heart', 'praise', 'kingdom'])
     or jsonb_typeof(value -> 'uniqueActors') <> 'number'
     or jsonb_typeof(value -> 'totalActions') <> 'number'
  then
    return false;
  end if;

  begin
    unique_actors := (value ->> 'uniqueActors')::numeric;
    total_actions := (value ->> 'totalActions')::numeric;
  exception when others then
    return false;
  end;

  if unique_actors < 0
     or total_actions < 0
     or unique_actors <> trunc(unique_actors)
     or total_actions <> trunc(total_actions)
     or unique_actors > 9223372036854775807
     or total_actions > 9223372036854775807
  then
    return false;
  end if;

  foreach reaction_key in array array['prayer', 'fire', 'heart', 'praise', 'kingdom']
  loop
    if jsonb_typeof(value -> 'uniqueByType' -> reaction_key) <> 'number'
       or jsonb_typeof(value -> 'actionsByType' -> reaction_key) <> 'number'
    then
      return false;
    end if;

    begin
      unique_value := (value -> 'uniqueByType' ->> reaction_key)::numeric;
      action_value := (value -> 'actionsByType' ->> reaction_key)::numeric;
    exception when others then
      return false;
    end;

    if unique_value < 0
       or action_value < 0
       or unique_value <> trunc(unique_value)
       or action_value <> trunc(action_value)
       or unique_value > 9223372036854775807
       or action_value > 9223372036854775807
       or action_value < unique_value
    then
      return false;
    end if;

    unique_sum := unique_sum + unique_value;
    actions_sum := actions_sum + action_value;
  end loop;

  return actions_sum = total_actions
     and unique_actors >= greatest(
       (value -> 'uniqueByType' ->> 'prayer')::numeric,
       (value -> 'uniqueByType' ->> 'fire')::numeric,
       (value -> 'uniqueByType' ->> 'heart')::numeric,
       (value -> 'uniqueByType' ->> 'praise')::numeric,
       (value -> 'uniqueByType' ->> 'kingdom')::numeric
     )
     and unique_actors <= unique_sum;
end;
$$;

create or replace function public.live_reaction_times_valid(value timestamptz[])
returns boolean
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  item timestamptz;
  previous timestamptz;
begin
  if value is null then
    return false;
  end if;

  if cardinality(value) = 0 then
    return array_ndims(value) is null;
  end if;

  if array_ndims(value) <> 1
     or array_lower(value, 1) <> 1
     or cardinality(value) > 3
  then
    return false;
  end if;

  foreach item in array value
  loop
    if item is null or not isfinite(item) then
      return false;
    end if;

    if previous is not null and item < previous then
      return false;
    end if;

    previous := item;
  end loop;

  return true;
end;
$$;

create table public.live_reaction_runs (
  live_key text primary key
    check (live_key ~ '^youtube:[A-Za-z0-9_-]{11}$'),
  opened_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz,
  final_stats jsonb,
  check (isfinite(opened_at)),
  check ((closed_at is null) = (final_stats is null)),
  check (closed_at is null or (isfinite(closed_at) and closed_at >= opened_at)),
  check (final_stats is null or public.live_reaction_stats_valid(final_stats))
);

create table public.live_reaction_actor_limits (
  actor_key text primary key
    check (actor_key ~ '^(member:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|guest:[0-9a-f]{64})$'),
  accepted_at timestamptz[] not null default '{}'::timestamptz[],
  updated_at timestamptz not null default clock_timestamp(),
  check (public.live_reaction_times_valid(accepted_at)),
  check (isfinite(updated_at))
);

create table public.live_reaction_actor_totals (
  live_key text not null references public.live_reaction_runs(live_key) on delete restrict,
  actor_key text not null
    check (actor_key ~ '^(member:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|guest:[0-9a-f]{64})$'),
  reaction text not null
    check (reaction in ('prayer', 'fire', 'heart', 'praise', 'kingdom')),
  actions bigint not null check (actions >= 1),
  first_at timestamptz not null,
  last_at timestamptz not null,
  check (isfinite(first_at) and isfinite(last_at) and last_at >= first_at),
  primary key (live_key, actor_key, reaction)
);

create table public.live_reaction_events (
  event_id uuid primary key default gen_random_uuid(),
  live_key text not null references public.live_reaction_runs(live_key) on delete restrict,
  reaction text not null
    check (reaction in ('prayer', 'fire', 'heart', 'praise', 'kingdom')),
  accepted_at timestamptz not null default clock_timestamp(),
  check (isfinite(accepted_at))
);

create index idx_live_reaction_totals_type
  on public.live_reaction_actor_totals (live_key, reaction) include (actions);

create index idx_live_reaction_events_time
  on public.live_reaction_events (live_key, accepted_at desc, event_id);

alter table public.live_reaction_runs enable row level security;
alter table public.live_reaction_actor_limits enable row level security;
alter table public.live_reaction_actor_totals enable row level security;
alter table public.live_reaction_events enable row level security;

revoke all on table public.live_reaction_runs from public, anon, authenticated, service_role;
revoke all on table public.live_reaction_actor_limits from public, anon, authenticated, service_role;
revoke all on table public.live_reaction_actor_totals from public, anon, authenticated, service_role;
revoke all on table public.live_reaction_events from public, anon, authenticated, service_role;

grant select, insert, update on table public.live_reaction_runs to service_role;
grant select, insert, update on table public.live_reaction_actor_limits to service_role;
grant select, insert, update on table public.live_reaction_actor_totals to service_role;
grant select, insert on table public.live_reaction_events to service_role;

grant select on table public.live_reaction_events to anon, authenticated;

create policy live_reaction_events_recent_read
  on public.live_reaction_events
  for select
  to anon, authenticated
  using (
    accepted_at > statement_timestamp() - interval '60 seconds'
    and accepted_at <= statement_timestamp()
  );

revoke all on function public.live_reaction_stats_valid(jsonb) from public, anon, authenticated;
revoke all on function public.live_reaction_times_valid(timestamptz[]) from public, anon, authenticated;
grant execute on function public.live_reaction_stats_valid(jsonb) to service_role;
grant execute on function public.live_reaction_times_valid(timestamptz[]) to service_role;

do $$
begin
  if not exists (
    select 1
      from pg_catalog.pg_publication
     where pubname = 'supabase_realtime'
  ) then
    raise exception 'live_reactions_publication_missing';
  end if;

  if not exists (
    select 1
      from pg_catalog.pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'live_reaction_events'
  ) then
    alter publication supabase_realtime add table public.live_reaction_events;
  end if;
end;
$$;

commit;
