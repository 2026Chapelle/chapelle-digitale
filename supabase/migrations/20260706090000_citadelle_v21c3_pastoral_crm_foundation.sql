-- =============================================================================
-- Citadelle V2.1C.3 — Pastoral CRM foundation
-- =============================================================================
-- Statut:
--   PREPARE UNIQUEMENT.
--   NE PAS EXECUTER sans GO migration explicite et separe.
--
-- Intention:
--   - public.profiles reste l'ancrage canonique du CRM pastoral.
--   - chapelle.* peut rester un tunnel d'entree, mais ne devient pas le pivot.
--   - Aucune ecriture anon directe.
--   - Ecriture future uniquement via route serveur securisee / service role.
--
-- Points de prudence V2.1C:
--   1. Le nom tg_v21_touch est evite volontairement pour prevenir collision.
--   2. profile_tags.tag reste libre dans cette version preparee.
--      Une liste pastorale controlee pourra etre ajoutee avant execution si decide.
--   3. V2.1D devra normaliser cote serveur:
--        email = '' -> null
--        email rempli -> trim/lowercase
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Fonction updated_at dediee V2.1C.3
-- -----------------------------------------------------------------------------

create or replace function public.tg_citadelle_v21c3_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.tg_citadelle_v21c3_touch_updated_at()
is 'Citadelle V2.1C.3: trigger dedicated to updated_at fields. Avoids generic tg_v21_touch naming collision.';

-- -----------------------------------------------------------------------------
-- 2. Tags pastoraux rattaches a public.profiles
-- -----------------------------------------------------------------------------

create table if not exists public.profile_tags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tag text not null,
  source text not null default 'pastoral',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint profile_tags_tag_not_empty
    check (length(btrim(tag)) > 0),

  constraint profile_tags_source_not_empty
    check (length(btrim(source)) > 0)
);

comment on table public.profile_tags
is 'Citadelle V2.1C.3: tags pastoraux rattaches a public.profiles, ancrage canonique CRM pastoral.';

comment on column public.profile_tags.tag
is 'Tag libre en V2.1C.3 preparee. Peut etre remplace plus tard par une liste pastorale controlee.';

create unique index if not exists profile_tags_profile_id_tag_uidx
  on public.profile_tags (profile_id, lower(btrim(tag)));

create index if not exists profile_tags_profile_id_idx
  on public.profile_tags (profile_id);

create index if not exists profile_tags_tag_idx
  on public.profile_tags (lower(btrim(tag)));

alter table public.profile_tags enable row level security;
alter table public.profile_tags force row level security;

revoke all on table public.profile_tags from anon;
revoke all on table public.profile_tags from authenticated;

-- Aucune policy anon/auth n'est creee volontairement.
-- Acces attendu plus tard: route serveur securisee avec service role.

-- -----------------------------------------------------------------------------
-- 3. Pipeline nouveaux venus rattache a public.profiles
-- -----------------------------------------------------------------------------

create table if not exists public.newcomer_pipeline (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,

  status text not null default 'new',
  source text not null default 'nouveau_venu_form',

  assigned_to_profile_id uuid references public.profiles(id) on delete set null,

  priority text not null default 'normal',
  next_action text,
  due_at timestamptz,

  intake_payload jsonb not null default '{}'::jsonb,

  converted_at timestamptz,
  archived_at timestamptz,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint newcomer_pipeline_status_check
    check (status in ('new', 'to_call', 'in_followup', 'integrated', 'inactive', 'archived')),

  constraint newcomer_pipeline_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent')),

  constraint newcomer_pipeline_source_not_empty
    check (length(btrim(source)) > 0)
);

comment on table public.newcomer_pipeline
is 'Citadelle V2.1C.3: pipeline pastoral des nouveaux venus, rattache a public.profiles.';

comment on column public.newcomer_pipeline.intake_payload
is 'Payload brut/minimal du tunnel entree. Ne remplace pas public.profiles comme source canonique.';

create unique index if not exists newcomer_pipeline_profile_id_uidx
  on public.newcomer_pipeline (profile_id);

create index if not exists newcomer_pipeline_status_idx
  on public.newcomer_pipeline (status);

create index if not exists newcomer_pipeline_priority_idx
  on public.newcomer_pipeline (priority);

create index if not exists newcomer_pipeline_due_at_idx
  on public.newcomer_pipeline (due_at);

create index if not exists newcomer_pipeline_assigned_to_profile_id_idx
  on public.newcomer_pipeline (assigned_to_profile_id);

create index if not exists newcomer_pipeline_created_at_idx
  on public.newcomer_pipeline (created_at desc);

drop trigger if exists trg_newcomer_pipeline_updated_at on public.newcomer_pipeline;

create trigger trg_newcomer_pipeline_updated_at
before update on public.newcomer_pipeline
for each row
execute function public.tg_citadelle_v21c3_touch_updated_at();

alter table public.newcomer_pipeline enable row level security;
alter table public.newcomer_pipeline force row level security;

revoke all on table public.newcomer_pipeline from anon;
revoke all on table public.newcomer_pipeline from authenticated;

-- Aucune policy anon/auth n'est creee volontairement.
-- Acces attendu plus tard: route serveur securisee avec service role.

-- -----------------------------------------------------------------------------
-- 4. Colonnes additives sur pastoral_notes
-- -----------------------------------------------------------------------------

alter table if exists public.pastoral_notes
  add column if not exists is_private boolean not null default true;

alter table if exists public.pastoral_notes
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if to_regclass('public.pastoral_notes') is not null then
    execute 'drop trigger if exists trg_pastoral_notes_updated_at on public.pastoral_notes';

    execute '
      create trigger trg_pastoral_notes_updated_at
      before update on public.pastoral_notes
      for each row
      execute function public.tg_citadelle_v21c3_touch_updated_at()
    ';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Colonnes additives sur pastoral_alerts
-- -----------------------------------------------------------------------------

alter table if exists public.pastoral_alerts
  add column if not exists due_at timestamptz;

alter table if exists public.pastoral_alerts
  add column if not exists next_action text;

-- -----------------------------------------------------------------------------
-- 6. Fin
-- -----------------------------------------------------------------------------

commit;
