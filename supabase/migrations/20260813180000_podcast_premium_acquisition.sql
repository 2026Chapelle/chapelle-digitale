-- =============================================================================
-- PODCAST-5C — Pont d'ACQUISITION Premium (achat → entitlement) + octroi admin
-- =============================================================================
-- PODCAST-5B a créé la SOURCE DE VÉRITÉ de l'accès Premium (public.user_entitlements,
-- clé canonique 'podcast_premium', résolution SQL fail-closed). Ce lot rend ce droit
-- réellement ACQUÉRABLE par une voie légitime, SANS créer de source concurrente :
--
--   1. Achat réel confirmé (webhook Chariow existant, déjà signé/idempotent) →
--      octroi d'entitlement, source_type='purchase', source_id=product_purchases.id.
--   2. Octroi / révocation manuels par un Admin (source_type='admin').
--
-- 100 % ADDITIF. Ne modifie NI la table user_entitlements (colonnes), NI la logique
-- de sécurité PODCAST-SEC. Réutilise le commerce existant :
--   • marketplace_products (slug unique = clé produit ; chariow_product_id ; lien_achat) ;
--   • product_purchases (idempotent via chariow_transaction_id) ;
--   • webhook /api/webhook/chariow (event whitelist successful.sale+completed).
--
-- DÉCISIONS MÉTIER LAISSÉES OUVERTES (jamais fabriquées ici) :
--   • Durée du Premium : portée par le produit (entitlement_duration_days) ; NULL = à vie.
--   • Remboursement automatique : Chariow n'expose PAS de contrat d'événement de
--     remboursement prouvé dans ce repo → aucune révocation auto câblée sur un
--     webhook. La révocation reste Admin (source fiable) + primitive prête.
-- =============================================================================

-- ── 1) Un produit marketplace peut ACCORDER un entitlement (mapping canonique) ──
--    entitlement_key NULL           = produit ordinaire (n'accorde aucun droit).
--    entitlement_key 'podcast_premium' = l'achat confirmé accorde le Premium podcast.
--    entitlement_duration_days NULL = à vie ; > 0 = durée (mappée vers expires_at à l'octroi).
alter table public.marketplace_products
  add column if not exists entitlement_key text,
  add column if not exists entitlement_duration_days integer;

-- Garde-fou : une durée, si fournie, doit être strictement positive (jamais 0/négatif).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'marketplace_products_entitlement_duration_positive'
  ) then
    alter table public.marketplace_products
      add constraint marketplace_products_entitlement_duration_positive
      check (entitlement_duration_days is null or entitlement_duration_days > 0);
  end if;
end $$;

-- Recherche « produit qui accorde la clé X » (offre Premium canonique, CTA).
create index if not exists idx_mkt_entitlement_key
  on public.marketplace_products (entitlement_key)
  where entitlement_key is not null;

-- ── 2) Idempotence d'ACQUISITION : un même achat = UN droit logique ─────────────
--    Partiel (achats uniquement) : n'entrave pas d'éventuels octrois Admin répétés.
--    Un webhook Chariow rejoué (même product_purchases.id) → conflit 23505 → no-op.
create unique index if not exists uniq_entitlement_purchase_source
  on public.user_entitlements (entitlement_key, source_id)
  where source_type = 'purchase' and source_id is not null;

comment on column public.marketplace_products.entitlement_key is
  'PODCAST-5C : si non NULL, un achat confirmé de ce produit accorde ce droit (ex. podcast_premium). Mapping canonique, admin-friendly, sans UUID en dur.';
comment on column public.marketplace_products.entitlement_duration_days is
  'PODCAST-5C : durée du droit accordé (jours). NULL = à vie. Portée par le produit — jamais fabriquée.';

notify pgrst, 'reload schema';
