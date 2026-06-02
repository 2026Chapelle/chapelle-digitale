-- ============================================================================
-- CORRECTIFS PRÉ-OUVERTURE — fiabilité dashboards & cartographie
-- ----------------------------------------------------------------------------
-- Additif & idempotent. Aucune donnée touchée, aucun DROP.
-- ============================================================================

-- Cartographie : localisation des familles/cellules (sinon répartition pays = 0).
alter table public.groupes add column if not exists pays  text;
alter table public.groupes add column if not exists ville text;

-- Index pour les agrégats par membre (dashboard santé / international / gouvernance).
create index if not exists idx_priere_user        on public.priere_demandes (user_id);
create index if not exists idx_evtreg_user         on public.event_registrations (user_id);
create index if not exists idx_modcompl_user_only  on public.module_completions (user_id);
create index if not exists idx_inscr_user          on public.inscriptions_formation (user_id);

-- Cohérence : index de tri sur les dons par date (historique membre / tracking).
create index if not exists idx_dons_email          on public.dons (user_email);
create index if not exists idx_dons_user           on public.dons (user_id);
