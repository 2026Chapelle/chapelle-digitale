-- ============================================================================
-- ACADÉMIE DES ÉLUS — « Université numérique du Royaume »
-- ----------------------------------------------------------------------------
-- Schéma DÉDIÉ (préfixe academy_, dans `public`), additif et idempotent.
-- NE TOUCHE PAS aux schémas existants (public.profiles, chapelle.*).
--
-- Structure officielle : 6 NIVEAUX × 20 MODULES = 120 modules. Déblocage
-- SÉQUENTIEL strict (module N+1 accessible seulement après validation de N ;
-- niveau N+1 après les 20 modules du niveau N).
--
-- Récompenses :
--   • MODULE terminé     → BADGE (M1 = « Né du Royaume »).
--   • NIVEAU terminé 20/20→ CERTIFICAT OFFICIEL DE NIVEAU (n° AER-2026-000001).
--   • 6 NIVEAUX terminés → DIPLÔME SUPRÊME « Diplôme des Bâtisseurs du Royaume »
--     (mentions Distinction / Honneur / Très Honorable / Excellence Royale).
--   PAS de certificat par module.
--
-- Authenticité : numéro unique AER-2026-000001, QR code, vérification publique
-- (/academie/verifier), historique permanent étudiant.
--
-- Conçu pour 10 000+ étudiants, multi-appareil : la BASE est la SOURCE DE VÉRITÉ
-- (le registry TS src/lib/parcours/academie.ts reste un seed structurel). Les
-- sémantiques reflètent progress.ts (completed, quizScore, missionDone, journal,
-- completedAt) et types.ts (UnlockRule open|sequential|time, validation niveau).
--
-- Conventions repo : create table if not exists, gen_random_uuid(),
-- timestamptz default now(), trigger updated_at (réutilise chapelle.set_updated_at),
-- enable row level security + policies explicites. Lecture publique du contenu
-- PUBLIÉ ; progression/résultats : l'étudiant n'écrit/lit que les siens via
-- auth.uid() ; administration via service_role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Types (idempotents)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'academy_unlock_mode' and n.nspname = 'public') then
    create type public.academy_unlock_mode as enum ('open', 'sequential', 'time');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'academy_publish_status' and n.nspname = 'public') then
    create type public.academy_publish_status as enum ('published', 'planned', 'archived');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'academy_lesson_type' and n.nspname = 'public') then
    -- aligné sur ContentBlock | quiz | mission | journal (types.ts)
    create type public.academy_lesson_type as enum
      ('teaching','scripture','video','audio','declaration','callout','quiz','mission','journal');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'academy_progress_status' and n.nspname = 'public') then
    -- aligné sur StepStatus (progress.ts)
    create type public.academy_progress_status as enum ('locked','available','in_progress','completed');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'academy_diploma_mention' and n.nspname = 'public') then
    create type public.academy_diploma_mention as enum
      ('distinction','honneur','tres_honorable','excellence_royale');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'academy_credential_status' and n.nspname = 'public') then
    create type public.academy_credential_status as enum ('valide','revoque','remplace');
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- Helper updated_at (réutilise chapelle.set_updated_at si présent, sinon crée)
-- ----------------------------------------------------------------------------
create or replace function public.academy_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. CATALOGUE (contenu) — academy_levels / academy_modules / academy_lessons
--    + academy_quizzes (banque de questions). Lecture publique du publié.
-- ============================================================================

