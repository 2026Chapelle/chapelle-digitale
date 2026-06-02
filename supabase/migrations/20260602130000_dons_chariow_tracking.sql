-- ============================================================================
-- DONS CHARIOW — tracking, confirmation & reçus
-- ----------------------------------------------------------------------------
-- Additif & idempotent. Ajoute le suivi de provenance (source/programme/campagne),
-- l'identifiant de transaction Chariow (idempotence webhook) et les URLs de retour.
-- ============================================================================

alter table public.dons add column if not exists source                 text;        -- live | page | offrande | partenariat …
alter table public.dons add column if not exists programme              text;        -- titre du programme/live concerné
alter table public.dons add column if not exists campagne               text;
alter table public.dons add column if not exists chariow_transaction_id text;
alter table public.dons add column if not exists reference              text;
alter table public.dons add column if not exists recu_envoye_at         timestamptz;
alter table public.dons add column if not exists webhook_received_at    timestamptz;

-- Idempotence des webhooks : une transaction Chariow = une ligne.
create unique index if not exists uniq_dons_chariow_txn
  on public.dons (chariow_transaction_id) where chariow_transaction_id is not null;

-- Journal analytique : provenance de l'intention.
alter table public.giving_transactions_log add column if not exists source    text;
alter table public.giving_transactions_log add column if not exists programme text;

-- Produits : URLs de retour Chariow (confirmation / annulation).
alter table public.giving_products add column if not exists success_return_url text;
alter table public.giving_products add column if not exists cancel_return_url  text;
