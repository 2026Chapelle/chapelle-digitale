-- ============================================================================
-- MOTEUR DE NOTIFICATIONS INTELLIGENTES (additif)
-- ----------------------------------------------------------------------------
-- - anti-doublon des notifs générées (dedup_key)
-- - alertes pastorales persistées + suivi/escalade
-- - journal des exécutions cron
-- - suivi de consultation des certificats
-- N'altère aucune donnée existante. Écritures via service role.
-- ============================================================================

-- 1) Anti-doublon sur la source de vérité des notifications -------------------
alter table public.app_notifications add column if not exists dedup_key text;
create index if not exists idx_appnotif_user_dedup on public.app_notifications (user_id, dedup_key) where dedup_key is not null;
create index if not exists idx_appnotif_aud_dedup  on public.app_notifications (audience, dedup_key) where dedup_key is not null;

-- 2) Alertes pastorales (suivi de proximité + supervision + escalade) ---------
create table if not exists public.pastoral_alerts (
  id              uuid        primary key default gen_random_uuid(),
  member_id       uuid        not null references public.profiles(id) on delete cascade,
  responsable_id  uuid        references public.profiles(id) on delete set null,
  type            text        not null,                       -- inactif | parcours_bloque | progression_arretee | profil_incomplet | priere_non_traitee | question_sans_reponse | certificat_non_consulte | suivi_en_retard
  level           text        not null default 'moyenne',     -- critique | elevee | moyenne | faible
  status          text        not null default 'nouvelle',    -- nouvelle | prise_en_charge | resolue
  escalation_level text       not null default 'responsable', -- responsable | pasteur_national | admin | super_admin
  detail          jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  taken_at        timestamptz,
  taken_by        uuid        references public.profiles(id) on delete set null,
  resolved_at     timestamptz
);
create index if not exists idx_palerts_status on public.pastoral_alerts (status, created_at desc);
create index if not exists idx_palerts_member on public.pastoral_alerts (member_id, type);
alter table public.pastoral_alerts enable row level security;
-- Lecture/écriture réservées au back-office (service role).

-- 3) Journal des exécutions du cron ------------------------------------------
create table if not exists public.cron_runs (
  id          uuid        primary key default gen_random_uuid(),
  job         text        not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  ok          boolean,
  summary     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_cron_runs_job on public.cron_runs (job, created_at desc);
alter table public.cron_runs enable row level security;

-- 4) Suivi de consultation des certificats -----------------------------------
alter table public.certificats add column if not exists consulte_le timestamptz;

notify pgrst, 'reload schema';
