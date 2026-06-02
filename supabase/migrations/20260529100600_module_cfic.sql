-- =============================================================================
-- CHAPELLE — Module CFIC (Centre de Formation) — tables cfic_*
-- Enums via text + CHECK (listes pédagogiques évolutives).
-- =============================================================================
set search_path = chapelle, public;

-- 1.2 cfic_cursus — catalogue de cursus (programmes diplômants)
create table chapelle.cfic_cursus (
  id                   uuid primary key default gen_random_uuid(),
  platform_id          uuid not null references chapelle.platforms(id) on delete cascade,
  slug                 text not null unique,
  titre                text not null,
  description          text,
  niveau               text not null check (niveau in ('fondations','disciple','leadership','theologie')),
  duree_estimee_h      integer check (duree_estimee_h > 0),
  prerequis_cursus_id  uuid references chapelle.cfic_cursus(id) on delete set null,
  note_minimale        numeric(5,2) not null default 70.00,
  certifiant           boolean not null default true,
  ordre                integer not null default 0,
  actif                boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);
create index idx_cfic_cursus_actif on chapelle.cfic_cursus(actif);

-- 1.3 cfic_modules — modules d'un cursus
create table chapelle.cfic_modules (
  id          uuid primary key default gen_random_uuid(),
  cursus_id   uuid not null references chapelle.cfic_cursus(id) on delete cascade,
  titre       text not null,
  description text,
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
create index idx_cfic_modules_cursus on chapelle.cfic_modules(cursus_id);

-- 1.4 cfic_lecons — leçons d'un module
create table chapelle.cfic_lecons (
  id            uuid primary key default gen_random_uuid(),
  module_id     uuid not null references chapelle.cfic_modules(id) on delete cascade,
  titre         text not null,
  type          text not null check (type in ('video','texte','quiz','devoir','live')),
  contenu_url   text,
  contenu_texte text,
  duree_min     integer check (duree_min > 0),
  event_id      uuid references chapelle.events(id) on delete set null,
  ordre         integer not null default 0,
  obligatoire   boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);
create index idx_cfic_lecons_module on chapelle.cfic_lecons(module_id);

-- 1.5 cfic_inscriptions — inscription d'un membre à un cursus
create table chapelle.cfic_inscriptions (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null references chapelle.members(id) on delete cascade,
  cursus_id            uuid not null references chapelle.cfic_cursus(id) on delete cascade,
  statut               text not null default 'inscrit'
                         check (statut in ('inscrit','en_cours','termine','certifie','abandonne','suspendu')),
  formateur_id         uuid references chapelle.members(id) on delete set null,
  progression_pct      numeric(5,2) not null default 0 check (progression_pct between 0 and 100),
  note_finale          numeric(5,2) check (note_finale between 0 and 100),
  inscrit_le           timestamptz not null default now(),
  termine_le           timestamptz,
  abandonne_le         timestamptz,
  derniere_activite_at timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz,
  unique (member_id, cursus_id)
);
create index idx_cfic_insc_member   on chapelle.cfic_inscriptions(member_id);
create index idx_cfic_insc_cursus   on chapelle.cfic_inscriptions(cursus_id);
create index idx_cfic_insc_statut   on chapelle.cfic_inscriptions(statut);
create index idx_cfic_insc_activite on chapelle.cfic_inscriptions(derniere_activite_at);

-- 1.6 cfic_progressions — avancement par leçon
create table chapelle.cfic_progressions (
  id              uuid primary key default gen_random_uuid(),
  inscription_id  uuid not null references chapelle.cfic_inscriptions(id) on delete cascade,
  lecon_id        uuid not null references chapelle.cfic_lecons(id) on delete cascade,
  statut          text not null default 'non_commence' check (statut in ('non_commence','en_cours','complete')),
  temps_passe_min integer not null default 0 check (temps_passe_min >= 0),
  complete_le     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  unique (inscription_id, lecon_id)
);
create index idx_cfic_prog_insc   on chapelle.cfic_progressions(inscription_id);
create index idx_cfic_prog_lecon  on chapelle.cfic_progressions(lecon_id);
create index idx_cfic_prog_statut on chapelle.cfic_progressions(statut);

-- 1.7 cfic_evaluations — quiz / devoirs notés
create table chapelle.cfic_evaluations (
  id             uuid primary key default gen_random_uuid(),
  inscription_id uuid not null references chapelle.cfic_inscriptions(id) on delete cascade,
  lecon_id       uuid references chapelle.cfic_lecons(id) on delete set null,
  titre          text not null,
  note           numeric(5,2) check (note between 0 and 100),
  note_max       numeric(5,2) not null default 100,
  reponses       jsonb not null default '{}',
  corrige_par    uuid references chapelle.members(id) on delete set null,
  soumis_le      timestamptz,
  corrige_le     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);
create index idx_cfic_eval_insc  on chapelle.cfic_evaluations(inscription_id);
create index idx_cfic_eval_lecon on chapelle.cfic_evaluations(lecon_id);

-- 1.8 cfic_certifications — certificats émis
create table chapelle.cfic_certifications (
  id             uuid primary key default gen_random_uuid(),
  inscription_id uuid not null unique references chapelle.cfic_inscriptions(id) on delete cascade,
  member_id      uuid not null references chapelle.members(id) on delete cascade,
  cursus_id      uuid references chapelle.cfic_cursus(id) on delete set null,
  numero         text not null unique,
  note_obtenue   numeric(5,2) not null,
  statut         text not null default 'emise' check (statut in ('emise','revoquee','expiree')),
  url_pdf        text,
  emise_le       timestamptz not null default now(),
  expire_le      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);
create index idx_cfic_certif_member on chapelle.cfic_certifications(member_id);
create index idx_cfic_certif_cursus on chapelle.cfic_certifications(cursus_id);
