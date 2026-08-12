-- =============================================================================
-- P1 DATA-SEMANTICS — correction sémantique KPI membre_statut + colonne parcours_etape
-- =============================================================================
-- Lot SÉPARÉ de P0 migration-health / PODCAST (PR #3). 100% ADDITIF : redéfinit des
-- fonctions existantes via CREATE OR REPLACE (signatures IDENTIQUES → pas de DROP,
-- ACL préservées, forward-effective en prod). Ne modifie AUCUN fichier de migration
-- antérieur ni la table sous-jacente.
--
-- CAUSE : les fonctions V4/V5 filtraient profiles.membre_statut sur les littéraux
--   'membre'/'fidele'/'actif' — ABSENTS de l'enum membre_statut (conflation de 3
--   vocabulaires : user_role / user_status / classification health). Les objets SQL
--   (P0 castés ::text) renvoyaient 0 ; les objets plpgsql plantaient au runtime
--   (invalid input value for enum). De plus profiles.parcours_etape n'existe pas :
--   la vraie colonne est profiles.parcours_disciple_etape (integer 0..6).
--
-- DÉCISION MÉTIER (owner GO) : « membre » =
--   • KPI MONO-tuile (command_center_kpis, antenne_governance_agg, antenne_stats_agg,
--     cartographie_monde) → LARGE = tout sauf visiteur = membre_statut <> 'visiteur'.
--   • Vues MULTI-tuiles qui comptent disciples/leaders À PART (world_overview,
--     capture_world_snapshot) → ÉTROIT = {nouveau_membre, membre_actif} (anti-double-comptage).
--   'fidele' et 'actif' SUPPRIMÉS (jamais des valeurs enum, pas de mapping).
--
-- COLONNE : parcours_etape → parcours_disciple_etape (5 réfs profiles dans
--   world_overview / capture_world_snapshot / prophetic_compute_snapshot). La colonne
--   member_feature_snapshots.parcours_etape (légitime) n'est PAS touchée.
--
-- ⚠ EFFET ATTENDU : les compteurs « membres » repassent au réel ; le pilier score
--   antenne et l'alerte antenne_inactive (aujourd'hui faux négatif car 0/0) redeviennent
--   actifs → attendre une vague légitime d'alertes au 1er cron.
-- =============================================================================


-- 1) command_center_kpis (SQL) — membres_actifs = LARGE

CREATE OR REPLACE FUNCTION public.command_center_kpis(scope_pays text[] DEFAULT NULL::text[], scope_antennes uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with bornes as (
    select (now() - interval '30 days') as d30,
           (now() - interval '90 seconds') as donline,
           date_trunc('day', now()) as djour
  ),
  prof as (
    select p.* from public.profiles p
    where (scope_pays is null or upper(p.pays) = any (select upper(x) from unnest(scope_pays) x))
      and (scope_antennes is null or p.antenne_id = any (scope_antennes))
  ),
  dons_ok as (
    select d.devise, d.montant from public.dons d
    where d.statut = 'complete'
      and (scope_antennes is null or d.antenne_id = any (scope_antennes))
      and (scope_pays is null or d.user_id in (select id from prof))
  )
  select jsonb_build_object(
    'membres_total',        (select count(*) from prof),
    'nouveaux_30j',         (select count(*) from prof p, bornes b where p.created_at >= b.d30),
    -- P0 migration-health: cast enum→text pour rendre la fonction SQL créable au reset.
    -- DETTE connue: 'membre'/'fidele'/'actif' ∉ enum membre_statut → compteur = 0 (bug métier préexistant, sémantique à trancher séparément).
    'membres_actifs',       (select count(*) from prof where membre_statut <> 'visiteur'),
    'dons_par_devise',      (select coalesce(jsonb_object_agg(upper(coalesce(devise,'FCFA')), s), '{}'::jsonb)
                               from (select devise, sum(montant) s from dons_ok group by devise) t),
    'dons_count',           (select count(*) from dons_ok),
    'prieres_attente',      (select count(*) from public.priere_demandes pr
                               where lower(pr.statut) = any (array['nouvelle','recue','en_cours','en_attente'])
                                 and (scope_pays is null or upper(pr.pays) = any (select upper(x) from unnest(scope_pays) x))
                                 and (scope_antennes is null or pr.antenne_id = any (scope_antennes))),
    'formations_actives',   (select count(*) from public.inscriptions_formation i
                               where i.user_id in (select id from prof) and lower(coalesce(i.statut,'')) <> 'abandonne'),
    'evenements_a_venir',   (select count(*) from public.evenements e
                               where (scope_antennes is null or e.antenne_id = any (scope_antennes))),
    'achats_marketplace',   (select count(*) from public.product_purchases pp where lower(coalesce(pp.statut,'')) = 'complete'
                               and (scope_antennes is null or pp.antenne_id = any (scope_antennes))),
    'connectes_now',        (select count(*) from public.analytics_sessions s, bornes b
                               where s.last_seen >= b.donline
                                 and (scope_pays is null or upper(s.pays) = any (select upper(x) from unnest(scope_pays) x))),
    'visiteurs_aujourdhui', (select count(*) from public.analytics_sessions s, bornes b
                               where s.last_seen >= b.djour
                                 and (scope_pays is null or upper(s.pays) = any (select upper(x) from unnest(scope_pays) x)))
  );
$function$;

-- 2) antenne_governance_agg (SQL) — membres / membres_actifs = LARGE (récence conservée)

