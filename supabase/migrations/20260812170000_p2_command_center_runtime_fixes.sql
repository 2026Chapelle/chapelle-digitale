-- =============================================================================
-- P2 — COMMAND CENTER RUNTIME FIXES (lot séparé de PR #3 / PR #4)
-- =============================================================================
-- 100% ADDITIF : 1 helper + CREATE OR REPLACE de 3 fonctions (signatures identiques
-- → pas de DROP, ACL préservées, forward-effective). N'édite aucune migration antérieure.
--
-- DÉFAUT 1 — cartographie_monde : `subquery uses ungrouped column "p.pays"`. group by 1
--   (= expression coalesce/nullif/trim) mais scalar-subquery « antennes » corrélait sur
--   p.pays BRUT. Fix : max(<même expression de groupe>) (constante intra-groupe). Dormante.
--
-- DÉFAUT 2 — antenne_governance_agg(NULL) renvoyait 0. Fix : (p_antenne_ids is null or
--   a.id = any(p_antenne_ids)) = convention repo. NULL→toutes, []→aucune.
--
-- DÉFAUTS 3+4 — DÉCISION OWNER = B : « membre actif » = membre_statut <> 'visiteur'
--   AND présence dans analytics_sessions (last_seen >= now()-30j). profiles.derniere_connexion
--   est une COLONNE MORTE (0 write) → remplacée par le SIGNAL RÉEL analytics_sessions.last_seen.
--   Fenêtre 30j CENTRALISÉE dans le helper public.membre_actif_30j(uuid) (aucune constante
--   dupliquée). Appliqué de façon cohérente à :
--     • command_center_kpis.membres_actifs (récence AJOUTÉE → libellé « actifs » exact)
--     • antenne_governance_agg.membres_actifs (derniere_connexion → helper)
--     • l'alerte antenne_inactive (via l'input membres_actifs ci-dessus — logique inchangée)
--   Sémantique EXISTS : borne J-30 inclusive (>=), 1 membre compté 1 fois quel que soit le
--   nombre de sessions (aucun double comptage), statut de membre inchangé.
--
-- HORS PÉRIMÈTRE (signalé) : aggregate_spiritual_health, prophetic_compute_snapshot
--   (usages distincts de derniere_connexion), cron/notifications/route.ts:90 (même colonne morte).
-- =============================================================================

-- 0) Helper centralisé — « membre actif » = session analytics récente (fenêtre 30j unique)
create or replace function public.membre_actif_30j(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.analytics_sessions s
    where s.user_id = p_user_id
      and s.last_seen >= now() - interval '30 days'
  );
$$;
revoke all on function public.membre_actif_30j(uuid) from public;
grant execute on function public.membre_actif_30j(uuid) to service_role, authenticated;

-- 1) cartographie_monde — fix agrégation (max) du subquery antennes (défaut 1)
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
             where a.actif and lower(a.pays) = lower(max(coalesce(nullif(trim(p.pays), ''), 'Non renseigné'))))                       as antennes
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

-- 2) antenne_governance_agg — NULL = toutes (défaut 2) + récence réelle last_seen (défaut 3/4/B)
CREATE OR REPLACE FUNCTION public.antenne_governance_agg(p_antenne_ids uuid[])
 RETURNS TABLE(antenne_id uuid, nom text, pays text, devise text, parent_id uuid, membres bigint, membres_actifs bigint, nouveaux_30j bigint, nouveaux_90j bigint, responsables bigint, conseil bigint, prieres bigint, prieres_attente bigint, formations bigint, formations_actives bigint, evenements bigint, disciples_actifs bigint, etapes_validees_30j bigint, dons_count bigint, dons_par_devise jsonb, objectifs_total bigint, objectifs_atteints bigint, objectifs_en_retard bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    a.id, a.nom, a.pays, coalesce(a.devise,'XOF'), a.parent_id,
    -- P0 migration-health: cast enum→text (fonction SQL créable). DETTE: littéraux ∉ enum → 0 (cf. v4_command_center).
    (select count(*) from public.profiles p where p.antenne_id = a.id and p.membre_statut <> 'visiteur'),
    (select count(*) from public.profiles p where p.antenne_id = a.id and p.membre_statut <> 'visiteur'
       and public.membre_actif_30j(p.id)),
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
    coalesce((select jsonb_object_agg(upper(coalesce(dn.devise, coalesce(a.devise,'XOF'))), s)
       from (select dn.devise, sum(coalesce(dn.montant,0)) s
             from public.dons dn where dn.antenne_id = a.id and dn.statut = 'complete'
             group by dn.devise) dn), '{}'::jsonb),
    (select count(*) from public.antenne_objectifs o where o.antenne_id = a.id and o.actif),
    (select count(*) from public.antenne_objectifs o where o.antenne_id = a.id and o.actif and o.statut = 'atteint'),
    (select count(*) from public.antenne_objectifs o where o.antenne_id = a.id and o.actif and o.statut = 'en_retard')
  from public.antennes a
  where (p_antenne_ids is null or a.id = any(p_antenne_ids)) and a.actif;
$function$;

-- 3) command_center_kpis — membres_actifs = LARGE + récence réelle last_seen 30j (défaut 3/B)
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
    'membres_actifs',       (select count(*) from prof where membre_statut <> 'visiteur' and public.membre_actif_30j(prof.id)),
    'dons_par_devise',      (select coalesce(jsonb_object_agg(upper(coalesce(devise,'XOF')), s), '{}'::jsonb)
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
