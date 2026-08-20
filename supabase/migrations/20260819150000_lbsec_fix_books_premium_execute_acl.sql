-- ============================================================================
-- CITADELLE LIVING BOOKS — LB-SEC ACL FIX : durcir has_books_premium_access
-- ----------------------------------------------------------------------------
-- DÉFAUT (constaté EN DISTANT, invisible en local) : la migration
-- 20260819140000 a créé public.has_books_premium_access(uuid) (SECURITY DEFINER)
-- avec `revoke all ... from public` + `grant execute ... to service_role`. Or sur
-- Supabase distant, les DEFAULT PRIVILEGES accordent EXECUTE **directement** à
-- anon et authenticated sur les nouvelles fonctions du schéma public — grants que
-- `revoke ... from public` NE retire PAS. Résultat distant : anon/authenticated
-- pouvaient exécuter la fonction (sonde du statut premium par UUID via RPC).
--
-- Ce défaut rouvrait la classe « exposition anon SECURITY DEFINER » fermée
-- org-wide par 20260816120000. Les fonctions sœurs has_entitlement et
-- has_podcast_premium_access sont, elles, correctement service_role-only.
--
-- CORRECTIF CHIRURGICAL : retirer EXECUTE de public/anon/authenticated et
-- (ré)affirmer service_role. NE recrée PAS la fonction, NE change PAS sa logique,
-- NE touche PAS aux entitlements ni aux fonctions sœurs.
-- Impact du défaut : fuite d'un BOOLÉEN de statut premium ; AUCUN octet de
-- document n'était exposé (la chaîne bucket privé + URL signée reste sûre).
-- ============================================================================

revoke execute on function public.has_books_premium_access(uuid) from anon, authenticated;
revoke execute on function public.has_books_premium_access(uuid) from public;
grant  execute on function public.has_books_premium_access(uuid) to service_role;

notify pgrst, 'reload schema';