CREATE OR REPLACE FUNCTION public.antenne_governance_agg(p_antenne_ids uuid[])
 RETURNS TABLE(antenne_id uuid, nom text, pays text, devise text, parent_id uuid, membres bigint, membres_actifs bigint, nouveaux_30j bigint, nouveaux_90j bigint, responsables bigint, conseil bigint, prieres bigint, prieres_attente bigint, formations bigint, formations_actives bigint, evenements bigint, disciples_actifs bigint, etapes_validees_30j bigint, dons_count bigint, dons_par_devise jsonb, objectifs_total bigint, objectifs_atteints bigint, objectifs_en_retard bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    a.id, a.nom, a.pays, coalesce(a.devise,'FCFA'), a.parent_id,
    -- P0 migration-health: cast enum→text (fonction SQL créable). DETTE: littéraux ∉ enum → 0 (cf. v4_command_center).
    (select count(*) from public.profiles p where p.antenne_id = a.id and p.membre_statut <> 'visiteur'),
    (select count(*) from public.profiles p where p.antenne_id = a.id and p.membre_statut <> 'visiteur'
       and p.derniere_connexion >= now() - interval '30 days'),
    (select count(*) from public.profiles p where p.antenne_id = a.id and p.created_at >= now() - interval '30 days'),
    (select count(*) from public.profiles p where p.antenne_id = a.id and p.created_at >= now() - interval '90 days'),
    (select count(*) from public.antenne_responsables r where r.antenne_id = a.id and r.actif),
    (select count(*) from public.antenne_conseil c where c.antenne_id = a.id and c.actif),
    (select count(*) from public.priere_demandes pr where pr.antenne_id = a.id),
    (select count(*) from public.priere_demandes pr where pr.antenne_id = a.id
       and lower(pr.statut) in ('nouvelle','recue','en_cours','en_attente')),
    (select count(*) from public.inscriptions_formation f where f.antenne_id = a.id),
    (select count(*) from public.inscriptions_formation f where f.antenne_id = a.id and lower(coalesce(f.statut,'')) <> 'abandonne'),
    (select count(*) from public.evenements e where e.antenne_id = a.id),
    (select count(*) from public.discipulat_relations dr where dr.antenne_id = a.id and dr.statut = 'active'),
    (select count(*) from public.discipulat_progressions dp
       join public.discipulat_relations dr on dr.disciple_id = dp.disciple_id and dr.antenne_id = a.id
       where dp.statut = 'valide' and dp.valide_le >= now() - interval '30 days'),
    (select count(*) from public.dons dn where dn.antenne_id = a.id and dn.statut = 'complete'),
    coalesce((select jsonb_object_agg(upper(coalesce(dn.devise, coalesce(a.devise,'FCFA'))), s)
       from (select dn.devise, sum(coalesce(dn.montant,0)) s
             from public.dons dn where dn.antenne_id = a.id and dn.statut = 'complete'
             group by dn.devise) dn), '{}'::jsonb),
    (select count(*) from public.antenne_objectifs o where o.antenne_id = a.id and o.actif),
    (select count(*) from public.antenne_objectifs o where o.antenne_id = a.id and o.actif and o.statut = 'atteint'),
    (select count(*) from public.antenne_objectifs o where o.antenne_id = a.id and o.actif and o.statut = 'en_retard')
  from public.antennes a
  where a.id = any(p_antenne_ids) and a.actif;
$function$;

-- 3) antenne_stats_agg (plpgsql) — membres = LARGE

