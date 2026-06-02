-- ============================================================================
-- V5 — CENTRE DE COMMANDEMENT APOSTOLIQUE GLOBAL (fondation consolidée)
-- ----------------------------------------------------------------------------
-- Couche d'INTELLIGENCE & d'ORCHESTRATION MONDIALE au-dessus de V4. Une console
-- mondiale : voir, comprendre, anticiper, alerter, décider — à travers nations
-- et antennes. 9 capacités : gouvernement par antenne, vision mondiale, santé
-- spirituelle mondiale, croissance mondiale, finances mondiales, IA pastorale
-- prédictive, alertes prophétiques, centre de crise, centre missionnaire.
--
-- Idempotent & additif. RÉUTILISE V4 + l'existant (profiles, antennes, dons,
-- prayer_center, marketplace, analytics, pastoral-intelligence). Ne recrée RIEN.
-- Tout calcul sensible = service role ; portée imposée côté serveur.
-- Chaque section est self-contained (fonctions sur tables de base/V4).
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════
-- SECTION : Gouvernement par antenne
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================================
-- 20260603200000_gouvernement_antennes.sql  (> 20260603100000 réservé V4)
-- V5 — GOUVERNEMENT PAR ANTENNE : objectifs/jalons, conseil, scorecard, alertes.
-- ADDITIF & IDEMPOTENT. Réutilise antennes, antenne_responsables, profiles.antenne_id,
-- antenne_descendants(), antenne_stats_agg(), discipulat_overview(), mahanaim_cockpit().
-- Écriture = service role. Devise = devise LOCALE de l'antenne. Commentaires FR.
-- ============================================================================

-- A. CONSEIL / ÉQUIPE DE GOUVERNANCE D'ANTENNE (complète antenne_responsables=lead)
create table if not exists public.antenne_conseil (
  id          uuid        primary key default gen_random_uuid(),
  antenne_id  uuid        not null references public.antennes(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  fonction    text        not null default 'conseiller',   -- tresorier|secretaire|intercession|discipulat|...
  mandat_debut date,
  mandat_fin   date,
  actif       boolean     not null default true,
  created_at  timestamptz not null default now(),
  unique (antenne_id, user_id, fonction)
);
create index if not exists idx_conseil_antenne on public.antenne_conseil (antenne_id, actif);
create index if not exists idx_conseil_user    on public.antenne_conseil (user_id);
alter table public.antenne_conseil enable row level security;
drop policy if exists conseil_select_own on public.antenne_conseil;
create policy conseil_select_own on public.antenne_conseil for select
  to authenticated using (user_id = auth.uid());
-- Écriture : service role.

-- B. OBJECTIFS / JALONS DATÉS PAR ANTENNE (redevabilité)
create table if not exists public.antenne_objectifs (
  id           uuid        primary key default gen_random_uuid(),
  antenne_id   uuid        not null references public.antennes(id) on delete cascade,
  pilier       text        not null,    -- membres|croissance|finances|intercession|discipulat|fidelite
  metrique     text        not null,    -- ex: membres_actifs, nouveaux_30j, dons_total, etapes_validees
  libelle      text        not null,
  cible        numeric     not null,
  valeur_actuelle numeric  not null default 0,    -- snapshot écrit par le cron (jamais inventé)
  periode      text        not null default 'mensuel',  -- mensuel|trimestriel|annuel
  echeance     date,
  proprietaire_id uuid     references public.profiles(id) on delete set null,  -- redevable
  statut       text        not null default 'en_cours', -- en_cours|atteint|en_retard|annule|non_mesure
  actif        boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_obj_antenne   on public.antenne_objectifs (antenne_id, actif);
create index if not exists idx_obj_echeance  on public.antenne_objectifs (echeance) where actif and statut = 'en_cours';
create index if not exists idx_obj_owner     on public.antenne_objectifs (proprietaire_id);
alter table public.antenne_objectifs enable row level security;
drop policy if exists obj_select_owner on public.antenne_objectifs;
create policy obj_select_owner on public.antenne_objectifs for select
  to authenticated using (proprietaire_id = auth.uid());
-- Écriture : service role.

-- C. SNAPSHOTS DE SCORECARD (trend + comparaison sans recalcul live)
create table if not exists public.antenne_scorecard_snapshots (
  id            uuid        primary key default gen_random_uuid(),
  antenne_id    uuid        not null references public.antennes(id) on delete cascade,
  jour          date        not null default current_date,
  score_global  integer     not null default 0,         -- 0-100
  piliers       jsonb       not null default '{}'::jsonb,-- {membres:int, croissance:int, finances:int, intercession:int, discipulat:int, fidelite:int}
  membres       integer     not null default 0,
  membres_actifs integer    not null default 0,
  nouveaux_30j  integer     not null default 0,
  dons_par_devise jsonb     not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (antenne_id, jour)
);
create index if not exists idx_scorecard_antenne on public.antenne_scorecard_snapshots (antenne_id, jour desc);
create index if not exists idx_scorecard_jour    on public.antenne_scorecard_snapshots (jour desc);
alter table public.antenne_scorecard_snapshots enable row level security;
-- Aucune policy : agrégat de gouvernance sensible → service role uniquement.

-- D. ALERTES DE GOUVERNANCE MATÉRIALISÉES (mur d'alertes mondial)
create table if not exists public.antenne_alertes (
  id          uuid        primary key default gen_random_uuid(),
  antenne_id  uuid        not null references public.antennes(id) on delete cascade,
  type        text        not null,   -- sans_responsable|objectif_en_retard|pilier_en_chute|antenne_inactive
  severite    text        not null default 'moyenne', -- haute|moyenne|info
  detail      text        not null,
  resolue     boolean     not null default false,
  created_at  timestamptz not null default now(),
  unique (antenne_id, type)
);
create index if not exists idx_antalertes_open on public.antenne_alertes (severite, created_at desc) where resolue = false;
alter table public.antenne_alertes enable row level security;
-- Aucune policy : service role uniquement.

-- E. RPC D'AGRÉGATION GOUVERNANCE PAR ANTENNE (1 aller-retour, set-based)
--    Réutilise la logique antenne_stats_agg + actifs 30j + discipulat + intercession.
create or replace function public.antenne_governance_agg(p_antenne_ids uuid[])
returns table (
  antenne_id uuid, nom text, pays text, devise text, parent_id uuid,
  membres bigint, membres_actifs bigint, nouveaux_30j bigint, nouveaux_90j bigint,
  responsables bigint, conseil bigint,
  prieres bigint, prieres_attente bigint,
  formations bigint, formations_actives bigint,
  evenements bigint,
  disciples_actifs bigint, etapes_validees_30j bigint,
  dons_count bigint, dons_par_devise jsonb,
  objectifs_total bigint, objectifs_atteints bigint, objectifs_en_retard bigint
)
language sql stable security definer set search_path = public as $$
  select
    a.id, a.nom, a.pays, coalesce(a.devise,'FCFA'), a.parent_id,
    (select count(*) from public.profiles p where p.antenne_id = a.id and p.membre_statut in ('membre','fidele','actif')),
    (select count(*) from public.profiles p where p.antenne_id = a.id and p.membre_statut in ('membre','fidele','actif')
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
$$;
revoke all on function public.antenne_governance_agg(uuid[]) from public, anon, authenticated;

-- F. CRON : recalcule statut des objectifs (jamais de valeur inventée → 'non_mesure'
--    si la métrique n'a pas de signal), pose les alertes, écrit les snapshots.
create or replace function public.antenne_scorecard_refresh()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  -- 1) Objectifs en retard (échéance passée, non atteint).
  update public.antenne_objectifs
     set statut = 'en_retard', updated_at = now()
   where actif and statut = 'en_cours' and echeance is not null and echeance < current_date
     and (cible is null or valeur_actuelle < cible);
  update public.antenne_objectifs
     set statut = 'atteint', updated_at = now()
   where actif and statut in ('en_cours','en_retard') and cible is not null and valeur_actuelle >= cible;

  -- 2) Snapshot scorecard par antenne (réutilise l'agrégat).
  for r in select * from public.antenne_governance_agg(
             (select array_agg(id) from public.antennes where actif)) loop
    insert into public.antenne_scorecard_snapshots
      (antenne_id, jour, score_global, piliers, membres, membres_actifs, nouveaux_30j, dons_par_devise)
    values (
      r.antenne_id, current_date,
      -- score global = moyenne pondérée bornée 0-100 (calcul SQL miroir de la lib pure)
      least(100, greatest(0, round(
        (case when r.membres > 0 then least(100, round(r.membres_actifs::numeric / nullif(r.membres,0) * 100)) else 0 end) * 0.25
      + least(100, r.nouveaux_30j * 10) * 0.20
      + (case when r.dons_count > 0 then 100 else 0 end) * 0.15
      + least(100, (r.prieres - r.prieres_attente)::numeric) * 0.10
      + least(100, r.etapes_validees_30j * 12) * 0.15
      + least(100, r.evenements * 8) * 0.15
      )))::int,
      jsonb_build_object(
        'membres', case when r.membres > 0 then least(100, round(r.membres_actifs::numeric / nullif(r.membres,0) * 100)) else 0 end,
        'croissance', least(100, r.nouveaux_30j * 10),
        'finances', case when r.dons_count > 0 then 100 else 0 end,
        'intercession', least(100, (r.prieres - r.prieres_attente)),
        'discipulat', least(100, r.etapes_validees_30j * 12),
        'fidelite', least(100, r.evenements * 8)),
      r.membres, r.membres_actifs, r.nouveaux_30j, r.dons_par_devise
    )
    on conflict (antenne_id, jour) do update set
      score_global = excluded.score_global, piliers = excluded.piliers,
      membres = excluded.membres, membres_actifs = excluded.membres_actifs,
      nouveaux_30j = excluded.nouveaux_30j, dons_par_devise = excluded.dons_par_devise;

    -- 3) Alertes de gouvernance.
    if r.responsables = 0 then
      insert into public.antenne_alertes (antenne_id, type, severite, detail)
      values (r.antenne_id, 'sans_responsable', 'haute', r.nom || ' n''a aucun responsable actif.')
      on conflict (antenne_id, type) do update set resolue = false, detail = excluded.detail, created_at = now();
    else
      update public.antenne_alertes set resolue = true where antenne_id = r.antenne_id and type = 'sans_responsable' and not resolue;
    end if;

    if r.membres > 5 and r.membres_actifs::numeric / nullif(r.membres,0) < 0.30 then
      insert into public.antenne_alertes (antenne_id, type, severite, detail)
      values (r.antenne_id, 'antenne_inactive', 'haute',
              r.nom || ' : moins de 30% de membres actifs (' || r.membres_actifs || '/' || r.membres || ').')
      on conflict (antenne_id, type) do update set resolue = false, detail = excluded.detail, created_at = now();
    else
      update public.antenne_alertes set resolue = true where antenne_id = r.antenne_id and type = 'antenne_inactive' and not resolue;
    end if;

    if r.objectifs_en_retard > 0 then
      insert into public.antenne_alertes (antenne_id, type, severite, detail)
      values (r.antenne_id, 'objectif_en_retard', 'moyenne', r.objectifs_en_retard || ' objectif(s) en retard.')
      on conflict (antenne_id, type) do update set resolue = false, detail = excluded.detail, created_at = now();
    else
      update public.antenne_alertes set resolue = true where antenne_id = r.antenne_id and type = 'objectif_en_retard' and not resolue;
    end if;
  end loop;
end;
$$;
revoke all on function public.antenne_scorecard_refresh() from public, anon, authenticated;
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════
-- SECTION : VISION MONDIALE DE L'ŒUVRE
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================================
-- V5 — VISION MONDIALE DE L'ŒUVRE
-- Snapshots quotidiens (tendances historiques) + RPC d'agrégation mondiale.
-- Additif & idempotent. Réutilise profiles, antennes, dons, priere_demandes,
-- inscriptions_formation, delivrance_demandes. NE RECRÉE RIEN d'existant.
-- Timestamp > 20260603200000 (réservé V5).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table de snapshots quotidiens (la seule source historique fiable)
--    scope_type : 'monde' | 'pays' | 'antenne' ; scope_key : '*' | code pays | antenne_id
-- ----------------------------------------------------------------------------
create table if not exists public.world_daily_snapshots (
  id            uuid        primary key default gen_random_uuid(),
  snapshot_date date        not null default current_date,
  scope_type    text        not null,                 -- 'monde' | 'pays' | 'antenne'
  scope_key     text        not null,                 -- '*', code pays, ou antenne_id::text
  scope_label   text,                                 -- libellé lisible (nom antenne, pays)
  pays          text,                                 -- pays du scope (pour la carte)
  inscrits      integer     not null default 0,
  membres       integer     not null default 0,
  disciples     integer     not null default 0,
  leaders       integer     not null default 0,
  responsables  integer     not null default 0,
  nouveaux_30j  integer     not null default 0,
  ames          integer     not null default 0,        -- demandes de délivrance/cure (comptage seul)
  prieres       integer     not null default 0,
  formations    integer     not null default 0,
  evenements    integer     not null default 0,
  dons_count    integer     not null default 0,
  dons_total    numeric(14,2) not null default 0,      -- somme brute (devises mêlées, normalisée côté UI)
  antennes      integer     not null default 0,
  created_at    timestamptz not null default now()
);
-- Une seule photo par jour et par scope (cron rejouable).
create unique index if not exists uq_world_snap_day_scope
  on public.world_daily_snapshots (snapshot_date, scope_type, scope_key);
create index if not exists idx_world_snap_scope_date
  on public.world_daily_snapshots (scope_type, scope_key, snapshot_date desc);
create index if not exists idx_world_snap_date on public.world_daily_snapshots (snapshot_date desc);

alter table public.world_daily_snapshots enable row level security;
-- Données stratégiques agrégées : AUCUNE policy → service role uniquement.
comment on table public.world_daily_snapshots is
  'V5 Vision mondiale : photo quotidienne agrégée par monde/pays/antenne pour les tendances. Service role only.';

-- ----------------------------------------------------------------------------
-- 2. RPC : agrégat mondial VIVANT (temps réel) en 1 aller-retour, par scope.
--    p_scope_type 'monde' (def) | 'pays' | 'antenne' ; p_scope_key filtre.
--    SECURITY DEFINER : appelée par le service role uniquement (jamais anon).
-- ----------------------------------------------------------------------------
create or replace function public.world_overview(
  p_scope_type text default 'monde',
  p_scope_key  text default '*'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
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
           count(*) filter (where p.membre_statut in ('membre','fidele','actif')) as membres,
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
        'membres',      (select count(*) from prof where membre_statut in ('membre','fidele','actif')),
        'responsables', (select count(*) from prof where role in
                          ('super_admin','nation_pastor','platform_admin','pasteur','coordinateur','responsable_integration','responsable_mahanaim','formateur')),
        'leaders',      (select count(*) from prof where role in ('super_admin','nation_pastor','pasteur','coordinateur','leader','berger')),
        'disciples',    (select count(*) from prof where parcours_etape >= 5 or membre_statut = 'disciple'),
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
                  and p.membre_statut in ('membre','fidele','actif')) as membres
        from public.antennes a
        where a.actif = true and (v_ant is null or a.id = v_ant)
        limit 200
      ) t
    ),
    'generated_at', now()
  ) into j;
  return j;
