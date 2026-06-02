-- ============================================================================
-- STORAGE (médiathèque : upload réel) + ARTICLES (blog éditorial)
-- ----------------------------------------------------------------------------
-- Complète le CMS core : permet à l'équipe pastorale d'UPLOADER de vrais
-- fichiers (images, PDF, vidéos, audio) depuis le back-office — sans toucher au
-- code — et de publier des articles. Les fichiers sont stockés dans le bucket
-- public `media` de Supabase Storage ; les uploads passent par la service role
-- (route /api/admin/upload), la lecture est publique via l'URL publique.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Bucket Storage public `media`
-- ----------------------------------------------------------------------------
-- public = true  → lecture libre via l'URL publique (https://.../object/public/media/..)
-- file_size_limit 500 Mo → autorise les vidéos. allowed_mime_types null = tous types.
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 524288000)
on conflict (id) do update
  set public = true,
      file_size_limit = 524288000;

-- Bucket public `avatars` (photos de profil des membres). ---------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 10485760) -- 10 Mo
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760;

-- Lecture publique des objets des buckets `media` et `avatars`. ----------------
drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('media', 'avatars'));

-- Les écritures (upload / remplacement / suppression) passent par la service
-- role via /api/admin/upload (qui bypass la RLS). Aucune policy d'écriture
-- n'est ouverte à anon/authenticated : la médiathèque reste protégée.

-- ----------------------------------------------------------------------------
-- 2) Table cms_articles — articles / blog éditorial
-- ----------------------------------------------------------------------------
create table if not exists public.cms_articles (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  slug          text        unique,
  excerpt       text,
  body          text,
  cover_url     text,
  author        text,
  category      text        default 'general',
  tags          text[]      default '{}',
  featured      boolean     not null default false,
  published_at  timestamptz,
  status        text        not null default 'draft',  -- draft | published
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_cms_articles_status on public.cms_articles (status, published_at desc);

-- Trigger updated_at (réutilise la fonction du CMS core) ----------------------
drop trigger if exists trg_cms_articles_touch on public.cms_articles;
create trigger trg_cms_articles_touch before update on public.cms_articles
  for each row execute function public.cms_touch_updated_at();

-- RLS : lecture publique des articles publiés, écriture service-role only -----
alter table public.cms_articles enable row level security;
drop policy if exists cms_articles_read on public.cms_articles;
create policy cms_articles_read on public.cms_articles for select
  to anon, authenticated using (status = 'published');

-- Seed : un article d'exemple (idempotent) -----------------------------------
insert into public.cms_articles (title, slug, excerpt, body, author, category, status, sort_order, published_at)
values (
  'Bienvenue dans la Citadelle du Royaume',
  'bienvenue-citadelle',
  'Découvrez la vision de la Chapelle Internationale des Élus du Royaume.',
  'La Citadelle du Royaume est un espace de culte, de formation et de communion. Cet article est administrable depuis le back-office — modifiez-le ou supprimez-le librement.',
  'Équipe pastorale',
  'vision',
  'published',
  0,
  now()
)
on conflict (slug) do nothing;
