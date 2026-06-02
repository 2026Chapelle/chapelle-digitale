# Centre de Commandement Apostolique Global (V5) — Synthèse

> Couche d'**intelligence et d'orchestration mondiale** au-dessus de V4. Une console unique pour **voir, comprendre, anticiper, alerter et décider** à travers les nations et les antennes, à l'échelle de plusieurs dizaines de milliers de membres.

## Architecture d'ensemble

- **Migration** : `supabase/migrations/20260603200000_v5_global_command.sql` — 32 tables, 16 fonctions/RPC, idempotente & additive, RLS, `security definer` + `revoke`. Réutilise V4 et l'existant (profiles, antennes, dons, prayer_center, marketplace, analytics, pastoral-intelligence). Ne recrée rien.
- **Logique pure** : `src/lib/global-intelligence.ts` — indice de santé spirituelle mondiale, rollup d'alertes multi-sources, consolidation finances par devise, pouls global. Sans I/O, testable.
- **Orchestrateur** : `src/app/api/admin/global-command/route.ts` — appelle en parallèle les RPC SET-BASED des 9 capacités, consolide les 6 sources d'alertes, calcule le pouls mondial. Défensif (une capacité non poussée n'interrompt pas la console).
- **Console** : `/admin/global-command` — pouls mondial, alertes prioritaires toutes sources, santé par territoire (plus fragiles en tête), gouvernement par antenne, bandeau mission/crise/prédiction/nations.

## Modèle de données (snapshots + alertes + config)

Chaque capacité suit le même patron : **tables de configuration** (seuils, règles) + **snapshots** (séries temporelles pour les tendances, alimentées par cron) + **alertes** (sortie actionnable). Les calculs lourds passent par des **RPC SET-BASED** et des **vues matérialisées** — jamais de pull de 100k lignes côté Node.

---

## CROISSANCE MONDIALE
**Réutilise :** src/lib/pastoral-intelligence.ts : conversionStage() + STAGE_META (6 etapes Visiteur->Leader) reutilises tels quels pour ventiler le funnel et les cohortes — AUCUNE redefinition; profiles : created_at (date d'entree = nouvelle ame/membre), role, membre_statut, parcours_disciple_etape, pays, antenne_id, derniere_connexion — source unique des comptages de croissance; antennes : hierarchie parent_id, pays, devise, created_at (naissance d'antenne = expansion missionnaire), responsable_id, actif — sert d'axe territorial et d'indicateur 'nouvelles antennes'; src/lib/nation-stats.ts : pattern countIn() / head:true et listNations() — reutilise pour les agregats live et la liste des territoires; src/app/api/admin/gouvernement/route.ts : logique deja presente (nouveaux_inscrits/nouveaux_membres 30j, croissance mensuelle, croissance_pct par pays) — V5 la PERENNISE en snapshots historiques au lieu de la recalculer a chaque requete; analytics_sessions (last_seen, user_id, pays) : signal de retention reelle (un membre 'retenu' = revu dans la fenetre N) — deja agrege dans gouvernement/route.ts; src/lib/admin-auth.ts isAdminRequest() + getSessionProfile() + nation_responsables (scope pays) : portee serveur reutilisee, jamais de nouveau modele de droits; sensitive_access_logs : journalisation des consultations scopees (deja en place)

### Architecture
## Composants

1. **SQL (nouveau, additif)** — 3 tables de snapshot/cohorte/config + 1 vue live + 2 RPC d'agregation :
   - `growth_snapshots` : photo quotidienne (date, scope global|nation|antenne, cle de scope, comptages par etape de conversion, nouveaux, actifs, retenus, devise). C'est la MEMOIRE historique qui manque aujourd'hui.
   - `growth_cohorts` : cohorte d'entree (mois d'inscription x territoire) avec retention M1/M3/M6/M12 et progression vers etape membre.
   - `growth_config` : seuils d'alerte parametrables (stagnation, decrochage funnel) par scope, sans toucher au code.
   - `growth_alerts` : alertes de croissance materialisees (stagnation territoire, funnel casse, antenne en perte de vitesse) pour notification.
   - `v_growth_live` : vue d'agregat temps reel (sans PII) pour la barre KPI instantanee.
   - RPC `growth_snapshot_run(p_date)` : calcule et upsert le snapshot du jour (idempotent) — appelable par cron.
   - RPC `growth_cohort_refresh()` : recalcule la matrice de cohortes.

2. **Lib d'intelligence PURE** `src/lib/growth-intelligence.ts` (sans I/O, testable) : transforme une SERIE de snapshots reels en velocite, momentum, taux de retention, vitesse d'integration, projection lineaire, classement de territoires, et alertes de croissance. Reutilise STAGE_META de pastoral-intelligence.

3. **Lib d'acces serveur** `src/lib/growth.ts` (`'server-only'`) : lit snapshots/cohortes/profiles/antennes via supabaseAdmin selon le scope (global/nation/antenne) impose par le role, applique growth-intelligence, renvoie le contrat unifie. Branchable dans command-center.ts (V4).

4. **API** `GET /api/admin/growth` : garde admin + scope serveur, IS_DEMO_MODE early return, force-dynamic. `POST /api/admin/growth/snapshot` : declenche le snapshot (cron / bouton admin), garde admin.

5. **Console mondiale** : onglet "Croissance" du cockpit unique V4 (`/admin/gouvernement` ou `/admin/command-center`), multi-contexte via selecteur global/nation/antenne deja present.

## Flux de donnees

`profiles.created_at + conversionStage + antennes + analytics_sessions`
  -> (cron quotidien) **RPC growth_snapshot_run** ecrit une ligne par scope dans `growth_snapshots`
  -> `src/lib/growth.ts` lit la SERIE de snapshots (90/180/365 j) + cohortes
  -> `src/lib/growth-intelligence.ts` calcule velocite/momentum/retention/projection/alertes (PUR)
  -> `/api/admin/growth` renvoie `{ok, data}` scope par role
  -> console mondiale affiche courbes, funnel, cohortes, classement territoires, alertes.

## Agregation transverse & integration console mondiale

Le module n'est PAS un silo : `growth.ts` expose `croissanceMondialeKpis(scope)` consomme par `command-center.ts` (V4) pour alimenter la ligne KPI transverse de la console unique (a cote de sante, finance, priere). Le selecteur de contexte (global/nation/antenne) de V4 passe `scope` + `scopeKey` a l'API; le serveur recoupe avec `nation_responsables` pour interdire toute escalade de portee. Les alertes de croissance partagent le pipeline `notify()` + `growth_alerts` deja utilise par les autres modules. Le snapshot quotidien rend la vue Croissance instantanee a l'echelle de dizaines de milliers de membres (lecture d'une serie de lignes pre-agregees, pas de scan de toute la table profiles a chaque visite).

