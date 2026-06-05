-- ============================================================================
-- SEED (DATA ONLY) — PARCOURS 1 « Je Découvre la Maison »
-- ----------------------------------------------------------------------------
-- Premier parcours officiel d'intégration CIER (APRÈS le Parcours Visiteur).
-- 6 modules réels avec leur plan (syllabus fourni). Vidéos EN PRÉPARATION :
-- aucun youtube_id / pdf_url → modules « en préparation », NON validables.
--
-- GARANTIES : DATA ONLY (aucune DDL), idempotent (upsert par slug + par
-- (formation_id, ordre)), aucune suppression. Aucun lien vidéo inventé.
-- Déblocage séquentiel intra-parcours via prerequis_module_id (M1→M6).
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
    'Parcours 1 — Je Découvre la Maison',
    'je-decouvre-la-maison',
    'Découvrir qui nous sommes et trouver ta place.',
    $fdesc$Le premier parcours d'intégration : comprendre qui nous sommes, découvrir la vision de la CIER et trouver sa place dans la famille royale.$fdesc$,
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
      (1, 'Découvrir la vision et l''histoire',
        $d1$Au programme : pourquoi la CIER existe · l'appel prophétique de la maison · notre mission · notre vision · notre impact.$d1$),
      (2, 'Comprendre les valeurs du Royaume',
        $d2$Au programme : l'amour · la foi · l'excellence · le service · l'intégrité · la culture du Royaume.$d2$),
      (3, 'Être accueilli et rattaché à une cellule',
        $d3$Au programme : pourquoi marcher avec une famille spirituelle · présentation des plateformes · les cellules et groupes · le rôle du responsable · comment s'intégrer.$d3$),
      (4, 'Découvrir les plateformes de la CIER',
        $d4$Au programme : Femmes d'Exceptions · Jeunesse · Chapelle Familiale · Mahanaïm · CFIC · Cité du Refuge · CIER.$d4$),
      (5, 'Les premiers pas d''un membre engagé',
        $d5$Au programme : participer aux cultes · vie de prière · vie de Parole · service · communion fraternelle.$d5$),
      (6, 'Mon engagement dans la famille royale',
        $d6$Au programme : signature du parcours · validation d'intégration · déclaration d'engagement · déblocage du Parcours 2.$d6$)
    ) as t(ordre, titre, descr)
    order by 1
  loop
    select id into v_id
      from public.formation_modules
     where formation_id = v_formation and ordre = rec.ordre
     limit 1;

    if v_id is null then
      insert into public.formation_modules
        (formation_id, ordre, titre, description, type, acces_min_statut, status, prerequis_module_id)
      values
        (v_formation, rec.ordre, rec.titre, rec.descr, 'video', 'membre', 'published', v_prev)
      returning id into v_id;
    else
      update public.formation_modules set
        titre               = rec.titre,
        description         = rec.descr,
        status              = 'published',
        prerequis_module_id = v_prev,
        updated_at          = now()
      where id = v_id;
    end if;

    v_prev := v_id;
  end loop;
end $$;
