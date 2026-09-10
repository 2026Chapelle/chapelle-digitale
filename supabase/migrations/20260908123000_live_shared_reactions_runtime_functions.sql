begin;
create or replace function public.live_reaction_window(p_times timestamptz[], p_time timestamptz) returns timestamptz[] language sql immutable security invoker set search_path = pg_catalog, public, pg_temp as $$
  select coalesce(array_agg(s order by ord), '{}'::timestamptz[]) from unnest(p_times) with ordinality as t(s, ord) where s > p_time - interval '10 seconds' and s <= p_time;
$$;
create or replace function public.live_reaction_record(p_live_key text, p_actor_key text, p_reaction text, p_validation_expires_at timestamptz) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public, pg_temp as $$
declare
  v_t timestamptz;
  v_kept timestamptz[];
  v_event uuid;
  v_retry bigint;
  v_run_created boolean := false;
  v_rate_limited jsonb;
begin
  set local lock_timeout = '1s';

  begin
    insert into public.live_reaction_runs(live_key)
      values(p_live_key)
      on conflict do nothing
      returning true into v_run_created;

    v_run_created := coalesce(v_run_created, false);

    perform 1
      from public.live_reaction_runs
      where live_key = p_live_key
      for share;

    if exists(
      select 1
        from public.live_reaction_runs
       where live_key = p_live_key
         and closed_at is not null
    ) then
      return jsonb_build_object('accepted', false, 'reason', 'closed');
    end if;

    insert into public.live_reaction_actor_limits(actor_key)
      values(p_actor_key)
      on conflict do nothing;

    select accepted_at
      into v_kept
      from public.live_reaction_actor_limits
     where actor_key = p_actor_key
     for update;

    v_t := clock_timestamp();

    if v_t > p_validation_expires_at then
      raise exception 'validation_expired';
    end if;

    v_kept := public.live_reaction_window(v_kept, v_t);

    if cardinality(v_kept) = 3 then
      v_retry := greatest(
        1,
        ceil(
          extract(
            epoch from (v_kept[1] + interval '10 seconds' - v_t)
          ) * 1000
        )::bigint
      );

      v_rate_limited := jsonb_build_object(
        'accepted', false,
        'reason', 'rate_limited',
        'retryAfterMs', v_retry
      );

      if v_run_created then
        raise exception using
          errcode = 'P4B01',
          message = 'live_reaction_rate_limited_first_touch';
      end if;

      return v_rate_limited;
    end if;

    update public.live_reaction_actor_limits
       set accepted_at = array_append(v_kept, v_t),
           updated_at = v_t
     where actor_key = p_actor_key;

    insert into public.live_reaction_actor_totals(
      live_key, actor_key, reaction, actions, first_at, last_at
    )
    values(
      p_live_key, p_actor_key, p_reaction, 1, v_t, v_t
    )
    on conflict (live_key, actor_key, reaction)
    do update
       set actions = public.live_reaction_actor_totals.actions + 1,
           last_at = excluded.last_at;

    insert into public.live_reaction_events (
      live_key, reaction, accepted_at
    )
    values(
      p_live_key, p_reaction, v_t
    )
    returning event_id into v_event;

    return jsonb_build_object(
      'accepted', true,
      'eventId', v_event,
      'acceptedAt', v_t,
      'remaining', 2 - cardinality(v_kept)
    );

  exception
    when sqlstate 'P4B01' then
      null;
  end;

  return v_rate_limited;
end $$;
create or replace function public.live_reaction_snapshot(p_live_key text) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public, pg_temp as $$
declare v_closed_at timestamptz; v_final_stats jsonb; v_stats jsonb; v_time timestamptz;
begin
  insert into public.live_reaction_runs(live_key) values (p_live_key) on conflict do nothing;
  select closed_at, final_stats into v_closed_at, v_final_stats from public.live_reaction_runs where live_key = p_live_key for share;
  if v_closed_at is not null then return jsonb_build_object('state', 'closed', 'liveKey', p_live_key, 'stats', v_final_stats, 'serverTime', clock_timestamp()); end if;
  select jsonb_build_object('uniqueActors', count(distinct actor_key), 'totalActions', coalesce(sum(actions), 0), 'uniqueByType', jsonb_build_object('prayer', count(*) filter (where reaction='prayer'), 'fire', count(*) filter (where reaction='fire'), 'heart', count(*) filter (where reaction='heart'), 'praise', count(*) filter (where reaction='praise'), 'kingdom', count(*) filter (where reaction='kingdom')), 'actionsByType', jsonb_build_object('prayer', coalesce(sum(actions) filter (where reaction='prayer'),0), 'fire', coalesce(sum(actions) filter (where reaction='fire'),0), 'heart', coalesce(sum(actions) filter (where reaction='heart'),0), 'praise', coalesce(sum(actions) filter (where reaction='praise'),0), 'kingdom', coalesce(sum(actions) filter (where reaction='kingdom'),0))), clock_timestamp() into v_stats, v_time from public.live_reaction_actor_totals where live_key = p_live_key;
  return jsonb_build_object('state', 'open', 'liveKey', p_live_key, 'stats', v_stats, 'serverTime', v_time);
