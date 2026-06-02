-- ============================================================================
-- OPTIMISATION P4 — Agrégation SET-BASED des signaux d'engagement par membre.
-- ----------------------------------------------------------------------------
-- Remplace, côté /api/admin/gouvernement, CINQ lectures de tables entières
-- ramenées dans Node (analytics_events ~40k, priere_demandes, inscriptions_
-- formation, event_registrations, dons) + les boucles JS d'agrégation, par UN
-- SEUL aller-retour : Postgres agrège, renvoie une ligne par membre.
--
-- Parité STRICTE avec l'ancien chemin JS (mêmes définitions) pour que le repli
-- applicatif produise des chiffres identiques :
--   - lives                = analytics_events.category = 'live'        (30 j)
--   - downloads            = type = 'download' OU category = 'pdf'      (30 j)
--   - prieres              = priere_demandes du membre
--   - prieres_sans_suivi   = assigned_to IS NULL ET statut « ouvert »
--   - formations           = inscriptions_formation du membre
--   - formations_abandonnees = statut = 'abandonne'
--   - events               = event_registrations du membre
--   - dons                 = dons statut = 'complete'
--
-- Additive & idempotente (CREATE OR REPLACE). Aucune donnée modifiée. Lecture
-- service role uniquement (security definer + grant explicite). Les signaux de
-- présence (connexions/durée/jours actifs) restent dérivés de analytics_sessions
-- côté route (réutilisés pour les visiteurs anonymes), donc hors de ce RPC.
-- ============================================================================

create or replace function public.pastoral_member_signals(p_pays text default null)
returns table (
  user_id                 uuid,
  lives                   bigint,
  downloads               bigint,
  prieres                 bigint,
  prieres_sans_suivi      bigint,
  formations              bigint,
  formations_abandonnees  bigint,
  events                  bigint,
  dons                    bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with ids as (
    select pr.id as user_id
    from public.profiles pr
    where p_pays is null or upper(pr.pays) = upper(p_pays)
  ),
  ev as (
    select e.user_id,
           count(*) filter (where e.category = 'live')                          as lives,
           count(*) filter (where e.type = 'download' or e.category = 'pdf')     as downloads
    from public.analytics_events e
    where e.user_id is not null
      and e.created_at >= now() - interval '30 days'
    group by e.user_id
  ),
  pr_agg as (
    select p.user_id,
           count(*)                                                             as prieres,
           count(*) filter (
             where p.assigned_to is null
               and lower(coalesce(p.statut, '')) in ('nouvelle','recue','en_cours','en_attente')
           )                                                                    as prieres_sans_suivi
    from public.priere_demandes p
    where p.user_id is not null
    group by p.user_id
  ),
  fo as (
    select f.user_id,
           count(*)                                                             as formations,
           count(*) filter (where lower(coalesce(f.statut, '')) = 'abandonne')  as formations_abandonnees
    from public.inscriptions_formation f
    where f.user_id is not null
    group by f.user_id
  ),
  reg as (
    select r.user_id, count(*) as events
    from public.event_registrations r
    where r.user_id is not null
    group by r.user_id
  ),
  dn as (
    select d.user_id, count(*) as dons
    from public.dons d
    where d.user_id is not null
      and lower(coalesce(d.statut, '')) = 'complete'
    group by d.user_id
  )
  select
    i.user_id,
    coalesce(ev.lives, 0),
    coalesce(ev.downloads, 0),
    coalesce(pr_agg.prieres, 0),
    coalesce(pr_agg.prieres_sans_suivi, 0),
    coalesce(fo.formations, 0),
    coalesce(fo.formations_abandonnees, 0),
    coalesce(reg.events, 0),
    coalesce(dn.dons, 0)
  from ids i
  left join ev     on ev.user_id     = i.user_id
  left join pr_agg on pr_agg.user_id = i.user_id
  left join fo     on fo.user_id     = i.user_id
  left join reg    on reg.user_id    = i.user_id
  left join dn     on dn.user_id     = i.user_id;
$$;

grant execute on function public.pastoral_member_signals(text) to service_role;
