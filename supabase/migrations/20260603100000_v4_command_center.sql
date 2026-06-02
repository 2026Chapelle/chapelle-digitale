-- ============================================================================
-- 20260603100000_command_center_v4.sql
-- CENTRE DE COMMANDEMENT APOSTOLIQUE — Migration consolidée V4
-- ----------------------------------------------------------------------------
-- Réconcilie les 6 modules (Multi-Antennes, Marketplace, Mobile, Intercession,
-- Discipulat, Cartographie) + le cockpit transverse. ADDITIF & IDEMPOTENT.
-- NE RECRÉE RIEN d'existant : antennes (20260602270000), profiles.antenne_id,
-- dons.antenne_id, evenements.antenne_id, priere_demandes, marketplace_products,
-- product_purchases, app_notifications, nation_responsables, scale_indexes.
-- Toute écriture = service role (back-office / API gardée). Devise défaut FCFA.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════
-- A. RÔLES (enum) — hors transaction d'usage
-- ════════════════════════════════════════════════════════════════════════
alter type public.user_role add value if not exists 'responsable_antenne';
alter type public.user_role add value if not exists 'mentor';

-- ════════════════════════════════════════════════════════════════════════
-- B. MULTI-ANTENNES — métadonnées, affectation, scope, agrégats
-- ════════════════════════════════════════════════════════════════════════

-- B.1 Métadonnées d'affichage + géolocalisation (étend antennes, ne recrée pas).
alter table public.antennes add column if not exists code_couleur text;
alter table public.antennes add column if not exists ordre    integer not null default 0;
alter table public.antennes add column if not exists telephone text;
alter table public.antennes add column if not exists email     text;
alter table public.antennes add column if not exists lat       double precision;
alter table public.antennes add column if not exists lng       double precision;
alter table public.antennes add column if not exists rayon_km  integer not null default 25;
create index if not exists idx_antennes_parent on public.antennes (parent_id);
create index if not exists idx_antennes_ordre  on public.antennes (ordre);
create index if not exists idx_antennes_geo    on public.antennes (lat, lng);

-- Géocodage des antennes seedées (idempotent : ne touche que si lat null).
update public.antennes set lat = 5.3599517,  lng = -4.0082563 where slug = 'abidjan' and lat is null;
update public.antennes set lat = 45.5018869, lng = -73.567256 where slug = 'canada'  and lat is null;
update public.antennes set lat = 48.856614,  lng = 2.3522219  where slug = 'europe'  and lat is null;

-- B.2 Affectation responsable <-> antenne (calque nation_responsables).
create table if not exists public.antenne_responsables (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  antenne_id  uuid        not null references public.antennes(id) on delete cascade,
  role        text        not null default 'responsable_antenne',
  inclut_sous boolean     not null default true,
  actif       boolean     not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, antenne_id)
);
create index if not exists idx_antenne_resp_user    on public.antenne_responsables (user_id);
create index if not exists idx_antenne_resp_antenne on public.antenne_responsables (antenne_id);
create index if not exists idx_antenne_resp_actif   on public.antenne_responsables (actif);
alter table public.antenne_responsables enable row level security;
drop policy if exists antenne_resp_select_own on public.antenne_responsables;
create policy antenne_resp_select_own on public.antenne_responsables for select
  to authenticated using (user_id = auth.uid());

-- B.3 Rattachement antenne sur les tables transactionnelles manquantes.
alter table public.priere_demandes        add column if not exists antenne_id uuid references public.antennes(id) on delete set null;
alter table public.inscriptions_formation add column if not exists antenne_id uuid references public.antennes(id) on delete set null;

-- B.4 Index composites de scope (clé de la scalabilité 100k).
create index if not exists idx_profiles_antenne_statut on public.profiles (antenne_id, membre_statut);
create index if not exists idx_dons_antenne_statut      on public.dons (antenne_id, statut);
create index if not exists idx_evenements_antenne       on public.evenements (antenne_id);
create index if not exists idx_prieres_antenne          on public.priere_demandes (antenne_id);
create index if not exists idx_inscr_form_antenne       on public.inscriptions_formation (antenne_id);

-- B.5 RPC descendants (sous-arbre via parent_id, CTE récursive).
create or replace function public.antenne_descendants(p_antenne_id uuid)
returns table (id uuid)
language sql stable security definer set search_path = public as $$
  with recursive arbre as (
    select a.id from public.antennes a where a.id = p_antenne_id
    union all
    select c.id from public.antennes c join arbre on c.parent_id = arbre.id
  )
  select id from arbre;
$$;

