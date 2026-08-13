-- =============================================================================
-- PODCAST-5A — Rétention & maintenance des analytics d'écoute audio
-- =============================================================================
-- Maîtrise la croissance de `audio_listening_events` SANS perdre les métriques
-- Admin utiles. Le tableau de bord ne requête JAMAIS au-delà de 90 jours, alors
-- que la rétention brute est de 18 mois → aucune perte de métrique après purge.
-- Aucune table d'agrégats n'est nécessaire (les fenêtres 7/30/90j restent calculées
-- exactement depuis le brut retenu, via l'index idx_ale_time existant).
--
-- SÉCURITÉ :
--  - Purge = fonction SECURITY DEFINER exécutable UNIQUEMENT par service_role
--    (backend / cron protégé). anon/authenticated : AUCUN droit d'exécution, donc
--    un client ne peut JAMAIS déclencher une suppression.
--  - Garde-fou : refuse toute rétention < 90 jours → INCAPABLE d'effacer les
--    données récentes (protège le dashboard). Déterministe (now() - intervalle),
--    idempotente (2e passage → 0 ligne), journalisée sans PII (compte seulement).
-- 100% ADDITIF. Réutilise cron_runs (journal existant) côté route.
-- =============================================================================

-- Rétention par défaut : 18 mois (≈ 550 jours). Centralisée pour audit/tests.
create or replace function public.audio_analytics_default_retention()
returns interval language sql immutable as $$ select interval '18 months' $$;

-- ── Purge déterministe & idempotente ────────────────────────────────────────
-- Supprime les événements dont occurred_at est plus vieux que (now() - p_retention).
-- Retourne le nombre de lignes supprimées. Lève une exception si la rétention
-- demandée est trop courte (protection des données récentes).
create or replace function public.purge_audio_listening_events(
  p_retention interval default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retention interval := coalesce(p_retention, public.audio_analytics_default_retention());
  v_cutoff    timestamptz;
  v_deleted   integer;
begin
  -- Garde-fou : jamais purger les données récentes (dashboard = 90 jours max).
  if v_retention < interval '90 days' then
    raise exception 'purge_audio_listening_events: rétention % trop courte (min 90 jours)', v_retention
      using errcode = 'check_violation';
  end if;

  v_cutoff := now() - v_retention;

  delete from public.audio_listening_events
  where occurred_at < v_cutoff;
  get diagnostics v_deleted = row_count;

  return v_deleted;   -- compte uniquement (aucune PII)
end;
$$;

-- Droits : backend uniquement. Un client (anon/authenticated) ne peut pas purger.
revoke all on function public.purge_audio_listening_events(interval) from public;
revoke all on function public.audio_analytics_default_retention() from public;
grant execute on function public.purge_audio_listening_events(interval) to service_role;
grant execute on function public.audio_analytics_default_retention() to service_role;

comment on function public.purge_audio_listening_events(interval) is
  'PODCAST-5A : purge déterministe/idempotente des events d''écoute > rétention (défaut 18 mois). service_role only, garde min 90 jours. Aucune PII journalisée.';

-- Expose l'RPC à PostgREST (appel via supabaseAdmin.rpc depuis la route cron).
notify pgrst, 'reload schema';
