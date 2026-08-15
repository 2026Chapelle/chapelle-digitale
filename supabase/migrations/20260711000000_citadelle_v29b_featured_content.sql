-- ============================================================================
-- CITADELLE V2.9-B — Contenus en vedette (accueil). Supabase SQL Editor.
-- Additif · idempotent · sans perte. Archivage canonique.
-- ----------------------------------------------------------------------------
-- ⚠️ DÉJÀ APPLIQUÉ MANUELLEMENT (Supabase Dashboard : « Success. No rows
--    returned », postcheck all_checks_ok=true). Ce fichier VERSIONNE le SQL
--    exact exécuté. Ré-exécution SANS effet (add column / constraint / index
--    idempotents). Postcheck & rollback : voir artifacts/V2.9-B-featured-content-*.sql
--
-- Pilote la « mise en vedette » de :
--   • FORMATIONS  → is_featured + featured_order (>=0)   [colonnes ajoutées]
--   • ÉVÉNEMENTS  → is_featured                          [réutilise sort_order]
-- « Parcours en vedette » = lignes de public.formations avec type='parcours'
-- (source canonique). La table public.parcours N'EST PAS TOUCHÉE.
-- ============================================================================

-- 1) FORMATIONS — vedette + ordre éditorial ----------------------------------
alter table public.formations add column if not exists is_featured    boolean not null default false;
alter table public.formations add column if not exists featured_order integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'formations_featured_order_nonneg'
      and conrelid = 'public.formations'::regclass
  ) then
    alter table public.formations
      add constraint formations_featured_order_nonneg check (featured_order >= 0);
  end if;
end $$;

create index if not exists idx_formations_featured
  on public.formations (featured_order, id)
  where is_featured = true;

-- 2) ÉVÉNEMENTS — vedette (ordre = sort_order existant, inchangé) -------------
alter table public.cms_events add column if not exists is_featured boolean not null default false;

create index if not exists idx_cms_events_featured
  on public.cms_events (sort_order, id)
  where is_featured = true;

-- 3) Recharge le cache de schéma PostgREST -----------------------------------
notify pgrst, 'reload schema';