CREATE OR REPLACE FUNCTION public.antenne_stats_agg(p_antenne_ids uuid[])
 RETURNS TABLE(membres bigint, inscrits bigint, responsables bigint, prieres bigint, formations bigint, evenements bigint, dons_count bigint, dons_par_devise jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_devise jsonb;
begin
  select coalesce(jsonb_object_agg(d.devise, d.total), '{}'::jsonb) into v_devise
  from (
    select coalesce(a.devise, 'FCFA') as devise, sum(coalesce(dn.montant, 0)) as total
    from public.dons dn
    left join public.antennes a on a.id = dn.antenne_id
    where dn.antenne_id = any(p_antenne_ids) and dn.statut = 'complete'
    group by coalesce(a.devise, 'FCFA')
  ) d;
  return query
  select
    (select count(*) from public.profiles p where p.antenne_id = any(p_antenne_ids)
       and p.membre_statut <> 'visiteur'),
    (select count(*) from public.profiles p where p.antenne_id = any(p_antenne_ids)),
    (select count(*) from public.antenne_responsables r where r.antenne_id = any(p_antenne_ids) and r.actif),
    (select count(*) from public.priere_demandes pr where pr.antenne_id = any(p_antenne_ids)),
    (select count(*) from public.inscriptions_formation f where f.antenne_id = any(p_antenne_ids)),
    (select count(*) from public.evenements e where e.antenne_id = any(p_antenne_ids)),
    (select count(*) from public.dons dn where dn.antenne_id = any(p_antenne_ids) and dn.statut = 'complete'),
    v_devise;
end;
$function$;

-- 4) cartographie_monde (plpgsql) — membres_actifs = LARGE

CREATE OR REPLACE FUNCTION public.cartographie_monde(p_scope_pays text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare j jsonb;
begin
  select jsonb_build_object(
    'nations', (
      select coalesce(jsonb_agg(t order by t.membres desc), '[]'::jsonb) from (
        select
          coalesce(nullif(trim(p.pays), ''), 'Non renseigné')                      as pays,
          g.code_iso2, g.lat, g.lng,
          count(*)                                                                 as membres,
          count(*) filter (where p.role in
            ('admin','super_admin','pasteur','nation_pastor','platform_admin',
             'responsable_integration','responsable_mahanaim','coordinateur','formateur')) as responsables,
          count(*) filter (where p.membre_statut <> 'visiteur')   as membres_actifs,
          count(*) filter (where p.created_at >= now() - interval '30 days')       as nouveaux_30j,
          count(*) filter (where p.created_at >= now() - interval '90 days')       as nouveaux_90j,
          round(avg(coalesce(p.score_engagement, 0))::numeric, 1)                  as engagement_moyen,
          (select count(*) from public.antennes a
             where a.actif and lower(a.pays) = lower(p.pays))                       as antennes
        from public.profiles p
        left join public.geo_localites g
          on lower(g.pays) = lower(coalesce(p.pays, '')) and g.ville is null and g.actif
        where (p_scope_pays is null or lower(p.pays) = lower(p_scope_pays))
        group by 1, g.code_iso2, g.lat, g.lng
      ) t
    ),
    'antennes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'nom', a.nom, 'pays', a.pays, 'ville', a.ville,
        'lat', a.lat, 'lng', a.lng, 'devise', a.devise,
        'membres', (select count(*) from public.profiles p where p.antenne_id = a.id)
      )), '[]'::jsonb)
      from public.antennes a
      where a.actif and a.lat is not null
        and (p_scope_pays is null or lower(a.pays) = lower(p_scope_pays))
    ),
    'expansion', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', z.id, 'nom', z.nom, 'pays', z.pays, 'ville', z.ville,
        'lat', z.lat, 'lng', z.lng, 'statut', z.statut, 'priorite', z.priorite,
        'objectif_membres', z.objectif_membres
      )), '[]'::jsonb)
      from public.expansion_zones z
      where z.actif and z.statut <> 'implantee'
        and (p_scope_pays is null or lower(z.pays) = lower(p_scope_pays))
    )
  ) into j;
  return j;
