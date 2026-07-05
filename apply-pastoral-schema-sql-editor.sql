-- ============================================================================
-- TABLEAU DE BORD PASTORAL V1 — SCHÉMA (à exécuter dans Supabase SQL Editor)
-- Crée notes pastorales + journal des actions admin + colonne d'archivage doux.
-- Idempotent. Recharge le cache PostgREST à la fin.
-- ============================================================================

create table if not exists public.pastoral_notes (
  id          uuid        primary key default gen_random_uuid(),
  member_id   uuid        not null references public.profiles(id) on delete cascade,
  author_id   uuid        references public.profiles(id) on delete set null,
  author_nom  text,
  note        text        not null,
  type        text        not null default 'note',
  created_at  timestamptz not null default now()
);
create index if not exists idx_pn_member on public.pastoral_notes (member_id, created_at desc);
alter table public.pastoral_notes enable row level security;

create table if not exists public.pastoral_actions_log (
  id          uuid        primary key default gen_random_uuid(),
  member_id   uuid        references public.profiles(id) on delete set null,
  admin_id    uuid        references public.profiles(id) on delete set null,
  admin_nom   text,
  action      text        not null,
  detail      jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_pal_member on public.pastoral_actions_log (member_id, created_at desc);
create index if not exists idx_pal_created on public.pastoral_actions_log (created_at desc);
alter table public.pastoral_actions_log enable row level security;

alter table public.profiles add column if not exists archived_at timestamptz;

notify pgrst, 'reload schema';