end;
$$;
comment on function public.world_overview(text, text) is
  'V5 : agrégat mondial vivant (monde|pays|antenne) en 1 aller-retour. Aucune PII. Service role.';

-- ----------------------------------------------------------------------------
-- 3. RPC : capture d'un snapshot quotidien (toutes dimensions). Idempotent.
--    Insère/upsert 1 ligne monde + 1 par pays + 1 par antenne pour current_date.
-- ----------------------------------------------------------------------------
create or replace function public.capture_world_snapshot(p_date date default current_date)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare n integer := 0;
begin
  -- MONDE
  insert into public.world_daily_snapshots
    (snapshot_date, scope_type, scope_key, scope_label, pays,
     inscrits, membres, disciples, leaders, responsables, nouveaux_30j,
     ames, prieres, formations, evenements, dons_count, dons_total, antennes)
  select p_date, 'monde', '*', 'Monde', null,
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where membre_statut in ('membre','fidele','actif')),
    (select count(*) from public.profiles where parcours_etape >= 5 or membre_statut='disciple'),
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
           count(*) filter (where membre_statut in ('membre','fidele','actif')) as membres,
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
    (select count(*) from public.profiles p where p.antenne_id=a.id and p.membre_statut in ('membre','fidele','actif')),
    (select count(*) from public.dons d where d.antenne_id=a.id and d.statut='complete'),
    (select coalesce(sum(d.montant),0) from public.dons d where d.antenne_id=a.id and d.statut='complete')
  from public.antennes a where a.actif=true
  on conflict (snapshot_date, scope_type, scope_key) do update set
    inscrits=excluded.inscrits, membres=excluded.membres,
    dons_count=excluded.dons_count, dons_total=excluded.dons_total;

  return n;
end;
$$;
comment on function public.capture_world_snapshot(date) is
  'V5 : capture quotidienne idempotente des agrégats monde/pays/antenne. Cron quotidien.';


-- ════════════════════════════════════════════════════════════════════════
-- SECTION : INTELLIGENCE PASTORALE PRÉDICTIVE MONDIALE
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================================
-- V5 — INTELLIGENCE PASTORALE PRÉDICTIVE (feature store + snapshots + agrégats)
-- ----------------------------------------------------------------------------
-- Additif & idempotent. Calculs CÔTÉ SERVEUR uniquement (service role).
-- Persiste les prédictions explicables par membre (snapshot quotidien) pour
-- tenir l'échelle (dizaines de milliers de membres, multi-pays/antennes).
-- AUCUN contenu sensible (jamais le texte d'une prière) — uniquement des scores
-- et des agrégats de signaux. Devise FCFA. Réutilise profiles/antennes.
-- ============================================================================

-- ── Feature store léger : signaux numériques figés par membre & par jour ──
create table if not exists public.member_feature_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  snapshot_date   date        not null default current_date,
  pays            text,
  antenne_id      uuid        references public.antennes(id) on delete set null,
  -- features réelles (issues de MemberIntel)
  connexions      integer     not null default 0,
  active_days_30  integer     not null default 0,
  total_duration  integer     not null default 0,   -- secondes
  prieres         integer     not null default 0,
  formations      integer     not null default 0,
  formations_term integer     not null default 0,
  lives           integer     not null default 0,
  downloads       integer     not null default 0,
  events          integer     not null default 0,
  dons            integer     not null default 0,
  jours_inactif   integer,                            -- null = aucune activité connue
  age_compte_j    integer     not null default 0,
  parcours_etape  integer     not null default 0,
  created_at      timestamptz not null default now(),
  unique (user_id, snapshot_date)
);
create index if not exists idx_feat_snap_date on public.member_feature_snapshots (snapshot_date desc);
create index if not exists idx_feat_snap_antenne on public.member_feature_snapshots (antenne_id);
create index if not exists idx_feat_snap_pays on public.member_feature_snapshots (pays);

-- ── Snapshot des prédictions explicables par membre ──
create table if not exists public.member_prediction_snapshots (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  snapshot_date     date        not null default current_date,
  pays              text,
  antenne_id        uuid        references public.antennes(id) on delete set null,
  conversion_stage  text,                                   -- visiteur..leader
  engagement_level  text,                                   -- 6 paliers
  -- 4 prédictions (score 0-100 + niveau faible|moyen|eleve|critique)
  churn_score       integer     not null default 0,
  churn_niveau      text        not null default 'faible',
  giving_score      integer     not null default 0,         -- propension au don
  giving_niveau     text        not null default 'faible',
  readiness_score   integer     not null default 0,         -- prêt-à-servir
  readiness_niveau  text        not null default 'faible',
  next_best_action  text,                                   -- code action pastorale
  facteurs          jsonb       not null default '[]'::jsonb, -- explications (texte)
  created_at        timestamptz not null default now(),
  unique (user_id, snapshot_date)
);
create index if not exists idx_pred_snap_date on public.member_prediction_snapshots (snapshot_date desc);
create index if not exists idx_pred_snap_antenne on public.member_prediction_snapshots (antenne_id);
create index if not exists idx_pred_snap_pays on public.member_prediction_snapshots (pays);
create index if not exists idx_pred_snap_churn on public.member_prediction_snapshots (snapshot_date, churn_niveau);
create index if not exists idx_pred_snap_action on public.member_prediction_snapshots (snapshot_date, next_best_action);