end;
$function$;

-- 5) world_overview (plpgsql) — membres = ÉTROIT + parcours_disciple_etape

CREATE OR REPLACE FUNCTION public.world_overview(p_scope_type text DEFAULT 'monde'::text, p_scope_key text DEFAULT '*'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  j jsonb;
  v_pays text := case when p_scope_type = 'pays' then p_scope_key else null end;
  v_ant  uuid := case when p_scope_type = 'antenne' then nullif(p_scope_key,'*')::uuid else null end;
begin
  with prof as (
    select p.* from public.profiles p
    where (v_pays is null or p.pays ilike v_pays)
      and (v_ant  is null or p.antenne_id = v_ant)
  ),
  -- agrégats par nation (toujours calculés pour la carte si scope monde)
  par_nation as (
    select coalesce(nullif(trim(p.pays),''),'Non renseigné') as pays,
           count(*) as inscrits,
           count(*) filter (where p.membre_statut in ('nouveau_membre','membre_actif')) as membres,
           count(*) filter (where p.created_at >= now() - interval '30 days') as nouveaux_30j
    from public.profiles p
    where (v_ant is null or p.antenne_id = v_ant)
    group by 1
  )
  select jsonb_build_object(
    'scope_type', p_scope_type,
    'scope_key',  p_scope_key,
    -- KPIs mondiaux consolidés (vivants) ----------------------------------
    'totaux', (
      select jsonb_build_object(
        'inscrits',     (select count(*) from prof),
        'membres',      (select count(*) from prof where membre_statut in ('nouveau_membre','membre_actif')),
        'responsables', (select count(*) from prof where role in
                          ('super_admin','nation_pastor','platform_admin','pasteur','coordinateur','responsable_integration','responsable_mahanaim','formateur')),
        'leaders',      (select count(*) from prof where role in ('super_admin','nation_pastor','pasteur','coordinateur','leader','berger')),
        'disciples',    (select count(*) from prof where parcours_disciple_etape >= 5 or membre_statut = 'disciple'),
        'nouveaux_30j', (select count(*) from prof where created_at >= now() - interval '30 days'),
        'nations',      (select count(distinct coalesce(nullif(trim(pays),''),null)) from prof where pays is not null),
        'antennes',     (select count(*) from public.antennes where actif = true
                          and (v_ant is null or id = v_ant)),
        'prieres',      (select count(*) from public.priere_demandes pd
                          where (v_pays is null or pd.pays ilike v_pays)),
        'ames',         (select count(*) from public.delivrance_demandes dd
                          where v_pays is null  -- comptage global ; pas de PII
                            and (v_ant is null)),
        'formations',   (select count(*) from public.inscriptions_formation i
                          where exists (select 1 from prof pr where pr.id = i.user_id)),
        'dons_count',   (select count(*) from public.dons d where d.statut = 'complete'
                          and (v_pays is null or exists (select 1 from prof pr where pr.id = d.user_id))
                          and (v_ant  is null or d.antenne_id = v_ant)),
        'dons_total',   (select coalesce(sum(d.montant),0) from public.dons d where d.statut = 'complete'
                          and (v_pays is null or exists (select 1 from prof pr where pr.id = d.user_id))
                          and (v_ant  is null or d.antenne_id = v_ant)),
        'evenements',   (select count(*) from public.evenements e
                          where (v_ant is null or e.antenne_id = v_ant))
      )
    ),
    -- Répartition géographique (mappemonde) -------------------------------
    'nations', (
      select coalesce(jsonb_agg(t order by t.membres desc), '[]'::jsonb) from (
        select pays, inscrits, membres, nouveaux_30j from par_nation
        where pays <> 'Non renseigné' or inscrits > 0
        limit 200
      ) t
    ),
    -- Antennes (poids + responsable) --------------------------------------
    'antennes_list', (
      select coalesce(jsonb_agg(t order by t.membres desc), '[]'::jsonb) from (
        select a.id, a.nom, a.slug, a.pays, a.ville, a.devise,
               (select count(*) from public.profiles p where p.antenne_id = a.id) as inscrits,
               (select count(*) from public.profiles p where p.antenne_id = a.id
                  and p.membre_statut in ('nouveau_membre','membre_actif')) as membres
        from public.antennes a
        where a.actif = true and (v_ant is null or a.id = v_ant)
        limit 200
      ) t
    ),
    'generated_at', now()
  ) into j;
  return j;
end;
$function$;

-- 6) capture_world_snapshot (plpgsql) — membres = ÉTROIT + parcours_disciple_etape

