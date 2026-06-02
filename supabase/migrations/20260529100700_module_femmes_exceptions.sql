-- =============================================================================
-- CHAPELLE — Module Femmes d'Exceptions — tables femmes_*
-- =============================================================================
set search_path = chapelle, public;

-- 1.1 femmes_profils — extension de profil (1-1)
create table chapelle.femmes_profils (
  id                  uuid primary key default gen_random_uuid(),
  member_id           uuid not null unique references chapelle.members(id) on delete cascade,
  tranche_age         text check (tranche_age in ('-25','25-34','35-44','45-54','55-64','65+')),
  situation_familiale text check (situation_familiale in ('celibataire','mariee','fiancee','veuve','divorcee','autre')),
  est_mere            boolean not null default false,
  centres_interet     text[],
  souhaite_mentorat   boolean not null default false,
  disponibilite       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

-- 1.2 femmes_cercles — cercles / groupes de sororité
create table chapelle.femmes_cercles (
  id            uuid primary key default gen_random_uuid(),
  platform_id   uuid not null references chapelle.platforms(id) on delete cascade,
  nom           text not null,
  theme         text,
  description   text,
  animatrice_id uuid references chapelle.members(id) on delete set null,
  jour_rencontre text,
  capacite      integer check (capacite > 0),
  est_ouvert    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);
create index idx_femmes_cercles_plat on chapelle.femmes_cercles(platform_id);

-- 1.3 femmes_cercle_membres — adhésion N-N membre ↔ cercle
create table chapelle.femmes_cercle_membres (
  id          uuid primary key default gen_random_uuid(),
  cercle_id   uuid not null references chapelle.femmes_cercles(id) on delete cascade,
  member_id   uuid not null references chapelle.members(id) on delete cascade,
  role_cercle text not null default 'participante' check (role_cercle in ('participante','co_animatrice','animatrice')),
  statut      chapelle.member_statut not null default 'actif',
  date_entree date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  unique (cercle_id, member_id)
);
create index idx_femmes_cm_cercle on chapelle.femmes_cercle_membres(cercle_id);
create index idx_femmes_cm_member on chapelle.femmes_cercle_membres(member_id);

-- 1.4 femmes_evenement_meta — métadonnées métier sur un event
create table chapelle.femmes_evenement_meta (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null unique references chapelle.events(id) on delete cascade,
  categorie           text not null check (categorie in ('retraite','conference','atelier','veillee','brunch')),
  theme               text,
  oratrice_principale text,
  frais_participation numeric(10,2) check (frais_participation >= 0),
  nb_nuitees          integer check (nb_nuitees >= 0),
  cible               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);
create index idx_femmes_evtmeta_cat on chapelle.femmes_evenement_meta(categorie);

-- 1.5 femmes_inscriptions — inscriptions aux événements
create table chapelle.femmes_inscriptions (
  id                   uuid primary key default gen_random_uuid(),
  event_id             uuid not null references chapelle.events(id) on delete cascade,
  member_id            uuid references chapelle.members(id) on delete set null,
  nom_complet          text,
  email                text,
  telephone            text,
  statut               text not null default 'inscrite'
                         check (statut in ('inscrite','confirmee','presente','absente','annulee','liste_attente')),
  frais_du             numeric(10,2) check (frais_du >= 0),
  paiement_donation_id uuid references chapelle.donations(id) on delete set null,
  checkin_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);
create unique index idx_femmes_insc_unique on chapelle.femmes_inscriptions(event_id, member_id) where member_id is not null;
create index idx_femmes_insc_event  on chapelle.femmes_inscriptions(event_id);
create index idx_femmes_insc_member on chapelle.femmes_inscriptions(member_id);
create index idx_femmes_insc_statut on chapelle.femmes_inscriptions(event_id, statut);

-- 1.6 femmes_mentorat — binômes mentore / mentorée
create table chapelle.femmes_mentorat (
  id          uuid primary key default gen_random_uuid(),
  platform_id uuid not null references chapelle.platforms(id) on delete cascade,
  mentore_id  uuid not null references chapelle.members(id) on delete cascade,
  mentoree_id uuid not null references chapelle.members(id) on delete cascade,
  statut      text not null default 'propose' check (statut in ('propose','actif','en_pause','termine')),
  objectif    text,
  date_debut  date,
  date_fin    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  check (mentore_id <> mentoree_id)
);
-- un seul binôme actif par couple
create unique index idx_femmes_mentorat_actif on chapelle.femmes_mentorat(mentore_id, mentoree_id) where statut = 'actif';
create index idx_femmes_mentorat_mentore  on chapelle.femmes_mentorat(mentore_id);
create index idx_femmes_mentorat_mentoree on chapelle.femmes_mentorat(mentoree_id);

-- 1.7 femmes_temoignages — récits de transformation
create table chapelle.femmes_temoignages (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid references chapelle.members(id) on delete set null,
  event_id          uuid references chapelle.events(id) on delete set null,
  titre             text,
  contenu           text not null,
  est_anonyme       boolean not null default false,
  est_public        boolean not null default false,
  statut_moderation text not null default 'soumis' check (statut_moderation in ('soumis','approuve','rejete')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);
create index idx_femmes_temoign_statut on chapelle.femmes_temoignages(statut_moderation);
