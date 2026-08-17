-- ============================================================================
-- 20260817120000_security_definer_search_path_hardening.sql
-- Épingle un search_path explicite sur 3 fonctions SECURITY DEFINER qui en
-- étaient dépourvues (proconfig=<NONE>). Défense en profondeur contre le
-- shadowing d'objet non qualifié (exécution de code attaquant au titre du
-- propriétaire postgres). Suite additive de [20260816120000].
-- ----------------------------------------------------------------------------
-- Fonctions (owner=postgres, SECURITY DEFINER) :
--   public.handle_new_user()          — trigger on_auth_user_created (auth.users) ;
--                                        corps : insert into public.profiles (qualifié) + builtins.
--   public.has_premium_access(uuid)   — corps : select from user_subscriptions (non qualifié) ;
--                                        objet HORS-MIGRATION (présent en prod, absent en local) → gardé.
--   public.is_staff()                 — helper RLS (anon/authenticated EXECUTE conservés !) ;
--                                        corps : select from profiles (non qualifié) + auth.uid() (qualifié).
--
-- IMPLÉMENTATION : `ALTER FUNCTION ... SET search_path = pg_catalog, public`.
-- ALTER (et NON create or replace) : préserve owner, SECURITY DEFINER, la volatilité,
-- le langage, le câblage du trigger, et surtout les ACL EXECUTE — n'AJOUTE qu'un
-- GUC proconfig. Ne rouvre RIEN du durcissement anon de 20260816120000 (is_staff
-- reste anon/auth-exécutable ; handle_new_user/has_premium_access restent
-- service_role-only). pg_catalog en tête = builtins/opérateurs non shadowables ;
-- public en second = tables applicatives (profiles, user_subscriptions).
-- auth.uid() est qualifié → `auth` inutile sur le path.
--
-- Chaque instruction est gardée par to_regprocedure() : idempotent et sûr si une
-- fonction n'existe pas dans un environnement donné (has_premium_access en local).
-- Additif, forward-only. Aucune donnée touchée. Aucune ACL modifiée.
-- ============================================================================

do $$
declare sig text;
begin
  foreach sig in array array[
    'public.handle_new_user()',
    'public.has_premium_access(uuid)',
    'public.is_staff()'
  ]
  loop
    if to_regprocedure(sig) is not null then
      execute format('alter function %s set search_path = pg_catalog, public', sig);
    end if;
  end loop;
end $$;

-- ============================================================================
-- FIN — 20260817120000_security_definer_search_path_hardening.sql
-- ============================================================================
