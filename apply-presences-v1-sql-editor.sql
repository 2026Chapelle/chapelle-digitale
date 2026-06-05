-- ============================================================================
-- PRÉSENCES V1 — Chantier 4 (Réunions · Présences · Assiduité). Supabase SQL Editor.
-- Additif, idempotent, sans perte. S'appuie sur public.groupes + membres_groupe.
-- ============================================================================

-- 1) RÉUNIONS de groupe -----------------------------------------------------------
create table if not exists public.group_reunions (
  id            uuid        primary key default gen_random_uuid(),
  groupe_id     uuid        not null references public.groupes(id) on delete cascade,
  titre         text        not null,
  description   text,
  type          text        not null default 'physique' check (type in ('physique','virtuelle','hybride')),
  date_reunion  timestamptz not null,
  duree_min     integer,
  lieu          text,
  lien_visio    text,
  statut        text        not null default 'planifiee' check (statut in ('planifiee','tenue','annulee')),
  created_by    uuid        references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_reunions_groupe on public.group_reunions (groupe_id, date_reunion desc);
create index if not exists idx_reunions_date on public.group_reunions (date_reunion);
create index if not exists idx_reunions_statut on public.group_reunions (statut);

-- 2) PRÉSENCES (présent / absent / excusé) ---------------------------------------
create table if not exists public.group_attendance (
  id           uuid        primary key default gen_random_uuid(),
  reunion_id   uuid        not null references public.group_reunions(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  statut       text        not null default 'present' check (statut in ('present','absent','excuse')),
  note         text,
  recorded_by  uuid        references public.profiles(id) on delete set null,
  recorded_at  timestamptz not null default now(),
  unique (reunion_id, user_id)
);
create index if not exists idx_attendance_reunion on public.group_attendance (reunion_id);
create index if not exists idx_attendance_user on public.group_attendance (user_id, recorded_at desc);

-- 3) TRIGGER updated_at sur réunion ----------------------------------------------
create or replace function public.tg_reunions_touch() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists trg_reunions_touch on public.group_reunions;
create trigger trg_reunions_touch
  before update on public.group_reunions
  for each row execute function public.tg_reunions_touch();

-- 4) RLS --------------------------------------------------------------------------
-- Un membre lit les réunions des groupes dont il est membre actif ; écriture = service role.
alter table public.group_reunions enable row level security;
drop policy if exists reunions_member_read on public.group_reunions;
create policy reunions_member_read on public.group_reunions
  for select to authenticated using (
    exists (
      select 1 from public.membres_groupe mg
      where mg.groupe_id = group_reunions.groupe_id and mg.user_id = auth.uid() and mg.statut = 'actif'
    )
  );

-- Un membre lit SES présences ; écriture = service role (API scopée).
alter table public.group_attendance enable row level security;
drop policy if exists attendance_self_read on public.group_attendance;
create policy attendance_self_read on public.group_attendance
  for select to authenticated using (user_id = auth.uid());

notify pgrst, 'reload schema';