-- ── Prévision de croissance par antenne / nation (snapshot agrégé) ──
create table if not exists public.antenne_growth_snapshots (
  id                  uuid        primary key default gen_random_uuid(),
  snapshot_date       date        not null default current_date,
  scope_type          text        not null default 'antenne', -- antenne | pays | global
  scope_key           text        not null,                   -- antenne_id | code pays | 'GLOBAL'
  pays                text,
  membres_total       integer     not null default 0,
  nouveaux_30j        integer     not null default 0,
  nouveaux_90j        integer     not null default 0,
  retention_30j_pct   integer     not null default 0,         -- % actifs sur 30j
  forecast_30j        integer     not null default 0,         -- nouveaux membres projetés
  forecast_90j        integer     not null default 0,
  forecast_niveau     text        not null default 'stable',  -- croissance|stable|declin
  created_at          timestamptz not null default now(),
  unique (snapshot_date, scope_type, scope_key)
);
create index if not exists idx_growth_snap_date on public.antenne_growth_snapshots (snapshot_date desc);
create index if not exists idx_growth_snap_scope on public.antenne_growth_snapshots (scope_type, scope_key);

-- ── RLS : aucune lecture client (service role only, données pastorales sensibles) ──
alter table public.member_feature_snapshots    enable row level security;
alter table public.member_prediction_snapshots enable row level security;
alter table public.antenne_growth_snapshots    enable row level security;
-- Aucune policy : accès réservé au service role via supabaseAdmin (back-office, portée par rôle en API).

-- ── Vue d'agrégation : compteurs prédictifs du DERNIER snapshot, par antenne ──
create or replace view public.v_predictions_latest as
select * from public.member_prediction_snapshots s
where s.snapshot_date = (select max(snapshot_date) from public.member_prediction_snapshots);

-- ── RPC d'agrégation scopée (compteurs par niveau, sans charger tous les membres) ──
-- p_antenne / p_pays : null = pas de filtre (super_admin global).
create or replace function public.predictions_aggregate(p_antenne uuid default null, p_pays text default null)
returns table (
  total              bigint,
  churn_critique     bigint,
  churn_eleve        bigint,
  giving_eleve       bigint,   -- score don eleve|critique
  readiness_eleve    bigint,   -- prêt-à-servir eleve|critique
  suivi_prioritaire  bigint    -- next_best_action != observation
)
language sql
security definer
set search_path = public
as $$
  select
    count(*)                                                              as total,
    count(*) filter (where churn_niveau = 'critique')                    as churn_critique,
    count(*) filter (where churn_niveau = 'eleve')                       as churn_eleve,
    count(*) filter (where giving_niveau in ('eleve','critique'))        as giving_eleve,
    count(*) filter (where readiness_niveau in ('eleve','critique'))     as readiness_eleve,
    count(*) filter (where next_best_action is not null
                       and next_best_action <> 'observation')            as suivi_prioritaire
  from public.v_predictions_latest v
  where (p_antenne is null or v.antenne_id = p_antenne)
    and (p_pays    is null or upper(v.pays) = upper(p_pays));
$$;
revoke all on function public.predictions_aggregate(uuid, text) from public, anon, authenticated;
-- Appel réservé au service role (API admin scopée).


-- ════════════════════════════════════════════════════════════════════════
-- SECTION : Santé spirituelle mondiale
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================================
-- V5 — SANTÉ SPIRITUELLE MONDIALE (indice agrégé, snapshots, détection de déclin)
-- ----------------------------------------------------------------------------
-- Couche d'intelligence du Centre de Commandement Apostolique GLOBAL.
-- Dérive l'indice de la distribution des paliers d'engagement (pastoral-intelligence).
-- Additif & idempotent. Réutilise antennes / profiles.antenne_id. RLS : service role.
-- Timestamp réservé V5 (> 20260603200000).
-- ============================================================================

-- 1) CONFIG : pondération des paliers d'engagement (0-100 par palier) + seuils.
--    Modifiable en back-office sans redéploiement. Une ligne unique par scope_type
--    (global par défaut ; surcharge possible par antenne/nation au cycle suivant).
create table if not exists public.spiritual_health_config (
  id              uuid        primary key default gen_random_uuid(),
  scope_type      text        not null default 'global',   -- global | nation | antenne
  scope_ref       text,                                     -- code pays / slug antenne (null = global)
  -- poids 0..100 attribués à chaque palier d'engagement (sert de note pondérée)
  w_tres_engage   smallint    not null default 100,
  w_engage        smallint    not null default 80,
  w_stable        smallint    not null default 60,
  w_a_suivre      smallint    not null default 40,
  w_en_risque     smallint    not null default 15,
  w_inactif       smallint    not null default 0,
  -- seuils de bande de santé (indice 0-100)
  seuil_florissant smallint   not null default 75,
  seuil_sain       smallint   not null default 60,
  seuil_fragile    smallint   not null default 45,
  seuil_declin     smallint   not null default 30,
  -- déclin : chute min. d'indice (pts) vs snapshot précédent pour alerter
  declin_chute_pts smallint   not null default 8,
  -- déclin : part max. tolérée d'inactifs+en_risque (%) avant alerte
  declin_part_max  smallint   not null default 35,
  taille_min_zone  smallint   not null default 5,           -- évite le bruit sur micro-zones
  actif           boolean     not null default true,
  created_at      timestamptz not null default now(),
  unique (scope_type, scope_ref)
);
alter table public.spiritual_health_config enable row level security;
-- Aucune policy : lecture/écriture service role uniquement (configuration sensible).
insert into public.spiritual_health_config (scope_type, scope_ref) values ('global', null)
on conflict (scope_type, scope_ref) do nothing;

-- 2) SNAPSHOTS : indice + distribution figés par zone et par période (tendance).
--    Granularité = jour (un snapshot/zone/jour via unique). Source de la sparkline.
create table if not exists public.spiritual_health_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  scope_type      text        not null,                     -- monde | nation | antenne
  scope_ref       text,                                     -- null=monde ; pays ; slug antenne
  scope_label     text,                                     -- libellé lisible (nom antenne / pays)
  snapshot_date   date        not null default current_date,
  indice          smallint    not null,                     -- 0-100
  bande           text        not null,                     -- florissant|sain|fragile|declin|critique
  effectif        integer     not null default 0,           -- membres pris en compte
  -- distribution des 6 paliers (counts)
  n_tres_engage   integer     not null default 0,
  n_engage        integer     not null default 0,
  n_stable        integer     not null default 0,
  n_a_suivre      integer     not null default 0,
  n_en_risque     integer     not null default 0,
  n_inactif       integer     not null default 0,
  alertes_total   integer     not null default 0,
  alertes_hautes  integer     not null default 0,
  meta            jsonb       not null default '{}'::jsonb,  -- stages, sous-zones, etc.
  created_at      timestamptz not null default now(),
  unique (scope_type, scope_ref, snapshot_date)
);
create index if not exists idx_shs_scope_date on public.spiritual_health_snapshots (scope_type, scope_ref, snapshot_date desc);
create index if not exists idx_shs_date on public.spiritual_health_snapshots (snapshot_date desc);
alter table public.spiritual_health_snapshots enable row level security;
-- Lecture des AGRÉGATS (non nominatifs) autorisée aux responsables authentifiés ;
-- la portée fine reste imposée par l'API. Écriture = service role (cron).
drop policy if exists shs_read on public.spiritual_health_snapshots;
create policy shs_read on public.spiritual_health_snapshots for select to authenticated using (true);

-- 3) ALERTES DE ZONE : déclin détecté automatiquement au moment du snapshot.
create table if not exists public.spiritual_health_alerts (
  id              uuid        primary key default gen_random_uuid(),
  scope_type      text        not null,                     -- nation | antenne | monde
  scope_ref       text,
  scope_label     text,
  type            text        not null,                     -- chute_indice | part_inactifs | alertes_massives
  severite        text        not null default 'haute',     -- haute | moyenne | info
  indice          smallint,
  indice_precedent smallint,
  delta_pts       smallint,
  detail          text,
  resolu          boolean     not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_sha_open on public.spiritual_health_alerts (resolu, created_at desc);
create index if not exists idx_sha_scope on public.spiritual_health_alerts (scope_type, scope_ref);
alter table public.spiritual_health_alerts enable row level security;
-- Aucune policy : service role uniquement (l'API filtre la portée par rôle).

-- 4) VUE : membres rattachés à une antenne/pays (clé d'agrégation, non nominatif au-delà de l'id).
create or replace view public.v_health_zone_members as
select
  p.id            as user_id,
  p.antenne_id,
  a.slug          as antenne_slug,
  a.nom           as antenne_nom,
  upper(coalesce(p.pays, ''))                as pays,
  coalesce(a.parent_id::text, a.id::text)    as zone_parent
from public.profiles p
left join public.antennes a on a.id = p.antenne_id;

-- 5) RPC : agrégation des paliers d'engagement DÉLÉGUÉE à Postgres (scalabilité 50k+).
--    Postgres calcule un "palier proxy" rapide depuis score_engagement + derniere_connexion
--    pour les rollups massifs ; l'API recalcule l'indice fin (PUR) sur l'échantillon piloté.
--    Retour : une ligne par zone avec la distribution des paliers.
create or replace function public.aggregate_spiritual_health(p_scope text default 'nation', p_depuis interval default interval '60 days')
returns table (
  scope_ref text, scope_label text, effectif integer,
  n_tres_engage integer, n_engage integer, n_stable integer,
  n_a_suivre integer, n_en_risque integer, n_inactif integer
)
language sql stable security definer set search_path = public as $$
  with classified as (
    select
      case when p_scope = 'antenne' then m.antenne_slug else nullif(m.pays, '') end as zref,
      case when p_scope = 'antenne' then m.antenne_nom  else nullif(m.pays, '') end as zlabel,
      -- palier proxy serveur : récence prime, puis score d'engagement
      case
        when p.derniere_connexion is null or p.derniere_connexion < now() - interval '60 days' then 'inactif'
        when p.derniere_connexion < now() - interval '30 days' then 'en_risque'
        when coalesce(p.score_engagement, 0) >= 60 then 'tres_engage'
        when coalesce(p.score_engagement, 0) >= 35 then 'engage'
        when coalesce(p.score_engagement, 0) >= 15 then 'stable'
        else 'a_suivre'
      end as niveau
    from public.v_health_zone_members m
    join public.profiles p on p.id = m.user_id
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
$$;


-- ════════════════════════════════════════════════════════════════════════
-- SECTION : CROISSANCE MONDIALE
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================================
-- V5 — CROISSANCE MONDIALE : snapshots, cohortes, alertes, config + RPC
-- ----------------------------------------------------------------------------
-- Couche d'intelligence GLOBALE au-dessus de V4. Memorise l'historique de
-- croissance (photo quotidienne par scope), les cohortes de retention, et
-- materialise les alertes de croissance. Reutilise profiles / antennes /
-- analytics_sessions / conversionStage (cote app). Additif & idempotent.
-- Ecriture = service role uniquement. Aucune PII : uniquement des comptages.
-- ============================================================================

-- 1) SNAPSHOTS — une photo de croissance par jour et par scope -----------------
create table if not exists public.growth_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  snapshot_date   date        not null,
  scope           text        not null default 'global',     -- global | nation | antenne
  scope_key       text        not null default 'ALL',        -- 'ALL' | code pays | antenne_id::text
  -- Comptages d'entree
  total_profils   integer     not null default 0,
  nouveaux_jour   integer     not null default 0,            -- crees ce jour
  nouveaux_7j     integer     not null default 0,
  nouveaux_30j    integer     not null default 0,
  actifs_30j      integer     not null default 0,            -- vus (session) sur 30j
  retenus_30j     integer     not null default 0,            -- actifs / population = retention
  -- Funnel de conversion (Visiteur->Leader) — cle = etape de conversionStage()
  c_inscrit       integer     not null default 0,
  c_disciple      integer     not null default 0,
  c_membre        integer     not null default 0,
  c_serviteur     integer     not null default 0,
  c_leader        integer     not null default 0,
  -- Expansion missionnaire
  antennes_total  integer     not null default 0,
  antennes_nouvelles_30j integer not null default 0,
  pays_touches    integer     not null default 0,
  created_at      timestamptz not null default now(),
  unique (snapshot_date, scope, scope_key)
);
create index if not exists idx_growth_snap_date on public.growth_snapshots (snapshot_date desc);
create index if not exists idx_growth_snap_scope on public.growth_snapshots (scope, scope_key, snapshot_date desc);
alter table public.growth_snapshots enable row level security;
-- Aucune policy : lecture/ecriture service role (back-office) uniquement.

