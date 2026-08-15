-- =============================================================================
-- PODCAST-5B — Tests entitlement Premium (RLS + règle d'activité + anti-spoof)
-- =============================================================================
-- LOCAL uniquement, après `supabase db reset` :
--   docker exec -i supabase_db_cier-platform psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/snippets/podcast_premium_entitlement_test.sql
-- BEGIN/ROLLBACK → non destructif. Chaque bloc DO lève si un invariant est violé.
-- =============================================================================

begin;

-- ── Fixtures : 2 utilisateurs auth ──────────────────────────────────────────
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'premium-user@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'other-user@test.local')
on conflict (id) do nothing;

-- Droits (octroyés par le backend = rôle postgres/service_role).
insert into public.user_entitlements (user_id, entitlement_key, source_type, starts_at, expires_at, revoked_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'podcast_premium', 'admin', now() - interval '1 day', null, null);            -- actif à vie

-- 1) Règle d'activité via has_podcast_premium_access ------------------------------
do $$
begin
  if not public.has_podcast_premium_access('aaaaaaaa-0000-0000-0000-000000000001') then
    raise exception 'FAIL: droit actif aurait dû être PREMIUM';
  end if;
  if public.has_podcast_premium_access('bbbbbbbb-0000-0000-0000-000000000002') then
    raise exception 'FAIL: utilisateur sans droit ne doit PAS être premium';
  end if;
  raise notice 'PASS: actif → premium ; sans droit → non premium';
end $$;

-- 2) Expiré / révoqué / futur → non premium --------------------------------------
do $$
begin
  -- révoqué
  update public.user_entitlements set revoked_at = now() where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if public.has_podcast_premium_access('aaaaaaaa-0000-0000-0000-000000000001') then
    raise exception 'FAIL: droit révoqué ne doit PAS être premium';
  end if;
  raise notice 'PASS: révoqué → non premium';
  -- expiré
  update public.user_entitlements set revoked_at = null, expires_at = now() - interval '1 hour' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if public.has_podcast_premium_access('aaaaaaaa-0000-0000-0000-000000000001') then
    raise exception 'FAIL: droit expiré ne doit PAS être premium';
  end if;
  raise notice 'PASS: expiré → non premium';
  -- futur
  update public.user_entitlements set expires_at = null, starts_at = now() + interval '1 day' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if public.has_podcast_premium_access('aaaaaaaa-0000-0000-0000-000000000001') then
    raise exception 'FAIL: droit futur ne doit PAS être premium';
  end if;
  raise notice 'PASS: futur → non premium';
  -- retour à actif
  update public.user_entitlements set starts_at = now() - interval '1 day' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
end $$;

-- ── Bascule rôle applicatif « authenticated » (RLS) — user = premium-user ───────
-- NB : auth.uid() (Supabase) lit le GUC `request.jwt.claim.sub`, posé par PostgREST
-- à chaque requête ; on le simule ici.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

-- 3) Un membre LIT ses propres droits ------------------------------------------
do $$
declare n integer;
begin
  select count(*) into n from public.user_entitlements where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if n < 1 then raise exception 'FAIL: le membre doit voir SES droits (vu %)', n; end if;
  raise notice 'PASS: membre lit ses propres droits (%).', n;
end $$;

-- 4) Un membre NE VOIT PAS les droits d'autrui (isolation RLS) --------------------
do $$
declare n integer;
begin
  select count(*) into n from public.user_entitlements where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
  if n <> 0 then raise exception 'FAIL: fuite RLS — droits d''autrui visibles (vu %)', n; end if;
  raise notice 'PASS: isolation RLS (droits d''autrui invisibles)';
end $$;

-- 5) Un membre NE PEUT PAS s'accorder un droit (INSERT refusé) --------------------
do $$
begin
  begin
    insert into public.user_entitlements (user_id, entitlement_key) values ('aaaaaaaa-0000-0000-0000-000000000001', 'podcast_premium');
    raise exception 'FAIL: un membre NE DOIT PAS pouvoir s''auto-accorder un droit';
  exception when insufficient_privilege then
    raise notice 'PASS: auto-octroi refusé (INSERT interdit)';
  end;
end $$;

-- 6) Un membre NE PEUT PAS modifier expiration/révocation (UPDATE refusé) ----------
do $$
begin
  begin
    update public.user_entitlements set expires_at = now() + interval '10 years' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
    raise exception 'FAIL: un membre NE DOIT PAS pouvoir modifier son droit';
  exception when insufficient_privilege then
    raise notice 'PASS: modification client refusée (UPDATE interdit)';
  end;
end $$;

-- 7) Un membre NE PEUT PAS appeler la primitive (résolution serveur only) ---------
do $$
begin
  begin
    perform public.has_podcast_premium_access('bbbbbbbb-0000-0000-0000-000000000002');
    raise exception 'FAIL: la primitive ne doit pas être exécutable par un client';
  exception when insufficient_privilege then
    raise notice 'PASS: primitive réservée au backend (service_role)';
  end;
end $$;

reset role;

-- 8) anon : aucun accès en lecture ----------------------------------------------
set local role anon;
do $$
declare n integer;
begin
  begin
    select count(*) into n from public.user_entitlements;
    if n <> 0 then raise exception 'FAIL: anon ne doit voir aucun droit (vu %)', n; end if;
    raise notice 'PASS: anon → 0 ligne';
  exception when insufficient_privilege then
    raise notice 'PASS: anon → accès refusé';
  end;
end $$;
reset role;

rollback;  -- non destructif
