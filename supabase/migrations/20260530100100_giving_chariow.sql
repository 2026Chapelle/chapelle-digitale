-- ============================================================================
-- DONS & OFFRANDES — Intégration Chariow (schéma public)
-- ----------------------------------------------------------------------------
-- IMPORTANT : Chariow n'est PAS Stripe.
--   • Aucune logique de checkout, aucune donnée bancaire stockée.
--   • Le paiement réel se déroule entièrement chez Chariow (widget ou lien).
--   • Le site Citadelle affiche seulement des widgets / liens Chariow.
--   • Côté visiteur : « Don volontaire », « Offrande », « Soutenir l'œuvre »,
--     « Partenariat », « Accès au parcours ». Le nom « Chariow » reste interne.
--
-- provider = 'chariow' (champ prévu pour d'éventuels autres prestataires).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- giving_products — catalogue des produits Chariow administrables
-- ----------------------------------------------------------------------------
create table if not exists public.giving_products (
  id                 uuid        primary key default gen_random_uuid(),
  slug               text        not null unique,
  public_title       text        not null,                 -- libellé visiteur
  public_description text,
  type               text        not null default 'don',   -- don | offrande | inscription | acces | partenariat
  provider           text        not null default 'chariow',
  product_id         text,                                  -- ID produit Chariow (prd_xxx)
  direct_url         text,                                  -- lien direct (fallback widget)
  button_label       text        not null default 'Soutenir l''œuvre',
  button_color       text        not null default '#D4AF37',
  widget_style       text        not null default 'tap',    -- style du widget Chariow
  page               text        default 'dons',            -- page d'affichage associée
  position           int         not null default 0,        -- ordre d'affichage
  is_active          boolean     not null default true,     -- actif / inactif
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_giving_products_page on public.giving_products (page, position);

-- ----------------------------------------------------------------------------
-- giving_widget_settings — réglages globaux du widget Chariow (clé/valeur)
-- ----------------------------------------------------------------------------
create table if not exists public.giving_widget_settings (
  key         text        primary key,
  value       jsonb       not null default '{}'::jsonb,
  label       text,
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- giving_transactions_log — journal des interactions (PAS de données bancaires)
-- Sert uniquement au suivi analytique : vues, clics, redirections, callbacks.
-- ----------------------------------------------------------------------------
create table if not exists public.giving_transactions_log (
  id                 uuid        primary key default gen_random_uuid(),
  product_id         uuid        references public.giving_products(id) on delete set null,
  product_slug       text,
  chariow_product_id text,
  provider           text        not null default 'chariow',
  event_type         text        not null default 'click', -- view | click | redirect | callback
  amount             numeric(12,2),                          -- montant déclaré (optionnel, non bancaire)
  currency           text        default 'EUR',
  email              text,
  reference          text,
  status             text        default 'initie',
  meta               jsonb       not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);
create index if not exists idx_giving_log_product on public.giving_transactions_log (product_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Triggers updated_at
-- ----------------------------------------------------------------------------
drop trigger if exists trg_giving_products_touch on public.giving_products;
create trigger trg_giving_products_touch before update on public.giving_products
  for each row execute function public.cms_touch_updated_at();

drop trigger if exists trg_giving_widget_touch on public.giving_widget_settings;
create trigger trg_giving_widget_touch before update on public.giving_widget_settings
  for each row execute function public.cms_touch_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.giving_products        enable row level security;
alter table public.giving_widget_settings enable row level security;
alter table public.giving_transactions_log enable row level security;

-- Lecture publique des produits actifs + réglages widget (pour afficher le CTA)
drop policy if exists giving_products_read on public.giving_products;
create policy giving_products_read on public.giving_products for select
  to anon, authenticated using (is_active = true);

drop policy if exists giving_widget_read on public.giving_widget_settings;
create policy giving_widget_read on public.giving_widget_settings for select
  to anon, authenticated using (true);

-- Le journal accepte des inserts publics (log de clic), sans lecture publique
drop policy if exists giving_log_insert on public.giving_transactions_log;
create policy giving_log_insert on public.giving_transactions_log for insert
  to anon, authenticated with check (true);

-- ============================================================================
-- SEED — réglages globaux + 3 produits Chariow fournis (idempotent)
-- ============================================================================
insert into public.giving_widget_settings (key, value, label) values
  ('store_domain', '"zrqcqzjz.mychariow.shop"'::jsonb,                       'Domaine boutique Chariow'),
  ('script_url',   '"https://js.chariowcdn.com/v1/widget.min.js"'::jsonb,    'Script widget'),
  ('css_url',      '"https://js.chariowcdn.com/v1/widget.min.css"'::jsonb,   'CSS widget'),
  ('locale',       '"fr"'::jsonb,                                            'Langue'),
  ('primary_color','"#FFCC00"'::jsonb,                                       'Couleur primaire widget'),
  ('background_color','"#FFFFFF"'::jsonb,                                     'Couleur de fond widget')
on conflict (key) do nothing;

insert into public.giving_products
  (slug, public_title, public_description, type, product_id, direct_url, button_label, button_color, page, position, is_active)
values
  ('don-volontaire',
   'Don volontaire',
   'Soutenez librement l''œuvre de la Citadelle du Royaume.',
   'don', 'prd_b0vay9',
   'https://zrqcqzjz.mychariow.shop/don-volontaire',
   'Faire un don', '#D4AF37', 'dons', 0, true),

  ('destinee-acces',
   'Accès au parcours',
   'Accédez au parcours Destinée et engagez votre marche.',
   'acces', 'prd_ymoyd3',
   'https://chapelleduroyaume.org/destinee-acces/',
   'Accéder au parcours', '#4B0082', 'destinee-acces', 0, true),

  ('couronne-dor',
   'Partenariat — Couronne d''or',
   'Devenez partenaire bâtisseur du Royaume.',
   'partenariat', 'prd_w9h86o',
   'https://zrqcqzjz.mychariow.shop/couronne-dor',
   'Devenir partenaire', '#D4AF37', 'partenariat', 0, true)
on conflict (slug) do nothing;