-- 2) COHORTES — retention par mois d'entree x territoire ----------------------
create table if not exists public.growth_cohorts (
  id              uuid        primary key default gen_random_uuid(),
  cohort_month    text        not null,                      -- 'YYYY-MM' du created_at
  scope           text        not null default 'global',
  scope_key       text        not null default 'ALL',
  taille          integer     not null default 0,            -- entrees du mois
  retenus_m1      integer     not null default 0,            -- encore actifs apres 1 mois
  retenus_m3      integer     not null default 0,
  retenus_m6      integer     not null default 0,
  retenus_m12     integer     not null default 0,
  devenus_membres integer     not null default 0,            -- ont atteint etape >= membre
  jours_integration_moy numeric not null default 0,          -- vitesse d'integration moyenne
  refreshed_at    timestamptz not null default now(),
  unique (cohort_month, scope, scope_key)
);
create index if not exists idx_growth_cohort on public.growth_cohorts (scope, scope_key, cohort_month);
alter table public.growth_cohorts enable row level security;
-- Service role only.

-- 3) CONFIG — seuils d'alerte parametrables par scope -------------------------
create table if not exists public.growth_config (
  id                    uuid        primary key default gen_random_uuid(),
  scope                 text        not null default 'global',
  scope_key             text        not null default 'ALL',
  seuil_stagnation_pct  numeric     not null default 2,   -- croissance < x% sur 30j = stagnation
  seuil_retention_pct   numeric     not null default 40,  -- retention < x% = alerte
  seuil_chute_pct       numeric     not null default 15,  -- baisse nouveaux vs periode precedente
  min_population        integer     not null default 10,  -- evite le bruit petits effectifs
  actif                 boolean     not null default true,
  created_at            timestamptz not null default now(),
  unique (scope, scope_key)
);
alter table public.growth_config enable row level security;
insert into public.growth_config (scope, scope_key) values ('global', 'ALL') on conflict (scope, scope_key) do nothing;

-- 4) ALERTES de croissance materialisees --------------------------------------
create table if not exists public.growth_alerts (
  id            uuid        primary key default gen_random_uuid(),
  type          text        not null,        -- stagnation | retention_basse | chute_nouveaux | funnel_bloque | antenne_perte_vitesse
  severite      text        not null default 'moyenne',
  scope         text        not null default 'global',
  scope_key     text        not null default 'ALL',
  detail        text,
  valeur        numeric,
  resolu        boolean     not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_growth_alerts_open on public.growth_alerts (resolu, created_at desc);
alter table public.growth_alerts enable row level security;
-- Service role only.

-- 5) VUE LIVE (agregats non sensibles, barre KPI instantanee) -----------------
create or replace view public.v_growth_live as
select
  (select count(*) from public.profiles)                                                as total_profils,
  (select count(*) from public.profiles where created_at::date = current_date)          as nouveaux_jour,
  (select count(*) from public.profiles where created_at >= current_date - 7)           as nouveaux_7j,
  (select count(*) from public.profiles where created_at >= current_date - 30)          as nouveaux_30j,
  (select count(*) from public.antennes where actif = true)                             as antennes_total,
  (select count(*) from public.antennes where actif = true and created_at >= current_date - 30) as antennes_nouvelles_30j,
  (select count(distinct nullif(trim(pays),'')) from public.profiles)                   as pays_touches;

-- 6) RPC SNAPSHOT — calcule + upsert la photo du jour (idempotent) ------------
--    SECURITY DEFINER : execute en service role via supabaseAdmin (jamais expose anon).
create or replace function public.growth_snapshot_run(p_date date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int; v_nj int; v_n7 int; v_n30 int; v_act int;
  v_ant int; v_ant_new int; v_pays int;
begin
  -- GLOBAL uniquement ici : le detail par etape de conversion est ecrit par l'app
  -- (conversionStage vit en TypeScript) via growth_snapshot_upsert ci-dessous.
  select count(*) into v_total from public.profiles;
  select count(*) into v_nj  from public.profiles where created_at::date = p_date;
  select count(*) into v_n7  from public.profiles where created_at >= p_date - 7;
  select count(*) into v_n30 from public.profiles where created_at >= p_date - 30;
  select count(distinct user_id) into v_act from public.analytics_sessions
    where user_id is not null and last_seen >= p_date - 30;
  select count(*) into v_ant from public.antennes where actif = true;
  select count(*) into v_ant_new from public.antennes where actif = true and created_at >= p_date - 30;
  select count(distinct nullif(trim(pays),'')) into v_pays from public.profiles;

  insert into public.growth_snapshots
    (snapshot_date, scope, scope_key, total_profils, nouveaux_jour, nouveaux_7j, nouveaux_30j,
     actifs_30j, retenus_30j, antennes_total, antennes_nouvelles_30j, pays_touches)
  values
    (p_date, 'global', 'ALL', v_total, v_nj, v_n7, v_n30,
     v_act, v_act, v_ant, v_ant_new, v_pays)
  on conflict (snapshot_date, scope, scope_key) do update set
    total_profils = excluded.total_profils, nouveaux_jour = excluded.nouveaux_jour,
    nouveaux_7j = excluded.nouveaux_7j, nouveaux_30j = excluded.nouveaux_30j,
    actifs_30j = excluded.actifs_30j, retenus_30j = excluded.retenus_30j,
    antennes_total = excluded.antennes_total, antennes_nouvelles_30j = excluded.antennes_nouvelles_30j,
    pays_touches = excluded.pays_touches;
end;
$$;

-- 7) RPC UPSERT generique (l'app fournit le detail funnel calcule par conversionStage)
create or replace function public.growth_snapshot_upsert(
  p_date date, p_scope text, p_scope_key text,
  p_total int, p_nj int, p_n7 int, p_n30 int, p_act int,
  p_inscrit int, p_disciple int, p_membre int, p_serviteur int, p_leader int,
  p_ant int, p_ant_new int, p_pays int
) returns void language sql security definer set search_path = public as $$
  insert into public.growth_snapshots
    (snapshot_date, scope, scope_key, total_profils, nouveaux_jour, nouveaux_7j, nouveaux_30j,
     actifs_30j, retenus_30j, c_inscrit, c_disciple, c_membre, c_serviteur, c_leader,
     antennes_total, antennes_nouvelles_30j, pays_touches)
  values
    (p_date, p_scope, p_scope_key, p_total, p_nj, p_n7, p_n30,
     p_act, p_act, p_inscrit, p_disciple, p_membre, p_serviteur, p_leader,
     p_ant, p_ant_new, p_pays)
  on conflict (snapshot_date, scope, scope_key) do update set
    total_profils = excluded.total_profils, nouveaux_jour = excluded.nouveaux_jour,
    nouveaux_7j = excluded.nouveaux_7j, nouveaux_30j = excluded.nouveaux_30j,
    actifs_30j = excluded.actifs_30j, retenus_30j = excluded.retenus_30j,
    c_inscrit = excluded.c_inscrit, c_disciple = excluded.c_disciple,
    c_membre = excluded.c_membre, c_serviteur = excluded.c_serviteur, c_leader = excluded.c_leader,
    antennes_total = excluded.antennes_total, antennes_nouvelles_30j = excluded.antennes_nouvelles_30j,
    pays_touches = excluded.pays_touches;
$$;
revoke all on function public.growth_snapshot_run(date) from public, anon, authenticated;
revoke all on function public.growth_snapshot_upsert from public, anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════
-- SECTION : FINANCES MONDIALES
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================================
-- FINANCES MONDIALES — consolidation multi-devises, snapshots, anomalies
-- ----------------------------------------------------------------------------
-- Brique du Centre de Commandement Apostolique Global. Additif & idempotent.
-- Reutilise dons (devise, antenne_id, montant, statut, source) + product_purchases
-- + antennes (pays, parent_id, devise). Devise pivot = FCFA (code ISO XOF).
-- Tout calcul/lecture = service role. Donnees financieres = sensibles.
-- ============================================================================

-- 1) TAUX DE CHANGE vers la devise pivot (1 unite de `devise` = `taux_pivot` FCFA)
create table if not exists public.fx_rates (
  id             uuid        primary key default gen_random_uuid(),
  devise         text        not null,                 -- code ISO: XOF, EUR, CAD, USD, GBP
  taux_pivot     numeric     not null,                 -- valeur en devise pivot (FCFA) d'1 unite
  effective_date date        not null default current_date,
  source         text,                                 -- bceao | manuel | api
  actif          boolean     not null default true,
  created_at     timestamptz not null default now(),
  unique (devise, effective_date)
);
create index if not exists idx_fx_devise on public.fx_rates (devise, effective_date desc);
alter table public.fx_rates enable row level security;
drop policy if exists fx_rates_read on public.fx_rates;
create policy fx_rates_read on public.fx_rates for select to anon, authenticated using (actif = true);
-- Ecriture: service role uniquement.
-- Seed des taux courants (idempotent). FCFA/XOF = pivot (1:1).
insert into public.fx_rates (devise, taux_pivot, source) values
  ('XOF', 1, 'pivot'), ('FCFA', 1, 'pivot'),
  ('EUR', 655.957, 'bceao'),   -- parite fixe XOF/EUR
  ('CAD', 445, 'manuel'),
  ('USD', 605, 'manuel'),
  ('GBP', 765, 'manuel')
