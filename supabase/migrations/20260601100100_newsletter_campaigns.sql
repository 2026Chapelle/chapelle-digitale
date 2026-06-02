-- ============================================================================
-- NEWSLETTER — Campagnes (création, programmation, envoi, historique)
-- ----------------------------------------------------------------------------
-- Gérées depuis /admin/newsletter. L'envoi réel d'emails n'est pas encore
-- branché : une campagne « envoyée » est marquée comme telle (statut + date +
-- nombre de destinataires) — l'expédition technique reste à configurer.
-- Écriture/lecture via service role (back-office) uniquement.
-- ============================================================================
create table if not exists public.newsletter_campaigns (
  id               uuid        primary key default gen_random_uuid(),
  sujet            text        not null,
  contenu          text,
  audience         text        not null default 'tous',   -- tous | footer | ...
  scheduled_at     timestamptz,
  status           text        not null default 'draft',   -- draft | scheduled | sent
  sent_at          timestamptz,
  recipients_count int         not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_newsletter_campaigns_status on public.newsletter_campaigns (status, created_at desc);

alter table public.newsletter_campaigns enable row level security;
-- Aucune policy publique : tout passe par la service role (API /api/admin/newsletter/campaigns).

drop trigger if exists trg_newsletter_campaigns_touch on public.newsletter_campaigns;
create trigger trg_newsletter_campaigns_touch before update on public.newsletter_campaigns
  for each row execute function public.cms_touch_updated_at();
