-- =============================================================================
-- CHAPELLE — 14. Vues analytics (back-office)
-- Vues d'AGRÉGATS uniquement (aucune PII) — destinées au dashboard admin.
-- À interroger via un rôle admin / service role (cf. RLS file 15).
-- =============================================================================
set search_path = chapelle, public;

-- ----------------------------------------------------------------------------
-- KPI de l'écran d'accueil (les 6 imposés) — une seule ligne
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_admin_kpis as
select
  (select count(distinct session_id) from chapelle.analytics_events
     where event_type = 'page_view' and occurred_at::date = current_date)            as visiteurs_aujourdhui,
  (select count(distinct session_id) from chapelle.analytics_events
     where event_type = 'page_view' and occurred_at >= current_date - interval '7 days') as visiteurs_semaine,
  (select count(*) from chapelle.members
     where created_at::date = current_date)                                          as nouveaux_inscrits_jour,
  (select count(*) from chapelle.prayer_requests
     where statut in ('nouvelle','en_cours'))                                        as demandes_priere_ouvertes,
  (select coalesce(sum(montant),0) from chapelle.donations
     where statut_paiement = 'reussi' and donne_le >= date_trunc('month', now()))    as offrandes_mois,
  (select count(*) from chapelle.cfic_cursus where actif = true)                     as formations_actives,
  (select count(*) from chapelle.events
     where statut = 'publie' and date_debut >= now())                               as evenements_a_venir;

-- ----------------------------------------------------------------------------
-- Vue par plateforme (drill-down)
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_platform_overview as
select
  p.id   as platform_id,
  p.slug,
  p.nom,
  (select count(*) from chapelle.memberships m where m.platform_id = p.id and m.statut = 'actif') as membres_actifs,
  (select count(*) from chapelle.events e where e.platform_id = p.id and e.statut = 'publie' and e.date_debut >= now()) as evenements_a_venir,
  (select coalesce(sum(d.montant),0) from chapelle.donations d
     where d.platform_id = p.id and d.statut_paiement = 'reussi' and d.donne_le >= date_trunc('month', now())) as offrandes_mois,
  (select count(*) from chapelle.prayer_requests pr where pr.platform_id = p.id and pr.statut in ('nouvelle','en_cours')) as prieres_ouvertes,
  (select count(*) from chapelle.form_submissions f where f.platform_id = p.id and f.created_at >= current_date - interval '30 days') as leads_30j
from chapelle.platforms p
order by (p.parent_id is not null), p.nom;

-- ----------------------------------------------------------------------------
-- Tunnel d'intégration global (funnel) — comptage par étape
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_tunnel_funnel as
select
  count(*) filter (where a_rempli_formulaire)   as ont_rempli_formulaire,
  count(*) filter (where a_rejoint_whatsapp)    as ont_rejoint_whatsapp,
  count(*) filter (where a_suivi_parcours)      as ont_suivi_parcours,
  count(*) filter (where a_participe_programme) as ont_participe_programme,
  count(*) filter (where est_devenu_membre)     as sont_devenus_membres,
  count(*)                                      as total_parcours
from chapelle.integration_journeys;

create or replace view chapelle.v_tunnel_par_stage as
select stage_courant, count(*) as nb
from chapelle.integration_journeys
group by stage_courant;

-- ----------------------------------------------------------------------------
-- CFIC — étudiants / progression / certifications / abandons
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_cfic_stats as
select
  count(distinct member_id) filter (where statut in ('inscrit','en_cours','termine','certifie')) as etudiants,
  round(avg(progression_pct) filter (where statut in ('inscrit','en_cours')), 1)                  as progression_moyenne,
  count(*) filter (where statut = 'certifie')                                                     as certifications,
  count(*) filter (where statut = 'abandonne')                                                    as abandons,
  count(*)                                                                                        as total_inscriptions
from chapelle.cfic_inscriptions;

-- ----------------------------------------------------------------------------
-- Mahanaïm — intercesseurs actifs / retraites / participants / sentinelles
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_mahanaim_stats as
select
  (select count(*) from chapelle.mahanaim_intercessors
     where est_actif = true and derniere_activite_at >= now() - interval '30 days')          as intercesseurs_actifs,
  (select count(*) from chapelle.mahanaim_retreats r join chapelle.events e on e.id = r.event_id
     where e.date_debut >= date_trunc('month', now()))                                       as retraites_mois,
  (select count(distinct member_id) from chapelle.mahanaim_watch_assignments
     where statut = 'present')                                                               as participants,
  (select count(*) from chapelle.mahanaim_intercessors
     where niveau in ('sentinelle','chef_de_garde'))                                         as sentinelles,
  (select coalesce(sum(duree_minutes),0) from chapelle.mahanaim_prayer_log
     where effectue_le >= date_trunc('month', now()))                                        as minutes_priere_mois;

