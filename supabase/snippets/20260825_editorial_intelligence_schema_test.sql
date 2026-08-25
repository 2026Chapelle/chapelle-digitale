-- =============================================================================
-- 6A-1 — Editorial Intelligence foundation schema checks (§ only local)
-- =============================================================================
-- Intended to run locally after `supabase db reset` if a disposable DB exists.
-- No remote execution. No production execution.
-- =============================================================================

begin;

do $$
declare
  table_name text;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'editorial_recommendations'
  ) then
    raise exception 'FAIL: editorial_recommendations table missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'editorial_recommendations'
      and column_name = 'parent_recommendation_id'
  ) then
    raise exception 'FAIL: parent_recommendation_id column missing';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'editorial_recommendations'
      and c.contype = 'f'
      and c.conname = 'editorial_recommendations_parent_recommendation_id_fkey'
  ) then
    raise exception 'FAIL: self-FK on parent_recommendation_id missing';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_index i on i.indexrelid = c.oid
    where n.nspname = 'public'
      and c.relname = 'editorial_recommendations_org_dedupe_key_key'
      and i.indisunique
  ) then
    raise exception 'FAIL: composite dedupe unique index missing';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'editorial_calendar_items'
  ) then
    raise exception 'FAIL: editorial_calendar_items must not exist in 6A v1';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'editorial_recommendations'
      and c.relrowsecurity
  ) then
    raise exception 'FAIL: RLS must be enabled on editorial_recommendations';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name in (
        'editorial_recommendations',
        'editorial_recommendation_events',
        'editorial_settings'
      )
      and g.grantee in ('PUBLIC', 'anon', 'authenticated')
  ) then
    raise exception 'FAIL: unauthorized table grants remain for PUBLIC/anon/authenticated';
  end if;

  for table_name in
    select unnest(array[
      'editorial_recommendations',
      'editorial_recommendation_events',
      'editorial_settings'
    ])
  loop
    if not (
      has_table_privilege('service_role', format('public.%I', table_name), 'SELECT')
      and has_table_privilege('service_role', format('public.%I', table_name), 'INSERT')
      and (
        table_name = 'editorial_recommendation_events'
        or has_table_privilege('service_role', format('public.%I', table_name), 'UPDATE')
      )
    ) then
      raise exception 'FAIL: required service_role table privileges missing for %', table_name;
    end if;

    if has_table_privilege('public', format('public.%I', table_name), 'SELECT')
      or has_table_privilege('public', format('public.%I', table_name), 'INSERT')
      or has_table_privilege('public', format('public.%I', table_name), 'UPDATE')
      or has_table_privilege('public', format('public.%I', table_name), 'DELETE')
      or has_table_privilege('public', format('public.%I', table_name), 'TRUNCATE')
      or has_table_privilege('public', format('public.%I', table_name), 'REFERENCES')
      or has_table_privilege('public', format('public.%I', table_name), 'TRIGGER')
      or has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
      or has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
      or has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
      or has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
      or has_table_privilege('anon', format('public.%I', table_name), 'TRUNCATE')
      or has_table_privilege('anon', format('public.%I', table_name), 'REFERENCES')
      or has_table_privilege('anon', format('public.%I', table_name), 'TRIGGER')
      or has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
      or has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
      or has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
      or has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
      or has_table_privilege('authenticated', format('public.%I', table_name), 'TRUNCATE')
      or has_table_privilege('authenticated', format('public.%I', table_name), 'REFERENCES')
      or has_table_privilege('authenticated', format('public.%I', table_name), 'TRIGGER')
    ) then
      raise exception 'FAIL: unexpected client-side table privilege detected for %', table_name;
    end if;
  end loop;
end $$;

rollback;
