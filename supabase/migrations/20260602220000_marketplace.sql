-- ============================================================================
-- MARKETPLACE — catalogue produits + achats + accès post-achat
-- ----------------------------------------------------------------------------
-- Conçu pour l'échelle : ebooks, livres, masterclass, formations, billetterie,
-- abonnements, multi-devises, multi-antennes (plateforme/pays). Additif.
-- Tout paiement Chariow (table dons) peut générer un product_purchase.
-- ============================================================================

create table if not exists public.marketplace_products (
  id                 uuid        primary key default gen_random_uuid(),
  slug               text        unique,
  titre              text        not null,
  description        text,
  type               text        not null default 'numerique', -- ebook|livre|masterclass|formation|billet|abonnement|don|physique|numerique
  prix               numeric     not null default 0,
  devise             text        not null default 'FCFA',
  chariow_product_id text,                                      -- lien produit Chariow
  fichier_path       text,                                      -- chemin dans le bucket privé 'produits'
  cover_url          text,
  plateforme         text,                                      -- antenne / ministère
  pays               text,                                      -- multi-pays
  acces_type         text        not null default 'telechargement', -- telechargement | streaming | externe | aucun
  acces_url          text,                                      -- pour acces_type=externe (lien direct)
  actif              boolean     not null default true,
  created_at         timestamptz not null default now()
);
create index if not exists idx_mkt_chariow on public.marketplace_products (chariow_product_id);
create index if not exists idx_mkt_type on public.marketplace_products (type, actif);
alter table public.marketplace_products enable row level security;
drop policy if exists mkt_read on public.marketplace_products;
create policy mkt_read on public.marketplace_products for select to anon, authenticated using (actif = true);
-- Écriture via service role (back-office).

create table if not exists public.product_purchases (
  id                     uuid        primary key default gen_random_uuid(),
  user_id                uuid        references public.profiles(id) on delete set null,
  email                  text,
  product_id             uuid        references public.marketplace_products(id) on delete set null,
  chariow_product_id     text,
  chariow_transaction_id text,
  don_id                 uuid        references public.dons(id) on delete set null,
  access_token           text        not null,
  titre                  text,
  montant                numeric,
  devise                 text        default 'FCFA',
  statut                 text        not null default 'complete', -- complete | rembourse | revoque
  created_at             timestamptz not null default now()
);
create unique index if not exists uniq_purchase_txn_prod on public.product_purchases (chariow_transaction_id, chariow_product_id) where chariow_transaction_id is not null;
create index if not exists idx_purchase_user on public.product_purchases (user_id);
create index if not exists idx_purchase_email on public.product_purchases (email);
create index if not exists idx_purchase_token on public.product_purchases (access_token);
alter table public.product_purchases enable row level security;
-- Un membre lit SES achats ; l'accès au fichier passe par /api/acces/[token] (service role).
drop policy if exists purchase_select_own on public.product_purchases;
create policy purchase_select_own on public.product_purchases for select to authenticated using (user_id = auth.uid());

-- NB : créer un bucket Storage PRIVÉ 'produits' (Supabase → Storage) pour les fichiers numériques.
