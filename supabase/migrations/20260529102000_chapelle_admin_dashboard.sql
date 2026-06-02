-- =============================================================================
-- CHAPELLE — 20. Dashboard admin : RPC temps réel + vues d'appoint
-- =============================================================================
-- Objectif : alimenter le tableau de bord back-office (/admin/dashboard) avec
-- des données RÉELLES, agrégées, sans PII, pour une période (today | 7d | 30d).
--
-- Stratégie : une seule fonction `chapelle.admin_dashboard(p_range)` qui renvoie
-- un objet JSONB contenant tous les agrégats du dashboard (1 aller-retour =
-- "temps réel"). La couche TS (admin-live.ts) mappe ce JSON sur la forme d'UI
-- existante en réutilisant ses libellés/couleurs/drapeaux.
--
-- SECURITY DEFINER : interrogée via le service role (route /api/admin/data),
-- jamais exposée à l'anon. Aucune ligne nominative n'est renvoyée.
-- =============================================================================
set search_path = chapelle, public;

-- ----------------------------------------------------------------------------
-- Vues d'appoint (réutilisables / lisibles ; fenêtre 30 jours)
-- ----------------------------------------------------------------------------
create or replace view chapelle.v_admin_top_pages as
select path, count(*)::bigint as views
from chapelle.analytics_events
where event_type = 'page_view'
  and path is not null
  and occurred_at >= now() - interval '30 days'
group by path
order by views desc;

create or replace view chapelle.v_admin_countries as
select coalesce(nullif(metadata->>'country', ''), 'Inconnu') as pays,
       count(distinct session_id)::bigint as visiteurs
from chapelle.analytics_events
where event_type = 'page_view'
  and occurred_at >= now() - interval '30 days'
group by 1
order by visiteurs desc;

create or replace view chapelle.v_admin_button_clicks as
select coalesce(nullif(metadata->>'cta', ''), nullif(metadata->>'label', ''), 'autre') as cta,
       count(*)::bigint as clicks
from chapelle.analytics_events
where event_type = 'cta_click'
  and occurred_at >= now() - interval '30 days'
group by 1
order by clicks desc;

create or replace view chapelle.v_admin_member_progression as
select tunnel_stage::text as stage, count(*)::bigint as nb
from chapelle.members
group by tunnel_stage;

-- ----------------------------------------------------------------------------
-- RPC principale : tous les agrégats du dashboard pour une période
-- ----------------------------------------------------------------------------
create or replace function chapelle.admin_dashboard(p_range text default '7d')
returns jsonb
language plpgsql
stable
security definer
set search_path = chapelle, public, pg_temp
as $$
declare
  v_from       timestamptz;   -- début de la fenêtre demandée
  v_from_trunc timestamptz;   -- début arrondi (pour les buckets de tendance)
  v_step       interval;      -- granularité de la tendance
  v_fmt        text;          -- format de libellé des buckets
  j            jsonb;
begin
  if p_range = 'today' then
    v_from       := date_trunc('day', now());
    v_from_trunc := v_from;
    v_step       := interval '1 hour';
    v_fmt        := 'HH24"h"';
  elsif p_range = '30d' then
    v_from       := now() - interval '29 days';
    v_from_trunc := date_trunc('day', v_from);
    v_step       := interval '1 day';
    v_fmt        := 'DD/MM';
  else -- '7d' par défaut
    v_from       := now() - interval '6 days';
    v_from_trunc := date_trunc('day', v_from);
    v_step       := interval '1 day';
    v_fmt        := 'DD/MM';
  end if;

  select jsonb_build_object(
    'range', p_range,

    -- KPI -------------------------------------------------------------------
    'visiteurs_today', (
      select count(distinct session_id) from chapelle.analytics_events
      where event_type = 'page_view' and occurred_at >= date_trunc('day', now())),
    'visiteurs_semaine', (
      select count(distinct session_id) from chapelle.analytics_events
      where event_type = 'page_view' and occurred_at >= now() - interval '7 days'),
    'visiteurs_periode', (
      select count(distinct session_id) from chapelle.analytics_events
      where event_type = 'page_view' and occurred_at >= v_from),
    'inscriptions', (
      select count(*) from chapelle.members where created_at >= v_from),
    'formulaires', (
      select count(*) from chapelle.form_submissions where created_at >= v_from),
    'demandes_priere', (
      select count(*) from chapelle.prayer_requests where statut in ('nouvelle', 'en_cours')),
    'nouveaux_membres', (
      select count(*) from chapelle.members
      where tunnel_stage in ('membre', 'serviteur', 'leader') and created_at >= v_from),
    'dons', (
      select coalesce(sum(montant), 0) from chapelle.donations
      where statut_paiement = 'reussi' and donne_le >= v_from),
    'formations_commencees', (
      select count(*) from chapelle.cfic_inscriptions
      where statut in ('inscrit', 'en_cours', 'termine', 'certifie') and inscrit_le >= v_from),

    -- Listes / graphes ------------------------------------------------------
    'top_pages', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select path, count(*) as views from chapelle.analytics_events
        where event_type = 'page_view' and occurred_at >= v_from and path is not null
        group by path order by count(*) desc limit 8) t),
    'pays', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select coalesce(nullif(metadata->>'country', ''), 'Inconnu') as pays,
               count(distinct session_id) as visiteurs
        from chapelle.analytics_events
        where event_type = 'page_view' and occurred_at >= v_from
        group by 1 order by 2 desc limit 6) t),
    'clics', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select coalesce(nullif(metadata->>'cta', ''), nullif(metadata->>'label', ''), 'autre') as cta,
               count(*) as clicks
        from chapelle.analytics_events
        where event_type = 'cta_click' and occurred_at >= v_from
        group by 1 order by 2 desc limit 8) t),
    'tunnel', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select stage_courant::text as stage, count(*) as nb
        from chapelle.integration_journeys group by 1) t),
    'progression', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select tunnel_stage::text as stage, count(*) as nb
        from chapelle.members group by 1) t),
    'tendance', (
      select coalesce(jsonb_agg(x order by x.bucket), '[]'::jsonb) from (
        select b.bucket,
          to_char(b.bucket, v_fmt) as label,
          (select count(distinct session_id) from chapelle.analytics_events e
             where e.event_type = 'page_view'
               and e.occurred_at >= b.bucket and e.occurred_at < b.bucket + v_step) as visiteurs,
          (select count(*) from chapelle.members m
             where m.created_at >= b.bucket and m.created_at < b.bucket + v_step) as inscriptions
        from generate_series(v_from_trunc, now(), v_step) as b(bucket)
      ) x)
  ) into j;

  return j;
end;
$$;

comment on function chapelle.admin_dashboard(text) is
  'Agrégats temps réel du tableau de bord admin pour une période (today|7d|30d). Aucune PII.';