on conflict (devise, effective_date) do nothing;

-- 2) VUE NORMALISEE des flux entrants (dons + achats marketplace)
create or replace view public.v_finance_flux as
  select
    d.id              as flux_id,
    'don'             as flux_kind,
    coalesce(d.source, 'don') as source,
    d.montant         as montant,
    upper(coalesce(d.devise, 'FCFA')) as devise,
    d.antenne_id      as antenne_id,
    a.pays            as pays,
    d.created_at      as created_at,
    (d.created_at)::date as jour
  from public.dons d
  left join public.antennes a on a.id = d.antenne_id
  where lower(coalesce(d.statut, '')) = 'complete'
  union all
  select
    pp.id             as flux_id,
    'marketplace'     as flux_kind,
    'marketplace'     as source,
    pp.montant        as montant,
    upper(coalesce(pp.devise, 'FCFA')) as devise,
    null::uuid        as antenne_id,
    mp.pays           as pays,
    pp.created_at     as created_at,
    (pp.created_at)::date as jour
  from public.product_purchases pp
  left join public.marketplace_products mp on mp.id = pp.product_id
  where lower(coalesce(pp.statut, '')) = 'complete';

-- 3) SNAPSHOTS pre-agreges (scalabilite: evite de scanner les flux en live)
create table if not exists public.finance_snapshots (
  id          uuid        primary key default gen_random_uuid(),
  scope_type  text        not null,                    -- monde | pays | antenne
  scope_id    text,                                    -- code pays OU antenne_id (texte); null si monde
  jour        date        not null,
  devise      text        not null,
  flux_kind   text        not null default 'tous',     -- don | marketplace | tous
  montant_total   numeric not null default 0,
  montant_pivot   numeric not null default 0,          -- converti en FCFA au taux du jour
  nb_transactions integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (scope_type, scope_id, jour, devise, flux_kind)
);
create index if not exists idx_finsnap_scope on public.finance_snapshots (scope_type, scope_id, jour desc);
create index if not exists idx_finsnap_jour on public.finance_snapshots (jour desc);
alter table public.finance_snapshots enable row level security;
-- Aucune policy: donnees financieres sensibles = service role uniquement.

-- 4) CONFIG des seuils d'anomalie (pas de magie en dur)
create table if not exists public.finance_config (
  id              uuid        primary key default gen_random_uuid(),
  scope_type      text        not null default 'monde',
  scope_id        text,
  z_score_seuil   numeric     not null default 2.5,    -- ecart-type pour pic/chute
  don_max_pivot   numeric     not null default 5000000,-- don unitaire > = a verifier (FCFA)
  chute_pct_seuil numeric     not null default 40,     -- chute MoM en %
  actif           boolean     not null default true,
  created_at      timestamptz not null default now(),
  unique (scope_type, scope_id)
);
insert into public.finance_config (scope_type, scope_id) values ('monde', null)
on conflict (scope_type, scope_id) do nothing;
alter table public.finance_config enable row level security;
drop policy if exists fin_config_read on public.finance_config;
create policy fin_config_read on public.finance_config for select to authenticated using (actif = true);

-- 5) ALERTES financieres detectees
create table if not exists public.finance_anomaly_alerts (
  id          uuid        primary key default gen_random_uuid(),
  type        text        not null,   -- pic | chute | devise_inattendue | don_hors_norme | source_anormale
  severite    text        not null default 'moyenne', -- haute | moyenne | info
  scope_type  text        not null,
  scope_id    text,
  jour        date,
  devise      text,
  montant_pivot numeric,
  detail      text,
  statut      text        not null default 'ouverte', -- ouverte | examinee | resolue | ignoree
  created_at  timestamptz not null default now(),
  unique (type, scope_type, scope_id, jour, devise)
);
create index if not exists idx_finalert_statut on public.finance_anomaly_alerts (statut, created_at desc);
alter table public.finance_anomaly_alerts enable row level security;
-- Aucune policy: service role uniquement.

-- 6) RPC d'agregation live (fallback / detail), convertit en pivot via fx_rates
create or replace function public.finance_aggregate(
  p_pays text default null, p_antenne uuid default null,
  p_depuis date default null, p_jusqua date default null
)
returns table (jour date, devise text, montant_total numeric, montant_pivot numeric, nb integer)
language sql security definer set search_path = public as $$
  select f.jour, f.devise,
         sum(f.montant)::numeric as montant_total,
         sum(f.montant * coalesce(fx.taux_pivot, 1))::numeric as montant_pivot,
         count(*)::int as nb
  from public.v_finance_flux f
  left join lateral (
    select taux_pivot from public.fx_rates r
    where r.devise = f.devise and r.actif and r.effective_date <= f.jour
    order by r.effective_date desc limit 1
  ) fx on true
  where (p_pays is null or f.pays = p_pays)
    and (p_antenne is null or f.antenne_id = p_antenne)
    and (p_depuis is null or f.jour >= p_depuis)
    and (p_jusqua is null or f.jour <= p_jusqua)
  group by f.jour, f.devise
  order by f.jour;
$$;
revoke all on function public.finance_aggregate(text, uuid, date, date) from anon, authenticated;

-- 7) RPC de materialisation des snapshots (appelee par cron nocturne)
create or replace function public.finance_build_snapshots(p_jour date default current_date)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0;
begin
  -- Monde (par devise)
  insert into public.finance_snapshots (scope_type, scope_id, jour, devise, flux_kind, montant_total, montant_pivot, nb_transactions)
  select 'monde', null, f.jour, f.devise, 'tous', sum(f.montant),
         sum(f.montant * coalesce(fx.taux_pivot,1)), count(*)
  from public.v_finance_flux f
  left join lateral (select taux_pivot from public.fx_rates r where r.devise=f.devise and r.actif and r.effective_date<=f.jour order by r.effective_date desc limit 1) fx on true
  where f.jour = p_jour group by f.jour, f.devise
  on conflict (scope_type, scope_id, jour, devise, flux_kind)
  do update set montant_total=excluded.montant_total, montant_pivot=excluded.montant_pivot, nb_transactions=excluded.nb_transactions;
  -- Par pays
  insert into public.finance_snapshots (scope_type, scope_id, jour, devise, flux_kind, montant_total, montant_pivot, nb_transactions)
  select 'pays', f.pays, f.jour, f.devise, 'tous', sum(f.montant),
         sum(f.montant * coalesce(fx.taux_pivot,1)), count(*)
  from public.v_finance_flux f
  left join lateral (select taux_pivot from public.fx_rates r where r.devise=f.devise and r.actif and r.effective_date<=f.jour order by r.effective_date desc limit 1) fx on true
  where f.jour = p_jour and f.pays is not null group by f.pays, f.jour, f.devise
  on conflict (scope_type, scope_id, jour, devise, flux_kind)
  do update set montant_total=excluded.montant_total, montant_pivot=excluded.montant_pivot, nb_transactions=excluded.nb_transactions;
  -- Par antenne
  insert into public.finance_snapshots (scope_type, scope_id, jour, devise, flux_kind, montant_total, montant_pivot, nb_transactions)
  select 'antenne', f.antenne_id::text, f.jour, f.devise, 'tous', sum(f.montant),
         sum(f.montant * coalesce(fx.taux_pivot,1)), count(*)
  from public.v_finance_flux f
  left join lateral (select taux_pivot from public.fx_rates r where r.devise=f.devise and r.actif and r.effective_date<=f.jour order by r.effective_date desc limit 1) fx on true
  where f.jour = p_jour and f.antenne_id is not null group by f.antenne_id, f.jour, f.devise
  on conflict (scope_type, scope_id, jour, devise, flux_kind)
  do update set montant_total=excluded.montant_total, montant_pivot=excluded.montant_pivot, nb_transactions=excluded.nb_transactions;
  get diagnostics n = row_count;
  return n;
end; $$;
revoke all on function public.finance_build_snapshots(date) from anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════
-- SECTION : Alertes prophétiques
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================================
-- V5 — ALERTES PROPHÉTIQUES (Centre de Commandement Apostolique Global)
-- ----------------------------------------------------------------------------
-- Couche d'intelligence stratégique au-dessus de V4 : signaux MONDIAUX
-- (déclin d'antenne, flambée prière, chute dons, convertis non intégrés,
-- fenêtre de moisson). Moteur de règles configurable + alertes émises.
-- Additif & idempotent. Réutilise antennes, profiles, dons, priere_demandes,
-- nation_responsables, app_notifications, sensitive_access_logs.
-- Timestamp : 20260603200000 (> 20260603100000 réservé V4).
-- ============================================================================
set search_path = public;

