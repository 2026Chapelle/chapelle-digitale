-- ============================================================================
-- SEED (DATA ONLY) — PARCOURS 3 « Je Deviens un Disciple Actif » (SHELL préparé)
-- ----------------------------------------------------------------------------
-- Architecture préparée pour la suite : la formation existe (brouillon, donc
-- NON visible côté membre tant que le contenu n'est pas prêt), mais prend déjà
-- sa place dans la séquence du Programme d'Intégration (verrou P2 → P3).
-- Aucun module inventé. À passer en « publie » + ajouter les modules plus tard.
--
-- GARANTIES : DATA ONLY (aucune DDL), idempotent (upsert par slug), aucune
-- suppression.
-- ============================================================================

do $$
begin
  insert into public.formations
    (titre, slug, contenu_court, description, statut, gratuit, certifiant)
  values (
    'Parcours 3 — Je Deviens un Disciple Actif',
    'je-deviens-disciple-actif',
    'Grandir vers la maturité, le service et la mission.',
    $fdesc$Le troisième parcours d'intégration : conduire le membre vers la maturité, le service et la mission. Contenu en préparation.$fdesc$,
    'brouillon',
    true,
    false
  )
  on conflict (slug) do update set
    titre        = excluded.titre,
    contenu_court = excluded.contenu_court,
    description  = excluded.description,
    updated_at   = now();
    -- statut NON forcé : préserve un éventuel passage manuel en « publie ».
end $$;