CREATE OR REPLACE FUNCTION public.capture_world_snapshot(p_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare n integer := 0;
begin
  -- MONDE
  insert into public.world_daily_snapshots
    (snapshot_date, scope_type, scope_key, scope_label, pays,
     inscrits, membres, disciples, leaders, responsables, nouveaux_30j,
     ames, prieres, formations, evenements, dons_count, dons_total, antennes)
  select p_date, 'monde', '*', 'Monde', null,
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where membre_statut in ('nouveau_membre','membre_actif')),
    (select count(*) from public.profiles where parcours_disciple_etape >= 5 or membre_statut='disciple'),
    (select count(*) from public.profiles where role in ('super_admin','nation_pastor','pasteur','coordinateur','leader','berger')),
    (select count(*) from public.profiles where role in ('super_admin','nation_pastor','platform_admin','pasteur','coordinateur','responsable_integration','responsable_mahanaim','formateur')),
    (select count(*) from public.profiles where created_at >= now() - interval '30 days'),
    (select count(*) from public.delivrance_demandes),
    (select count(*) from public.priere_demandes),
    (select count(*) from public.inscriptions_formation),
    (select count(*) from public.evenements),
    (select count(*) from public.dons where statut='complete'),
    (select coalesce(sum(montant),0) from public.dons where statut='complete'),
    (select count(*) from public.antennes where actif=true)
  on conflict (snapshot_date, scope_type, scope_key) do update set
    inscrits=excluded.inscrits, membres=excluded.membres, disciples=excluded.disciples,
    leaders=excluded.leaders, responsables=excluded.responsables, nouveaux_30j=excluded.nouveaux_30j,
    ames=excluded.ames, prieres=excluded.prieres, formations=excluded.formations,
    evenements=excluded.evenements, dons_count=excluded.dons_count, dons_total=excluded.dons_total,
    antennes=excluded.antennes;
  n := n + 1;

  -- PAYS
  insert into public.world_daily_snapshots
    (snapshot_date, scope_type, scope_key, scope_label, pays,
     inscrits, membres, nouveaux_30j, prieres)
  select p_date, 'pays', x.pays, x.pays, x.pays, x.inscrits, x.membres, x.nouveaux_30j,
    (select count(*) from public.priere_demandes pd where pd.pays ilike x.pays)
  from (
    select coalesce(nullif(trim(pays),''),'Non renseigné') as pays,
           count(*) as inscrits,
           count(*) filter (where membre_statut in ('nouveau_membre','membre_actif')) as membres,
           count(*) filter (where created_at >= now() - interval '30 days') as nouveaux_30j
    from public.profiles group by 1
  ) x
  on conflict (snapshot_date, scope_type, scope_key) do update set
    inscrits=excluded.inscrits, membres=excluded.membres,
    nouveaux_30j=excluded.nouveaux_30j, prieres=excluded.prieres;
  get diagnostics n = row_count;

  -- ANTENNES
  insert into public.world_daily_snapshots
    (snapshot_date, scope_type, scope_key, scope_label, pays,
     inscrits, membres, dons_count, dons_total)
  select p_date, 'antenne', a.id::text, a.nom, a.pays,
    (select count(*) from public.profiles p where p.antenne_id=a.id),
    (select count(*) from public.profiles p where p.antenne_id=a.id and p.membre_statut in ('nouveau_membre','membre_actif')),
    (select count(*) from public.dons d where d.antenne_id=a.id and d.statut='complete'),
    (select coalesce(sum(d.montant),0) from public.dons d where d.antenne_id=a.id and d.statut='complete')
  from public.antennes a where a.actif=true
  on conflict (snapshot_date, scope_type, scope_key) do update set
    inscrits=excluded.inscrits, membres=excluded.membres,
    dons_count=excluded.dons_count, dons_total=excluded.dons_total;

  return n;
