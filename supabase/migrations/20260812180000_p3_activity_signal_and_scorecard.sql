-- =============================================================================
-- P3 — ACTIVITY SIGNAL & ANTENNA SCORECARD (lot séparé de PR #3/#4/#5)
-- =============================================================================
-- Suite de la découverte P2 : profiles.derniere_connexion = COLONNE MORTE (0 write).
-- Vrai signal = analytics_sessions.last_seen. P3 traite les consommateurs RESTANTS.
-- 100% ADDITIF (CREATE OR REPLACE / nouvelles fonctions) ; aucune migration antérieure éditée.
--
-- PRIMITIVE CANONIQUE :
--   public.last_activity_at(uuid) = max(analytics_sessions.last_seen) — la VALEUR temporelle
--   (nécessaire quand il faut plusieurs seuils, ex. 30j ET 60j). Complète le booléen 30j
--   public.membre_actif_30j (P2) déjà en place.
--
-- P3-A aggregate_spiritual_health (LIVE /admin/global-command) : palier récence à 2 bornes
--   (60j inactif / 30j en_risque). derniere_connexion morte → tout le monde 'inactif'.
--   Fix : LEFT JOIN LATERAL max(last_seen) → act.last_seen. Bornes 30/60 INCHANGÉES.
--   never-seen (act.last_seen NULL) → branche is null → 'inactif' (identique à l'origine).
--   (LATERAL = 1 passe/membre, chemin annoncé « 50k+ ».)
--
-- P3-B prophetic_compute_snapshot (DORMANT) : v_actifs = COUNT membres actifs 30j.
--   Fix : derniere_connexion >= now()-30j → membre_actif_30j(id) (x3). Comptage positif :
--   never-seen non compté = correct. Fix P1 parcours_disciple_etape conservé.
--
-- P3-C membres_inactifs(p_days,p_limit) : NOUVELLE RPC pour la relance « membre inactif »
--   (cron/notifications). PostgREST ne peut filtrer sur une fonction → RPC serveur.
--   PORT FIDÈLE (b) : l'ancien .lt('derniere_connexion',cutoff) excluait mécaniquement les
--   never-seen (NULL < x = exclu). On reproduit via last_activity_at(id) < cutoff (NULL exclu).
--   ⚠ NE JAMAIS utiliser NOT membre_actif_30j (= flaguerait les never-seen = avalanche WP).
--   archived_at is null conservé ; borne + limit ; dédup géré côté route (inchangé).
-- =============================================================================

-- 0) Primitive canonique : dernier signe d'activité réel (max last_seen)
create or replace function public.last_activity_at(p_user_id uuid)
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select max(s.last_seen) from public.analytics_sessions s where s.user_id = p_user_id;
$$;
revoke all on function public.last_activity_at(uuid) from public;
grant execute on function public.last_activity_at(uuid) to service_role, authenticated;

-- 1) aggregate_spiritual_health — signal réel via LATERAL (défaut P3-A)
CREATE OR REPLACE FUNCTION public.aggregate_spiritual_health(p_scope text DEFAULT 'nation'::text, p_depuis interval DEFAULT '60 days'::interval)
 RETURNS TABLE(scope_ref text, scope_label text, effectif integer, n_tres_engage integer, n_engage integer, n_stable integer, n_a_suivre integer, n_en_risque integer, n_inactif integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with classified as (
    select
      case when p_scope = 'antenne' then m.antenne_slug else nullif(m.pays, '') end as zref,
      case when p_scope = 'antenne' then m.antenne_nom  else nullif(m.pays, '') end as zlabel,
      -- palier proxy serveur : récence prime, puis score d'engagement
      case
        when act.last_seen is null or act.last_seen < now() - interval '60 days' then 'inactif'
        when act.last_seen < now() - interval '30 days' then 'en_risque'
        when coalesce(p.score_engagement, 0) >= 60 then 'tres_engage'
        when coalesce(p.score_engagement, 0) >= 35 then 'engage'
        when coalesce(p.score_engagement, 0) >= 15 then 'stable'
        else 'a_suivre'
      end as niveau
    from public.v_health_zone_members m
    join public.profiles p on p.id = m.user_id
    left join lateral (
      select max(s.last_seen) as last_seen from public.analytics_sessions s where s.user_id = p.id
    ) act on true
    where (p.created_at is null or p.created_at <= now())
  )
  select
    zref, max(zlabel) as scope_label, count(*)::int as effectif,
    count(*) filter (where niveau = 'tres_engage')::int,
    count(*) filter (where niveau = 'engage')::int,
    count(*) filter (where niveau = 'stable')::int,
    count(*) filter (where niveau = 'a_suivre')::int,
    count(*) filter (where niveau = 'en_risque')::int,
    count(*) filter (where niveau = 'inactif')::int
  from classified
  where zref is not null
  group by zref;
$function$;

-- 2) prophetic_compute_snapshot — signal réel via membre_actif_30j (défaut P3-B)
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
      where antenne_id = p_scope_id::uuid and public.membre_actif_30j(id);
    select coalesce(sum(montant),0), count(*) into v_dons, v_dons_nb from public.dons
      where antenne_id = p_scope_id::uuid and statut = 'complete' and date_creation >= v_debut;  -- P0: dons.date_creation
    select nom into v_label from public.antennes where id = p_scope_id::uuid;
  elsif p_scope_type = 'nation' then
    select count(*) into v_membres from public.profiles where pays ilike p_scope_id;
    select count(*) into v_nouveaux from public.profiles where pays ilike p_scope_id and created_at >= v_debut;
    select count(*) into v_non_integres from public.profiles
      where pays ilike p_scope_id and created_at >= v_debut and coalesce(parcours_disciple_etape,0) = 0;
    select count(*) into v_actifs from public.profiles
      where pays ilike p_scope_id and public.membre_actif_30j(id);
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
    select count(*) into v_actifs from public.profiles where public.membre_actif_30j(id);
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

-- 3) membres_inactifs — liste des membres à relancer (port fidèle : never-seen EXCLUS) (P3-C)
create or replace function public.membres_inactifs(p_days integer default 30, p_limit integer default 200)
returns table(id uuid, prenom text, nom text)
language sql stable security definer set search_path = public
as $$
  select t.id, t.prenom, t.nom
  from (
    select p.id, p.prenom, p.nom, public.last_activity_at(p.id) as la
    from public.profiles p
    where p.archived_at is null
  ) t
  where t.la < now() - (p_days || ' days')::interval   -- la IS NULL (never-seen) → exclu (port fidèle)
  order by t.la asc
  limit greatest(coalesce(p_limit, 200), 0);
$$;
revoke all on function public.membres_inactifs(integer, integer) from public;
grant execute on function public.membres_inactifs(integer, integer) to service_role;

-- ── Durcissement (audit vague août) ──────────────────────────────────────
--   capture_world_snapshot & prophetic_compute_snapshot sont SECURITY DEFINER
--   et n'avaient AUCUN revoke depuis leur création en v5 (proacl NULL => EXECUTE
--   PUBLIC : anon/authenticated pouvaient déclencher des écritures de snapshots).
--   Redéfinies dans cette vague (p1/p3) → on ferme public/anon/authenticated.
--   Aucun appelant backend (0 .rpc dans src, 0 appel interne) → owner-only, pas de
--   grant service_role (cohérent avec les autres fonctions dormantes verrouillées).
revoke all on function public.capture_world_snapshot(date) from public, anon, authenticated;
revoke all on function public.prophetic_compute_snapshot(text, text, integer) from public, anon, authenticated;
