-- =============================================================================
-- CHAPELLE — 13. Index supplémentaires (perf dashboards / analytics)
-- Les index "métier" de base sont déjà créés inline dans les fichiers de tables.
-- Ceux-ci accélèrent les agrégats du back-office (KPI par période / plateforme).
-- =============================================================================
set search_path = chapelle, public;

-- Offrandes : agrégats "réussies sur période" par plateforme
create index if not exists idx_donations_stat
  on chapelle.donations (statut_paiement, donne_le, platform_id);

-- Événements à venir publiés (KPI "Événements à venir")
create index if not exists idx_events_publie_futur
  on chapelle.events (statut, date_debut) where statut = 'publie';

-- Demandes de prière ouvertes (KPI "Demandes de prière")
create index if not exists idx_prayer_ouvertes
  on chapelle.prayer_requests (statut) where statut in ('nouvelle','en_cours');

-- Mur de prière public
create index if not exists idx_prayer_public
  on chapelle.prayer_requests (est_public, created_at) where est_public = true;

-- Inscriptions / nouveaux membres par date (KPI "Nouveaux inscrits")
create index if not exists idx_members_created on chapelle.members (created_at);
create index if not exists idx_memberships_adhesion on chapelle.memberships (date_adhesion);

-- Analytics : visiteurs du jour (page_view) — couvre le filtre type+date
create index if not exists idx_analytics_pageview
  on chapelle.analytics_events (event_type, occurred_at) where event_type = 'page_view';

-- CFIC : inscriptions actives (KPI étudiants / abandons)
create index if not exists idx_cfic_insc_actives
  on chapelle.cfic_inscriptions (statut, cursus_id);

-- Cellules : présences présentes par réunion (KPI présences)
create index if not exists idx_cellules_pres_present
  on chapelle.cellules_presences (reunion_id) where statut = 'present';

-- Mahanaïm : heures de prière par période
create index if not exists idx_mahanaim_log_periode
  on chapelle.mahanaim_prayer_log (effectue_le);
