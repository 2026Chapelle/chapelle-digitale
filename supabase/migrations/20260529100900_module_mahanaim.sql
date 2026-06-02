-- =============================================================================
-- CHAPELLE — Module Mahanaïm (Prière / Intercession) — tables mahanaim_*
-- =============================================================================
set search_path = chapelle, public;

-- 1.1 mahanaim_intercessors — fiche intercesseur
create table chapelle.mahanaim_intercessors (
  id                   uuid primary key default gen_random_uuid(),
  member_id            uuid not null unique references chapelle.members(id) on delete cascade,
  niveau               text not null default 'recrue'
                         check (niveau in ('recrue','intercesseur','veilleur','sentinelle','chef_de_garde')),
  engagement_hebdo_min integer check (engagement_hebdo_min > 0),
  disponibilites       jsonb not null default '{}',
  charismes            text[],
  est_actif            boolean not null default true,
  derniere_activite_at timestamptz,
  serment_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);
create index idx_mahanaim_int_niveau on chapelle.mahanaim_intercessors(niveau);
create index idx_mahanaim_int_actif  on chapelle.mahanaim_intercessors(est_actif, derniere_activite_at);

-- 1.2 mahanaim_retreats — retraites & veillées (extension d'events)
create table chapelle.mahanaim_retreats (
  id                   uuid primary key default gen_random_uuid(),
  event_id             uuid not null unique references chapelle.events(id) on delete cascade,
  type_retraite        text not null default 'veillee'
                         check (type_retraite in ('veillee','retraite','jeune','chaine_priere','nuit_priere')),
  theme                text,
  intention_principale text,
  duree_heures         numeric(5,2) check (duree_heures > 0),
  est_chaine_continue  boolean not null default false,
  responsable_id       uuid references chapelle.members(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);
create index idx_mahanaim_retreats_type on chapelle.mahanaim_retreats(type_retraite);
create index idx_mahanaim_retreats_resp on chapelle.mahanaim_retreats(responsable_id);

-- 1.3 mahanaim_watch_slots — créneaux de garde (chaîne 24/7)
create table chapelle.mahanaim_watch_slots (
  id         uuid primary key default gen_random_uuid(),
  retreat_id uuid not null references chapelle.mahanaim_retreats(id) on delete cascade,
  debut      timestamptz not null,
  fin        timestamptz not null check (fin > debut),
  capacite   integer check (capacite > 0),
  intention  text,
  statut     text not null default 'ouvert' check (statut in ('ouvert','complet','clos')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index idx_mahanaim_slots_retreat on chapelle.mahanaim_watch_slots(retreat_id);
create index idx_mahanaim_slots_debut   on chapelle.mahanaim_watch_slots(retreat_id, debut);
create index idx_mahanaim_slots_statut  on chapelle.mahanaim_watch_slots(statut);

-- 1.4 mahanaim_watch_assignments — affectation sentinelle ↔ créneau
create table chapelle.mahanaim_watch_assignments (
  id          uuid primary key default gen_random_uuid(),
  slot_id     uuid not null references chapelle.mahanaim_watch_slots(id) on delete cascade,
  member_id   uuid not null references chapelle.members(id) on delete cascade,
  statut      text not null default 'inscrit' check (statut in ('inscrit','confirme','present','absent','annule')),
  confirme_at timestamptz,
  pointe_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  unique (slot_id, member_id)
);
create index idx_mahanaim_assign_slot   on chapelle.mahanaim_watch_assignments(slot_id);
create index idx_mahanaim_assign_member on chapelle.mahanaim_watch_assignments(member_id);
create index idx_mahanaim_assign_statut on chapelle.mahanaim_watch_assignments(member_id, statut);

-- 1.5 mahanaim_prayer_assignments — relais d'intercession sur demande de prière
create table chapelle.mahanaim_prayer_assignments (
  id                uuid primary key default gen_random_uuid(),
  prayer_request_id uuid not null references chapelle.prayer_requests(id) on delete cascade,
  member_id         uuid not null references chapelle.members(id) on delete cascade,
  statut            text not null default 'a_prier' check (statut in ('a_prier','en_cours','prie','exauce_signale')),
  note_intercesseur text,
  prie_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  unique (prayer_request_id, member_id)
);
create index idx_mahanaim_pa_request on chapelle.mahanaim_prayer_assignments(prayer_request_id);
create index idx_mahanaim_pa_member  on chapelle.mahanaim_prayer_assignments(member_id);
create index idx_mahanaim_pa_statut  on chapelle.mahanaim_prayer_assignments(statut);

-- 1.6 mahanaim_prayer_log — journal de prière (append-only, source d'engagement)
create table chapelle.mahanaim_prayer_log (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references chapelle.members(id) on delete cascade,
  slot_id       uuid references chapelle.mahanaim_watch_slots(id) on delete set null,
  retreat_id    uuid references chapelle.mahanaim_retreats(id) on delete set null,
  duree_minutes integer not null check (duree_minutes > 0),
  source        text not null default 'garde' check (source in ('garde','veillee','relais','personnel')),
  effectue_le   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index idx_mahanaim_log_member on chapelle.mahanaim_prayer_log(member_id);
create index idx_mahanaim_log_time   on chapelle.mahanaim_prayer_log(member_id, effectue_le);
create index idx_mahanaim_log_retreat on chapelle.mahanaim_prayer_log(retreat_id);
