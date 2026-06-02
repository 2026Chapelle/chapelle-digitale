-- ============================================================================
-- CONTACT (messages) + NEWSLETTER (abonnés) — NOUVELLE migration
-- ----------------------------------------------------------------------------
-- Ne modifie aucune migration déjà validée. Stocke les messages du formulaire
-- /contact et les abonnés newsletter du footer. Insertion publique autorisée
-- (anon) via RLS ; lecture réservée au back-office (service role).
-- ============================================================================

-- 1) Messages de contact -----------------------------------------------------
create table if not exists public.contact_messages (
  id          uuid        primary key default gen_random_uuid(),
  nom         text        not null,
  email       text        not null,
  sujet       text,
  message     text        not null,
  statut      text        not null default 'nouveau',  -- nouveau | lu | traite
  source      text        default 'contact',
  created_at  timestamptz not null default now()
);
create index if not exists idx_contact_created on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;
drop policy if exists contact_insert_public on public.contact_messages;
create policy contact_insert_public on public.contact_messages for insert
  to anon, authenticated with check (true);
-- Pas de policy SELECT pour anon : la lecture passe par le back-office (service role).

-- 2) Abonnés newsletter ------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null unique,            -- anti-doublon
  source      text        default 'footer',
  statut      text        not null default 'actif',   -- actif | desabonne
  created_at  timestamptz not null default now()
);
create index if not exists idx_newsletter_created on public.newsletter_subscribers (created_at desc);

alter table public.newsletter_subscribers enable row level security;
drop policy if exists newsletter_insert_public on public.newsletter_subscribers;
create policy newsletter_insert_public on public.newsletter_subscribers for insert
  to anon, authenticated with check (true);