-- ----------------------------------------------------------------------------
-- Jeunesse — leaders / entrepreneurs / conférences / inscriptions
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_jeunesse_stats as
select
  (select count(*) from chapelle.jeunesse_leaders where est_actif = true)                    as leaders,
  (select count(distinct porteur_id) from chapelle.jeunesse_projets where statut <> 'arrete') as entrepreneurs,
  (select count(*) from chapelle.jeunesse_conferences c join chapelle.events e on e.id = c.event_id
     where e.statut in ('publie','termine'))                                                 as conferences,
  (select count(*) from chapelle.jeunesse_inscriptions)                                      as inscriptions,
  (select count(*) from chapelle.jeunesse_inscriptions where statut = 'presente')            as inscriptions_presentes;

-- ----------------------------------------------------------------------------
-- Femmes d'Exceptions — participantes / retraites / conférences
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_femmes_stats as
select
  (select count(distinct member_id) from chapelle.femmes_inscriptions where statut = 'presente') as participantes,
  (select count(*) from chapelle.femmes_evenement_meta m join chapelle.events e on e.id = m.event_id
     where m.categorie = 'retraite')                                                             as retraites,
  (select count(*) from chapelle.femmes_evenement_meta where categorie = 'conference')           as conferences,
  (select count(*) from chapelle.femmes_mentorat where statut = 'actif')                         as mentorats_actifs;

-- ----------------------------------------------------------------------------
-- Familles de la Chapelle (cellules) — cellules / leaders / participants / présences
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_cellules_stats as
select
  (select count(*) from chapelle.cellules_cellules where statut in ('active','multiplication')) as cellules,
  (select count(distinct leader_id) from chapelle.cellules_cellules
     where statut = 'active' and leader_id is not null)                                          as leaders,
  (select count(distinct member_id) from chapelle.cellules_membres_cellule where est_actif = true) as participants,
  (select coalesce(sum(nb_presents),0) from chapelle.cellules_reunions
     where date_reunion >= date_trunc('month', now()))                                           as presences_mois;

-- ----------------------------------------------------------------------------
-- Chapelle Familiale — familles / sessions couples / ateliers parentalité
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_familiale_stats as
select
  (select count(*) from chapelle.familiale_foyers where suivi_statut in ('ouvert','en_accompagnement')) as familles_suivies,
  (select count(*) from chapelle.familiale_sessions where format in ('couple','pre_marital')
     and date_session >= date_trunc('month', now()))                                                    as sessions_couples_mois,
  (select count(*) from chapelle.familiale_sessions where format = 'parentalite'
     and date_session >= date_trunc('month', now()))                                                    as ateliers_parentalite_mois,
  (select count(*) from chapelle.familiale_parcours_progression where est_couple_mentor = true)         as couples_mentors;

-- ----------------------------------------------------------------------------
-- CIER (hub) — présences cultes / offrandes / vision
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_cier_stats as
select
  (select count(*) from chapelle.cier_presences_culte
     where check_in_at >= date_trunc('month', now()))                                  as presences_cultes_mois,
  (select count(*) from chapelle.cier_cultes c join chapelle.events e on e.id = c.event_id
     where e.statut = 'publie' and e.date_debut >= now())                              as cultes_a_venir,
  (select count(*) from chapelle.cier_promesses_dons where statut = 'active')          as promesses_actives;

-- ----------------------------------------------------------------------------
-- Cité du Refuge — AGRÉGATS NON SENSIBLES uniquement (jamais de PII clinique)
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_refuge_stats as
select
  count(*) filter (where statut in ('en_evaluation','en_accompagnement','en_pause')) as cas_suivis,
  count(*) filter (where statut in ('restaure'))                                     as restaurations,
  count(*) filter (where niveau_urgence = 'critique'
                     and statut not in ('clos','restaure'))                          as cas_critiques_ouverts
from chapelle.cite_refuge_cases;
