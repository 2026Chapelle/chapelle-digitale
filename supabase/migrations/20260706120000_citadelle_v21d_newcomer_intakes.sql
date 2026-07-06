-- CITADELLE V2.1D-B — Newcomer intakes
-- Objectif :
--   Créer une table d'attente publique sécurisée pour les nouveaux venus.
--
-- Pourquoi :
--   public.profiles.id référence auth.users(id).
--   On ne doit donc PAS créer un profile public directement depuis /nouveau-venu.
--
-- Méthode :
--   /nouveau-venu -> route serveur -> public.newcomer_intakes
--   Puis conversion pastorale ultérieure -> auth user -> public.profiles -> newcomer_pipeline.
--
-- Sécurité :
--   - aucun accès direct anon/authenticated
--   - RLS activé + force RLS
--   - écriture prévue uniquement via supabaseAdmin côté serveur
--
-- Ne pas exécuter via supabase db push tant que l'historique CLI reste désaligné.

begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'V2.1D-B stop: public.profiles is missing';
  end if;

  if to_regprocedure('public.tg_citadelle_v21c3_touch_updated_at()') is null then
    raise exception 'V2.1D-B stop: required function public.tg_citadelle_v21c3_touch_updated_at() is missing';
  end if;

  if to_regclass('public.newcomer_intakes') is not null then
    raise exception 'V2.1D-B stop: public.newcomer_intakes already exists';
  end if;
end $$;

create table public.newcomer_intakes (
  id uuid primary key default gen_random_uuid(),

  prenom text not null,
  nom text,
  telephone text not null,
  email text,

  source text not null default 'nouveau_venu_form',
  message text,

  consent boolean not null default true,
  consented_at timestamptz not null default now(),

  status text not null default 'new',
  priority text not null default 'normal',

  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  converted_profile_id uuid references public.profiles(id) on delete set null,

  intake_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  processed_at timestamptz,
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint newcomer_intakes_prenom_not_blank
    check (length(btrim(prenom)) >= 2),

  constraint newcomer_intakes_telephone_not_blank
    check (length(btrim(telephone)) >= 3),

  constraint newcomer_intakes_email_not_blank_when_present
    check (email is null or length(btrim(email)) >= 5),

  constraint newcomer_intakes_source_not_blank
    check (length(btrim(source)) >= 2),

  constraint newcomer_intakes_consent_required
    check (consent is true),

  constraint newcomer_intakes_status_check
    check (status in ('new', 'to_review', 'contacted', 'converted', 'duplicate', 'archived')),

  constraint newcomer_intakes_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent'))
);

create index newcomer_intakes_status_idx
  on public.newcomer_intakes (status);

create index newcomer_intakes_priority_idx
  on public.newcomer_intakes (priority);

create index newcomer_intakes_created_at_desc_idx
  on public.newcomer_intakes (created_at desc);

create index newcomer_intakes_email_idx
  on public.newcomer_intakes (lower(email))
  where email is not null;

create index newcomer_intakes_telephone_idx
  on public.newcomer_intakes (telephone);

create index newcomer_intakes_assigned_to_profile_id_idx
  on public.newcomer_intakes (assigned_to_profile_id)
  where assigned_to_profile_id is not null;

create index newcomer_intakes_converted_profile_id_idx
  on public.newcomer_intakes (converted_profile_id)
  where converted_profile_id is not null;

create trigger trg_newcomer_intakes_updated_at
before update on public.newcomer_intakes
for each row
execute function public.tg_citadelle_v21c3_touch_updated_at();

alter table public.newcomer_intakes enable row level security;
alter table public.newcomer_intakes force row level security;

revoke all on table public.newcomer_intakes from anon;
revoke all on table public.newcomer_intakes from authenticated;

do $$
begin
  if to_regclass('public.newcomer_intakes') is null then
    raise exception 'V2.1D-B postcheck failed: public.newcomer_intakes missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_newcomer_intakes_updated_at'
      and tgrelid = 'public.newcomer_intakes'::regclass
      and not tgisinternal
  ) then
    raise exception 'V2.1D-B postcheck failed: trigger missing';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'newcomer_intakes'
      and c.relrowsecurity = true
      and c.relforcerowsecurity = true
  ) then
    raise exception 'V2.1D-B postcheck failed: RLS/force RLS missing';
  end if;
end $$;

commit;
