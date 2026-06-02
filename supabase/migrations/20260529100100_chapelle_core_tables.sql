-- =============================================================================
-- CHAPELLE — 02. Tables CORE (canoniques) + indexes
-- =============================================================================
set search_path = chapelle, public;

-- ----------------------------------------------------------------------------
-- platforms — référentiel des 8 plateformes (hiérarchie sous CIER)
-- ----------------------------------------------------------------------------
create table chapelle.platforms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  nom         text not null,
  type        chapelle.platform_type not null,
  couleur     text check (couleur ~ '^#[0-9A-Fa-f]{6}$'),
  description text,
  parent_id   uuid references chapelle.platforms(id) on delete set null,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
create index idx_platforms_parent on chapelle.platforms(parent_id);
create index idx_platforms_actif  on chapelle.platforms(actif);

-- ----------------------------------------------------------------------------
-- roles — référentiel RBAC
-- ----------------------------------------------------------------------------
create table chapelle.roles (
  id              uuid primary key default gen_random_uuid(),
  key             chapelle.role_key not null unique,
  label           text not null,
  description     text,
  niveau          integer not null,
  est_global_only boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

-- ----------------------------------------------------------------------------
-- members — profil unifié (lié à auth.users)
-- ----------------------------------------------------------------------------
create table chapelle.members (
  id                   uuid primary key default gen_random_uuid(),
  auth_user_id         uuid unique references auth.users(id) on delete set null,
  prenom               text not null,
  nom                  text,
  email                text,
  telephone            text,
  pays                 text,
  statut               chapelle.member_statut not null default 'actif',
  tunnel_stage         chapelle.tunnel_stage  not null default 'visiteur',
  role_global          chapelle.role_key      not null default 'visiteur',
  score_engagement     integer not null default 0 check (score_engagement >= 0),
  avatar_url           text,
  consentement_rgpd_at timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);
create unique index idx_members_email_lower on chapelle.members (lower(email)) where email is not null;
create index idx_members_auth   on chapelle.members(auth_user_id);
create index idx_members_tunnel on chapelle.members(tunnel_stage);
create index idx_members_score  on chapelle.members(score_engagement desc);

-- ----------------------------------------------------------------------------
-- memberships — N-N member ↔ platform (RBAC par plateforme)
-- ----------------------------------------------------------------------------
create table chapelle.memberships (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references chapelle.members(id)   on delete cascade,
  platform_id   uuid not null references chapelle.platforms(id) on delete cascade,
  role          chapelle.role_key not null default 'membre',
  date_adhesion date not null default current_date,
  statut        chapelle.member_statut not null default 'actif',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  unique (member_id, platform_id)
);
create index idx_memberships_member   on chapelle.memberships(member_id);
create index idx_memberships_platform on chapelle.memberships(platform_id);
create index idx_memberships_plat_role on chapelle.memberships(platform_id, role);

-- ----------------------------------------------------------------------------
-- events — événements / programmes
-- ----------------------------------------------------------------------------
create table chapelle.events (
  id           uuid primary key default gen_random_uuid(),
  platform_id  uuid not null references chapelle.platforms(id) on delete cascade,
  titre        text not null,
  description  text,
  lieu         text,
  est_en_ligne boolean not null default false,
  lien_visio   text,
  date_debut   timestamptz not null,
  date_fin     timestamptz check (date_fin >= date_debut),
  capacite     integer check (capacite > 0),
  statut       chapelle.event_statut not null default 'brouillon',
  created_by   uuid references chapelle.members(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);
create index idx_events_platform on chapelle.events(platform_id);
create index idx_events_debut    on chapelle.events(date_debut);
create index idx_events_statut   on chapelle.events(statut);

-- ----------------------------------------------------------------------------
-- donations — offrandes / dons
-- ----------------------------------------------------------------------------
create table chapelle.donations (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid references chapelle.members(id)   on delete set null,
  platform_id       uuid references chapelle.platforms(id) on delete set null,
  type              chapelle.donation_type not null default 'offrande',
  montant           numeric(12,2) not null check (montant > 0),
  devise            text not null default 'EUR',
  methode           text,
  reference_externe text,
  est_recurrent     boolean not null default false,
  statut_paiement   text not null default 'reussi'
                      check (statut_paiement in ('en_attente','reussi','echoue','rembourse')),
  donne_le          timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);
create index idx_donations_member   on chapelle.donations(member_id);
create index idx_donations_platform on chapelle.donations(platform_id);
create index idx_donations_donne_le on chapelle.donations(donne_le);
create unique index idx_donations_ref on chapelle.donations(reference_externe) where reference_externe is not null;

-- ----------------------------------------------------------------------------
-- prayer_requests — demandes de prière
-- ----------------------------------------------------------------------------
create table chapelle.prayer_requests (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid references chapelle.members(id)   on delete set null,
  platform_id  uuid references chapelle.platforms(id) on delete set null,
  sujet        text,
  contenu      text not null,
  est_anonyme  boolean not null default false,
  est_public   boolean not null default false,
  statut       chapelle.prayer_statut not null default 'nouvelle',
  assigne_a    uuid references chapelle.members(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);
create index idx_prayer_statut   on chapelle.prayer_requests(statut);
create index idx_prayer_platform on chapelle.prayer_requests(platform_id);
create index idx_prayer_assigne  on chapelle.prayer_requests(assigne_a);

-- ----------------------------------------------------------------------------
-- form_submissions — leads / soumissions de formulaire
-- ----------------------------------------------------------------------------
create table chapelle.form_submissions (
  id          uuid primary key default gen_random_uuid(),
  platform_id uuid references chapelle.platforms(id) on delete set null,
  member_id   uuid references chapelle.members(id)   on delete set null,
  form_slug   text not null,
  payload     jsonb not null default '{}',
  email       text,
  telephone   text,
  source      text,
  traite      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
create index idx_forms_platform on chapelle.form_submissions(platform_id);
create index idx_forms_slug      on chapelle.form_submissions(form_slug);
create index idx_forms_member    on chapelle.form_submissions(member_id);
create index idx_forms_payload    on chapelle.form_submissions using gin (payload);

-- ----------------------------------------------------------------------------
-- notifications — multi-canal
-- ----------------------------------------------------------------------------
create table chapelle.notifications (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references chapelle.members(id) on delete cascade,
  platform_id uuid references chapelle.platforms(id) on delete set null,
  canal       chapelle.notif_canal not null default 'in_app',
  titre       text not null,
  corps       text,
  lien        text,
  lu_at       timestamptz,
  envoye_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);
create index idx_notif_member_lu on chapelle.notifications(member_id, lu_at);
create index idx_notif_created   on chapelle.notifications(created_at);

-- ----------------------------------------------------------------------------
-- analytics_events — tracking (append-only)
-- ----------------------------------------------------------------------------
create table chapelle.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  platform_id uuid references chapelle.platforms(id) on delete set null,
  member_id   uuid references chapelle.members(id)   on delete set null,
  session_id  text,
  event_type  text not null,
  path        text,
  referrer    text,
  utm         jsonb,
  metadata    jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index idx_analytics_plat_time on chapelle.analytics_events(platform_id, occurred_at);
create index idx_analytics_type      on chapelle.analytics_events(event_type);
create index idx_analytics_session   on chapelle.analytics_events(session_id);

-- ----------------------------------------------------------------------------
-- integration_journeys — tunnel d'intégration matérialisé (1 par member/platform)
-- ----------------------------------------------------------------------------
create table chapelle.integration_journeys (
  id                        uuid primary key default gen_random_uuid(),
  member_id                 uuid not null references chapelle.members(id)   on delete cascade,
  platform_id               uuid not null references chapelle.platforms(id) on delete cascade,
  a_rempli_formulaire       boolean not null default false,
  a_rempli_formulaire_at    timestamptz,
  a_rejoint_whatsapp        boolean not null default false,
  a_rejoint_whatsapp_at     timestamptz,
  a_suivi_parcours          boolean not null default false,
  a_suivi_parcours_at       timestamptz,
  a_participe_programme     boolean not null default false,
  a_participe_programme_at  timestamptz,
  est_devenu_membre         boolean not null default false,
  est_devenu_membre_at      timestamptz,
  stage_courant             chapelle.tunnel_stage not null default 'visiteur',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz,
  unique (member_id, platform_id)
);
create index idx_journeys_member on chapelle.integration_journeys(member_id);
create index idx_journeys_plat   on chapelle.integration_journeys(platform_id);
create index idx_journeys_stage  on chapelle.integration_journeys(stage_courant);
