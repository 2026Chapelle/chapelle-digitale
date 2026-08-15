-- =============================================================================
-- PODCAST-5A — Tests de rétention / maintenance (purge_audio_listening_events)
-- =============================================================================
-- LOCAL uniquement, après `supabase db reset` :
--   docker exec -i supabase_db_cier-platform psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/snippets/podcast_analytics_retention_test.sql
-- Chaque bloc DO lève une exception si un invariant est violé. BEGIN/ROLLBACK →
-- non destructif.
-- =============================================================================

begin;

-- ── Fixtures ────────────────────────────────────────────────────────────────
insert into public.cms_podcasts (id, title, status, access_level)
values ('00000000-0000-0000-0000-0000000000d1', 'Rétention test', 'published', 'public')
on conflict (id) do update set status = 'published';

-- Événements à différents âges (occurred_at explicite).
insert into public.audio_listening_events (podcast_id, event_type, occurred_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'play_start', now() - interval '1 day'),                       -- récent (et < 90j)
  ('00000000-0000-0000-0000-0000000000d1', 'play_start', now() - interval '60 days'),                     -- < 90j
  ('00000000-0000-0000-0000-0000000000d1', 'play_start', now() - interval '17 months'),                   -- < 18 mois → conservé
  ('00000000-0000-0000-0000-0000000000d1', 'play_start', now() - interval '18 months' + interval '1 hour'),-- juste sous la frontière → conservé
  ('00000000-0000-0000-0000-0000000000d1', 'play_start', now() - interval '18 months'),                   -- frontière EXACTE (= cutoff, pas < cutoff) → conservé
  ('00000000-0000-0000-0000-0000000000d1', 'play_start', now() - interval '18 months' - interval '1 day'),-- > 18 mois → supprimé
  ('00000000-0000-0000-0000-0000000000d1', 'completed',  now() - interval '3 years');                      -- très vieux → supprimé

-- 1) Garde-fou : rétention < 90 jours REJETÉE ------------------------------------
do $$
begin
  begin
    perform public.purge_audio_listening_events(interval '30 days');
    raise exception 'FAIL: une rétention de 30 jours aurait dû être refusée';
  exception when check_violation then
    raise notice 'PASS: rétention < 90 jours refusée (protection données récentes)';
  end;
end $$;

-- 2) Fenêtre 90 jours AVANT purge (référence dashboard) --------------------------
do $$
declare n integer;
begin
  select count(*) into n from public.audio_listening_events
  where podcast_id = '00000000-0000-0000-0000-0000000000d1' and occurred_at >= now() - interval '90 days';
  if n <> 2 then raise exception 'FAIL: attendu 2 events < 90j avant purge, vu %', n; end if;
  raise notice 'PASS: 2 events dans la fenêtre 90 jours (référence)';
end $$;

-- 3) Purge 18 mois : supprime exactement les 2 plus vieux -----------------------
do $$
declare d integer;
begin
  d := public.purge_audio_listening_events(interval '18 months');
  if d <> 2 then raise exception 'FAIL: attendu 2 suppressions, vu %', d; end if;
  raise notice 'PASS: purge 18 mois a supprimé 2 events (> 18 mois)';
end $$;

-- 4) Les 5 events ≤ 18 mois sont CONSERVÉS (dont la frontière exacte) ------------
do $$
declare n integer;
begin
  select count(*) into n from public.audio_listening_events
  where podcast_id = '00000000-0000-0000-0000-0000000000d1';
  if n <> 5 then raise exception 'FAIL: attendu 5 events conservés, vu %', n; end if;
  raise notice 'PASS: 5 events ≤ 18 mois conservés (frontière exacte incluse)';
end $$;

-- 5) Fenêtre 90 jours INCHANGÉE après purge (dashboard correct) ------------------
do $$
declare n integer;
begin
  select count(*) into n from public.audio_listening_events
  where podcast_id = '00000000-0000-0000-0000-0000000000d1' and occurred_at >= now() - interval '90 days';
  if n <> 2 then raise exception 'FAIL: fenêtre 90j altérée par la purge, vu %', n; end if;
  raise notice 'PASS: fenêtre 90 jours intacte après maintenance (metrics 7/30/90 sûres)';
end $$;

-- 6) Idempotence : 2e passage supprime 0 ----------------------------------------
do $$
declare d integer;
begin
  d := public.purge_audio_listening_events(interval '18 months');
  if d <> 0 then raise exception 'FAIL: 2e passage aurait dû supprimer 0, vu %', d; end if;
  raise notice 'PASS: purge idempotente (2e passage = 0 suppression)';
end $$;

-- 7) Défaut = 18 mois (appel sans argument équivalent) --------------------------
do $$
declare d integer;
begin
  d := public.purge_audio_listening_events();   -- p_retention null → défaut 18 mois
  if d <> 0 then raise exception 'FAIL: purge défaut aurait dû supprimer 0 (déjà purgé), vu %', d; end if;
  raise notice 'PASS: purge par défaut = 18 mois (idempotente ici)';
end $$;

-- 8) Un CLIENT ne peut PAS déclencher la purge ----------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$
begin
  begin
    perform public.purge_audio_listening_events(interval '18 months');
    raise exception 'FAIL: un client authentifié NE DOIT PAS pouvoir purger';
  exception when insufficient_privilege then
    raise notice 'PASS: purge refusée au client (service_role only)';
  end;
end $$;
reset role;

rollback;  -- non destructif
