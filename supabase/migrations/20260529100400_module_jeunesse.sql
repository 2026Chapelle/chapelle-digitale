-- =============================================================================
-- CHAPELLE — Module Jeunesse — tables jeunesse_*
-- =============================================================================
set search_path = chapelle, public;

-- 1.1 jeunesse_profils — extension de profil jeune (1-1)
create table chapelle.jeunesse_profils (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null unique references chapelle.members(id) on delete cascade,
  tranche_age      chapelle.jeunesse_tranche_age,
  date_naissance   date,
  ville            text,
  etablissement    text,
  domaine_etude_pro text,
  centres_interet  text[] not null default '{}',
  est_leader       boolean not null default false,
  est_entrepreneur boolean not null default false,
  tuteur_id        uuid references chapelle.members(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

-- 1.2 jeunesse_leaders — vivier & progression leadership
create table chapelle.jeunesse_leaders (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references chapelle.members(id) on delete cascade,
  niveau          chapelle.jeunesse_leader_niveau not null default 'aspirant',
  domaine         text,
  cellule_animee  text,
  mentor_id       uuid references chapelle.members(id) on delete set null,
  date_nomination date not null default current_date,
  est_actif       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  unique (member_id, domaine)
);
create index idx_jeunesse_leaders_member on chapelle.jeunesse_leaders(member_id);
create index idx_jeunesse_leaders_actif  on chapelle.jeunesse_leaders(est_actif);

-- 1.3 jeunesse_projets — incubateur entrepreneurial
create table chapelle.jeunesse_projets (
  id                 uuid primary key default gen_random_uuid(),
  porteur_id         uuid not null references chapelle.members(id) on delete cascade,
  platform_id        uuid not null references chapelle.platforms(id) on delete cascade,
  titre              text not null,
  pitch              text,
  secteur            text,
  statut             chapelle.jeunesse_projet_statut not null default 'idee',
  mentor_id          uuid references chapelle.members(id) on delete set null,
  besoin_financement numeric(12,2) check (besoin_financement > 0),
  site_url           text,
  date_lancement     date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);
create index idx_jeunesse_projets_porteur on chapelle.jeunesse_projets(porteur_id);
create index idx_jeunesse_projets_statut  on chapelle.jeunesse_projets(statut);

-- 1.4 jeunesse_conferences — extension d'events
create table chapelle.jeunesse_conferences (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null unique references chapelle.events(id) on delete cascade,
  theme           text not null,
  edition         text,
  prix            numeric(12,2) check (prix >= 0),
  devise          text not null default 'EUR',
  intervenants    text[] not null default '{}',
  affiche_url     text,
  quota_benevoles integer check (quota_benevoles > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

-- 1.5 jeunesse_inscriptions — inscriptions conférences / programmes
create table chapelle.jeunesse_inscriptions (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references chapelle.events(id) on delete cascade,
  member_id          uuid references chapelle.members(id) on delete set null,
  form_submission_id uuid references chapelle.form_submissions(id) on delete set null,
  nom_complet        text,
  email              text,
  telephone          text,
  role_evenement     chapelle.jeunesse_conf_role not null default 'participant',
  statut             chapelle.jeunesse_inscription_statut not null default 'en_attente',
  montant_paye       numeric(12,2) check (montant_paye >= 0),
  donation_id        uuid references chapelle.donations(id) on delete set null,
  checkin_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz,
  unique (event_id, member_id)
);
create index idx_jeunesse_insc_event  on chapelle.jeunesse_inscriptions(event_id);
create index idx_jeunesse_insc_member on chapelle.jeunesse_inscriptions(member_id);
create index idx_jeunesse_insc_statut on chapelle.jeunesse_inscriptions(statut);

-- 1.6 jeunesse_parcours_modules — modules du parcours leadership/entrepreneuriat
create table chapelle.jeunesse_parcours_modules (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  titre       text not null,
  categorie   text check (categorie in ('leadership','entrepreneuriat','spirituel','soft_skills')),
  ordre       integer not null default 0,
  description text,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- 1.7 jeunesse_certifications — progression sur les modules
create table chapelle.jeunesse_certifications (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references chapelle.members(id) on delete cascade,
  module_id       uuid not null references chapelle.jeunesse_parcours_modules(id) on delete cascade,
  statut          chapelle.jeunesse_certif_statut not null default 'en_cours',
  progression_pct integer not null default 0 check (progression_pct between 0 and 100),
  valide_par      uuid references chapelle.members(id) on delete set null,
  obtenue_at      timestamptz,
  certificat_url  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  unique (member_id, module_id)
);
create index idx_jeunesse_certif_member on chapelle.jeunesse_certifications(member_id);
create index idx_jeunesse_certif_statut on chapelle.jeunesse_certifications(statut);