-- 1.1 NIVEAUX — 6 niveaux officiels.
create table if not exists public.academy_levels (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null unique,                 -- ex. 'fondements'
  ordre        smallint    not null unique,                 -- 1..6, séquence officielle
  titre        text        not null,
  theme        text        not null,
  description  text,
  couleur      text,                                        -- accent UI (#D4AF37…)
  -- Validation de niveau (LevelValidation, types.ts) :
  toutes_etapes_requises boolean not null default true,     -- toutes les 20 requises
  score_min_moyen        smallint,                           -- score moyen quiz mini (0-100)
  total_modules_attendus smallint not null default 20,
  status       public.academy_publish_status not null default 'planned',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint academy_levels_score_min_chk check (score_min_moyen is null or score_min_moyen between 0 and 100),
  constraint academy_levels_ordre_chk      check (ordre between 1 and 6)
);
create index if not exists idx_academy_levels_ordre  on public.academy_levels (ordre);
create index if not exists idx_academy_levels_status on public.academy_levels (status);

-- 1.2 MODULES — 20 par niveau (= « steps » du moteur).
create table if not exists public.academy_modules (
  id           uuid        primary key default gen_random_uuid(),
  level_id     uuid        not null references public.academy_levels(id) on delete cascade,
  slug         text        not null unique,                 -- ex. 'entrer-dans-le-royaume'
  legacy_step_id text      unique,                          -- pont registry TS (ex. 'acad-fondements-m1')
  ordre        smallint    not null,                        -- 1..20 dans le niveau
  titre        text        not null,
  sous_titre   text,
  resume       text,
  apropos      text,
  duree_min    smallint,
  xp           integer     not null default 100,
  -- Déblocage (UnlockRule, types.ts) : open|sequential|time + dayOffset.
  unlock_mode  public.academy_unlock_mode not null default 'sequential',
  unlock_day_offset smallint,                                -- pour unlock_mode='time'
  -- Ressources réelles (jamais inventées) — chemins public/ ou Storage.
  cover_url      text,                                       -- couverture module
  thumbnail_url  text,                                       -- miniature vidéo
  pdf_path       text,                                       -- manuel PDF (bucket privé ou public/)
  video_url      text,                                       -- YouTube/URL (éditable admin)
  -- Récompense de module : BADGE (référence catalogue, FK ajoutée plus bas).
  badge_id     uuid,
  status       public.academy_publish_status not null default 'planned',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint academy_modules_ordre_chk  check (ordre between 1 and 20),
  constraint academy_modules_xp_chk     check (xp >= 0),
  unique (level_id, ordre)
);
create index if not exists idx_academy_modules_level   on public.academy_modules (level_id, ordre);
create index if not exists idx_academy_modules_status  on public.academy_modules (status);
create index if not exists idx_academy_modules_badge   on public.academy_modules (badge_id);

-- 1.3 LEÇONS — blocs de contenu d'un module (ContentBlock|quiz|mission|journal).
create table if not exists public.academy_lessons (
  id           uuid        primary key default gen_random_uuid(),
  module_id    uuid        not null references public.academy_modules(id) on delete cascade,
  ordre        smallint    not null,
  type         public.academy_lesson_type not null,
  titre        text,
  -- Charge utile typée selon `type` (markdown, ref scripture, src vidéo/audio,
  -- prompt journal, mission…). Reflète l'union ContentBlock de types.ts.
  contenu      jsonb       not null default '{}'::jsonb,
  quiz_id      uuid,                                         -- si type='quiz' (FK plus bas)
  status       public.academy_publish_status not null default 'published',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (module_id, ordre)
);
create index if not exists idx_academy_lessons_module on public.academy_lessons (module_id, ordre);

-- 1.4 QUIZ — banque officielle (jamais de quiz fictif : créé au dépôt réel).
create table if not exists public.academy_quizzes (
  id              uuid        primary key default gen_random_uuid(),
  module_id       uuid        references public.academy_modules(id) on delete cascade,
  titre           text,
  -- Questions officielles : [{id, question, options[], correct, explication?}]
  -- (forme Quiz/QuizQuestion de types.ts). Vide tant que non déposé.
  questions       jsonb       not null default '[]'::jsonb,
  seuil_reussite  smallint    not null default 70,           -- score mini (0-100)
  status          public.academy_publish_status not null default 'planned',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint academy_quizzes_seuil_chk check (seuil_reussite between 0 and 100)
);
create index if not exists idx_academy_quizzes_module on public.academy_quizzes (module_id);

-- 1.5 BADGES (catalogue) — modèle de badge décerné à la complétion d'un module.
create table if not exists public.academy_badges (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null unique,                 -- ex. 'ne-du-royaume'
  module_id    uuid        references public.academy_modules(id) on delete set null, -- module qui le décerne
  titre        text        not null,                        -- ex. « Né du Royaume »
  description  text,
  image_url    text,                                        -- visuel du badge
  status       public.academy_publish_status not null default 'published',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_academy_badges_module on public.academy_badges (module_id);

-- FK croisées (créées après coup, idempotentes) : module→badge, leçon→quiz.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'academy_modules_badge_fk') then
    alter table public.academy_modules
      add constraint academy_modules_badge_fk
      foreign key (badge_id) references public.academy_badges(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'academy_lessons_quiz_fk') then
    alter table public.academy_lessons
      add constraint academy_lessons_quiz_fk
      foreign key (quiz_id) references public.academy_quizzes(id) on delete set null;
  end if;
end$$;

-- ============================================================================
-- 2. ENRÔLEMENT & PROGRESSION (par étudiant) — source de vérité multi-appareil.
--    Identité étudiant = auth.users(id) (auth.uid()). Un enrôlement / étudiant.
-- ============================================================================

-- 2.1 ENRÔLEMENT — un étudiant inscrit à l'Académie (parcours unique ici, mais
--     `programme` permet d'accueillir d'autres parcours sans refonte).
create table if not exists public.academy_enrollments (
  id              uuid        primary key default gen_random_uuid(),
  student_id      uuid        not null references auth.users(id) on delete cascade,
  programme       text        not null default 'academie-des-elus',
  -- Numéro étudiant permanent (historique) — distinct du n° de certificat.
  matricule       text        unique,                       -- ex. AER-2026-000001 (étudiant)
  started_at      timestamptz not null default now(),
  current_level_id  uuid      references public.academy_levels(id)  on delete set null,
  current_module_id uuid      references public.academy_modules(id) on delete set null,
  xp_total        integer     not null default 0,
  modules_completes smallint  not null default 0,
  niveaux_valides   smallint  not null default 0,
  completed_at    timestamptz,                              -- 6 niveaux terminés
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (student_id, programme)                            -- 1 enrôlement / étudiant / parcours
);
create index if not exists idx_academy_enroll_student on public.academy_enrollments (student_id);
create index if not exists idx_academy_enroll_prog    on public.academy_enrollments (programme);

-- 2.2 PROGRESSION par module (reflète StepProgress de progress.ts).
create table if not exists public.academy_progress (
  id            uuid        primary key default gen_random_uuid(),
  student_id    uuid        not null references auth.users(id) on delete cascade,
  enrollment_id uuid        references public.academy_enrollments(id) on delete cascade,
  module_id     uuid        not null references public.academy_modules(id) on delete cascade,
  level_id      uuid        references public.academy_levels(id) on delete set null,
  status        public.academy_progress_status not null default 'locked',
  completed     boolean     not null default false,
  quiz_score    smallint,                                   -- dernier score (0-100)
  mission_done  boolean     not null default false,
  journal       jsonb       not null default '{}'::jsonb,   -- {promptId: texte}
  started_at    timestamptz,
  completed_at  timestamptz,                                -- ISO de complétion
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  constraint academy_progress_quiz_chk check (quiz_score is null or quiz_score between 0 and 100),
  unique (student_id, module_id)                            -- 1 ligne / étudiant / module
);
-- Index d'échelle : lecture par étudiant, agrégation par niveau, tri par complétion.
create index if not exists idx_academy_progress_student        on public.academy_progress (student_id);
create index if not exists idx_academy_progress_module         on public.academy_progress (module_id);
create index if not exists idx_academy_progress_student_level  on public.academy_progress (student_id, level_id);
create index if not exists idx_academy_progress_level_done     on public.academy_progress (level_id) where completed = true;
create index if not exists idx_academy_progress_completed      on public.academy_progress (student_id, completed_at);

