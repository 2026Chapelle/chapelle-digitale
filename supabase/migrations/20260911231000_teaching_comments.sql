-- ============================================================================
-- CITADELLE — LOT ENSEIGNEMENTS 2.2
-- Commentaires modérés des enseignements
--
-- PUBLIC:
--   lecture uniquement status='published'
--
-- ECRITURE:
--   aucune écriture directe anon/authenticated.
--   Les soumissions passent par l'API serveur Citadelle puis service_role.
--
-- MODERATION:
--   pending | published | rejected
-- ============================================================================

create table if not exists public.cms_teaching_comments (
  id uuid primary key default gen_random_uuid(),

  teaching_id uuid not null
    references public.cms_teachings(id)
    on delete cascade,

  user_id uuid
    references auth.users(id)
    on delete set null,

  display_name text not null
    check (
      char_length(display_name) between 1 and 120
    ),

  body text not null
    check (
      char_length(body) between 2 and 2000
    ),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'published',
        'rejected'
      )
    ),

  moderated_at timestamptz,

  moderated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  idx_cms_teaching_comments_public
on public.cms_teaching_comments (
  teaching_id,
  status,
  created_at desc
);

create index if not exists
  idx_cms_teaching_comments_moderation
on public.cms_teaching_comments (
  status,
  created_at desc
);

drop trigger if exists
  trg_cms_teaching_comments_touch
on public.cms_teaching_comments;

create trigger
  trg_cms_teaching_comments_touch
before update on public.cms_teaching_comments
for each row
execute function public.cms_touch_updated_at();

alter table public.cms_teaching_comments
  enable row level security;

drop policy if exists
  cms_teaching_comments_read
on public.cms_teaching_comments;

create policy
  cms_teaching_comments_read
on public.cms_teaching_comments
for select
to anon, authenticated
using (
  status = 'published'
);

-- Aucun INSERT / UPDATE / DELETE direct depuis le navigateur.
revoke insert, update, delete
on public.cms_teaching_comments
from anon, authenticated;

grant select
on public.cms_teaching_comments
to anon, authenticated;

grant all
on public.cms_teaching_comments
to service_role;

comment on table public.cms_teaching_comments is
  'Commentaires modérés liés aux enseignements Citadelle. Soumission serveur uniquement ; lecture publique des commentaires published.';