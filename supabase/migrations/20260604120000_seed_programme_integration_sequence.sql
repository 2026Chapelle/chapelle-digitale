-- ============================================================================
-- SEED (DATA ONLY) — SÉQUENCE DU PROGRAMME D'INTÉGRATION
-- ----------------------------------------------------------------------------
-- Ordre officiel (tables existantes public.parcours + public.parcours_formations) :
--   1. Parcours Visiteur — Nouveau Croyant        (slug nouveau-croyant)
--   2. Parcours 1 — Je Découvre la Maison         (slug je-decouvre-la-maison)
--   3. Parcours 2 — Je Stabilise Ma Foi           (slug je-stabilise-ma-foi)
--   4. Parcours 3 — Je Deviens un Disciple Actif  (slug je-deviens-disciple-actif)
--
-- C'est cette séquence que lit le verrou inter-parcours : une formation reste
-- verrouillée tant que la précédente n'est pas terminée à 100 %.
--
-- GARANTIES : DATA ONLY (aucune DDL), idempotent (upsert par slug parcours +
-- contrainte unique (parcours_id, formation_id)). Aucune suppression.
-- ============================================================================

do $$
declare
  v_parcours uuid;
  rec        record;
  v_fid      uuid;
begin
  insert into public.parcours (slug, titre, description, categorie, etape_tunnel, ordre, status)
  values (
    'programme-integration',
    'Programme d''Intégration',
    'Le chemin d''intégration : Nouveau Croyant, Je Découvre la Maison, Je Stabilise Ma Foi, Je Deviens un Disciple Actif.',
    'integration',
    'integration',
    1,
    'published'
  )
  on conflict (slug) do update set
    titre        = excluded.titre,
    description  = excluded.description,
    status       = 'published',
    updated_at   = now()
  returning id into v_parcours;

  for rec in
    select * from (values
      ('nouveau-croyant',          1),
      ('je-decouvre-la-maison',    2),
      ('je-stabilise-ma-foi',      3),
      ('je-deviens-disciple-actif',4)
    ) as t(slug, ordre)
    order by 2
  loop
    select id into v_fid from public.formations where slug = rec.slug limit 1;
    if v_fid is not null then
      insert into public.parcours_formations (parcours_id, formation_id, ordre)
      values (v_parcours, v_fid, rec.ordre)
      on conflict (parcours_id, formation_id) do update set ordre = excluded.ordre;
    end if;
  end loop;
end $$;