-- B.6 RPC agrégats par antenne (membres + dons consolidés PAR DEVISE locale).
create or replace function public.antenne_stats_agg(p_antenne_ids uuid[])
returns table (
  membres bigint, inscrits bigint, responsables bigint, prieres bigint,
  formations bigint, evenements bigint, dons_count bigint, dons_par_devise jsonb
)
language plpgsql stable security definer set search_path = public as $$
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
       and p.membre_statut in ('membre','fidele','actif')),
    (select count(*) from public.profiles p where p.antenne_id = any(p_antenne_ids)),
    (select count(*) from public.antenne_responsables r where r.antenne_id = any(p_antenne_ids) and r.actif),
    (select count(*) from public.priere_demandes pr where pr.antenne_id = any(p_antenne_ids)),
    (select count(*) from public.inscriptions_formation f where f.antenne_id = any(p_antenne_ids)),
    (select count(*) from public.evenements e where e.antenne_id = any(p_antenne_ids)),
    (select count(*) from public.dons dn where dn.antenne_id = any(p_antenne_ids) and dn.statut = 'complete'),
    v_devise;
end;
$$;
revoke all on function public.antenne_descendants(uuid) from anon, authenticated;
revoke all on function public.antenne_stats_agg(uuid[]) from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- C. MARKETPLACE — catégories, stock, abonnements, avis, revenus
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.marketplace_categories (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        unique,
  nom         text        not null,
  description text,
  icone       text,
  parent_id   uuid        references public.marketplace_categories(id) on delete set null,
  position    integer     not null default 0,
  actif       boolean     not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_mkt_cat_actif  on public.marketplace_categories (actif, position);
create index if not exists idx_mkt_cat_parent on public.marketplace_categories (parent_id);
alter table public.marketplace_categories enable row level security;
drop policy if exists mkt_cat_read on public.marketplace_categories;
create policy mkt_cat_read on public.marketplace_categories
  for select to anon, authenticated using (actif = true);

alter table public.marketplace_products add column if not exists category_id           uuid references public.marketplace_categories(id) on delete set null;
alter table public.marketplace_products add column if not exists collection            text;
alter table public.marketplace_products add column if not exists antenne_id            uuid references public.antennes(id) on delete set null;
alter table public.marketplace_products add column if not exists sku                   text;
alter table public.marketplace_products add column if not exists stock                 integer;
alter table public.marketplace_products add column if not exists stock_seuil_alerte    integer not null default 5;
alter table public.marketplace_products add column if not exists is_subscription       boolean not null default false;
alter table public.marketplace_products add column if not exists subscription_interval text;
alter table public.marketplace_products add column if not exists featured              boolean not null default false;
alter table public.marketplace_products add column if not exists position              integer not null default 0;
alter table public.marketplace_products add column if not exists rating_avg            numeric(3,2) not null default 0;
alter table public.marketplace_products add column if not exists rating_count          integer not null default 0;
create index if not exists idx_mkt_category   on public.marketplace_products (category_id, actif);
create index if not exists idx_mkt_collection on public.marketplace_products (collection);
create index if not exists idx_mkt_antenne    on public.marketplace_products (antenne_id);
create index if not exists idx_mkt_featured   on public.marketplace_products (featured, position) where actif = true;
create index if not exists idx_mkt_sku        on public.marketplace_products (sku) where sku is not null;

alter table public.product_purchases add column if not exists antenne_id          uuid references public.antennes(id) on delete set null;
alter table public.product_purchases add column if not exists subscription_status text;
alter table public.product_purchases add column if not exists current_period_end  timestamptz;
alter table public.product_purchases add column if not exists renewed_count       integer not null default 0;
alter table public.product_purchases add column if not exists revoked_at          timestamptz;
alter table public.product_purchases add column if not exists refunded_at         timestamptz;
create index if not exists idx_purchase_antenne on public.product_purchases (antenne_id);
create index if not exists idx_purchase_sub     on public.product_purchases (subscription_status) where subscription_status is not null;
create index if not exists idx_purchase_product on public.product_purchases (product_id);
create index if not exists idx_purchase_created on public.product_purchases (created_at);

create table if not exists public.marketplace_reviews (
  id          uuid        primary key default gen_random_uuid(),
  product_id  uuid        not null references public.marketplace_products(id) on delete cascade,
  user_id     uuid        references public.profiles(id) on delete set null,
  purchase_id uuid        references public.product_purchases(id) on delete set null,
  note        integer     not null check (note between 1 and 5),
  commentaire text,
  approuve    boolean     not null default true,
  actif       boolean     not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists uniq_review_user_product on public.marketplace_reviews (product_id, user_id) where user_id is not null;
create index if not exists idx_review_product on public.marketplace_reviews (product_id, approuve, actif);
alter table public.marketplace_reviews enable row level security;
drop policy if exists review_read on public.marketplace_reviews;
create policy review_read on public.marketplace_reviews
  for select to anon, authenticated using (actif = true and approuve = true);

create or replace function public.mkt_refresh_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  update public.marketplace_products p set
    rating_avg = coalesce((select round(avg(note)::numeric, 2) from public.marketplace_reviews r
                           where r.product_id = pid and r.approuve and r.actif), 0),
    rating_count = (select count(*) from public.marketplace_reviews r
                    where r.product_id = pid and r.approuve and r.actif)
  where p.id = pid;
  return null;
end $$;
drop trigger if exists trg_mkt_rating on public.marketplace_reviews;
create trigger trg_mkt_rating after insert or update or delete on public.marketplace_reviews
  for each row execute function public.mkt_refresh_rating();

create or replace function public.marketplace_revenue(
  p_pays text default null, p_antenne uuid default null,
  p_from timestamptz default null, p_to timestamptz default null
) returns table (devise text, total numeric, nb_ventes bigint, nb_abonnements bigint)
language sql security definer set search_path = public stable as $$
  select
    coalesce(pp.devise, 'FCFA') as devise,
    coalesce(sum(d.montant), 0) as total,
    count(distinct pp.id) as nb_ventes,
    count(distinct pp.id) filter (where pp.subscription_status = 'active') as nb_abonnements
  from public.product_purchases pp
  left join public.dons d on d.id = pp.don_id and d.statut = 'complete'
  left join public.marketplace_products mp on mp.id = pp.product_id
  where pp.statut = 'complete'
    and (p_antenne is null or pp.antenne_id = p_antenne or mp.antenne_id = p_antenne)
    and (p_pays    is null or mp.pays ilike p_pays)
    and (p_from    is null or pp.created_at >= p_from)
    and (p_to      is null or pp.created_at <  p_to)
  group by coalesce(pp.devise, 'FCFA');
$$;

create or replace function public.marketplace_top_products(
  p_pays text default null, p_antenne uuid default null, p_limit int default 10
) returns table (product_id uuid, titre text, type text, devise text, nb_ventes bigint, ca numeric)
language sql security definer set search_path = public stable as $$
  select mp.id, mp.titre, mp.type, coalesce(pp.devise, mp.devise, 'FCFA'),
         count(pp.id) as nb_ventes, coalesce(sum(d.montant), 0) as ca
  from public.marketplace_products mp
  join public.product_purchases pp on pp.product_id = mp.id and pp.statut = 'complete'
  left join public.dons d on d.id = pp.don_id and d.statut = 'complete'
  where (p_antenne is null or mp.antenne_id = p_antenne or pp.antenne_id = p_antenne)
    and (p_pays    is null or mp.pays ilike p_pays)
  group by mp.id, mp.titre, mp.type, coalesce(pp.devise, mp.devise, 'FCFA')
  order by nb_ventes desc
  limit greatest(1, least(p_limit, 50));
$$;
revoke all on function public.marketplace_revenue(text, uuid, timestamptz, timestamptz) from anon, authenticated;
revoke all on function public.marketplace_top_products(text, uuid, int) from anon, authenticated;

insert into public.marketplace_categories (slug, nom, icone, position) values
  ('ebooks','E-books','book-open',10), ('livres','Livres physiques','book',20),
  ('masterclass','Masterclass','graduation-cap',30), ('formations','Formations','school',40),
  ('billets','Billetterie','ticket',50), ('abonnements','Abonnements','repeat',60),
  ('produits','Produits dérivés','shirt',70)
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- D. MOBILE — appareils, sessions, préférences, dispatch push
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.mobile_devices (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  platform      text        not null default 'web',
  push_provider text        not null default 'webpush',
  push_token    text        not null,
  device_name   text,
  app_version   text,
  locale        text        default 'fr',
  push_enabled  boolean     not null default true,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (push_token)
);
create index if not exists idx_mobile_devices_user     on public.mobile_devices (user_id, push_enabled);
create index if not exists idx_mobile_devices_active   on public.mobile_devices (push_enabled, last_seen_at desc);
create index if not exists idx_mobile_devices_platform on public.mobile_devices (platform);
alter table public.mobile_devices enable row level security;
drop policy if exists mobile_devices_rw on public.mobile_devices;
create policy mobile_devices_rw on public.mobile_devices for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.mobile_sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  device_id    uuid        references public.mobile_devices(id) on delete set null,
  platform     text        not null default 'web',
  app_version  text,
  ip_hash      text,
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at   timestamptz
);
create index if not exists idx_mobile_sessions_user   on public.mobile_sessions (user_id, last_seen_at desc);
create index if not exists idx_mobile_sessions_active on public.mobile_sessions (revoked_at, last_seen_at desc);
alter table public.mobile_sessions enable row level security;
drop policy if exists mobile_sessions_read on public.mobile_sessions;
create policy mobile_sessions_read on public.mobile_sessions for select to authenticated
  using (user_id = auth.uid());

create table if not exists public.mobile_preferences (
  user_id           uuid        primary key references public.profiles(id) on delete cascade,
  push_dons         boolean     not null default true,
  push_prieres      boolean     not null default true,
  push_formations   boolean     not null default true,
  push_lives        boolean     not null default true,
  push_evenements   boolean     not null default true,
  push_systeme      boolean     not null default true,
  quiet_hours_start smallint,
  quiet_hours_end   smallint,
  langue            text        not null default 'fr',
  theme             text        not null default 'system',
  updated_at        timestamptz not null default now()
);
alter table public.mobile_preferences enable row level security;
drop policy if exists mobile_prefs_rw on public.mobile_preferences;
create policy mobile_prefs_rw on public.mobile_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.push_dispatch_log (
  id         uuid        primary key default gen_random_uuid(),
  notif_id   uuid        references public.app_notifications(id) on delete set null,
  device_id  uuid        references public.mobile_devices(id) on delete set null,
  user_id    uuid        references public.profiles(id) on delete set null,
  status     text        not null default 'queued',
  provider   text,
  error      text,
  created_at timestamptz not null default now(),
  unique (notif_id, device_id)
);
create index if not exists idx_pushlog_notif  on public.push_dispatch_log (notif_id);
create index if not exists idx_pushlog_status on public.push_dispatch_log (status, created_at desc);
alter table public.push_dispatch_log enable row level security;
-- Aucune policy : service role uniquement (diagnostic admin).

create or replace function public.notify_push_dispatch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_notify('mobile_push', new.id::text);
  return new;
end;
$$;
drop trigger if exists trg_app_notifications_push on public.app_notifications;
create trigger trg_app_notifications_push
  after insert on public.app_notifications
  for each row execute function public.notify_push_dispatch();

create or replace function public.mobile_adoption_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'devices_total',   (select count(*) from public.mobile_devices),
    'devices_actifs',  (select count(*) from public.mobile_devices
                          where push_enabled and last_seen_at > now() - interval '30 days'),
    'par_plateforme',  (select coalesce(jsonb_object_agg(platform, n), '{}'::jsonb)
                          from (select platform, count(*) n from public.mobile_devices group by platform) s),
    'optin_push',      (select count(*) from public.mobile_devices where push_enabled),
    'membres_equipes', (select count(distinct user_id) from public.mobile_devices)
  );
