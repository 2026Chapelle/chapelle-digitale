-- =============================================================================
-- CHAPELLE — Module Cité du Refuge — tables cite_refuge_*
-- Sensibilité MAXIMALE : RLS stricte (file 13), moindre privilège.
-- =============================================================================
set search_path = chapelle, public;

-- 1.1 cite_refuge_cases — dossier d'accompagnement
create table chapelle.cite_refuge_cases (
  id                          uuid primary key default gen_random_uuid(),
  platform_id                 uuid not null references chapelle.platforms(id) on delete cascade,
  member_id                   uuid references chapelle.members(id) on delete set null,
  reference_dossier           text not null unique,
  categorie_principale        chapelle.refuge_categorie_besoin not null,
  categories_secondaires      chapelle.refuge_categorie_besoin[],
  niveau_urgence              chapelle.refuge_niveau_urgence not null default 'moyen',
  statut                      chapelle.refuge_cas_statut not null default 'nouveau',
  confidentiel                boolean not null default true,
  accompagnateur_referent_id  uuid references chapelle.members(id) on delete set null,
  resume_chiffre              text,
  prayer_request_id           uuid references chapelle.prayer_requests(id) on delete set null,
  date_ouverture              timestamptz not null default now(),
  date_cloture                timestamptz,
  created_by                  uuid references chapelle.members(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz
);
create index idx_refuge_cases_statut  on chapelle.cite_refuge_cases(statut);
create index idx_refuge_cases_ref     on chapelle.cite_refuge_cases(accompagnateur_referent_id);
create index idx_refuge_cases_member  on chapelle.cite_refuge_cases(member_id);

-- 1.2 cite_refuge_accompagnants — profil accompagnateur / intercesseur
create table chapelle.cite_refuge_accompagnants (
  id                            uuid primary key default gen_random_uuid(),
  member_id                     uuid not null unique references chapelle.members(id) on delete cascade,
  platform_id                   uuid not null references chapelle.platforms(id) on delete cascade,
  specialites                   chapelle.refuge_categorie_besoin[],
  capacite_max_cas              integer not null default 5 check (capacite_max_cas > 0),
  cas_actifs                    integer not null default 0 check (cas_actifs >= 0),
  est_certifie                  boolean not null default false,
  certifie_le                   timestamptz,
  superviseur_id                uuid references chapelle.members(id) on delete set null,
  disponible                    boolean not null default true,
  engagement_confidentialite_at timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz
);
create index idx_refuge_acc_dispo on chapelle.cite_refuge_accompagnants(disponible);

-- 1.3 cite_refuge_assignments — affectation N-N cas ↔ accompagnant
create table chapelle.cite_refuge_assignments (
  id                     uuid primary key default gen_random_uuid(),
  case_id                uuid not null references chapelle.cite_refuge_cases(id) on delete cascade,
  accompagnant_member_id uuid not null references chapelle.members(id) on delete cascade,
  role_dans_cas          text not null default 'co_accompagnant'
                           check (role_dans_cas in ('referent','co_accompagnant','intercesseur','superviseur')),
  actif                  boolean not null default true,
  date_debut             date not null default current_date,
  date_fin               date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz,
  unique (case_id, accompagnant_member_id, role_dans_cas)
);
create index idx_refuge_assign_case   on chapelle.cite_refuge_assignments(case_id);
create index idx_refuge_assign_member on chapelle.cite_refuge_assignments(accompagnant_member_id);

-- 1.4 cite_refuge_sessions — sessions / entretiens
create table chapelle.cite_refuge_sessions (
  id                     uuid primary key default gen_random_uuid(),
  case_id                uuid not null references chapelle.cite_refuge_cases(id) on delete cascade,
  accompagnant_member_id uuid references chapelle.members(id) on delete set null,
  event_id               uuid references chapelle.events(id) on delete set null,
  type                   chapelle.refuge_session_type not null default 'accompagnement',
  statut                 chapelle.refuge_session_statut not null default 'planifiee',
  date_prevue            timestamptz not null,
  date_realisee          timestamptz,
  duree_min              integer check (duree_min > 0),
  est_confidentielle     boolean not null default true,
  notes_chiffrees        text,
  milestone_atteint      chapelle.refuge_milestone_key,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz
);
create index idx_refuge_sess_case   on chapelle.cite_refuge_sessions(case_id);
create index idx_refuge_sess_prevue on chapelle.cite_refuge_sessions(date_prevue);
create index idx_refuge_sess_statut on chapelle.cite_refuge_sessions(statut);

-- 1.5 cite_refuge_milestones — jalons de restauration
create table chapelle.cite_refuge_milestones (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references chapelle.cite_refuge_cases(id) on delete cascade,
  milestone   chapelle.refuge_milestone_key not null,
  atteint_at  timestamptz not null default now(),
  valide_par  uuid references chapelle.members(id) on delete set null,
  commentaire text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
-- jalons non répétables uniques par cas ; 'rechute' exclue de la contrainte (peut être multiple)
create unique index idx_refuge_milestone_unique on chapelle.cite_refuge_milestones(case_id, milestone)
  where milestone <> 'rechute';
create index idx_refuge_milestone_case on chapelle.cite_refuge_milestones(case_id);

-- 1.6 cite_refuge_orientations — orientations externes
create table chapelle.cite_refuge_orientations (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references chapelle.cite_refuge_cases(id) on delete cascade,
  type_ressource  text not null check (type_ressource in ('medical','psychologique','juridique','social','ministere_interne','autre')),
  partenaire      text,
  motif           text,
  oriente_le      timestamptz not null default now(),
  suivi_effectue  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);
create index idx_refuge_orient_case on chapelle.cite_refuge_orientations(case_id);
