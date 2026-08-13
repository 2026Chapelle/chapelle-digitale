-- =============================================================================
-- PODCAST-5C — Tests d'acquisition Premium (idempotence achat, durée, révocation)
-- =============================================================================
-- LOCAL uniquement, après `supabase db reset` :
--   docker exec -i supabase_db_cier-platform psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/snippets/podcast_premium_acquisition_test.sql
-- BEGIN/ROLLBACK → non destructif. Chaque bloc DO lève si un invariant est violé.
-- Dépend de PODCAST-5B (user_entitlements + has_podcast_premium_access).
-- =============================================================================

begin;

-- ── Fixtures ────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'buyer@test.local')
on conflict (id) do nothing;

-- Produit Premium canonique (mapping entitlement_key) + produit ordinaire.
insert into public.marketplace_products (id, titre, type, prix, entitlement_key, entitlement_duration_days) values
  ('dddddddd-0000-0000-0000-0000000000a1', 'Premium à vie', 'abonnement', 10000, 'podcast_premium', null),
  ('dddddddd-0000-0000-0000-0000000000a2', 'Ebook ordinaire', 'ebook', 2000, null, null);

-- 1) Contrainte durée : entitlement_duration_days <= 0 refusé ---------------------
do $$
begin
  begin
    insert into public.marketplace_products (titre, type, prix, entitlement_key, entitlement_duration_days)
      values ('Durée invalide', 'abonnement', 1, 'podcast_premium', 0);
    raise exception 'FAIL: une durée <= 0 aurait dû être refusée';
  exception when check_violation then
    raise notice 'PASS: durée <= 0 refusée (check)';
  end;
end $$;

-- 2) Achat confirmé → octroi entitlement (source_type=purchase) → PREMIUM ---------
insert into public.user_entitlements (user_id, entitlement_key, source_type, source_id, starts_at, expires_at)
  values ('cccccccc-0000-0000-0000-000000000001', 'podcast_premium', 'purchase',
          'dddddddd-0000-0000-0000-0000000000a1', now() - interval '1 minute', null);
do $$
begin
  if not public.has_podcast_premium_access('cccccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL: achat confirmé aurait dû accorder le Premium';
  end if;
  raise notice 'PASS: achat → premium actif';
end $$;

-- 3) Idempotence : même achat (même source_id) rejoué → conflit d'unicité ---------
do $$
begin
  begin
    insert into public.user_entitlements (user_id, entitlement_key, source_type, source_id, starts_at)
      values ('cccccccc-0000-0000-0000-000000000001', 'podcast_premium', 'purchase',
              'dddddddd-0000-0000-0000-0000000000a1', now());
    raise exception 'FAIL: un même achat rejoué NE DOIT PAS créer un second droit';
  exception when unique_violation then
    raise notice 'PASS: idempotence achat (uniq_entitlement_purchase_source)';
  end;
end $$;

-- 4) Un seul droit logique pour cet achat ----------------------------------------
do $$
declare n integer;
begin
  select count(*) into n from public.user_entitlements
   where source_type = 'purchase' and source_id = 'dddddddd-0000-0000-0000-0000000000a1';
  if n <> 1 then raise exception 'FAIL: attendu 1 droit pour l''achat, vu %', n; end if;
  raise notice 'PASS: 1 droit logique par achat';
end $$;

-- 5) Remboursement/révocation : pose revoked_at (audit) → DENIED ------------------
do $$
begin
  update public.user_entitlements set revoked_at = now()
   where source_type = 'purchase' and source_id = 'dddddddd-0000-0000-0000-0000000000a1';
  if public.has_podcast_premium_access('cccccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL: droit révoqué (remboursé) ne doit PAS rester premium';
  end if;
  -- la ligne existe toujours (pas de DELETE — audit préservé)
  perform 1 from public.user_entitlements
   where source_type = 'purchase' and source_id = 'dddddddd-0000-0000-0000-0000000000a1' and revoked_at is not null;
  if not found then raise exception 'FAIL: la ligne révoquée doit être conservée (audit)'; end if;
  raise notice 'PASS: révocation → denied + audit conservé';
end $$;

-- 6) Octroi ADMIN à durée limitée : actif tant que non expiré ---------------------
do $$
begin
  insert into public.user_entitlements (user_id, entitlement_key, source_type, starts_at, expires_at)
    values ('cccccccc-0000-0000-0000-000000000001', 'podcast_premium', 'admin', now() - interval '1 hour', now() + interval '30 days');
  if not public.has_podcast_premium_access('cccccccc-0000-0000-0000-000000000001') then
    raise exception 'FAIL: octroi admin actif (non expiré) aurait dû être premium';
  end if;
  raise notice 'PASS: octroi admin à durée → premium actif';
end $$;

-- 7) Deux droits « à vie actifs » pour le même membre → interdit (uniq lifetime) --
do $$
begin
  begin
    insert into public.user_entitlements (user_id, entitlement_key, source_type, starts_at, expires_at)
      values ('cccccccc-0000-0000-0000-000000000001', 'podcast_premium', 'admin', now(), null);
    insert into public.user_entitlements (user_id, entitlement_key, source_type, starts_at, expires_at)
      values ('cccccccc-0000-0000-0000-000000000001', 'podcast_premium', 'admin', now(), null);
    raise exception 'FAIL: deux droits à vie actifs ne doivent pas coexister';
  exception when unique_violation then
    raise notice 'PASS: pas de doublon de droit à vie actif (uniq_user_entitlement_lifetime)';
  end;
end $$;

-- 8) Colonnes de mapping exposées et cohérentes ----------------------------------
do $$
declare k text;
begin
  select entitlement_key into k from public.marketplace_products where id = 'dddddddd-0000-0000-0000-0000000000a1';
  if k is distinct from 'podcast_premium' then raise exception 'FAIL: mapping produit→entitlement absent'; end if;
  select entitlement_key into k from public.marketplace_products where id = 'dddddddd-0000-0000-0000-0000000000a2';
  if k is not null then raise exception 'FAIL: produit ordinaire ne doit accorder aucun droit'; end if;
  raise notice 'PASS: mapping produit→entitlement cohérent';
end $$;

rollback;  -- non destructif