$$;
revoke all on function public.mobile_adoption_stats() from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- E. INTERCESSION (MAHANAÏM) — salles, chaînes, garde, mur, escalade
-- ════════════════════════════════════════════════════════════════════════

-- E.0 Extension priere_demandes (rattachement salle/chaîne + escalade).
alter table public.priere_demandes add column if not exists salle_id        uuid;
alter table public.priere_demandes add column if not exists chaine_id       uuid;
alter table public.priere_demandes add column if not exists escalade_palier int not null default 0;
alter table public.priere_demandes add column if not exists escalade_at     timestamptz;
alter table public.priere_demandes add column if not exists fuseau          text;
create index if not exists idx_priere_salle  on public.priere_demandes (salle_id);
create index if not exists idx_priere_chaine on public.priere_demandes (chaine_id);
create index if not exists idx_priere_escalade_queue on public.priere_demandes (priorite, created_at)
  where assigned_to is null and statut in ('nouvelle','recue','assignee','en_intercession');

create table if not exists public.intercession_salles (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique,
  titre         text not null,
  description   text,
  categorie     text,
  antenne_id    uuid references public.antennes(id) on delete set null,
  demande_id    uuid references public.priere_demandes(id) on delete set null,
  hote_id       uuid references public.profiles(id) on delete set null,
  statut        text not null default 'planifiee',
  est_publique  boolean not null default true,
  lien_live     text,
  debut_prevu   timestamptz,
  demarre_le    timestamptz,
  cloture_le    timestamptz,
  participants_count int not null default 0,
  amen_count    int not null default 0,
  actif         boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_salles_statut  on public.intercession_salles (statut, debut_prevu);
create index if not exists idx_salles_antenne on public.intercession_salles (antenne_id);
create index if not exists idx_salles_demande on public.intercession_salles (demande_id);
alter table public.intercession_salles enable row level security;
drop policy if exists salles_read on public.intercession_salles;
create policy salles_read on public.intercession_salles for select to anon, authenticated
  using (actif = true and est_publique = true and statut in ('planifiee','live'));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'priere_demandes_salle_fk') then
    alter table public.priere_demandes
      add constraint priere_demandes_salle_fk foreign key (salle_id)
      references public.intercession_salles(id) on delete set null;
  end if;
