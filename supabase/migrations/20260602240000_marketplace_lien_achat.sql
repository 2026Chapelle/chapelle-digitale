-- ============================================================================
-- MARKETPLACE — lien d'achat Chariow (catalogue public → page de paiement)
-- ----------------------------------------------------------------------------
-- Chariow n'expose pas d'API de checkout : chaque produit pointe vers sa page
-- de vente Chariow. Après paiement, le webhook /api/webhook/chariow rapproche
-- `chariow_product_id` et crée le product_purchase (accès via /api/acces/[token]).
-- Additif, idempotent.
-- ============================================================================

alter table public.marketplace_products add column if not exists lien_achat text;

-- ============================================================================
-- MARKETPLACE-SEC — verrou colonne (miroir de PODCAST-SEC 20260813090000)
-- ----------------------------------------------------------------------------
-- anon/authenticated peuvent DÉCOUVRIR le catalogue (métadonnées + lien_achat de
-- checkout, public par nature) mais JAMAIS obtenir acces_url / fichier_path
-- (ressource POST-achat) ni les identifiants internes (chariow_product_id,
-- entitlement_*). La ressource payante est résolue côté serveur via
-- /api/acces/[token] (service_role, qui bypass RLS + grants).
-- RLS de lignes (mkt_read : actif=true) inchangée. Idempotent (recalcule + regrant).
-- NB sécurité : toute colonne PUBLIQUE ajoutée ultérieurement devra être
-- ré-accordée explicitement (une nouvelle colonne n'hérite pas du grant colonne).
-- ============================================================================
do $$
declare
  safe_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into safe_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'marketplace_products'
    and column_name not in (
      'acces_url', 'fichier_path',
      'chariow_product_id', 'entitlement_key', 'entitlement_duration_days'
    );

  execute 'revoke select on public.marketplace_products from anon, authenticated';
  execute format('grant select (%s) on public.marketplace_products to anon, authenticated', safe_cols);
end;
$$;

-- Résolveur post-achat / webhook / admin : service_role (bypass RLS + grants).
grant select on public.marketplace_products to service_role;

notify pgrst, 'reload schema';
