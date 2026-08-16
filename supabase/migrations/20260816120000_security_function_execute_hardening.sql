-- ============================================================================
-- 20260816120000_security_function_execute_hardening.sql
-- Normalisation ADDITIVE des privilèges EXECUTE des fonctions SECURITY DEFINER.
-- ----------------------------------------------------------------------------
-- CAUSE : sur un vrai projet Supabase, ALTER DEFAULT PRIVILEGES accorde EXECUTE
-- aux rôles anon + authenticated sur toute NOUVELLE fonction. Une migration qui
-- ne fait que `revoke ... from public` laisse donc anon/authenticated capables
-- d'exécuter la fonction (le `db reset` local ne reproduit pas ce grant par
-- défaut, d'où l'invisibilité en local). Vérification DISTANTE read-only :
-- 31 fonctions SECURITY DEFINER étaient anon/authenticated-exécutables en prod
-- (+ 2 fonctions premium créées par la vague précédente, même motif).
--
-- PRINCIPE (prouvé) : révoquer anon/authenticated SEUL est un NO-OP tant que le
-- grant PUBLIC subsiste → chaque REVOKE inclut PUBLIC. Signatures exactes
-- (un mauvais signature = no-op silencieux). Chaque instruction est gardée par
-- to_regprocedure() : idempotent et sûr si une fonction n'existe pas dans un
-- environnement donné (ex. has_premium_access = objet hors-migration présent
-- uniquement en prod).
--
-- MODÈLES (audit 3 agents, validé contre les grants de PROD) :
--   A = service_role only        : revoke public/anon/authenticated + grant service_role
--   B = authenticated helper      : revoke public/anon        + grant authenticated, service_role
--   C = trigger / interne (verrou): revoke public/anon/authenticated (aucun grant requis)
--   EXCLUS (conservent anon, load-bearing prouvé) :
--     public.is_staff()                — policies RLS TO public sur tables legacy lisibles par anon
--     public.playlist_visible_to_me(uuid) — policy `..._read_anon` TO anon sur audio_playlist_*
--     public.academy_verify_credential(text) — vérif publique de diplôme par code (anon volontaire)
--
-- DEFAULT PRIVILEGES : un `ALTER DEFAULT PRIVILEGES ... REVOKE ... FROM anon,
-- authenticated` n'est PAS inclus : impossible de prouver qu'il ne casse pas les
-- attentes plateforme Supabase ni les futures fonctions helper qui requièrent
-- volontairement anon/authenticated (is_staff, playlist_visible_to_me, ...).
-- Durcissement explicite par fonction uniquement.
-- Additif & idempotent. Aucune donnée touchée. Aucune fonction redéfinie.
-- ============================================================================

-- ── MODÈLE A — service_role only ────────────────────────────────────────────
do $$
declare sig text;
begin
  foreach sig in array array[
    'public.pastoral_member_signals(text)',
    'public.membres_inactifs(integer, integer)',
    'public.purge_audio_listening_events(interval)',
    'public.discipulat_recompute(uuid, uuid)',
    'public.has_premium_access(uuid)',
    'public.has_entitlement(uuid, text)',
    'public.has_podcast_premium_access(uuid)',
    'chapelle.admin_dashboard(text)'
  ]
  loop
    if to_regprocedure(sig) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', sig);
      execute format('grant execute on function %s to service_role', sig);
    end if;
  end loop;
end $$;

-- ── MODÈLE B — authenticated helper (revoke anon, garde authenticated) ───────
do $$
declare sig text;
begin
  foreach sig in array array[
    'chapelle.current_member_id()',
    'chapelle.has_global_role(chapelle.role_key)',
    'chapelle.has_platform_role(uuid, chapelle.role_key)',
    'chapelle.platform_id(text)',
    'chapelle.refuge_is_assigned(uuid)',
    'public.playlist_owned_by_me(uuid)',
    'public.erp_org_has_active_membership(uuid)',
    'public.erp_org_is_owner_or_admin(uuid)',
    'public.academy_assign_matricule(uuid)',
    'public.academy_complete_module(uuid)',
    'public.academy_quiz_public(uuid)',
    'public.academy_save_journal(uuid, text, text)',
    'public.academy_submit_quiz(uuid, jsonb)'
  ]
  loop
    if to_regprocedure(sig) is not null then
      execute format('revoke all on function %s from public, anon', sig);
      execute format('grant execute on function %s to authenticated, service_role', sig);
    end if;
  end loop;
end $$;

-- ── MODÈLE C — trigger / interne : verrou (aucun rôle API requis) ────────────
--   Fonctions trigger (s'exécutent au titre du propriétaire, EXECUTE non vérifié)
--   ou appelées uniquement par d'autres fonctions SECURITY DEFINER (contexte
--   propriétaire). service_role n'est pas requis ; non accordé (moindre surface).
do $$
declare sig text;
begin
  foreach sig in array array[
    'chapelle.current_global_role()',
    'chapelle.journey_sync_member_stage()',
    'public.academy_assert_cert_valid()',
    'public.academy_next_numero(text, integer)',
    'public.handle_new_user()',
    'public.last_activity_at(uuid)',
    'public.membre_actif_30j(uuid)',
    'public.mkt_refresh_rating()',
    'public.notify_push_dispatch()'
  ]
  loop
    if to_regprocedure(sig) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', sig);
    end if;
  end loop;
end $$;

-- ============================================================================
-- FIN — 20260816120000_security_function_execute_hardening.sql
-- ============================================================================
