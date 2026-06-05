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
    'Parcours 2 — Je stabilise ma foi',
    'je-stabilise-ma-foi',
    'Bâtir une foi solide et disciplinée.',
    $fdesc$Le deuxième parcours du Programme d'Intégration : poser des fondations solides — principes du Royaume, fondations de la foi, baptême, prière, Saint-Esprit, Parole de Dieu et premiers pas dans la communauté.$fdesc$,
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
      (1, 'Les Principes Fondamentaux du Royaume', '8djKB19K2YU',
        $m1$Objectif : comprendre la culture du Royaume et adopter une mentalité alignée sur Dieu.

Verset clé : Matthieu 4:17$m1$),

      (2, 'Les Fondations de la Foi', 'lQQAj8XgSHc',
        $m2$Objectif : poser les bases solides de la vie chrétienne.

Verset clé : Matthieu 7:24-25$m2$),

      (3, 'La Préparation au Baptême', 'f-Az9erbVM4',
        $m3$Objectif : comprendre le sens biblique du baptême et s'y préparer.

Versets clés : Romains 6:4 ; Marc 16:16 ; Actes 2:38 ; Colossiens 2:12$m3$),

      (4, 'La Prière : le Souffle de ta Vie Spirituelle', '5x85QMBiuxQ',
        $m4$Objectif : développer une vie de prière stable et profonde.$m4$),

      (5, 'Le Saint-Esprit : la Puissance pour Marcher Droit', 'ELq6Z0tBkEI',
        $m5$Objectif : apprendre à marcher quotidiennement avec le Saint-Esprit.

Verset clé : Actes 1:8$m5$),

      (6, 'La Parole de Dieu : Nourriture du Disciple', 'pUbNQlFOfQY',
        $m6$La Bible n'est pas un livre ancien : c'est une source vivante, une lampe à tes pieds (Psaume 119:105), et ta nourriture spirituelle quotidienne. Ce module t'apprend comment lire, comprendre, méditer et appliquer la Parole pour transformer ta vie.

Objectif : faire de la Parole ton repère, ta force et ton arme.

Verset clé : Psaume 119:105$m6$),

      (7, 'Mes Premiers Pas dans la Communauté', '5pq4ltf7Lbc',
        $m7$Tu n'es plus un visiteur. Tu fais maintenant partie de la famille royale. Ce module t'ouvre les portes de l'engagement communautaire : connaître ta place, marcher avec les autres, servir avec tes dons, et t'ancrer dans ta maison spirituelle.

Objectif : t'aider à devenir un membre actif, utile et pleinement intégré dans la communauté.

Verset clé : Actes 2:42$m7$)
    ) as t(ordre, titre, yt, descr)
    order by 1
  loop
    select id into v_id
      from public.formation_modules
     where formation_id = v_formation and ordre = rec.ordre
     limit 1;

    if v_id is null then
      insert into public.formation_modules
        (formation_id, ordre, titre, description, type, youtube_id,
         acces_min_statut, status, prerequis_module_id)
      values
        (v_formation, rec.ordre, rec.titre, rec.descr, 'youtube', rec.yt,
         'membre', 'published', v_prev)
      returning id into v_id;
    else
      update public.formation_modules set
        titre               = rec.titre,
        description         = rec.descr,
        type                = 'youtube',
        youtube_id          = rec.yt,
        status              = 'published',
        prerequis_module_id = v_prev,
        updated_at          = now()
      where id = v_id;
    end if;

    v_prev := v_id;
  end loop;
end $$;
