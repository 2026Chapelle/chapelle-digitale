-- =============================================================================
-- PODCAST-5B — Droit Premium RÉEL (entitlement canonique)
-- =============================================================================
-- PODCAST-SEC exige un `hasPremiumEntitlement` réel (aujourd'hui placeholder=false,
-- fail-closed). Le modèle d'achat existant `product_purchases` (statut complete/
-- rembourse/revoque, webhook Chariow) est une SOURCE d'acquisition fiable mais
-- INSUFFISANTE seule : ni expiration, ni date de début, ni clé canonique. On
-- modélise donc le DROIT (entitlement) séparément de son acquisition.
--
-- PRINCIPES :
--  • entitlement_key canonique (ex. 'podcast_premium') — aucun UUID produit en dur.
--  • source_type/source_id → traçabilité (achat product_purchases, octroi admin…).
--  • Premium = droit SPÉCIFIQUE : jamais dérivé d'un rôle/statut/membre actif.
--  • Actif = non révoqué ET démarré ET non expiré (évalué à la lecture).
--
-- SÉCURITÉ (strict) :
--  • Un utilisateur peut LIRE ses propres droits (UI) mais NE PEUT JAMAIS s'en
--    accorder ni modifier expiration/source (aucune policy insert/update/delete).
--  • anon : aucun accès. Octroi/révocation = backend service_role uniquement.
--  • Primitive SQL `has_podcast_premium_access(uuid)` SECURITY DEFINER, fail-closed.
-- 100% ADDITIF. Réf. auth.users / product_purchases (couplage lâche).
-- =============================================================================

create table if not exists public.user_entitlements (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  entitlement_key text        not null check (btrim(entitlement_key) <> ''),
  source_type     text        not null default 'admin'
                  check (source_type in ('purchase','admin','grant','comp','migration')),
  source_id       uuid,                                    -- ex. product_purchases.id (couplage lâche, pas de FK dure)
  starts_at       timestamptz not null default now(),
  expires_at      timestamptz,                             -- NULL = à vie
  revoked_at      timestamptz,                             -- NULL = non révoqué
  created_by      uuid        references auth.users(id) on delete set null,   -- admin ayant octroyé
  note            text,
  created_at      timestamptz not null default now()
);

-- Recherche « droit actif d'un utilisateur pour une clé » + tri par récence.
create index if not exists idx_user_entitlements_lookup
  on public.user_entitlements (user_id, entitlement_key, starts_at desc);
-- Empêche les doublons de droits À VIE non révoqués (une seule ligne lifetime active).
create unique index if not exists uniq_user_entitlement_lifetime
  on public.user_entitlements (user_id, entitlement_key)
  where revoked_at is null and expires_at is null;

-- ── Primitive canonique : droit actif ? (pure règle, réutilisable) ───────────
-- Actif = non révoqué ET démarré (starts_at <= now) ET non expiré (expires_at NULL ou > now).
create or replace function public.has_entitlement(p_user uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_entitlements e
    where e.user_id = p_user
      and e.entitlement_key = p_key
      and e.revoked_at is null
      and e.starts_at <= now()
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- Spécialisation Premium podcast (clé canonique centralisée côté DB).
create or replace function public.has_podcast_premium_access(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.has_entitlement(p_user, 'podcast_premium'), false);
$$;

-- Résolution SERVEUR uniquement (service_role) : évite qu'un membre sonde le
-- statut premium d'un autre utilisateur via la RPC. La lecture de SES propres
-- droits (UI) passe par la policy SELECT-own sur la table.
revoke all on function public.has_entitlement(uuid, text)        from public;
revoke all on function public.has_podcast_premium_access(uuid)   from public;
grant execute on function public.has_entitlement(uuid, text)      to service_role;
grant execute on function public.has_podcast_premium_access(uuid) to service_role;

-- ── RLS : lecture de SES droits ; jamais d'auto-octroi/modification ──────────
alter table public.user_entitlements enable row level security;
revoke all on public.user_entitlements from anon, authenticated;
-- Lecture seule de ses propres droits (UI « mes accès »). Aucune écriture cliente.
grant select on public.user_entitlements to authenticated;
grant select, insert, update on public.user_entitlements to service_role;  -- backend : octroi + révocation (revoked_at). Pas de DELETE (audit).

drop policy if exists user_entitlements_select_own on public.user_entitlements;
create policy user_entitlements_select_own on public.user_entitlements
  for select to authenticated using (user_id = auth.uid());
-- anon : aucune policy → aucun accès. authenticated : SELECT own uniquement
-- (aucune policy insert/update/delete → un membre ne peut pas s'accorder/altérer un droit).

comment on table public.user_entitlements is
  'PODCAST-5B : droits (entitlements) canoniques. Source de vérité du Premium podcast. Octroi/révocation backend only ; lecture de ses propres droits.';

notify pgrst, 'reload schema';
