-- ============================================================================
-- LOT A — PROGRAMME D'INTÉGRATION : à exécuter dans Supabase SQL Editor.
-- DATA ONLY · idempotent · aucune DDL · aucune suppression.
-- Ordre des blocs : 1) Nouveau Croyant 2) Je Découvre la Maison
--                   3) P3 (shell) 4) Séquence (verrou inter-parcours).
-- Relancer sans risque : upserts par slug / (formation_id, ordre).
-- ============================================================================

-- 1) PARCOURS VISITEUR — NOUVEAU CROYANT (6 modules en préparation) ----------
do $$
declare v_formation uuid; v_prev uuid := null; v_id uuid; rec record;
begin
  insert into public.formations (titre, slug, contenu_court, description, statut, gratuit, certifiant)
  values ('Parcours Visiteur — Nouveau Croyant', 'nouveau-croyant', 'Faire ses premiers pas dans la foi.',
    $f$Le parcours d'entrée du Programme d'Intégration : accompagner les premières semaines de foi de celui qui découvre Jésus-Christ — la prière, la Parole, la grâce, le témoignage, le baptême et la communauté.$f$,
    'publie', true, false)
  on conflict (slug) do update set titre=excluded.titre, contenu_court=excluded.contenu_court,
    description=excluded.description, statut='publie', updated_at=now()
  returning id into v_formation;
  for rec in select * from (values
      (1,'La Prière — Parler à Dieu'),(2,'Lire la Bible chaque jour'),(3,'Comprendre la Grâce'),
      (4,'Votre témoignage de conversion'),(5,'Le baptême — Signification et symbolisme'),(6,'Trouver votre communauté')
    ) as t(ordre, titre) order by 1
  loop
    select id into v_id from public.formation_modules where formation_id=v_formation and ordre=rec.ordre limit 1;
    if v_id is null then
      insert into public.formation_modules (formation_id, ordre, titre, type, acces_min_statut, status, prerequis_module_id)
      values (v_formation, rec.ordre, rec.titre, 'video', 'membre', 'published', v_prev) returning id into v_id;
    else
      update public.formation_modules set titre=rec.titre, status='published', prerequis_module_id=v_prev, updated_at=now() where id=v_id;
    end if;
    v_prev := v_id;
  end loop;
end $$;

-- 2) PARCOURS 1 — JE DÉCOUVRE LA MAISON (6 modules en préparation) -----------
do $$
declare v_formation uuid; v_prev uuid := null; v_id uuid; rec record;
begin
  insert into public.formations (titre, slug, contenu_court, description, statut, gratuit, certifiant)
  values ('Parcours 1 — Je Découvre la Maison', 'je-decouvre-la-maison', 'Découvrir qui nous sommes et trouver ta place.',
    $f$Le premier parcours d'intégration : comprendre qui nous sommes, découvrir la vision de la CIER et trouver sa place dans la famille royale.$f$,
    'publie', true, false)
  on conflict (slug) do update set titre=excluded.titre, contenu_court=excluded.contenu_court,
    description=excluded.description, statut='publie', updated_at=now()
  returning id into v_formation;
  for rec in select * from (values
      (1,'Découvrir la vision et l''histoire', $d$Au programme : pourquoi la CIER existe · l'appel prophétique de la maison · notre mission · notre vision · notre impact.$d$),
      (2,'Comprendre les valeurs du Royaume', $d$Au programme : l'amour · la foi · l'excellence · le service · l'intégrité · la culture du Royaume.$d$),
      (3,'Être accueilli et rattaché à une cellule', $d$Au programme : pourquoi marcher avec une famille spirituelle · présentation des plateformes · les cellules et groupes · le rôle du responsable · comment s'intégrer.$d$),
      (4,'Découvrir les plateformes de la CIER', $d$Au programme : Femmes d'Exceptions · Jeunesse · Chapelle Familiale · Mahanaïm · CFIC · Cité du Refuge · CIER.$d$),
      (5,'Les premiers pas d''un membre engagé', $d$Au programme : participer aux cultes · vie de prière · vie de Parole · service · communion fraternelle.$d$),
      (6,'Mon engagement dans la famille royale', $d$Au programme : signature du parcours · validation d'intégration · déclaration d'engagement · déblocage du Parcours 2.$d$)
    ) as t(ordre, titre, descr) order by 1
  loop
    select id into v_id from public.formation_modules where formation_id=v_formation and ordre=rec.ordre limit 1;
    if v_id is null then
      insert into public.formation_modules (formation_id, ordre, titre, description, type, acces_min_statut, status, prerequis_module_id)
      values (v_formation, rec.ordre, rec.titre, rec.descr, 'video', 'membre', 'published', v_prev) returning id into v_id;
    else
      update public.formation_modules set titre=rec.titre, description=rec.descr, status='published', prerequis_module_id=v_prev, updated_at=now() where id=v_id;
    end if;
    v_prev := v_id;
  end loop;
end $$;

-- 3) PARCOURS 3 — JE DEVIENS UN DISCIPLE ACTIF (shell, brouillon) ------------
do $$
begin
  insert into public.formations (titre, slug, contenu_court, description, statut, gratuit, certifiant)
  values ('Parcours 3 — Je Deviens un Disciple Actif', 'je-deviens-disciple-actif', 'Grandir vers la maturité, le service et la mission.',
    $f$Le troisième parcours d'intégration : conduire le membre vers la maturité, le service et la mission. Contenu en préparation.$f$,
    'brouillon', true, false)
  on conflict (slug) do update set titre=excluded.titre, contenu_court=excluded.contenu_court, description=excluded.description, updated_at=now();
end $$;

-- 4) SÉQUENCE DU PROGRAMME D'INTÉGRATION (verrou inter-parcours) -------------
do $$
declare v_parcours uuid; rec record; v_fid uuid;
begin
  insert into public.parcours (slug, titre, description, categorie, etape_tunnel, ordre, status)
  values ('programme-integration', 'Programme d''Intégration',
    'Le chemin d''intégration : Nouveau Croyant, Je Découvre la Maison, Je Stabilise Ma Foi, Je Deviens un Disciple Actif.',
    'integration', 'integration', 1, 'published')
  on conflict (slug) do update set titre=excluded.titre, description=excluded.description, status='published', updated_at=now()
  returning id into v_parcours;
  for rec in select * from (values
      ('nouveau-croyant',1),('je-decouvre-la-maison',2),('je-stabilise-ma-foi',3),('je-deviens-disciple-actif',4)
    ) as t(slug, ordre) order by 2
  loop
    select id into v_fid from public.formations where slug=rec.slug limit 1;
    if v_fid is not null then
      insert into public.parcours_formations (parcours_id, formation_id, ordre)
      values (v_parcours, v_fid, rec.ordre)
      on conflict (parcours_id, formation_id) do update set ordre=excluded.ordre;
    end if;
  end loop;
end $$;
