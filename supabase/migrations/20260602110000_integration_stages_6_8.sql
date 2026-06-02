-- ============================================================================
-- TUNNEL D'INTÉGRATION — Étapes 6 à 8 (Baptême · Service · Leadership)
-- ----------------------------------------------------------------------------
-- Additif & idempotent. N'altère AUCUNE donnée existante ni le trigger de
-- calcul de stage_courant (étapes 1-5). Ajoute 3 jalons de maturité spirituelle
-- + une RPC d'entonnoir pour le dashboard de gouvernement pastoral.
-- ============================================================================

alter table chapelle.integration_journeys add column if not exists a_ete_baptise        boolean not null default false;
alter table chapelle.integration_journeys add column if not exists a_ete_baptise_at      timestamptz;
alter table chapelle.integration_journeys add column if not exists a_rejoint_service     boolean not null default false;
alter table chapelle.integration_journeys add column if not exists a_rejoint_service_at  timestamptz;
alter table chapelle.integration_journeys add column if not exists a_suivi_leadership    boolean not null default false;
alter table chapelle.integration_journeys add column if not exists a_suivi_leadership_at timestamptz;

-- Entonnoir d'intégration : un seul blob JSON pour le dashboard (lecture service role).
create or replace function chapelle.integration_funnel()
returns jsonb
language sql
security definer
set search_path = chapelle, public
as $$
  select jsonb_build_object(
    'total',      (select count(*) from chapelle.integration_journeys),
    'par_stage',  (select coalesce(jsonb_object_agg(stage_courant::text, c), '{}'::jsonb)
                     from (select stage_courant, count(*) c
                             from chapelle.integration_journeys
                            group by stage_courant) s),
    'formulaire', (select count(*) from chapelle.integration_journeys where a_rempli_formulaire),
    'parcours',   (select count(*) from chapelle.integration_journeys where a_suivi_parcours),
    'programme',  (select count(*) from chapelle.integration_journeys where a_participe_programme),
    'membre',     (select count(*) from chapelle.integration_journeys where est_devenu_membre),
    'baptise',    (select count(*) from chapelle.integration_journeys where a_ete_baptise),
    'service',    (select count(*) from chapelle.integration_journeys where a_rejoint_service),
    'leadership', (select count(*) from chapelle.integration_journeys where a_suivi_leadership)
  );
$$;