-- 2.3 TENTATIVES DE QUIZ — historique permanent (résultat = dernière tentative).
create table if not exists public.academy_quiz_attempts (
  id            uuid        primary key default gen_random_uuid(),
  student_id    uuid        not null references auth.users(id) on delete cascade,
  quiz_id       uuid        references public.academy_quizzes(id) on delete set null,
  module_id     uuid        references public.academy_modules(id) on delete set null,
  score         smallint    not null,                       -- 0-100
  reussi        boolean     not null default false,
  reponses      jsonb       not null default '[]'::jsonb,    -- réponses choisies
  attempt_no    integer     not null default 1,
  created_at    timestamptz not null default now(),
  constraint academy_attempt_score_chk check (score between 0 and 100)
);
create index if not exists idx_academy_attempts_student on public.academy_quiz_attempts (student_id, module_id);
create index if not exists idx_academy_attempts_quiz    on public.academy_quiz_attempts (quiz_id);

-- ============================================================================
-- 3. RÉCOMPENSES DÉCERNÉES (distinctes des catalogues)
--    badges gagnés / certificats de niveau / diplôme suprême. Historique permanent.
-- ============================================================================

-- 3.1 academy_results — RÉSULTAT consolidé par niveau (agrégat validé du niveau).
--     Sert de base au certificat de niveau et au calcul de mention du diplôme.
create table if not exists public.academy_results (
  id              uuid        primary key default gen_random_uuid(),
  student_id      uuid        not null references auth.users(id) on delete cascade,
  enrollment_id   uuid        references public.academy_enrollments(id) on delete cascade,
  level_id        uuid        not null references public.academy_levels(id) on delete cascade,
  modules_completes smallint  not null default 0,
  modules_total     smallint  not null default 20,
  score_moyen     numeric(5,2),                              -- moyenne quiz du niveau (0-100)
  valide          boolean     not null default false,        -- 20/20 + score requis
  validated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint academy_results_score_chk check (score_moyen is null or score_moyen between 0 and 100),
  unique (student_id, level_id)                              -- 1 résultat / étudiant / niveau
);
create index if not exists idx_academy_results_student on public.academy_results (student_id);
create index if not exists idx_academy_results_level   on public.academy_results (level_id);
create index if not exists idx_academy_results_valide  on public.academy_results (student_id) where valide = true;

-- 3.2 BADGES GAGNÉS — un badge décerné à un étudiant (module terminé).
create table if not exists public.academy_student_badges (
  id            uuid        primary key default gen_random_uuid(),
  student_id    uuid        not null references auth.users(id) on delete cascade,
  badge_id      uuid        not null references public.academy_badges(id) on delete cascade,
  module_id     uuid        references public.academy_modules(id) on delete set null,
  awarded_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (student_id, badge_id)                              -- 1 fois par badge
);
create index if not exists idx_academy_student_badges_student on public.academy_student_badges (student_id);

-- 3.3 CERTIFICATS OFFICIELS DE NIVEAU — décernés à la validation d'un niveau (20/20).
create table if not exists public.academy_certificates (
  id              uuid        primary key default gen_random_uuid(),
  student_id      uuid        not null references auth.users(id) on delete cascade,
  level_id        uuid        not null references public.academy_levels(id) on delete cascade,
  result_id       uuid        references public.academy_results(id) on delete set null,
  -- Authenticité : numéro unique AER-2026-000001 + QR + vérification publique.
  numero          text        not null unique,               -- ex. AER-2026-000001
  verification_code text      not null unique,                -- jeton public (QR / URL)
  qr_url          text,                                       -- image QR (Storage) optionnelle
  mention         text,                                       -- mention de niveau éventuelle
  score_moyen     numeric(5,2),
  status          public.academy_credential_status not null default 'valide',
  pdf_url         text,                                        -- certificat rendu (Storage)
  issued_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (student_id, level_id)                               -- 1 certificat / étudiant / niveau
);
create index if not exists idx_academy_certs_student on public.academy_certificates (student_id);
create index if not exists idx_academy_certs_numero  on public.academy_certificates (numero);
create index if not exists idx_academy_certs_verify  on public.academy_certificates (verification_code);

-- 3.4 DIPLÔME SUPRÊME — « Diplôme des Bâtisseurs du Royaume » (6 niveaux validés).
create table if not exists public.academy_diplomas (
  id              uuid        primary key default gen_random_uuid(),
  student_id      uuid        not null references auth.users(id) on delete cascade,
  enrollment_id   uuid        references public.academy_enrollments(id) on delete cascade,
  titre           text        not null default 'Diplôme des Bâtisseurs du Royaume',
  -- Mention selon résultats : Distinction / Honneur / Très Honorable / Excellence Royale.
  mention         public.academy_diploma_mention not null,
  score_global    numeric(5,2),                               -- moyenne des 6 niveaux
  numero          text        not null unique,                -- ex. AER-2026-DIP-000001
  verification_code text      not null unique,                 -- vérification publique
  qr_url          text,
  status          public.academy_credential_status not null default 'valide',
  pdf_url         text,
  issued_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (student_id, enrollment_id)                          -- 1 diplôme / parcours / étudiant
);
create index if not exists idx_academy_diplomas_student on public.academy_diplomas (student_id);
create index if not exists idx_academy_diplomas_numero  on public.academy_diplomas (numero);
create index if not exists idx_academy_diplomas_verify  on public.academy_diplomas (verification_code);

