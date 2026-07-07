-- CITADELLE V2.3-C — POSTCHECK Prières & Guides
-- ⚠️ FICHIER MANUEL — À exécuter APRÈS le fichier principal, dans le Supabase Dashboard.
--    Lecture seule (aucune écriture). Ne pas exécuter via CLI.
-- Renvoie une ligne avec le marker CITADELLE_V23C_PRAYER_GUIDES_SQL_READY_CHECK
-- et les booléens de vérification.

with checks as (
  select
    (to_regclass('public.prayer_guides') is not null)                      as tbl_prayer_guides,
    (to_regclass('public.prayer_guide_events') is not null)                as tbl_prayer_guide_events,
    (select count(*) from information_schema.columns
       where table_schema = 'public' and table_name = 'prayer_guides'
         and column_name in ('slug','title','category','excerpt','content','status','access_level','guide_steps','image_url','pdf_url','display_order')
    ) = 11                                                                 as cols_key_present,
    coalesce((select relrowsecurity from pg_class
       where oid = to_regclass('public.prayer_guides')), false)            as rls_guides_on,
    coalesce((select relrowsecurity from pg_class
       where oid = to_regclass('public.prayer_guide_events')), false)      as rls_events_on,
    (select count(*) from public.prayer_guides) >= 6                       as seed_at_least_6,
    (select count(*) from pg_indexes where schemaname = 'public'
       and tablename in ('prayer_guides','prayer_guide_events')) >= 8      as indexes_present,
    exists (select 1 from pg_trigger
       where tgname = 'trg_prayer_guides_updated_at' and not tgisinternal) as trigger_updated_at_present
)
select
  'CITADELLE_V23C_PRAYER_GUIDES_SQL_READY_CHECK' as marker,
  tbl_prayer_guides,
  tbl_prayer_guide_events,
  cols_key_present,
  rls_guides_on,
  rls_events_on,
  seed_at_least_6,
  indexes_present,
  trigger_updated_at_present,
  (tbl_prayer_guides and tbl_prayer_guide_events and cols_key_present
     and rls_guides_on and rls_events_on and seed_at_least_6 and indexes_present) as all_ready
from checks;
