-- ============================================================================
-- JOURNAL D'ACTIVITÉ ADMIN — traçabilité des actions membres réelles
-- ----------------------------------------------------------------------------
-- Couvre : offrandes, visionnage de lives, visionnage de vidéos, téléchargements PDF.
-- CONFIDENTIALITÉ : n'enregistre JAMAIS le contenu des demandes de prière ni de
-- cure d'âme (ces parcours ne sont pas instrumentés). Données sensibles exclues.
-- RLS : verrouillée — lecture/écriture réservées au service role (back-office).
-- ============================================================================

create table if not exists public.activity_logs (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        references public.profiles(id) on delete set null,
  nom            text,
  email          text,
  action_type    text        not null,   -- don | live_view | video_view | pdf_download
  resource_type  text,                   -- live | video | formation | pdf | event | page
  resource_id    text,
  resource_title text,
  amount         numeric,
  currency       text,
  source         text,                   -- live | dons | evenement | formation | page
  pays           text,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists idx_activity_created on public.activity_logs (created_at desc);
create index if not exists idx_activity_user    on public.activity_logs (user_id);
create index if not exists idx_activity_action  on public.activity_logs (action_type);
create index if not exists idx_activity_source  on public.activity_logs (source);

alter table public.activity_logs enable row level security;
-- Aucune policy : tous les accès passent par les routes serveur (service role).
-- Les clients ne peuvent ni lire ni écrire directement (anti-falsification).
