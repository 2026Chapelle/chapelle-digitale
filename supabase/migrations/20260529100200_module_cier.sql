-- =============================================================================
-- CHAPELLE — Module CIER (hub central) — tables cier_*
-- =============================================================================
set search_path = chapelle, public;

-- 1.1 cier_cultes — programmation des cultes (extension d'events)
create table chapelle.cier_cultes (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null unique references chapelle.events(id) on delete cascade,
  type_culte          text not null check (type_culte in ('dimanche','priere','veillee','special','bapteme','sainte_cene')),
  theme               text,
  predicateur_id      uuid references chapelle.members(id) on delete set null,
  texte_biblique      text,
  lien_replay         text,
  nb_places_physiques integer check (nb_places_physiques > 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);
create index idx_cier_cultes_event on chapelle.cier_cultes(event_id);

-- 1.2 cier_presences_culte — présences (physique / en ligne)
create table chapelle.cier_presences_culte (
  id          uuid primary key default gen_random_uuid(),
  culte_id    uuid not null references chapelle.cier_cultes(id) on delete cascade,
  member_id   uuid references chapelle.members(id) on delete set null,
  mode        text not null default 'physique' check (mode in ('physique','en_ligne')),
  check_in_at timestamptz not null default now(),
  source      text check (source is null or source in ('qr','manuel','stream','auto')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
-- une présence par membre/culte (les présences anonymes member_id null ne sont pas contraintes)
create unique index idx_cier_presence_unique on chapelle.cier_presences_culte(culte_id, member_id) where member_id is not null;
create index idx_cier_presence_culte  on chapelle.cier_presences_culte(culte_id);
create index idx_cier_presence_member on chapelle.cier_presences_culte(member_id);

-- 1.3 cier_vision_axes — axes de vision & objectifs annuels
create table chapelle.cier_vision_axes (
  id              uuid primary key default gen_random_uuid(),
  annee           integer not null check (annee >= 2020),
  titre           text not null,
  description     text,
  objectif_chiffre numeric(14,2),
  unite           text,
  valeur_courante numeric(14,2) not null default 0,
  ordre           integer not null default 0,
  est_public      boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);
create index idx_cier_vision_annee on chapelle.cier_vision_axes(annee);

-- 1.4 cier_annuaire_plateformes — vitrine / aiguillage
create table chapelle.cier_annuaire_plateformes (
  id                   uuid primary key default gen_random_uuid(),
  platform_id          uuid not null unique references chapelle.platforms(id) on delete cascade,
  accroche             text,
  image_couverture_url text,
  cta_label            text,
  cta_url              text,
  ordre_affichage      integer not null default 0,
  est_mise_en_avant    boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);

-- 1.5 cier_promesses_dons — promesses / engagements de dîme
create table chapelle.cier_promesses_dons (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references chapelle.members(id) on delete cascade,
  type          chapelle.donation_type not null default 'dime',
  montant_cible numeric(12,2) not null check (montant_cible > 0),
  devise        text not null default 'EUR',
  frequence     text not null default 'mensuel' check (frequence in ('unique','hebdo','mensuel','annuel')),
  date_debut    date not null default current_date,
  date_fin      date check (date_fin >= date_debut),
  statut        text not null default 'active' check (statut in ('active','honoree','en_retard','annulee')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);
create index idx_cier_promesses_member on chapelle.cier_promesses_dons(member_id);

-- 1.6 cier_admin_audit — journal d'audit (append-only)
create table chapelle.cier_admin_audit (
  id          uuid primary key default gen_random_uuid(),
  acteur_id   uuid references chapelle.members(id) on delete set null,
  action      text not null,
  cible_table text,
  cible_id    uuid,
  payload     jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index idx_cier_audit_acteur on chapelle.cier_admin_audit(acteur_id);
create index idx_cier_audit_time   on chapelle.cier_admin_audit(occurred_at);