end $$;

create table if not exists public.intercession_participants (
  id         uuid primary key default gen_random_uuid(),
  salle_id   uuid not null references public.intercession_salles(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  role       text not null default 'priant',
  amen_count int not null default 0,
  joined_at  timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  unique (salle_id, user_id)
);
create index if not exists idx_partic_salle on public.intercession_participants (salle_id);
create index if not exists idx_partic_user  on public.intercession_participants (user_id);
alter table public.intercession_participants enable row level security;
drop policy if exists partic_read_own on public.intercession_participants;
create policy partic_read_own on public.intercession_participants for select to authenticated
  using (user_id = auth.uid());

create table if not exists public.intercession_chaines (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique,
  titre         text not null,
  description   text,
  categorie     text,
  antenne_id    uuid references public.antennes(id) on delete set null,
  fuseau        text,
  objectif      text,
  date_debut    date,
  date_fin      date,
  couverture_pct int not null default 0,
  actif         boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_chaines_actif   on public.intercession_chaines (actif);
create index if not exists idx_chaines_antenne on public.intercession_chaines (antenne_id);
alter table public.intercession_chaines enable row level security;
drop policy if exists chaines_read on public.intercession_chaines;
create policy chaines_read on public.intercession_chaines for select to anon, authenticated using (actif = true);

-- FK différées salle_id/chaine_id de priere_demandes (les tables existent désormais).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'priere_demandes_chaine_fk') then
    alter table public.priere_demandes
      add constraint priere_demandes_chaine_fk foreign key (chaine_id)
      references public.intercession_chaines(id) on delete set null;
  end if;
end $$;

create table if not exists public.intercession_creneaux (
  id              uuid primary key default gen_random_uuid(),
  chaine_id       uuid not null references public.intercession_chaines(id) on delete cascade,
  intercesseur_id uuid references public.profiles(id) on delete set null,
  jour_semaine    int not null,
  heure_debut     time not null,
  heure_fin       time not null,
  recurrent       boolean not null default true,
  date_specifique date,
  actif           boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_creneaux_chaine on public.intercession_creneaux (chaine_id, jour_semaine, heure_debut);
create index if not exists idx_creneaux_inter  on public.intercession_creneaux (intercesseur_id);
alter table public.intercession_creneaux enable row level security;
drop policy if exists creneaux_read on public.intercession_creneaux;
create policy creneaux_read on public.intercession_creneaux for select to authenticated using (actif = true);

create table if not exists public.intercession_garde_log (
  id              uuid primary key default gen_random_uuid(),
  creneau_id      uuid references public.intercession_creneaux(id) on delete set null,
  chaine_id       uuid references public.intercession_chaines(id) on delete set null,
  intercesseur_id uuid references public.profiles(id) on delete set null,
  check_in_at     timestamptz not null default now(),
  check_out_at    timestamptz,
  duree_min       int,
  statut          text not null default 'present',
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_garde_inter  on public.intercession_garde_log (intercesseur_id, check_in_at desc);
create index if not exists idx_garde_chaine on public.intercession_garde_log (chaine_id, check_in_at desc);
alter table public.intercession_garde_log enable row level security;
drop policy if exists garde_read_own on public.intercession_garde_log;
create policy garde_read_own on public.intercession_garde_log for select to authenticated
  using (intercesseur_id = auth.uid());

create table if not exists public.intercession_mur (
  id         uuid primary key default gen_random_uuid(),
  salle_id   uuid references public.intercession_salles(id) on delete cascade,
  chaine_id  uuid references public.intercession_chaines(id) on delete set null,
  demande_id uuid references public.priere_demandes(id) on delete set null,
  user_id    uuid references public.profiles(id) on delete set null,
  auteur     text,
  type       text not null default 'intention',
  corps      text not null,
  pays       text,
  langue     text not null default 'fr',
  masque     boolean not null default false,
  signale    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_mur_salle  on public.intercession_mur (salle_id, created_at desc);
create index if not exists idx_mur_recent on public.intercession_mur (created_at desc) where masque = false;
alter table public.intercession_mur enable row level security;
drop policy if exists mur_public_read on public.intercession_mur;
create policy mur_public_read on public.intercession_mur for select to anon, authenticated using (masque = false);
drop policy if exists mur_insert on public.intercession_mur;
create policy mur_insert on public.intercession_mur for insert to anon, authenticated
  with check (masque = false and signale = false and (user_id is null or user_id = auth.uid()));

create table if not exists public.priere_escalades (
  id           uuid primary key default gen_random_uuid(),
  demande_id   uuid not null references public.priere_demandes(id) on delete cascade,
  palier       int not null,
  raison       text,
  notifie_role text,
  cree_par     uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_escalade_demande on public.priere_escalades (demande_id, created_at desc);
alter table public.priere_escalades enable row level security;
-- Aucune lecture publique : suivi pastoral interne (service role uniquement).

do $$ begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='intercession_mur') then
    alter publication supabase_realtime add table public.intercession_mur;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='intercession_salles') then
    alter publication supabase_realtime add table public.intercession_salles;
  end if;
exception when undefined_object then null;
end $$;

create or replace function public.mahanaim_cockpit(p_antenne uuid default null)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'salles_live',        (select count(*) from intercession_salles where statut='live' and (p_antenne is null or antenne_id=p_antenne)),
    'salles_planifiees',  (select count(*) from intercession_salles where statut='planifiee' and (p_antenne is null or antenne_id=p_antenne)),
    'chaines_actives',    (select count(*) from intercession_chaines where actif and (p_antenne is null or antenne_id=p_antenne)),
    'creneaux_total',     (select count(*) from intercession_creneaux c join intercession_chaines ch on ch.id=c.chaine_id where c.actif and (p_antenne is null or ch.antenne_id=p_antenne)),
    'creneaux_couverts',  (select count(*) from intercession_creneaux c join intercession_chaines ch on ch.id=c.chaine_id where c.actif and c.intercesseur_id is not null and (p_antenne is null or ch.antenne_id=p_antenne)),
    'garde_aujourdhui',   (select count(*) from intercession_garde_log where check_in_at >= date_trunc('day', now())),
    'escalades_ouvertes', (select count(*) from priere_demandes where escalade_palier > 0 and statut in ('nouvelle','recue','assignee','en_intercession') and (p_antenne is null or antenne_id=p_antenne)),
    'urgents_sans_suivi', (select count(*) from priere_demandes where priorite in ('urgent','tres_urgent') and assigned_to is null and statut in ('nouvelle','recue') and (p_antenne is null or antenne_id=p_antenne)),
    'exauces_30j',        (select count(*) from temoignages where statut='valide' and created_at >= now() - interval '30 days'),
    'demandes_30j',       (select count(*) from priere_demandes where created_at >= now() - interval '30 days' and (p_antenne is null or antenne_id=p_antenne))
  );
$$;
revoke all on function public.mahanaim_cockpit(uuid) from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- F. DISCIPULAT — chemins, étapes, relations, progression, jalons
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.discipulat_chemins (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        unique not null,
  titre       text        not null,
  description text,
  cible_stage text        not null default 'disciple',
  niveau      int         not null default 1,
  cover_url   text,
  langue      text        not null default 'fr',
  ordre       int         not null default 0,
  actif       boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_disc_chemins_actif on public.discipulat_chemins (actif, ordre);

create table if not exists public.discipulat_etapes (
  id                 uuid       primary key default gen_random_uuid(),
  chemin_id          uuid       not null references public.discipulat_chemins(id) on delete cascade,
  ordre              int        not null default 0,
  titre              text       not null,
  description        text,
  validation         text       not null default 'mentor',
  parcours_id        uuid       references public.parcours(id) on delete set null,
  formation_id       uuid       references public.formations(id) on delete set null,
  integration_flag   text,
  prerequis_etape_id uuid       references public.discipulat_etapes(id) on delete set null,
  obligatoire        boolean    not null default true,
  created_at         timestamptz not null default now(),
  unique (chemin_id, ordre)
);
create index if not exists idx_disc_etapes_chemin on public.discipulat_etapes (chemin_id, ordre);

create table if not exists public.discipulat_relations (
  id          uuid        primary key default gen_random_uuid(),
  disciple_id uuid        not null references public.profiles(id) on delete cascade,
  mentor_id   uuid        references public.profiles(id) on delete set null,
  chemin_id   uuid        references public.discipulat_chemins(id) on delete set null,
  antenne_id  uuid        references public.antennes(id) on delete set null,
  groupe_id   uuid        references public.groupes(id) on delete set null,
  statut      text        not null default 'active',
  demarre_le  timestamptz not null default now(),
  termine_le  timestamptz,
  note        text,
  created_at  timestamptz not null default now(),
  unique (disciple_id, chemin_id)
);
create index if not exists idx_disc_rel_mentor   on public.discipulat_relations (mentor_id, statut);
create index if not exists idx_disc_rel_disciple on public.discipulat_relations (disciple_id, statut);
create index if not exists idx_disc_rel_antenne  on public.discipulat_relations (antenne_id, statut);

create table if not exists public.discipulat_progressions (
  id          uuid        primary key default gen_random_uuid(),
  disciple_id uuid        not null references public.profiles(id) on delete cascade,
  etape_id    uuid        not null references public.discipulat_etapes(id) on delete cascade,
  chemin_id   uuid        not null references public.discipulat_chemins(id) on delete cascade,
  statut      text        not null default 'en_cours',
  valide_le   timestamptz,
  valide_par  uuid        references public.profiles(id) on delete set null,
  source      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (disciple_id, etape_id)
);
create index if not exists idx_disc_prog_disc   on public.discipulat_progressions (disciple_id, chemin_id);
create index if not exists idx_disc_prog_statut on public.discipulat_progressions (chemin_id, statut);

create table if not exists public.discipulat_jalons (
  id          uuid        primary key default gen_random_uuid(),
  relation_id uuid        references public.discipulat_relations(id) on delete cascade,
  disciple_id uuid        not null references public.profiles(id) on delete cascade,
  mentor_id   uuid        references public.profiles(id) on delete set null,
  type        text        not null default 'rencontre',
  titre       text        not null,
  detail      text,
  jalon_at    timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists idx_disc_jalons_disc on public.discipulat_jalons (disciple_id, jalon_at desc);
create index if not exists idx_disc_jalons_rel  on public.discipulat_jalons (relation_id, jalon_at desc);

alter table public.discipulat_chemins      enable row level security;
alter table public.discipulat_etapes       enable row level security;
alter table public.discipulat_relations    enable row level security;
alter table public.discipulat_progressions enable row level security;
alter table public.discipulat_jalons       enable row level security;

drop policy if exists disc_chemins_read on public.discipulat_chemins;
create policy disc_chemins_read on public.discipulat_chemins for select to anon, authenticated using (actif = true);
drop policy if exists disc_etapes_read on public.discipulat_etapes;
create policy disc_etapes_read on public.discipulat_etapes for select to anon, authenticated using (true);
drop policy if exists disc_rel_select_own on public.discipulat_relations;
create policy disc_rel_select_own on public.discipulat_relations for select
  to authenticated using (disciple_id = auth.uid() or mentor_id = auth.uid());
drop policy if exists disc_prog_select_own on public.discipulat_progressions;
create policy disc_prog_select_own on public.discipulat_progressions for select
  to authenticated using (disciple_id = auth.uid());
drop policy if exists disc_jalons_select_own on public.discipulat_jalons;
create policy disc_jalons_select_own on public.discipulat_jalons for select
  to authenticated using (disciple_id = auth.uid() or mentor_id = auth.uid());

create or replace function public.discipulat_recompute(p_disciple uuid, p_chemin uuid)
returns void language plpgsql security definer set search_path = public, chapelle as $$
declare e record; v_done boolean;
begin
  for e in select * from public.discipulat_etapes where chemin_id = p_chemin loop
    v_done := false;
    if e.validation = 'formation' and e.formation_id is not null then
      select coalesce(progression,0) >= 100 into v_done
        from public.inscriptions_formation
       where user_id = p_disciple and formation_id = e.formation_id;
    elsif e.validation = 'parcours' and e.parcours_id is not null then
      select bool_and(coalesce(i.progression,0) >= 100) into v_done
        from public.parcours_formations pf
        left join public.inscriptions_formation i
               on i.formation_id = pf.formation_id and i.user_id = p_disciple
       where pf.parcours_id = e.parcours_id;
    elsif e.validation = 'integration' and e.integration_flag is not null then
      execute format(
        'select coalesce((select %I from chapelle.integration_journeys where user_id = $1 limit 1), false)',
        e.integration_flag) into v_done using p_disciple;
    end if;
    if v_done is true then
      insert into public.discipulat_progressions (disciple_id, etape_id, chemin_id, statut, valide_le, source)
      values (p_disciple, e.id, p_chemin, 'valide', now(), 'auto')
      on conflict (disciple_id, etape_id)
      do update set statut = 'valide', valide_le = coalesce(public.discipulat_progressions.valide_le, now()),
                    source = 'auto', updated_at = now()
        where public.discipulat_progressions.statut <> 'valide';
    end if;
  end loop;
end;
$$;

create or replace function public.discipulat_overview(p_antenne uuid default null, p_pays text default null)
returns jsonb language sql security definer set search_path = public as $$
  with rel as (
    select r.* from public.discipulat_relations r
    left join public.profiles p on p.id = r.disciple_id
    where (p_antenne is null or r.antenne_id = p_antenne)
      and (p_pays is null or p.pays = p_pays)
  )
  select jsonb_build_object(
    'relations_actives', (select count(*) from rel where statut = 'active'),
    'relations_total',   (select count(*) from rel),
    'mentors_actifs',    (select count(distinct mentor_id) from rel where statut = 'active' and mentor_id is not null),
    'disciples_sans_mentor', (select count(*) from rel where statut = 'active' and mentor_id is null),
    'par_chemin', (select coalesce(jsonb_object_agg(c.titre, n),'{}'::jsonb)
                     from (select chemin_id, count(*) n from rel group by chemin_id) s
                     join public.discipulat_chemins c on c.id = s.chemin_id),
    'etapes_validees_30j', (select count(*) from public.discipulat_progressions
                              where statut = 'valide' and valide_le >= now() - interval '30 days'),
    'jalons_30j', (select count(*) from public.discipulat_jalons where jalon_at >= now() - interval '30 days')
  );
$$;
revoke all on function public.discipulat_overview(uuid, text) from anon, authenticated;

insert into public.discipulat_chemins (slug, titre, description, cible_stage, niveau, ordre) values
  ('nouvelle-naissance', 'Nouvelle Naissance', 'Premiers pas du nouveau converti.', 'disciple', 1, 0),
  ('affermissement',     'Affermissement',     'Fondations de la foi et vie de prière.', 'membre', 2, 1),
  ('ecole-leaders',      'École de Leaders',   'Formation au service et au leadership.', 'serviteur', 4, 2)
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════════════════
-- G. CARTOGRAPHIE — localités, expansion, agrégat monde
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.geo_localites (
  id         uuid        primary key default gen_random_uuid(),
  pays       text        not null,
  ville      text,
  code_iso2  text,
  lat        double precision not null,
  lng        double precision not null,
  source     text        not null default 'seed',
  actif      boolean     not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_geo_localites_pays_ville
  on public.geo_localites (lower(pays), lower(coalesce(ville, '')));
create index if not exists idx_geo_localites_pays on public.geo_localites (lower(pays));
alter table public.geo_localites enable row level security;
drop policy if exists geo_localites_read on public.geo_localites;
create policy geo_localites_read on public.geo_localites for select to anon, authenticated using (actif = true);

insert into public.geo_localites (pays, ville, code_iso2, lat, lng) values
  ('Côte d''Ivoire', null, 'CI',  7.539989,  -5.547080),
  ('Côte d''Ivoire', 'Abidjan', 'CI', 5.359951, -4.008256),
  ('Canada',  null, 'CA', 56.130366, -106.346771),
  ('France',  null, 'FR', 46.227638,  2.213749),
  ('Belgique',null, 'BE', 50.503887,  4.469936),
  ('Suisse',  null, 'CH', 46.818188,  8.227512),
  ('États-Unis', null, 'US', 37.090240, -95.712891),
  ('Cameroun',null, 'CM', 7.369722,  12.354722),
  ('Sénégal', null, 'SN', 14.497401, -14.452362),
  ('Congo (RDC)', null, 'CD', -4.038333, 21.758664),
  ('Congo (Brazzaville)', null, 'CG', -0.228021, 15.827659),
  ('Gabon',   null, 'GA', -0.803689, 11.609444),
  ('Bénin',   null, 'BJ', 9.307690,  2.315834),
  ('Togo',    null, 'TG', 8.619543,  0.824782),
  ('Burkina Faso', null, 'BF', 12.238333, -1.561593),
  ('Mali',    null, 'ML', 17.570692, -3.996166),
  ('Royaume-Uni', null, 'GB', 55.378051, -3.435973)
on conflict (lower(pays), lower(coalesce(ville, ''))) do nothing;

create table if not exists public.expansion_zones (
  id               uuid        primary key default gen_random_uuid(),
  nom              text        not null,
  slug             text        unique,
  pays             text        not null,
  ville            text,
  lat              double precision,
  lng              double precision,
  statut           text        not null default 'prospect',
  priorite         text        not null default 'moyenne',
  objectif_membres integer,
  antenne_id       uuid        references public.antennes(id) on delete set null,
  responsable_id   uuid        references public.profiles(id) on delete set null,
  notes            text,
  actif            boolean     not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists idx_expansion_statut on public.expansion_zones (statut) where actif;
create index if not exists idx_expansion_pays   on public.expansion_zones (lower(pays));
create index if not exists idx_expansion_geo    on public.expansion_zones (lat, lng);
alter table public.expansion_zones enable row level security;
drop policy if exists expansion_read on public.expansion_zones;
create policy expansion_read on public.expansion_zones for select to anon, authenticated using (actif = true and statut = 'implantee');

create or replace function public.cartographie_monde(p_scope_pays text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
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
          count(*) filter (where p.membre_statut in ('membre','fidele','actif'))   as membres_actifs,
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
$$;
revoke all on function public.cartographie_monde(text) from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- H. COCKPIT — préférences, agrégat transverse, vue matérialisée tendance
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.command_center_prefs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  contexte   text,
  tuiles     jsonb       not null default '[]'::jsonb,
  actif      boolean     not null default true,
  created_at timestamptz not null default now(),
  unique (user_id)
);
create index if not exists idx_cc_prefs_user on public.command_center_prefs (user_id);
alter table public.command_center_prefs enable row level security;
drop policy if exists cc_prefs_select_own on public.command_center_prefs;
create policy cc_prefs_select_own on public.command_center_prefs for select
  to authenticated using (user_id = auth.uid());

-- RPC d'agrégation transverse, bornée par scope (NULL = tout). SET-BASED.
create or replace function public.command_center_kpis(
  scope_pays     text[] default null,
  scope_antennes uuid[] default null
)
returns jsonb language sql stable security definer set search_path = public as $$
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
    'membres_actifs',       (select count(*) from prof where membre_statut = any (array['membre','fidele','actif'])),
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
$$;
revoke all on function public.command_center_kpis(text[], uuid[]) from public, anon, authenticated;

-- Vue matérialisée de tendance quotidienne par antenne/pays (courbes du cockpit).
create materialized view if not exists public.mv_command_center_daily as
  select date_trunc('day', p.created_at)::date as jour,
         p.antenne_id,
         upper(coalesce(p.pays,'')) as pays,
         count(*) as nouveaux_membres
  from public.profiles p
  where p.created_at >= (now() - interval '400 days')
  group by 1, 2, 3;
create unique index if not exists idx_mv_cc_daily_uk
  on public.mv_command_center_daily (jour, coalesce(antenne_id,'00000000-0000-0000-0000-000000000000'::uuid), pays);

create or replace function public.refresh_command_center_daily()
returns void language sql security definer set search_path = public as $$
  refresh materialized view concurrently public.mv_command_center_daily;
$$;
revoke all on function public.refresh_command_center_daily() from public, anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- FIN — 20260603100000_command_center_v4.sql
-- ════════════════════════════════════════════════════════════════════════
