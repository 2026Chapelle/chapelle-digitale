-- ============================================================================
-- CMS CORE — Contenus administrables depuis le back-office (schéma public)
-- ----------------------------------------------------------------------------
-- Toutes les tables cms_* vivent dans le schéma `public` (exposé par défaut à
-- l'API REST Supabase) afin que le site public puisse LIRE les contenus publiés
-- via la clé anon, et que le back-office puisse ÉCRIRE via la service role.
--
-- Stratégie RLS :
--   • Lecture publique (anon + authenticated) limitée aux lignes PUBLIÉES.
--   • Écriture réservée à la service role (qui bypass la RLS) → aucune policy
--     d'insert/update/delete pour anon : tout passe par /api/admin/cms/*.
--
-- Fallback : si Supabase n'est pas configuré, le site affiche les contenus
-- statiques actuels (voir src/lib/cms.ts). Aucune régression possible.
-- ============================================================================

-- Fonction utilitaire updated_at (idempotente, propre au CMS) -----------------
create or replace function public.cms_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1) cms_settings — paramètres globaux clé/valeur (textes, couleurs, toggles)
-- ----------------------------------------------------------------------------
create table if not exists public.cms_settings (
  key         text primary key,
  value       jsonb       not null default '{}'::jsonb,
  label       text,
  groupe      text        default 'general',
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2) cms_pages — pages éditoriales (slug + SEO + statut)
-- ----------------------------------------------------------------------------
create table if not exists public.cms_pages (
  id              uuid        primary key default gen_random_uuid(),
  slug            text        not null unique,
  title           text        not null,
  description     text,
  seo_title       text,
  seo_description text,
  og_image        text,
  status          text        not null default 'draft',  -- draft | published
  sort_order      int         not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3) cms_sections — sections d'une page (ordonnables, activables)
-- ----------------------------------------------------------------------------
create table if not exists public.cms_sections (
  id          uuid        primary key default gen_random_uuid(),
  page_slug   text        not null,
  key         text        not null,
  type        text        not null default 'rich_text', -- hero | rich_text | image | cards | cta | video ...
  title       text,
  subtitle    text,
  body        text,
  image_url   text,
  cta_label   text,
  cta_href    text,
  data        jsonb       not null default '{}'::jsonb,
  sort_order  int         not null default 0,
  is_active   boolean     not null default true,
  status      text        not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (page_slug, key)
);
create index if not exists idx_cms_sections_page on public.cms_sections (page_slug, sort_order);

-- ----------------------------------------------------------------------------
-- 4) cms_homepage_blocks — blocs ordonnés de la page d'accueil
-- ----------------------------------------------------------------------------
create table if not exists public.cms_homepage_blocks (
  id          uuid        primary key default gen_random_uuid(),
  block_key   text        not null unique,  -- hero | live | platforms | impact ...
  title       text,
  subtitle    text,
  body        text,
  image_url   text,
  cta_label   text,
  cta_href    text,
  data        jsonb       not null default '{}'::jsonb,
  sort_order  int         not null default 0,
  is_active   boolean     not null default true,
  status      text        not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5) cms_navigation — menus (header / footer), hiérarchie via parent_id
