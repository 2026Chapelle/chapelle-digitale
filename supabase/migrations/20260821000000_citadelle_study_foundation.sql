-- =====================================================================
-- CITADELLE LIVING BOOKS — LB-2 : Citadelle Study (fondation personnelle).
-- LOCAL D'ABORD — NE PAS `db push` vers le distant sans GO explicite.
--
-- Quatre tables STRICTEMENT PERSONNELLES (RLS owner-only auth.uid()=user_id) :
--   • study_annotations  — surlignage et/ou note liée à un passage (ancrage robuste jsonb)
--   • document_bookmarks — signet de page OU de passage
--   • reading_journal    — méditation personnelle libre (PRIVÉ par défaut)
--   • document_progress   — reprise synchronisée multi-device (source canonique serveur)
--
-- Sécurité (exigence absolue) : aucun accès anon ; authenticated ne voit/écrit QUE
-- ses lignes ; jamais `USING (true)` ; user_id par défaut auth.uid() + WITH CHECK.
-- Aucun service_role requis côté client. document_id = cms_media.id (texte).
-- =====================================================================

-- ── study_annotations ───────────────────────────────────────────────
create table if not exists public.study_annotations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document_id   text not null,
  page_number   integer not null check (page_number >= 1),
  -- Surlignage (couleur posée) et/ou note (texte) : au moins l'un des deux.
  color         text check (color in ('gold','yellow','blue','violet','green')),
  note          text,
  selected_text text not null default '',
  -- Ancrage ROBUSTE (indépendant du zoom/layout) : { prefix, suffix, startOffset, endOffset }.
  anchor        jsonb not null default '{}'::jsonb,
  -- Préparation LB-Bible (non exploité ici) : référence détectée éventuelle.
  bible_ref     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint study_annotations_has_content check (color is not null or (note is not null and length(btrim(note)) > 0))
);

-- ── document_bookmarks ──────────────────────────────────────────────
create table if not exists public.document_bookmarks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document_id   text not null,
  page_number   integer not null check (page_number >= 1),
  kind          text not null default 'page' check (kind in ('page','passage')),
  label         text,
  selected_text text,
  anchor        jsonb,
  created_at    timestamptz not null default now()
);

-- ── reading_journal (PRIVÉ) ─────────────────────────────────────────
create table if not exists public.reading_journal (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document_id   text,
  page_number   integer check (page_number is null or page_number >= 1),
  selected_text text,
  body          text not null check (length(btrim(body)) > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── document_progress (reprise multi-device) ────────────────────────
create table if not exists public.document_progress (
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document_id   text not null,
  page_number   integer not null default 1 check (page_number >= 1),
  zoom          numeric not null default 1,
  view_mode     text not null default 'livre' check (view_mode in ('livre','lecture')),
  updated_at    timestamptz not null default now(),
  primary key (user_id, document_id)
);

-- ── Index (ciblés, pas d'excès) ─────────────────────────────────────
create index if not exists study_annotations_user_doc_idx  on public.study_annotations (user_id, document_id);
create index if not exists study_annotations_user_doc_page_idx on public.study_annotations (user_id, document_id, page_number);
create index if not exists study_annotations_user_updated_idx on public.study_annotations (user_id, updated_at desc);
create index if not exists document_bookmarks_user_doc_idx   on public.document_bookmarks (user_id, document_id);
create index if not exists document_bookmarks_user_doc_page_idx on public.document_bookmarks (user_id, document_id, page_number);
create index if not exists reading_journal_user_updated_idx  on public.reading_journal (user_id, updated_at desc);
create index if not exists reading_journal_user_doc_idx      on public.reading_journal (user_id, document_id);

-- ── updated_at automatique ──────────────────────────────────────────
create or replace function public.study_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists study_annotations_touch on public.study_annotations;
create trigger study_annotations_touch before update on public.study_annotations
  for each row execute function public.study_touch_updated_at();
drop trigger if exists reading_journal_touch on public.reading_journal;
create trigger reading_journal_touch before update on public.reading_journal
  for each row execute function public.study_touch_updated_at();
drop trigger if exists document_progress_touch on public.document_progress;
create trigger document_progress_touch before update on public.document_progress
  for each row execute function public.study_touch_updated_at();

-- ── Privilèges : authenticated seulement (anon N'A AUCUN accès de base) ──────
-- Sans GRANT, `authenticated` reçoit « permission denied » avant même la RLS.
-- On accorde le CRUD à authenticated ; la RLS le restreint ensuite au propriétaire.
-- `anon` n'est JAMAIS granté → refus dès le niveau privilège (défense en profondeur).
grant select, insert, update, delete on
  public.study_annotations, public.document_bookmarks, public.reading_journal, public.document_progress
  to authenticated;
revoke all on
  public.study_annotations, public.document_bookmarks, public.reading_journal, public.document_progress
  from anon;

-- ── RLS : owner-only, aucun accès anon ──────────────────────────────
alter table public.study_annotations enable row level security;
alter table public.document_bookmarks enable row level security;
alter table public.reading_journal   enable row level security;
alter table public.document_progress enable row level security;

do $$
declare t text;
begin
  foreach t in array array['study_annotations','document_bookmarks','reading_journal','document_progress']
  loop
    execute format('drop policy if exists %I_sel on public.%I', t, t);
    execute format('drop policy if exists %I_ins on public.%I', t, t);
    execute format('drop policy if exists %I_upd on public.%I', t, t);
    execute format('drop policy if exists %I_del on public.%I', t, t);
    execute format($p$create policy %I_sel on public.%I for select to authenticated using (auth.uid() = user_id)$p$, t, t);
    execute format($p$create policy %I_ins on public.%I for insert to authenticated with check (auth.uid() = user_id)$p$, t, t);
    execute format($p$create policy %I_upd on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)$p$, t, t);
    execute format($p$create policy %I_del on public.%I for delete to authenticated using (auth.uid() = user_id)$p$, t, t);
  end loop;
end $$;

-- =====================================================================
-- FIN LB-2 STUDY. NON APPLIQUÉE AU DISTANT. Tester localement (schema, FK,
-- indexes, RLS owner CRUD + refus cross-user + refus anon) avant tout GO.
-- =====================================================================
