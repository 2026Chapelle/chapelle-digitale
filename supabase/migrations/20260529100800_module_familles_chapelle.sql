-- =============================================================================
-- CHAPELLE — Module Familles de la Chapelle (cellules de maison) — tables cellules_*
-- =============================================================================
set search_path = chapelle, public;

-- 1.2 cellules_cellules — les cellules de maison
create table chapelle.cellules_cellules (
  id                uuid primary key default gen_random_uuid(),
  platform_id       uuid not null references chapelle.platforms(id) on delete cascade,
  nom               text not null,
  code              text not null unique,
  leader_id         uuid references chapelle.members(id) on delete set null,
  co_leader_id      uuid references chapelle.members(id) on delete set null,
  cellule_parent_id uuid references chapelle.cellules_cellules(id) on delete set null,
  zone              text,
  ville             text,
  pays              text,
  latitude          numeric(9,6),
  longitude         numeric(9,6),
  jour_reunion      text,
  heure_reunion     time,
  frequence         chapelle.cellules_freq_reunion not null default 'hebdomadaire',
  capacite_max      integer check (capacite_max > 0),
  est_en_ligne      boolean not null default false,
  lien_visio        text,
  statut            chapelle.cellules_cellule_statut not null default 'active',
  date_ouverture    date,
  date_fermeture    date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);
create index idx_cellules_plat   on chapelle.cellules_cellules(platform_id);
create index idx_cellules_leader on chapelle.cellules_cellules(leader_id);
create index idx_cellules_statut on chapelle.cellules_cellules(statut);
create index idx_cellules_zone   on chapelle.cellules_cellules(zone, ville);
create index idx_cellules_parent on chapelle.cellules_cellules(cellule_parent_id);

-- 1.3 cellules_membres_cellule — appartenance membre ↔ cellule
create table chapelle.cellules_membres_cellule (
  id           uuid primary key default gen_random_uuid(),
  cellule_id   uuid not null references chapelle.cellules_cellules(id) on delete cascade,
  member_id    uuid not null references chapelle.members(id) on delete cascade,
  role_cellule chapelle.cellules_role_cellule not null default 'membre',
  date_arrivee date not null default current_date,
  date_depart  date,
  est_actif    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  unique (cellule_id, member_id)
);
create index idx_cellules_mc_cellule on chapelle.cellules_membres_cellule(cellule_id);
create index idx_cellules_mc_member  on chapelle.cellules_membres_cellule(member_id);
create index idx_cellules_mc_actif   on chapelle.cellules_membres_cellule(cellule_id, est_actif);

-- 1.4 cellules_reunions — séances de cellule
create table chapelle.cellules_reunions (
  id               uuid primary key default gen_random_uuid(),
  cellule_id       uuid not null references chapelle.cellules_cellules(id) on delete cascade,
  event_id         uuid references chapelle.events(id) on delete set null,
  date_reunion     timestamptz not null,
  theme            text,
  support_url      text,
  nb_presents      integer not null default 0 check (nb_presents >= 0),
  nb_invites       integer not null default 0 check (nb_invites >= 0),
  offrande_montant numeric(12,2) check (offrande_montant >= 0),
  compte_rendu     text,
  statut           chapelle.event_statut not null default 'brouillon',
  created_by       uuid references chapelle.members(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);
create index idx_cellules_reunions_cellule on chapelle.cellules_reunions(cellule_id);
create index idx_cellules_reunions_date    on chapelle.cellules_reunions(date_reunion);
create index idx_cellules_reunions_statut  on chapelle.cellules_reunions(statut);

-- 1.5 cellules_presences — feuille de présence
create table chapelle.cellules_presences (
  id                  uuid primary key default gen_random_uuid(),
  reunion_id          uuid not null references chapelle.cellules_reunions(id) on delete cascade,
  member_id           uuid references chapelle.members(id) on delete set null,
  nom_invite          text,
  statut              chapelle.cellules_presence_statut not null default 'present',
  est_premiere_visite boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);
create unique index idx_cellules_pres_unique on chapelle.cellules_presences(reunion_id, member_id) where member_id is not null;
create index idx_cellules_pres_reunion on chapelle.cellules_presences(reunion_id);
create index idx_cellules_pres_member  on chapelle.cellules_presences(member_id);
create index idx_cellules_pres_statut  on chapelle.cellules_presences(statut);

-- 1.6 cellules_formations_leader — certification des leaders
create table chapelle.cellules_formations_leader (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references chapelle.members(id) on delete cascade,
  niveau            text not null check (niveau in ('hote','co_leader_forme','leader_certifie','superviseur')),
  statut            chapelle.cellules_certif_statut not null default 'en_cours',
  formateur_id      uuid references chapelle.members(id) on delete set null,
  date_debut        date,
  date_certification date,
  date_expiration   date,
  score             integer check (score between 0 and 100),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);
create index idx_cellules_fl_member on chapelle.cellules_formations_leader(member_id);
create index idx_cellules_fl_statut on chapelle.cellules_formations_leader(statut);

-- 1.7 cellules_affectations — file d'attente / placement des nouveaux
create table chapelle.cellules_affectations (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references chapelle.members(id) on delete cascade,
  cellule_id         uuid references chapelle.cellules_cellules(id) on delete set null,
  form_submission_id uuid references chapelle.form_submissions(id) on delete set null,
  zone_souhaitee     text,
  statut             text not null default 'en_attente'
                       check (statut in ('en_attente','proposee','acceptee','refusee','expiree')),
  traite_par         uuid references chapelle.members(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);
create index idx_cellules_aff_statut  on chapelle.cellules_affectations(statut);
create index idx_cellules_aff_cellule on chapelle.cellules_affectations(cellule_id);
create index idx_cellules_aff_member  on chapelle.cellules_affectations(member_id);