-- ============================================================================
-- 4. SÉQUENCE + GÉNÉRATEUR de numéros d'authenticité AER-2026-000001
-- ============================================================================
create sequence if not exists public.academy_credential_seq start 1;

-- Génère un numéro d'authenticité : AER-<année>-<prefix?><6 chiffres>.
create or replace function public.academy_next_numero(p_prefix text default '', p_year int default null)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_n   bigint;
  v_yr  int := coalesce(p_year, extract(year from now())::int);
begin
  v_n := nextval('public.academy_credential_seq');
  return 'AER-' || v_yr::text || '-' ||
         case when p_prefix is null or p_prefix = '' then '' else p_prefix || '-' end ||
         lpad(v_n::text, 6, '0');
end;
$$;
grant execute on function public.academy_next_numero(text, int) to service_role;

-- ============================================================================
-- 5. TRIGGERS updated_at (idempotents)
-- ============================================================================
do $$
declare
  t text;
  tables text[] := array[
    'academy_levels','academy_modules','academy_lessons','academy_quizzes',
    'academy_badges','academy_enrollments','academy_progress','academy_results',
    'academy_certificates','academy_diplomas'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated before update on public.%1$s
         for each row execute function public.academy_set_updated_at();', t);
  end loop;
end$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY + POLICIES
--    • Catalogue : lecture publique du contenu PUBLIÉ (anon + authenticated).
--    • Progression / résultats / récompenses : l'étudiant ne lit/écrit QUE les
--      siens via auth.uid(). Administration & génération : service_role (bypass RLS).
--    • Vérification publique des certificats/diplômes : lecture par numéro/code
--      gérée par une RPC SECURITY DEFINER (pas d'accès table direct anon).
-- ============================================================================

-- 6.1 Catalogue — lecture publique du publié.
alter table public.academy_levels  enable row level security;
alter table public.academy_modules enable row level security;
alter table public.academy_lessons enable row level security;
alter table public.academy_quizzes enable row level security;
alter table public.academy_badges  enable row level security;

drop policy if exists academy_levels_read on public.academy_levels;
create policy academy_levels_read on public.academy_levels
  for select to anon, authenticated using (status = 'published');

drop policy if exists academy_modules_read on public.academy_modules;
create policy academy_modules_read on public.academy_modules
  for select to anon, authenticated
  using (status in ('published','planned'));   -- structure visible (modules planned = fiches verrouillées)

drop policy if exists academy_lessons_read on public.academy_lessons;
create policy academy_lessons_read on public.academy_lessons
  for select to anon, authenticated using (status = 'published');

drop policy if exists academy_badges_read on public.academy_badges;
create policy academy_badges_read on public.academy_badges
  for select to anon, authenticated using (status = 'published');

-- Quiz : pas de lecture publique des bonnes réponses → authenticated seulement,
-- le scoring/validation passe par RPC service_role. (Pas de policy anon.)
drop policy if exists academy_quizzes_read on public.academy_quizzes;
create policy academy_quizzes_read on public.academy_quizzes
  for select to authenticated using (status = 'published');

-- 6.2 Enrôlement & progression — propriété stricte via auth.uid().
alter table public.academy_enrollments    enable row level security;
alter table public.academy_progress        enable row level security;
alter table public.academy_quiz_attempts   enable row level security;
alter table public.academy_results         enable row level security;
alter table public.academy_student_badges  enable row level security;
alter table public.academy_certificates    enable row level security;
alter table public.academy_diplomas        enable row level security;

-- Enrôlement : l'étudiant lit/crée/maj le sien.
drop policy if exists academy_enroll_select_own on public.academy_enrollments;
create policy academy_enroll_select_own on public.academy_enrollments
  for select to authenticated using (student_id = auth.uid());
drop policy if exists academy_enroll_insert_own on public.academy_enrollments;
create policy academy_enroll_insert_own on public.academy_enrollments
  for insert to authenticated with check (student_id = auth.uid());
drop policy if exists academy_enroll_update_own on public.academy_enrollments;
create policy academy_enroll_update_own on public.academy_enrollments
  for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Progression : lecture + écriture des siennes.
drop policy if exists academy_progress_select_own on public.academy_progress;
create policy academy_progress_select_own on public.academy_progress
  for select to authenticated using (student_id = auth.uid());
drop policy if exists academy_progress_insert_own on public.academy_progress;
create policy academy_progress_insert_own on public.academy_progress
  for insert to authenticated with check (student_id = auth.uid());
drop policy if exists academy_progress_update_own on public.academy_progress;
create policy academy_progress_update_own on public.academy_progress
  for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Tentatives de quiz : l'étudiant lit + insère les siennes (score serveur conseillé).
drop policy if exists academy_attempts_select_own on public.academy_quiz_attempts;
create policy academy_attempts_select_own on public.academy_quiz_attempts
  for select to authenticated using (student_id = auth.uid());
drop policy if exists academy_attempts_insert_own on public.academy_quiz_attempts;
create policy academy_attempts_insert_own on public.academy_quiz_attempts
  for insert to authenticated with check (student_id = auth.uid());

-- Résultats de niveau : LECTURE seule par l'étudiant (l'écriture est calculée
-- par le serveur / service_role pour garantir l'intégrité 20/20).
drop policy if exists academy_results_select_own on public.academy_results;
create policy academy_results_select_own on public.academy_results
  for select to authenticated using (student_id = auth.uid());

-- Badges gagnés : lecture seule par l'étudiant (décernés par le serveur).
drop policy if exists academy_student_badges_select_own on public.academy_student_badges;
create policy academy_student_badges_select_own on public.academy_student_badges
  for select to authenticated using (student_id = auth.uid());

-- Certificats : lecture seule par l'étudiant (émis par le serveur).
drop policy if exists academy_certificates_select_own on public.academy_certificates;
create policy academy_certificates_select_own on public.academy_certificates
  for select to authenticated using (student_id = auth.uid());

-- Diplômes : lecture seule par l'étudiant (émis par le serveur).
drop policy if exists academy_diplomas_select_own on public.academy_diplomas;
create policy academy_diplomas_select_own on public.academy_diplomas
  for select to authenticated using (student_id = auth.uid());

-- ============================================================================
-- 7. VÉRIFICATION PUBLIQUE (/academie/verifier) — RPC SECURITY DEFINER.
--    Renvoie l'authenticité d'un certificat OU diplôme par son code, SANS
--    exposer les tables (anon ne peut pas lister, seulement vérifier un code).
-- ============================================================================
create or replace function public.academy_verify_credential(p_code text)
returns table (
  type        text,    -- 'certificat' | 'diplome'
  numero      text,
  titre       text,
  mention     text,
  status      text,
  issued_at   timestamptz,
  valide      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select 'certificat'::text, c.numero,
         lv.titre, c.mention, c.status::text, c.issued_at,
         (c.status = 'valide')
  from public.academy_certificates c
  join public.academy_levels lv on lv.id = c.level_id
  where c.verification_code = p_code
  union all
  select 'diplome'::text, d.numero,
         d.titre, d.mention::text, d.status::text, d.issued_at,
         (d.status = 'valide')
  from public.academy_diplomas d
  where d.verification_code = p_code;
$$;
grant execute on function public.academy_verify_credential(text) to anon, authenticated, service_role;

-- ============================================================================
-- 8. SEED idempotent — 6 niveaux + Module 1 (published) + Module 2 (locked)
--    + badge catalogue « Né du Royaume ». AUCUN contenu/quiz fictif.
-- ============================================================================

-- 8.1 Les 6 niveaux officiels (slugs alignés sur le registry TS).
insert into public.academy_levels (slug, ordre, titre, theme, description, couleur, score_min_moyen, status)
values
  ('fondements',        1, 'Niveau 1 · Fondements du Royaume',                 'Fondements',          'Vingt modules pour poser les fondements du Royaume.',                 '#D4AF37', 70, 'published'),
  ('identite-heritage', 2, 'Niveau 2 · Identité et Héritage des Fils',         'Identité & Héritage', 'Vingt modules pour intégrer l''identité et l''héritage des fils.',    '#22C55E', 70, 'planned'),
  ('gouvernement',      3, 'Niveau 3 · Gouvernement du Royaume',               'Gouvernement',        'Vingt modules sur le gouvernement du Royaume.',                       '#0EA5E9', 70, 'planned'),
  ('puissance',         4, 'Niveau 4 · Puissance et Manifestation du Royaume', 'Puissance',           'Vingt modules sur la puissance et la manifestation du Royaume.',      '#F97316', 70, 'planned'),
  ('destinee-mission',  5, 'Niveau 5 · Destinée et Mission',                   'Destinée & Mission',  'Vingt modules sur la destinée et la mission.',                        '#8B5CF6', 70, 'planned'),
  ('batisseurs',        6, 'Niveau 6 · Bâtisseurs du Royaume',                 'Bâtisseurs',          'Vingt modules pour devenir bâtisseur du Royaume.',                    '#EC4899', 70, 'planned')
on conflict (slug) do update set
  ordre       = excluded.ordre,
  titre       = excluded.titre,
  theme       = excluded.theme,
  description = excluded.description,
  couleur     = excluded.couleur,
  score_min_moyen = excluded.score_min_moyen;
  -- NB : on ne réécrase PAS `status` au-delà du seed initial pour préserver les
  -- publications faites en back-office. (Le niveau 1 est publié par ce seed.)

-- 8.2 MODULE 1 — réel, publié (ressources réelles présentes dans public/academie).
insert into public.academy_modules (
  level_id, slug, legacy_step_id, ordre, titre, sous_titre, resume, apropos,
  xp, unlock_mode, cover_url, thumbnail_url, pdf_path, video_url, status
)
select lv.id, 'entrer-dans-le-royaume', 'acad-fondements-m1', 1,
  'Entrer dans le Royaume', 'Le Mystère de la Nouvelle Naissance',
  'Le mystère de la nouvelle naissance : comment naître de nouveau et entrer réellement dans le Royaume de Dieu.',
  'Le mystère de la nouvelle naissance : comprendre comment naître de nouveau et entrer réellement dans le Royaume de Dieu.',
  100, 'open',
  '/academie/fondements/m1/couverture.png',
  '/academie/fondements/m1/miniature-video.png',
  '/academie/fondements/m1/manuel.pdf',
  '',                                  -- vidéo YouTube à renseigner en admin
  'published'
from public.academy_levels lv where lv.slug = 'fondements'
on conflict (slug) do update set
  level_id      = excluded.level_id,
  legacy_step_id= excluded.legacy_step_id,
  ordre         = excluded.ordre,
  titre         = excluded.titre,
  sous_titre    = excluded.sous_titre,
  resume        = excluded.resume,
  apropos       = excluded.apropos,
  unlock_mode   = excluded.unlock_mode,
  cover_url     = excluded.cover_url,
  thumbnail_url = excluded.thumbnail_url,
  pdf_path      = excluded.pdf_path,
  status        = excluded.status;

-- 8.3 MODULE 2 — fiche réelle, VERROUILLÉE (séquentiel), contenu à venir (planned).
insert into public.academy_modules (
  level_id, slug, legacy_step_id, ordre, titre, sous_titre, resume, apropos,
  xp, unlock_mode, cover_url, thumbnail_url, status
)
select lv.id, 'decouvrir-le-royaume-invisible', 'acad-fondements-m2', 2,
  'Découvrir le Royaume Invisible', 'Le Royaume qui gouverne le monde visible',
  'Le Royaume invisible qui gouverne le monde visible — comprendre la réalité du Royaume avant ses manifestations.',
  'Le Royaume invisible qui gouverne le monde visible : découvrir la réalité du Royaume avant ses manifestations.',
  100, 'sequential',
  '/academie/fondements/m2/couverture.png',
  '/academie/fondements/m2/miniature-video.png',
  'planned'
from public.academy_levels lv where lv.slug = 'fondements'
on conflict (slug) do update set
  level_id      = excluded.level_id,
  legacy_step_id= excluded.legacy_step_id,
  ordre         = excluded.ordre,
  titre         = excluded.titre,
  sous_titre    = excluded.sous_titre,
  resume        = excluded.resume,
  apropos       = excluded.apropos,
  unlock_mode   = excluded.unlock_mode,
  cover_url     = excluded.cover_url,
  thumbnail_url = excluded.thumbnail_url;

-- 8.4 BADGE catalogue « Né du Royaume » (décerné par le Module 1).
insert into public.academy_badges (slug, module_id, titre, description, image_url, status)
select 'ne-du-royaume', m.id, 'Né du Royaume',
  'Badge décerné à la complétion du Module 1 « Entrer dans le Royaume ».',
  null, 'published'
from public.academy_modules m where m.slug = 'entrer-dans-le-royaume'
on conflict (slug) do update set
  module_id   = excluded.module_id,
  titre       = excluded.titre,
  description = excluded.description,
  status      = excluded.status;

-- Lier le Module 1 à son badge (récompense de module).
update public.academy_modules m
set badge_id = b.id
from public.academy_badges b
where m.slug = 'entrer-dans-le-royaume' and b.slug = 'ne-du-royaume' and m.badge_id is distinct from b.id;

-- ============================================================================
-- FIN — Académie des Élus. Tables academy_* prêtes pour 10 000+ étudiants.
-- ============================================================================

-- ============================================================================
-- DURCISSEMENT SÉCURITÉ (audit adversarial) — appliqué au schéma ci-dessus.
-- Corrige : fuite des réponses de quiz, auto-validation de progression,
-- matricule forgeable, search_path des fonctions, vérification publique.
-- ============================================================================

-- [Sécurité 1] FUITE DES RÉPONSES DE QUIZ — La policy `academy_quizzes_read` accorde `select` sur la ligne entière de `academy_quizzes`, dont la colonne `questions` jsonb qui 
-- 1) Couper l'accès direct aux quiz (plus aucune lecture client de la banque)
drop policy if exists academy_quizzes_read on public.academy_quizzes;
-- (aucune policy SELECT => RLS bloque tout client; seul service_role / SECURITY DEFINER lit)
revoke select on public.academy_quizzes from anon, authenticated;

-- 2) Vue publique SANS la bonne réponse (questions sans le champ correct/explication)
create or replace function public.academy_quiz_public(p_module_id uuid)
returns table (quiz_id uuid, titre text, seuil_reussite smallint, questions jsonb)
language sql stable security definer set search_path = public as $$
  select q.id, q.titre, q.seuil_reussite,
         coalesce(jsonb_agg(jsonb_build_object(
           'id', e->>'id', 'question', e->>'question', 'options', e->'options'
         ) order by ord), '[]'::jsonb)
  from public.academy_quizzes q
  cross join lateral jsonb_array_elements(q.questions) with ordinality as t(e, ord)
  where q.module_id = p_module_id and q.status = 'published'
  group by q.id, q.titre, q.seuil_reussite;
$$;
revoke all on function public.academy_quiz_public(uuid) from public;
grant execute on function public.academy_quiz_public(uuid) to authenticated, service_role;

-- 3) Correction côté serveur : le client envoie SES réponses, le serveur calcule le score
--    et écrit la tentative + la progression. Le client ne fournit JAMAIS le score.
create or replace function public.academy_submit_quiz(p_quiz_id uuid, p_answers jsonb)
returns table (score smallint, reussi boolean, attempt_no integer)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.academy_quizzes%rowtype;
  v_total int; v_ok int := 0; v_score smallint; v_pass boolean; v_no int;
  v_q jsonb; v_given int;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_quiz from public.academy_quizzes where id = p_quiz_id and status = 'published';
  if not found then raise exception 'quiz introuvable'; end if;
  v_total := jsonb_array_length(v_quiz.questions);
  if v_total = 0 then raise exception 'quiz sans questions'; end if;
  for v_q in select * from jsonb_array_elements(v_quiz.questions) loop
    v_given := nullif(p_answers ->> (v_q->>'id'), '')::int;
    if v_given is not null and v_given = (v_q->>'correct')::int then v_ok := v_ok + 1; end if;
  end loop;
  v_score := round(v_ok::numeric * 100 / v_total);
  v_pass  := v_score >= v_quiz.seuil_reussite;
  select coalesce(max(attempt_no),0)+1 into v_no
    from public.academy_quiz_attempts where student_id = v_uid and quiz_id = p_quiz_id;
  insert into public.academy_quiz_attempts(student_id, quiz_id, module_id, score, reussi, reponses, attempt_no)
    values (v_uid, p_quiz_id, v_quiz.module_id, v_score, v_pass, p_answers, v_no);
  return query select v_score, v_pass, v_no;