-- ── Snapshots agrégés par scope/période (calculés par cron, lus instantanément) ──
create table if not exists public.prophetic_region_snapshots (
  id                    uuid        primary key default gen_random_uuid(),
  scope_type            text        not null,                 -- 'monde' | 'nation' | 'antenne'
  scope_id              text,                                  -- code pays / antenne_id (null si monde)
  scope_label           text,                                  -- libellé affichable
  periode_debut         timestamptz not null,                  -- début de la fenêtre agrégée
  periode_fin           timestamptz not null default now(),
  -- Agrégats RÉELS (aucune donnée inventée)
  membres_total         integer     not null default 0,
  nouveaux_30j          integer     not null default 0,        -- profiles créés sur 30 j
  convertis_non_integres integer    not null default 0,        -- nouveaux sans parcours/formation/prière
  prieres_urgentes      integer     not null default 0,        -- priorite urgent/tres_urgent non clôturées
  prieres_sans_suivi    integer     not null default 0,        -- non assignées
  dons_total            numeric(14,2) not null default 0,      -- montant 'complete' sur la fenêtre
  dons_nb               integer     not null default 0,
  membres_actifs_30j    integer     not null default 0,        -- connexion < 30 j
  engagement_moyen      numeric(5,2),                          -- score 0-100 moyen (optionnel)
  meta                  jsonb,
  created_at            timestamptz not null default now()
);
create index if not exists idx_proph_snap_scope on public.prophetic_region_snapshots (scope_type, scope_id, periode_fin desc);
alter table public.prophetic_region_snapshots enable row level security;
-- Aucune policy : lecture/écriture service role uniquement (données stratégiques sensibles).

