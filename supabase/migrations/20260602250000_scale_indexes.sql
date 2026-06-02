-- ============================================================================
-- SCALE 100k — index composites pour les agrégats du Gouvernement Pastoral
-- ----------------------------------------------------------------------------
-- Cible : 100 000 membres, multi-pays. Ces index accélèrent les filtres
-- conjoints (user_id + statut, pays + statut, devise) utilisés par
-- /api/admin/gouvernement et /api/admin/analytics. Additif, idempotent.
-- NB : les agrégations en mémoire seront déplacées vers des RPC SQL au cycle
-- suivant ; ces index bénéficient déjà aux requêtes actuelles.
-- ============================================================================

-- Profils : filtres pays/statut + tri engagement
create index if not exists idx_profiles_pays_statut on public.profiles (pays, membre_statut);
create index if not exists idx_profiles_engagement on public.profiles (score_engagement desc);
create index if not exists idx_profiles_created on public.profiles (created_at desc);

-- Activité membre : agrégations par utilisateur + statut
create index if not exists idx_inscr_formation_user_statut on public.inscriptions_formation (user_id, statut);
create index if not exists idx_priere_user_statut on public.priere_demandes (user_id, statut);
create index if not exists idx_event_reg_user on public.event_registrations (user_id);

-- Dons : totaux par statut/devise et par membre
create index if not exists idx_dons_statut_devise on public.dons (statut, devise);
create index if not exists idx_dons_user_statut on public.dons (user_id, statut);
create index if not exists idx_dons_date_creation on public.dons (date_creation desc);

-- Analytics : présence et agrégats par membre/pays/type
create index if not exists idx_asess_user_lastseen on public.analytics_sessions (user_id, last_seen desc);
create index if not exists idx_asess_lastseen_pays on public.analytics_sessions (last_seen desc, pays);
create index if not exists idx_aevt_user_type on public.analytics_events (user_id, type);
create index if not exists idx_aevt_type_category on public.analytics_events (type, category);