end; $$;
revoke all on function public.academy_submit_quiz(uuid, jsonb) from public;
grant execute on function public.academy_submit_quiz(uuid, jsonb) to authenticated, service_role;

-- 4) Empêcher le client d'écrire de fausses tentatives en direct
drop policy if exists academy_attempts_insert_own on public.academy_quiz_attempts;
revoke insert on public.academy_quiz_attempts from authenticated; -- insertion uniquement via RPC SECURITY DEFINER

-- [Sécurité 2] AUTO-VALIDATION DE LA PROGRESSION — Les policies `academy_progress_insert_own` / `academy_progress_update_own` autorisent l'étudiant à écrire n'importe quelle l
-- A) La progression devient PILOTÉE SERVEUR. Le client ne fait qu'enregistrer son journal
--    (donnée non-évaluative). completed / status / quiz_score ne sont JAMAIS écrits par le client.
drop policy if exists academy_progress_insert_own on public.academy_progress;
drop policy if exists academy_progress_update_own on public.academy_progress;
revoke insert, update on public.academy_progress from authenticated;

-- Journal seul, via RPC (donnée perso libre, sans effet sur la validation)
create or replace function public.academy_save_journal(p_module_id uuid, p_prompt_id text, p_texte text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'auth required'; end if;
  insert into public.academy_progress(student_id, module_id, journal, status)
    values (v_uid, p_module_id, jsonb_build_object(p_prompt_id, p_texte), 'in_progress')
  on conflict (student_id, module_id) do update
    set journal = public.academy_progress.journal || jsonb_build_object(p_prompt_id, p_texte),
        updated_at = now();
end; $$;
revoke all on function public.academy_save_journal(uuid, text, text) from public;
grant execute on function public.academy_save_journal(uuid, text, text) to authenticated;

-- B) Complétion d'un module : SERVEUR vérifie le déblocage séquentiel + le quiz réussi,
--    puis marque completed, décerne le badge, recalcule les agrégats. Anti-forge.
create or replace function public.academy_complete_module(p_module_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_mod public.academy_modules%rowtype;
  v_prev_ordre smallint; v_prev_done boolean; v_quiz_id uuid; v_best smallint;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_mod from public.academy_modules where id = p_module_id;
  if not found then raise exception 'module introuvable'; end if;

  -- Déblocage séquentiel : le module precedent du même niveau doit être complété.
  if v_mod.unlock_mode = 'sequential' and v_mod.ordre > 1 then
    select exists(
      select 1 from public.academy_progress p
      join public.academy_modules m on m.id = p.module_id
      where p.student_id = v_uid and m.level_id = v_mod.level_id
        and m.ordre = v_mod.ordre - 1 and p.completed = true
    ) into v_prev_done;
    if not v_prev_done then raise exception 'module verrouille (sequentiel)'; end if;
  end if;

  -- Si le module a un quiz publié, exiger une tentative RÉUSSIE (score serveur).
  select id into v_quiz_id from public.academy_quizzes where module_id = p_module_id and status='published' limit 1;
  if v_quiz_id is not null then
    select max(score) into v_best from public.academy_quiz_attempts
      where student_id = v_uid and quiz_id = v_quiz_id and reussi = true;
    if v_best is null then raise exception 'quiz non reussi'; end if;
  end if;

  insert into public.academy_progress(student_id, module_id, level_id, status, completed, quiz_score, completed_at)
    values (v_uid, p_module_id, v_mod.level_id, 'completed', true, v_best, now())
  on conflict (student_id, module_id) do update
    set status='completed', completed=true, quiz_score=coalesce(excluded.quiz_score, public.academy_progress.quiz_score),
        completed_at=coalesce(public.academy_progress.completed_at, now()), updated_at=now();

  -- Décerner le badge du module (idempotent)
  if v_mod.badge_id is not null then
    insert into public.academy_student_badges(student_id, badge_id, module_id)
      values (v_uid, v_mod.badge_id, p_module_id)
    on conflict (student_id, badge_id) do nothing;
  end if;

  -- Recalcul des agrégats d'enrôlement à partir des FAITS (jamais du client)
  update public.academy_enrollments e set
    modules_completes = (select count(*) from public.academy_progress where student_id=v_uid and completed),
    xp_total = (select coalesce(sum(m.xp),0) from public.academy_progress p join public.academy_modules m on m.id=p.module_id where p.student_id=v_uid and p.completed),
    updated_at = now()
  where e.student_id = v_uid;
end; $$;
revoke all on function public.academy_complete_module(uuid) from public;
grant execute on function public.academy_complete_module(uuid) to authenticated;

-- C) Verrouiller les agrégats d'enrôlement contre l'édition client.
drop policy if exists academy_enroll_update_own on public.academy_enrollments;
create policy academy_enroll_update_own on public.academy_enrollments
  for update to authenticated using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    -- les agrégats ne peuvent être modifiés par le client : ils doivent rester inchangés
    and xp_total = (select e2.xp_total from public.academy_enrollments e2 where e2.id = academy_enrollments.id)
    and modules_completes = (select e2.modules_completes from public.academy_enrollments e2 where e2.id = academy_enrollments.id)
    and niveaux_valides = (select e2.niveaux_valides from public.academy_enrollments e2 where e2.id = academy_enrollments.id)
    and completed_at is not distinct from (select e2.completed_at from public.academy_enrollments e2 where e2.id = academy_enrollments.id)
  );

