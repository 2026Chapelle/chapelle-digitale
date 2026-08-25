-- =============================================================================
-- 6A-1 — Editorial Intelligence foundation schema checks (§ only local)
-- =============================================================================
-- Intended to run locally after `supabase db reset` if a disposable DB exists.
-- No remote execution. No production execution.
-- =============================================================================

begin;

do $$
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
end $$;

rollback;