### Modèle d'intelligence
## Signaux d'ENTREE (tous reels, deja collectes)
- profiles.created_at -> date d'entree d'une ame (nouveaux_jour/7j/30j, cohorte d'entree).
- conversionStage(profile) [pastoral-intelligence.ts] -> ventilation funnel Inscrit/Disciple/Membre/Serviteur/Leader (calcule cote app, ecrit dans le snapshot via growth_snapshot_upsert).
- analytics_sessions.last_seen / user_id -> actifs_30j (retention reelle, pas declarative).
- profiles.parcours_disciple_etape + created_at -> vitesse d'integration (jours entree->atteinte etape membre) par cohorte.
- antennes.created_at / actif -> nouvelles antennes (expansion missionnaire), nombre de pays touches.
- growth_config -> seuils parametrables (stagnation, retention, chute, min_population) par scope.

## FORMULES (explicables, sans ML)
- Taux de croissance net = (total_fin - total_debut) / total_debut sur la fenetre.
- Velocite = nouvelles ames / jour (moyenne fenetre).
- Momentum = velocite(2nde moitie) / velocite(1ere moitie) -> ratio classe en 5 paliers : acceleration >=1.3, croissance >=1.05, stable [0.95-1.05[, ralentissement <0.95, declin <=0.7.
- Retention 30j = actifs_30j / total_profils.
- Conversion funnel = (membre+serviteur+leader) / (inscrit+disciple+membre+serviteur+leader).
- Vitesse d'integration = moyenne ponderee (par devenus_membres) des jours entree->membre des cohortes.
- Projection lineaire = total_actuel + velocite x 30 (et x90), bornee a >= total_actuel (jamais de regression fictive).

## SEUILS / SORTIES (alertes de croissance)
- stagnation (moyenne) : taux croissance < seuil_stagnation_pct (def. 2%).
- retention_basse (haute) : retention 30j < seuil_retention_pct (def. 40%).
- chute_nouveaux (haute) : nouveaux_30j en baisse >= seuil_chute_pct vs snapshot precedent (def. 15%).
- antenne_perte_vitesse (haute) : momentum = declin.
- funnel_bloque (moyenne) : conversion funnel < 20% alors que des inscrits existent.
- Garde-fou anti-bruit : aucune alerte si population < min_population (def. 10). Aucune donnee inventee : serie vide -> momentum 'stable', projection = total actuel, alertes vides.

### APIs
- `GET /api/admin/growth?scope=global|nation|antenne&key=CD&window=180` — Renvoie la serie de snapshots + cohortes + intelligence calculee (velocite, momentum, retention, projection, classement territoires, alertes) pour le scope autorise par le role. Garde isAdminRequest + scope nation_responsables. IS_DEMO_MODE early return.
- `POST /api/admin/growth/snapshot` — Declenche le calcul + upsert du snapshot du jour (global via RPC growth_snapshot_run, puis detail funnel par nation/antenne via conversionStage cote app -> growth_snapshot_upsert). Appele par cron quotidien ou bouton admin. Garde admin, rateLimit/clientIp.
- `POST /api/admin/growth/cohorts/refresh` — Recalcule la matrice de cohortes (entrees par mois x territoire, retention M1/M3/M6/M12, vitesse d'integration). Cron hebdomadaire. Garde admin.

### Sécurité
- API gardee par isAdminRequest(req) (admin-auth.ts centralise, plus de repli jeton en prod). POST snapshot/cohorts : meme garde + rateLimit/clientIp.
- PORTEE serveur imposee : le scope demande (nation/antenne) est recoupe avec nation_responsables AVANT toute lecture; un nation_pastor ne peut pas demander scope=global ni un autre pays (override cote serveur, jamais via l'UI). super_admin = scope global libre.
- supabaseAdmin (bypass RLS) confine au serveur uniquement; growth.ts marque 'server-only'. RPC growth_snapshot_run / growth_snapshot_upsert en SECURITY DEFINER avec REVOKE de anon/authenticated -> jamais appelables cote client.
- Tables growth_snapshots / growth_cohorts / growth_alerts : RLS activee SANS policy -> service role only. Aucune PII : uniquement des COMPTAGES agreges (jamais de noms, jamais de contenu de prieres/cure d'ame). v_growth_live n'expose que des totaux.
- Journalisation : chaque consultation scopee ecrit dans sensitive_access_logs (action 'growth_dashboard_view', scope_pays) — meme pipeline que nation/gouvernement.
- Devise : aucune somme financiere ici (croissance = ames), donc pas de risque d'addition multi-devises; si un KPI finance est ajoute il suivra le pattern par-devise de gouvernement/route.ts.

### Scalabilité
- SNAPSHOTS pre-agreges : la vue Croissance lit une SERIE de lignes growth_snapshots (1 ligne/jour/scope) au lieu de scanner profiles (dizaines de milliers de lignes) a chaque visite. Fenetre 180j = ~180 lignes par scope -> reponse instantanee.
- CRON quotidien (CronCreate ou pg_cron / appel POST /api/admin/growth/snapshot) calcule global via RPC growth_snapshot_run, puis l'app calcule le detail funnel par nation/antenne (conversionStage) et upsert via growth_snapshot_upsert. Idempotent (unique snapshot_date+scope+scope_key) -> rejouable sans doublon.
- COHORTES rafraichies en cron hebdomadaire (growth_cohort_refresh / route refresh) — calcul lourd sorti du chemin de requete utilisateur.
- Index : idx_growth_snap_scope (scope, scope_key, snapshot_date desc) sert directement la lecture de serie; idx_growth_cohort pour la matrice; idx_growth_alerts_open pour les alertes ouvertes.
- Le calcul live (snapshot du jour) reutilise le pattern head:true / countIn de nation-stats.ts (count exact sans ramener les lignes). La ventilation funnel borne profiles a .limit() par scope (comme gouvernement/route.ts limite a 5000) et n'est faite qu'au moment du snapshot, pas a chaque requete.
- Cache : reponse API cacheable cote serveur (snapshots immuables une fois ecrits) — un cache memoire 5 min par (scope,key,window) suffit; pagination naturelle par fenetre (window=90/180/365). Multi-pays/multi-antennes : scope_key partitionne les donnees, croissance lineaire avec le nombre de territoires (1 ligne/jour/territoire).

### UX/UI
Onglet "Croissance mondiale" dans le cockpit unique V4 (selecteur de contexte global/nation/antenne reutilise). De haut en bas :
1. Barre KPI instantanee (v_growth_live) : Total ames, Nouveaux 30j, Velocite/jour, Retention 30j, Nouvelles antennes, Pays touches — chaque tuile avec sa pastille de momentum (couleur MOMENTUM_META).
2. Courbe de croissance long terme (180/365j) : total cumule + nouveaux par periode, avec ligne de projection +30/+90j en pointilles (explicitement "projection, pas une promesse").
3. Funnel de conversion Visiteur->Leader : barres ordonnees avec couleurs STAGE_META (coherent avec le module gouvernement), taux de conversion global affiche.
4. Matrice de cohortes : lignes = mois d'entree, colonnes = retention M1/M3/M6/M12 + % devenus membres + vitesse d'integration (jours). Code couleur chaud/froid.
5. Classement des territoires par momentum : nations/antennes triees par ratio de momentum, badge acceleration/declin — clic = drill-down (change le scope).
6. Bandeau "Alertes de croissance" : stagnation, retention basse, chute, antenne en perte de vitesse — chaque alerte cliquable vers le territoire concerne; relie a notify().
Selecteur de fenetre (90/180/365j). Bouton "Rafraichir le snapshot" (admin) pour forcer le calcul du jour. Tout en FR, devise FCFA si un montant apparait. Etat vide explicite : "Pas encore assez d'historique — le premier snapshot sera pris cette nuit" (jamais de fausse courbe).

### Cas pastoraux
- Un pasteur de nation voit que son pays est passe en 'declin' de momentum (velocite recente / 2 = moitie de l'ancienne) -> alerte antenne_perte_vitesse -> il lance une campagne d'evangelisation et un programme d'integration cible.
- Le funnel montre 300 inscrits mais seulement 18% atteignent l'etape Membre (funnel_bloque) -> le responsable d'integration renforce le parcours disciple et le suivi des nouveaux (relie aux alertes nouveau_sans_integration de pastoral-intelligence).
- La cohorte de janvier a une retention M3 de 30% (sous le seuil 40%) -> on identifie que les nouveaux de cette periode n'ont pas ete connectes a une cellule -> action : assignation systematique a un groupe dans les 7 jours.
- Une nouvelle antenne (antennes.created_at < 30j) apparait dans 'Nouvelles antennes' -> le super_admin suit sa velocite de croissance des semaines suivantes pour decider d'y affecter un responsable senior.
- La vitesse d'integration moyenne passe de 45 a 70 jours -> signal que le tunnel ralentit -> revision du parcours_disciple_etape et des contenus de formation initiale.
- Stagnation globale (croissance < 2% sur 90j) malgre un trafic visiteurs eleve -> on rapproche du module gouvernement (pages_convertissantes) pour comprendre ou le visiteur decroche avant l'inscription.
- Comparaison de momentum entre antennes Abidjan / Canada / Europe -> le leadership reaffecte ressources et intercession vers les territoires en ralentissement, et capitalise sur les pratiques des territoires en acceleration.

### Lacunes
- command-center.ts (fondation V4) n'existe pas encore dans le repo : growth.ts est concu pour s'y brancher (croissanceMondialeKpis) mais reste autonome en attendant; a recoller quand V4 livre la lib.
- Le detail du funnel par etape (conversionStage) vit en TypeScript, pas en SQL : le snapshot global est calcule par RPC mais la ventilation Inscrit/Disciple/.../Leader doit etre ecrite par l'app via growth_snapshot_upsert (l'API snapshot fait ce 2e passage). Documente, mais c'est une dependance app<->cron a ne pas oublier.
- growth_cohort_refresh() n'est pas fourni en SQL ici (calcul de retention M1/M3/M6/M12 lourd, croisant analytics_sessions et parcours) : a implementer soit en RPC plpgsql, soit cote app dans la route /cohorts/refresh — a trancher selon le volume reel.
- Le nom de la table d'inscriptions evenements/formations et les valeurs de statut varient selon migrations (event_registrations, inscriptions_formation, statuts 'abandonne'/'termine') : growth.ts doit utiliser les memes try/catch tolerants que gouvernement/route.ts.
- Le cron quotidien doit etre cree (CronCreate ou pg_cron) — non inclus dans la migration; sans lui, les snapshots ne se remplissent pas et la vue reste en etat 'pas assez d'historique'.
- Le scope 'antenne' suppose profiles.antenne_id correctement renseigne (rattachement V4) : tant que les membres ne sont pas relies a une antenne, le drill-down antenne sera partiel — fallback sur pays.
- Aucune migration timestamp n'est posee ici : utiliser un nom > 20260603200000 (ex. 20260603200000_growth_mondiale.sql) conformement a la regle (20260603100000 reserve V4).

<details><summary>SQL (référence)</summary>

```sql
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
```
</details>

<details><summary>Code clé (référence)</summary>

```typescript
// =====================================================================
// src/lib/growth-intelligence.ts — INTELLIGENCE DE CROISSANCE (logique PURE)
// ---------------------------------------------------------------------
// Aucune I/O. Transforme une SERIE de snapshots reels (growth_snapshots)
// en velocite, momentum, retention, vitesse d'integration, projection et
// alertes de croissance. Reutilise STAGE_META (Visiteur->Leader) sans le
// redefinir. Aucune donnee inventee : sans serie reelle, momentum = neutre.
// =====================================================================
import { STAGE_META, type ConversionStage } from './pastoral-intelligence'

export interface GrowthSnapshot {
  snapshot_date: string
  total_profils: number
  nouveaux_jour: number
  nouveaux_7j: number
  nouveaux_30j: number
  actifs_30j: number
  c_inscrit: number; c_disciple: number; c_membre: number; c_serviteur: number; c_leader: number
  antennes_total: number; antennes_nouvelles_30j: number; pays_touches: number
}

export interface GrowthCohort {
  cohort_month: string; taille: number
  retenus_m1: number; retenus_m3: number; retenus_m6: number; retenus_m12: number
  devenus_membres: number; jours_integration_moy: number
}

export type MomentumLevel = 'acceleration' | 'croissance' | 'stable' | 'ralentissement' | 'declin'
export const MOMENTUM_META: Record<MomentumLevel, { label: string; color: string }> = {
  acceleration:   { label: 'Acceleration', color: '#22C55E' },
  croissance:     { label: 'Croissance',   color: '#84CC16' },
  stable:         { label: 'Stable',       color: '#EAB308' },
  ralentissement: { label: 'Ralentissement', color: '#F59E0B' },
  declin:         { label: 'Declin',       color: '#EF4444' },
}

/** Taux de croissance net sur la fenetre (premier->dernier snapshot), en %. */
export function growthRatePct(series: GrowthSnapshot[]): number {
  if (series.length < 2) return 0
  const first = series[0].total_profils
  const last = series[series.length - 1].total_profils
  if (first <= 0) return last > 0 ? 100 : 0
  return Math.round(((last - first) / first) * 1000) / 10
}

/** Velocite = nouvelles ames par jour (moyenne sur la fenetre). */
export function velocityPerDay(series: GrowthSnapshot[]): number {
  if (series.length < 2) return 0
  const days = Math.max(1, daysBetween(series[0].snapshot_date, series[series.length - 1].snapshot_date))
  const added = series[series.length - 1].total_profils - series[0].total_profils
  return Math.round((added / days) * 10) / 10
}

/** Momentum = comparaison velocite recente (2nd moitie) vs ancienne (1ere moitie). */
export function momentum(series: GrowthSnapshot[]): { level: MomentumLevel; ratio: number } {
  if (series.length < 4) return { level: 'stable', ratio: 1 }
  const mid = Math.floor(series.length / 2)
  const recent = velocityPerDay(series.slice(mid))
  const older = velocityPerDay(series.slice(0, mid + 1))
  const ratio = older <= 0 ? (recent > 0 ? 2 : 1) : Math.round((recent / older) * 100) / 100
  let level: MomentumLevel = 'stable'
  if (ratio >= 1.3) level = 'acceleration'
  else if (ratio >= 1.05) level = 'croissance'
  else if (ratio <= 0.7) level = 'declin'
  else if (ratio < 0.95) level = 'ralentissement'
  return { level, ratio }
}

/** Retention reelle = part des profils vus (session) sur 30j (dernier snapshot). */
export function retentionPct(s: GrowthSnapshot): number {
  if (!s || s.total_profils <= 0) return 0
  return Math.round((s.actifs_30j / s.total_profils) * 100)
}

/** Taux de conversion du funnel : part atteignant l'etape membre ou +. */
export function funnelConversionPct(s: GrowthSnapshot): number {
  const reached = s.c_membre + s.c_serviteur + s.c_leader
  const base = s.c_inscrit + s.c_disciple + reached
  return base > 0 ? Math.round((reached / base) * 100) : 0
}

/** Funnel ordonne Visiteur->Leader (reutilise STAGE_META, exclut le visiteur anonyme). */
export function funnelStages(s: GrowthSnapshot): { stage: ConversionStage; label: string; color: string; n: number }[] {
  const map: Record<string, number> = {
    inscrit: s.c_inscrit, disciple: s.c_disciple, membre: s.c_membre, serviteur: s.c_serviteur, leader: s.c_leader,
  }
  return (['inscrit', 'disciple', 'membre', 'serviteur', 'leader'] as ConversionStage[])
    .map((st) => ({ stage: st, label: STAGE_META[st].label, color: STAGE_META[st].color, n: map[st] || 0 }))
}

/** Projection lineaire du total a +30/90j sur la velocite recente (explicable, sans ML). */
export function projection(series: GrowthSnapshot[]): { j30: number; j90: number } {
  if (!series.length) return { j30: 0, j90: 0 }
  const last = series[series.length - 1].total_profils
  const v = velocityPerDay(series)
  return { j30: Math.max(last, Math.round(last + v * 30)), j90: Math.max(last, Math.round(last + v * 90)) }
}

/** Vitesse d'integration moyenne (jours entree->membre) ponderee par cohorte. */
export function integrationSpeedDays(cohorts: GrowthCohort[]): number {
  const sized = cohorts.filter((c) => c.devenus_membres > 0)
  if (!sized.length) return 0
  const tot = sized.reduce((a, c) => a + c.jours_integration_moy * c.devenus_membres, 0)
  const n = sized.reduce((a, c) => a + c.devenus_membres, 0)
  return n ? Math.round(tot / n) : 0
}

export interface GrowthAlert { type: string; severite: 'haute' | 'moyenne' | 'info'; detail: string; valeur: number }

/** Alertes de croissance a partir de la serie + seuils config (aucun bruit < min_population). */
export function growthAlerts(
  series: GrowthSnapshot[],
  cfg: { seuil_stagnation_pct: number; seuil_retention_pct: number; seuil_chute_pct: number; min_population: number },
): GrowthAlert[] {
  const out: GrowthAlert[] = []
  if (!series.length) return out
  const last = series[series.length - 1]
  if (last.total_profils < cfg.min_population) return out
  const rate = growthRatePct(series)
  if (rate < cfg.seuil_stagnation_pct) out.push({ type: 'stagnation', severite: 'moyenne', detail: `Croissance ${rate}% sur la periode`, valeur: rate })
  const ret = retentionPct(last)
  if (ret < cfg.seuil_retention_pct) out.push({ type: 'retention_basse', severite: 'haute', detail: `Retention 30j a ${ret}%`, valeur: ret })
  if (series.length >= 2) {
    const prev = series[Math.max(0, series.length - 2)].nouveaux_30j
    const cur = last.nouveaux_30j
    if (prev > 0) { const drop = Math.round(((prev - cur) / prev) * 100); if (drop >= cfg.seuil_chute_pct) out.push({ type: 'chute_nouveaux', severite: 'haute', detail: `Nouveaux en baisse de ${drop}%`, valeur: drop }) }
  }
  const m = momentum(series)
  if (m.level === 'declin') out.push({ type: 'antenne_perte_vitesse', severite: 'haute', detail: `Momentum en declin (x${m.ratio})`, valeur: m.ratio })
  const fc = funnelConversionPct(last)
  if (last.c_inscrit > 0 && fc < 20) out.push({ type: 'funnel_bloque', severite: 'moyenne', detail: `Seulement ${fc}% atteignent l'etape membre`, valeur: fc })
  return out
}

function daysBetween(a: string, b: string): number {
  const da = Date.parse(a), db = Date.parse(b)
  if (isNaN(da) || isNaN(db)) return 1
  return Math.max(1, Math.round((db - da) / 86_400_000))
}

// =====================================================================
// src/app/api/admin/growth/route.ts — API CROISSANCE MONDIALE (scope serveur)
// =====================================================================
// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'
// import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
// import { isAdminRequest } from '@/lib/admin-auth'
// import { buildGrowth } from '@/lib/growth'
// export const runtime = 'nodejs'
// export const dynamic = 'force-dynamic'
// export async function GET(req: NextRequest) {
//   if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorise.' }, { status: 401 })
//   if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
//   const sp = req.nextUrl.searchParams
//   const scope = (sp.get('scope') || 'global') as 'global' | 'nation' | 'antenne'
//   const key = (sp.get('key') || 'ALL').trim()
//   const windowDays = Math.min(Number(sp.get('window')) || 180, 365)
//   try {
//     const data = await buildGrowth(scope, key, windowDays) // applique growth-intelligence
//     return NextResponse.json({ ok: true, data })
//   } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
// }
```
</details>

---

## VISION MONDIALE DE L'ŒUVRE
**Réutilise :** src/lib/nation-stats.ts — nationStats(scopePays) et listNations() : source des agrégats par nation (inscrits, membres, responsables, prieres, cure_ame, dons, formations, live_views, evenements). La RPC mondiale reproduit ces comptages en SQL pur pour l'échelle, mais la forme NationStats reste le contrat partagé.; table antennes (migration 20260602270000) — nom, slug, pays, ville, fuseau, devise, responsable_id, parent_id (hiérarchie), actif. Profiles.antenne_id, dons.antenne_id, evenements.antenne_id déjà rattachés. La vue mondiale agrège PAR antenne_id ET PAR pays.; src/app/api/admin/cartographie/route.ts — arbre pays→ville→responsables→familles déjà bâti à partir de profiles ; réutilisé tel quel pour la dimension géographique de la mappemonde (le nouveau endpoint /world le complète avec dons/prières/formations + deltas).; src/app/api/admin/international/route.ts — agrégats par pays + croissance mensuelle (12 mois) + visiteurs ; modèle exact de réponse {ok, nations, croissance, totaux} et conventions de garde isAdminRequest.; src/lib/pastoral-intelligence.ts — conversionStage() (Visiteur→…→Leader) réutilisé pour compter les DISCIPLES et LEADERS mondiaux ; ENGAGEMENT/ALERT meta réutilisés pour colorer la santé par nation.; src/lib/admin-auth.ts — isAdminRequest(req) : garde unique des routes /api/admin/*.; src/lib/roles.ts — ADMIN_ROLES / isAdmin() + enum user_role (super_admin, nation_pastor) pour la portée par rôle.; src/lib/supabase.ts — supabaseAdmin (service role, bypass RLS) + IS_DEMO_MODE early return.

### Architecture
## Composants

```
┌──────────────────────────────────────────────────────────────┐
│  CONSOLE MONDIALE  /admin/monde  (client, multi-contexte)      │
│  KPIs globaux + deltas │ Mappemonde+arbre │ Momentum/tendances │
└───────────────┬───────────────────────────┬──────────────────┘
                │ GET                        │ GET (filtre ?scope=)
        /api/admin/world-overview     /api/admin/world-trends
                │                            │
        ┌───────┴────────────┐       ┌───────┴───────────┐
        │ world-intelligence │       │  (mêmes libs)     │
        │  (lib PURE: deltas,│       └───────────────────┘
        │  vélocité, momentum│
        └───────┬────────────┘
                │ appelle
        ┌───────┴──────────────────────────────────────────┐
        │  RPC public.world_overview(p_scope)  [SQL, 1 RT]  │
        │  agrège profiles+antennes+dons+prieres+formations │
        │  + diff vs dernier snapshot                       │
        └───────┬───────────────────────────────────────────┘
                │ lit
        ┌───────┴───────────────────────────────────────────┐
        │  world_daily_snapshots (NOUVEAU) — 1 ligne/jour    │
        │     /pays + 1 ligne/jour /antenne + 1 ligne MONDE  │
        │  alimentée par RPC public.capture_world_snapshot() │
        │  déclenchée par cron quotidien (POST gardé)        │
        └────────────────────────────────────────────────────┘
```

## Flux

1. TEMPS RÉEL (lecture) : la console appelle /api/admin/world-overview → RPC world_overview() renvoie en UN aller-retour les totaux mondiaux VIVANTS (count(*) sur profiles/dons/...) + la photo du dernier snapshot pour calculer les deltas. world-intelligence.ts (pur) transforme {snapshot_actuel_vivant, snapshot_J-1, J-7, J-30} en deltas %, vélocité hebdo et statut momentum par nation/antenne.

2. HISTORIQUE (tendances) : /api/admin/world-trends lit directement world_daily_snapshots (déjà agrégé, indexé par jour) → séries temporelles légères, aucune agrégation lourde au moment de la requête.

3. CAPTURE (cron) : un job quotidien (cron Supabase / Vercel / PlanetHoster) appelle POST /api/admin/world-snapshot (gardé par CRON_SECRET + isAdminRequest fallback) qui exécute capture_world_snapshot() : une nuit = N lignes (1 monde + 1 par pays + 1 par antenne actif). Idempotent sur (snapshot_date, scope_type, scope_key).

## Agrégation transverse
Le point clé : world_overview() ne boucle pas en mémoire (anti-pattern des routes actuelles qui font select('*') puis comptent en JS — non tenable à 100k). Elle agrège côté SQL via GROUP BY + filtered count, et joint antennes/profiles.antenne_id. La dimension MONDE = somme sur toutes les nations ; la dimension NATION et ANTENNE = même requête filtrée. Un seul modèle, trois niveaux de zoom.

## Intégration à la console mondiale (Centre de Commandement)
Cette brique est la VUE D'ENSEMBLE (l'altitude la plus haute) du cockpit unique V4. Elle réutilise le sélecteur de contexte global/antenne/nation : scope=monde (défaut super_admin), scope=pays:CI, scope=antenne:abidjan. Elle alimente la « home » du commandement ; les autres briques V5 (intelligence pastorale, alertes, finance) s'ouvrent par drill-down depuis chaque nation/antenne de la mappemonde. command-center.ts (fondation V4) peut importer worldOverview() pour son bandeau KPI ; réciproquement la console mondiale lie chaque nation à /admin/nation?pays= et chaque antenne à son cockpit scopé.

### Modèle d'intelligence
## Signaux d'entrée (100% réels, déjà en base — zéro donnée inventée)
- profiles : count par role / membre_statut / parcours_etape / pays / antenne_id / created_at → inscrits, membres, disciples (parcours_etape >= 5 OU membre_statut='disciple'), leaders, responsables, nouveaux_30j, répartition géographique.
- dons (statut='complete') : count + sum(montant) par pays (via user_id→profiles) et par antenne_id.
- priere_demandes (pays) : prières mondiales et par nation.
- delivrance_demandes : ÂMES TOUCHÉES — comptage GLOBAL seul (jamais nominatif, jamais filtré par scope pour éviter d'exposer des cas sensibles isolés).
- inscriptions_formation : count formations.
- evenements / antennes : événements et nb d'antennes actives.
- world_daily_snapshots : la mémoire historique (1 photo/jour/scope).

## Formules (toutes dans world-intelligence.ts, pures)
- deltaPct(current, prev) = (current - prev) / prev * 100, bornée (prev=0 → 100% si current>0 sinon 0). Arrondie au dixième.
- weeklyVelocity = (current - prev) / days * 7 : membres gagnés/semaine, lisse les fenêtres.
- momentumFromGrowth(growthPct%) sur croissance membres 30j :
  - >= 15% → forte_croissance ; >= 3% → croissance ; (-3%,3%) → stable ; (-15%,-3%] → ralentissement ; <= -15% → décroissance.
- buildWorldKpis : pour chaque métrique (membres, disciples, dons, âmes, formations, prières) renvoie valeur vivante + delta vs snapshot J-7 et J-30 (le snapshot le plus récent <= date cible ; si absent → delta 0, jamais d'invention).
- rankByMomentum : classe nations/antennes par growthPct puis taille → le commandement voit en haut les foyers en explosion et les décrochages.

## Sorties
- Bloc KPI mondial (6 chiffres + flèches de tendance colorées).
- Mappemonde : chaque nation portée par sa taille (membres) et colorée par son momentum.
- Classement vélocité : top nations/antennes en croissance ET en alerte de décroissance (signal pastoral d'expansion ou de repli).
- Le statut momentum n'est calculé que si un snapshot de référence existe ; sinon « données historiques en cours de constitution » (honnête à J+1 du déploiement, fiable dès J+8 / J+31).

### APIs
- `GET /api/admin/world-overview` — KPIs mondiaux vivants + répartition par nation/antenne + deltas calculés vs derniers snapshots (J-1, J-7, J-30). Query: ?scope=monde|pays:CI|antenne:<slug>. Gardé isAdminRequest, journalisé sensitive_access_logs, IS_DEMO_MODE early return.
- `GET /api/admin/world-trends` — Séries temporelles historiques (membres, dons, ames, prieres, formations) sur 30/90/365j lues depuis world_daily_snapshots, + classement des nations/antennes par vélocité de croissance. Query: ?scope=&metric=&days=. Gardé isAdminRequest.
- `POST /api/admin/world-snapshot` — Déclenche capture_world_snapshot() pour current_date (idempotent). Gardé par CRON_SECRET (header x-cron-secret) OU isAdminRequest, rateLimit/clientIp. Appelé par le cron quotidien.

### Sécurité
## Portée serveur stricte
- Tout calcul transite par /api/admin/* gardé par isAdminRequest(req) (cookie cier_admin === ADMIN_SESSION_TOKEN ; aucun repli en prod). supabaseAdmin (service role) jamais importé côté client ; world-intelligence.ts est PUR donc sûr des deux côtés mais n'est nourri que par les routes.
- RPC world_overview / capture_world_snapshot en SECURITY DEFINER + search_path figé, appelées via service role uniquement. Aucun GRANT à anon/authenticated.
- Table world_daily_snapshots : RLS activée, AUCUNE policy → service role only (donnée stratégique agrégée). Cohérent avec la règle « données sensibles = service role + journal ».

## Portée par rôle (multi-contexte V4)
- scope=monde : réservé super_admin / nation_pastor global. La route lit le rôle du contexte admin et restreint le scope_key autorisé (un responsable d'antenne ne peut demander que son antenne ; un pasteur de nation que son pays). Le filtrage est appliqué côté serveur AVANT l'appel RPC (p_scope_type/p_scope_key forcés), jamais selon un paramètre client de confiance.

## Données sensibles
- ÂMES (delivrance_demandes) : agrégat global anonyme seulement, jamais ventilé par petit scope (anti-réidentification). Aucune ligne nominative ne quitte la RPC (count/sum uniquement).
- Toute consultation mondiale insère une ligne sensitive_access_logs (role, scope, action='world_overview_view').

## Écriture / cron
- POST /api/admin/world-snapshot protégé par CRON_SECRET (header) + rateLimit/clientIp ; idempotent (upsert sur unique (date,scope_type,scope_key)) donc un rejeu ne fausse rien.

### Scalabilité
## Tenir 10k–100k membres, multi-pays
- Anti-pattern écarté : les routes actuelles (international, gouvernement) font select('*') puis comptent en JavaScript — O(N) en mémoire Node, non tenable. world_overview() agrège côté SQL (count filtered + GROUP BY + sum), 1 seul aller-retour, exploitant les index existants idx_profiles_pays_statut, idx_dons_statut_devise, idx_profiles_created, idx_profiles_antenne. À 100k profils, ces comptages restent sub-seconde.
- Snapshots quotidiens = matérialisation des tendances : /api/admin/world-trends ne recalcule JAMAIS l'historique, il lit world_daily_snapshots déjà agrégé (≈ 1 + nb_pays + nb_antennes lignes/jour ≈ quelques dizaines/jour → quelques milliers/an, trivial), indexé par (scope_type, scope_key, snapshot_date desc).
- Cron quotidien (Supabase pg_cron / Vercel Cron / PlanetHoster) appelle capture_world_snapshot() la nuit ; coût = quelques agrégats, hors heures de pointe. Idempotent → rejouable.
- Cache : la console peut mettre en cache l'overview 30–60 s côté route (les snapshots étant la source des tendances, le vivant n'a pas besoin d'être à la seconde). Réponses JSON légères (pas de PII, listes plafonnées limit 200).
- Pagination : nations/antennes plafonnées à 200 dans la RPC (largement au-dessus du réel) ; le détail par nation se fait par drill-down vers /api/admin/nation?pays= déjà paginé.
- Évolution naturelle : la même RPC pourra être promue en vue matérialisée rafraîchie par le cron si le nombre d'antennes explose, sans changer le contrat d'API.

### UX/UI
## Console mondiale — /admin/monde (la « home » du Centre de Commandement)
- Sélecteur de contexte en tête (réutilise le pattern multi-contexte V4) : Monde (défaut) / Nation / Antenne. Change ?scope= et re-fetch.
- Bandeau KPIs mondiaux : 6 cartes (Membres, Disciples, Dons cumulés FCFA, Âmes touchées, Formations, Prières) chacune avec sa valeur vivante + flèche de tendance colorée (vert/rouge) et delta % vs 7j / 30j. Réutilise PageHeader + le style des cartes existantes (admin/international, admin/gouvernement).
- Mappemonde / arbre géographique : à gauche une carte (ou, sans dépendance carto lourde, un arbre pays→ville→antenne déjà fourni par /api/admin/cartographie) ; chaque nation dimensionnée par membres et colorée par MOMENTUM_META. Clic = drill-down vers le cockpit de la nation (/admin/nation?pays=) ou de l'antenne.
- Momentum mondial : GrowthChart (recharts lazy, déjà utilisé en international) — courbes historiques (membres, dons, âmes) lues depuis world-trends. Sélecteur 30/90/365j.
- Classements : « Nations en croissance » (top vélocité, vert) et « Foyers à soutenir » (décroissance, rouge) — deux colonnes lisibles pour décider où envoyer renforts/intercession.
- États honnêtes : tant que les snapshots se constituent, les deltas affichent « historique en cours de constitution » plutôt qu'un faux 0. Loader2 + skeletons comme les pages existantes. IS_DEMO_MODE → bandeau démo.
- FR partout, devise FCFA par défaut (dons multi-devises normalisés/étiquetés).

### Cas pastoraux
- Le Pasteur principal ouvre /admin/monde au réveil : en 1 écran il voit que l'œuvre compte X membres dans N nations, que les dons mondiaux ont progressé de +12% sur 30j, et que 340 âmes ont été touchées ce mois — vision d'ensemble immédiate pour le rapport au conseil.
- La mappemonde colore la Côte d'Ivoire en vert vif (forte croissance) et le Canada en orange (ralentissement) : le commandement décide d'envoyer un renfort d'intercession et un responsable d'intégration sur l'antenne Canada avant que le décrochage ne s'installe.
- Le classement vélocité révèle une antenne nouvellement ouverte qui gagne 25 membres/semaine : on capitalise (témoignage, ressources, formation des leaders locaux) pour amplifier le mouvement.
- Les courbes historiques montrent un plateau des disciples (parcours_etape >= 5) malgré la hausse des inscrits : signal que le tunnel d'intégration sature quelque part — le pasteur ouvre le drill-down nation pour investiguer le parcours.
- Avant une campagne mondiale de prière, le responsable consulte les prières par nation pour cibler les pays où les demandes explosent et affecter les intercesseurs en conséquence.
- Le snapshot quotidien permet, en fin de trimestre, de produire une tendance fiable (dons, membres, âmes) sur 90j par nation — preuve de fruit pour les partenaires, sans reconstituer l'historique à la main.
- Un pasteur de nation (rôle scopé) n'accède qu'à son pays : il pilote ses antennes et villes, voit son propre momentum, sans jamais voir les données globales réservées au super_admin — gouvernance respectée.

### Lacunes
- Normalisation multi-devises : dons_total somme des montants bruts (FCFA/CAD/EUR mêlés). Pour un total mondial juste il faut une table de taux de change (taux_change) et convertir en devise pivot ; affiché pour l'instant par devise + total brut étiqueté. À ajouter en V5.1 (table additive taux_change + colonne dons_total_fcfa dans les snapshots).
- Géocodage carte : la mappemonde suppose des codes pays cohérents dans profiles.pays. Beaucoup de profils ont pays='Non renseigné' ; un job de normalisation (ville→pays) améliorerait la précision géographique. flags.ts/flagOf gère déjà l'affichage drapeau quand le code est propre.
- Âmes touchées = count(delivrance_demandes) : proxy raisonnable mais à confirmer comme définition métier de « âme » (vs conversions/baptêmes). Si une table conversions/baptemes existe ou doit naître, brancher dessus.
- Le premier jour après déploiement, aucun snapshot historique → deltas/momentum indisponibles (état honnête affiché). Tendances 7j fiables à J+8, 30j à J+31. Possibilité d'amorcer un backfill partiel via international (croissance mensuelle profiles) mais seuls inscrits/membres seraient reconstituables, pas dons/prières historiques.
- Le scope par rôle dans la route suppose la fondation V4 (RBAC scopé) disponible pour résoudre le rôle/affectation de l'admin courant ; le code livré force le scope mais le mapping rôle→scope autorisé doit s'appuyer sur command-center.ts / nation_responsables une fois V4 mergé.
- Pas de Realtime sur les KPIs mondiaux (volontaire, pour la charge) : rafraîchissement manuel/polling 30–60s. Si un live mondial est souhaité, brancher un canal Supabase Realtime agrégé plus tard.

<details><summary>SQL (référence)</summary>

```sql
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
```
</details>

<details><summary>Code clé (référence)</summary>

```typescript
// ============================================================================
// src/lib/world-intelligence.ts — INTELLIGENCE MONDIALE, logique PURE (zéro I/O)
// Transforme l'agrégat vivant + les snapshots historiques en deltas, vélocité
// et statut de momentum par nation/antenne. Testable, réutilisable serveur+client.
// ============================================================================

/** Totaux mondiaux consolidés (forme renvoyée par la RPC world_overview). */
export interface WorldTotals {
  inscrits: number; membres: number; responsables: number; leaders: number
  disciples: number; nouveaux_30j: number; nations: number; antennes: number
  prieres: number; ames: number; formations: number
  dons_count: number; dons_total: number; evenements: number
}

/** Photo agrégée (un snapshot quotidien OU l'état vivant courant). */
export interface WorldSnapshot {
  snapshot_date: string
  membres: number; inscrits: number; dons_total: number
  ames: number; prieres: number; formations: number
}

export type Momentum = 'forte_croissance' | 'croissance' | 'stable' | 'ralentissement' | 'decroissance'

export const MOMENTUM_META: Record<Momentum, { label: string; color: string; order: number }> = {
  forte_croissance: { label: 'Forte croissance', color: '#22C55E', order: 0 },
  croissance:       { label: 'Croissance',        color: '#84CC16', order: 1 },
  stable:           { label: 'Stable',            color: '#EAB308', order: 2 },
  ralentissement:   { label: 'Ralentissement',    color: '#F59E0B', order: 3 },
  decroissance:     { label: 'Décroissance',      color: '#EF4444', order: 4 },
}

/** Variation relative bornée (en %), nulle si base 0 et valeur 0. */
export function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** Delta absolu + relatif d'une métrique entre l'état courant et un snapshot passé. */
export interface MetricDelta { current: number; previous: number; abs: number; pct: number }
export function metricDelta(current: number, previous: number): MetricDelta {
  return { current, previous, abs: current - previous, pct: deltaPct(current, previous) }
}

/** Statut de momentum d'une nation/antenne à partir de sa croissance membres % sur 30j. */
export function momentumFromGrowth(growthPct: number): Momentum {
  if (growthPct >= 15) return 'forte_croissance'
  if (growthPct >= 3) return 'croissance'
  if (growthPct > -3) return 'stable'
  if (growthPct > -15) return 'ralentissement'
  return 'decroissance'
}

/** Vélocité hebdomadaire = membres gagnés par semaine sur la fenêtre observée. */
export function weeklyVelocity(current: number, previous: number, days: number): number {
  if (days <= 0) return 0
  return Math.round(((current - previous) / days) * 7 * 10) / 10
}

/** Construit le bloc KPI mondial : valeur + delta vs J-1 / J-7 / J-30 (snapshots réels). */
export interface KpiTrend { label: string; key: keyof WorldTotals; value: number; d7: MetricDelta; d30: MetricDelta }

export function buildWorldKpis(
  totals: WorldTotals,
  snap7?: Partial<WorldTotals> | null,
  snap30?: Partial<WorldTotals> | null,
): KpiTrend[] {
  const KEYS: { key: keyof WorldTotals; label: string }[] = [
    { key: 'membres', label: 'Membres' },
    { key: 'disciples', label: 'Disciples' },
    { key: 'dons_total', label: 'Dons (cumul)' },
    { key: 'ames', label: 'Âmes touchées' },
    { key: 'formations', label: 'Formations' },
    { key: 'prieres', label: 'Prières' },
  ]
  return KEYS.map(({ key, label }) => {
    const v = Number(totals[key] ?? 0)
    return {
      label, key, value: v,
      d7:  metricDelta(v, Number(snap7?.[key] ?? v)),
      d30: metricDelta(v, Number(snap30?.[key] ?? v)),
    }
  })
}

/** Classe les nations/antennes par momentum (croissance membres sur fenêtre). */
export interface ScopeRow { key: string; label: string; pays: string | null; membres: number; membres_prev: number }
export interface RankedScope extends ScopeRow { growthPct: number; velocity: number; momentum: Momentum }

export function rankByMomentum(rows: ScopeRow[], days: number): RankedScope[] {
  return rows
    .map((r) => {
      const growthPct = deltaPct(r.membres, r.membres_prev)
      return { ...r, growthPct, velocity: weeklyVelocity(r.membres, r.membres_prev, days), momentum: momentumFromGrowth(growthPct) }
    })
    .sort((a, b) => b.growthPct - a.growthPct || b.membres - a.membres)
}

// ============================================================================
// src/app/api/admin/world-overview/route.ts — drop-in (conventions Citadelle)
// ============================================================================
/*
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { buildWorldKpis, rankByMomentum, type WorldTotals } from '@/lib/world-intelligence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseScope(raw: string | null): { type: string; key: string } {
  if (!raw || raw === 'monde') return { type: 'monde', key: '*' }
  const [type, key] = raw.split(':')
  return { type: type === 'pays' || type === 'antenne' ? type : 'monde', key: key || '*' }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  const { type, key } = parseScope(req.nextUrl.searchParams.get('scope'))
  try {
    await supabaseAdmin.from('sensitive_access_logs').insert({
      role: 'super_admin', scope_pays: type === 'pays' ? key : type, action: 'world_overview_view',
    })
  } catch {}

  // 1 aller-retour : agrégat mondial vivant
  const { data: live } = await supabaseAdmin.rpc('world_overview', { p_scope_type: type, p_scope_key: key })
  const totals = (live?.totaux ?? {}) as WorldTotals

  // Snapshots historiques (J-7, J-30) pour les deltas
  const { data: snaps } = await supabaseAdmin
    .from('world_daily_snapshots')
    .select('snapshot_date, membres, disciples, dons_total, ames, prieres, formations')
    .eq('scope_type', type).eq('scope_key', key)
    .order('snapshot_date', { ascending: false }).limit(40)

  const pick = (daysAgo: number) => {
    const target = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10)
    return (snaps || []).find((s: any) => s.snapshot_date <= target) || null
  }
  const kpis = buildWorldKpis(totals, pick(7), pick(30))

  return NextResponse.json({
    ok: true, scope: { type, key }, totals, kpis,
    nations: live?.nations ?? [], antennes: live?.antennes_list ?? [],
    generated_at: live?.generated_at,
  })
}
*/

```
</details>

---

## Santé spirituelle mondiale
**Réutilise :** src/lib/pastoral-intelligence.ts — PUR, réutilisé tel quel : engagementLevel (6 paliers), ENGAGEMENT_META (label/color/order), conversionStage, STAGE_META, memberAlerts/ALERT_META, lastActivityDays, engagementScore. AUCUNE duplication de logique : l'indice se DÉRIVE de cette sortie.; src/lib/pastoral-prediction.ts — churnRisk/needsFollowUp réutilisés pour pondérer la détection de déclin (part de membres à risque par zone).; Pipeline de construction MemberIntel déjà éprouvé dans src/app/api/admin/gouvernement/route.ts (profiles + analytics_sessions + analytics_events + priere_demandes + inscriptions_formation + event_registrations + dons) — extrait dans un builder partagé pour éviter la divergence.; antennes (id, nom, slug, pays, parent_id, devise, responsable_id) + profiles.antenne_id (migration 20260602270000) — clés d'agrégation hiérarchique antenne→nation→monde.; RBAC : src/lib/admin-auth.ts (isAdminRequest), nation_responsables (portée par pays), sensitive_access_logs (journalisation des consultations sensibles), src/lib/roles.ts (ADMIN_ROLES/isAdmin).; src/lib/nation-stats.ts (countIn, listNations) pour l'inventaire des nations et les head-counts exacts.; src/lib/supabase.ts (supabaseAdmin bypass RLS, IS_DEMO_MODE early return). src/lib/rate-limit.ts + clientIp pour la route d'écriture/snapshot.; Conventions migrations : idempotent/additif, RLS, FCFA, snake_case, commentaires FR. Index composites de 20260602250000 déjà en place pour les agrégats.

### Architecture
## Composants
1. **Lib PURE `src/lib/spiritual-health.ts`** (sans I/O, server+client safe) : transforme une *distribution de paliers d'engagement* + *distribution de stages* + *compteurs d'alertes* en un **indice 0-100** (`healthIndex`), une **bande de santé** (`healthBand`: florissant/sain/fragile/declin/critique), et un **diagnostic de déclin** (`declineSignal`). C'est la seule source de la formule. Réutilise ENGAGEMENT_META/ALERT_META de pastoral-intelligence.
2. **Builder partagé `src/lib/member-intel-build.ts`** (server-only) : factorise l'assemblage MemberIntel déjà présent dans gouvernement/route.ts (profiles+analytics+prières+formations+events+dons) en `buildMemberIntel(scopePays?, antenneId?)`. Évite la divergence de calcul entre le cockpit pastoral et la santé mondiale.
3. **Agrégateur `src/lib/spiritual-health-server.ts`** (server-only) : appelle le builder, calcule par membre engagementLevel/conversionStage/memberAlerts (PUR), puis ROLLUP hiérarchique : zone membre→antenne→nation→monde. Produit les nodes de heatmap, lit le dernier snapshot pour la tendance/déclin, et — en écriture — persiste un nouveau snapshot.
4. **API lecture `GET /api/admin/sante-mondiale`** : heatmap multi-échelle + tendances + zones en déclin, portée par rôle.
5. **API snapshot `POST /api/admin/sante-mondiale/snapshot`** : déclenchée par cron, fige l'indice de chaque zone dans spiritual_health_snapshots et lève des spiritual_health_alerts de déclin.
6. **Vue SQL `v_health_zone_members`** + **RPC `aggregate_spiritual_health(scope, depuis)`** : agrégation par paliers déléguée à Postgres pour l'échelle (évite de charger 50k profils en mémoire à chaque appel cockpit).

## Flux
profiles+signaux → buildMemberIntel → [PUR] engagementLevel/stage/alerts par membre → rollup (Map antenne→nation→monde) → healthIndex/healthBand par zone → comparaison au dernier snapshot (declineSignal) → JSON {monde, nations[], antennes[], heatmap, tendance, declin}. Le cron POST persiste le rollup courant comme snapshot (granularité jour) → tendance se construit dans le temps.

## Agrégation transverse
L'indice est calculable à TOUT niveau car la fonction healthIndex prend une simple distribution {tres_engage,...,inactif} + alertes : on agrège les distributions en remontant la hiérarchie antennes.parent_id (antenne→antenne mère→nation→monde) puis on applique la même formule. Monde = somme des distributions de toutes les nations. Cohérence garantie (un seul calcul, plusieurs portées).

## Intégration à la console mondiale (V4)
command-center.ts importe `worldSpiritualHealth()` et expose l'indice monde + top 3 zones en déclin comme tuile prioritaire du cockpit unique (global/antenne/nation), réutilisant le sélecteur de contexte V4 (?scope=monde|nation:CD|antenne:abidjan).

### Modèle d'intelligence
## Signaux d'entrée RÉELS (aucune donnée inventée)
Par membre, via buildMemberIntel (déjà collecté par le cockpit pastoral) : sessions analytics (connexions, last_seen, active_days_30, total_duration), événements analytics (lives, downloads), priere_demandes (prieres, prieres_sans_suivi), inscriptions_formation (formations, abandons), event_registrations (events), dons complétés, profiles (derniere_connexion, created_at, parcours_etape, antenne_id, pays). Un membre sans signal réel reste a_suivre/inactif (règle existante respectée).

## Chaîne de calcul (réutilise le PUR)
1. Par membre → `engagementLevel(m, now)` (6 paliers, récence prioritaire) + `conversionStage(m)` + `memberAlerts(m, now)`. AUCUNE nouvelle heuristique d'engagement : la santé est strictement DÉRIVÉE.
2. Rollup : on incrémente la LevelDistribution de l'antenne du membre (profiles.antenne_id) puis on remonte antennes.parent_id → nation (pays) → monde, via addDistribution. Les alertes hautes sont comptées par zone.
3. Par zone → `healthIndex(distribution, weights, alertesHautes)` = moyenne pondérée des paliers (poids configurables 100/80/60/40/15/0), minorée d'une pénalité bornée (≤12 pts) sur la densité d'alertes hautes. Échelle 0-100.
4. `healthBand(indice)` → florissant≥75, sain≥60, fragile≥45, declin≥30, critique<30 (seuils en config).
5. `fragilePart` = % (inactif+en_risque), détecteur primaire de déclin indépendant de l'historique.

## Prédiction / tendance / déclin
- Tendance : à chaque snapshot quotidien on fige indice+distribution par zone (spiritual_health_snapshots). La sparkline = 12 dernières périodes ; la pente (régression simple ou delta dernier-vs-N) donne la trajectoire.
- `declineSignal(distribution, indice, indicePrecedent, alertesHautes)` lève une zone EN DÉCLIN si : chute ≥ declin_chute_pts vs snapshot précédent (severite haute), OU part fragile ≥ declin_part_max (35% par défaut), OU densité d'alertes hautes ≥25%. Garde-fou taille_min_zone (5) pour ne pas alarmer sur micro-antennes.
- Pondération du risque : churnRisk/needsFollowUp (pastoral-prediction) enrichit la zone d'une "file de suivi" priorisée — explicable, pas de boîte noire ML.

## Sorties
indice 0-100 + bande colorée par zone (membre agrégé→antenne→nation→monde), répartition 6 paliers (levelSegments), répartition stages conversion, liste des zones en déclin avec type/delta/detail, tendance 12 périodes, indice monde global. Toutes les formules sont des règles pondérées traçables.

### APIs
- `GET /api/admin/sante-mondiale` — Console mondiale : indice monde + nations[] + antennes[] (heatmap), répartition par palier à chaque échelon, tendance (snapshots), zones en déclin. Garde isAdminRequest ; portée par pays imposée côté serveur (nation_responsables) ; journalise sensitive_access_logs (action=health_world_view). IS_DEMO_MODE early return.
- `POST /api/admin/sante-mondiale/snapshot` — Cron : calcule le rollup courant (monde/nation/antenne), insère un snapshot/jour (on conflict do nothing) et lève les spiritual_health_alerts de déclin (chute_indice / part_inactifs). Garde isAdminRequest + secret cron, rateLimit/clientIp.
- `GET /api/admin/sante-mondiale/zone` — Drill-down d'une zone (?scope=nation:CD ou antenne:abidjan) : sparkline 12 périodes, distribution détaillée, stages de conversion, file de suivi (needsFollowUp) bornée. Portée vérifiée par rôle.

### Sécurité
Calcul 100% CÔTÉ SERVEUR via supabaseAdmin (bypass RLS) dans des libs 'server-only' (spiritual-health-server.ts, member-intel-build.ts) ; spiritual-health.ts est PUR donc importable client sans fuite. Routes : runtime='nodejs', dynamic='force-dynamic', garde isAdminRequest(req), IS_DEMO_MODE early return, réponses {ok, data|message}. Portée par rôle IMPOSÉE serveur : super_admin → monde ; nation_pastor/platform_admin → filtré à son/ses pays via nation_responsables (jamais seulement par l'UI) ; le paramètre ?pays d'un nation_pastor est intersecté avec son périmètre autorisé. Données sensibles : la santé mondiale n'expose JAMAIS le contenu des prières/cure d'âme ni de données nominatives au-delà de la file de suivi bornée (et celle-ci respecte la portée pays). Tables spiritual_health_config et spiritual_health_alerts = AUCUNE policy (service role only) ; spiritual_health_snapshots = SELECT authenticated sur les AGRÉGATS non nominatifs seulement, l'API restreignant la portée. RPC aggregate_spiritual_health en security definer + search_path=public. Chaque consultation est journalisée dans sensitive_access_logs (action=health_world_view, scope_pays). Route snapshot protégée par isAdminRequest + secret cron + rateLimit(clientIp). Aucun secret/service key côté client.

### Scalabilité
Cible 10k-100k membres, multi-pays/antennes. (1) SNAPSHOTS quotidiens persistés : la tendance et la heatmap historique se lisent directement dans spiritual_health_snapshots (index idx_shs_scope_date), sans recalcul — coût O(zones), pas O(membres). (2) RPC aggregate_spiritual_health délègue le rollup massif des paliers à Postgres (count filter) via la vue v_health_zone_members : l'API ne charge plus 50k profils en mémoire pour la heatmap globale ; elle ne fait le calcul fin PUR (engagementLevel/alerts) que sur l'échantillon piloté (zone drill-down) ou pour le snapshot nocturne. (3) CRON : /api/admin/sante-mondiale/snapshot exécutée 1×/jour (CronCreate) fige le rollup hors heure de pointe ; un snapshot/zone/jour garanti par contrainte unique (on conflict do nothing → réentrant). (4) Index : réutilise idx_profiles_pays_statut, idx_profiles_engagement, idx_asess_user_lastseen (20260602250000) + nouveaux idx_shs_*, idx_sha_open. (5) CACHE : la console mondiale lit le snapshot du jour (mise en cache mémoire courte côté route, revalidation à la demande pour le temps réel). (6) PAGINATION : la file de suivi et la liste d'alertes sont bornées (slice 60-80). (7) Le rollup hiérarchique est linéaire et utilise des Map par zone (quelques centaines d'entrées max), jamais quadratique.

### UX/UI
Console mondiale unique (s'intègre au cockpit V4 multi-contexte, sélecteur global/nation/antenne). En-tête : grand INDICE MONDE 0-100 avec bande colorée (Florissant→Critique) et sparkline 12 périodes (tendance ↑/↓ vs période précédente). Bloc HEATMAP MONDIALE : carte/grille des nations colorée par bande (vert florissant → rouge critique), badge indice + flèche de tendance par nation ; clic → drill-down antenne. Bloc RÉPARTITION PAR PALIER : barre empilée 6 couleurs (ENGAGEMENT_META) au niveau sélectionné, avec %. Bloc ZONES EN DÉCLIN (priorité pastorale) : liste triée par sévérité — nation/antenne, indice, delta pts (↓ rouge), motif (chute d'indice / part d'inactifs / alertes massives), bouton 'voir la zone'. Bloc TENDANCE : courbe multi-zones comparatives. Drill-down zone : sparkline, distribution détaillée, stages de conversion, file de suivi pastoral (action recommandée par membre). Couleurs/labels FR proviennent de BAND_META et ENGAGEMENT_META — cohérence visuelle avec le cockpit existant. Filtre pays grisé/verrouillé pour un nation_pastor (portée imposée, lisible). États vides explicites ('Zone trop petite pour un indice fiable').

### Cas pastoraux
- Détection précoce d'antenne qui décroche : l'indice de l'antenne Europe chute de 12 pts en 2 semaines (chute_indice) → alerte haute en tête de console, le pasteur national contacte le responsable d'antenne avant que la moitié des membres ne devienne inactive.
- Carte mondiale de mobilisation : le super_admin voit en un coup d'œil quelles nations sont en rouge (critique) vs vert (florissant) et oriente l'intercession et les ressources vers les zones fragiles.
- Zone à forte part d'inactifs : une nation affiche 41% d'inactifs+en_risque (part_inactifs) → déclenche une campagne de réengagement ciblée (notify()) sur cette nation uniquement, dans le respect de la portée.
- Suivi de l'effet d'une convention : après un événement régional, le snapshot du lendemain montre l'indice de l'antenne hôte remonter — preuve mesurable de l'impact spirituel, traçable dans la tendance.
- Priorisation du temps pastoral limité : la file de suivi d'une antenne en déclin liste les membres à risque avec l'action recommandée (contact personnel 24h, assigner intercession), du plus urgent au moins urgent.
- Garde-fou anti-bruit : une micro-antenne nouvellement ouverte (3 membres) n'affiche pas d'alerte critique (taille_min_zone), évitant de paniquer le responsable sur un échantillon non significatif.
- Comparaison inter-antennes d'une même nation : le nation_pastor compare l'indice de ses antennes pour identifier les pratiques des antennes florissantes à répliquer dans les fragiles.

### Lacunes
- profiles.antenne_id est facultatif et peut être majoritairement NULL au démarrage : tant que les membres ne sont pas rattachés à une antenne, le rollup antenne est partiel et l'agrégation retombe sur pays. Action : campagne de rattachement / inférence antenne depuis pays+ville.
- Le RPC aggregate_spiritual_health utilise un 'palier proxy' (score_engagement + derniere_connexion) pour la performance de masse, qui peut LÉGÈREMENT diverger de engagementLevel PUR (lequel intègre la diversité des signaux). Le snapshot nocturne devrait recalculer le palier FIN (PUR) pour la précision ; le proxy ne sert qu'aux rollups temps réel volumineux. À documenter pour éviter toute confusion d'écart.
- La tendance n'existe qu'à partir du moment où le cron de snapshot tourne : pas d'historique rétroactif. Prévoir un backfill optionnel à partir d'activity_logs/analytics_sessions si un historique est requis dès le lancement.
- command-center.ts (fondation V4) est supposé disponible mais n'existe pas encore dans le repo : l'intégration de la tuile santé-monde dépend de sa livraison. Branchement à confirmer une fois V4 mergé.
- Les seuils par défaut (poids des paliers, declin_chute_pts=8, declin_part_max=35%) sont des hypothèses initiales : à calibrer empiriquement après quelques semaines de snapshots réels (la table spiritual_health_config permet ce réglage sans redéploiement).
- Le cron job (CronCreate) doit être planifié séparément ; sans lui, snapshots/tendance/déclin restent vides. La route POST est prête mais l'ordonnancement n'est pas inclus dans la migration SQL.

<details><summary>SQL (référence)</summary>

```sql
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
```
</details>

<details><summary>Code clé (référence)</summary>

```typescript
// ============================================================================
// src/lib/spiritual-health.ts — INTELLIGENCE PURE (sans I/O, server+client safe)
// Dérive l'INDICE DE SANTÉ SPIRITUELLE d'une distribution de paliers d'engagement.
// AUCUNE logique d'engagement dupliquée : on consomme la sortie de pastoral-intelligence.
// ============================================================================
import { type EngagementLevel, ENGAGEMENT_META } from './pastoral-intelligence'

/** Distribution des 6 paliers d'engagement pour une zone (membre→antenne→nation→monde). */
export type LevelDistribution = Record<EngagementLevel, number>

export const EMPTY_DISTRIBUTION: LevelDistribution = {
  tres_engage: 0, engage: 0, stable: 0, a_suivre: 0, en_risque: 0, inactif: 0,
}

/** Pondération par palier (0-100). Surchargée par spiritual_health_config. */
export interface HealthWeights {
  tres_engage: number; engage: number; stable: number; a_suivre: number; en_risque: number; inactif: number
}
export const DEFAULT_WEIGHTS: HealthWeights = {
  tres_engage: 100, engage: 80, stable: 60, a_suivre: 40, en_risque: 15, inactif: 0,
}

export interface HealthThresholds {
  florissant: number; sain: number; fragile: number; declin: number
  declin_chute_pts: number; declin_part_max: number; taille_min_zone: number
}
export const DEFAULT_THRESHOLDS: HealthThresholds = {
  florissant: 75, sain: 60, fragile: 45, declin: 30,
  declin_chute_pts: 8, declin_part_max: 35, taille_min_zone: 5,
}

export type HealthBand = 'florissant' | 'sain' | 'fragile' | 'declin' | 'critique'
export const BAND_META: Record<HealthBand, { label: string; color: string; order: number }> = {
  florissant: { label: 'Florissant', color: '#16A34A', order: 0 },
  sain:       { label: 'Sain',       color: '#84CC16', order: 1 },
  fragile:    { label: 'Fragile',    color: '#EAB308', order: 2 },
  declin:     { label: 'En déclin',  color: '#F97316', order: 3 },
  critique:   { label: 'Critique',   color: '#DC2626', order: 4 },
}

/** Additionne deux distributions (rollup hiérarchique : antenne→nation→monde). */
export function addDistribution(a: LevelDistribution, b: LevelDistribution): LevelDistribution {
  const out = { ...a }
  for (const k of Object.keys(b) as EngagementLevel[]) out[k] += b[k]
  return out
}

export function distributionTotal(d: LevelDistribution): number {
  return (Object.values(d) as number[]).reduce((s, n) => s + n, 0)
}

/**
 * INDICE DE SANTÉ SPIRITUELLE 0-100 = note moyenne pondérée des paliers,
 * minorée par la densité d'alertes hautes (pénalité bornée à 12 pts).
 * Zone sans effectif → indice 0 (jamais inventé).
 */
export function healthIndex(d: LevelDistribution, w: HealthWeights = DEFAULT_WEIGHTS, alertesHautes = 0): number {
  const total = distributionTotal(d)
  if (total === 0) return 0
  let acc = 0
  for (const k of Object.keys(d) as EngagementLevel[]) acc += d[k] * w[k]
  const base = acc / total // déjà sur 0-100 (poids ∈ 0-100)
  const penalite = Math.min(12, (alertesHautes / total) * 30) // densité d'alertes hautes
  return Math.max(0, Math.min(100, Math.round(base - penalite)))
}

/** Part (%) de membres inactifs + en risque — détecteur primaire de déclin. */
export function fragilePart(d: LevelDistribution): number {
  const total = distributionTotal(d)
  if (total === 0) return 0
  return Math.round(((d.inactif + d.en_risque) / total) * 100)
}

export function healthBand(indice: number, t: HealthThresholds = DEFAULT_THRESHOLDS): HealthBand {
  if (indice >= t.florissant) return 'florissant'
  if (indice >= t.sain) return 'sain'
  if (indice >= t.fragile) return 'fragile'
  if (indice >= t.declin) return 'declin'
  return 'critique'
}

export type DeclineType = 'chute_indice' | 'part_inactifs' | 'alertes_massives' | null
export interface DeclineSignal {
  enDeclin: boolean
  type: DeclineType
  severite: 'haute' | 'moyenne' | 'info'
  delta_pts: number | null
  detail: string
}

/**
 * Détection de zone en déclin : compare l'indice courant au snapshot précédent
 * et applique les seuils de part fragile / densité d'alertes. PUR & explicable.
 */
export function declineSignal(
  d: LevelDistribution, indice: number, indicePrecedent: number | null,
  alertesHautes: number, t: HealthThresholds = DEFAULT_THRESHOLDS,
): DeclineSignal {
  const total = distributionTotal(d)
  const none: DeclineSignal = { enDeclin: false, type: null, severite: 'info', delta_pts: null, detail: 'Stable' }
  if (total < t.taille_min_zone) return none // zone trop petite → pas d'alarme (bruit)

  if (indicePrecedent !== null) {
    const delta = indice - indicePrecedent
    if (delta <= -t.declin_chute_pts) {
      return { enDeclin: true, type: 'chute_indice', severite: 'haute', delta_pts: delta,
        detail: `Chute de ${Math.abs(delta)} pts d'indice (${indicePrecedent}→${indice})` }
    }
  }
  const part = fragilePart(d)
  if (part >= t.declin_part_max) {
    return { enDeclin: true, type: 'part_inactifs', severite: part >= t.declin_part_max + 20 ? 'haute' : 'moyenne',
      delta_pts: indicePrecedent !== null ? indice - indicePrecedent : null,
      detail: `${part}% des membres inactifs ou en risque` }
  }
  if (alertesHautes / total >= 0.25) {
    return { enDeclin: true, type: 'alertes_massives', severite: 'moyenne', delta_pts: null,
      detail: `${alertesHautes} alertes pastorales hautes sur ${total} membres` }
  }
  return none
}

/** Vue prête-UI : segments colorés de la répartition par palier (heatmap/donut). */
export function levelSegments(d: LevelDistribution) {
  const total = distributionTotal(d) || 1
  return (Object.keys(ENGAGEMENT_META) as EngagementLevel[]).map((lvl) => ({
    level: lvl, label: ENGAGEMENT_META[lvl].label, color: ENGAGEMENT_META[lvl].color,
    n: d[lvl], pct: Math.round((d[lvl] / total) * 100),
  }))
}

// ============================================================================
// src/app/api/admin/sante-mondiale/route.ts — CONSOLE MONDIALE (lecture)
// ============================================================================
// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'
// import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
// import { isAdminRequest } from '@/lib/admin-auth'
// import { worldSpiritualHealth } from '@/lib/spiritual-health-server'
//
// export const runtime = 'nodejs'
// export const dynamic = 'force-dynamic'
//
// export async function GET(req: NextRequest) {
//   if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
//   if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
//   const pays = (req.nextUrl.searchParams.get('pays') || '').trim().toUpperCase() || null
//   try {
//     // Journal d'accès sensible (consultation santé monde/nation).
//     await supabaseAdmin.from('sensitive_access_logs').insert({
//       action: 'health_world_view', scope_pays: pays, role: 'admin',
//     })
//     const data = await worldSpiritualHealth(pays) // { monde, nations, antennes, tendance, declin }
//     return NextResponse.json({ ok: true, ...data })
//   } catch (e: any) {
//     return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
//   }
// }
```
</details>

---

## INTELLIGENCE PASTORALE PRÉDICTIVE MONDIALE
**Réutilise :** src/lib/pastoral-intelligence.ts : MemberIntel (contrat de signaux), engagementScore, engagementLevel, conversionStage, lastActivityDays, accountAgeDays, ENGAGEMENT_META/STAGE_META — RÉUTILISÉS tels quels comme entrée du moteur prédictif; src/lib/pastoral-prediction.ts : churnRisk(), followUpAction(), RISK_META, RiskLevel, levelFromScore (logique) — ÉTENDUS, jamais réécrits ; le nouveau pastoral-forecast.ts importe RiskLevel et la même échelle de seuils; Pipeline d'assemblage MemberIntel de /api/admin/gouvernement/route.ts (profiles + analytics_sessions + analytics_events + priere_demandes + inscriptions_formation + event_registrations + dons) — RÉUTILISÉ tel quel pour construire les features ; le cron de snapshot s'appuie sur le MÊME assemblage; src/lib/admin-auth.ts : isAdminRequest() — garde des routes admin V5; src/lib/supabase.ts : supabaseAdmin (bypass RLS, server-only) + IS_DEMO_MODE early return; src/lib/notify.ts : notifyUser/notifyBroadcast(audience:'admin') — alerter le pastorat sur les pics d'attrition / files de suivi; src/lib/nation-stats.ts (countIn) et la fondation V4 command-center.ts — agrégation transverse par nation/antenne; profiles.antenne_id + table antennes (parent_id, pays, devise) — clé de scope antenne/nation pour l'agrégation et la prévision de croissance

### Architecture
## Architecture — couche d'intelligence prédictive mondiale

### Flux
```
Sources réelles (existant V1-V4)
  profiles · analytics_sessions/events · priere_demandes
  inscriptions_formation · event_registrations · dons · antennes
        │  (même assemblage que /admin/gouvernement)
        ▼
[1] FEATURE BUILDER  (server)  → MemberIntel (réutilise pastoral-intelligence)
        ▼
[2] MOTEUR PRÉDICTIF PUR  src/lib/pastoral-forecast.ts  (0 I/O, testable)
      churnRisk*  · givingPropensity · serviceReadiness · nextBestAction
      + growthForecast(série temporelle agrégée)
        ▼
[3] SNAPSHOT CRON quotidien  (POST /api/admin/predictions/refresh, x-cron-secret)
      écrit member_feature_snapshots + member_prediction_snapshots
      + antenne_growth_snapshots (agrégat croissance)
        ▼
[4] LECTURE RAPIDE  GET /api/admin/predictions  (lit snapshots + vues, paginé)
      scope: ?antenne / ?pays imposé serveur selon rôle
        ▼
[5] CONSOLE MONDIALE  /admin/gouvernement (onglet « Prédictif »)
      agrégé via command-center.ts (KPIs transverses)
```

### Composants
- **Moteur pur** `pastoral-forecast.ts` : aucune I/O, importe MemberIntel + RiskLevel/RISK_META. Déterministe → testable et explicable.
- **Snapshot + feature store** : le calcul lourd (dizaines de milliers de membres) tourne 1×/jour en cron ; la console lit des lignes pré-calculées (pagination, filtre antenne/pays en SQL).
- **Vues d'agrégation** : `v_predictions_par_antenne` / RPC `predictions_aggregate(scope)` pour les compteurs par niveau, sans recharger tous les membres.

### Agrégation transverse & intégration à la console mondiale
La capacité est une BRIQUE consommée par `command-center.ts` (V4) : le cockpit unique `/admin/gouvernement` affiche les agrégats prédictifs aux trois portées (global super_admin / nation nation_pastor / antenne responsable), strictement à côté des modules existants (croissance, santé, prière, finance, mission). Le bloc `intelligence` actuel du gouvernement (churn) est enrichi (propension don, prêt-à-servir, prévision croissance) en lisant les snapshots plutôt qu'en recalculant à chaque requête → temps de réponse constant à grande échelle.

### Modèle d'intelligence
## Modèle d'intelligence — signaux réels → scores explicables

Toutes les entrées proviennent du contrat MemberIntel DÉJÀ alimenté par le pipeline du gouvernement (profiles, analytics_sessions/events, priere_demandes, inscriptions_formation, event_registrations, dons). Aucun signal inventé.

### 1) Attrition (churn) — RÉUTILISE churnRisk() existant
Récence 0-45, fréquence connexions 0-20, diversité d'engagement 0-18, jours actifs 30j 0-15, signaux négatifs (formation abandonnée, prière sans suivi) 0-24. Seuils partagés : >=75 critique, >=50 eleve, >=25 moyen.

### 2) Propension au don (givingPropensity) — NOUVEAU
- Historique dons (meilleur prédicteur) : >=3 → +40 ; 2 → +28 ; 1 → +16.
- Engagement (engagementScore) : >=60 → +22 ; >=35 → +12.
- Palier conversion : serviteur/leader +14 ; membre/disciple +7.
- Présence récente : <=7j +12 ; <=30j +5.
- Confiance bâtie : formation +4, événement +4.
Sortie : score 0-100 → niveau. Usage : cibler les invitations à soutenir, jamais de montant projeté (aucune donnée financière inventée).

### 3) Prêt-à-servir (serviceReadiness) — NOUVEAU
- Parcours : étape >=6 +22 ; >=4 +12.
- Formations : >=3 +22 ; >=1 +11.
- Régularité (active_days_30) : >=12 +20 ; >=6 +10.
- Ancienneté : >=180j +12 ; >=90j +6.
- Diversité d'engagement : >=4 types +14 ; >=2 +7.
- Pénalité décrochage récent (>21j) -15.
Déjà serviteur/leader → readiness « réalisée » (10, faible). Usage : détecter les disciples mûrs à appeler au service (mobilisation des leaders de demain).

### 4) Prévision de croissance (growthForecast) — NOUVEAU, par antenne/nation
Série mensuelle réelle des nouveaux membres (profiles.created_at, scopée antenne/pays). Moyenne mobile PONDÉRÉE (récents > anciens) → run-rate ; ajustement borné ±50% par la tendance (3 derniers vs 3 précédents mois). Sortie : nouveaux projetés 30/90j + niveau croissance|stable|declin. Modèle linéaire transparent, pas de ML opaque.

### Prochaine meilleure action (nextBestAction)
Arbitrage par PRIORITÉ pastorale : prière sans suivi → intercession ; churn critique → contact 24h ; nouveau sans intégration → accompagner ; churn eleve → réactiver ; readiness eleve → inviter à servir ; giving eleve → solliciter don ; sinon observation. Chaque score expose ses `facteurs` (texte FR) → 100% explicable au pastorat.

### APIs
- `POST /api/admin/predictions/refresh` — Cron quotidien : assemble MemberIntel (même pipeline que /admin/gouvernement), calcule les 4 prédictions via pastoral-forecast.ts, upsert member_feature_snapshots + member_prediction_snapshots + antenne_growth_snapshots. Gardé par x-cron-secret (header) OU isAdminRequest. rateLimit. IS_DEMO_MODE early return.
- `GET /api/admin/predictions` — Lecture rapide pour la console mondiale : lit le dernier snapshot, paginé, filtre ?antenne / ?pays imposé serveur selon rôle (super_admin libre, nation_pastor borné à son pays, responsable borné à son antenne). Renvoie {ok, data:{agregats (via RPC predictions_aggregate), files:{attrition, don, service}, croissance}}. Journalise dans sensitive_access_logs.
- `GET /api/admin/predictions/membre/[userId]` — Fiche prédictive détaillée d'un membre : 4 scores + niveaux + facteurs explicables + prochaine meilleure action. Garde admin + vérification de portée (antenne/pays du membre vs rôle de l'appelant). COMPTAGE/score seulement, jamais le contenu d'une prière.

### Sécurité
## Sécurité & confidentialité

- **Calcul 100% serveur** : pastoral-forecast.ts est pur mais n'est invoqué que par des routes Node (runtime='nodejs') et le cron. Aucun score n'est calculé côté client.
- **Garde** : isAdminRequest(req) sur toutes les routes /api/admin/predictions/* ; le cron de refresh accepte aussi un header x-cron-secret comparé à une variable d'env (jamais de repli en prod, comme admin-auth.ts).
- **Portée par rôle imposée serveur** : super_admin → global ; nation_pastor → forcé à son/ses pays (nation_responsables) ; responsable d'antenne → forcé à son antenne_id. Le paramètre ?antenne / ?pays est INTERSECTÉ avec la portée autorisée, jamais accepté tel quel.
- **Données sensibles** : les 3 tables snapshot ont RLS activée et AUCUNE policy → service role uniquement (supabaseAdmin). Aucune lecture client direct. La RPC predictions_aggregate est révoquée pour public/anon/authenticated.
- **Aucun contenu sensible stocké** : on ne persiste que des scores, niveaux et facteurs textuels génériques. Jamais le texte d'une prière ni d'une cure d'âme — uniquement des COMPTEURS (prieres, prieres_sans_suivi), cohérent avec la règle « cure d'âme = comptage seul ».
- **Journalisation** : toute consultation des fiches prédictives écrit dans sensitive_access_logs (user_id, role, scope_pays, action='predictions_view') → traçabilité des accès aux données pastorales.
- **'server-only'** sur tout module touchant supabaseAdmin (le moteur pur reste importable côté test).

### Scalabilité
## Scalabilité — dizaines de milliers de membres, multi-pays

- **Snapshot quotidien (cron)** : le calcul lourd (assemblage MemberIntel + 4 prédictions sur tous les membres) tourne 1×/jour via POST /api/admin/predictions/refresh. La console ne recalcule JAMAIS à la volée → temps de réponse constant.
- **Feature store + tables snapshot** : member_feature_snapshots / member_prediction_snapshots upsert par (user_id, snapshot_date) ; on lit le dernier jour via la vue v_predictions_latest.
- **Agrégation en base, pas en mémoire** : RPC predictions_aggregate(p_antenne, p_pays) renvoie les compteurs par niveau via count() filter — aucun chargement de N membres côté Node pour les KPIs.
- **Index ciblés** : (snapshot_date, churn_niveau), (snapshot_date, next_best_action), antenne_id, pays → files de suivi et agrégats scopés en O(index).
- **Pagination** : GET /api/admin/predictions pagine les files (attrition/don/service) avec range Supabase ; jamais de réponse non bornée.
- **Refresh par lots** : le cron pagine profiles (limit/offset) et upsert par lots, évitant un pic mémoire à grande échelle ; growthForecast s'appuie sur une agrégation mensuelle (12 points max), pas sur la série brute.
- **Antenne/nation pré-agrégées** : antenne_growth_snapshots évite de recalculer la prévision de croissance à chaque ouverture du cockpit.
- **Cron** : à brancher via CronCreate (PlanetHoster cron HTTP) ou Supabase pg_cron appelant l'endpoint — exécution nuit (faible charge).

### UX/UI
## UX de la console mondiale

Onglet « Prédictif » dans le cockpit unique /admin/gouvernement, aligné sur les modules existants (croissance, santé, prière, finance, mission), aux 3 portées (sélecteur global / nation / antenne déjà présent).

- **Bandeau KPI prédictif** (via predictions_aggregate) : membres à risque critique d'attrition, prêts-à-servir, propices au don, file de suivi prioritaire — chacun cliquable.
- **3 files d'action priorisées** (cartes) :
  1. PROTÉGER — attrition critique/élevée, triée par score, avec « Contact 24h ».
  2. FAIRE GRANDIR — prêts-à-servir, avec « Proposer un service ».
  3. SOUTENIR — propices au don, avec « Inviter à soutenir ».
  Chaque ligne montre nom, pays/antenne, score, et les FACTEURS explicables (chips FR) → transparence pour le pasteur.
- **Carte mondiale enrichie** : par nation/antenne, badge prévision de croissance (croissance/stable/déclin + nouveaux projetés 30j), et part de membres à risque (réutilise le bloc carte existant).
- **Fiche membre** : 4 jauges (attrition, don, service, engagement) + prochaine meilleure action mise en avant, sans aucun contenu de prière.
- **Action en un clic** : chaque carte de suivi déclenche notifyUser/notifyBroadcast('admin') et peut créer une assignation (réutilise priere_assignations / notify).
- Cohérence visuelle : couleurs RISK_META / ENGAGEMENT_META existantes. UI FR, devise FCFA.

### Cas pastoraux
- Sauver un membre qui décroche : un disciple actif depuis 6 mois devient silencieux 18 jours → churn critique + facteurs « baisse brutale » → file PROTÉGER → contact pastoral personnel sous 24h, notification admin automatique.
- Mobiliser les leaders de demain : un membre avec parcours avancé, 3 formations terminées et présence très régulière, mais sans fonction de service → readiness élevé → file FAIRE GRANDIR → invitation à servir (cellule/intercession).
- Soutenir l'œuvre sans pression : un membre engagé ayant déjà donné 2 fois et actif cette semaine → propension don élevée → file SOUTENIR → invitation ciblée et opportune, pas d'envoi de masse.
- Intégrer un nouveau venu : inscrit il y a 5 jours, parcours_etape=0, aucun signal → next_best_action accompagner_integration → relais au responsable d'intégration de l'antenne.
- Anticiper la croissance d'une antenne : la Chapelle Royale Canada montre une tendance +20% sur 3 mois → growthForecast « croissance », +N membres projetés à 30j → le super_admin alloue des ressources (formateurs, accueil).
- Détecter une nation en déclin : un pays dont >=40% des membres passent à risque + prévision « déclin » → alerte de mobilisation au nation_pastor concerné, données strictement bornées à son périmètre.
- Prière sans suivi prioritaire : un membre a une demande non assignée → next_best_action assigner_intercession, prioritaire sur tout le reste (la prière passe avant).

### Lacunes
- La fondation V4 (command-center.ts, /api/admin/command-center, RBAC scopé par antenne serveur) est SUPPOSÉE présente mais absente du dépôt actuel (aucun fichier command-center). L'intégration du bandeau prédictif au cockpit en dépend ; à confirmer/raccorder.
- Aucun helper de portée par rôle réutilisable n'existe encore côté API (la garde actuelle est binaire admin/non-admin via isAdminRequest). Il faut un getAdminScope(req) → {pays?, antenne_id?} pour nation_pastor/responsable, sinon la portée nation/antenne reste théorique.
- formations_term (formations terminées) utilisé par serviceReadiness n'est pas exposé par le MemberIntel actuel (seul formations_abandonnees l'est) : ajouter le comptage statut='termine' dans le pipeline d'assemblage lors du refresh.
- Pas d'infrastructure cron confirmée (pg_cron ou cron PlanetHoster) ; à provisionner pour POST /api/admin/predictions/refresh, sinon prévoir un déclenchement manuel/au login admin en repli.
- La propension au don ne projette aucun montant (volontaire : éviter d'inventer des données financières). Si un montant attendu est souhaité plus tard, il faudra une vraie distribution historique par devise/antenne.
- Le risque d'attrition repose sur la présence analytics (heartbeat) : pour les membres qui interagissent surtout hors plateforme (présence physique en antenne), prévoir une saisie de présence (check-in événement) pour ne pas sur-estimer le churn.

<details><summary>SQL (référence)</summary>

```sql
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
```
</details>

<details><summary>Code clé (référence)</summary>

```typescript
// src/lib/pastoral-forecast.ts
/**
 * V5 — INTELLIGENCE PASTORALE PRÉDICTIVE MONDIALE (logique PURE, 0 I/O).
 *
 * Étend pastoral-prediction.ts SANS le réécrire : réutilise MemberIntel et la
 * même échelle de niveaux (RiskLevel/RISK_META). Heuristiques explicables —
 * pas de boîte noire. Chaque sortie = score 0-100 + niveau + facteurs + action.
 *
 *   givingPropensity()  → propension au don 30j
 *   serviceReadiness()  → maturité « prêt-à-servir » (disciple→serviteur)
 *   nextBestAction()    → prochaine meilleure action pastorale (priorisée)
 *   growthForecast()    → prévision de croissance antenne/nation (série agrégée)
 *
 * Confidentialité : agrégats de signaux uniquement (aucun contenu sensible).
 */
import { type MemberIntel, engagementScore, conversionStage, lastActivityDays, accountAgeDays } from './pastoral-intelligence'
import { type RiskLevel } from './pastoral-prediction'

const levelFromScore = (s: number): RiskLevel => (s >= 75 ? 'critique' : s >= 50 ? 'eleve' : s >= 25 ? 'moyen' : 'faible')

export interface Prediction { score: number; niveau: RiskLevel; facteurs: string[] }

/**
 * PROPENSION AU DON à 30 jours. Plus le score est haut, plus la sollicitation
 * est opportune. Signaux : historique de dons (récurrence), engagement,
 * palier de conversion, présence récente. Aucun montant inventé.
 */
export function givingPropensity(m: MemberIntel, now: number): Prediction {
  const f: string[] = []
  let s = 0
  // 1) Historique : un donateur récurrent est le meilleur prédicteur (poids fort).
  if (m.dons >= 3) { s += 40; f.push(`${m.dons} dons déjà réalisés`) }
  else if (m.dons === 2) { s += 28; f.push('Donateur occasionnel') }
  else if (m.dons === 1) { s += 16; f.push('A déjà donné une fois') }
  // 2) Engagement global (un membre engagé donne davantage).
  const eng = engagementScore(m)
  if (eng >= 60) { s += 22; f.push('Très engagé') }
  else if (eng >= 35) s += 12
  // 3) Palier de conversion (serviteur/leader = générosité plus probable).
  const st = conversionStage(m)
  if (st === 'leader' || st === 'serviteur') { s += 14; f.push('Engagement de service') }
  else if (st === 'membre' || st === 'disciple') s += 7
  // 4) Présence récente (sollicitation à chaud).
  const d = lastActivityDays(m, now)
  if (d !== null && d <= 7) { s += 12; f.push('Actif cette semaine') }
  else if (d !== null && d <= 30) s += 5
  // 5) Confiance bâtie via formation/événements.
  if (m.formations >= 1) s += 4
  if (m.events >= 1) s += 4
  const score = Math.min(Math.round(s), 100)
  return { score, niveau: levelFromScore(score), facteurs: f }
}

/**
 * PRÊT-À-SERVIR : maturité d'un membre vers une fonction de service.
 * Cible : disciples/membres réguliers, formés, sans rôle de service encore.
 * Un score élevé suggère un appel à servir (mobilisation).
 */
export function serviceReadiness(m: MemberIntel, now: number): Prediction {
  const f: string[] = []
  const st = conversionStage(m)
  // Déjà serviteur/leader → readiness « réalisée » (faible besoin de mobiliser).
  if (st === 'serviteur' || st === 'leader') return { score: 10, niveau: 'faible', facteurs: ['Sert déjà'] }
  let s = 0
  // 1) Maturité spirituelle (parcours d'intégration avancé).
  if (m.parcours_etape >= 6) { s += 22; f.push('Parcours avancé') }
  else if (m.parcours_etape >= 4) s += 12
  // 2) Formation (compétence + assiduité).
  if (m.formations >= 3) { s += 22; f.push('Plusieurs formations suivies') }
  else if (m.formations >= 1) s += 11
  // 3) Régularité (fiabilité = condition du service).
  if (m.active_days_30 >= 12) { s += 20; f.push('Présence très régulière') }
  else if (m.active_days_30 >= 6) s += 10
  // 4) Ancienneté (enracinement).
  const age = accountAgeDays(m, now)
  if (age >= 180) { s += 12; f.push('Membre enraciné') }
  else if (age >= 90) s += 6
  // 5) Engagement large (diversité de pratiques).
  const breadth = [m.prieres, m.formations, m.lives, m.events, m.dons].filter((x) => x > 0).length
  if (breadth >= 4) { s += 14; f.push('Engagement diversifié') }
  else if (breadth >= 2) s += 7
  // Pénalité : décroché récemment → mobiliser plus tard.
  const d = lastActivityDays(m, now)
  if (d !== null && d > 21) { s -= 15; f.push('À réactiver avant de mobiliser') }
  const score = Math.max(0, Math.min(Math.round(s), 100))
  return { score, niveau: levelFromScore(score), facteurs: f }
}

export type NextAction =
  | 'contact_personnel_24h' | 'reactiver_engagement' | 'assigner_intercession'
  | 'inviter_a_servir' | 'solliciter_don' | 'accompagner_integration' | 'observation'

export const NEXT_ACTION_LABEL: Record<NextAction, string> = {
  contact_personnel_24h: 'Contact pastoral personnel sous 24 h',
  reactiver_engagement: 'Relancer (invitation prière / événement)',
  assigner_intercession: 'Assigner un intercesseur à la prière',
  inviter_a_servir: 'Proposer un engagement de service',
  solliciter_don: 'Inviter à soutenir l’œuvre',
  accompagner_integration: 'Accompagner l’intégration (nouveau membre)',
  observation: 'Observation',
}

/**
 * PROCHAINE MEILLEURE ACTION — arbitre entre les prédictions par priorité
 * pastorale : protéger (attrition) > soigner (prière) > nourrir (intégration)
 * > faire grandir (servir) > soutenir (don).
 */
export function nextBestAction(
  m: MemberIntel, now: number,
  churn: Prediction, giving: Prediction, readiness: Prediction,
): NextAction {
  const age = accountAgeDays(m, now)
  if (m.prieres_sans_suivi > 0) return 'assigner_intercession'
  if (churn.niveau === 'critique') return 'contact_personnel_24h'
  if (age <= 14 && m.parcours_etape === 0 && m.formations === 0) return 'accompagner_integration'
  if (churn.niveau === 'eleve') return 'reactiver_engagement'
  if (readiness.niveau === 'critique' || readiness.niveau === 'eleve') return 'inviter_a_servir'
  if (giving.niveau === 'critique' || giving.niveau === 'eleve') return 'solliciter_don'
  return 'observation'
}

export interface GrowthPoint { mois: string; n: number } // YYYY-MM, nouveaux membres
export interface GrowthForecast {
  forecast_30j: number; forecast_90j: number
  niveau: 'croissance' | 'stable' | 'declin'; tendance_pct: number
}

/**
 * PRÉVISION DE CROISSANCE par antenne/nation à partir de la série mensuelle
 * réelle des nouveaux membres. Modèle explicable : moyenne mobile pondérée
 * (récents > anciens) → run-rate mensuel, ajusté par la tendance récente.
 */
export function growthForecast(serie: GrowthPoint[]): GrowthForecast {
  const pts = serie.slice(-6) // 6 derniers mois réels
  if (pts.length === 0) return { forecast_30j: 0, forecast_90j: 0, niveau: 'stable', tendance_pct: 0 }
  // Moyenne mobile pondérée (poids 1..n, récents prioritaires).
  let sw = 0, w = 0
  pts.forEach((p, i) => { const k = i + 1; sw += p.n * k; w += k })
  const runRate = w ? sw / w : 0
  // Tendance : 3 derniers vs 3 précédents.
  const recent = pts.slice(-3).reduce((a, p) => a + p.n, 0)
  const prev = pts.slice(-6, -3).reduce((a, p) => a + p.n, 0)
  const tendance_pct = prev > 0 ? Math.round(((recent - prev) / prev) * 100) : (recent > 0 ? 100 : 0)
  const adj = 1 + Math.max(-0.5, Math.min(0.5, tendance_pct / 200)) // ajustement borné ±50%
  const f30 = Math.max(0, Math.round(runRate * adj))
  const niveau = tendance_pct >= 15 ? 'croissance' : tendance_pct <= -15 ? 'declin' : 'stable'
  return { forecast_30j: f30, forecast_90j: f30 * 3, niveau, tendance_pct }
}
```
</details>

---

## Alertes prophétiques
**Réutilise :** app_notifications + notify.ts (notifyUser/notifyBroadcast) : émission temps réel des alertes vers les responsables — on AJOUTE notifyRole() ciblant les destinataires par rôle/pays/antenne; sensitive_access_logs : journalisation de chaque consultation/évaluation d'alertes (action='prophetic_alerts_eval'|'prophetic_alerts_view'); antennes (parent_id, pays, devise, responsable_id) : portée et hiérarchie des alertes ; profiles.antenne_id pour rattacher membres; nation_responsables (user_id, pays, role) : résolution des destinataires d'une alerte régionale/nationale; dons (montant, devise, statut='complete', created_at, antenne_id) : signal chute des dons; priere_demandes (priorite, statut, is_public, pays, assigned_to, created_at) : signal flambée d'urgences + prières sans suivi régionales; profiles (membre_statut, parcours_etape, antenne_id, created_at, derniere_connexion) : signal vague de convertis non intégrés + déclin engagement; pastoral-intelligence.ts (engagementLevel, conversionStage) : l'alerte mondiale agrège les paliers individuels en taux par antenne

### Architecture
## Composants

**1. Snapshots agrégés (couche données, SQL/cron)**
- `prophetic_region_snapshots` : 1 ligne / (scope_type, scope_id, periode) capturant les agrégats RÉELS d'une fenêtre (membres actifs, nouveaux convertis non intégrés, dons total, prières urgentes, taux d'engagement). Calculés par RPC d'agrégation `prophetic_compute_snapshot()` (cron horaire/quotidien) → JAMAIS de calcul lourd à la lecture.
- Comparaison période N vs N-1 stockée pour mesurer tendances (déclin = delta négatif).

**2. Moteur de règles configurable (base)**
- `prophetic_alert_rules` : code, type d'alerte, scope cible (monde/nation/antenne), seuils (jsonb : `{ baisse_dons_pct: 30, fenetre_jours: 14 }`), sévérité, rôles destinataires, actif. Éditable en back-office sans redéploiement.
- Seeds des 5 règles fondatrices (déclin antenne, flambée prière, chute dons, convertis non intégrés, fenêtre de moisson).

**3. Lib d'intelligence PURE (`src/lib/prophetic-alerts.ts`)**
- Aucune I/O. Entrée = snapshot courant + snapshot précédent + règle. Sortie = alerte scorée (ou null). Testable, déterministe. Réutilise les types d'engagement existants.

**4. Évaluateur serveur (`src/lib/prophetic-engine.ts`, server-only)**
- Charge snapshots + règles → applique la lib pure → déduplique (clé : rule_code+scope+jour) → insère `prophetic_alerts` → résout destinataires (responsable_id antenne, nation_responsables, super_admins) → `notifyRole()`.

**5. APIs**
- `POST /api/admin/prophetic-alerts/evaluate` (cron-protégé + admin) : déclenche un cycle d'évaluation.
- `GET /api/admin/prophetic-alerts` : liste scopée par rôle (file d'alertes de la console).
- `PATCH /api/admin/prophetic-alerts/[id]` : accuser réception / résoudre / assigner.
- `GET|PUT /api/admin/prophetic-alerts/rules` : moteur de règles.

## Flux
```
cron (horaire) → /api/admin/prophetic-alerts/evaluate
  → prophetic_compute_snapshot() [RPC agrégation, par antenne/nation/monde]
  → prophetic-engine.ts charge snapshots N et N-1 + règles actives
  → prophetic-alerts.ts (PUR) évalue chaque (règle × scope) → alertes
  → dédup (prophetic_alerts upsert on conflict dedup_key)
  → résolution destinataires (antenne.responsable_id / nation_responsables / super_admin)
  → notify() → app_notifications (Realtime) + sensitive_access_logs
```

## Agrégation transverse & intégration console mondiale
- Le snapshot roule la hiérarchie : antenne → nation (parent_id/pays) → monde. Une alerte monde agrège les snapshots nationaux (somme/moyenne pondérée). 
- Le cockpit unique V4 (command-center) affiche un BANDEAU prophétique : compteur d'alertes critiques par contexte (global/antenne/nation) lu via `GET /api/admin/prophetic-alerts?scope=`. La même file alimente le dashboard super_admin (vue monde) et le nation-dashboard (vue filtrée serveur).
- Réutilise le sélecteur de contexte multi-niveau de V4 ; aucune nouvelle navigation, une carte « Alertes prophétiques » s'insère dans /admin/gouvernement.

### Modèle d'intelligence
## Modèle d'intelligence — signaux RÉELS → scores → alertes

Aucune donnée inventée : chaque alerte naît d'agrégats vérifiables stockés dans `prophetic_region_snapshots`, calculés par `prophetic_compute_snapshot()`. La méthode est TENDANCIELLE (période N vs N-1), pas absolue — c'est le DELTA qui signale un mouvement prophétique.

**Signaux d'entrée (par scope monde/nation/antenne) :**
- membres_actifs_30j : `profiles.derniere_connexion >= now()-30j`
- nouveaux_30j / convertis_non_integres : `profiles.created_at >= fenêtre` et `parcours_etape = 0`
- prieres_urgentes : `priere_demandes.priorite in ('urgent','tres_urgent')` non clôturées
- prieres_sans_suivi : `assigned_to is null`
- dons_total / dons_nb : `dons.statut='complete'`, somme `montant` sur la fenêtre

**Formules & seuils (configurables via prophetic_alert_rules.seuils jsonb) :**
- Déclin antenne : `delta_actifs_pct <= -25%` → score = |delta| × 1.5
- Flambée prière : `urgentes >= 10 ET hausse >= +50%` → score = 50 + delta/2 (sévérité critique)
- Chute dons : `delta_dons_pct <= -30%` → score = |delta| × 1.2
- Convertis non intégrés : `non_integres >= 15 ET part >= 40% des nouveaux` → score = 40 + part/2
- Fenêtre de moisson : `nouveaux >= 20` → score = 30 + nouveaux (sévérité info, opportunité)

**Sorties :** alerte scorée 0-100 (priorisation file), sévérité (critique→info), message prophétique lisible, signaux bruts (jsonb) traçables, destinataires par rôle. La fonction `pct(now, prev)` gère le cas prev=0 (apparition d'un signal). Tout est PUR dans prophetic-alerts.ts → testable sans base. L'agrégation des paliers d'engagement individuels (pastoral-intelligence.ts) en taux par antenne reste possible via engagement_moyen du snapshot, sans recoder la logique.

### APIs
- `POST /api/admin/prophetic-alerts/evaluate` — Cycle d'évaluation (cron-protégé header x-cron-secret + admin) : calcule snapshots via RPC, applique la lib pure, déduplique, insère prophetic_alerts, notifie les responsables. Renvoie {ok, data:{emitted, scopes}}.
- `GET /api/admin/prophetic-alerts` — File d'alertes scopée par rôle (super_admin=monde, nation_pastor=son pays, responsable=son antenne). Params ?scope=&statut=&severite=. Journalise en sensitive_access_logs. Alimente le bandeau du cockpit V4.
- `PATCH /api/admin/prophetic-alerts/[id]` — Met à jour le statut (vue|en_action|resolue|ignoree) et/ou assigned_to d'une alerte. Garde admin + portée serveur. rateLimit en écriture.
- `GET /api/admin/prophetic-alerts/rules` — Liste les règles du moteur (seuils, sévérités, destinataires) pour la console de configuration.
- `PUT /api/admin/prophetic-alerts/rules` — Met à jour une règle (seuils jsonb, severite, roles_destinataires, actif) sans redéploiement. Garde super_admin uniquement.

### Sécurité
## Sécurité (portée serveur, données stratégiques)

- **Tables sensibles = service role only** : `prophetic_region_snapshots`, `prophetic_alerts` ont RLS activée SANS AUCUNE policy (lecture/écriture exclusivement via supabaseAdmin côté serveur, jamais d'anon/authenticated). `prophetic_alert_rules` idem (config). Conforme à la règle « Données sensibles = aucune policy + service role only ».
- **RPC `prophetic_compute_snapshot` en SECURITY DEFINER** avec `set search_path = public, pg_temp` : appelée uniquement par le service role via la route evaluate ; ne renvoie QUE des agrégats (aucune PII, aucune ligne nominative).
- **Garde des routes** : `isAdminRequest(req)` sur toutes les routes GET/PATCH ; `runtime='nodejs'`, `dynamic='force-dynamic'`, `IS_DEMO_MODE` early return. La route `evaluate` exige EN PLUS un secret cron (`x-cron-secret` comparé à `process.env.CRON_SECRET`) pour empêcher tout déclenchement non planifié. `PUT /rules` réservé super_admin (vérif rôle serveur).
- **Portée par rôle imposée SERVEUR** (jamais l'UI seule) : super_admin → toutes alertes ; nation_pastor → `scope_id = son pays` (via nation_responsables) ou alertes nation/antenne de son pays ; responsable d'antenne → `scope_id = son antenne_id`. Le filtrage se fait dans la requête supabaseAdmin, pas côté client.
- **Journalisation** : chaque évaluation (`prophetic_alerts_eval`) et chaque consultation (`prophetic_alerts_view`) insérée dans `sensitive_access_logs` (role, scope_pays, action) — traçabilité des accès stratégiques.
- **Notifications non bloquantes** : `notify()` avale les erreurs ; une alerte émise persiste même si la notif échoue. `'server-only'` sur prophetic-engine.ts.
- **rateLimit/clientIp** sur les écritures (PATCH/PUT/evaluate manuel).

### Scalabilité
## Scalabilité (dizaines de milliers de membres, multi-pays/antennes)

- **Snapshots pré-calculés (matérialisation)** : la lecture de la console NE recalcule JAMAIS. Le cron (`/api/admin/prophetic-alerts/evaluate`, horaire pour prière/critique, quotidien pour dons/déclin) appelle `prophetic_compute_snapshot()` par scope. La file d'alertes se lit en O(1) sur `prophetic_alerts` (index `idx_proph_alerts_scope`, `idx_proph_alerts_statut`).
- **Agrégation côté base** : tous les `count(*)`/`sum()` se font dans la RPC SQL (un seul aller-retour par scope), pas en JS sur des milliers de lignes. Réutilise le pattern `countIn` de nation-stats.ts.
- **Volume borné** : nombre de scopes = (1 monde + N nations + M antennes) — quelques dizaines, pas des dizaines de milliers. Le coût d'un cycle est proportionnel aux scopes, indépendant du nombre de membres au-delà des agrégats SQL.
- **Déduplication** : index unique `uniq_proph_alert_dedup` (rule_code|scope|jour) + `on conflict do nothing`/`do update` → pas d'explosion d'alertes ; cooldown_heures applicatif évite le spam de notifications.
- **Index ajoutés** sur (scope_type, scope_id, periode_fin), (scope_type, scope_id, created_at), (statut, severite). Réutilise `idx_dons_statut_devise`, `idx_priere_priorite`, `idx_profiles_antenne` existants pour accélérer les agrégats.
- **Cron** : déclenchable via le scheduler de la plateforme (Vercel cron / PlanetHoster cron HTTP) appelant la route protégée par CRON_SECRET. Rétention : purge périodique des snapshots > 180 j (job additif futur).
- **Pagination** sur `GET /api/admin/prophetic-alerts` (limit/offset, défaut 50) pour la file historique.

### UX/UI
## UX/UI — console mondiale

- **Bandeau prophétique** en tête du cockpit V4 (command-center) et de /admin/gouvernement : compteur d'alertes critiques/hautes pour le contexte sélectionné (global/antenne/nation), pastille rouge animée si ≥1 critique. Réutilise le sélecteur de contexte multi-niveau V4 — aucune nouvelle navigation.
- **File d'alertes (carte « Alertes prophétiques »)** : liste triée par score décroissant, chaque alerte = puce de sévérité colorée (SEVERITE_META), titre, message prophétique, scope_label, horodatage, signaux (delta % lisibles). Actions inline : « Vu », « En action » (assigne à soi), « Résoudre », « Ignorer » → PATCH.
- **Filtres** : par sévérité, statut, scope. Vue « Monde » pour super_admin ; vue auto-filtrée pour nation_pastor/responsable (portée serveur, l'UI reflète seulement).
- **Carte régionale** : réutilise /admin/cartographie pour colorer les nations/antennes par alerte la plus sévère (heatmap prophétique).
- **Notifications temps réel** : l'alerte émise apparaît instantanément dans la cloche (app_notifications + Realtime existant) du responsable concerné, avec href profond vers la carte alerte.
- **Console de règles** (/admin/gouvernement onglet « Moteur d'alertes ») : éditer seuils (sliders sur seuils jsonb), sévérité, rôles destinataires, activer/désactiver — sans redéploiement. Réservée super_admin.
- **Langue FR**, devise FCFA, ton apostolique (« fenêtre de moisson », « visite pastorale recommandée »).

### Cas pastoraux
- Déclin d'antenne : la Chapelle Royale Canada perd 30% de ses membres actifs sur 30 j → alerte HAUTE notifiée au super_admin et au nation_pastor CA → visite pastorale / appel du responsable d'antenne.
- Flambée d'urgences de prière : pic de demandes urgentes en Côte d'Ivoire (+60%) → alerte CRITIQUE aux intercesseurs et au nation_pastor → mobilisation d'une chaîne d'intercession régionale ciblée.
- Chute des dons : les offrandes de l'antenne Abidjan baissent de 35% vs mois précédent → alerte au super_admin → enquête (campagne arrêtée ? saison ? fidélité ?) et relance.
- Vague de convertis non intégrés : 18 nouveaux convertis (45%) sans parcours entamé dans une antenne → alerte au coordinateur → déclenchement du tunnel d'intégration et affectation de bergers.
- Fenêtre de moisson : 25 nouveaux convertis en 14 j sur l'antenne Europe → alerte INFO (opportunité) → planification d'une session de formation des nouveaux et d'un événement d'accueil.
- Pilotage mondial : le super_admin ouvre la console, voit en un coup d'œil les 3 nations en alerte, priorise par score, assigne chaque alerte à un responsable et suit la résolution — un seul cerveau central, pas des silos.

### Lacunes
- V4 command-center.ts / /api/admin/command-center NON présents dans le repo actuel : l'intégration du bandeau suppose leur disponibilité (hypothèse de l'énoncé). Le module fonctionne en autonomie via /admin/gouvernement en attendant.
- Le scheduler cron doit être configuré côté hébergeur (PlanetHoster cron HTTP ou Vercel cron) avec CRON_SECRET — non automatisable dans la migration SQL.
- priere_demandes.statut : les valeurs de clôture supposées ('repondue','archivee','clos') doivent être confirmées contre l'enum réel ; ajuster le filtre de la RPC si différent (l'enum priere_statut historique = active|repondue|archivee, mais prayer_center ajoute statut text 'nouvelle'|'en_priere'|'en_intercession').
- dons.statut : la RPC utilise 'complete' (enum don_statut: en_attente|complete|echoue|rembourse). Confirmer que les paiements Chariow réussis mappent bien sur 'complete' (sinon adapter, ex. webhook_received_at not null).
- engagement_moyen du snapshot reste optionnel : son calcul exact (moyenne des engagementScore individuels) nécessiterait un passage par pastoral-intelligence côté serveur — branchable en V5.1 sans changer le schéma.
- Résolution fine des destinataires antenne→pays (quand antenne sans pays renseigné) à durcir ; fallback super_admin prévu.
- Rétention/purge des snapshots (>180j) à ajouter en job additif ultérieur pour borner la croissance.

<details><summary>SQL (référence)</summary>

```sql
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
```
</details>

<details><summary>Code clé (référence)</summary>

```typescript
// ============================================================================
// src/lib/prophetic-alerts.ts — INTELLIGENCE PURE (sans I/O), testable.
// Transforme des snapshots agrégés RÉELS (période N vs N-1) + une règle
// configurable en une alerte stratégique scorée. Aucune donnée inventée :
// pas de signal réel → pas d'alerte.
// ============================================================================

export type Severite = 'critique' | 'haute' | 'moyenne' | 'info'

export const SEVERITE_META: Record<Severite, { label: string; color: string; order: number }> = {
  critique: { label: 'Critique', color: '#DC2626', order: 0 },
  haute:    { label: 'Haute',    color: '#EF4444', order: 1 },
  moyenne:  { label: 'Moyenne',  color: '#F59E0B', order: 2 },
  info:     { label: 'Information', color: '#0EA5E9', order: 3 },
}

/** Snapshot agrégé d'un scope (miroir de prophetic_region_snapshots). */
export interface Snapshot {
  scope_type: 'monde' | 'nation' | 'antenne'
  scope_id: string | null
  scope_label: string | null
  membres_total: number
  nouveaux_30j: number
  convertis_non_integres: number
  prieres_urgentes: number
  prieres_sans_suivi: number
  dons_total: number
  dons_nb: number
  membres_actifs_30j: number
}

/** Règle configurable (miroir de prophetic_alert_rules). */
export interface AlertRule {
  code: string
  type_alerte: string
  libelle: string
  scope_type: string
  seuils: Record<string, number>
  severite: Severite
  roles_destinataires: string[]
}

export interface PropheticAlert {
  rule_code: string
  type_alerte: string
  severite: Severite
  scope_type: string
  scope_id: string | null
  scope_label: string | null
  titre: string
  message: string
  signaux: Record<string, number | string>
  score: number // 0-100, intensité pour priorisation
}

const pct = (now: number, prev: number): number =>
  prev <= 0 ? (now > 0 ? 100 : 0) : Math.round(((now - prev) / prev) * 100)

const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * Évalue UNE règle sur un scope (snapshot courant + précédent).
 * Retourne une alerte si le seuil est franchi, sinon null.
 */
export function evaluateRule(rule: AlertRule, cur: Snapshot, prev: Snapshot | null): PropheticAlert | null {
  const s = rule.seuils
  const base = {
    rule_code: rule.code, type_alerte: rule.type_alerte, severite: rule.severite,
    scope_type: cur.scope_type, scope_id: cur.scope_id, scope_label: cur.scope_label,
  }

  switch (rule.code) {
    case 'declin_antenne': {
      if (!prev) return null
      const delta = pct(cur.membres_actifs_30j, prev.membres_actifs_30j) // négatif = déclin
      if (delta > -(s.baisse_actifs_pct ?? 25)) return null
      return { ...base,
        titre: `Déclin de l'antenne ${cur.scope_label ?? ''}`.trim(),
        message: `Membres actifs en baisse de ${Math.abs(delta)}% (${prev.membres_actifs_30j} → ${cur.membres_actifs_30j}). Visite pastorale recommandée.`,
        signaux: { actifs_avant: prev.membres_actifs_30j, actifs_apres: cur.membres_actifs_30j, delta_pct: delta },
        score: clampScore(Math.abs(delta) * 1.5) }
    }
    case 'flambee_priere': {
      if (!prev) return null
      const delta = pct(cur.prieres_urgentes, prev.prieres_urgentes)
      if (cur.prieres_urgentes < (s.min_absolu ?? 10) || delta < (s.hausse_pct ?? 50)) return null
      return { ...base,
        titre: `Flambée d'urgences de prière — ${cur.scope_label ?? 'région'}`,
        message: `${cur.prieres_urgentes} demandes urgentes (+${delta}%). Mobiliser les intercesseurs sur la région.`,
        signaux: { urgentes_avant: prev.prieres_urgentes, urgentes_apres: cur.prieres_urgentes, delta_pct: delta },
        score: clampScore(50 + delta / 2) }
    }
    case 'chute_dons': {
      if (!prev) return null
      const delta = pct(cur.dons_total, prev.dons_total)
      if (delta > -(s.baisse_pct ?? 30)) return null
      return { ...base,
        titre: `Chute des dons — ${cur.scope_label ?? ''}`.trim(),
        message: `Dons en baisse de ${Math.abs(delta)}% (FCFA ${prev.dons_total} → ${cur.dons_total}). Vérifier campagnes et fidélité.`,
        signaux: { dons_avant: prev.dons_total, dons_apres: cur.dons_total, delta_pct: delta },
        score: clampScore(Math.abs(delta) * 1.2) }
    }
    case 'convertis_non_integres': {
      const part = cur.nouveaux_30j > 0 ? Math.round((cur.convertis_non_integres / cur.nouveaux_30j) * 100) : 0
      if (cur.convertis_non_integres < (s.min_absolu ?? 15) || part < (s.part_pct ?? 40)) return null
      return { ...base,
        titre: `Convertis non intégrés — ${cur.scope_label ?? ''}`.trim(),
        message: `${cur.convertis_non_integres} nouveaux (${part}%) sans parcours entamé. Déclencher le tunnel d'intégration.`,
        signaux: { non_integres: cur.convertis_non_integres, nouveaux: cur.nouveaux_30j, part_pct: part },
        score: clampScore(40 + part / 2) }
    }
    case 'fenetre_moisson': {
      if (cur.nouveaux_30j < (s.min_nouveaux ?? 20)) return null
      return { ...base,
        titre: `Fenêtre de moisson — ${cur.scope_label ?? ''}`.trim(),
        message: `${cur.nouveaux_30j} nouveaux convertis : opportunité d'intégration et de formation à saisir maintenant.`,
        signaux: { nouveaux: cur.nouveaux_30j },
        score: clampScore(30 + cur.nouveaux_30j) }
    }
    default:
      return null
  }
}

/** Évalue toutes les règles actives sur un scope. */
export function evaluateScope(rules: AlertRule[], cur: Snapshot, prev: Snapshot | null): PropheticAlert[] {
  return rules
    .map((r) => evaluateRule(r, cur, prev))
    .filter((a): a is PropheticAlert => a !== null)
    .sort((a, b) => b.score - a.score)
}

/** Clé de déduplication : 1 alerte par (règle, scope, jour). */
export function dedupKey(a: PropheticAlert, day: string): string {
  return `${a.rule_code}|${a.scope_type}|${a.scope_id ?? 'monde'}|${day}`
}
```
</details>

---

## CENTRE DE CRISE APOSTOLIQUE
**Réutilise :** priere_demandes.priorite='tres_urgent' + statut + assigned_to : source d'incident automatique (escalade prière critique) — déjà indexé idx_priere_priorite; delivrance_demandes (niveau='profond', confidentiel=true) : source d'incident cure d'âme grave — JAMAIS exposer description/notes_internes, seulement une référence opaque; antennes (id, pays, devise, responsable_id, parent_id) : rattachement d'un incident à une antenne + chaîne d'escalade naturelle via parent_id (antenne → antenne mère → nation → global); nation_responsables (user_id, pays, role) : résolution des destinataires d'escalade par pays + portée RBAC nation_pastor; profiles (id, role, antenne_id, pays) : intervenants, responsables, scope serveur; notify.ts (notifyUser / notifyBroadcast) : NON bloquant, déjà branché sur app_notifications + Supabase Realtime → alertes cellule de crise temps réel sans nouvelle plomberie; app_notifications + Realtime (migration 20260602260000) : canal temps réel déjà abonné côté membre/admin pour le suivi live de l'incident; sensitive_access_logs : journalisation de toute consultation d'incident sensible (confidentiel) côté back-office

### Architecture
## Composants

**Couche données (nouveau, additif)**
- `crisis_incidents` — l'incident (type, sévérité, statut workflow, antenne_id/pays scope, palier d'escalade courant, next_escalation_at SLA, source_table/source_id pour traçer l'origine réelle, confidentiel).
- `crisis_interventions` — journal d'intervention horodaté (chaque action : note, décision, communication, statut). Append-only de fait (écriture service role).
- `crisis_assignations` — intervenants affectés à un incident (rôle dans la cellule : pilote | intercesseur | terrain | communication).
- `crisis_escalation_levels` — config des paliers d'escalade par type/sévérité (délai SLA en minutes, rôle/pays cible). Administrable, seedé.
- `crisis_snapshots` — vue matérialisée par cron : tension par antenne/nation, incidents ouverts, SLA dépassés (scale).
- Vue `v_crisis_open` + RPC `crisis_overview(scope_pays)` pour agrégation transverse rapide.

**Couche intelligence (pure, sans I/O)** — `src/lib/crisis-intelligence.ts`
- `severityScore(signals)` → 0-100 + niveau (mineur/majeur/critique/catastrophe).
- `escalationPlan(type, severity)` → liste ordonnée de paliers (délais + cibles).
- `nextEscalationAt(level, plan, from)` → échéance SLA.
- `crisisPressure(incidents)` → indice de tension par antenne/nation (densité + sévérité + ancienneté + SLA dépassés).
- Aucune lecture de contenu sensible : ne manipule que des compteurs/flags.

**Couche orchestration (serveur)** — routes `/api/admin/crisis/*` + cron.
- Déclenchement manuel (admin) ou AUTOMATIQUE (cron qui scanne priere_demandes tres_urgent non prises en charge, delivrance niveau profond, mobilisation pays du cockpit gouvernement).
- Moteur d'escalade : cron toutes les 5 min compare next_escalation_at < now() → monte d'un palier, notifie la cible (responsable antenne → antenne mère via parent_id → nation_responsables du pays → super_admin global), journalise.

## Flux d'un incident
1. **Signal réel** (prière tres_urgent / sinistre déclaré / mobilisation détectée) → création `crisis_incidents` (statut 'ouvert', palier 0, severité calculée).
2. **Triage** : pilote assigné, cellule constituée (crisis_assignations), notify ciblé temps réel.
3. **Suivi** : chaque action écrit dans crisis_interventions ; les abonnés Realtime voient le fil live.
4. **Escalade** : si pas d'action avant next_escalation_at → palier+1, nouvelle cible notifiée (remontée hiérarchique antenne→nation→global).
5. **Clôture** : statut 'resolu' ou 'clos', résumé + REX (leçons) écrits → alimente l'historique et les stats.

## Agrégation transverse & intégration à la console mondiale
- `crisis_overview` (RPC) renvoie {ouverts, critiques, sla_depasses, par_pays, par_antenne, tension}. 
- Le cockpit unique V4 (/api/admin/command-center) ajoute un bloc `crise` issu de cet RPC → le Centre de Commandement affiche la crise AU MÊME niveau que croissance/santé/prière, dans la même console multi-contexte (global / nation / antenne). Pas un silo : un onglet du cerveau central, scopé par le même paramètre `pays`/`antenne` que le reste.

### Modèle d'intelligence
## Signaux d'ENTRÉE (tous réels, déjà collectés)
- `priere_demandes.priorite = 'tres_urgent'` ET `assigned_to is null` ET statut ouvert → source `priere_critique`. (déjà indexé)
- `delivrance_demandes.niveau = 'profond'` ET statut in (recu, en_attente) → source `delivrance_grave` (confidentiel=true, on ne lit JAMAIS description/notes_internes — seulement l'existence + l'id).
- `intelligence.mobilisation` du cockpit gouvernement (pays dont ≥40% des membres à risque, min 5 membres, via churnRisk) → source `mobilisation_pays`.
- Déclenchement manuel admin (sinistre antenne, sécurité, santé) avec personnes_touchees + risque_vital saisis.

## FORMULES (crisis-intelligence.ts, pures)
- severityScore = poids_type (delivrance/securite 40 … autre 15) + ampleur (min(30, log10(personnes)*12)) + 15 si source_tres_urgente + 25 si risque_vital + min(15, floor(latence_min/30)*3).
- severiteFromScore : ≥85 catastrophe, ≥65 critique, ≥40 majeur, sinon mineur.
- escalationPlan(severite) → paliers + délais SLA (catastrophe 10/15/20 min ; critique 20/30/45/60 ; majeur 60/120 ; mineur 240). Surchargé par la table crisis_escalation_levels si une config dédiée existe.
- nextEscalationAt(plan, niveau, from) = from + delai_minutes du palier courant. Le cron compare next_escalation_at < now() pour monter d'un palier.
- crisisPressure(incidents) = somme pondérée par sévérité (catastrophe 30 … mineur 3) + 10/SLA dépassé + bonus ancienneté (>24h +6, >6h +3), borné 100.

## SEUILS / ESCALADE
- Cible de palier résolue dynamiquement : responsable_antenne (antennes.responsable_id) → antenne_mere (antennes.parent_id.responsable_id) → nation_pastor (nation_responsables du pays) → super_admin (roles.ts ADMIN_ROLES). Toute montée notifie la cible via notify() (Realtime).

## SORTIES
- Par incident : score_severite (0-100), severite, niveau_escalade, next_escalation_at, sla_depasse.
- Par périmètre : indice_tension (0-100) → colore la carte mondiale et trie l'attention.
- Aucune valeur inventée : sans signal fort, severite='mineur', tension faible. Les sources confidentielles n'exposent qu'un compteur, jamais le contenu.

### APIs
- `GET /api/admin/crisis` — Console crise : liste des incidents ouverts (scopée ?pays= / ?antenne=), agrégats via crisis_overview, SLA dépassés. Garde isAdminRequest, lecture service role, log sensitive_access_logs.
- `POST /api/admin/crisis` — Déclencher un incident manuellement (sinistre antenne, sécurité). Calcule severite/score via severityScore, planifie next_escalation_at via escalationPlan, notifie la cellule (notifyUser). rateLimit en écriture.
- `GET /api/admin/crisis/[id]` — Détail d'un incident + journal d'intervention + assignations (fil temps réel). Si confidentiel → log sensitive_access_logs systématique.
- `POST /api/admin/crisis/[id]/intervention` — Ajouter une action au journal (note/decision/communication), ou changer le statut. Réinitialise/avance l'escalade. notify ciblé Realtime.
- `POST /api/admin/crisis/[id]/assign` — Constituer/ajuster la cellule de crise (pilote, intercesseurs, terrain, communication). Insert crisis_assignations + notifyUser temps réel.
- `POST /api/admin/crisis/[id]/close` — Clôture : statut resolu/clos + REX (retour d'expérience). Alimente l'historique et les stats.
- `POST /api/cron/crisis-engine` — Cron (5 min, garde par CRON_SECRET) : scanne priere_demandes tres_urgent non assignées + delivrance profond + mobilisation pays → crée incidents ; fait monter d'un palier tout incident dont next_escalation_at<now() et notifie la cible suivante (antenne→parent→nation→global).
- `POST /api/cron/crisis-snapshot` — Cron (5-15 min) : recalcule crisis_snapshots (indice de tension par global/pays/antenne via crisisPressure) pour servir la console mondiale sans recalcul live.

### Sécurité
## Portée serveur (RBAC scopé, jamais l'UI seule)
- Toutes les routes /api/admin/crisis/* gardées par isAdminRequest(req) (admin-auth.ts), runtime='nodejs', dynamic='force-dynamic'.
- La portée géographique applique le MÊME modèle que /api/admin/gouvernement et /api/admin/nation : super_admin = global ; nation_pastor (nation_responsables) = filtre `pays` imposé côté serveur ; responsable d'antenne (fondation V4) = filtre `antenne_id`. Le paramètre ?pays / ?antenne est VALIDÉ contre le périmètre du rôle serveur, jamais accepté en aveugle.
- Lecture exclusivement via supabaseAdmin (service role, 'server-only'). crisis_incidents/interventions/snapshots n'ont AUCUNE policy RLS → inaccessibles aux clients (anon/authenticated). Seule crisis_assignations expose à un intervenant SES propres affectations ; crisis_escalation_levels est en lecture authentifiée (config non sensible).

## Données sensibles
- Un incident issu de delivrance (confidentiel=true) ne stocke JAMAIS le contenu privé : seulement source_table='delivrance_demandes' + source_id + un resume neutre. Le contenu reste sous RLS stricte d'origine (select_own).
- Toute lecture d'un incident confidentiel écrit dans sensitive_access_logs (action='crisis_incident_view', scope_pays, role) — comme nation_dashboard_view.
- crisis_overview est SECURITY DEFINER avec revoke sur anon/authenticated → appelable uniquement par la service role.

## Écriture
- rateLimit(clientIp) sur POST (déclenchement, intervention, assign, close) pour freiner les déclenchements abusifs.
- Cron protégé par CRON_SECRET (header) ; IS_DEMO_MODE → early return {ok:true, demo:true} sur toutes les routes.
- Réponses normalisées {ok, data|message}. notify() reste non bloquant (une notif ratée n'interrompt jamais la cellule de crise).

### Scalabilité
## Échelle (dizaines de milliers de membres, multi-pays/antennes)
- **Snapshots pré-agrégés** : crisis_snapshots recalculé par cron (/api/cron/crisis-snapshot, 5-15 min) par scope (global / chaque pays / chaque antenne). La console mondiale lit le snapshot le plus récent → AUCUN recalcul live coûteux à l'affichage.
- **Vue v_crisis_open** : filtre les incidents fermés (where statut not in resolu/clos) — l'index partiel idx_crisis_escal ne porte que sur les incidents actifs, gardant l'escalade O(incidents ouverts) et non O(historique).
- **RPC crisis_overview(scope_pays)** : agrégation côté Postgres (jsonb_object_agg) plutôt qu'en mémoire Node → une seule requête pour le bloc crise du command-center.
- **Cron moteur d'escalade** : ne scanne QUE `where next_escalation_at < now() and statut not in (...)` (index partiel) → coût proportionnel aux incidents dûs, pas au volume total. Idempotent (relance sans effet de bord : palier déjà monté ⇒ next_escalation_at futur).
- **Indexation** : statut, severite, pays, antenne_id, (source_table, source_id) pour dédoublonner la création auto (un même priere_demandes ne crée qu'un incident — upsert sur source_id).
- **Pagination** : journal d'intervention paginé (idx_crisis_interv incident_id, created_at desc), limit/offset côté route.
- **Cache** : le bloc crise du cockpit lit le snapshot (Cache-Control court côté route) ; le détail incident reste dynamique.
- **Realtime ciblé** : notify() insère dans app_notifications déjà abonné — pas de nouveau canal WebSocket par incident, le coût Realtime est mutualisé.

### UX/UI
## Console mondiale (intégrée au Centre de Commandement, pas un silo)
- **/admin/crise** : un onglet du cockpit unique multi-contexte (sélecteur global / nation / antenne partagé avec le reste de V4/V5).
- **Bandeau de tension** : indice_tension global + 3 KPI rouges (incidents ouverts, critiques+, SLA dépassés) issus de crisis_overview/snapshot. Pulsation visuelle si un SLA est dépassé.
- **Carte mondiale** : réutilise la carte du gouvernement (carte.nations) recolorée par indice_tension par pays/antenne — les foyers de crise « s'allument ».
- **File d'incidents** triée par sévérité puis SLA : chip couleur SEVERITE_META, compte à rebours next_escalation_at (« escalade dans 8 min »), badge palier courant et cible.
- **Vue incident (war room)** : 3 colonnes — Cellule (assignations par rôle : pilote/intercesseur/terrain/communication, ajout en 1 clic), Journal d'intervention temps réel (Realtime, fil append-only horodaté), Actions (changer statut, communiquer, escalader manuellement, clôturer+REX).
- **Déclenchement** : bouton « Déclencher une crise » → type, antenne/pays, personnes touchées, risque vital ; aperçu live de la sévérité calculée (severityScore) AVANT validation.
- **Clôture & REX** : formulaire de retour d'expérience (leçons) ; les incidents clos alimentent un historique consultable et les stats.
- **Notifications Realtime** : les membres de la cellule reçoivent l'incident et chaque escalade dans la cloche existante (app_notifications) — continuité avec l'UX déjà en place. FR, sobre, code couleur sévérité cohérent avec ENGAGEMENT_META/RISK_META.

### Cas pastoraux
- Prière critique non prise en charge : une demande priere_demandes 'tres_urgent' (ex. tentative de suicide annoncée) reste sans assigned_to plus de 20 min → le cron crée un incident 'priere_critique', notifie l'intercesseur de garde puis escalade vers le responsable d'antenne, le pasteur de nation, puis le super_admin si toujours sans réponse.
- Sinistre dans une antenne : incendie/inondation à la Chapelle Royale Abidjan → un responsable déclenche un incident 'sinistre_antenne' (personnes_touchees = effectif), constitue une cellule (pilote logistique, communication, intercession), suit la mise à l'abri dans le journal temps réel, communique aux membres via notify, clôture avec REX.
- Cure d'âme grave (délivrance niveau 'profond') : un incident confidentiel est ouvert SANS exposer le contenu ; seuls le pilote et un intercesseur senior sont assignés ; chaque consultation est journalisée (sensitive_access_logs) ; la cellule coordonne l'accompagnement sans fuite de données privées.
- Mobilisation de prière par nation : le cockpit détecte qu'un pays a ≥40% de ses membres à risque (mobilisation) → incident 'mobilisation_pays' → le pasteur de nation organise une chaîne d'intercession ciblée et suit la remontée d'engagement.
- Crise sécuritaire/sanitaire d'un pays (troubles, épidémie) : incident 'securite'/'sante' à risque vital → escalade catastrophe (SLA 10 min) directement jusqu'au super_admin, communication coordonnée multi-antennes, suivi des membres touchés.
- Escalade hiérarchique automatique : un incident majeur ouvert dans une petite antenne sans réponse de son responsable remonte automatiquement à l'antenne mère (parent_id) puis à la nation — garantissant qu'aucune urgence ne reste orpheline.
- Retour d'expérience après crise : à la clôture, le REX capitalise les leçons (ce qui a marché, délais, manques) pour améliorer les paliers d'escalade (crisis_escalation_levels administrables) et la préparation des prochaines crises.

### Lacunes
- Le code V4 référencé (src/lib/command-center.ts, /api/admin/command-center, RBAC scopé par antenne) n'existe PAS encore sur le disque (migrations s'arrêtent à 20260602270000, pas de fichier command-center) : le Centre de crise est conçu pour s'y brancher mais l'intégration exacte (forme du bloc 'crise' agrégé) devra s'aligner sur l'implémentation réelle de V4 quand elle sera livrée.
- La résolution des cibles d'escalade (responsable_antenne via antennes.responsable_id, antenne_mere via parent_id, nation_pastor via nation_responsables, super_admin via ADMIN_ROLES) doit être implémentée dans la route/cron — non incluse ici car dépendante de la présence effective d'un responsable par antenne/pays ; prévoir un fallback super_admin si une cible est absente.
- Pas d'infra cron native décrite côté plateforme (PlanetHoster/Passenger standalone) : /api/cron/crisis-engine et crisis-snapshot supposent un déclencheur externe (cron système ou service planificateur) gardé par CRON_SECRET — à confirmer selon l'hébergement.
- rate-limit.ts est en mémoire mono-processus : suffisant pour le standalone actuel mais à brancher sur un store partagé si déploiement multi-instances (déjà noté dans la lib).
- La détection 'mobilisation_pays' réutilise le calcul du cockpit gouvernement qui charge jusqu'à 5000 profils en mémoire : pour la création auto d'incidents à grande échelle, prévoir de matérialiser ce signal (vue/snapshot) plutôt que de relancer le calcul complet dans le cron.
- Aucune purge/archivage des crisis_interventions et crisis_snapshots n'est définie : à terme prévoir une rétention (partition par mois ou cron de purge des snapshots anciens) pour borner la croissance.

<details><summary>SQL (référence)</summary>

```sql
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
```
</details>

<details><summary>Code clé (référence)</summary>

```typescript
// src/lib/crisis-intelligence.ts
// ----------------------------------------------------------------------------
// V5 — INTELLIGENCE DE CRISE (logique PURE, sans I/O, testable & réutilisable).
//
// Transforme des SIGNAUX RÉELS d'urgence (priorité de la source, ampleur des
// personnes touchées, ancienneté sans prise en charge, type d'incident) en :
//   - un score de sévérité 0-100 + un niveau sur 4 paliers,
//   - un plan d'escalade ordonné (cibles + SLA en minutes),
//   - l'échéance du prochain palier (next_escalation_at),
//   - un indice de TENSION par antenne/nation (densité + gravité + SLA).
//
// Aucune donnée inventée : un incident sans signal fort reste 'mineur'.
// Aucun contenu sensible manipulé — uniquement des compteurs et des flags.
// ----------------------------------------------------------------------------

export type CrisisType =
  | 'priere_critique' | 'delivrance_grave' | 'sinistre_antenne'
  | 'mobilisation_pays' | 'securite' | 'sante' | 'autre'

export type Severite = 'mineur' | 'majeur' | 'critique' | 'catastrophe'

export const SEVERITE_META: Record<Severite, { label: string; color: string; order: number }> = {
  catastrophe: { label: 'Catastrophe', color: '#7F1D1D', order: 0 },
  critique:    { label: 'Critique',    color: '#EF4444', order: 1 },
  majeur:      { label: 'Majeur',      color: '#F59E0B', order: 2 },
  mineur:      { label: 'Mineur',      color: '#EAB308', order: 3 },
}

const MIN = 60_000

/** Poids de base par type d'incident (gravité intrinsèque). */
const TYPE_WEIGHT: Record<CrisisType, number> = {
  delivrance_grave: 40, securite: 40, sante: 35, sinistre_antenne: 35,
  priere_critique: 30, mobilisation_pays: 25, autre: 15,
}

export interface CrisisSignals {
  type: CrisisType
  /** Personnes/membres concernés (1 = individuel ; antenne/pays = plusieurs milliers). */
  personnes_touchees: number
  /** La source est-elle déjà marquée la plus urgente (ex. priere tres_urgent) ? */
  source_tres_urgente: boolean
  /** Minutes écoulées depuis la naissance du signal SANS prise en charge. */
  minutes_sans_prise_en_charge: number
  /** Risque vital / sécurité physique déclaré. */
  risque_vital?: boolean
}

/** Score de sévérité 0-100 (explicable : type + ampleur + urgence source + latence). */
export function severityScore(s: CrisisSignals): number {
  let raw = TYPE_WEIGHT[s.type] ?? 15
  // Ampleur : 1 personne = 0, échelle logarithmique jusqu'à +30 (un pays entier).
  const ampleur = Math.min(30, Math.round(Math.log10(Math.max(1, s.personnes_touchees)) * 12))
  raw += ampleur
  if (s.source_tres_urgente) raw += 15
  if (s.risque_vital) raw += 25
  // Latence : chaque tranche de 30 min sans prise en charge ajoute de la pression (max +15).
  raw += Math.min(15, Math.floor(Math.max(0, s.minutes_sans_prise_en_charge) / 30) * 3)
  return Math.max(0, Math.min(100, raw))
}

export function severiteFromScore(score: number): Severite {
  if (score >= 85) return 'catastrophe'
  if (score >= 65) return 'critique'
  if (score >= 40) return 'majeur'
  return 'mineur'
}

// ── Plan d'escalade ──────────────────────────────────────────────────────
export type EscalationTarget = 'responsable_antenne' | 'antenne_mere' | 'nation_pastor' | 'super_admin'

export interface EscalationStep { niveau: number; cible: EscalationTarget; delai_minutes: number }

/**
 * Plan d'escalade par défaut (utilisé si crisis_escalation_levels ne fournit
 * pas de config dédiée). Plus c'est grave, plus la remontée est rapide.
 */
export function escalationPlan(severite: Severite): EscalationStep[] {
  switch (severite) {
    case 'catastrophe': return [
      { niveau: 0, cible: 'responsable_antenne', delai_minutes: 10 },
      { niveau: 1, cible: 'nation_pastor', delai_minutes: 15 },
      { niveau: 2, cible: 'super_admin', delai_minutes: 20 },
    ]
    case 'critique': return [
      { niveau: 0, cible: 'responsable_antenne', delai_minutes: 20 },
      { niveau: 1, cible: 'antenne_mere', delai_minutes: 30 },
      { niveau: 2, cible: 'nation_pastor', delai_minutes: 45 },
      { niveau: 3, cible: 'super_admin', delai_minutes: 60 },
    ]
    case 'majeur': return [
      { niveau: 0, cible: 'responsable_antenne', delai_minutes: 60 },
      { niveau: 1, cible: 'nation_pastor', delai_minutes: 120 },
    ]
    default: return [{ niveau: 0, cible: 'responsable_antenne', delai_minutes: 240 }]
  }
}

/** Échéance du prochain palier (null si plus de palier = escalade au sommet). */
export function nextEscalationAt(plan: EscalationStep[], niveauCourant: number, fromMs: number): string | null {
  const step = plan.find((p) => p.niveau === niveauCourant)
  if (!step) return null
  return new Date(fromMs + step.delai_minutes * MIN).toISOString()
}

/** Cible du palier courant (qui doit être notifié maintenant). */
export function targetForLevel(plan: EscalationStep[], niveau: number): EscalationTarget | null {
  return plan.find((p) => p.niveau === niveau)?.cible ?? null
}

// ── Indice de tension (par antenne / nation) ───────────────────────────────
export interface OpenIncidentLite {
  severite: Severite
  created_at: string
  sla_depasse: boolean
}

/**
 * Indice de tension 0-100 d'un périmètre : combine le NOMBRE d'incidents ouverts,
 * leur GRAVITÉ, leur ANCIENNETÉ et les SLA dépassés. Permet de colorer la carte
 * mondiale et de hiérarchiser l'attention du Centre de Commandement.
 */
export function crisisPressure(incidents: OpenIncidentLite[], now: number): number {
  if (!incidents.length) return 0
  const sevW: Record<Severite, number> = { catastrophe: 30, critique: 18, majeur: 8, mineur: 3 }
  let raw = 0
  for (const i of incidents) {
    raw += sevW[i.severite] ?? 3
    if (i.sla_depasse) raw += 10
    const ageH = (now - Date.parse(i.created_at)) / 3_600_000
    if (ageH > 24) raw += 6
    else if (ageH > 6) raw += 3
  }
  return Math.min(100, Math.round(raw))
}
```
</details>

---

## CENTRE MISSIONNAIRE MONDIAL
**Réutilise :** expansion_zones (V4) — registre des CIBLES/champs de mission : on l'ÉTEND (champ_id, peuple_cible, langue_cible, population_estimee, est_atteint) au lieu de créer une table champs concurrente. Les statuts prospect/preparation/implantee deviennent le cycle de vie du projet.; antennes + antenne_descendants(uuid) + antenne_responsables — une implantation réussie POINTE vers l'antenne née (antenne_id) ; le scope RBAC d'antenne s'applique tel quel aux projets.; cartographie_monde(p_scope_pays) (V4) — on AJOUTE une RPC mission_carte_monde qui réutilise geo_localites pour positionner champs/projets/missionnaires sur la même carte ; pas de second système de coordonnées.; geo_localites — lat/lng des pays/villes pour cartographier les champs sans géocoder à nouveau.; dons (Chariow) — financement de mission SANS nouveau moteur de paiement : on fléche via dons.campagne = 'mission:<projet_id>' et dons.meta_json->>'mission_projet_id'. Total TOUJOURS par devise (jamais d'addition inter-devises), comme antenne_stats_agg.; profiles (role, pays, ville, antenne_id, derniere_connexion) — les ENVOYÉS sont des profiles ; rôle enum 'missionnaire' ajouté ; pas de table d'identité dupliquée.; command_center_kpis(text[],uuid[]) + buildKpiTiles (lib command-center.ts) — on ajoute une tuile 'Mission' au cockpit mondial via la même RPC scopée.; pastoral-intelligence.ts (logique PURE, 0 I/O, FR) — modèle réutilisé pour mission-intelligence.ts (scores + alertes pures, testables).

### Architecture
## Composants

**Couche données (additive sur V4)**
- `mission_champs` : registre des champs (peuples/zones cibles) — slug, pays, ville, peuple_cible, langue_cible, population_estimee, est_atteint, priorite, lat/lng (fallback geo_localites), responsable_id. Lié optionnellement à `expansion_zones.champ_id`.
- `mission_projets` : projet d'implantation rattaché à un champ + une antenne mère (antenne_parent_id) ; cycle prospect→preparation→lancement→implantee→suspendu ; objectif_membres, objectif_financement, devise, date_cible, antenne_id (l'antenne NÉE), score/proba dénormalisés (snapshot).
- `mission_envoyes` : affectation profile↔projet (role: pionnier/equipe/intercesseur/soutien), statut, date_envoi, derniere_remontee_at.
- `mission_fruits` : journal des fruits remontés (type: conversion/bapteme/cellule/formation/evenement/baptise_eau, quantite, date_fruit, source) — la matière première du score.
- `mission_jalons` : étapes de projet (terrain trouvé, équipe constituée, 1er culte…) avec statut.
- (financement = `dons` existant fléché par campagne, AUCUNE nouvelle table de paiement)

**Couche intelligence (lib PURE, 0 I/O)** — `src/lib/mission-intelligence.ts`
- Entrée = `MissionSignals` (snapshot agrégé d'un projet). Sortie = vitalityScore (0-100), implantationProbability (0-100), missionStage, missionAlerts[]. Aucune dépendance Supabase, testable, importée par la route ET par le job de snapshot.

**Couche agrégation SET-BASED (RPC SQL security definer)**
- `mission_projet_signals(scope_pays text[], scope_antennes uuid[])` → jsonb[] : 1 aller-retour, agrège financement (dons par devise + % objectif), fruits (somme par type, fruits_30j), envoyés (actifs/silencieux), jalons (% complétés), récence — JAMAIS de pull 100k lignes.
- `mission_carte_monde(p_scope_pays)` → jsonb : champs + projets + envoyés géolocalisés (réutilise geo_localites), branché dans la console carte.
- `mission_pulse_kpis(...)` → jsonb : compteurs pour la tuile cockpit (projets actifs, en risque, financement collecté par devise, fruits_30j, antennes nées 12m).

**Couche API** — `/api/admin/mission` (cockpit, GET scopé), `/api/admin/mission/projets` (CRUD service role), `/api/admin/mission/fruits` (POST remontée terrain).

**Couche console** — page `/admin/mission` : carte mondiale des champs (réutilise le canvas cartographie), pipeline Kanban des projets par stage, jauges Vitalité/Probabilité, file d'alertes, classement des champs prioritaires.

## Flux
1. Terrain → remontée de fruits (POST /fruits) ou don Chariow (webhook fléche campagne=mission:<id>).
2. Cron nocturne `mission_snapshot` : appelle `mission_projet_signals(NULL,NULL)`, passe chaque signal dans `mission-intelligence.ts`, écrit score/proba/stage dans `mission_projets` + alimente `mv_mission_pulse`.
3. Job d'alertes : compare snapshots, produit alertes, `notify()` les responsables.
4. Console `/admin/mission` : lit `/api/admin/mission` (RPC live + snapshot), affiche scores/carte/pipeline.

## Agrégation transverse & intégration console mondiale
- Le command-center V4 reste le cockpit racine : on ajoute UNE tuile « Mission » (projets actifs · financement · fruits 30j) calculée par `mission_pulse_kpis` et insérée dans `buildKpiTiles`, pré-filtrée par le contexte (global/nation/antenne) — le clic ouvre `/admin/mission?context=...`.
- La portée (paysAllowed / antenneIdsAllowed) est résolue par le MÊME `resolveScope`/`contextToFilters` que command-center : le centre missionnaire n'est pas un silo, il hérite du scope mondial. Un responsable d'antenne ne voit que les projets de son sous-arbre (antenne_descendants).
- `mission_carte_monde` se superpose à `cartographie_monde` sur la même carte (couches champs/projets en plus des nations/antennes/expansion).

### Modèle d'intelligence
## Signaux d'ENTRÉE (tous réels, aucun inventé) — agrégés par mission_projet_signals
- Financement : SUM(dons.montant) PAR DEVISE où dons.statut='complete' ET (dons.campagne='mission:<projet_id>' OU dons.meta_json->>'mission_projet_id'=<projet_id>). Total dans la devise du projet → financementPct = total/objectif_financement.
- Équipe : mission_envoyes (envoyes_actifs, envoyes_silencieux = actifs sans derniere_remontee_at depuis 21 j).
- Fruits : mission_fruits agrégés par type + fruits_30j + fruits_total + dernier_fruit. membresPct = (conversions+baptêmes)/objectif_membres.
- Jalons : mission_jalons (atteints/total).
- Récence : max(dernier_fruit, derniere_remontee) → lastSignalDays.
- Échéance : mission_projets.date_cible vs now.

## Formules (mission-intelligence.ts, PUR)
**Score de Vitalité (0-100)** = financement(25·min(pct,1)) + équipe(20·min(actifs,4)/4) + fruits(25·min(fruits_30j,20)/20) + jalons(15·atteints/total) + récence(15 si ≤7j, 10 si ≤21j, 5 si ≤45j). statut=implantee→100, suspendu→0.
**Probabilité d'Implantation 90j (0-100)** = vitalité·0.7 + momentum·30, où momentum=fruits_30j/fruits_total. Pénalités : -15 échéance dépassée, -10 si tous les envoyés silencieux. Bonus : +10 financement complet. Borné [0,100].
**Étape (MissionStage)** : implantee→né ; prospect→à lancer ; vitalité≥75 & objectif membres atteint (ou ≥12 fruits)→prêt à naître ; vitalité≥45 ou fruits_30j>0→croissance ; envoyés actifs→pionnier ; sinon→préparation.

## Seuils & sorties d'ALERTES
- financement_bloque (HAUTE) si objectif défini & pct<0.5.
- projet_stagnant (HAUTE) si aucun signal OU >45 j.
- envoye_silencieux (MOYENNE) si ≥1 envoyé sans remontée >21 j.
- echeance_depassee (MOYENNE) si date_cible<now.
- pret_a_naitre (INFO) si étape=prêt à naître → déclenche le workflow de création d'antenne (antennes + antenne_responsables).
Le cron écrit vitalite_score/implantation_proba/stage_calcule dans mission_projets (lecture cockpit O(1)) et notify() les alertes HAUTES aux responsables. Principe Citadelle : un projet sans signal reste bas/stagnant, jamais embelli.

### APIs
- `GET /api/admin/mission?context=global|nation:CI|antenne:<uuid>` — Cockpit missionnaire mondial : résout la portée serveur (réutilise contextToFilters du command-center), appelle mission_projet_signals + mission_pulse_kpis + mission_carte_monde, calcule scores/probas/alertes via mission-intelligence.ts, journalise sensitive_access_logs. Réponse {ok,data}.
- `GET /api/admin/mission/projets?statut=&champ=` — Liste paginée des projets (lecture pilotage, garde admin, scope). Réponse {ok,data}.
- `POST /api/admin/mission/projets` — Crée/MAJ un projet d'implantation (service role, rateLimit/clientIp). Body {titre,champ_id,antenne_parent_id,objectif_financement,...}. Réponse {ok,data|message}.
- `POST /api/admin/mission/fruits` — Remontée terrain : enregistre un fruit (conversion/bapteme/cellule...), met à jour mission_envoyes.derniere_remontee_at, déclenche recalcul snapshot du projet. Garde admin OU envoyé du projet. Réponse {ok,data}.
- `POST /api/cron/mission-snapshot` — Job nocturne (garde header CRON_SECRET) : pour chaque projet, mission_projet_signals → mission-intelligence.ts → écrit vitalite_score/implantation_proba/stage_calcule/snapshot_at, refresh_mission_pulse(), notify() les alertes haute sévérité aux responsables.

### Sécurité
- Gardes : /api/admin/mission* protégées par isAdminRequest(req) (cookie cier_admin) ; /fruits accepte en plus un envoyé authentifié membre du projet (getSessionProfile + mission_envoyes). Lectures via supabaseAdmin (service role, bypass RLS) côté serveur only ('server-only' implicite des libs supabase).
- IS_DEMO_MODE : early return {ok,true,demo} sur toutes les routes, comme command-center/gouvernement.
- Portée par rôle résolue CÔTÉ SERVEUR : réutilise resolveScope/contextToFilters du command-center (super_admin=global ; nation_pastor=ses pays ; responsable_antenne=son sous-arbre via antenne_descendants). L'UI ne décide jamais du scope ; clampContext borne tout contexte forcé.
- RLS : mission_champs/mission_projets lecture publique LIMITÉE (champs atteints / projets implantés = vitrine) ; mission_envoyes lecture = propriétaire ; mission_fruits + mission_jalons = AUCUNE policy (service role only, suivi pastoral interne). Toute écriture = service role.
- RPC en security definer avec set search_path=public et revoke all ... from public, anon, authenticated — invocables seulement par la clé service role, comme command_center_kpis/cartographie_monde V4.
- Journalisation : chaque consultation du cockpit insère sensitive_access_logs {role: scope.kind, scope_pays: ctx, action: 'mission_command_view'} ; les remontées de fruits sont tracées via rapporte_par.
- Données sensibles : on ne lit jamais le contenu nominatif des convertis ; les fruits sont des AGRÉGATS quantitatifs (quantite par type), pas des identités. Le financement n'expose que des totaux par devise (jamais d'addition inter-devises).
- Écriture : rateLimit/clientIp sur POST /projets et /fruits ; cron gardé par header CRON_SECRET comparé à env.

### Scalabilité
- Aucune route ne tire 100k lignes : mission_projet_signals / mission_pulse_kpis / mission_carte_monde sont SET-BASED (jsonb agrégé en 1 aller-retour), calquées sur command_center_kpis V4. Le nombre de projets est en milliers max (pas en dizaines de milliers), donc agrégat trivial même à l'échelle mondiale.
- Snapshot dénormalisé : vitalite_score/implantation_proba/stage_calcule écrits dans mission_projets par le cron nocturne → le cockpit et la carte lisent O(1) sans recalcul ; idx_mprojets_score pour le classement.
- Vue matérialisée mv_mission_pulse (fruits/mois/projet/pays/type, fenêtre 400 j) + refresh_mission_pulse() en REFRESH CONCURRENTLY (index unique présent) → courbes de tendance sans scan répété, patron identique à mv_command_center_daily.
- Cron : /api/cron/mission-snapshot (Vercel cron ou pg_cron) recalcule snapshots + refresh MV + dispatch alertes ; idempotent (recalcul complet, pas d'état accumulé).
- Index de scope composites : idx_mprojets_statut, idx_mprojets_antparent/antnee, idx_mchamps_pays, idx_mfruits_projet/type, idx_menvoyes_projet — supportent le filtrage par pays/antenne/sous-arbre à l'échelle multi-pays.
- Financement : jointure latérale bornée par dons.statut='complete' + filtre campagne indexable ; multi-devises agrégées par devise (jamais de conversion silencieuse). Pagination sur /projets (limit/offset) ; carte limitée aux champs/projets actifs.
- Realtime non requis ici (rythme mission = jours/semaines) ; les alertes passent par app_notifications/notify() déjà scalable.

### UX/UI
Console mondiale `/admin/mission` (intégrée comme tuile « Mission » du command-center racine, pré-filtrée par contexte global/nation/antenne) :
- Bandeau KPI (mission_pulse_kpis) : Projets actifs · En risque · Antennes nées (12 m) · Champs ouverts · Envoyés actifs · Fruits 30 j · Financement PAR DEVISE.
- Carte mondiale : superposition sur le canvas cartographie V4 — pastilles champs (couleur=priorité, taille=population_estimee), projets (couleur=stage, halo=vitalité), antennes nées. Clic → fiche projet.
- Pipeline Kanban par MissionStage (À lancer → Préparation → Pionnier → Croissance → Prêt à naître → Né) ; chaque carte montre jauge Vitalité (anneau 0-100) + Probabilité d'implantation (barre) + financement %.
- File d'alertes triée par sévérité (HAUTE financement bloqué/stagnant en tête), action directe « Relancer / Affecter / Planifier naissance ».
- Classement des champs prioritaires non atteints (population vs présence) pour décider où envoyer.
- Fiche projet : objectifs (membres/financement), équipe d'envoyés + dernière remontée, courbe fruits (mv_mission_pulse), jalons, bouton « Promouvoir en antenne » (visible si stage=pret_antenne) qui pré-remplit la création d'antenne.
Cohérence visuelle : mêmes tokens couleur que ENGAGEMENT/STAGE_META (#D4AF37 doré, #22C55E vert), libellés FR, devise FCFA par défaut, jamais d'addition inter-devises affichée.

### Cas pastoraux
- Décider OÙ envoyer : le classement des champs non atteints (population_estimee vs projets actifs) montre qu'un peuple cible de 200k sans aucun projet doit passer avant une 3e implantation dans une ville déjà couverte.
- Sauver un projet qui meurt : alerte projet_stagnant (>45j sans fruit ni remontée) + envoye_silencieux remonte au responsable d'antenne mère → relance pastorale avant l'échec.
- Débloquer le financement : alerte financement_bloque (<50% objectif) déclenche une campagne Chariow fléchée (dons.campagne='mission:<id>') ; chaque don alimente directement la jauge sans saisie manuelle.
- Faire NAÎTRE une antenne : quand un projet atteint stage 'pret_antenne' (vitalité≥75 + objectif membres atteint), alerte pret_a_naitre + bouton 'Promouvoir en antenne' crée l'antenne (antennes/antenne_responsables) et lie mission_projets.antenne_id — la mission devient une cellule du Centre de Commandement.
- Responsabiliser les envoyés : la remontée de fruits (POST /fruits) met à jour derniere_remontee_at ; un envoyé qui ne rapporte rien depuis 21j devient visible → suivi du missionnaire, pas seulement du projet.
- Piloter par nation : un nation_pastor (scope CI) ne voit QUE les projets/champs de ses pays, avec ses propres KPI et alertes — décentralisation réelle sans perte de la vue mondiale du super_admin.
- Célébrer les fruits : la courbe mv_mission_pulse (conversions/baptêmes/cellules par mois) alimente témoignages et rapports d'œuvre pour mobiliser l'intercession et le don.

### Lacunes
- mission-intelligence.ts contient une ligne morte dans implantationProbability (première affectation de p écrasée par la seconde) — à nettoyer avant commit : ne garder que `let p = v*0.7 + momentum*30`. Le résultat final est correct mais la ligne intermédiaire doit être supprimée.
- Le rattachement pays d'un projet passe par mission_champs.pays ; un projet sans champ (champ_id null) échappe au filtre scope_pays — imposer champ_id obligatoire à la création OU ajouter une colonne pays dénormalisée sur mission_projets si des projets hors-champ doivent exister.
- membresPct utilise les fruits conversion+bapteme comme proxy du nombre de membres faute de roster nominatif côté terrain ; si un vrai comptage de membres de l'antenne naissante est souhaité, brancher profiles.antenne_id une fois l'antenne créée.
- Le cron mission-snapshot et la garde CRON_SECRET ne sont pas encore implémentés en route.ts (seul le contrat est défini) ; à créer sous /api/cron/mission-snapshot suivant le patron refresh_command_center_daily.
- La promotion projet→antenne (bouton UI) suppose une route POST /api/admin/mission/projets/[id]/promouvoir non détaillée ici : créer l'antenne, antenne_responsables, et set mission_projets.statut='implantee'+antenne_id+date_implantation.
- pg_cron vs Vercel cron : selon l'hébergement PlanetHoster/Passenger, le déclencheur du snapshot doit être confirmé (cron externe appelant l'URL gardée, ou pg_cron si l'extension est disponible).
- L'ajout de valeur enum 'missionnaire' à user_role doit être dans une migration SÉPARÉE ou en début de fichier hors transaction (alter type add value ne peut coexister avec son usage dans la même transaction sur certaines versions PG) — vérifier au déploiement comme pour 'responsable_antenne'/'mentor' en V4.

<details><summary>SQL (référence)</summary>

```sql
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
```
</details>

<details><summary>Code clé (référence)</summary>

```typescript
// src/lib/mission-intelligence.ts
// ----------------------------------------------------------------------------
// INTELLIGENCE MISSIONNAIRE — logique PURE (sans I/O), testable & réutilisable.
// Calque pastoral-intelligence.ts : signaux RÉELS d'un projet d'implantation
//   → Score de Vitalité (0-100), Probabilité d'Implantation (0-100, prédiction
//   90j), étape de mission, alertes. Aucune donnée inventée : un projet sans
//   signal reste 'a_lancer' / score bas. Importée par la route ET le cron.
//
// Réutilise la convention FR + le découpage seuils/labels de Citadelle.

const DAY = 86_400_000

/** Snapshot agrégé d'un projet, fourni par la RPC mission_projet_signals. */
export interface MissionSignals {
  projet_id: string
  titre: string
  statut: 'prospect' | 'preparation' | 'lancement' | 'implantee' | 'suspendu'
  devise: string
  pays: string | null
  objectif_financement: number | null
  objectif_membres: number | null
  date_cible: string | null
  created_at: string | null
  financement_par_devise: Record<string, number>
  financement_devise_projet: number     // total dans la devise du projet
  fruits_par_type: Record<string, number>
  fruits_30j: number
  fruits_total: number
  dernier_fruit: string | null
  envoyes_actifs: number
  envoyes_silencieux: number
  derniere_remontee: string | null
  jalons_total: number
  jalons_atteints: number
}

// ── Étapes de mission (lisibilité métier) ──
export type MissionStage = 'a_lancer' | 'preparation' | 'pionnier' | 'croissance' | 'pret_antenne' | 'ne'
export const MISSION_STAGE_META: Record<MissionStage, { label: string; color: string; order: number }> = {
  a_lancer:     { label: 'À lancer',          color: '#6B7280', order: 0 },
  preparation:  { label: 'En préparation',    color: '#0EA5E9', order: 1 },
  pionnier:     { label: 'Pionnier sur place', color: '#8B5CF6', order: 2 },
  croissance:   { label: 'Croissance',        color: '#84CC16', order: 3 },
  pret_antenne: { label: "Prêt à devenir antenne", color: '#D4AF37', order: 4 },
  ne:           { label: 'Antenne née',       color: '#22C55E', order: 5 },
}

/** Jours depuis la dernière preuve de vie (fruit OU remontée envoyé). */
export function lastSignalDays(s: MissionSignals, now: number): number | null {
  const ts: number[] = []
  for (const v of [s.dernier_fruit, s.derniere_remontee]) {
    if (v) { const t = Date.parse(v); if (!isNaN(t)) ts.push(t) }
  }
  if (!ts.length) return null
  return Math.floor((now - Math.max(...ts)) / DAY)
}

/** Taux de financement atteint (0..1+) dans la devise du projet. */
export function financementPct(s: MissionSignals): number {
  if (!s.objectif_financement || s.objectif_financement <= 0) return 0
  return s.financement_devise_projet / s.objectif_financement
}

/** Taux de membres atteint via fruits 'conversion'+'bapteme' (proxy faute de roster). */
export function membresPct(s: MissionSignals): number {
  if (!s.objectif_membres || s.objectif_membres <= 0) return 0
  const m = (s.fruits_par_type['conversion'] || 0) + (s.fruits_par_type['bapteme'] || 0)
  return m / s.objectif_membres
}

/**
 * SCORE DE VITALITÉ (0-100) — combine 5 dimensions pondérées :
 *   financement (25), présence/équipe (20), fruits récents (25),
 *   jalons franchis (15), récence du signal (15). Aucune dimension n'invente :
 *   un projet sans signal = 0 partout.
 */
export function vitalityScore(s: MissionSignals, now: number): number {
  if (s.statut === 'implantee') return 100
  if (s.statut === 'suspendu') return 0

  const fin = Math.min(financementPct(s), 1) * 25
  const equipe = Math.min(s.envoyes_actifs, 4) / 4 * 20
  const fruits = Math.min(s.fruits_30j, 20) / 20 * 25
  const jalons = s.jalons_total > 0 ? (s.jalons_atteints / s.jalons_total) * 15 : 0

  const d = lastSignalDays(s, now)
  let recence = 0
  if (d !== null) {
    if (d <= 7) recence = 15
    else if (d <= 21) recence = 10
    else if (d <= 45) recence = 5
  }
  return Math.round(Math.min(fin + equipe + fruits + jalons + recence, 100))
}

/**
 * PROBABILITÉ D'IMPLANTATION à 90j (0-100) — prédiction. Pondère la vitalité
 * par la TRAJECTOIRE (fruits récents vs total = momentum) et pénalise le
 * dépassement d'échéance et les envoyés silencieux. Calibrable, pas magique.
 */
export function implantationProbability(s: MissionSignals, now: number): number {
  if (s.statut === 'implantee') return 100
  if (s.statut === 'suspendu') return 0
  const v = vitalityScore(s, now)

  // Momentum : part des fruits arrivés sur les 30 derniers jours.
  const momentum = s.fruits_total > 0 ? Math.min(s.fruits_30j / s.fruits_total, 1) : 0
  let p = v * 0.7 + momentum * 30 * 0.3 * (100 / 30) * 0.01 * 30 // base vitalité + impulsion momentum
  p = v * 0.7 + momentum * 30

  // Pénalité échéance dépassée sans implantation.
  if (s.date_cible) {
    const dc = Date.parse(s.date_cible)
    if (!isNaN(dc) && dc < now) p -= 15
  }
  // Pénalité équipe silencieuse.
  if (s.envoyes_actifs > 0 && s.envoyes_silencieux >= s.envoyes_actifs) p -= 10
  // Bonus financement complet = capacité de tenir.
  if (financementPct(s) >= 1) p += 10

  return Math.max(0, Math.min(Math.round(p), 100))
}

/** Étape de mission dérivée des signaux + statut administratif. */
export function missionStage(s: MissionSignals, now: number): MissionStage {
  if (s.statut === 'implantee') return 'ne'
  if (s.statut === 'prospect') return 'a_lancer'
  const v = vitalityScore(s, now)
  const memb = membresPct(s)
  if (v >= 75 && (memb >= 1 || (s.objectif_membres == null && s.fruits_total >= 12))) return 'pret_antenne'
  if (v >= 45 || s.fruits_30j > 0) return 'croissance'
  if (s.envoyes_actifs > 0) return 'pionnier'
  return 'preparation'
}

// ── Alertes mission ──
export type MissionAlertType =
  | 'financement_bloque' | 'projet_stagnant' | 'envoye_silencieux'
  | 'echeance_depassee' | 'pret_a_naitre' | 'champ_sans_projet'
export const MISSION_ALERT_META: Record<MissionAlertType, { label: string; severite: 'haute' | 'moyenne' | 'info' }> = {
  financement_bloque: { label: 'Financement insuffisant', severite: 'haute' },
  projet_stagnant:    { label: 'Projet sans signal',      severite: 'haute' },
  envoye_silencieux:  { label: 'Envoyé(s) silencieux',    severite: 'moyenne' },
  echeance_depassee:  { label: 'Échéance dépassée',       severite: 'moyenne' },
  pret_a_naitre:      { label: 'Prêt à devenir antenne',  severite: 'info' },
  champ_sans_projet:  { label: 'Champ sans projet actif', severite: 'info' },
}
export interface MissionAlert {
  type: MissionAlertType
  severite: 'haute' | 'moyenne' | 'info'
  projet_id: string
  titre: string
  pays: string | null
  detail: string
}

/** Construit les alertes d'un projet (peut en générer plusieurs). */
export function missionAlerts(s: MissionSignals, now: number): MissionAlert[] {
  const out: MissionAlert[] = []
  const base = { projet_id: s.projet_id, titre: s.titre, pays: s.pays }
  if (s.statut === 'implantee' || s.statut === 'suspendu') return out
  const d = lastSignalDays(s, now)

  if (s.objectif_financement && financementPct(s) < 0.5) {
    out.push({ ...base, type: 'financement_bloque', severite: MISSION_ALERT_META.financement_bloque.severite,
      detail: `${Math.round(financementPct(s) * 100)}% de l'objectif (${s.devise})` })
  }
  if (d === null || d > 45) {
    out.push({ ...base, type: 'projet_stagnant', severite: MISSION_ALERT_META.projet_stagnant.severite,
      detail: d === null ? 'Aucun signal terrain' : `Aucun signal depuis ${d} j` })
  }
  if (s.envoyes_silencieux > 0) {
    out.push({ ...base, type: 'envoye_silencieux', severite: MISSION_ALERT_META.envoye_silencieux.severite,
      detail: `${s.envoyes_silencieux} envoyé(s) sans remontée depuis 21 j` })
  }
  if (s.date_cible) {
    const dc = Date.parse(s.date_cible)
    if (!isNaN(dc) && dc < now) out.push({ ...base, type: 'echeance_depassee', severite: MISSION_ALERT_META.echeance_depassee.severite,
      detail: `Échéance du ${s.date_cible} dépassée` })
  }
  if (missionStage(s, now) === 'pret_antenne') {
    out.push({ ...base, type: 'pret_a_naitre', severite: MISSION_ALERT_META.pret_a_naitre.severite,
      detail: 'Vitalité élevée + objectifs atteints → planifier la naissance' })
  }
  return out
}
```
</details>

---

## FINANCES MONDIALES
**Réutilise :** public.dons (montant, devise, statut='complete', antenne_id, source, type, programme, campagne, user_id, created_at, meta_json, chariow_transaction_id) — source primaire des flux entrants; public.product_purchases (montant, devise, statut='complete', product_id, chariow_transaction_id, created_at) — recettes marketplace; rattachement antenne/pays via marketplace_products.plateforme/pays; public.marketplace_products (prix, devise, plateforme, pays) — dimensionnement et rattachement geo des achats; public.antennes (pays, devise locale, parent_id hierarchie, responsable_id) — dimension d'agregation antenne->nation->monde + devise locale par defaut; src/lib/admin-auth.ts isAdminRequest() — garde admin sur la route; src/lib/supabase.ts supabaseAdmin + IS_DEMO_MODE — client service-role, early return demo; src/lib/nation-stats.ts (pattern countIn/scope pays) et src/lib/command-center.ts (agregation KPIs transverses, fondation V4) — la finance s'y branche comme un module; src/lib/roles.ts ADMIN_ROLES/isAdmin + nation_responsables (RBAC scope pays) — portee serveur

### Architecture
## Composants

**1. Couche SQL d'agregation (nouvelle migration `20260603200000_finances_mondiales.sql`)**
- `fx_rates` : table de taux de change vers la devise pivot (FCFA/XOF). Une ligne par (devise, effective_date). Idempotente, seedee pour XOF/EUR/CAD/USD/GBP.
- `finance_snapshots` : table de snapshots quotidiens pre-agreges par (scope_type, scope_id, devise, jour) — evite de scanner dons/purchases en live a l'echelle de dizaines de milliers de transactions.
- `finance_anomaly_alerts` : alertes financieres detectees (pic, chute, devise inattendue, don hors-norme) avec statut de traitement.
- `finance_config` : seuils configurables d'anomalie par scope (pas de magie en dur).
- Vue `v_finance_flux` : UNION normalisee dons + product_purchases avec colonnes communes (scope antenne, pays, devise, montant, source, jour) — source unique de verite.
- RPC `finance_aggregate(scope_pays, scope_antenne, depuis, jusqua)` : agrege la vue par devise ET en pivot (montant_pivot = montant * taux), retourne totaux + serie temporelle. SECURITY DEFINER, appelee uniquement par le service role.
- RPC `finance_build_snapshots(jour)` : materialise les snapshots du jour (appelee par cron).

**2. Couche intelligence PURE (`src/lib/finance-intelligence.ts`)** — sans I/O, testable:
- conversion pivot (applyFx), consolidation multi-devises, calcul de tendance (MoM/YoY), projection lineaire ponderee par recence, detection d'anomalie statistique (z-score sur serie + regles devise/montant), score de sante financiere et de diversification des sources.

**3. Couche route (`src/app/api/admin/finances/route.ts`)** — orchestration:
- garde isAdminRequest, scope par role (nation_responsables), early demo, journalisation sensitive_access_logs.
- lit snapshots (rapide) ou RPC live (fallback), charge fx_rates, appelle finance-intelligence pur, renvoie consolidation + tendances + projections + alertes.

**4. Cron** (`finance_build_snapshots` nocturne via Supabase pg_cron ou route protegee) + endpoint POST `/api/admin/finances/snapshot` declenche par scheduler.

## Flux de donnees
dons + product_purchases  ->  v_finance_flux (normalisation)  ->  finance_build_snapshots() nocturne  ->  finance_snapshots (par scope+devise+jour)  ->  RPC finance_aggregate / lecture snapshots  ->  finance-intelligence.ts (pivot, tendance, projection, anomalie)  ->  /api/admin/finances  ->  console mondiale.

## Agregation transverse
La hierarchie antennes.parent_id permet le roll-up antenne -> nation -> monde. Le scope_type du snapshot ('antenne'|'pays'|'monde') stocke les trois granularites pre-calculees. La conversion pivot rend toutes les nations comparables sur un meme axe.

## Integration a la console mondiale
Module `finances` expose par command-center.ts (V4) au meme titre que croissance/sante/mission. Le cockpit unique multi-contexte (global/antenne/nation) consomme /api/admin/finances avec le meme parametre ?pays / ?antenne que les autres modules, garantissant une vue financiere coherente avec le reste du Centre de Commandement.

### Modèle d'intelligence
## Signaux d'entree (100% reels, aucune fabrication)
- dons completes: montant, devise, source, type, antenne_id, created_at (statut='complete' uniquement).
- product_purchases completes: montant, devise, created_at, rattachement pays via marketplace_products.pays.
- antennes: pays, devise locale (definit les devises 'connues'), parent_id (roll-up).
- fx_rates: taux pivot par devise et date d'effet (conversion historiquement correcte: le taux applique est celui en vigueur au jour du flux via lateral join).

## Conversion pivot
montant_pivot = montant * taux_pivot(devise, jour_du_flux). FCFA/XOF = 1:1. EUR = 655.957 (parite fixe BCEAO, fiable). CAD/USD/GBP = taux manuels editables. La regle d'or heritee de gouvernement/route.ts est preservee: on n'additionne JAMAIS des devises differentes en brut; on n'additionne qu'apres conversion pivot, et on conserve TOUJOURS la repartition par devise (part_pct).

## Formules
- Consolidation: total_pivot = somme(montant_pivot); part_pct(devise) = round(total_pivot_devise / total_pivot * 100).
- Tendance MoM = (mois_courant - mois_precedent) / mois_precedent * 100; YoY = vs mois -12 (null si historique insuffisant -> pas d'invention).
- Projection: regression lineaire ponderee par recence (poids 1..n) sur les 6 derniers mois clos; confiance = haute (>=5 pts), moyenne (3-4), faible (<3).
- Sante financiere 0-100 = regularite (50 pts, base sur coefficient de variation CV des recettes) + diversite des sources (30 pts, plafonnee a 5 sources) + tendance (20 pts).
- Anomalies:
  * pic/chute: z-score sur la serie journaliere (z = (x-moyenne)/ecart-type), seuil configurable (defaut 2.5), exige >=7 jours d'historique reel sinon aucune detection.
  * devise_inattendue (severite haute): devise hors devises des antennes -> signal de fraude/erreur de config.
  * don_hors_norme (severite haute): transaction unitaire >= don_max_pivot (defaut 5 000 000 FCFA) a verifier (blanchiment, erreur, don exceptionnel a accuser reception).

## Sorties
total consolide pivot + par devise, serie mensuelle, MoM/YoY, projection prochain mois + confiance, score de sante, liste d'anomalies horodatees et persistees (upsert idempotent dans finance_anomaly_alerts).

### APIs
- `GET /api/admin/finances` — Console mondiale: consolidation multi-devises + pivot FCFA, tendances MoM/YoY, projection, alertes. Params ?pays= et ?antenne= (portee imposee par role). Garde isAdminRequest, journalise sensitive_access_logs.
- `GET /api/admin/finances/transactions` — Detail audite des flux (dons + marketplace) d'un scope/periode pour transparence et redevabilite (export). Pagination, jamais le contenu personnel sensible.
- `POST /api/admin/finances/snapshot` — Declenche finance_build_snapshots(jour) — appelee par le cron nocturne (scheduler protege par jeton).
- `GET /api/admin/finances/fx` — Liste/etat des taux de change actifs (lecture pour la console).
- `POST /api/admin/finances/fx` — Met a jour un taux de change (super_admin) — ecrit dans fx_rates, journalise.
- `PATCH /api/admin/finances/alerts` — Change le statut d'une alerte d'anomalie (examinee|resolue|ignoree).

### Sécurité
- Garde route: isAdminRequest(req) sur tous les endpoints /api/admin/finances*. 401 sinon.
- IS_DEMO_MODE: early return {ok:true,demo:true} avant tout acces donnees.
- Tout calcul/lecture financier = supabaseAdmin (service role) cote serveur uniquement. finance-intelligence.ts importe 'server-only' (jamais bundle client).
- Donnees financieres = SENSIBLES: finance_snapshots et finance_anomaly_alerts n'ont AUCUNE policy RLS -> service role exclusivement. fx_rates et finance_config sont en lecture (taux/seuils non sensibles), ecriture service role.
- RPC finance_aggregate et finance_build_snapshots: SECURITY DEFINER + revoke execute pour anon/authenticated -> appelables seulement par le service role.
- Portee par role imposee CoTE SERVEUR (jamais l'UI seule): super_admin = monde (?pays/?antenne libres); nation_pastor = force scope = son pays (depuis nation_responsables); responsable d'antenne = force scope = son antenne_id. A brancher sur le resolveur de scope de command-center.ts (V4) — comme /api/admin/nation impose deja le scope.
- Journalisation: chaque consultation et chaque modification de taux ecrit dans sensitive_access_logs (action='finances_console_view' / 'finances_fx_update'), garantissant la redevabilite.
- Aucune donnee personnelle exposee dans les agregats; l'endpoint transactions reste borne et ne renvoie pas d'identifiants membres pour la transparence publique.

### Scalabilité
- Snapshots pre-agreges (finance_snapshots) par (scope_type, scope_id, jour, devise): la console lit des lignes deja sommees au lieu de scanner des dizaines de milliers de dons/achats a chaque requete. Les 3 granularites (monde/pays/antenne) sont materialisees ensemble.
- Vue v_finance_flux: normalise dons+purchases une seule fois; index existants sur dons (idx_dons_user/email + created_at) + index nouveaux sur snapshots (scope, jour).
- Cron nocturne: POST /api/admin/finances/snapshot -> finance_build_snapshots(hier) (ou Supabase pg_cron). Incrementiel par jour, upsert idempotent -> rejouable sans doublon.
- Lecture: snapshots pour les vues agregees rapides; RPC finance_aggregate en fallback/detail (borne par periode, ~18 mois max pour YoY).
- fx_rates indexe par (devise, effective_date desc) + lateral join -> conversion historiquement exacte sans table cartesienne.
- Pagination sur /transactions; limit explicite sur les lectures de detail (pattern .limit() existant). Cache applicatif possible (snapshots changent 1x/jour) via revalidate ou cache memoire court.
- Roll-up hierarchique antennes.parent_id: agregation nation -> monde sans recalcul lourd.

### UX/UI
Console mondiale = onglet 'Finances' du Centre de Commandement (cockpit unique multi-contexte global/antenne/nation), coherent avec /admin/gouvernement.
- Bandeau pivot: total mondial consolide en FCFA (gros chiffre) + badges 'converti au taux du JJ' + selecteur de contexte (Monde / Nation / Antenne) reutilisant le meme ?pays/?antenne.
- Donut 'Repartition par devise' (part_pct) — rappelle visuellement qu'on ne melange pas les devises sans conversion.
- Courbe mensuelle pivot avec ligne de projection pointillee + badge confiance; chips MoM/YoY (vert/rouge).
- Jauge 'Sante financiere' 0-100 (regularite + diversite + tendance).
- Carte mondiale: recettes pivot par pays (degrade), clic = drill-down antenne.
- Panneau 'Alertes financieres': liste triee par severite (haute=rouge: devise inattendue, don hors-norme; moyenne=orange: chute), avec actions statut (examinee/resolue/ignoree).
- Onglet 'Transparence & redevabilite': tableau audite des flux (date, source, antenne, devise, montant, pivot), export CSV — pour rapports aux responsables et conseils.
- Panneau admin 'Taux de change': edition fx_rates (super_admin) avec date d'effet.
Tout en FR, FCFA par defaut, coherent avec la charte des autres modules du cockpit.

### Cas pastoraux
- Redevabilite: le Super Admin presente au conseil apostolique les recettes mondiales consolidees en FCFA, ventilees par nation/antenne, avec part de chaque devise — transparence financiere de l'oeuvre.
- Pilotage d'antenne: le responsable de la Chapelle Royale Canada voit ses offrandes en CAD ET leur equivalent FCFA pour se comparer aux autres antennes sans confusion de devise.
- Anticipation: la projection signale une baisse attendue des recettes le mois prochain -> le pasteur national lance un appel a l'offrande/partenariat de maniere proactive.
- Detection de fraude/erreur: une transaction en devise inattendue ou un don hors-norme (>5M FCFA) leve une alerte haute -> verification avant comptabilisation (erreur de saisie, blanchiment, ou don exceptionnel a remercier).
- Sante financiere d'une nation: un score bas du a une trop forte dependance a une seule source -> strategie de diversification (marketplace, partenariats, campagnes).
- Reconnaissance pastorale: detection d'un pic de generosite apres un live -> remerciement cible et capitalisation sur le programme qui a converti.
- Equite missionnaire: comparaison pivot des nations -> reallocation de ressources vers les antennes en croissance mais sous-financees.

### Lacunes
- Taux de change CAD/USD/GBP sont seedes en manuel: prevoir un job d'actualisation (API BCEAO/forex) ou edition reguliere par le super_admin; EUR est fiable (parite fixe XOF).
- product_purchases n'a pas d'antenne_id direct: le rattachement geo passe par marketplace_products.pays — les achats sans pays produit tombent dans 'Non renseigne'. Ajouter antenne_id sur product_purchases ameliorerait l'agregation par antenne.
- Le resolveur de scope par role (nation_responsables -> pays force) est suppose fourni par command-center.ts (V4): le code route esquisse le branchement mais doit consommer le helper V4 reel pour interdire le forcage de ?pays par un nation_pastor.
- Le cron de snapshots doit etre cable (Supabase pg_cron OU scheduler externe appelant POST /snapshot avec jeton) — non inclus dans la migration.
- Les remboursements/revocations (statut 'rembourse'/'revoque') ne sont pas encore deduits du net: la vue ne compte que 'complete'. Prevoir une vue/colonne 'montant_net' si Chariow renvoie des remboursements.
- Detection d'anomalie z-score exige >=7 jours d'historique reel: au demarrage (peu de donnees) aucune anomalie de serie ne sortira — comportement voulu (pas d'invention) mais a documenter pour les utilisateurs.
- La devise pivot est codee 'FCFA'/'XOF': si l'oeuvre change de pivot, externaliser dans finance_config.

<details><summary>SQL (référence)</summary>

```sql
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
```
</details>

<details><summary>Code clé (référence)</summary>

```typescript
// ============================================================================
// src/lib/finance-intelligence.ts — INTELLIGENCE FINANCIERE PURE (sans I/O)
// Reutilisable & testable. Aucune donnee inventee: une serie sans flux reel
// reste a 0 et ne genere ni projection ni anomalie fantome.
// ============================================================================
import 'server-only'

export const DEVISE_PIVOT = 'FCFA' // code interne; ISO equivalent = XOF

/** Une ligne de flux deja agregee par jour+devise (depuis snapshot ou RPC). */
export interface FluxRow {
  jour: string            // 'YYYY-MM-DD'
  devise: string          // code (XOF, EUR, CAD…)
  montant_total: number   // somme dans la devise d'origine
  montant_pivot: number   // somme convertie en FCFA
  nb: number
}

export interface DeviseTotal { devise: string; total: number; total_pivot: number; nb: number; part_pct: number }

/** Table de taux: code devise -> valeur en FCFA d'1 unite. */
export type FxTable = Record<string, number>

/** Convertit un montant d'une devise vers le pivot. Devise inconnue -> 1:1 (et flag ailleurs). */
export function applyFx(montant: number, devise: string, fx: FxTable): number {
  const t = fx[(devise || '').toUpperCase()]
  return (Number(montant) || 0) * (t && t > 0 ? t : 1)
}

/** Consolidation: total pivot global + repartition par devise (jamais d'addition brute inter-devises). */
export function consolidate(rows: FluxRow[]): { total_pivot: number; nb: number; par_devise: DeviseTotal[] } {
  const map = new Map<string, DeviseTotal>()
  let total_pivot = 0, nb = 0
  for (const r of rows) {
    const dev = (r.devise || 'FCFA').toUpperCase()
    const e = map.get(dev) || { devise: dev, total: 0, total_pivot: 0, nb: 0, part_pct: 0 }
    e.total += Number(r.montant_total) || 0
    e.total_pivot += Number(r.montant_pivot) || 0
    e.nb += Number(r.nb) || 0
    map.set(dev, e)
    total_pivot += Number(r.montant_pivot) || 0
    nb += Number(r.nb) || 0
  }
  const par_devise = Array.from(map.values())
    .map((e) => ({ ...e, part_pct: total_pivot > 0 ? Math.round((e.total_pivot / total_pivot) * 100) : 0 }))
    .sort((a, b) => b.total_pivot - a.total_pivot)
  return { total_pivot, nb, par_devise }
}

/** Serie mensuelle en pivot (pour graphes + tendance). */
export function monthlyPivot(rows: FluxRow[]): { mois: string; total_pivot: number }[] {
  const m: Record<string, number> = {}
  for (const r of rows) { const ym = (r.jour || '').slice(0, 7); if (ym) m[ym] = (m[ym] || 0) + (Number(r.montant_pivot) || 0) }
  return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([mois, total_pivot]) => ({ mois, total_pivot }))
}

/** Tendance: variation du dernier mois clos vs precedent + vs meme mois l'an passe. */
export function tendance(serie: { mois: string; total_pivot: number }[]): { mom_pct: number | null; yoy_pct: number | null; courant: number; precedent: number } {
  const n = serie.length
  if (n < 1) return { mom_pct: null, yoy_pct: null, courant: 0, precedent: 0 }
  const courant = serie[n - 1].total_pivot
  const precedent = n >= 2 ? serie[n - 2].total_pivot : 0
  const il_y_a_12 = n >= 13 ? serie[n - 13].total_pivot : 0
  const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : (a > 0 ? 100 : null))
  return { mom_pct: pct(courant, precedent), yoy_pct: il_y_a_12 > 0 ? pct(courant, il_y_a_12) : null, courant, precedent }
}

/** Projection fin de periode: regression lineaire ponderee par recence sur la serie mensuelle. */
export function projection(serie: { mois: string; total_pivot: number }[]): { prochain_mois: number; confiance: 'haute' | 'moyenne' | 'faible' } {
  const pts = serie.slice(-6) // 6 derniers mois clos
  if (pts.length < 2) return { prochain_mois: pts[0]?.total_pivot || 0, confiance: 'faible' }
  // moindres carres ponderes (poids croissant vers le recent)
  let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0
  pts.forEach((p, i) => { const w = i + 1; const x = i; const y = p.total_pivot; sw += w; swx += w * x; swy += w * y; swxx += w * x * x; swxy += w * x * y })
  const denom = sw * swxx - swx * swx
  const a = denom !== 0 ? (sw * swxy - swx * swy) / denom : 0
  const b = sw !== 0 ? (swy - a * swx) / sw : 0
  const next = Math.max(0, Math.round(a * pts.length + b))
  const confiance = pts.length >= 5 ? 'haute' : pts.length >= 3 ? 'moyenne' : 'faible'
  return { prochain_mois: next, confiance }
}

/** Sante financiere 0-100: regularite + diversification des sources + tendance. */
export function financeHealth(serie: { mois: string; total_pivot: number }[], nbSources: number): number {
  if (!serie.length) return 0
  const vals = serie.slice(-6).map((s) => s.total_pivot)
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length)
  const cv = mean > 0 ? sd / mean : 1                     // coefficient de variation (regularite)
  const regularite = Math.max(0, 1 - Math.min(cv, 1)) * 50
  const diversite = Math.min(nbSources, 5) / 5 * 30
  const t = tendance(serie); const trend = t.mom_pct !== null && t.mom_pct >= 0 ? 20 : t.mom_pct === null ? 10 : Math.max(0, 20 + Math.max(t.mom_pct, -100) / 5)
  return Math.round(regularite + diversite + Math.min(trend, 20))
}

// ── Detection d'anomalies (z-score serie + regles devise/montant) ──
export type FinanceAnomalyType = 'pic' | 'chute' | 'devise_inattendue' | 'don_hors_norme'
export interface FinanceAnomaly { type: FinanceAnomalyType; severite: 'haute' | 'moyenne' | 'info'; jour?: string; devise?: string; montant_pivot?: number; detail: string }

export interface AnomalyThresholds { z_score_seuil: number; don_max_pivot: number; chute_pct_seuil: number; devises_connues: string[] }

/** Detecte les anomalies sur la serie journaliere pivot + regles unitaires. */
export function detectAnomalies(
  daily: { jour: string; total_pivot: number }[],
  th: AnomalyThresholds,
  flux: { jour: string; devise: string; montant_pivot: number }[],
): FinanceAnomaly[] {
  const out: FinanceAnomaly[] = []
  // 1) Pic / chute via z-score sur l'historique journalier (besoin d'historique reel)
  const vals = daily.map((d) => d.total_pivot)
  if (vals.length >= 7) {
    const mean = vals.reduce((a, v) => a + v, 0) / vals.length
    const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) || 0
    if (sd > 0) for (const d of daily) {
      const z = (d.total_pivot - mean) / sd
      if (z >= th.z_score_seuil) out.push({ type: 'pic', severite: 'info', jour: d.jour, montant_pivot: d.total_pivot, detail: `Pic de recettes (z=${z.toFixed(1)}) le ${d.jour}` })
      else if (z <= -th.z_score_seuil && mean > 0) out.push({ type: 'chute', severite: 'moyenne', jour: d.jour, montant_pivot: d.total_pivot, detail: `Chute inhabituelle (z=${z.toFixed(1)}) le ${d.jour}` })
    }
  }
  // 2) Devise inattendue (hors devises configurees des antennes)
  const known = new Set(th.devises_connues.map((d) => d.toUpperCase()))
  for (const f of flux) {
    if (!known.has((f.devise || '').toUpperCase())) out.push({ type: 'devise_inattendue', severite: 'haute', jour: f.jour, devise: f.devise, montant_pivot: f.montant_pivot, detail: `Devise non reconnue: ${f.devise}` })
    if (f.montant_pivot >= th.don_max_pivot) out.push({ type: 'don_hors_norme', severite: 'haute', jour: f.jour, devise: f.devise, montant_pivot: f.montant_pivot, detail: `Transaction hors-norme: ${Math.round(f.montant_pivot).toLocaleString('fr-FR')} FCFA a verifier` })
  }
  // Dedoublonnage devise_inattendue par code
  const seen = new Set<string>()
  return out.filter((a) => { const k = a.type + (a.devise || '') + (a.jour || ''); if (seen.has(k)) return false; seen.add(k); return true })
}

// ============================================================================
// src/app/api/admin/finances/route.ts — ORCHESTRATION (drop-in)
// ============================================================================
/*
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  type FluxRow, type FxTable, consolidate, monthlyPivot, tendance,
  projection, financeHealth, detectAnomalies,
} from '@/lib/finance-intelligence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  const pays = (req.nextUrl.searchParams.get('pays') || '').trim().toUpperCase() || null
  const antenne = req.nextUrl.searchParams.get('antenne') || null
  // NB: portée serveur — un nation_pastor ne peut forcer un autre pays (à brancher sur nation_responsables/command-center V4).

  try {
    await supabaseAdmin.from('sensitive_access_logs').insert({
      role: 'super_admin', scope_pays: pays ?? 'MONDE', action: 'finances_console_view',
    })

    // Taux de change actifs -> table pivot
    const { data: fxRows } = await supabaseAdmin.from('fx_rates').select('devise, taux_pivot').eq('actif', true)
    const fx: FxTable = {}; for (const r of (fxRows || []) as any[]) fx[String(r.devise).toUpperCase()] = Number(r.taux_pivot) || 1

    // Lecture agrégée: RPC live (déjà converti en pivot via fx_rates côté SQL)
    const depuis = new Date(Date.now() - 540 * 86400_000).toISOString().slice(0, 10) // ~18 mois pour YoY
    const { data: agg } = await supabaseAdmin.rpc('finance_aggregate', {
      p_pays: pays, p_antenne: antenne, p_depuis: depuis, p_jusqua: null,
    })
    const rows: FluxRow[] = (agg || []) as any[]

    const conso = consolidate(rows)
    const serie = monthlyPivot(rows)
    const trend = tendance(serie)
    const proj = projection(serie)

    // Sources distinctes (diversification) — depuis la vue normalisée
    let nbSources = conso.par_devise.length
    try {
      const { data: src } = await supabaseAdmin.from('v_finance_flux').select('source').limit(5000)
      nbSources = new Set((src || []).map((s: any) => s.source)).size || nbSources
    } catch {}
    const sante = financeHealth(serie, nbSources)

    // Anomalies: série journalière + seuils config + devises connues des antennes
    const daily = rows.map((r) => ({ jour: r.jour, total_pivot: Number(r.montant_pivot) || 0 }))
    const { data: cfg } = await supabaseAdmin.from('finance_config').select('*').eq('scope_type', 'monde').maybeSingle()
    const { data: dev } = await supabaseAdmin.from('antennes').select('devise')
    const devises_connues = ['FCFA', 'XOF', ...new Set((dev || []).map((d: any) => String(d.devise).toUpperCase()))]
    const anomalies = detectAnomalies(daily,
      { z_score_seuil: Number(cfg?.z_score_seuil) || 2.5, don_max_pivot: Number(cfg?.don_max_pivot) || 5_000_000, chute_pct_seuil: Number(cfg?.chute_pct_seuil) || 40, devises_connues },
      rows.map((r) => ({ jour: r.jour, devise: r.devise, montant_pivot: Number(r.montant_pivot) || 0 })))

    // Persistance idempotente des alertes (upsert sur la clé unique)
    if (anomalies.length) {
      try {
        await supabaseAdmin.from('finance_anomaly_alerts').upsert(
          anomalies.map((a) => ({ type: a.type, severite: a.severite, scope_type: pays ? 'pays' : 'monde', scope_id: pays, jour: a.jour ?? null, devise: a.devise ?? null, montant_pivot: a.montant_pivot ?? null, detail: a.detail })),
          { onConflict: 'type,scope_type,scope_id,jour,devise', ignoreDuplicates: true })
      } catch {}
    }

    return NextResponse.json({
      ok: true, scope: { pays, antenne }, devise_pivot: 'FCFA',
      consolidation: conso, serie, tendance: trend, projection: proj, sante,
      anomalies, fx,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
*/
```
</details>

---

## Gouvernement par antenne
**Réutilise :** antennes (parent_id, pays, devise, responsable_id, lat/lng) + seed — jamais recréée, seulement lue/agrégée; antenne_responsables (user_id, antenne_id, role, inclut_sous, actif) — gouvernance: responsables + conseil/équipe d'antenne (on étend juste les rôles via le champ role); RPC antenne_descendants(uuid) — sous-arbre hiérarchique pour scope 'antenne + sous-antennes'; RPC antenne_stats_agg(uuid[]) — membres/inscrits/responsables/prieres/formations/evenements/dons_count/dons_par_devise par lot d'antennes (set-based, déjà optimisé); RPC command_center_kpis(text[], uuid[]) — KPIs transverses bornés par scope_antennes, réutilisés tels quels pour le contexte antenne; RPC discipulat_overview(p_antenne uuid, p_pays) et mahanaim_cockpit(p_antenne uuid) — piliers discipulat et intercession par antenne, déjà scopés; mv_command_center_daily (jour, antenne_id, pays, nouveaux_membres) + refresh_command_center_daily() — courbe de croissance par antenne sans scan live; src/lib/command-center.ts : CommandScope, clampContext, parseContext, contextToFilters — résolution de portée serveur réutilisée à l'identique

### Architecture
## Composants

**Données (NOUVEAU, additif)**
- `antenne_objectifs` : objectifs/jalons datés par antenne (metrique, cible, periode, propriétaire, statut, échéance). Redevabilité.
- `antenne_conseil` : membres du conseil/équipe de gouvernance d'antenne (fonction, mandat) — complète antenne_responsables (lead) sans le dupliquer.
- `antenne_scorecard_snapshots` : photo périodique du scorecard (santé + score 0-100 par pilier) → trend & audit, alimente la comparaison sans recalcul live.
- `antenne_alertes` : alertes de gouvernance matérialisées (antenne sans responsable, objectif en retard, pilier en chute) pour le mur d'alertes mondial.

**RPC (NOUVEAU)**
- `antenne_governance_agg(uuid[])` : agrège en UN aller-retour, par antenne, les 6 piliers en réutilisant la logique de antenne_stats_agg + discipulat + intercession + actifs 30j (LEFT JOIN, set-based).
- `antenne_scorecard_refresh()` : recalcule et insère les snapshots (cron quotidien).

**Lib pure (NOUVEAU)** `src/lib/antenne-governance.ts` — ZÉRO I/O : prend les compteurs bruts d'une antenne + ses objectifs, retourne {pilierScores[6], scoreGlobal 0-100, tone, classement, alertes de gouvernance, statut objectifs}. Testable, réutilisable client+serveur, calque exact de command-center.ts.

**API** `GET /api/admin/gouvernement-antennes[?context=...&antenne=<id>]` :
1) isAdminRequest → 2) resolveScope() (réutilise command-center) → 3) clampContext/contextToFilters → liste d'antennes autorisées (via antenne_descendants) → 4) appel antenne_governance_agg(ids) + mv pour la tendance → 5) lib pure scorecard + comparaison → 6) sensitive_access_logs → 7) {ok,data}.
`POST /api/admin/gouvernement-antennes` (action: 'objectif'|'conseil'|'snapshot-refresh') : écriture service role, rateLimit/clientIp, notify() au responsable quand objectif assigné/échu.

## Flux
profiles/dons/prieres/inscriptions/discipulat/intercession (rattachés antenne_id en V4) → RPC set-based → lib pure → scorecard + ligue → console.

## Agrégation transverse & intégration console mondiale
Le command-center reste le HUB. Ce module : (a) ajoute une tuile 'Antennes en risque' à buildKpiTiles (lien profond /admin/gouvernement-antennes?context=...), (b) sert de drill-down quand le contexte cockpit = antenne:<id>, (c) la comparaison inter-antennes n'apparaît qu'en contexte global/nation (portée autorisée), (d) les alertes de gouvernance remontent au mur d'alertes mondial unifié. Un seul cerveau : même portée, mêmes contextes, mêmes liens.

### Modèle d'intelligence
## Signaux d'entrée — RÉELS, déjà collectés par V4 (aucun inventé)
Par antenne (antenne_governance_agg, scope antenne_id) : membres rattachés (profiles.antenne_id), membres_actifs = membre_statut actif ET derniere_connexion ≥ 30j, nouveaux_30j/90j (created_at), responsables (antenne_responsables.actif), conseil (antenne_conseil.actif), prieres / prieres_attente (priere_demandes.antenne_id + statut), formations / formations_actives (inscriptions_formation.antenne_id), evenements (evenements.antenne_id), disciples_actifs + etapes_validees_30j (discipulat_relations/progressions.antenne_id), dons complétés + montants groupés PAR DEVISE locale, objectifs (antenne_objectifs).

## Formules — scorecard 6 piliers (lib pure, miroir SQL)
- membres = membres_actifs / membres × 100 (vide → 0)
- croissance = min(100, nouveaux_30j × 10)
- finances = dons_count > 0 ? 100 : 0 (binaire de flux ; le détail par devise reste affiché, JAMAIS sommé entre devises)
- intercession = min(100, prieres − prieres_attente)
- discipulat = min(100, etapes_validees_30j × 12)
- fidelite = min(100, evenements × 8)
Score global = Σ pilier × poids {membres .25, croissance .20, finances .15, discipulat .15, fidelite .15, intercession .10}, borné 0-100.

## Seuils / sorties
- tone : ≥60 positif, 35-59 neutre, <35 attention.
- Objectifs : valeur_actuelle écrite par le cron (jamais devinée) ; statut atteint si ≥ cible, en_retard si échéance < today et < cible, sinon en_cours ; non_mesure si métrique sans signal.
- Alertes de gouvernance : sans_responsable (haute) ; antenne_inactive si membres>5 et actifs<30% (haute) ; objectif_en_retard (moyenne).
- Comparaison : ligue triée par score puis membres, rang attribué.
La santé spirituelle fine des membres réutilise engagementScore/churnRisk (pastoral-intelligence/prediction) en drill-down membre. Tout est explicable (règles + pondérations), pas de boîte noire.

### APIs
- `GET /api/admin/gouvernement-antennes?context=global|nation:CI|antenne:<uuid>&antenne=<uuid>` — Scorecard + santé 6 piliers + objectifs + comparaison inter-antennes (ligue) + tendance, bornés à la portée serveur. Drill-down du command-center.
- `POST /api/admin/gouvernement-antennes` — action='objectif' (créer/MAJ objectif daté + redevable), action='conseil' (ajouter membre conseil), action='snapshot-refresh' (forcer recalcul). Service role, rateLimit, notify() au responsable.
- `RPC antenne_governance_agg(uuid[])` — Agrégat set-based des 6 piliers par antenne en 1 aller-retour (réutilise la logique antenne_stats_agg + discipulat + intercession).
- `RPC antenne_scorecard_refresh()` — Cron quotidien : statut objectifs, snapshots scorecard, alertes de gouvernance matérialisées.

### Sécurité
Portée 100% SERVEUR, jamais déduite de l'UI : réutilise resolveScope/clampContext/contextToFilters de command-center.ts ; un responsable d'antenne (cookie partagé/futur RBAC session) est borné à antenne_descendants(sa_racine) ; la comparaison inter-antennes (ligue) n'est servie qu'aux portées global/nation autorisées, jamais à une portée mono-antenne. Garde isAdminRequest(req) sur GET/POST ; écriture = service role via supabaseAdmin (bypass RLS serveur only) avec rateLimit/clientIp. IS_DEMO_MODE early return. RLS : antenne_conseil et antenne_objectifs exposent en SELECT authenticated UNIQUEMENT la ligne propre (user_id/proprietaire_id = auth.uid()) ; antenne_scorecard_snapshots et antenne_alertes = AUCUNE policy (agrégats de gouvernance sensibles → service role only). RPC en security definer avec search_path fixé et revoke all from public/anon/authenticated. Données sensibles (cure d'âme, contenu de prière) JAMAIS lues : on ne manipule que des COMPTAGES. Chaque consultation est tracée dans sensitive_access_logs (action gouvernement_antennes_view + contexte). notify() informe le responsable lorsqu'un objectif lui est assigné ou échoit, sans exposer de données transverses. Montants jamais additionnés entre devises (anti-fuite de cohérence financière).

### Scalabilité
Conçu pour des dizaines de milliers de membres et de multiples antennes/pays. Aucune lecture de masse côté Node : tout l'agrégat passe par antenne_governance_agg(uuid[]) — set-based, sous-requêtes count(*) avec head, exploitant les index composites V4 (idx_profiles_antenne_statut, idx_dons_antenne_statut, idx_prieres_antenne, idx_inscr_form_antenne, idx_disc_rel_antenne). Un seul aller-retour pour N antennes. Le scope hiérarchique utilise antenne_descendants() (CTE récursive indexée idx_antennes_parent). Le scorecard, la ligue et la tendance s'appuient sur des SNAPSHOTS quotidiens (antenne_scorecard_snapshots) écrits par le cron antenne_scorecard_refresh() : la console lit des photos pré-calculées, pas un scan live, et la courbe de croissance réutilise la vue matérialisée mv_command_center_daily (par antenne_id). Cron Supabase pg_cron quotidien (ex. 03:00) appelle antenne_scorecard_refresh() puis refresh_command_center_daily(). Pagination : la ligue est bornée par antenne (peu nombreuses) ; le drill-down membre d'une antenne réutilise la pagination existante de /admin/membres. Cache HTTP court (force-dynamic + revalidate applicatif) sur le GET cockpit. Nouveaux index ciblés : idx_obj_echeance partiel, idx_antalertes_open partiel, idx_scorecard_antenne — tous légers et sélectifs.

### UX/UI
Console mondiale unique, pas un silo. Le command-center reste la page d'accueil ; il gagne une tuile 'Antennes en risque' (tone attention, lien profond /admin/gouvernement-antennes?context=...). Le module /admin/gouvernement-antennes reprend le langage visuel de la page gouvernement existante (PageHeader, cartes, framer-motion, palette des niveaux). Sélecteur de CONTEXTE commun (Global → Nation → Antenne) partagé avec le cockpit : changer de contexte filtre partout. Vue Global/Nation : 'Ligue des antennes' = tableau classé (rang, antenne, pays, score 0-100 en jauge colorée, membres actifs/total, croissance 30j, dons par devise locale, alertes) ; barres des 6 piliers comparées ; carte (réutilise cartographie_monde lat/lng des antennes). Vue Antenne (drill-down) : scorecard détaillé (radar des 6 piliers), conseil/équipe de gouvernance (responsables + conseil avec fonctions/mandats), liste d'objectifs datés avec barre de progression + redevable + statut coloré (atteint/en_cours/en_retard), tendance de croissance (sparkline depuis snapshots), bouton 'Contact pastoral' vers le membre. Mur d'alertes de gouvernance unifié (sans_responsable, antenne_inactive, objectif_en_retard) trié par sévérité, actionnable (CTA: assigner responsable, relancer objectif). Mobile-first, FR, devise locale par antenne affichée explicitement (jamais de total cross-devise). Boutons d'écriture (créer objectif, ajouter au conseil) en modale, gardés admin.

### Cas pastoraux
- Antenne orpheline : antenne sans responsable actif → alerte haute 'sans_responsable' au mur mondial, CTA assigner un responsable (antenne_responsables) — la gouvernance ne reste jamais vacante.
- Antenne qui décroche : >5 membres mais <30% actifs sur 30j → alerte 'antenne_inactive', le pasteur national voit la chute dans la ligue et déclenche une visite/relance.
- Redevabilité d'objectif : un responsable reçoit l'objectif 'passer de 80 à 120 membres actifs ce trimestre' (proprietaire_id, échéance) ; le cron le bascule en_retard si non atteint et notify() le relance.
- Comparaison inter-antennes : le coordinateur monde voit Abidjan #1, Europe #3 ; il identifie que le pilier discipulat d'Europe est bas et y oriente des mentors (réutilise discipulat_overview).
- Multi-devises propre : Canada (CAD) et Abidjan (FCFA) côte à côte dans la ligue, chaque montant dans SA devise locale — jamais d'addition trompeuse pour la redevabilité financière.
- Conseil d'antenne : nommer un trésorier et un responsable intercession (antenne_conseil) ; la console montre que l'équipe de gouvernance est complète ou incomplète.
- Drill-down membre : depuis une antenne en risque, ouvrir la file de suivi pastoral (churnRisk/needsFollowUp) des membres rattachés pour agir individuellement.
- Tendance : la sparkline de snapshots montre qu'une antenne stagne depuis 60j malgré des événements → réorienter l'effort vers la croissance plutôt que la fidélité.

### Lacunes
- La valeur_actuelle des objectifs n'est mappée automatiquement que pour les métriques standard (membres_actifs, nouveaux_30j, dons_count, etapes_validees_30j) ; une métrique libre saisie à la main reste 'non_mesure' tant qu'un mapping n'est pas ajouté dans antenne_scorecard_refresh.
- Le RBAC par responsable d'antenne côté session (member-auth) est supposé fourni par V4 ; ici resolveScope renvoie 'global' (cookie admin). Brancher la portée session réelle quand le RBAC scopé V4 est finalisé.
- Le pilier 'finances' est binaire (flux présent/absent) pour éviter toute addition cross-devise ; un scoring financier vs objectif chiffré par devise nécessiterait une cible par devise (extension d'antenne_objectifs).
- pg_cron doit être activé sur le projet Supabase pour planifier antenne_scorecard_refresh() + refresh_command_center_daily() ; sinon déclencher via un cron externe appelant action='snapshot-refresh'.
- La géoloc des antennes (lat/lng) est seedée pour Abidjan/Canada/Europe ; les nouvelles antennes doivent être géocodées (geo_localites) pour apparaître sur la carte.
- evenements compte toutes les lignes rattachées à l'antenne sans filtre 'à venir' (colonne date_debut/starts_at variable selon migration) ; affiner si une distinction passé/futur est requise pour le pilier fidélité.
- Pas de page UI livrée ici (keyCode = lib pure + route) ; le composant /admin/gouvernement-antennes/page.tsx reste à écrire en réutilisant le langage visuel de la page gouvernement existante.

<details><summary>SQL (référence)</summary>

```sql
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
```
</details>

<details><summary>Code clé (référence)</summary>

```typescript
// src/lib/antenne-governance.ts
// ----------------------------------------------------------------------------
// GOUVERNEMENT PAR ANTENNE — logique PURE (sans I/O), testable & réutilisable.
// Transforme les compteurs bruts d'antenne_governance_agg en scorecard normalisé
// (6 piliers + score global 0-100), classe les antennes (ligue) et détecte les
// alertes de gouvernance. Aucune dépendance Supabase. Calque exact des conventions
// de command-center.ts et pastoral-intelligence.ts (logique pure, FR, données réelles).

export type Pilier = 'membres' | 'croissance' | 'finances' | 'intercession' | 'discipulat' | 'fidelite'

/** Compteurs bruts d'UNE antenne (1 ligne d'antenne_governance_agg). */
export interface AntenneRaw {
  antenne_id: string; nom: string; pays: string | null; devise: string; parent_id: string | null
  membres: number; membres_actifs: number; nouveaux_30j: number; nouveaux_90j: number
  responsables: number; conseil: number
  prieres: number; prieres_attente: number
  formations: number; formations_actives: number; evenements: number
  disciples_actifs: number; etapes_validees_30j: number
  dons_count: number; dons_par_devise: Record<string, number>
  objectifs_total: number; objectifs_atteints: number; objectifs_en_retard: number
}

export type Tone = 'positif' | 'neutre' | 'attention'

export const PILIER_META: Record<Pilier, { label: string; poids: number; color: string }> = {
  membres:      { label: 'Membres actifs', poids: 0.25, color: '#22C55E' },
  croissance:   { label: 'Croissance',     poids: 0.20, color: '#0EA5E9' },
  finances:     { label: 'Finances',       poids: 0.15, color: '#D4AF37' },
  intercession: { label: 'Intercession',   poids: 0.10, color: '#8B5CF6' },
  discipulat:   { label: 'Discipulat',     poids: 0.15, color: '#84CC16' },
  fidelite:     { label: 'Fidélité',       poids: 0.15, color: '#F59E0B' },
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/** Score 0-100 de chaque pilier à partir des signaux RÉELS (jamais inventés). */
export function pilierScores(r: AntenneRaw): Record<Pilier, number> {
  return {
    // % de membres actifs (récence 30j). Antenne vide → 0 (neutre, pas pénalisant via le tone).
    membres:      r.membres > 0 ? clamp100((r.membres_actifs / r.membres) * 100) : 0,
    // 10 pts par nouveau membre sur 30j, plafonné.
    croissance:   clamp100(r.nouveaux_30j * 10),
    // Présence d'un flux de dons complétés (montants jamais additionnés entre devises).
    finances:     r.dons_count > 0 ? 100 : 0,
    // Demandes traitées vs reçues.
    intercession: clamp100(r.prieres - r.prieres_attente),
    // Étapes de discipulat validées sur 30j.
    discipulat:   clamp100(r.etapes_validees_30j * 12),
    // Vie événementielle de l'antenne.
    fidelite:     clamp100(r.evenements * 8),
  }
}

/** Score global pondéré 0-100. */
export function scoreGlobal(scores: Record<Pilier, number>): number {
  let s = 0
  for (const k of Object.keys(PILIER_META) as Pilier[]) s += scores[k] * PILIER_META[k].poids
  return clamp100(s)
}

export function scoreTone(score: number): Tone {
  if (score >= 60) return 'positif'
  if (score >= 35) return 'neutre'
  return 'attention'
}

/** Alertes de gouvernance d'une antenne (miroir de antenne_scorecard_refresh). */
export interface GouvAlerte { antenne_id: string; nom: string; type: string; severite: 'haute' | 'moyenne' | 'info'; detail: string }
export function antenneAlertes(r: AntenneRaw): GouvAlerte[] {
  const out: GouvAlerte[] = []
  const base = { antenne_id: r.antenne_id, nom: r.nom }
  if (r.responsables === 0)
    out.push({ ...base, type: 'sans_responsable', severite: 'haute', detail: `${r.nom} n'a aucun responsable actif.` })
  if (r.membres > 5 && r.membres_actifs / r.membres < 0.30)
    out.push({ ...base, type: 'antenne_inactive', severite: 'haute', detail: `Moins de 30% de membres actifs (${r.membres_actifs}/${r.membres}).` })
  if (r.objectifs_en_retard > 0)
    out.push({ ...base, type: 'objectif_en_retard', severite: 'moyenne', detail: `${r.objectifs_en_retard} objectif(s) en retard.` })
  return out
}

export interface Scorecard {
  antenne_id: string; nom: string; pays: string | null; devise: string; parent_id: string | null
  score: number; tone: Tone; piliers: { pilier: Pilier; label: string; score: number; color: string }[]
  membres: number; membres_actifs: number; nouveaux_30j: number; dons_par_devise: Record<string, number>
  responsables: number; conseil: number
  objectifs: { total: number; atteints: number; en_retard: number; taux: number }
  alertes: GouvAlerte[]
}

/** Construit le scorecard complet d'une antenne. */
export function buildScorecard(r: AntenneRaw): Scorecard {
  const ps = pilierScores(r)
  const score = scoreGlobal(ps)
  return {
    antenne_id: r.antenne_id, nom: r.nom, pays: r.pays, devise: r.devise, parent_id: r.parent_id,
    score, tone: scoreTone(score),
    piliers: (Object.keys(PILIER_META) as Pilier[]).map((k) => ({ pilier: k, label: PILIER_META[k].label, score: ps[k], color: PILIER_META[k].color })),
    membres: r.membres, membres_actifs: r.membres_actifs, nouveaux_30j: r.nouveaux_30j, dons_par_devise: r.dons_par_devise,
    responsables: r.responsables, conseil: r.conseil,
    objectifs: { total: r.objectifs_total, atteints: r.objectifs_atteints, en_retard: r.objectifs_en_retard,
      taux: r.objectifs_total ? Math.round((r.objectifs_atteints / r.objectifs_total) * 100) : 0 },
    alertes: antenneAlertes(r),
  }
}

/** Comparaison inter-antennes (ligue) : classement par score + rang. N'apparaît qu'en contexte global/nation. */
export function buildLigue(rows: AntenneRaw[]): (Scorecard & { rang: number })[] {
  return rows.map(buildScorecard)
    .sort((a, b) => b.score - a.score || b.membres - a.membres)
    .map((s, i) => ({ ...s, rang: i + 1 }))
}

/* ----------------------------------------------------------------------------
   src/app/api/admin/gouvernement-antennes/route.ts (drop-in, conventions exactes)
   ----------------------------------------------------------------------------
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { parseContext } from '@/lib/command-center'
import { buildScorecard, buildLigue, type AntenneRaw } from '@/lib/antenne-governance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    // 1) Portée : le cookie admin = global (comme command-center). On résout les antennes autorisées.
    const ctx = req.nextUrl.searchParams.get('context') || 'global'
    const { kind, value } = parseContext(ctx)
    let antenneIds: string[] | null = null
    if (kind === 'antenne' && value) {
      const { data } = await supabaseAdmin.rpc('antenne_descendants', { p_antenne_id: value })
      antenneIds = [value, ...((data || []) as { id: string }[]).map((d) => d.id)]
    } else if (kind === 'nation' && value) {
      const { data } = await supabaseAdmin.from('antennes').select('id').ilike('pays', value).eq('actif', true)
      antenneIds = (data || []).map((a: any) => a.id)
    } else {
      const { data } = await supabaseAdmin.from('antennes').select('id').eq('actif', true)
      antenneIds = (data || []).map((a: any) => a.id)
    }
    if (!antenneIds?.length) return NextResponse.json({ ok: true, data: { scorecards: [], ligue: [], alertes: [] } })

    // 2) Agrégat set-based (1 aller-retour) + tendance (vue matérialisée).
    const { data: rows, error } = await supabaseAdmin.rpc('antenne_governance_agg', { p_antenne_ids: antenneIds })
    if (error) throw error
    const raw = (rows || []) as AntenneRaw[]
    const ligue = buildLigue(raw)
    const alertes = ligue.flatMap((s) => s.alertes)
      .sort((a, b) => (a.severite === 'haute' ? 0 : 1) - (b.severite === 'haute' ? 0 : 1))

    // 3) Journal d'accès sensible.
    try { await supabaseAdmin.from('sensitive_access_logs').insert({ role: 'admin', scope_pays: ctx, action: 'gouvernement_antennes_view' }) } catch {}

    return NextResponse.json({ ok: true, data: {
      context: ctx,
      scorecards: ligue,
      ligue: ligue.map((s) => ({ rang: s.rang, antenne_id: s.antenne_id, nom: s.nom, pays: s.pays, score: s.score, tone: s.tone, membres: s.membres })),
      alertes,
    }})
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
}
---------------------------------------------------------------------------- */
```
</details>
