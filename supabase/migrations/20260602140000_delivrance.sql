-- ============================================================================
-- CENTRE DE DÉLIVRANCE & CURE D'ÂME — confidentialité renforcée
-- ----------------------------------------------------------------------------
-- Données sensibles : RLS STRICTE. Une demande n'est JAMAIS lisible publiquement
-- ni par un autre membre — uniquement par son auteur. Le suivi pastoral (notes
-- internes, assignation) passe par la service role (back-office). Additif.
-- ============================================================================

-- 1) Demandes d'accompagnement (diagnostic + suivi pastoral) -----------------
create table if not exists public.delivrance_demandes (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        references public.profiles(id) on delete set null,
  prenom         text,
  email          text,
  sujet          text,
  description    text,
  diagnostic     jsonb,                                   -- réponses + score
  niveau         text,                                    -- leger | modere | profond
  parcours_recommande text,
  assigned_to    uuid        references public.profiles(id) on delete set null,
  notes_internes text,                                    -- JAMAIS exposé au membre
  statut         text        not null default 'recu',     -- recu | en_attente | en_traitement | suivi | cloture
  confidentiel   boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_deliv_user on public.delivrance_demandes (user_id);
create index if not exists idx_deliv_statut on public.delivrance_demandes (statut);

alter table public.delivrance_demandes enable row level security;

-- Insertion : un membre connecté crée SA demande.
drop policy if exists deliv_insert_own on public.delivrance_demandes;
create policy deliv_insert_own on public.delivrance_demandes for insert
  to authenticated with check (user_id = auth.uid());

-- Lecture : STRICTEMENT sa propre demande (jamais celle d'autrui, jamais anon).
drop policy if exists deliv_select_own on public.delivrance_demandes;
create policy deliv_select_own on public.delivrance_demandes for select
  to authenticated using (user_id = auth.uid());

-- Mise à jour limitée par le membre (ex. compléter sa description) sur ses lignes.
drop policy if exists deliv_update_own on public.delivrance_demandes;
create policy deliv_update_own on public.delivrance_demandes for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- NB : notes_internes / assigned_to / statut gérés via service role uniquement.

-- 2) Ressources du centre (enseignements, prières guidées, PDF, vidéos) ------
create table if not exists public.delivrance_ressources (
  id           uuid        primary key default gen_random_uuid(),
  type         text        not null default 'priere',     -- video | audio | pdf | priere | texte
  titre        text        not null,
  description  text,
  url          text,
  contenu      text,                                       -- texte d'une prière guidée
  categorie    text,                                       -- guerison | delivrance | restauration | identite …
  duree_minutes int        not null default 0,
  ordre        int         not null default 0,
  status       text        not null default 'published',   -- draft | published
  created_at   timestamptz not null default now()
);
create index if not exists idx_deliv_res on public.delivrance_ressources (status, ordre);

alter table public.delivrance_ressources enable row level security;
-- Lecture réservée aux MEMBRES connectés (pas anon), ressources publiées.
drop policy if exists deliv_res_read on public.delivrance_ressources;
create policy deliv_res_read on public.delivrance_ressources for select
  to authenticated using (status = 'published');
-- Écriture via service role (back-office).
