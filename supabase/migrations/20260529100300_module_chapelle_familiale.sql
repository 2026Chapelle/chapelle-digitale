-- =============================================================================
-- CHAPELLE — Module Chapelle Familiale — tables familiale_*
-- =============================================================================
set search_path = chapelle, public;

-- 1.2 familiale_foyers — cellule familiale (unité métier centrale)
create table chapelle.familiale_foyers (
  id                  uuid primary key default gen_random_uuid(),
  platform_id         uuid not null references chapelle.platforms(id) on delete cascade,
  nom_foyer           text,
  type_foyer          text not null default 'autre'
                        check (type_foyer in ('couple_marie','couple_fiance','parent_solo','famille_recomposee','celibataire','autre')),
  referent_member_id  uuid references chapelle.members(id) on delete set null,
  nb_enfants          integer not null default 0 check (nb_enfants >= 0),
  date_union          date,
  accompagne_par      uuid references chapelle.members(id) on delete set null,
  suivi_statut        text not null default 'ouvert'
                        check (suivi_statut in ('ouvert','en_accompagnement','en_pause','cloture')),
  notes_privees       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);
create index idx_familiale_foyers_plat   on chapelle.familiale_foyers(platform_id);
create index idx_familiale_foyers_ref    on chapelle.familiale_foyers(referent_member_id);
create index idx_familiale_foyers_acc    on chapelle.familiale_foyers(accompagne_par);
create index idx_familiale_foyers_statut on chapelle.familiale_foyers(suivi_statut);

-- 1.3 familiale_foyer_membres — N-N foyer ↔ members
create table chapelle.familiale_foyer_membres (
  id         uuid primary key default gen_random_uuid(),
  foyer_id   uuid not null references chapelle.familiale_foyers(id) on delete cascade,
  member_id  uuid not null references chapelle.members(id) on delete cascade,
  lien_foyer text not null default 'conjoint' check (lien_foyer in ('conjoint','enfant','parent','autre')),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (foyer_id, member_id)
);
create index idx_familiale_fm_foyer  on chapelle.familiale_foyer_membres(foyer_id);
create index idx_familiale_fm_member on chapelle.familiale_foyer_membres(member_id);

-- 1.4 familiale_sessions — sessions couples / ateliers parentalité
create table chapelle.familiale_sessions (
  id                  uuid primary key default gen_random_uuid(),
  platform_id         uuid not null references chapelle.platforms(id) on delete cascade,
  event_id            uuid references chapelle.events(id) on delete set null,
  format              text not null check (format in ('couple','parentalite','pre_marital','familial','mediation')),
  titre               text not null,
  theme               text,
  animateur_member_id uuid references chapelle.members(id) on delete set null,
  date_session        timestamptz not null,
  duree_min           integer check (duree_min > 0),
  capacite            integer check (capacite > 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);
create index idx_familiale_sessions_plat   on chapelle.familiale_sessions(platform_id);
create index idx_familiale_sessions_format on chapelle.familiale_sessions(format);
create index idx_familiale_sessions_date   on chapelle.familiale_sessions(date_session);
create index idx_familiale_sessions_anim   on chapelle.familiale_sessions(animateur_member_id);

-- 1.5 familiale_session_inscriptions — présence aux sessions
create table chapelle.familiale_session_inscriptions (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references chapelle.familiale_sessions(id) on delete cascade,
  member_id   uuid not null references chapelle.members(id) on delete cascade,
  foyer_id    uuid references chapelle.familiale_foyers(id) on delete set null,
  statut      text not null default 'inscrit' check (statut in ('inscrit','present','absent','excuse','annule')),
  presence_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  unique (session_id, member_id)
);
create index idx_familiale_si_session on chapelle.familiale_session_inscriptions(session_id);
create index idx_familiale_si_member  on chapelle.familiale_session_inscriptions(member_id);
create index idx_familiale_si_statut  on chapelle.familiale_session_inscriptions(session_id, statut);
create index idx_familiale_si_foyer   on chapelle.familiale_session_inscriptions(foyer_id);

-- 1.6 familiale_parcours_progression — niveau interne par foyer
create table chapelle.familiale_parcours_progression (
  id                        uuid primary key default gen_random_uuid(),
  foyer_id                  uuid not null unique references chapelle.familiale_foyers(id) on delete cascade,
  niveau                    text not null default 'decouverte'
                              check (niveau in ('decouverte','fondations','croissance','mentor')),
  a_fait_bilan_initial      boolean not null default false,
  a_fait_bilan_initial_at   timestamptz,
  sessions_completees       integer not null default 0 check (sessions_completees >= 0),
  a_certifie_pre_marital    boolean not null default false,
  a_certifie_pre_marital_at timestamptz,
  est_couple_mentor         boolean not null default false,
  derniere_activite_at      timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz
);
create index idx_familiale_prog_niveau on chapelle.familiale_parcours_progression(niveau);
