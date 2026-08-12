-- =============================================================================
-- PODCAST-0B — modèle éditorial podcast (émission / accès / destination)
-- =============================================================================
-- Graduée depuis artifacts/podcast-0b-editorial-DRAFT.sql après GO local.
--
-- PORTÉE : LOCALE. À appliquer via `supabase db reset` / `supabase migration up`
--          sur l'instance LOCALE uniquement. AUCUN `db push` distant tant que la
--          décision de déploiement n'est pas prise séparément.
--
-- POURQUOI : PODCAST-0A a supprimé la duplication Accueil (Instant vs Premium) SANS
--            SQL, via cms_homepage_blocks.data (choix explicite des épisodes). C'est
--            suffisant pour 2 emplacements pilotés à la main. Mais l'architecture
--            cible « LA VOIX DU ROYAUME » (émissions, à la une, playlists, filtres
--            par émission/accès) exige que CHAQUE épisode porte nativement :
--              • son ÉMISSION/série (indépendante de l'accès et de la destination) ;
--              • son NIVEAU D'ACCÈS (public / member / premium) ;
--              • ses DESTINATIONS éditoriales explicites (multi-emplacements) ;
--              • un flag À LA UNE.
--
-- PRINCIPE : 100 % ADDITIF. Aucune colonne existante modifiée/supprimée. Aucune
--            donnée détruite. RLS de lecture INCHANGÉE (lecture publique des
--            épisodes publiés conservée → aucune régression PODCAST-0A). Le verrou
--            premium « réellement sécurisé » (URLs signées / RPC) est HORS de ce
--            lot : access_level y est une donnée éditoriale, PAS encore un gate.
--
-- COMPAT APP : la route CMS générique /api/admin/cms/[resource] fait insert(body)
--              SANS whitelist → dès que ces colonnes existent, les nouveaux champs
--              du formulaire admin (CmsManager) sont acceptés sans code serveur
--              supplémentaire. Côté lecture, les requêtes home/`/podcast` tentent
--              les colonnes éditoriales et retombent proprement sur le jeu de base
--              si elles sont absentes (déploiement partiel toléré).
--
-- IMPACT : après exécution : colonnes NULL/defaults → comportement identique jusqu'à
--          ce que l'admin renseigne les valeurs (aucune régression).
-- =============================================================================

-- 1) Colonnes additives sur cms_podcasts -------------------------------------
alter table public.cms_podcasts
  add column if not exists serie        text,                                   -- ex: "L'Instant Citadelle", "Veilleurs de la Nuit"
  add column if not exists access_level text    not null default 'member',      -- public | member | premium
  add column if not exists destinations text[]  not null default '{}',          -- ex: {catalog, home_instant, home_premium, featured}
  add column if not exists is_featured  boolean not null default false;

-- Garde-fou de valeurs (n'échoue pas sur l'existant : defaults conformes) ------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cms_podcasts_access_level_chk'
  ) then
    alter table public.cms_podcasts
      add constraint cms_podcasts_access_level_chk
      check (access_level in ('public','member','premium'));
  end if;
end$$;

-- 2) Index de sélection éditoriale (carrousels / à la une / par émission) ------
create index if not exists idx_cms_podcasts_featured
  on public.cms_podcasts (is_featured) where is_featured = true;
create index if not exists idx_cms_podcasts_serie
  on public.cms_podcasts (serie);
create index if not exists idx_cms_podcasts_destinations
  on public.cms_podcasts using gin (destinations);

-- 3) RLS : INCHANGÉE.
--    La policy existante `cms_podcasts_read` (status='published') reste la seule.
--    access_level n'est PAS un gate de lecture ici : le verrou premium réel
--    (URLs signées / RPC gated) fera l'objet d'un lot séparé avec sa propre
--    décision métier. Ne rien ajouter ici évite un faux sentiment de sécurité.

-- 4) Backfill éditorial : laissé à l'admin (aucune écriture automatique ici).
--    Les épisodes existants restent access_level='member', destinations='{}',
--    is_featured=false, serie=NULL → l'app les traite via ses replis (catalog
--    implicite, série « — »). L'admin renseigne ensuite les valeurs à la main.

-- =============================================================================
-- ROLLBACK (purement additif, sûr) --------------------------------------------
-- alter table public.cms_podcasts
--   drop constraint if exists cms_podcasts_access_level_chk;
-- alter table public.cms_podcasts
--   drop column if exists serie,
--   drop column if exists access_level,
--   drop column if exists destinations,
--   drop column if exists is_featured;
-- drop index if exists idx_cms_podcasts_featured;
-- drop index if exists idx_cms_podcasts_serie;
-- drop index if exists idx_cms_podcasts_destinations;
-- =============================================================================