end;
$function$;

-- 7) prophetic_compute_snapshot (plpgsql) — parcours_disciple_etape

CREATE OR REPLACE FUNCTION public.prophetic_compute_snapshot(p_scope_type text, p_scope_id text DEFAULT NULL::text, p_fenetre_jours integer DEFAULT 30)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_debut timestamptz := now() - make_interval(days => p_fenetre_jours);
  v_id uuid;
  v_membres int := 0; v_nouveaux int := 0; v_non_integres int := 0;
  v_pri_urg int := 0; v_pri_suivi int := 0; v_dons numeric := 0; v_dons_nb int := 0; v_actifs int := 0;
  v_label text;
begin
  if p_scope_type = 'antenne' then
    select count(*) into v_membres from public.profiles where antenne_id = p_scope_id::uuid;
    select count(*) into v_nouveaux from public.profiles where antenne_id = p_scope_id::uuid and created_at >= v_debut;
    select count(*) into v_non_integres from public.profiles
      where antenne_id = p_scope_id::uuid and created_at >= v_debut and coalesce(parcours_disciple_etape,0) = 0;
    select count(*) into v_actifs from public.profiles
      where antenne_id = p_scope_id::uuid and derniere_connexion >= now() - interval '30 days';
    select coalesce(sum(montant),0), count(*) into v_dons, v_dons_nb from public.dons
      where antenne_id = p_scope_id::uuid and statut = 'complete' and date_creation >= v_debut;  -- P0: dons.date_creation
    select nom into v_label from public.antennes where id = p_scope_id::uuid;
  elsif p_scope_type = 'nation' then
    select count(*) into v_membres from public.profiles where pays ilike p_scope_id;
    select count(*) into v_nouveaux from public.profiles where pays ilike p_scope_id and created_at >= v_debut;
    select count(*) into v_non_integres from public.profiles
      where pays ilike p_scope_id and created_at >= v_debut and coalesce(parcours_disciple_etape,0) = 0;
    select count(*) into v_actifs from public.profiles
      where pays ilike p_scope_id and derniere_connexion >= now() - interval '30 days';
    select count(*) into v_pri_urg from public.priere_demandes
      where pays ilike p_scope_id and priorite in ('urgent','tres_urgent')
        and statut not in ('repondue','archivee','clos') and created_at >= v_debut;
    select count(*) into v_pri_suivi from public.priere_demandes
      where pays ilike p_scope_id and assigned_to is null and created_at >= v_debut;
    v_label := p_scope_id;
  else -- monde
    select count(*) into v_membres from public.profiles;
    select count(*) into v_nouveaux from public.profiles where created_at >= v_debut;
    select count(*) into v_non_integres from public.profiles where created_at >= v_debut and coalesce(parcours_disciple_etape,0) = 0;
    select count(*) into v_actifs from public.profiles where derniere_connexion >= now() - interval '30 days';
    select count(*) into v_pri_urg from public.priere_demandes
      where priorite in ('urgent','tres_urgent') and statut not in ('repondue','archivee','clos') and created_at >= v_debut;
    select count(*) into v_pri_suivi from public.priere_demandes where assigned_to is null and created_at >= v_debut;
    select coalesce(sum(montant),0), count(*) into v_dons, v_dons_nb from public.dons where statut = 'complete' and date_creation >= v_debut;  -- P0: dons.date_creation
    v_label := 'Monde';
  end if;

  insert into public.prophetic_region_snapshots(
    scope_type, scope_id, scope_label, periode_debut, periode_fin,
    membres_total, nouveaux_30j, convertis_non_integres, prieres_urgentes,
    prieres_sans_suivi, dons_total, dons_nb, membres_actifs_30j)
  values (p_scope_type, p_scope_id, v_label, v_debut, now(),
    v_membres, v_nouveaux, v_non_integres, v_pri_urg, v_pri_suivi, v_dons, v_dons_nb, v_actifs)
  returning id into v_id;
  return v_id;
end;
$function$;
