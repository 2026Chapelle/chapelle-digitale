-- ============================================================================
-- SEED (DATA ONLY) — PARCOURS VISITEUR « Nouveau Croyant » (Étape 0)
-- ----------------------------------------------------------------------------
-- Parcours d'entrée du Programme d'Intégration CIER (AVANT le Parcours 1).
-- Accompagne les premières semaines de foi. 6 modules réels.
-- Vidéos EN PRÉPARATION : aucun youtube_id / pdf_url → modules « en préparation »,
-- NON validables (aucun faux contenu, aucune fausse validation, aucun PDF).
--
-- GARANTIES : DATA ONLY (aucune DDL), idempotent (upsert par slug + par
-- (formation_id, ordre)), aucune suppression. Aucun lien vidéo inventé.
-- ============================================================================

do $$
declare
  v_formation uuid;
  v_prev      uuid := null;
  v_id        uuid;
  rec         record;
begin
  insert into public.formations
    (titre, slug, contenu_court, description, statut, gratuit, certifiant)
  values (
    'Parcours Visiteur — Nouveau Croyant',
    'nouveau-croyant',
    'Faire ses premiers pas dans la foi.',
    $fdesc$Le parcours d'entrée du Programme d'Intégration : accompagner les premières semaines de foi de celui qui découvre Jésus-Christ — la prière, la Parole, la grâce, le témoignage, le baptême et la communauté.$fdesc$,
    'publie',
    true,
    false
  )
  on conflict (slug) do update set
    titre         = excluded.titre,
    contenu_court = excluded.contenu_court,
    description   = excluded.description,
    statut        = 'publie',
    updated_at    = now()
  returning id into v_formation;

  for rec in
    select * from (values
      (1, 'La Prière — Parler à Dieu'),
      (2, 'Lire la Bible chaque jour'),
      (3, 'Comprendre la Grâce'),
      (4, 'Votre témoignage de conversion'),
      (5, 'Le baptême — Signification et symbolisme'),
      (6, 'Trouver votre communauté')
    ) as t(ordre, titre)
    order by 1
  loop
    select id into v_id
      from public.formation_modules
     where formation_id = v_formation and ordre = rec.ordre
     limit 1;

    if v_id is null then
      insert into public.formation_modules
        (formation_id, ordre, titre, type, acces_min_statut, status, prerequis_module_id)
      values
        (v_formation, rec.ordre, rec.titre, 'video', 'membre', 'published', v_prev)
      returning id into v_id;
    else
      update public.formation_modules set
        titre               = rec.titre,
        status              = 'published',
        prerequis_module_id = v_prev,
        updated_at          = now()
      where id = v_id;
    end if;

    v_prev := v_id;
  end loop;
end $$;