-- [Sécurité 3] ÉMISSION DE CERTIFICATS/DIPLÔMES NON GARDÉE & MATRICULE FORGEABLE — Aucune fonction n'émet réellement certificat/diplôme : si laissée à du code applicatif via s
-- A) Le matricule ne doit jamais être fourni par le client. On le force à NULL à l'insert
--    (attribution par le serveur via academy_next_numero), et on bloque sa modification.
drop policy if exists academy_enroll_insert_own on public.academy_enrollments;
create policy academy_enroll_insert_own on public.academy_enrollments
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and matricule is null            -- attribué côté serveur uniquement
    and xp_total = 0 and modules_completes = 0 and niveaux_valides = 0
    and completed_at is null
  );

-- Attribution serveur du matricule (idempotente)
create or replace function public.academy_assign_matricule(p_enrollment_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_num text;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select matricule into v_num from public.academy_enrollments
    where id = p_enrollment_id and student_id = v_uid;
  if v_num is not null then return v_num; end if;
  v_num := public.academy_next_numero('', null);
  update public.academy_enrollments set matricule = v_num
    where id = p_enrollment_id and student_id = v_uid and matricule is null;
  return v_num;
end; $$;
revoke all on function public.academy_assign_matricule(uuid) from public;
grant execute on function public.academy_assign_matricule(uuid) to authenticated;
-- academy_next_numero doit pouvoir s'exécuter dans ce contexte SECURITY DEFINER (propriétaire = service_role/postgres) : OK.

-- B) Garantir des préfixes distincts pour éviter toute collision de FORMAT certificat vs diplôme.
--    (les numéros restent globalement uniques via la séquence partagée ; on impose le namespace.)
-- Convention : certificat -> AER-2026-CERT-000001 ; diplome -> AER-2026-DIP-000001.
-- (À utiliser dans les fonctions d'émission service_role : academy_next_numero('CERT') / academy_next_numero('DIP').)

-- C) Verrou DB : un certificat ne peut exister que si le résultat de niveau est validé.
--    Empêche l'émission incohérente même via un bug applicatif service_role.
create or replace function public.academy_assert_cert_valid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.academy_results r
    where r.student_id = new.student_id and r.level_id = new.level_id and r.valide = true
  ) then
    raise exception 'certificat refuse: niveau % non valide pour etudiant %', new.level_id, new.student_id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_academy_cert_guard on public.academy_certificates;