end $$;
create or replace function public.live_reaction_admin_counts(p_live_key text) returns jsonb language sql security invoker set search_path = pg_catalog, public, pg_temp as $$
  select jsonb_build_object('uniqueActors', count(distinct actor_key), 'totalActions', coalesce(sum(actions),0), 'uniqueByType', jsonb_build_object('prayer', count(*) filter(where reaction='prayer'),'fire',count(*) filter(where reaction='fire'),'heart',count(*) filter(where reaction='heart'),'praise',count(*) filter(where reaction='praise'),'kingdom',count(*) filter(where reaction='kingdom')), 'actionsByType', jsonb_build_object('prayer',coalesce(sum(actions) filter(where reaction='prayer'),0),'fire',coalesce(sum(actions) filter(where reaction='fire'),0),'heart',coalesce(sum(actions) filter(where reaction='heart'),0),'praise',coalesce(sum(actions) filter(where reaction='praise'),0),'kingdom',coalesce(sum(actions) filter(where reaction='kingdom'),0))) from public.live_reaction_actor_totals where live_key=p_live_key;
$$;
create or replace function public.live_reaction_finalize(p_live_key text) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public, pg_temp as $$
declare v_closed_at timestamptz; v_stats jsonb;
begin
  select closed_at, final_stats into v_closed_at, v_stats from public.live_reaction_runs where live_key = p_live_key for update;
  if not found then return jsonb_build_object('state', 'not_recorded'); end if;
  if v_closed_at is not null then return jsonb_build_object('state', 'final', 'liveKey', p_live_key, 'stats', v_stats); end if;
  select jsonb_build_object('uniqueActors', count(distinct actor_key), 'totalActions', coalesce(sum(actions), 0), 'uniqueByType', jsonb_build_object('prayer', count(*) filter (where reaction='prayer'), 'fire', count(*) filter (where reaction='fire'), 'heart', count(*) filter (where reaction='heart'), 'praise', count(*) filter (where reaction='praise'), 'kingdom', count(*) filter (where reaction='kingdom')), 'actionsByType', jsonb_build_object('prayer', coalesce(sum(actions) filter (where reaction='prayer'),0), 'fire', coalesce(sum(actions) filter (where reaction='fire'),0), 'heart', coalesce(sum(actions) filter (where reaction='heart'),0), 'praise', coalesce(sum(actions) filter (where reaction='praise'),0), 'kingdom', coalesce(sum(actions) filter (where reaction='kingdom'),0))) into v_stats from public.live_reaction_actor_totals where live_key = p_live_key;
  update public.live_reaction_runs set closed_at = clock_timestamp(), final_stats = v_stats where live_key = p_live_key;
  return jsonb_build_object('state', 'final', 'liveKey', p_live_key, 'stats', v_stats);
end $$;
revoke all on function public.live_reaction_record(text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.live_reaction_record(text,text,text,timestamptz) to service_role;
revoke all on function public.live_reaction_window(timestamptz[], timestamptz) from public, anon, authenticated;
grant execute on function public.live_reaction_window(timestamptz[], timestamptz) to service_role;
revoke all on function public.live_reaction_snapshot(text) from public, anon, authenticated;
grant execute on function public.live_reaction_snapshot(text) to service_role;
revoke all on function public.live_reaction_admin_counts(text) from public, anon, authenticated;
grant execute on function public.live_reaction_admin_counts(text) to service_role;
revoke all on function public.live_reaction_finalize(text) from public, anon, authenticated;
grant execute on function public.live_reaction_finalize(text) to service_role;
commit;
