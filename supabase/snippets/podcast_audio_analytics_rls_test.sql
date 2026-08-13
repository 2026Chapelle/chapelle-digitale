-- =============================================================================
-- PODCAST-4 — Tests RLS / immuabilité de audio_listening_events (§27)
-- =============================================================================
-- À exécuter en LOCAL (jamais en prod) après `supabase db reset` :
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/snippets/podcast_audio_analytics_rls_test.sql
-- Chaque bloc DO lève une exception si l'invariant de sécurité est violé.
-- Modèle de sécurité : écriture UNIQUEMENT via service_role (aucune policy
-- anon/authenticated, aucun grant) → append-only côté client, anti-spoof.
-- =============================================================================

begin;

-- ── Fixtures (rôle postgres/superuser = bypass RLS, simule le backend service_role) ──
insert into public.cms_podcasts (id, title, status, access_level)
values ('00000000-0000-0000-0000-0000000000e1', 'Épisode test PODCAST-4', 'published', 'public')
on conflict (id) do update set status = 'published';

-- 1) INSERT service_role/backend autorisé (bypass RLS) ------------------------
insert into public.audio_listening_events (podcast_id, event_type, position_seconds, percent_complete, access_context)
values ('00000000-0000-0000-0000-0000000000e1', 'play_start', 0, 0, 'public');

do $$
begin
  if (select count(*) from public.audio_listening_events
      where podcast_id = '00000000-0000-0000-0000-0000000000e1') <> 1 then
    raise exception 'FAIL: insert backend aurait dû créer 1 événement';
  end if;
  raise notice 'PASS: insert backend autorisé';
end $$;

-- 2) podcast_id inexistant rejeté par la FK ----------------------------------
do $$
begin
  begin
    insert into public.audio_listening_events (podcast_id, event_type)
    values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'play_start');
    raise exception 'FAIL: un podcast_id inexistant aurait dû être rejeté (FK)';
  exception when foreign_key_violation then
    raise notice 'PASS: podcast_id inexistant rejeté (FK)';
  end;
end $$;

-- 3) event_type invalide rejeté par le CHECK ---------------------------------
do $$
begin
  begin
    insert into public.audio_listening_events (podcast_id, event_type)
    values ('00000000-0000-0000-0000-0000000000e1', 'pause');
    raise exception 'FAIL: event_type invalide aurait dû être rejeté (CHECK)';
  exception when check_violation then
    raise notice 'PASS: event_type invalide rejeté (CHECK)';
  end;
end $$;

-- ── Bascule vers le rôle applicatif "authenticated" (RLS s'applique) ─────────
set local role authenticated;
-- Simule un utilisateur connecté quelconque.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- 4) INSERT direct par un membre REJETÉ (aucune policy/grant) -----------------
do $$
begin
  begin
    insert into public.audio_listening_events (podcast_id, event_type, user_id)
    values ('00000000-0000-0000-0000-0000000000e1', 'play_start', '22222222-2222-2222-2222-222222222222');
    raise exception 'FAIL: un membre NE DOIT PAS pouvoir insérer (ni spoofer user_id)';
  exception when insufficient_privilege then
    raise notice 'PASS: insert membre refusé (anti-spoof, écriture serveur only)';
  end;
end $$;

-- 5) UPDATE par un membre REJETÉ (immuabilité) -------------------------------
do $$
begin
  begin
    update public.audio_listening_events set percent_complete = 100
    where podcast_id = '00000000-0000-0000-0000-0000000000e1';
    raise exception 'FAIL: un membre NE DOIT PAS pouvoir modifier un événement';
  exception when insufficient_privilege then
    raise notice 'PASS: update membre refusé (append-only)';
  end;
end $$;

-- 6) DELETE par un membre REJETÉ (immuabilité) -------------------------------
do $$
begin
  begin
    delete from public.audio_listening_events
    where podcast_id = '00000000-0000-0000-0000-0000000000e1';
    raise exception 'FAIL: un membre NE DOIT PAS pouvoir supprimer un événement';
  exception when insufficient_privilege then
    raise notice 'PASS: delete membre refusé (append-only)';
  end;
end $$;

-- 7) SELECT par un membre REJETÉ (aucune lecture directe ; agrégats via service_role) --
do $$
declare n integer;
begin
  begin
    select count(*) into n from public.audio_listening_events;
    -- RLS sans policy → 0 ligne visible (pas d'erreur, mais aucune fuite).
    if n <> 0 then
      raise exception 'FAIL: un membre ne doit voir AUCUN événement (vu: %)', n;
    end if;
    raise notice 'PASS: lecture membre = 0 ligne (aucune fuite analytics)';
  exception when insufficient_privilege then
    raise notice 'PASS: lecture membre refusée (insufficient_privilege)';
  end;
end $$;

reset role;

-- 8) Dataset : les agrégats se calculent en applicatif (lib pure) — ici on
--    vérifie seulement que la seule ligne backend subsiste, intacte.
do $$
begin
  if (select count(*) from public.audio_listening_events) <> 1 then
    raise exception 'FAIL: aucune écriture membre n''aurait dû aboutir (attendu 1 ligne)';
  end if;
  raise notice 'PASS: table intacte (1 seul événement, écrit par le backend)';
end $$;

rollback;  -- aucun résidu : test non destructif
