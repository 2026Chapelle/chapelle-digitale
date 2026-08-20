-- =============================================================================
-- LIVE-VIDEO PHASE 1F-C1 — SEED des 4 PROGRAMMES CANONIQUES (horaires arbitrés Doxa)
-- =============================================================================
-- Initialise `live_programs` (définition permanente). IDEMPOTENT via slug UNIQUE :
-- réexécutable sans doublon, met à jour les valeurs canoniques. NE TOUCHE JAMAIS
-- `cms_lives` (aucun backfill program_id — cf. Phase 1E : pas de clé fiable).
--
-- Convention weekdays : 0=dim,1=lun,2=mar,3=mer,4=jeu,5=ven,6=sam.
-- Playlists YouTube reprises 1:1 des constantes legacy (mapping confiance HAUTE).
-- description/image_url : laissés NULL (aucun contenu fictif) et PRÉSERVÉS si édités
-- en admin (le ON CONFLICT ne les écrase pas).
-- =============================================================================
insert into public.live_programs
  (slug, title, weekdays, start_time, timezone, youtube_playlist_id, status, is_active, sort_order)
values
  ('matinale',                    'Matinale',                    '{1,3,5}'::smallint[], '05:30', 'Africa/Abidjan', 'PLxNRRXEmUleEnodeexpNieSFoA6buYIz2', 'published', true, 1),
  ('ecole-du-royaume',            'École du Royaume',            '{3}'::smallint[],     '19:30', 'Africa/Abidjan', 'PLxNRRXEmUleFyJdheYr95byo50Jdvf9SS', 'published', true, 2),
  ('vendredi-de-puissance',       'Vendredi de puissance',       '{5}'::smallint[],     '19:30', 'Africa/Abidjan', 'PLxNRRXEmUleE2-_qS8PujnNJYUu2GuFUb', 'published', true, 3),
  ('culte-de-celebration-royale', 'Culte de Célébration Royale', '{0}'::smallint[],     '10:30', 'Africa/Abidjan', 'PLxNRRXEmUleFrBmQBbULlXkMRLCRUUOCZ', 'published', true, 4)
on conflict (slug) do update set
  title               = excluded.title,
  weekdays            = excluded.weekdays,
  start_time          = excluded.start_time,
  timezone            = excluded.timezone,
  youtube_playlist_id = excluded.youtube_playlist_id,
  status              = excluded.status,
  is_active           = excluded.is_active,
  sort_order          = excluded.sort_order,
  updated_at          = now();
-- (description / image_url volontairement absents du SET : préservés si édités en admin.)