create trigger trg_academy_cert_guard before insert on public.academy_certificates
  for each row execute function public.academy_assert_cert_valid();

-- [Sécurité 4] FONCTIONS / TRIGGER SANS search_path FIGÉ — `academy_set_updated_at()` (utilisée par 10 triggers) n'a pas `set search_path`. Une fonction trigger exécutée avec 
create or replace function public.academy_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public   -- fige le résolveur : now() = pg_catalog.now()
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
-- Rejouer les triggers n'est pas nécessaire (CREATE OR REPLACE conserve les attachements).

-- [Sécurité 5] VÉRIFICATION PUBLIQUE — FUITE POTENTIELLE & ÉNUMÉRATION — `academy_verify_credential` est correctement SECURITY DEFINER et ne renvoie pas le nom de l'étudiant (
-- 1) Ne JAMAIS révéler d'info personnelle et marquer explicitement la validité;
--    renvoyer seulement les champs strictement nécessaires à l'authentification.
create or replace function public.academy_verify_credential(p_code text)
returns table (type text, numero text, titre text, mention text, valide boolean, issued_at timestamptz)
language sql stable security definer set search_path = public as $$
  select 'certificat'::text, c.numero, lv.titre, c.mention,
         (c.status = 'valide'), c.issued_at
  from public.academy_certificates c
  join public.academy_levels lv on lv.id = c.level_id
  where c.verification_code = p_code and length(p_code) >= 16
  union all
  select 'diplome'::text, d.numero, d.titre, d.mention::text,
         (d.status = 'valide'), d.issued_at
  from public.academy_diplomas d
  where d.verification_code = p_code and length(p_code) >= 16;
$$;
revoke all on function public.academy_verify_credential(text) from public;
grant execute on function public.academy_verify_credential(text) to anon, authenticated, service_role;

-- 2) Imposer un code à haute entropie par défaut (32 hex = 128 bits) et non-énumérable.
alter table public.academy_certificates
  alter column verification_code set default encode(gen_random_bytes(16), 'hex');
alter table public.academy_diplomas
  alter column verification_code set default encode(gen_random_bytes(16), 'hex');
alter table public.academy_certificates
  add constraint academy_cert_vcode_len_chk check (char_length(verification_code) >= 16) not valid;
alter table public.academy_diplomas
  add constraint academy_dip_vcode_len_chk check (char_length(verification_code) >= 16) not valid;
-- (validez après backfill: alter table ... validate constraint ...;)
