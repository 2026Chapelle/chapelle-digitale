-- CITADELLE 6A-1 — Editorial Intelligence grants hardening.
-- Additive only. Tightens the three editorial tables to server-side access.

revoke all on table public.editorial_recommendations
  from public, anon, authenticated, service_role;

revoke all on table public.editorial_recommendation_events
  from public, anon, authenticated, service_role;

revoke all on table public.editorial_settings
  from public, anon, authenticated, service_role;

grant select, insert, update
  on table public.editorial_recommendations
  to service_role;

grant select, insert
  on table public.editorial_recommendation_events
  to service_role;

grant select, insert, update
  on table public.editorial_settings
  to service_role;
