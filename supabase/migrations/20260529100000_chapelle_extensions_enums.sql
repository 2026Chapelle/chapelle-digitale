-- =============================================================================
-- CHAPELLE — Architecture de gestion (v2) — 01. Schéma, extensions, enums
-- =============================================================================
-- Généré depuis docs/architecture (core + 8 modules).
--
-- ISOLATION : tout est créé dans le schéma `chapelle` pour cohabiter sans
-- collision avec le prototype v1 (public.profiles, public.evenements, ...).
-- Pour exposer l'API : ajouter `chapelle` aux "Exposed schemas" de Supabase
-- (Settings → API) une fois prêt.
--
-- Ordre d'application des migrations :
--   100000 extensions+enums  → 100100 core tables → 1002xx..1009xx modules
--   → 101000 RBAC functions  → 101100 triggers → 101200 views
--   → 101300 RLS policies    → 101400 seed
-- =============================================================================

create schema if not exists chapelle;

-- gen_random_uuid()
create extension if not exists pgcrypto;
-- recherche plein-texte / trigram (optionnel, utilisé par certains index)
create extension if not exists pg_trgm;

set search_path = chapelle, public;

-- ----------------------------------------------------------------------------
-- Enums CORE
-- ----------------------------------------------------------------------------
create type chapelle.tunnel_stage as enum
  ('visiteur','contact','integration','disciple','membre','serviteur','leader');

create type chapelle.role_key as enum
  ('visiteur','membre','serviteur','leader_cellule','responsable_plateforme','pasteur','admin');

create type chapelle.member_statut as enum
  ('actif','inactif','suspendu','archive');

create type chapelle.platform_type as enum
  ('racine','culte','ministere','cellule','formation','evenementiel');

create type chapelle.donation_type as enum
  ('offrande','dime','don_projet','soutien_mission','autre');

create type chapelle.prayer_statut as enum
  ('nouvelle','en_cours','exaucee','cloturee');

create type chapelle.event_statut as enum
  ('brouillon','publie','annule','termine');

create type chapelle.notif_canal as enum
  ('in_app','email','sms','whatsapp','push');

-- ----------------------------------------------------------------------------
-- Enums MODULES déclarés comme types (jeunesse / cite-refuge / familles-chapelle)
-- (les autres modules utilisent text + CHECK, définis inline dans leurs tables)
-- ----------------------------------------------------------------------------
-- Jeunesse
create type chapelle.jeunesse_tranche_age      as enum ('ado','jeune','jeune_adulte');
create type chapelle.jeunesse_leader_niveau     as enum ('aspirant','leader_junior','leader','leader_senior','mentor');
create type chapelle.jeunesse_projet_statut     as enum ('idee','incubation','lance','en_croissance','pause','arrete');
create type chapelle.jeunesse_conf_role         as enum ('participant','benevole','intervenant','organisateur');
create type chapelle.jeunesse_inscription_statut as enum ('en_attente','confirmee','liste_attente','annulee','presente','absente');
create type chapelle.jeunesse_certif_statut     as enum ('en_cours','obtenue','expiree','revoquee');

-- Cité du Refuge
create type chapelle.refuge_categorie_besoin as enum
  ('addiction','deuil','famille_couple','finances','sante_mentale','violences','delivrance','spirituel','autre');
create type chapelle.refuge_niveau_urgence as enum ('faible','moyen','eleve','critique');
create type chapelle.refuge_cas_statut as enum
  ('nouveau','en_evaluation','en_accompagnement','en_pause','restaure','oriente_externe','clos');
create type chapelle.refuge_session_type as enum
  ('ecoute','accompagnement','delivrance','pastorale','suivi','groupe');
create type chapelle.refuge_session_statut as enum ('planifiee','realisee','annulee','no_show');
create type chapelle.refuge_milestone_key as enum
  ('prise_en_charge','stabilisation','travail_de_fond','consolidation','restauration','rechute');

-- Familles de la Chapelle (cellules)
create type chapelle.cellules_cellule_statut as enum ('active','multiplication','en_pause','fermee');
create type chapelle.cellules_freq_reunion   as enum ('hebdomadaire','bimensuelle','mensuelle');
create type chapelle.cellules_role_cellule   as enum ('leader','co_leader','hote','membre','invite');
create type chapelle.cellules_presence_statut as enum ('present','absent','excuse','en_ligne');
create type chapelle.cellules_certif_statut  as enum ('en_cours','valide','echoue','expire');

-- ----------------------------------------------------------------------------
-- Helper : maintien automatique de updated_at (attaché par les triggers, file 11)
-- ----------------------------------------------------------------------------
create or replace function chapelle.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
