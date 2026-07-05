-- ============================================================================
-- TABLEAU DE BORD PASTORAL V1 — notes pastorales + journal des actions admin
-- ----------------------------------------------------------------------------
-- Additif, RLS. N'altère aucune table existante (sauf 1 colonne nullable
-- `archived_at` sur profiles pour l'archivage doux réversible).
-- Écritures via service role (routes /api/admin/*). Recharge le cache à la fin.
-- ============================================================================

-- 1) Notes pastorales (fil de suivi d'un membre) -----------------------------
create table if not exists public.pastoral_notes (
  id          uuid        primary key default gen_random_uuid(),
  member_id   uuid        not null references public.profiles(id) on delete cascade,
  author_id   uuid        references public.profiles(id) on delete set null,
  author_nom  text,
  note        text        not null,
  type        text        not null default 'note',   -- note | suivi | alerte
  created_at  timestamptz not null default now()
);
create index if not exists idx_pn_member on public.pastoral_notes (member_id, created_at desc);
alter table public.pastoral_notes enable row level security;
-- Lecture/écriture réservées au back-office (service role) — pas de policy publique.

-- 2) Journal des actions administratives sur un membre -----------------------
create table if not exists public.pastoral_actions_log (
  id          uuid        primary key default gen_random_uuid(),
  member_id   uuid        references public.profiles(id) on delete set null,
  admin_id    uuid        references public.profiles(id) on delete set null,
  admin_nom   text,
  action      text        not null,                  -- set_statut | set_responsable | add_note | suspend | reactivate | archive | reset_password | create | hard_delete
  detail      jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_pal_member on public.pastoral_actions_log (member_id, created_at desc);
create index if not exists idx_pal_created on public.pastoral_actions_log (created_at desc);
alter table public.pastoral_actions_log enable row level security;
-- Écriture/lecture service role uniquement.

-- 3) Archivage doux réversible (suppression douce) ---------------------------
alter table public.profiles add column if not exists archived_at timestamptz;

notify pgrst, 'reload schema';