-- ── Moteur de règles configurable ──
create table if not exists public.prophetic_alert_rules (
  id              uuid        primary key default gen_random_uuid(),
  code            text        unique not null,                 -- 'declin_antenne' | 'flambee_priere' | ...
  type_alerte     text        not null,                        -- catégorie d'alerte émise
  libelle         text        not null,
  description     text,
  scope_type      text        not null default 'antenne',      -- niveau d'évaluation
  seuils          jsonb       not null default '{}'::jsonb,     -- ex: {"baisse_pct":30,"fenetre_jours":14}
  severite        text        not null default 'moyenne',       -- 'critique' | 'haute' | 'moyenne' | 'info'
  roles_destinataires text[]  not null default array['super_admin'], -- rôles notifiés
  cooldown_heures integer     not null default 24,               -- anti-spam : pas de réémission avant N h
  actif           boolean     not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_proph_rules_actif on public.prophetic_alert_rules (actif);
alter table public.prophetic_alert_rules enable row level security;
-- Écriture service role ; lecture admin via route gardée.

-- ── Alertes émises ──
create table if not exists public.prophetic_alerts (
  id              uuid        primary key default gen_random_uuid(),
  rule_code       text        not null,
  type_alerte     text        not null,
  severite        text        not null,                         -- critique | haute | moyenne | info
  scope_type      text        not null,                         -- monde | nation | antenne
  scope_id        text,
  scope_label     text,
  titre           text        not null,
  message         text        not null,                         -- résumé prophétique lisible
  signaux         jsonb,                                        -- valeurs réelles ayant déclenché (delta, seuil...)
  score           integer     not null default 0,               -- intensité 0-100 (priorisation)
  statut          text        not null default 'ouverte',       -- ouverte | vue | en_action | resolue | ignoree
  assigned_to     uuid        references public.profiles(id) on delete set null,
  dedup_key       text        not null,                         -- rule_code|scope_type|scope_id|jour
  notifiee        boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Déduplication : 1 alerte par (règle, scope, jour) ; réémission gérée par cooldown applicatif.
create unique index if not exists uniq_proph_alert_dedup on public.prophetic_alerts (dedup_key);
create index if not exists idx_proph_alerts_scope on public.prophetic_alerts (scope_type, scope_id, created_at desc);
create index if not exists idx_proph_alerts_statut on public.prophetic_alerts (statut, severite);
alter table public.prophetic_alerts enable row level security;
-- Aucune policy : service role only (consultation via routes gardées par rôle).

-- ── Seed des 5 règles fondatrices (idempotent) ──
insert into public.prophetic_alert_rules (code, type_alerte, libelle, description, scope_type, seuils, severite, roles_destinataires) values
  ('declin_antenne','declin','Déclin d''une antenne','Chute des membres actifs ou de l''engagement sur 30 j vs période précédente.','antenne','{"baisse_actifs_pct":25,"fenetre_jours":30}','haute', array['super_admin','nation_pastor']),
  ('flambee_priere','urgence','Flambée d''urgences de prière','Hausse anormale des demandes urgentes dans une région.','nation','{"hausse_pct":50,"min_absolu":10,"fenetre_jours":7}','critique', array['super_admin','nation_pastor','intercesseur']),
  ('chute_dons','finance','Chute des dons','Baisse du total des dons sur la fenêtre vs précédente.','antenne','{"baisse_pct":30,"fenetre_jours":30}','haute', array['super_admin','nation_pastor']),
  ('convertis_non_integres','integration','Vague de convertis non intégrés','Nombre élevé de nouveaux convertis sans parcours d''intégration entamé.','antenne','{"min_absolu":15,"part_pct":40,"fenetre_jours":30}','haute', array['super_admin','nation_pastor','coordinateur']),
  ('fenetre_moisson','moisson','Fenêtre de moisson','Afflux de nouveaux convertis : opportunité d''intégration à saisir.','antenne','{"min_nouveaux":20,"fenetre_jours":14}','info', array['super_admin','nation_pastor','coordinateur'])
on conflict (code) do nothing;

-- ── RPC d'agrégation : calcule UN snapshot pour un scope (appelée par cron) ──
-- security definer : interrogée par le service role ; aucune PII renvoyée (agrégats seuls).
create or replace function public.prophetic_compute_snapshot(
  p_scope_type text,
  p_scope_id   text default null,
  p_fenetre_jours integer default 30
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
      where antenne_id = p_scope_id::uuid and created_at >= v_debut and coalesce(parcours_etape,0) = 0;
    select count(*) into v_actifs from public.profiles
      where antenne_id = p_scope_id::uuid and derniere_connexion >= now() - interval '30 days';
    select coalesce(sum(montant),0), count(*) into v_dons, v_dons_nb from public.dons
      where antenne_id = p_scope_id::uuid and statut = 'complete' and created_at >= v_debut;
    select nom into v_label from public.antennes where id = p_scope_id::uuid;
  elsif p_scope_type = 'nation' then
    select count(*) into v_membres from public.profiles where pays ilike p_scope_id;
    select count(*) into v_nouveaux from public.profiles where pays ilike p_scope_id and created_at >= v_debut;
    select count(*) into v_non_integres from public.profiles
      where pays ilike p_scope_id and created_at >= v_debut and coalesce(parcours_etape,0) = 0;
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
    select count(*) into v_non_integres from public.profiles where created_at >= v_debut and coalesce(parcours_etape,0) = 0;
    select count(*) into v_actifs from public.profiles where derniere_connexion >= now() - interval '30 days';
    select count(*) into v_pri_urg from public.priere_demandes
      where priorite in ('urgent','tres_urgent') and statut not in ('repondue','archivee','clos') and created_at >= v_debut;
    select count(*) into v_pri_suivi from public.priere_demandes where assigned_to is null and created_at >= v_debut;
    select coalesce(sum(montant),0), count(*) into v_dons, v_dons_nb from public.dons where statut = 'complete' and created_at >= v_debut;
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
$$;
comment on function public.prophetic_compute_snapshot(text,text,integer) is
  'V5 — calcule un snapshot agrégé (sans PII) pour un scope monde/nation/antenne. Appelée par le cron d''évaluation des alertes prophétiques.';


-- ════════════════════════════════════════════════════════════════════════
-- SECTION : CENTRE MISSIONNAIRE MONDIAL
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================================
-- 20260603200000_centre_missionnaire_v5.sql
-- CENTRE MISSIONNAIRE MONDIAL — V5 (couche intelligence/orchestration)
-- ADDITIF & IDEMPOTENT. NE RECRÉE RIEN : étend expansion_zones, réutilise
-- antennes, profiles, dons (Chariow), geo_localites, antenne_descendants.
-- Toute écriture = service role. Devise défaut FCFA. Commentaires FR.
-- ============================================================================

-- A. RÔLE missionnaire (hors transaction d'usage, idempotent)
alter type public.user_role add value if not exists 'missionnaire';

-- ════════════════════════════════════════════════════════════════════════
-- B. CHAMPS DE MISSION — cibles (peuples/zones). Pont vers expansion_zones V4.
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.mission_champs (
  id                 uuid        primary key default gen_random_uuid(),
  slug               text        unique,
  nom                text        not null,
  pays               text        not null,
  ville              text,
  peuple_cible       text,                                   -- groupe ethnolinguistique visé
  langue_cible       text,
  population_estimee bigint,
  est_atteint        boolean     not null default false,     -- peuple atteint par l'Évangile ?
  priorite           text        not null default 'moyenne', -- basse|moyenne|haute|critique
  lat                double precision,
  lng                double precision,
  responsable_id     uuid        references public.profiles(id) on delete set null,
  notes              text,
  actif              boolean     not null default true,
  created_at         timestamptz not null default now()
);
create index if not exists idx_mchamps_pays    on public.mission_champs (lower(pays));
create index if not exists idx_mchamps_priorite on public.mission_champs (priorite) where actif;
create index if not exists idx_mchamps_atteint  on public.mission_champs (est_atteint) where actif;
alter table public.mission_champs enable row level security;
drop policy if exists mchamps_read on public.mission_champs;
-- Lecture publique limitée aux champs déjà atteints/implantés (vitrine) ; pilotage = service role.
create policy mchamps_read on public.mission_champs for select to anon, authenticated
  using (actif = true and est_atteint = true);

-- Pont : un champ peut être issu d'une zone d'expansion V4 (ne recrée pas expansion_zones).
alter table public.expansion_zones add column if not exists champ_id uuid references public.mission_champs(id) on delete set null;
create index if not exists idx_expansion_champ on public.expansion_zones (champ_id);

-- ════════════════════════════════════════════════════════════════════════
-- C. PROJETS D'IMPLANTATION — du prospect à l'antenne née
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.mission_projets (
  id                  uuid        primary key default gen_random_uuid(),
  slug                text        unique,
  titre               text        not null,
  champ_id            uuid        references public.mission_champs(id) on delete set null,
  antenne_parent_id   uuid        references public.antennes(id) on delete set null, -- antenne mère/envoyeuse
  antenne_id          uuid        references public.antennes(id) on delete set null, -- antenne NÉE (si implantee)
  responsable_id      uuid        references public.profiles(id) on delete set null,
  statut              text        not null default 'prospect', -- prospect|preparation|lancement|implantee|suspendu
  objectif_membres    integer,
  objectif_financement numeric,
  devise              text        not null default 'FCFA',
  date_cible          date,
  date_lancement      date,
  date_implantation   date,
  -- Champs dénormalisés (snapshot écrit par le cron — lecture cockpit O(1))
  vitalite_score      integer     not null default 0,   -- 0-100
  implantation_proba  integer     not null default 0,   -- 0-100
  stage_calcule       text,                              -- redondance lisible du moteur
  snapshot_at         timestamptz,
  actif               boolean     not null default true,
  created_at          timestamptz not null default now()
);
create index if not exists idx_mprojets_statut   on public.mission_projets (statut) where actif;
create index if not exists idx_mprojets_champ     on public.mission_projets (champ_id);
create index if not exists idx_mprojets_antparent on public.mission_projets (antenne_parent_id);
create index if not exists idx_mprojets_antnee    on public.mission_projets (antenne_id);
create index if not exists idx_mprojets_score     on public.mission_projets (vitalite_score desc) where actif;
alter table public.mission_projets enable row level security;
drop policy if exists mprojets_read on public.mission_projets;
-- Vitrine publique : uniquement les implantations réussies. Pilotage = service role.
create policy mprojets_read on public.mission_projets for select to anon, authenticated
  using (actif = true and statut = 'implantee');

-- ════════════════════════════════════════════════════════════════════════
-- D. ENVOYÉS — affectation profile <-> projet (calque antenne_responsables)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.mission_envoyes (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  projet_id         uuid        not null references public.mission_projets(id) on delete cascade,
  role              text        not null default 'equipe', -- pionnier|equipe|intercesseur|soutien
  statut            text        not null default 'actif',  -- actif|rappele|termine
  date_envoi        date,
  derniere_remontee_at timestamptz,                        -- dernière activité terrain (signal récence)
  actif             boolean     not null default true,
  created_at        timestamptz not null default now(),
  unique (user_id, projet_id)
);
create index if not exists idx_menvoyes_projet on public.mission_envoyes (projet_id, statut);
create index if not exists idx_menvoyes_user   on public.mission_envoyes (user_id);
alter table public.mission_envoyes enable row level security;
drop policy if exists menvoyes_select_own on public.mission_envoyes;
create policy menvoyes_select_own on public.mission_envoyes for select to authenticated
  using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════
-- E. FRUITS — journal des fruits remontés du terrain (matière du score)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.mission_fruits (
  id          uuid        primary key default gen_random_uuid(),
  projet_id   uuid        not null references public.mission_projets(id) on delete cascade,
  type        text        not null,            -- conversion|bapteme|cellule|formation|evenement|guerison
  quantite    integer     not null default 1,
  date_fruit  date        not null default current_date,
  rapporte_par uuid       references public.profiles(id) on delete set null,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_mfruits_projet on public.mission_fruits (projet_id, date_fruit desc);
create index if not exists idx_mfruits_type    on public.mission_fruits (projet_id, type);
alter table public.mission_fruits enable row level security;
-- Aucune lecture publique : suivi pastoral interne (service role uniquement).

-- ════════════════════════════════════════════════════════════════════════
-- F. JALONS — étapes franchies du projet
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.mission_jalons (
  id          uuid        primary key default gen_random_uuid(),
  projet_id   uuid        not null references public.mission_projets(id) on delete cascade,
  titre       text        not null,
  ordre       integer     not null default 0,
  statut      text        not null default 'a_faire', -- a_faire|en_cours|atteint
  atteint_le  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_mjalons_projet on public.mission_jalons (projet_id, ordre);
alter table public.mission_jalons enable row level security;
-- Service role uniquement.

-- ════════════════════════════════════════════════════════════════════════
-- G. RPC SET-BASED — signaux par projet (1 aller-retour, scope mondial)
--    Réutilise antenne_descendants pour le scope d'antenne côté appelant.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.mission_projet_signals(
  scope_pays     text[] default null,
  scope_antennes uuid[] default null
)
returns jsonb language sql stable security definer set search_path = public as $$
  with proj as (
    select pj.* from public.mission_projets pj
    left join public.mission_champs c on c.id = pj.champ_id
    where pj.actif
      and (scope_pays is null     or upper(c.pays) = any (select upper(x) from unnest(scope_pays) x))
      and (scope_antennes is null or pj.antenne_parent_id = any (scope_antennes) or pj.antenne_id = any (scope_antennes))
  ),
  -- Financement fléché par campagne 'mission:<projet_id>' OU meta_json (Chariow), par devise.
  fin as (
    select pj.id as projet_id,
           coalesce(jsonb_object_agg(t.devise, t.total) filter (where t.devise is not null), '{}'::jsonb) as par_devise,
           coalesce(sum(t.total) filter (where upper(t.devise) = upper(pj.devise)), 0) as total_devise_projet
    from proj pj
    left join lateral (
      select upper(coalesce(d.devise,'FCFA')) as devise, sum(coalesce(d.montant,0)) as total
      from public.dons d
      where d.statut = 'complete'
        and (d.campagne = 'mission:' || pj.id::text
             or d.meta_json->>'mission_projet_id' = pj.id::text)
      group by upper(coalesce(d.devise,'FCFA'))
    ) t on true
    group by pj.id, pj.devise
  ),
  fruits as (
    select projet_id,
           coalesce(jsonb_object_agg(type, n), '{}'::jsonb) as par_type,
           sum(n) filter (where date_fruit >= current_date - 30) as fruits_30j,
           sum(n) as fruits_total
    from (select projet_id, type, sum(quantite) n, max(date_fruit) date_fruit
          from public.mission_fruits group by projet_id, type) s
    group by projet_id
  ),
  fruits_rec as (
    select projet_id, max(date_fruit) as dernier_fruit
    from public.mission_fruits group by projet_id
  ),
  envoyes as (
    select projet_id,
           count(*) filter (where statut='actif') as envoyes_actifs,
           count(*) filter (where statut='actif' and (derniere_remontee_at is null or derniere_remontee_at < now() - interval '21 days')) as envoyes_silencieux,
           max(derniere_remontee_at) as derniere_remontee
    from public.mission_envoyes group by projet_id
  ),
  jalons as (
    select projet_id, count(*) as total, count(*) filter (where statut='atteint') as atteints
    from public.mission_jalons group by projet_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'projet_id', pj.id, 'titre', pj.titre, 'statut', pj.statut, 'devise', pj.devise,
    'pays', (select c.pays from public.mission_champs c where c.id = pj.champ_id),
    'objectif_financement', pj.objectif_financement,
    'objectif_membres', pj.objectif_membres,
    'date_cible', pj.date_cible,
    'created_at', pj.created_at,
    'financement_par_devise', coalesce(f.par_devise, '{}'::jsonb),
    'financement_devise_projet', coalesce(f.total_devise_projet, 0),
    'fruits_par_type', coalesce(fr.par_type, '{}'::jsonb),
    'fruits_30j', coalesce(fr.fruits_30j, 0),
    'fruits_total', coalesce(fr.fruits_total, 0),
    'dernier_fruit', frc.dernier_fruit,
    'envoyes_actifs', coalesce(e.envoyes_actifs, 0),
    'envoyes_silencieux', coalesce(e.envoyes_silencieux, 0),
    'derniere_remontee', e.derniere_remontee,
    'jalons_total', coalesce(j.total, 0),
    'jalons_atteints', coalesce(j.atteints, 0)
  )), '[]'::jsonb)
  from proj pj
  left join fin f       on f.projet_id  = pj.id
  left join fruits fr   on fr.projet_id = pj.id
  left join fruits_rec frc on frc.projet_id = pj.id
  left join envoyes e   on e.projet_id  = pj.id
  left join jalons j    on j.projet_id  = pj.id;
$$;
revoke all on function public.mission_projet_signals(text[], uuid[]) from public, anon, authenticated;

-- RPC tuile cockpit (compteurs mondiaux scopés, pour buildKpiTiles).
create or replace function public.mission_pulse_kpis(
  scope_pays     text[] default null,
  scope_antennes uuid[] default null
)
returns jsonb language sql stable security definer set search_path = public as $$
  with proj as (
    select pj.* from public.mission_projets pj
    left join public.mission_champs c on c.id = pj.champ_id
    where pj.actif
      and (scope_pays is null     or upper(c.pays) = any (select upper(x) from unnest(scope_pays) x))
      and (scope_antennes is null or pj.antenne_parent_id = any (scope_antennes) or pj.antenne_id = any (scope_antennes))
  )
  select jsonb_build_object(
    'projets_actifs',   (select count(*) from proj where statut in ('prospect','preparation','lancement')),
    'projets_en_risque',(select count(*) from proj where statut in ('preparation','lancement') and vitalite_score < 40),
    'antennes_nees_12m',(select count(*) from proj where statut='implantee' and coalesce(date_implantation, created_at::date) >= current_date - 365),
    'champs_ouverts',   (select count(*) from public.mission_champs where actif and not est_atteint),
    'envoyes_actifs',   (select count(*) from public.mission_envoyes me join proj on proj.id = me.projet_id where me.statut='actif'),
    'fruits_30j',       (select coalesce(sum(mf.quantite),0) from public.mission_fruits mf join proj on proj.id = mf.projet_id where mf.date_fruit >= current_date - 30),
    'financement_par_devise', (
      select coalesce(jsonb_object_agg(devise, s), '{}'::jsonb) from (
        select upper(coalesce(d.devise,'FCFA')) devise, sum(coalesce(d.montant,0)) s
        from public.dons d join proj on (d.campagne = 'mission:'||proj.id::text or d.meta_json->>'mission_projet_id' = proj.id::text)
        where d.statut='complete' group by upper(coalesce(d.devise,'FCFA'))
      ) t)
  );
$$;
revoke all on function public.mission_pulse_kpis(text[], uuid[]) from public, anon, authenticated;

-- RPC carte (superposition sur cartographie_monde V4, réutilise geo_localites).
create or replace function public.mission_carte_monde(p_scope_pays text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'champs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'nom', c.nom, 'pays', c.pays, 'ville', c.ville,
        'lat', coalesce(c.lat, g.lat), 'lng', coalesce(c.lng, g.lng),
        'priorite', c.priorite, 'est_atteint', c.est_atteint,
        'population_estimee', c.population_estimee, 'peuple_cible', c.peuple_cible)), '[]'::jsonb)
      from public.mission_champs c
      left join public.geo_localites g on lower(g.pays)=lower(c.pays) and g.ville is null and g.actif
      where c.actif and (p_scope_pays is null or lower(c.pays)=lower(p_scope_pays))),
    'projets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', pj.id, 'titre', pj.titre, 'statut', pj.statut,
        'vitalite_score', pj.vitalite_score, 'implantation_proba', pj.implantation_proba,
        'lat', coalesce(c.lat, g.lat), 'lng', coalesce(c.lng, g.lng))), '[]'::jsonb)
      from public.mission_projets pj
      left join public.mission_champs c on c.id = pj.champ_id
      left join public.geo_localites g on lower(g.pays)=lower(c.pays) and g.ville is null and g.actif
      where pj.actif and (p_scope_pays is null or lower(c.pays)=lower(p_scope_pays)))
  );