-- ----------------------------------------------------------------------------
create table if not exists public.cms_navigation (
  id          uuid        primary key default gen_random_uuid(),
  menu        text        not null default 'header', -- header | footer | member | admin
  label       text        not null,
  href        text        not null,
  parent_id   uuid        references public.cms_navigation(id) on delete cascade,
  icon        text,
  sort_order  int         not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_cms_nav_menu on public.cms_navigation (menu, sort_order);

-- ----------------------------------------------------------------------------
-- 6) cms_media — médiathèque (image / vidéo / audio / pdf / youtube)
-- ----------------------------------------------------------------------------
create table if not exists public.cms_media (
  id            uuid        primary key default gen_random_uuid(),
  type          text        not null default 'image', -- image | video | audio | pdf | youtube
  title         text        not null,
  url           text        not null,
  thumbnail_url text,
  category      text        default 'general',
  alt           text,
  mime          text,
  size_bytes    bigint,
  width         int,
  height        int,
  duration      text,
  tags          text[]      default '{}',
  platform      text,
  status        text        not null default 'published',
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_cms_media_type on public.cms_media (type, status);

-- ----------------------------------------------------------------------------
-- 7) cms_events — événements
-- ----------------------------------------------------------------------------
create table if not exists public.cms_events (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  slug        text        unique,
  description text,
  starts_at   timestamptz,
  ends_at     timestamptz,
  location    text,
  is_online   boolean     not null default false,
  cover_url   text,
  cta_label   text,
  cta_href    text,
  platform    text,
  status      text        not null default 'draft',
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_cms_events_start on public.cms_events (starts_at);

-- ----------------------------------------------------------------------------
-- 8) cms_lives — lives & cultes (YouTube / vidéo)
-- ----------------------------------------------------------------------------
create table if not exists public.cms_lives (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  description   text,
  youtube_url   text,
  video_url     text,
  cover_url     text,
  scheduled_at  timestamptz,
  is_live       boolean     not null default false,
  platform      text,
  status        text        not null default 'draft', -- draft | scheduled | live | ended | published
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_cms_lives_sched on public.cms_lives (scheduled_at);

-- ----------------------------------------------------------------------------
-- 9) cms_podcasts — podcasts
-- ----------------------------------------------------------------------------
create table if not exists public.cms_podcasts (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  description   text,
  audio_url     text,
  youtube_url   text,
  cover_url     text,
  saison        int,
  episode       int,
  duration      text,
  published_at  timestamptz,
  status        text        not null default 'draft',
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10) cms_teachings — enseignements
-- ----------------------------------------------------------------------------
create table if not exists public.cms_teachings (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  slug          text        unique,
  description   text,
  body          text,
  video_url     text,
  audio_url     text,
  cover_url     text,
  speaker       text,
  scripture     text,
  category      text,
  tags          text[]      default '{}',
  published_at  timestamptz,
  status        text        not null default 'draft',
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 11) cms_testimonies — témoignages (modération + mise en avant)
-- ----------------------------------------------------------------------------
create table if not exists public.cms_testimonies (
  id            uuid        primary key default gen_random_uuid(),
  author_name   text        not null default 'Anonyme',
  location      text,
  title         text,
  body          text        not null,
  avatar_url    text,
  video_url     text,
  rating        int         check (rating between 1 and 5),
  is_anonymous  boolean     not null default false,
  featured      boolean     not null default false,
  status        text        not null default 'submitted', -- submitted | approved | rejected | published
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 12) cms_platform_content — contenu par plateforme
-- ----------------------------------------------------------------------------
create table if not exists public.cms_platform_content (
  id            uuid        primary key default gen_random_uuid(),
  platform_slug text        not null unique,
  title         text        not null,
  tagline       text,
  description   text,
  body          text,
  cover_url     text,
  accent_color  text        default '#D4AF37',
  cta_label     text,
  cta_href      text,
  data          jsonb       not null default '{}'::jsonb,
  status        text        not null default 'published',
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Triggers updated_at sur toutes les tables CMS
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'cms_settings','cms_pages','cms_sections','cms_homepage_blocks','cms_navigation',
    'cms_media','cms_events','cms_lives','cms_podcasts','cms_teachings',
    'cms_testimonies','cms_platform_content'
  ] loop
    execute format('drop trigger if exists trg_%1$s_touch on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_touch before update on public.%1$s
         for each row execute function public.cms_touch_updated_at();', t);
  end loop;
end$$;

-- ============================================================================
-- RLS — lecture publique des contenus publiés, écriture service-role only
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'cms_settings','cms_pages','cms_sections','cms_homepage_blocks','cms_navigation',
    'cms_media','cms_events','cms_lives','cms_podcasts','cms_teachings',
    'cms_testimonies','cms_platform_content'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;

-- Policies de lecture publique (statut publié / actif selon la table) --------
drop policy if exists cms_pages_read on public.cms_pages;
create policy cms_pages_read on public.cms_pages for select
  to anon, authenticated using (status = 'published');

drop policy if exists cms_sections_read on public.cms_sections;
create policy cms_sections_read on public.cms_sections for select
  to anon, authenticated using (status = 'published' and is_active = true);

drop policy if exists cms_homepage_read on public.cms_homepage_blocks;
create policy cms_homepage_read on public.cms_homepage_blocks for select
  to anon, authenticated using (status = 'published' and is_active = true);

drop policy if exists cms_nav_read on public.cms_navigation;
create policy cms_nav_read on public.cms_navigation for select
  to anon, authenticated using (is_active = true);

drop policy if exists cms_media_read on public.cms_media;
create policy cms_media_read on public.cms_media for select
  to anon, authenticated using (status = 'published');

drop policy if exists cms_events_read on public.cms_events;
create policy cms_events_read on public.cms_events for select
  to anon, authenticated using (status = 'published');

drop policy if exists cms_lives_read on public.cms_lives;
create policy cms_lives_read on public.cms_lives for select
  to anon, authenticated using (status in ('scheduled','live','ended','published'));

drop policy if exists cms_podcasts_read on public.cms_podcasts;
create policy cms_podcasts_read on public.cms_podcasts for select
  to anon, authenticated using (status = 'published');

drop policy if exists cms_teachings_read on public.cms_teachings;
create policy cms_teachings_read on public.cms_teachings for select
  to anon, authenticated using (status = 'published');

drop policy if exists cms_testimonies_read on public.cms_testimonies;
create policy cms_testimonies_read on public.cms_testimonies for select
  to anon, authenticated using (status in ('approved','published'));

drop policy if exists cms_platform_read on public.cms_platform_content;
create policy cms_platform_read on public.cms_platform_content for select
  to anon, authenticated using (status = 'published');

drop policy if exists cms_settings_read on public.cms_settings;
create policy cms_settings_read on public.cms_settings for select
  to anon, authenticated using (true);

-- Soumission publique de témoignages (capture front, modération ensuite) ------
drop policy if exists cms_testimonies_insert on public.cms_testimonies;
create policy cms_testimonies_insert on public.cms_testimonies for insert
  to anon, authenticated with check (status = 'submitted');

-- ============================================================================
-- SEED — paramètres globaux + blocs homepage + pages clés (idempotent)
-- ============================================================================
insert into public.cms_settings (key, value, label, groupe) values
  ('site_name',    '"Citadelle du Royaume"'::jsonb,             'Nom du site',        'general'),
  ('site_tagline', '"La Chapelle Internationale des Élus du Royaume"'::jsonb, 'Slogan', 'general'),
  ('contact_email','"contact@chapelleduroyaume.org"'::jsonb,    'Email de contact',   'general'),
  ('primary_color','"#D4AF37"'::jsonb,                           'Couleur principale', 'theme'),
  ('giving_enabled','true'::jsonb,                               'Dons activés',       'giving')
on conflict (key) do nothing;

insert into public.cms_pages (slug, title, description, status, sort_order) values
  ('accueil',       'Accueil',        'Page d''accueil de la Citadelle', 'published', 0),
  ('dons',          'Soutenir l''œuvre','Dons, offrandes et partenariats', 'published', 10),
  ('offrandes',     'Offrandes',      'Offrandes et semences',           'published', 11),
  ('destinee-acces','Accès au parcours','Parcours Destinée',             'published', 12),
  ('partenariat',   'Partenariat',    'Devenir partenaire du Royaume',   'published', 13)
on conflict (slug) do nothing;

insert into public.cms_homepage_blocks (block_key, title, subtitle, sort_order, is_active, status) values
  ('hero',         'Citadelle du Royaume', 'Entrez dans la présence', 0, true, 'published'),
  ('live',         'Cultes en direct',     null,                      1, true, 'published'),
  ('platforms',    'Nos plateformes',      null,                      2, true, 'published'),
  ('impact',       'Notre impact',         null,                      3, true, 'published'),
  ('formations',   'Formations',           null,                      4, true, 'published'),
  ('prayer',       'Mur de prière',        null,                      5, true, 'published'),
  ('testimonials', 'Témoignages',          null,                      6, true, 'published'),
  ('podcast',      'Podcast',              null,                      7, true, 'published'),
  ('join',         'Rejoindre',            null,                      8, true, 'published')
on conflict (block_key) do nothing;