$$;
revoke all on function public.mission_carte_monde(text) from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- H. SNAPSHOT — vue matérialisée pulse mission (courbes cockpit), cron nocturne
-- ════════════════════════════════════════════════════════════════════════
create materialized view if not exists public.mv_mission_pulse as
  select date_trunc('month', mf.date_fruit)::date as mois,
         pj.id as projet_id,
         upper(coalesce(c.pays,'')) as pays,
         mf.type,
         sum(mf.quantite) as fruits
  from public.mission_fruits mf
  join public.mission_projets pj on pj.id = mf.projet_id
  left join public.mission_champs c on c.id = pj.champ_id
  where mf.date_fruit >= (current_date - interval '400 days')
  group by 1,2,3,4;
create unique index if not exists idx_mv_mission_pulse_uk
  on public.mv_mission_pulse (mois, projet_id, pays, type);

create or replace function public.refresh_mission_pulse()
returns void language sql security definer set search_path = public as $$
  refresh materialized view concurrently public.mv_mission_pulse;
$$;
revoke all on function public.refresh_mission_pulse() from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- FIN — 20260603200000_centre_missionnaire_v5.sql
-- ════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════
-- SECTION : CENTRE DE CRISE APOSTOLIQUE
-- ════════════════════════════════════════════════════════════════════════
-- ============================================================================
-- V5 — CENTRE DE CRISE APOSTOLIQUE (orchestration des urgences pastorales)
-- ----------------------------------------------------------------------------
-- Brique du Centre de Commandement Apostolique Global. Réutilise priere_demandes
-- (tres_urgent), delivrance, antennes (hiérarchie parent_id), nation_responsables,
-- notify()/Realtime. Écriture = service role. Données sensibles = pas de policy
-- (service role only) + sensitive_access_logs. Additif & idempotent. Devise FCFA.
-- Timestamp réservé V5 (> 20260603200000).
-- ============================================================================

-- 0) Rôle cellule de crise (idempotent) -------------------------------------
alter type public.user_role add value if not exists 'crisis_lead';

-- 1) Incidents de crise ------------------------------------------------------
create table if not exists public.crisis_incidents (
  id                uuid        primary key default gen_random_uuid(),
  slug              text        unique not null default replace(gen_random_uuid()::text, '-', ''),
  type              text        not null default 'autre',   -- priere_critique | delivrance_grave | sinistre_antenne | mobilisation_pays | securite | sante | autre
  titre             text        not null,
  resume            text,                                    -- description NON sensible (pas le contenu privé d'une prière)
  severite          text        not null default 'majeur',  -- mineur | majeur | critique | catastrophe
  score_severite    int         not null default 50,        -- 0-100 (calculé côté serveur)
  statut            text        not null default 'ouvert',  -- ouvert | en_cellule | en_escalade | maitrise | resolu | clos
  -- Portée (scope RBAC, même axe que le reste du Centre de Commandement)
  antenne_id        uuid        references public.antennes(id) on delete set null,
  pays              text,
  -- Origine réelle (traçabilité — JAMAIS le contenu sensible, seulement la référence)
  source_table      text,                                    -- priere_demandes | delivrance_demandes | gouvernement | manuel
  source_id         uuid,
  -- Escalade
  niveau_escalade   int         not null default 0,          -- palier courant
  next_escalation_at timestamptz,                            -- échéance SLA (cron)
  pilote_id         uuid        references public.profiles(id) on delete set null,
  -- Confidentialité (incident issu de cure d'âme → service role only)
  confidentiel      boolean     not null default false,
  -- Cycle de vie
  declenche_par     uuid        references public.profiles(id) on delete set null,
  resolu_le         timestamptz,
  rex               text,                                    -- retour d'expérience / leçons (clôture)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_crisis_statut    on public.crisis_incidents (statut);
create index if not exists idx_crisis_severite  on public.crisis_incidents (severite);
create index if not exists idx_crisis_pays       on public.crisis_incidents (pays);
create index if not exists idx_crisis_antenne    on public.crisis_incidents (antenne_id);
create index if not exists idx_crisis_escal      on public.crisis_incidents (next_escalation_at) where statut not in ('resolu','clos');
create index if not exists idx_crisis_source     on public.crisis_incidents (source_table, source_id);

alter table public.crisis_incidents enable row level security;
-- Lecture publique IMPOSSIBLE. Tout passe par la service role (back-office scopé serveur).
-- Aucune policy → service role only (incidents potentiellement sensibles).

-- 2) Journal d'intervention (fil temps réel de la cellule) -------------------
create table if not exists public.crisis_interventions (
  id           uuid        primary key default gen_random_uuid(),
  incident_id  uuid        not null references public.crisis_incidents(id) on delete cascade,
  auteur_id    uuid        references public.profiles(id) on delete set null,
  type         text        not null default 'note',   -- note | decision | communication | escalade | statut | assignation
  contenu      text        not null,
  meta         jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_crisis_interv on public.crisis_interventions (incident_id, created_at desc);
alter table public.crisis_interventions enable row level security;
-- Service role only (journal pastoral sensible).

-- 3) Assignations de la cellule de crise ------------------------------------
create table if not exists public.crisis_assignations (
  id           uuid        primary key default gen_random_uuid(),
  incident_id  uuid        not null references public.crisis_incidents(id) on delete cascade,
  user_id      uuid        references public.profiles(id) on delete set null,
  role_cellule text        not null default 'intervenant', -- pilote | intercesseur | terrain | communication | intervenant
  assigned_at  timestamptz not null default now(),
  actif        boolean     not null default true,
  unique (incident_id, user_id)
);
create index if not exists idx_crisis_assign_inc  on public.crisis_assignations (incident_id);
create index if not exists idx_crisis_assign_user on public.crisis_assignations (user_id);
alter table public.crisis_assignations enable row level security;
-- Un intervenant peut LIRE ses propres affectations (pour son tableau de bord crise).
drop policy if exists crisis_assign_select_own on public.crisis_assignations;
create policy crisis_assign_select_own on public.crisis_assignations for select
  to authenticated using (user_id = auth.uid());
-- Création/maj via service role.

-- 4) Paliers d'escalade (config administrable + SLA) -------------------------
create table if not exists public.crisis_escalation_levels (
  id           uuid        primary key default gen_random_uuid(),
  type         text        not null default 'autre',   -- aligné sur crisis_incidents.type ; 'autre' = défaut
  severite     text        not null default 'majeur',
  niveau       int         not null,                    -- 0,1,2,3...
  cible        text        not null,                    -- responsable_antenne | antenne_mere | nation_pastor | super_admin
  delai_minutes int        not null default 30,         -- SLA avant montée au palier suivant
  actif        boolean     not null default true,
  unique (type, severite, niveau)
);
alter table public.crisis_escalation_levels enable row level security;
drop policy if exists crisis_escal_read on public.crisis_escalation_levels;
create policy crisis_escal_read on public.crisis_escalation_levels for select to authenticated using (actif = true);

-- Seed des paliers par défaut (idempotent). Plus c'est sévère, plus le SLA est court.
insert into public.crisis_escalation_levels (type, severite, niveau, cible, delai_minutes) values
  ('autre','catastrophe',0,'responsable_antenne',10),
  ('autre','catastrophe',1,'nation_pastor',15),
  ('autre','catastrophe',2,'super_admin',20),
  ('autre','critique',0,'responsable_antenne',20),
  ('autre','critique',1,'antenne_mere',30),
  ('autre','critique',2,'nation_pastor',45),
  ('autre','critique',3,'super_admin',60),
  ('autre','majeur',0,'responsable_antenne',60),
  ('autre','majeur',1,'nation_pastor',120),
  ('autre','mineur',0,'responsable_antenne',240)
on conflict (type, severite, niveau) do nothing;

-- 5) Snapshot de tension (scale : pré-agrégé par cron) -----------------------
create table if not exists public.crisis_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  scope_type      text        not null default 'global', -- global | pays | antenne
  scope_key       text        not null default 'GLOBAL', -- 'GLOBAL' | code pays | antenne_id
  incidents_ouverts int       not null default 0,
  incidents_critiques int     not null default 0,
  sla_depasses    int         not null default 0,
  indice_tension  int         not null default 0,        -- 0-100 (crisisPressure)
  payload         jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists idx_crisis_snap on public.crisis_snapshots (scope_type, scope_key, created_at desc);
alter table public.crisis_snapshots enable row level security;
-- Service role only.

-- 6) Vue des incidents ouverts (lecture agrégée rapide) ----------------------
create or replace view public.v_crisis_open as
  select i.id, i.slug, i.type, i.titre, i.severite, i.score_severite, i.statut,
         i.antenne_id, i.pays, i.niveau_escalade, i.next_escalation_at, i.pilote_id,
         i.confidentiel, i.created_at, i.updated_at,
         (i.next_escalation_at is not null and i.next_escalation_at < now()) as sla_depasse
  from public.crisis_incidents i
  where i.statut not in ('resolu','clos');

-- 7) RPC d'agrégation transverse (consommée par le command-center mondial) ---
create or replace function public.crisis_overview(scope_pays text default null)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with f as (
    select * from public.v_crisis_open
    where scope_pays is null or pays = scope_pays
  )
  select jsonb_build_object(
    'ouverts', (select count(*) from f),
    'critiques', (select count(*) from f where severite in ('critique','catastrophe')),
    'sla_depasses', (select count(*) from f where sla_depasse),
    'par_pays', coalesce((select jsonb_object_agg(coalesce(pays,'??'), n)
                          from (select pays, count(*) n from f group by pays) t), '{}'::jsonb),
    'par_severite', coalesce((select jsonb_object_agg(severite, n)
                          from (select severite, count(*) n from f group by severite) t), '{}'::jsonb)
  );
$$;
revoke all on function public.crisis_overview(text) from anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════
-- FIN — 20260603200000_v5_global_command.sql
-- ════════════════════════════════════════════════════════════════════════
