# Centre de Commandement Apostolique Digital — Synthèse V4 (Référence unique)

> Document de référence consolidant les 6 modules métier + le cockpit transverse.
> Cible : piloter **Membres / Antennes / Discipulat / Finances / Marketplace / Formations / Prières / Événements / Mobile / Cartographie** depuis **une seule interface**, à l'échelle **100 000 membres**, multi-pays / multi-antennes / multi-devises.

---

## 1. Vision

Le Centre de Commandement **n'est pas un 7e silo** : c'est la **couche d'orchestration** posée au-dessus de l'existant (gouvernement pastoral, nation, dons Chariow, marketplace, LMS, intercession). Il impose **UNE portée** (global / nation / antenne) résolue **côté serveur** selon le rôle de l'opérateur, et expose des **tuiles KPI transverses** qui sont chacune un lien profond vers le module silo concerné, pré-filtré par le contexte actif.

Trois principes non négociables :
1. **Zéro recréation.** Tout est additif sur les tables existantes (`antennes`, `profiles.antenne_id`, `dons.antenne_id`, `priere_demandes`, `marketplace_products`, `product_purchases`, LMS, `app_notifications`…).
2. **Portée imposée serveur.** Un `nation_pastor` qui force `?context=nation:FR` est ramené à sa nation. Le filtre envoyé aux RPC est TOUJOURS l'intersection `portée ∩ demande`.
3. **Agrégats SET-BASED en base.** À 100k membres, aucune agrégation en mémoire Node : les compteurs passent par des RPC `count(*)/sum()` sur index. Le cockpit ne reçoit que quelques lignes.

---

## 2. Architecture globale

```
                    ┌──────────────────────────────────────────────┐
                    │  COCKPIT  /admin/command-center                │
                    │  Sélecteur contexte (global/nation/antenne)    │
                    │  Tuiles KPI transverses · Alertes · Flux RT    │
                    └───────────────┬──────────────────────────────┘
                                    │ GET /api/admin/command-center
                                    │ resolveScope() → RBAC serveur
                    ┌───────────────▼──────────────────────────────┐
                    │  RPC command_center_kpis(scope_pays,           │
                    │      scope_antennes)  — agrégat SET-BASED      │
                    └───────────────┬──────────────────────────────┘
       ┌──────────┬──────────┬──────┴──────┬──────────┬──────────┬──────────┐
   Antennes   Discipulat  Intercession  Marketplace  Carto.    Mobile   Gouvernement
  (antenne_*) (discipulat_*)(intercession_*)(marketplace_*)(geo/expansion)(mobile_*) (existant)
       └──────────┴──────────┴─────────────┴──────────┴──────────┴──────────┘
                       Sources brutes RÉUTILISÉES (jamais dupliquées) :
            profiles · dons · priere_demandes · inscriptions_formation ·
            evenements · product_purchases · app_notifications · analytics_*
```

### Les 6 modules métier + cockpit

| Module | Apport | Tables nouvelles principales |
|---|---|---|
| **Multi-Antennes** | RBAC scopé par antenne + consolidation multi-devises (hiérarchie `parent_id`) | `antenne_responsables` (+ colonnes `antennes`, `priere_demandes.antenne_id`, `inscriptions_formation.antenne_id`) |
| **Marketplace** | Catégories, stock, abonnements, avis vérifiés, revenus par devise | `marketplace_categories`, `marketplace_reviews` (+ colonnes `marketplace_products`/`product_purchases`) |
| **Mobile (PWA + Push)** | Appareils, sessions, préférences, dispatch push (transport ; contenu reste dans `app_notifications`) | `mobile_devices`, `mobile_sessions`, `mobile_preferences`, `push_dispatch_log` |
| **Intercession (Mahanaïm)** | Salles live, chaînes 24/7, tours de garde, mur RT, escalade par priorité | `intercession_salles/participants/chaines/creneaux/garde_log/mur`, `priere_escalades` |
| **Discipulat** | Chemins de croissance, mentorat 1-1, jalons, progression réelle | `discipulat_chemins/etapes/relations/progressions/jalons` |
| **Cartographie** | Carte mondiale d'expansion (géoloc réelle, heatmap engagement) | `geo_localites`, `expansion_zones` (+ `antennes.lat/lng/rayon_km`) |
| **Cockpit (Command Center)** | Orchestration transverse multi-portée | `command_center_prefs` + RPC `command_center_kpis` + MV de tendance |

---

## 3. Sécurité (transverse, défense en profondeur)

- **Garde d'entrée.** `/api/admin/*` → `isAdminRequest(req)` (cookie `cier_admin`, aucun repli en prod). `/api/member/*` → `getSessionProfile()`. `/api/mobile/v1/*` → `requireMobileUser(req)` (JWT Supabase `Bearer`, pas de second secret).
- **Portée serveur unique.** `command-scope.ts` (`import 'server-only'`) est la source de vérité : `super_admin/platform_admin` → global ; `nation_pastor` → ses pays (`nation_responsables`) ; responsable d'antenne → son antenne + descendants (`antennes.responsable_id` / `antenne_responsables` + `parent_id` récursif). `clampContext()` borne tout contexte demandé.
- **RLS.** Toutes les nouvelles tables ont RLS activé. Catalogue public (`actif=true`) en SELECT `anon, authenticated`. Données propriétaires (`user_id = auth.uid()` / disciple-mentor). Tables sensibles (`priere_escalades`, `push_dispatch_log`, `sensitive_access_logs`, `command_center_prefs` en écriture) = **service role uniquement**.
- **RPC `security definer` REVOKE.** Toutes les RPC d'agrégat (`command_center_kpis`, `antenne_stats_agg`, `mahanaim_cockpit`, `discipulat_overview`, `cartographie_monde`, `marketplace_revenue`…) sont `revoke … from anon, authenticated` → appelables uniquement via `supabaseAdmin`.
- **Données pastorales intimes.** Le cockpit n'agrège que des **comptages** ; jamais le contenu des prières / cure d'âme / jalons. Le pont `tres_urgent → delivrance_demandes` hérite du régime confidentiel.
- **Écritures durcies.** `rateLimit/clientIp`, `sanitize()` whitelist stricte, `slugify`, validation enum, anti-cycle `parent_id`, bornage lat/lng. RGPD : IP hachée (`ip_hash` SHA-256 tronqué), tokens push révocables.
- **Journalisation.** `sensitive_access_logs` (`action='command_center_view'`, scope) + `activity_logs`.

---

## 4. Scalabilité 100k

- **RPC SET-BASED** : un aller-retour, `count(*)/sum()` sur index, jamais de pull de 100k lignes en Node (rupture nette avec le pattern mémoire actuel de gouvernement).
- **Index composites de scope** : `idx_*_antenne_statut`, partiels de file d'escalade (`where assigned_to is null …`), partiels mur (`where masque=false`), géo.
- **Consolidation devises** : `jsonb_object_agg` par devise — **jamais d'addition inter-devises** (FCFA/EUR/CAD séparés).
- **Vue matérialisée** `mv_command_center_daily` (tendances 400 j, `refresh concurrently` par cron).
- **Realtime au lieu de polling** : `app_notifications` + Supabase Realtime (1 WebSocket/membre), filtrable par `antenne_id`.
- **Compteurs dénormalisés** : `rating_avg/count`, `participants_count`, `amen_count`, `couverture_pct`, `stock` maintenus à l'écriture/trigger.
- **Pagination systématique** des listes profondes ; le cockpit ne renvoie que des agrégats + échantillon borné.

---

## 5. UX / UI

- **Cockpit unique** `/admin/command-center` (écran d'atterrissage) : en-tête segmenté `Global · Nation ▾ · Antenne ▾` (cookie `cc_context`), grille de tuiles KPI (`tone` positif/neutre/attention), panneau d'alertes pastorales consolidées (`memberAlerts` + `churnRisk`, borné), flux temps réel, actions rapides.
- **Bandeau finances = un bloc PAR DEVISE.** Charte cinématographique existante (or `#D4AF37`, violet `#4B0082`, `card-cinematic`, `font-cinzel`).
- **Espaces membre** : `/member/dashboard/antenne` (responsable), `/member/dashboard/intercession` (mur RT, garde), `/member/dashboard/discipulat` (chemin + mentor), Boutique publique enrichie (avis/stock/abonnement).
- **PWA** : `public/sw.js`, `PushOptIn`, paramètres notifications.

---

## 6. Cas pastoraux représentatifs

1. Super Admin compare en un clic la croissance Abidjan (FCFA) vs Europe (EUR) — chaque finance dans sa devise locale, sans addition trompeuse.
2. Pasteur Canada : portée imposée → ne voit que le Canada même en forçant l'URL.
3. Demande `tres_urgent` à 03h → escalade palier 1 immédiat, palier 3 (cure d'âme) à 30 min sans suivi.
4. Chaîne 24/7 : Abidjan → Europe → Canada se relaient ; l'engine signale les trous de couverture.
5. Disciple stagnant (aucune étape validée 30 j) remonte → le mentor est relancé.
6. Abonnement masterclass : renouvellement auto Chariow ; l'accès se coupe seul à l'expiration.
7. Push « culte EN DIRECT » respectant les quiet hours du membre.

---

## 7. Lacunes connues (à traiter hors migration)

- **Back-fill** `profiles/dons/priere_demandes.antenne_id` (largement NULL sur l'existant) ; déduction d'antenne à l'inscription (`handle_new_user_metadata`).
- **Crons** : escalade différée, refresh MV, dispatcher push (`pg_notify('mobile_push')`), relance abonnements `past_due` — Passenger mono-process → worker découplé ou cron système avec secret.
- **Clés** VAPID Web Push, lib `web-push`, fichier TopoJSON monde + `react-simple-maps`.
- **Géocodeur** réel (Nominatim/Mapbox) + normalisation `profiles.pays/ville` (texte libre).
- **`command-scope.ts`** à écrire (pièce RBAC centrale, réutilise `nation_responsables` + `antenne_responsables` + descente `parent_id`).
- **Taux de change** non modélisés (principe : pas d'addition inter-devises ; total converti = hors scope).

---

# Annexe — Conceptions détaillées par module

## Multi-Antennes — RBAC scopé par antenne & consolidation multi-devises (Centre de Commandement Apostolique)
**Réutilise :**
- Table public.antennes DÉJÀ créée (20260602270000) avec hiérarchie parent_id, devise locale, fuseau, responsable_id, slug, actif + seed Abidjan(FCFA)/Canada(CAD)/Europe(EUR) — on l'ÉTEND, jamais on la recrée
- profiles.antenne_id, evenements.antenne_id, dons.antenne_id DÉJÀ ajoutées + index idx_profiles_antenne — on les exploite pour le scope et les agrégats
- Pattern nation_responsables / nation-stats.ts : on calque une table d'affectation antenne_responsables et un lib antenne-stats.ts (countIn count:'exact',head:true, scope par ids)
- sensitive_access_logs : on journalise les consultations scopées par antenne (action 'antenne_dashboard_view')
- src/lib/admin-auth.ts (isAdminRequest) pour /api/admin/antennes ; src/lib/member-auth.ts (getSessionProfile) pour /api/member/antenne avec portée IMPOSÉE serveur — calqué sur /api/member/nation
- src/lib/roles.ts (ADMIN_ROLES, isAdmin) étendu avec un helper antenneScope ; user_role enum a déjà coordinateur/responsable_mahanaim réutilisables
- src/lib/rate-limit.ts (rateLimit/clientIp), src/lib/utils.ts (slugify) pour les écritures admin
- Cockpit /admin/gouvernement existant (pattern dons_par_devise — jamais d'addition entre devises) : on ajoute un sélecteur d'antenne réutilisant la même grille de modules
- supabaseAdmin (BYPASS RLS, server-only) + IS_DEMO_MODE early return ; app_notifications + notify() pour alerter un responsable d'antenne

### Architecture
## Vue d'ensemble

Le module Multi-Antennes ajoute la **dimension organisationnelle locale** au Centre de Commandement, parallèle à la dimension nation existante. L'antenne (assemblée locale : Abidjan, Canada, Europe + futures) devient l'unité de scope RBAC fine, là où `nation_responsables` opère au niveau pays.

```
                 Super Admin (toutes antennes)
                          │
        ┌─────────────────┼─────────────────┐
   Abidjan(FCFA)     Canada(CAD)        Europe(EUR)   ← antennes (parent_id = null)
        │                                    │
   Yopougon, Cocody                    Paris, Lyon    ← sous-antennes (parent_id)
        │
   responsable_antenne (antenne_responsables) → ne voit QUE son sous-arbre
```

## Composants

1. **SQL (additif)** : `antenne_responsables` (affectation user↔antenne, calque de `nation_responsables`), enum `antenne_role`, colonnes manquantes sur `antennes` (code_couleur, ordre), `priere_demandes.antenne_id`, `inscriptions_formation.antenne_id`, index composites de scope, RPC `antenne_descendants(uuid)` (CTE récursive sur parent_id) et RPC d'agrégats `antenne_stats_agg`.

2. **Lib pures + service** :
   - `src/lib/antenne-scope.ts` (PURE, testable) : résout le périmètre d'un utilisateur (liste d'antenne_id autorisées) à partir de son rôle + affectations + arbre hiérarchique. Aucune I/O.
   - `src/lib/antenne-stats.ts` (server-only) : calque de `nation-stats.ts`, agrégats scopés par `antenne_id[]` + consolidation dons PAR DEVISE locale.

3. **APIs** :
   - `/api/admin/antennes` (CRUD super_admin) — liste/créer/éditer/affecter responsable.
   - `/api/admin/antennes/[id]/stats` (cockpit, super_admin, scope libre).
   - `/api/member/antenne` (responsable : portée IMPOSÉE serveur = son sous-arbre).
   - `/api/admin/antennes/affectation` (lier/délier responsable↔antenne).

4. **Flux de données** :
```
Cockpit /admin → sélecteur d'antenne (bascule contexte)
   → GET /api/.../stats?antenne=<id>
      → antenne-scope.ts résout antenne_id[] (sous-arbre via RPC descendants)
      → antenne-stats.ts : countIn(profiles|dons|evenements|prieres|inscriptions, antenne_id[])
      → consolidation dons regroupés par antenne.devise (jamais d'addition inter-devises)
      → sensitive_access_logs.insert(action, scope)
   → réponse { ok, scope, antennes[], stats, dons_par_devise }
```

## Intégration au Centre de Commandement

La bascule de contexte d'antenne se branche sur le cockpit `/admin/gouvernement` existant : un sélecteur en tête de page injecte `?antenne=<id>` dans tous les appels du cockpit. Le filtre `pays` actuel et le nouveau filtre `antenne` sont composables (antenne ⊂ pays). Les 6 modules de gouvernement (croissance/santé/formation/prière/finance/mission) sont réutilisés tels quels, mais leurs requêtes ajoutent `.in('antenne_id', scopeIds)` quand un scope antenne est actif.

### APIs
- `GET /api/admin/antennes` — Liste des antennes (arbre + responsables + compteur membres). Gardé isAdminRequest (super_admin).
- `POST /api/admin/antennes` — Créer une antenne (nom, slug via slugify, pays, ville, fuseau, devise, parent_id). rateLimit + sanitize whitelist. Service role.
- `PATCH /api/admin/antennes/[id]` — Éditer une antenne (devise, responsable_id, parent_id, actif, ordre, code_couleur). sanitize whitelist.
- `GET /api/admin/antennes/[id]/stats` — Agrégats consolidés d'une antenne + son sous-arbre (RPC antenne_stats_agg), dons par devise. Super_admin, scope libre. Journalisé.
- `POST /api/admin/antennes/affectation` — Lier/délier un responsable↔antenne (upsert antenne_responsables, role, inclut_sous, actif). notify() le responsable. Service role.
- `GET /api/member/antenne` — Cockpit du responsable d'antenne — portée IMPOSÉE serveur (son sous-arbre via antenne_descendants). super_admin honore ?antenne=. Journalisé.

### Sécurité
RBAC SCOPÉ SERVEUR : la portée d'un responsable est calculée exclusivement côté serveur dans /api/member/antenne à partir de antenne_responsables (jamais d'un param client). Un non-super qui passe ?antenne= se voit imposer son propre sous-arbre — calque exact de /api/member/nation. isAntenneSuper() centralise les rôles globaux. | GARDES : /api/admin/* via isAdminRequest(req) (cookie cier_admin, aucun repli en prod) ; /api/member/* via getSessionProfile(). 401 si non authentifié, 403 si aucune affectation. | RLS : antenne_responsables a SELECT own (user_id=auth.uid()) pour que le membre lise son périmètre, écriture service role uniquement. antennes garde sa policy publique using(actif=true). priere_demandes/inscriptions_formation : antenne_id additif, pas de nouvelle policy d'écriture publique. | RPC SECURITY DEFINER : antenne_descendants/antenne_stats_agg REVOKE de anon/authenticated → appelables uniquement via supabaseAdmin (service role). Pas de fuite cross-antenne via RPC exposée. | DONNÉES SENSIBLES : prières/cure d'âme = COMPTAGE seul (jamais le contenu) dans les agrégats, comme nation-stats. | LOGS : chaque consultation insère dans sensitive_access_logs (action antenne_dashboard_view, scope, user, role). | ÉCRITURES : rateLimit(clientIp) + sanitize() whitelist (nom, slug, pays, ville, fuseau, devise, parent_id, responsable_id, code_couleur, ordre) + slugify pour le slug. Validation anti-cycle sur parent_id (une antenne ne peut être son propre ancêtre).

### Scalabilité (100 000 membres)
À 100 000 membres : les agrégats ne chargent JAMAIS les lignes en mémoire applicative — ils passent par la RPC antenne_stats_agg (count(*) + sum() côté Postgres, 1 aller-retour) plutôt que par le pattern in(ids) de nation-stats (qui matérialise les ids). | INDEX COMPOSITES dédiés au scope : idx_profiles_antenne_statut(antenne_id, membre_statut), idx_dons_antenne_statut(antenne_id, statut), idx_evenements_antenne, idx_prieres_antenne, idx_inscr_form_antenne → tous les count scopés sont index-only ou index-range. | HIÉRARCHIE : antenne_descendants est une CTE récursive bornée par la profondeur de l'arbre (quelques niveaux), pas par le nombre de membres ; résultat = liste d'UUID d'antennes (dizaines), passée en = any($1) qui utilise les index ci-dessus. | CONSOLIDATION DEVISES : jsonb_object_agg par antenne.devise — un total par devise (FCFA/CAD/EUR), jamais d'addition inter-devises, calculé en base. | CACHE : réponses stats avec dynamic='force-dynamic' mais on peut poser un Cache-Control: private, max-age=30 sur le cockpit (cohérent avec heartbeat analytics 30s). | PAGINATION : la liste détaillée des membres d'une antenne (UI) reste paginée (range) ; seuls les agrégats sont globaux. | REALTIME : app_notifications + Realtime déjà en place — un changement d'affectation notifie le responsable sans polling.

### UX/UI
## Écrans admin (cockpit unique /admin)

1. **Sélecteur de contexte d'antenne** (composant AntenneSwitcher, en tête du cockpit /admin/gouvernement) : dropdown arborescent (parent → sous-antennes, indenté), pastille code_couleur, libellé + devise locale. Sélection → injecte ?antenne=<id> dans tous les fetch du cockpit. Option « Toutes les antennes » (super_admin uniquement).

2. **/admin/antennes** (gestion) : tableau trié par ordre — Nom, Pays/Ville, Devise, Responsable, Nb membres, Actif. Actions : créer, éditer, (dé)lier responsable. Vue arbre repliable pour la hiérarchie.

3. **/admin/antennes/[id]** (fiche antenne) : reprend la grille des 6 modules de gouvernement (croissance/santé/formation/prière/finance/mission) MAIS scopée à l'antenne + son sous-arbre. Bandeau finances = un bloc PAR DEVISE (FCFA, CAD, EUR) — jamais de total agrégé multi-devises.

## Écran membre (responsable)

4. **/member/dashboard/antenne** : cockpit allégé du responsable, alimenté par /api/member/antenne (portée imposée). Montre uniquement SON/SES antenne(s) : membres, nouveaux 30j, prières en attente, événements à venir, dons (devise locale). Pas de bascule libre.

## Composants réutilisés
StatCard, grille modules, pastilles d'engagement (ENGAGEMENT_META), DevisePill (nouveau, petit). Cohérence visuelle totale avec /admin/gouvernement : même grille, mêmes couleurs, le scope antenne est un simple filtre additionnel composable avec le filtre pays existant.

### Cas d'usage pastoraux
- Le responsable de la Chapelle Royale Canada se connecte et ne voit QUE les membres/dons/prières rattachés à l'antenne Canada (devise CAD) — impossible de consulter Abidjan, même en forçant ?antenne= dans l'URL.
- Le Super Admin bascule de contexte dans le cockpit : il compare en un clic la croissance d'Abidjan (FCFA) vs Europe (EUR), chaque finance affichée dans sa devise locale sans addition trompeuse.
- Création d'une sous-antenne Yopougon sous Abidjan (parent_id) : le responsable d'Abidjan avec inclut_sous=true voit automatiquement Yopougon dans ses stats consolidées (sous-arbre).
- Affectation d'un nouveau berger comme responsable_antenne d'Europe : POST /affectation upsert antenne_responsables + notify() lui envoie une notification temps réel de sa nouvelle charge pastorale.
- Détection : une antenne dont les prières en attente (priere_demandes.antenne_id, statut nouvelle) s'accumulent → remonte dans le module prière scopé, le responsable est alerté avant que les demandes ne soient orphelines.
- Consolidation financière mensuelle : le trésorier national lit les dons par antenne et par devise pour le rapport, chaque assemblée locale gardant sa devise (FCFA/CAD/EUR).

### Lacunes restantes
- Rétro-remplissage : profiles.antenne_id / dons.antenne_id / priere_demandes.antenne_id sont nullables et largement NULL sur les données existantes — il faut un script de back-fill (par pays→antenne par défaut, ou via plateforme_principale) sinon les agrégats par antenne sous-comptent.
- Devise des dons : dons.devise existe mais peut diverger de antennes.devise ; définir la règle (devise du don fait foi, fallback devise antenne) — la RPC utilise actuellement antennes.devise comme clé d'agrégation, à confirmer vs dons.devise.
- Affectation par défaut à l'inscription : handle_new_user_metadata ne pose pas antenne_id ; brancher la déduction d'antenne (pays/ville → antenne) à la création de profil.
- Anti-cycle parent_id : la validation (une antenne ne peut être son propre ancêtre) doit être faite à l'écriture dans /api/admin/antennes/[id] (non couverte par une contrainte SQL).
- Conversion de devises pour un total consolidé optionnel : si la direction veut un grand total estimé, il faut une table de taux de change (non présente) — laissé hors scope (principe : pas d'addition inter-devises).
- Migration des rôles existants : les responsables actuellement gérés via nation_responsables (par pays) ne sont pas automatiquement responsables d'antenne ; prévoir une passerelle ou double affectation.
- UI AntenneSwitcher : composant à créer ; le cockpit /admin/gouvernement doit propager ?antenne= dans ses ~6 sous-requêtes modules (ajout .in('antenne_id', scopeIds)).

<details><summary>SQL du module (référence)</summary>

```sql
-- ============================================================================
-- MULTI-ANTENNES — RBAC scopé par antenne + agrégats consolidés (additif)
-- ----------------------------------------------------------------------------
-- ÉTEND l'existant : antennes (20260602270000), profiles.antenne_id,
-- evenements.antenne_id, dons.antenne_id. Calque le modèle nation_responsables.
-- La PORTÉE est imposée CÔTÉ SERVEUR (API). Idempotent & additif.
-- ============================================================================

-- 1) Rôles d'antenne (réutilise des valeurs existantes ; ajoute le scope local).
alter type public.user_role add value if not exists 'responsable_antenne';
-- coordinateur / responsable_mahanaim existent déjà (enum) — réutilisés tels quels.

-- 2) Métadonnées d'affichage manquantes sur antennes (ne PAS recréer la table).
alter table public.antennes add column if not exists code_couleur text;          -- pastille cockpit
alter table public.antennes add column if not exists ordre integer not null default 0; -- tri d'affichage
alter table public.antennes add column if not exists telephone text;
alter table public.antennes add column if not exists email text;
create index if not exists idx_antennes_parent on public.antennes (parent_id);
create index if not exists idx_antennes_ordre on public.antennes (ordre);

-- 3) Affectation responsable ↔ antenne (calque de nation_responsables, par antenne_id).
create table if not exists public.antenne_responsables (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  antenne_id   uuid        not null references public.antennes(id) on delete cascade,
  role         text        not null default 'responsable_antenne', -- responsable_antenne | coordinateur
  inclut_sous  boolean     not null default true,   -- voit aussi les sous-antennes (sous-arbre)
  actif        boolean     not null default true,
  created_at   timestamptz not null default now(),
  unique (user_id, antenne_id)
);
create index if not exists idx_antenne_resp_user on public.antenne_responsables (user_id);
create index if not exists idx_antenne_resp_antenne on public.antenne_responsables (antenne_id);
create index if not exists idx_antenne_resp_actif on public.antenne_responsables (actif);

alter table public.antenne_responsables enable row level security;
-- Un responsable LIT sa propre affectation (pour connaître son périmètre).
drop policy if exists antenne_resp_select_own on public.antenne_responsables;
create policy antenne_resp_select_own on public.antenne_responsables for select
  to authenticated using (user_id = auth.uid());
-- Attribution / retrait : service role (super_admin en back-office) uniquement.

-- 4) Rattachement à une antenne sur les tables transactionnelles manquantes
--    (profiles/evenements/dons déjà rattachés). Permet le scope direct & les stats.
alter table public.priere_demandes      add column if not exists antenne_id uuid references public.antennes(id) on delete set null;
alter table public.inscriptions_formation add column if not exists antenne_id uuid references public.antennes(id) on delete set null;

-- 5) Index composites de SCOPE (clé de la scalabilité à 100 000 membres).
create index if not exists idx_profiles_antenne_statut on public.profiles (antenne_id, membre_statut);
create index if not exists idx_dons_antenne_statut      on public.dons (antenne_id, statut);
create index if not exists idx_evenements_antenne       on public.evenements (antenne_id);
create index if not exists idx_prieres_antenne          on public.priere_demandes (antenne_id);
create index if not exists idx_inscr_form_antenne       on public.inscriptions_formation (antenne_id);

-- 6) RPC — descendants d'une antenne (sous-arbre via parent_id, CTE récursive).
--    SECURITY DEFINER : la garde de rôle se fait CÔTÉ API (supabaseAdmin). Sert au scope.
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

-- 7) RPC — agrégats consolidés par antenne (1 aller-retour, scalable).
--    Renvoie membres + dons consolidés PAR DEVISE LOCALE (jamais d'addition inter-devises).
create or replace function public.antenne_stats_agg(p_antenne_ids uuid[])
returns table (
  membres        bigint,
  inscrits       bigint,
  responsables   bigint,
  prieres        bigint,
  formations     bigint,
  evenements     bigint,
  dons_count     bigint,
  dons_par_devise jsonb
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

-- Droits d'exécution : service role uniquement (appel via supabaseAdmin côté serveur).
revoke all on function public.antenne_descendants(uuid) from anon, authenticated;
revoke all on function public.antenne_stats_agg(uuid[]) from anon, authenticated;
```
</details>

## Marketplace apostolique — catalogue, stock, abonnements, revenus & accès (extension de marketplace_products / product_purchases / webhook Chariow)
**Réutilise :**
- marketplace_products (étendue : on AJOUTE category_id, collection, stock, sku, is_subscription, subscription_interval, antenne_id, rating_avg, rating_count, featured, position — jamais recréée)
- product_purchases (étendue : ajout subscription_status, current_period_end, renewed_count, revoked_at, antenne_id, refunded_at — l'access_token et le don_id restent le pivot de l'accès)
- webhook /api/webhook/chariow (déjà producteur de product_purchases + notifyUser('achat')) — on branche dessus : stock decrement, renouvellement abonnement, captation antenne/devise, sans réécrire la logique don)
- /api/acces/[token]/route.ts (accès post-achat par jeton + URL signée bucket 'produits') — réutilisé tel quel, on ajoute juste la vérif subscription_status/period_end pour abonnements et statut revoque
- table dons (devise FCFA, antenne_id, meta_json) = source unique des revenus ; on agrège dessus pour les revenus marketplace plutôt que de dupliquer les montants
- antennes (hiérarchie parent_id, devise) + profiles.antenne_id pour la portée et la conversion multi-devises
- lib/nation-stats.ts pattern countIn (count:'exact',head:true) pour les agrégats serveur scalables → nouveau lib marketplace-stats.ts calqué dessus
- lib/notify.ts notifyUser/notifyBroadcast (Realtime) pour achats, renouvellements, ruptures de stock, nouveaux avis
- lib/admin-auth.ts isAdminRequest + lib/rate-limit (rateLimit/clientIp) + lib/member-auth getSessionProfile + lib/roles ADMIN_ROLES
- bucket privé 'produits' (URL signées 3600s) pour la livraison numérique
- activity_logs (logActivity action_type) pour journaliser achat/avis/remboursement
- sensitive_access_logs + nation_responsables pour la portée antenne/nation des revenus
- CMS cover_url / images.ts conventions pour visuels produits

### Architecture
## Vue d'ensemble

Le Marketplace est un **module additif greffé sur l'existant Chariow**. On NE touche pas au flux de paiement (externe, géré par Chariow) ni au pivot `dons → product_purchases → access_token`. On ajoute 4 capacités manquantes en branchant sur les points d'extension déjà présents.

```
┌─────────────────────────────────────────────────────────────────┐
│              CENTRE DE COMMANDEMENT (cockpit /admin)              │
│  Onglet "Boutique" : Catalogue · Stock · Abonnements · Revenus   │
│  · Avis · Mise en avant   (lit /api/admin/marketplace/*)         │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ service role (RLS bypass)        │ RPC agrégats
        ┌───────▼────────┐                 ┌───────▼──────────┐
        │ marketplace_*  │                 │ marketplace_     │
        │ products       │◄──category_id───│ revenue() RPC    │
        │ (+ stock,      │                 │ (scope antenne/  │
        │  is_sub, …)    │                 │  pays/devise)    │
        └───────┬────────┘                 └──────────────────┘
                │ chariow_product_id
   PAIEMENT     ▼
  ┌──────────────────────┐   webhook    ┌──────────────────────────┐
  │ Page Chariow (extern)│─────────────►│ /api/webhook/chariow     │
  └──────────────────────┘  successful  │  (EXISTANT, on étend) :   │
                            .sale        │  1. crée don (inchangé)   │
                                         │  2. crée product_purchase │
                                         │  3. NOUVEAU: decrement     │
                                         │     stock, set antenne_id, │
                                         │     gère abonnement,       │
                                         │     notify rupture         │
                                         └─────────┬─────────────────┘
                                                   ▼
   MEMBRE  /member/dashboard/achats ──► /api/acces/[token] (signé 3600s)
                                         + avis via /api/marketplace/avis
```

## Composants

1. **SQL additif** : catégories/collections (`marketplace_categories`), avis (`marketplace_reviews`), colonnes stock/abonnement/antenne sur les tables existantes, RPC d'agrégation `marketplace_revenue` + `marketplace_top_products`.
2. **APIs admin** : `/api/admin/marketplace/categories` (CRUD), `/api/admin/marketplace/revenue` (cockpit ventes scopé), `/api/admin/marketplace/reviews` (modération). L'existant `/api/admin/marketplace` reste, enrichi des nouveaux champs dans `FIELDS`.
3. **APIs publiques/membre** : `/api/marketplace` (catalogue public filtré catégorie/collection/featured, paginé), `/api/marketplace/avis` (POST membre acheteur), réutilise `/api/acces/[token]`.
4. **Lib pure** : `marketplace-pricing.ts` (devise, conversion d'affichage, libellés abonnement — SANS I/O, testable) + `marketplace-stats.ts` (agrégats service-role, pattern nation-stats).
5. **Hook webhook** : extension du flux existant (stock, abonnement, antenne) — best-effort, jamais bloquant pour le don.

## Flux de données clés

- **Achat** : Chariow → webhook → don + product_purchase (existant) → NOUVEAU: `marketplace_products.stock -= 1` si physique, `antenne_id` propagé depuis le profil acheteur, notif rupture si stock atteint le seuil.
- **Abonnement** : chaque `successful.sale` récurrent Chariow met à jour `subscription_status='active'` + `current_period_end` + `renewed_count++` sur le purchase existant (idempotent par transaction).
- **Revenus** : jamais recalculés à la volée côté client — RPC `marketplace_revenue(scope)` agrège `dons` joints aux purchases, groupé par antenne/devise.
- **Avis** : seul un membre dont `product_purchases.statut='complete'` peut noter → trigger recalcule `rating_avg/rating_count` sur le produit.

### APIs
- `GET /api/marketplace` — Catalogue public paginé : filtres ?category=slug&collection=&featured=1&type=&q=, tri position/featured, RLS actif=true. Renvoie produits + rating_avg + en stock.
- `GET /api/admin/marketplace/categories` — Liste des catégories (actives + inactives) pour le back-office.
- `POST /api/admin/marketplace/categories` — Créer une catégorie (slug auto, position). Garde isAdminRequest + rateLimit.
- `PATCH /api/admin/marketplace/categories` — Mettre à jour une catégorie ({id, ...champs}).
- `DELETE /api/admin/marketplace/categories` — Supprimer une catégorie (?id=) — les produits passent category_id=NULL (on delete set null).
- `GET /api/admin/marketplace/revenue` — Cockpit ventes : appelle RPC marketplace_revenue + marketplace_top_products. ?pays=&antenne=&from=&to=. Portée imposée serveur selon rôle/nation_responsables.
- `GET /api/admin/marketplace/reviews` — Liste des avis pour modération (?product_id=, ?pending=1).
- `PATCH /api/admin/marketplace/reviews` — Approuver/masquer un avis ({id, approuve|actif}) → trigger recalcule la note.
- `POST /api/marketplace/avis` — Membre acheteur dépose une note 1-5 + commentaire. getSessionProfile + vérif product_purchases.statut=complete pour ce user/produit. Idempotent (un avis/produit).
- `GET /api/acces/[token]` — EXISTANT — étendu : refuse si subscription_status non 'active' ou current_period_end dépassé, ou revoked_at non nul.
- `POST /api/webhook/chariow` — EXISTANT — étendu : décrément stock physique, propagation antenne_id depuis profil, gestion renouvellement abonnement (renewed_count++, current_period_end), notif rupture de stock. Best-effort.

### Sécurité
RLS: marketplace_categories & marketplace_reviews ont RLS activé avec SELECT anon/authenticated borné (categories: actif=true ; reviews: actif AND approuve). Aucune policy INSERT/UPDATE/DELETE → écriture exclusivement service role (back-office) ou route serveur contrôlée. marketplace_products/product_purchases gardent leurs policies existantes (lecture publique actif=true ; un membre ne lit que SES product_purchases via user_id=auth.uid()). Les nouvelles colonnes héritent de ces policies (pas de fuite). RBAC serveur: /api/admin/* gardé par isAdminRequest (cookie cier_admin = ADMIN_SESSION_TOKEN, aucun repli en prod). /api/marketplace/avis gardé par getSessionProfile + vérification stricte qu'un product_purchases complété non révoqué existe pour (user, produit) — pas d'avis sans achat. Portée antenne/nation: /api/admin/marketplace/revenue impose la portée CÔTÉ SERVEUR : un super_admin peut passer ?pays/?antenne libre ; un nation_pastor est borné à son/ses pays via nation_responsables (jamais de scope élargi depuis le client). Les RPC marketplace_revenue/top_products sont security definer mais REVOKE sur anon/authenticated → appelables uniquement par la service role (supabaseAdmin). Rate-limit: rateLimit/clientIp sur toutes les écritures (avis 20/min, admin 60/min, webhook 60/min, /api/acces 10/min anti-brute-force du jeton). Données sensibles: les fichiers numériques restent dans le bucket privé 'produits' servis par URL signée 3600s — jamais d'URL publique ; l'access_token (hex 32-64) est le seul facteur, validé par regex + statut. Révocation: revoked_at/refunded_at coupent l'accès immédiatement dans /api/acces. Abonnement: current_period_end vérifié avant signature d'URL → l'accès expire sans intervention. Logs: logActivity (achat/avis) + sensitive_access_logs pour la consultation des revenus par nation ; webhook journalise toujours le payload brut (giving_transactions_log) pour audit. Anti-doublon avis: unique index (product_id, user_id) + upsert. supabaseAdmin (RLS bypass) reste server-only.

### Scalabilité (100 000 membres)
Cible 100 000 membres → potentiellement des millions de product_purchases. (1) AGRÉGATS EN SQL: les revenus et top-produits ne pullent JAMAIS les lignes côté Node — RPC marketplace_revenue/top_products agrègent en base (sum/count/group by) avec filtres poussés dans le WHERE. Le cockpit reçoit quelques lignes (par devise) au lieu de millions. (2) INDEX ciblés: idx_purchase_product, idx_purchase_antenne, idx_purchase_created, idx_purchase_sub (partiel) couvrent les jointures et fenêtres temporelles des RPC ; idx_mkt_featured/category/collection (partiels où pertinent) accélèrent le catalogue. (3) PAGINATION: /api/marketplace pagine (range/limit, défaut 24, max 100) et trie sur index (featured, position) ; jamais de SELECT * non borné (l'admin reste à limit 500, le public est paginé). (4) CACHE: catalogue public peu volatil → réponse cache-control s-maxage + revalidation, ou ISR sur les pages vitrine ; revenus côté cockpit rafraîchis à la demande. (5) COMPTEURS DÉNORMALISÉS: rating_avg/rating_count maintenus par trigger (pas de AVG à la lecture) ; stock décrémenté au webhook (pas de COUNT live). (6) REALTIME ciblé: notifyUser n'émet qu'à l'acheteur concerné (achat/renouvellement) et notifyBroadcast('admin') seulement pour les ruptures de stock — pas de fan-out massif. (7) WEBHOOK idempotent (index partiel uniq_purchase_txn_prod déjà présent) → re-livraisons Chariow sans doublon ni dérive de stock. (8) Les RPC sont STABLE → cache de plan, et marquées limit borné. Multi-devise: agrégation GROUP BY devise évite toute somme erronée entre FCFA/EUR/USD.

### UX/UI
## Cockpit admin (/admin — onglet "Boutique", intégré au cockpit unique)
- Sous-onglets: Catalogue · Catégories · Stock · Abonnements · Revenus · Avis. Réutilise les composants de la page /admin/marketplace existante (table CRUD), on AJOUTE:
- **Catalogue**: colonnes Catégorie, Collection, Stock (badge rouge si < seuil), Note (étoiles rating_avg), En avant (toggle featured), Position. Édition inline des nouveaux champs (category_id select, stock, is_subscription + interval, antenne_id select sur la hiérarchie antennes).
- **Catégories**: CRUD simple (nom, icône lucide, parent, position, actif) via /api/admin/marketplace/categories.
- **Stock**: vue filtrée produits physiques (stock non NULL), alertes rupture en tête (stock <= stock_seuil_alerte), bouton réappro (PATCH stock).
- **Abonnements**: liste product_purchases is_subscription, statut (active/past_due/annulé), prochaine échéance (current_period_end), renewed_count.
- **Revenus**: cartes CA par devise (RPC marketplace_revenue), sélecteur pays/antenne (borné par rôle), top 10 produits (marketplace_top_products), graphe période. Cohérent avec le style des cartes du cockpit gouvernement/nation existant.
- **Avis**: modération (approuver/masquer), filtre "en attente".

## Espace membre (/member/dashboard)
- **Mes achats** (/member/dashboard/achats, déjà ciblé par notifyUser href): liste des product_purchases du membre, bouton "Accéder" → /api/acces/[token] (URL signée), badge abonnement (actif/expire le …), et pour chaque achat complété un bouton "Laisser un avis" (étoiles 1-5 + commentaire → /api/marketplace/avis).
- **Boutique publique** (/marketplace, existant): on ajoute la barre de filtres (catégories en chips, collection, "En avant"), les étoiles rating_avg sur chaque carte, le badge "Rupture"/"Plus que N" sur les physiques, le badge "Abonnement /mois". La fiche produit affiche les avis approuvés. CTA "Acheter" → lien_achat Chariow (inchangé).

## Composants réutilisés
Cartes/tables du cockpit existant, ShareButtons (V2), conventions images.ts pour cover_url. UI FR, devise affichée via marketplace-pricing.ts.

### Cas d'usage pastoraux
- Un pasteur de nation publie sa masterclass en abonnement mensuel (FCFA) : le webhook Chariow renouvelle automatiquement current_period_end à chaque paiement, l'accès au streaming reste ouvert tant que l'abonnement est actif et se coupe seul à l'expiration — sans intervention.
- L'antenne Canada vend des livres physiques pour une convention : le stock se décrémente à chaque achat, et quand il atteint le seuil, l'équipe reçoit une notification de rupture pour réapprovisionner avant l'événement.
- Le super_admin consulte au cockpit le CA marketplace par antenne et par devise (FCFA/EUR/CAD) pour la dîme/redistribution missionnaire, sans mélanger les monnaies ; un nation_pastor ne voit que sa nation.
- Un membre ayant acheté un e-book de délivrance laisse un avis 5 étoiles + témoignage court : la note moyenne du produit monte, ce qui guide les nouveaux visiteurs (preuve sociale au service de l'évangélisation).
- Mise en avant (featured) d'un parcours d'intégration payant pendant une campagne : il remonte en tête de la vitrine /marketplace pour convertir les visiteurs en disciples.
- Billetterie d'un séminaire régional : type=billet, stock = places disponibles, l'access_token sert de billet vérifiable à l'entrée.
- Remboursement/contestation : l'admin pose refunded_at/revoked_at → l'accès au contenu est coupé immédiatement (intégrité spirituelle et financière).

### Lacunes restantes
- Chariow ne fournit pas d'API de checkout ni un événement de fin/annulation d'abonnement standardisé : la transition subscription_status vers 'annule'/'past_due' dépend de ce que Chariow envoie réellement (à vérifier sur les payloads bruts déjà journalisés dans giving_transactions_log) ; sinon prévoir un cron de relecture / une révocation manuelle admin.
- Pas de gestion de variantes produit (taille/couleur) pour le physique : sku unique par produit seulement ; à modéliser si vrai e-commerce dérivés.
- Pas de panier multi-produits : chaque produit = un lien_achat Chariow distinct (limite plateforme externe). Un panier nécessiterait un agrégateur de paiement.
- Conversion de devises pour un CA consolidé unique : on agrège PAR devise (correct), mais pas de taux de change pour un total global converti — nécessiterait une table de taux + horodatage.
- Livraison physique (adresse, transporteur, suivi) non modélisée : à ajouter (table d'expéditions) si vente de biens matériels à grande échelle.
- RPC marketplace_revenue joint dons via don_id : les achats à montant 0 (offerts) ou sans don_id rapprochés n'apparaissent pas dans le CA — comportement voulu mais à documenter pour le reporting.
- Modération des avis: pas de détection automatique de contenu abusif (filtre manuel via approuve) — un filtre mots-clés/anti-spam serait un plus.
- Cron de relance des abonnements past_due et d'expiration n'est pas inclus (peut s'appuyer sur le harness CronCreate).

<details><summary>SQL du module (référence)</summary>

```sql
-- ============================================================================
-- MARKETPLACE V4 — catégories/collections, stock, abonnements, avis,
-- revenus par antenne/devise, mise en avant. ADDITIF & IDEMPOTENT.
-- Étend marketplace_products / product_purchases SANS les recréer.
-- Timestamp choisi > 20260602270000.
-- ============================================================================

-- ── 1. CATÉGORIES / COLLECTIONS (taxonomie du catalogue) ────────────────────
create table if not exists public.marketplace_categories (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        unique,
  nom         text        not null,
  description text,
  icone       text,                                   -- nom d'icône lucide (UI)
  parent_id   uuid        references public.marketplace_categories(id) on delete set null,
  position    integer     not null default 0,         -- ordre d'affichage
  actif       boolean     not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_mkt_cat_actif on public.marketplace_categories (actif, position);
create index if not exists idx_mkt_cat_parent on public.marketplace_categories (parent_id);
alter table public.marketplace_categories enable row level security;
drop policy if exists mkt_cat_read on public.marketplace_categories;
create policy mkt_cat_read on public.marketplace_categories
  for select to anon, authenticated using (actif = true);
-- Écriture via service role uniquement.

-- ── 2. EXTENSION marketplace_products (stock, abonnement, antenne, mise en avant) ──
alter table public.marketplace_products add column if not exists category_id          uuid references public.marketplace_categories(id) on delete set null;
alter table public.marketplace_products add column if not exists collection            text;        -- regroupement marketing libre (ex. "Rentrée 2026")
alter table public.marketplace_products add column if not exists antenne_id            uuid references public.antennes(id) on delete set null; -- revenus par antenne
alter table public.marketplace_products add column if not exists sku                   text;        -- référence produit physique
alter table public.marketplace_products add column if not exists stock                 integer;     -- NULL = stock illimité (numérique) ; >=0 = physique
alter table public.marketplace_products add column if not exists stock_seuil_alerte    integer not null default 5;
alter table public.marketplace_products add column if not exists is_subscription       boolean not null default false;
alter table public.marketplace_products add column if not exists subscription_interval text;        -- mois | annee | trimestre
alter table public.marketplace_products add column if not exists featured              boolean not null default false; -- mise en avant
alter table public.marketplace_products add column if not exists position              integer not null default 0;     -- tri vitrine
alter table public.marketplace_products add column if not exists rating_avg            numeric(3,2) not null default 0; -- recalculé par trigger
alter table public.marketplace_products add column if not exists rating_count          integer not null default 0;
create index if not exists idx_mkt_category   on public.marketplace_products (category_id, actif);
create index if not exists idx_mkt_collection on public.marketplace_products (collection);
create index if not exists idx_mkt_antenne    on public.marketplace_products (antenne_id);
create index if not exists idx_mkt_featured   on public.marketplace_products (featured, position) where actif = true;
create index if not exists idx_mkt_sku        on public.marketplace_products (sku) where sku is not null;

-- ── 3. EXTENSION product_purchases (abonnement, révocation, antenne, remboursement) ──
alter table public.product_purchases add column if not exists antenne_id           uuid references public.antennes(id) on delete set null;
alter table public.product_purchases add column if not exists subscription_status  text;            -- active | past_due | annule | NULL(non abonnement)
alter table public.product_purchases add column if not exists current_period_end   timestamptz;     -- fin d'accès abonnement
alter table public.product_purchases add column if not exists renewed_count        integer not null default 0;
alter table public.product_purchases add column if not exists revoked_at           timestamptz;
alter table public.product_purchases add column if not exists refunded_at          timestamptz;
create index if not exists idx_purchase_antenne   on public.product_purchases (antenne_id);
create index if not exists idx_purchase_sub       on public.product_purchases (subscription_status) where subscription_status is not null;
create index if not exists idx_purchase_product   on public.product_purchases (product_id);
create index if not exists idx_purchase_created   on public.product_purchases (created_at);

-- ── 4. AVIS / NOTES (acheteurs vérifiés uniquement) ─────────────────────────
create table if not exists public.marketplace_reviews (
  id          uuid        primary key default gen_random_uuid(),
  product_id  uuid        not null references public.marketplace_products(id) on delete cascade,
  user_id     uuid        references public.profiles(id) on delete set null,
  purchase_id uuid        references public.product_purchases(id) on delete set null,
  note        integer     not null check (note between 1 and 5),
  commentaire text,
  approuve    boolean     not null default true,      -- modération (peut passer à false)
  actif       boolean     not null default true,
  created_at  timestamptz not null default now()
);
-- Un seul avis par membre et par produit.
create unique index if not exists uniq_review_user_product on public.marketplace_reviews (product_id, user_id) where user_id is not null;
create index if not exists idx_review_product on public.marketplace_reviews (product_id, approuve, actif);
alter table public.marketplace_reviews enable row level security;
drop policy if exists review_read on public.marketplace_reviews;
create policy review_read on public.marketplace_reviews
  for select to anon, authenticated using (actif = true and approuve = true);
-- L'écriture passe par /api/marketplace/avis (service role, vérifie l'achat).

-- ── 5. TRIGGER : recalcul rating_avg / rating_count sur le produit ──────────
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

-- ── 6. RPC AGRÉGATS REVENUS (scalable : SQL côté serveur, pas de pull massif) ──
-- Revenus marketplace scopés par pays/antenne, groupés par devise.
-- p_pays NULL et p_antenne NULL → global (super_admin). Source = dons via purchases.
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

-- Top produits par nombre d'achats (scopé), pour le cockpit.
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

-- ── 7. SEED catégories de base (idempotent) ─────────────────────────────────
insert into public.marketplace_categories (slug, nom, icone, position) values
  ('ebooks',      'E-books',          'book-open',   10),
  ('livres',      'Livres physiques', 'book',        20),
  ('masterclass', 'Masterclass',      'graduation-cap', 30),
  ('formations',  'Formations',       'school',      40),
  ('billets',     'Billetterie',      'ticket',      50),
  ('abonnements', 'Abonnements',      'repeat',      60),
  ('produits',    'Produits dérivés', 'shirt',       70)
on conflict (slug) do nothing;
```
</details>

## Application Mobile (PWA-first + couche API mobile JWT + Push)
**Réutilise :**
- profiles (id, role, antenne_id, derniere_connexion, pays/ville) — identité + RBAC mobile, aucun nouveau modele utilisateur
- Auth Supabase (createRouteClient / getSessionProfile) — les tokens mobiles SONT des sessions Supabase (access_token JWT + refresh_token), zero second systeme d'auth
- app_notifications + notify()/notifyUser()/notifyBroadcast() — deja la source de verite des notifs ; le push mobile s'y branche en lecteur (trigger), pas en doublon
- notification_reads — etat lu/archive serveur multi-appareils deja en place, partage web+mobile
- Supabase Realtime (publication supabase_realtime sur app_notifications) — la PWA recoit deja le temps reel, reutilise tel quel
- rate-limit.ts (rateLimit/clientIp) — protection des endpoints mobiles
- admin-auth.ts (isAdminRequest) — console admin push depuis /admin
- roles.ts (isAdmin, ADMIN_ROLES) + nation_responsables + antennes — scope antenne/nation pour le ciblage des campagnes push
- public/manifest.json + icon-192/512 deja presents — base PWA installable, il manque juste le service worker
- next.config.js headers() — y ajouter les en-tetes PWA/SW
- Conventions route.ts (runtime nodejs, dynamic force-dynamic, IS_DEMO_MODE early return, { ok, data|message })

### Architecture
## Vue d'ensemble — strategie en 3 couches, une seule source de verite

Le module n'introduit AUCUN nouveau systeme d'identite ni de notification. Il pose une facade mobile versionnee au-dessus de l'existant Citadelle et complete la PWA.

```
                ┌──────────────────────────────────────────────┐
                │   CLIENTS                                       │
                │  PWA installable (Next.js actuel + SW)          │
                │  App native future (Expo / React Native)        │
                └───────────────┬─────────────────┬───────────────┘
                                │ JWT Supabase     │ JWT Supabase
                                ▼                  ▼
                ┌──────────────────────────────────────────────┐
                │  API MOBILE VERSIONNEE  /api/mobile/v1/*        │
                │  - bootstrap (sync initiale, config, feature    │
                │    flags, antenne, devise, version mini)        │
                │  - me / home / notifications                    │
                │  - devices (enregistrement token push)          │
                │  - prefs (preferences notif/langue)             │
                │  garde: requireMobileUser() (Bearer JWT)        │
                └───────────────┬──────────────────────────────────┘
                                │ supabaseAdmin (service role, RLS bypass)
                                ▼
                ┌──────────────────────────────────────────────┐
                │  DONNEES EXISTANTES  profiles, app_notifications,│
                │  notification_reads, antennes, formations, dons… │
                │  + NOUVEAU: mobile_devices, mobile_sessions,     │
                │    mobile_preferences, push_dispatch_log          │
                └──────────────────────────────────────────────┘

  TEMPS REEL: app_notifications --(trigger AFTER INSERT)--> fan_out
     ├─ membres en ligne   → Supabase Realtime (deja en place)
     └─ membres hors ligne → push (Web Push VAPID / FCM / APNs via Expo)
                              en lisant mobile_devices
```

## Flux de donnees clefs

1. **Auth mobile.** Le client s'authentifie via `supabase.auth.signInWithPassword` (SDK) ou via le flow web existant ; il recoit un `access_token` (JWT) + `refresh_token`. Toutes les requetes mobiles portent `Authorization: Bearer <access_token>`. Cote serveur, `requireMobileUser(req)` valide le JWT contre Supabase et resout le profil — meme RBAC que `getSessionProfile`, sans dependre des cookies.

2. **Bootstrap.** Au lancement, le client appelle `GET /api/mobile/v1/bootstrap` : profil minimal, antenne (nom/fuseau/devise), feature flags, version minimale requise (kill-switch), curseur de notifications. Un seul aller-retour pour hydrater l'app.

3. **Push.** A chaque INSERT dans `app_notifications`, un dispatcher serveur (route interne ou Edge Function) lit les `mobile_devices` cibles (selon `user_id`/`audience`/scope antenne), respecte `mobile_preferences`, et envoie le push (Web Push pour la PWA ; Expo Push pour le natif). Le resultat est trace dans `push_dispatch_log` (idempotence + diagnostic). Le contenu de la notif reste 100 % dans `app_notifications` — le push n'est qu'un transport.

4. **Offline/cache.** Le service worker (Workbox-like) applique: app-shell precache, stale-while-revalidate sur les API GET idempotentes (home, formations, ressources), network-only sur les ecritures, et une file d'attente (background sync) pour les actions differees (ex. marquer une priere). Deep links via URL canoniques `https://chapelleduroyaume.org/...` (App Links Android / Universal Links iOS pour le natif).

## Integration au Centre de Commandement
Le module mobile devient un panneau du cockpit /admin: console d'envoi de campagnes push (ciblage par antenne/nation/role), KPIs d'adoption (devices actifs, plateformes, opt-in push, retention), et reutilise la portee serveur (super_admin = tout ; nation_pastor = sa nation ; responsable = son antenne). Aucune donnee sensible n'est exposee au client mobile au-dela de la portee du membre.

### APIs
- `GET /api/mobile/v1/bootstrap` — Hydratation initiale: profil minimal, antenne (fuseau/devise), feature flags, version mini requise (kill-switch), curseur notifications. Un seul aller-retour.
- `GET /api/mobile/v1/me` — Profil du membre + role + antenne + etape parcours (RBAC mobile).
- `GET /api/mobile/v1/home` — Flux d'accueil agrege (live en cours, prochains evenements, dernieres formations/ressources) — cacheable stale-while-revalidate.
- `GET /api/mobile/v1/notifications` — Notifications du membre (reutilise app_notifications + etat lu via notification_reads).
- `PATCH /api/mobile/v1/notifications` — Marquer lu/archive cote serveur (upsert notification_reads, multi-appareils).
- `POST /api/mobile/v1/devices` — Enregistrer/mettre a jour un appareil + token push (upsert mobile_devices), cree mobile_session.
- `DELETE /api/mobile/v1/devices` — Desenregistrer un appareil (logout / desinstallation), revoque la session.
- `GET /api/mobile/v1/prefs` — Lire les preferences (categories push, quiet hours, langue, theme).
- `PUT /api/mobile/v1/prefs` — Mettre a jour les preferences (upsert mobile_preferences).
- `POST /api/admin/mobile/push` — Console admin: envoyer une campagne push ciblee (antenne/nation/role/audience) — insere dans app_notifications, le trigger declenche le fan-out.
- `GET /api/admin/mobile/stats` — KPIs d'adoption mobile pour le cockpit (RPC mobile_adoption_stats).

### Sécurité
- **Auth = JWT Supabase, jamais un second secret.** `requireMobileUser` valide le `access_token` via `supabaseAdmin.auth.getUser(token)` (verifie signature + expiration cote Supabase). Le refresh est gere par le SDK client. Aucun token maison, aucune cle stockee en clair cote app.\n- **RLS stricte sur toutes les nouvelles tables.** `mobile_devices`/`mobile_sessions`/`mobile_preferences` : policies `user_id = auth.uid()`. `push_dispatch_log` : aucune policy (service role only). Defense en profondeur : meme via supabaseAdmin, les ecritures filtrent toujours par `mu.uid` (le DELETE n'efface que l'appareil du membre).\n- **RBAC + portee serveur pour les campagnes push.** `/api/admin/mobile/push` est garde par `isAdminRequest`. Le ciblage applique la portee cote serveur : super_admin = toutes antennes ; nation_pastor (via nation_responsables) = sa nation ; responsable = son antenne. Le client mobile ne choisit jamais sa portee — elle est imposee par le profil.\n- **Pas de donnees sensibles cote client.** Le bootstrap n'expose que la portee du membre. Les agregats nation/finances passent par RPC SECURITY DEFINER scopes, jamais par lecture directe.\n- **Rate-limit** (`rateLimit`/`clientIp`) sur enregistrement d'appareil (30/min/IP) et envoi push (faible quota admin) pour freiner l'abus et le spam de tokens.\n- **RGPD.** IP jamais stockee en clair : `ip_hash` (SHA-256 tronque). Token push = donnee technique revocable (logout = DELETE). Quiet hours + opt-in par categorie (`mobile_preferences`) respectes avant tout envoi.\n- **Web Push** signe avec cles VAPID (env `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, jamais commitees) ; Expo/FCM/APNs via cle serveur en env. Les endpoints expires (410/404) marquent l'appareil `push_enabled=false` et nettoient le token.\n- **Kill-switch** : `app_version` + version mini dans bootstrap permet de bloquer une version compromise.\n- **sanitize** : whitelist de champs sur toutes les ecritures, troncatures de longueur, validation enum (platform/provider).

### Scalabilité (100 000 membres)
- **100k membres, 1..N appareils.** Index cibles : `idx_mobile_devices_user (user_id, push_enabled)`, `idx_mobile_devices_active (push_enabled, last_seen_at)` pour selectionner rapidement les appareils a pousser. `unique(push_token)` = upsert O(1) au re-enregistrement (pas de doublons qui gonflent le fan-out).\n- **Temps reel sans polling.** On reutilise Supabase Realtime deja en place : 1 WebSocket/membre en ligne au lieu de 100k requetes. Les hors-ligne sont servis par push — declenche par `pg_notify('mobile_push', notif_id)` (trigger), donc un seul evenement par notification, pas un scan periodique.\n- **Fan-out batche.** Le dispatcher lit les appareils cibles par page (ex. 500), envoie en lots concurrents bornes (p-limit), et ecrit `push_dispatch_log` avec `unique(notif_id, device_id)` pour l'idempotence (retry sur. Une campagne « tous membres » devient un job batch, pas 100k inserts synchrones dans la requete HTTP admin.\n- **Agregats par RPC, pas N requetes.** `mobile_adoption_stats()` (SECURITY DEFINER, STABLE) calcule devices/plateformes/opt-in en un appel — pattern nation-stats.ts. Le cockpit ne fait jamais de count cote client.\n- **Cache cote edge/client.** `home`/`formations`/`ressources` en GET idempotent → service worker stale-while-revalidate + en-tete `Cache-Control` court. Reduit la charge serveur sur les ecrans les plus visites.\n- **Pagination/curseur.** notifications paginees par `created_at desc` (curseur), jamais OFFSET profond.\n- **Multi-instance.** Le rate-limit memoire actuel est mono-process (note PlanetHoster). Pour scaler horizontalement le push, le dispatcher tourne en worker dedie (ou Edge Function planifiee) consommant la file `mobile_push`, decouple du serveur web.

### UX/UI
## PWA (priorite 1 — reutilise le Next.js existant)\n- **Installabilite** : manifest.json deja present (CIER, icones 192/512, shortcuts Live/Priere/Formations). Ajouter `public/sw.js` (service worker Workbox-like) enregistre dans le layout racine ; banniere « Ajouter a l'ecran d'accueil » (event beforeinstallprompt) + guide iOS (Partager → Sur l'ecran d'accueil).\n- **Service worker** : precache app-shell, runtime cache SWR pour GET, page offline de repli, background sync pour actions differees.\n- **Push web** : composant `PushOptIn` (demande permission au bon moment — apres une action engageante, pas au 1er ecran), s'abonne via `PushManager.subscribe({ applicationServerKey: VAPID_PUBLIC })`, POST le endpoint vers `/api/mobile/v1/devices`.\n- **Ecran membre Parametres → Notifications** : toggles par categorie (dons/prieres/formations/lives/evenements/systeme), quiet hours, langue, theme → `PUT /api/mobile/v1/prefs`. Reutilise les composants de /member/dashboard/parametres.\n- **Centre notifications** : reutilise l'UI /member/dashboard/notifications (deja branchee app_notifications + Realtime + notification_reads), zero duplication.\n\n## Cockpit admin (Centre de Commandement)\n- Nouvel onglet **/admin/mobile** : (1) KPIs adoption (devices actifs, repartition plateformes en donut, opt-in push, membres equipes) via `/api/admin/mobile/stats` ; (2) **Composeur de campagne push** : titre/corps/lien + selecteur de portee (antenne/nation/role/audience, pre-filtre selon le role admin) + apercu + envoi → `/api/admin/mobile/push` ; (3) journal d'envoi (push_dispatch_log) avec taux de delivrance.\n- S'integre au cockpit unique (meme chrome /admin, garde cookie admin, style existant).\n\n## App native future (Expo / React Native)\n- Consomme exactement la meme API `/api/mobile/v1/*` (Bearer JWT Supabase via `@supabase/supabase-js` en mode RN). Push via `expo-notifications` → token Expo enregistre sur le meme endpoint `devices` (push_provider='expo'). Deep links App Links/Universal Links vers les URL canoniques. Aucune divergence de backend.

### Cas d'usage pastoraux
- Un membre d'Abidjan recoit une push instantanee quand le culte passe EN DIRECT (cms_lives → app_notifications → fan-out), tap → ouvre le live dans la PWA installee, meme hors du navigateur.
- Reponse a une demande de priere : quand un intercesseur marque une priere « reponse_recue », le membre recoit une push personnelle de suivi pastoral, ou qu'il soit dans le monde.
- Le pasteur national du Canada envoie une push ciblee a sa SEULE nation (annonce de retraite locale) — la portee est imposee cote serveur, impossible de toucher Abidjan par erreur.
- Un nouveau membre dans le tunnel d'integration recoit des rappels d'etape (parcours_etape) en push pour ne pas decrocher — discipulat assiste.
- Quiet hours : un membre en Europe ne recoit pas de push a 3h du matin meme si Abidjan publie un enseignement — respect pastoral du repos.
- Hors-ligne dans une zone a faible connexion : le membre consulte ses formations et ressources deja mises en cache par le service worker, puis l'app synchronise sa progression au retour du reseau.
- Le Super Admin suit l'adoption mobile par antenne dans le cockpit pour decider ou pousser l'evangelisation digitale.
- Don rapide depuis l'ecran d'accueil PWA (shortcut) avec confirmation push du recu Chariow.

### Lacunes restantes
- Service worker absent : public/sw.js + enregistrement dans le layout racine + page offline a creer (le manifest existe deja, mais rien ne le rend offline-capable).
- Cles VAPID Web Push a generer et placer en env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) ; lib d'envoi web-push a ajouter aux dependances.
- Worker dispatcher push : aucun processus n'ecoute encore le canal pg_notify('mobile_push'). A implementer (worker Node dedie ou Edge Function planifiee) — le serveur Passenger mono-process actuel n'est pas ideal pour un listener LISTEN permanent ; prevoir un worker decouple.
- Aucune colonne email/locale garantie partout : verifier que profiles.email est toujours peuplee (le helper dons s'appuie deja dessus).
- Endpoints /api/mobile/v1/home et /bootstrap a ecrire (agregation reutilisant les sources existantes — meme pattern que /api/member/notifications).
- Config CORS pour le futur natif : l'API mobile doit autoriser l'origine de l'app Expo (headers) sans ouvrir le reste.
- Strategie de refresh token cote client a documenter (le SDK Supabase la gere, mais la PWA doit persister la session de maniere sure).
- Localisation multi-langue des contenus push (fr d'abord ; en/autres a prevoir avec mobile_preferences.langue deja en place).
- Tests : aucune logique pure mobile testable extraite pour l'instant (envisager un lib mobile-targeting.ts pur — calcul de la portee/filtres — sur le modele de pastoral-intelligence.ts).
- Multi-instance rate-limit : si le push scale horizontalement, brancher un store partage (note deja presente dans rate-limit.ts).

<details><summary>SQL du module (référence)</summary>

```sql
-- ============================================================================
-- 20260602280000_mobile.sql
-- APPLICATION MOBILE — PWA + API mobile JWT + Push notifications
-- ----------------------------------------------------------------------------
-- Additif & idempotent. NE RECREE RIEN : reutilise profiles, app_notifications,
-- notification_reads, antennes. Conçu pour 100 000 membres (1..N appareils/membre).
-- Le CONTENU des notifications reste dans app_notifications ; ces tables gerent
-- seulement le TRANSPORT push, les sessions mobiles et les preferences.
-- ============================================================================

-- 1) APPAREILS / TOKENS PUSH ------------------------------------------------
-- Un membre peut avoir plusieurs appareils (telephone, tablette, PWA desktop).
create table if not exists public.mobile_devices (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  platform     text        not null default 'web',  -- web | android | ios
  push_provider text       not null default 'webpush', -- webpush | expo | fcm | apns
  push_token   text        not null,                 -- endpoint Web Push (JSON) ou token Expo/FCM/APNs
  device_name  text,                                 -- libelle lisible (ex. « iPhone de Doxa »)
  app_version  text,                                 -- version client (kill-switch)
  locale       text        default 'fr',
  push_enabled boolean     not null default true,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  -- Un meme token ne doit exister qu'une fois (re-enregistrement = upsert).
  unique (push_token)
);
create index if not exists idx_mobile_devices_user on public.mobile_devices (user_id, push_enabled);
create index if not exists idx_mobile_devices_active on public.mobile_devices (push_enabled, last_seen_at desc);
create index if not exists idx_mobile_devices_platform on public.mobile_devices (platform);
alter table public.mobile_devices enable row level security;
-- Un membre gere SES appareils ; l'envoi push se fait en service role.
drop policy if exists mobile_devices_rw on public.mobile_devices;
create policy mobile_devices_rw on public.mobile_devices for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) SESSIONS MOBILES (telemetrie/securite, pas l'auth elle-meme) ------------
-- L'auth reste Supabase (JWT). Cette table trace les sessions actives pour
-- l'analytique d'adoption et la revocation (deconnexion a distance).
create table if not exists public.mobile_sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  device_id    uuid        references public.mobile_devices(id) on delete set null,
  platform     text        not null default 'web',
  app_version  text,
  ip_hash      text,                                  -- IP hachee (RGPD), jamais l'IP brute
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at   timestamptz
);
create index if not exists idx_mobile_sessions_user on public.mobile_sessions (user_id, last_seen_at desc);
create index if not exists idx_mobile_sessions_active on public.mobile_sessions (revoked_at, last_seen_at desc);
alter table public.mobile_sessions enable row level security;
drop policy if exists mobile_sessions_read on public.mobile_sessions;
create policy mobile_sessions_read on public.mobile_sessions for select to authenticated
  using (user_id = auth.uid());
-- Ecriture (creation/revocation) : service role uniquement.

-- 3) PREFERENCES (notifications, langue, theme) ------------------------------
-- Une ligne par membre. Les categories cochees filtrent l'envoi push.
create table if not exists public.mobile_preferences (
  user_id            uuid        primary key references public.profiles(id) on delete cascade,
  push_dons          boolean     not null default true,
  push_prieres       boolean     not null default true,
  push_formations    boolean     not null default true,
  push_lives         boolean     not null default true,
  push_evenements    boolean     not null default true,
  push_systeme       boolean     not null default true,
  quiet_hours_start  smallint,                          -- heure locale debut silence (0..23) ou null
  quiet_hours_end    smallint,                          -- heure locale fin silence
  langue             text        not null default 'fr',
  theme              text        not null default 'system', -- system | dark | light
  updated_at         timestamptz not null default now()
);
alter table public.mobile_preferences enable row level security;
drop policy if exists mobile_prefs_rw on public.mobile_preferences;
create policy mobile_prefs_rw on public.mobile_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) JOURNAL D'ENVOI PUSH (idempotence + diagnostic) ------------------------
create table if not exists public.push_dispatch_log (
  id            uuid        primary key default gen_random_uuid(),
  notif_id      uuid        references public.app_notifications(id) on delete set null,
  device_id     uuid        references public.mobile_devices(id) on delete set null,
  user_id       uuid        references public.profiles(id) on delete set null,
  status        text        not null default 'queued', -- queued | sent | failed | expired
  provider      text,
  error         text,
  created_at    timestamptz not null default now(),
  -- Idempotence : une notif n'est poussee qu'une fois par appareil.
  unique (notif_id, device_id)
);
create index if not exists idx_pushlog_notif on public.push_dispatch_log (notif_id);
create index if not exists idx_pushlog_status on public.push_dispatch_log (status, created_at desc);
alter table public.push_dispatch_log enable row level security;
-- Lecture/ecriture : service role uniquement (diagnostic admin), aucune policy.

-- 5) FAN-OUT TEMPS REEL → PUSH ----------------------------------------------
-- A chaque notification inseree, on signale au dispatcher serveur via NOTIFY
-- (le worker Node ecoute le canal et declenche l'envoi push aux appareils
-- hors-ligne). Realtime couvre deja les clients en ligne.
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

-- 6) AGREGAT D'ADOPTION (cockpit) — un seul RPC, pas de N requetes ----------
create or replace function public.mobile_adoption_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'devices_total',  (select count(*) from public.mobile_devices),
    'devices_actifs', (select count(*) from public.mobile_devices
                         where push_enabled and last_seen_at > now() - interval '30 days'),
    'par_plateforme', (select coalesce(jsonb_object_agg(platform, n), '{}'::jsonb)
                         from (select platform, count(*) n from public.mobile_devices group by platform) s),
    'optin_push',     (select count(*) from public.mobile_devices where push_enabled),
    'membres_equipes',(select count(distinct user_id) from public.mobile_devices)
  );
$$;
```
</details>

## Centre d'Intercession (Mahanaïm) — Salles live, chaînes 24/7, tours de garde, mur temps réel, escalade & exaucements
**Réutilise :**
- priere_demandes (étendue : priorite normale|important|urgent|tres_urgent, statut, assigned_to/by/at, responsable_id, derniere_action(_at), is_public, prayers_count, pays/ville/langue, reference) — table cœur que l'on ÉTEND, jamais recrée
- priere_assignations (intercesseur_id, role, actif, derniere_action) — réutilisée telle quelle pour rattacher un intercesseur à une salle/demande
- priere_categories (slug/label/ordre/actif) — catégories des salles et chaînes
- temoignages (demande_id, statut soumis|valide|rejete, is_public, valide_par) — source des statistiques d'exaucement et du mur de victoires
- antennes (id, slug, pays, ville, fuseau 'Africa/Abidjan', devise, parent_id) — scope géographique/horaire des salles, chaînes et tours de garde
- profiles (role enum incluant intercesseur, responsable_mahanaim, coordinateur ; antenne_id, pays, derniere_connexion) — identité et RBAC des intercesseurs
- delivrance_demandes — escalade automatique des cas tres_urgent vers la cure d'âme
- app_notifications + notify.ts (notifyUser/notifyBroadcast) + Supabase Realtime — notifications aux intercesseurs et push du mur sans polling
- notification_reads — état lu serveur multi-appareils déjà en place
- src/lib/admin-auth.ts (isAdminRequest) et src/lib/member-auth.ts (getSessionProfile) — gardes serveur
- src/lib/rate-limit.ts (rateLimit/clientIp) — limitation des soumissions publiques et des amen
- src/lib/roles.ts (ADMIN_ROLES, isAdmin) — étendu d'un groupe MAHANAIM_ROLES
- src/lib/pastoral-intelligence.ts (pattern de logique pure testable) — modèle pour intercession-engine.ts
- src/lib/nation-stats.ts (countIn count:'exact',head:true) — pattern d'agrégat scope-able pour les stats d'intercession
- Cockpit /admin/gouvernement (module priere déjà présent : recues/traitees/en_attente/temoignages) — on y branche les nouveaux KPI salles/chaînes/garde/escalade
- activity_logs (action_type) — journalisation des actions d'intercession

### Architecture
## Vue d'ensemble

Le module ajoute la dimension **temps réel et organisationnelle** au Centre de Prière déjà existant. Le pipeline `Demande → Assignation → Intercession → Suivi → Réponse → Témoignage` reste intact ; on greffe par-dessus quatre briques nouvelles, toutes **additives** :

```
                       ┌─────────────────────── COCKPIT /admin/gouvernement ────────────────────────┐
                       │  KPI Mahanaïm (salles actives, couverture 24/7, garde du jour, escalades)   │
                       └───────────────▲─────────────────────────────────────────────▲──────────────┘
                                       │ RPC mahanaim_cockpit()                        │
   ┌───────────────────────────────────┴──────────┐               ┌──────────────────┴───────────────────┐
   │  ADMIN /admin/mahanaim (responsable/coord)    │               │  MEMBRE /member/dashboard/intercession│
   │  • salles (CRUD, ouvrir/clôturer)             │               │  • mur de prière temps réel (Realtime)│
   │  • chaînes 24/7 + créneaux de garde           │               │  • salle live (rejoindre, amen, focus) │
   │  • file d'escalade urgents                    │               │  • mon tour de garde + check-in        │
   │  • stats d'exaucement                         │               │  • soumettre / suivre ma demande       │
   └───────────────────┬───────────────────────────┘               └──────────────────┬────────────────────┘
                       │                                                              │
        /api/admin/mahanaim/[resource]                              /api/member/intercession/[action]
                       │                                                              │
                       └──────────────────────────┬───────────────────────────────────┘
                                                   ▼
        ┌──────────────────────────────────────────────────────────────────────────────┐
        │  Service-role (supabaseAdmin, bypass RLS) — écriture exclusive serveur          │
        │  lib/intercession-engine.ts (PUR) : escalade, couverture 24/7, score garde,     │
        │  rotation des fuseaux, exaucement-rate                                          │
        │  notify.ts → app_notifications → Supabase Realtime (push intercesseurs + mur)   │
        └──────────────────────────────────────────────────────────────────────────────┘
                                                   ▼
   Tables NOUVELLES : intercession_salles, intercession_participants, intercession_chaines,
                      intercession_creneaux, intercession_garde_log, intercession_mur,
                      priere_escalades   (+ extension priere_demandes : salle_id, chaine_id, escalade_*)
```

## Composants

1. **Salles d'intercession live** (`intercession_salles`) : sessions de prière planifiées ou spontanées, rattachées à une antenne et une catégorie. Statut `planifiee | live | cloturee`. Les membres rejoignent (`intercession_participants`), envoient des « amen / je prie » comptés en temps réel. Une salle peut être thématique (nation, santé, délivrance) ou liée à une demande urgente précise (`demande_id`).

2. **Chaînes de prière 24/7** (`intercession_chaines`) : couverture continue d'un sujet, découpée en **créneaux** (`intercession_creneaux`) d'une plage horaire récurrente, exprimés dans le **fuseau de l'antenne** — c'est la clé du relais mondial (Abidjan dort → Canada veille → Europe prend le relais). L'engine calcule les **trous de couverture**.

3. **Tours de garde** (`intercession_creneaux` assignés + `intercession_garde_log`) : planning des intercesseurs. Chaque prise de poste = un **check-in** journalisé (preuve de présence, score d'assiduité). Notification de rappel avant le créneau.

4. **Mur de prière temps réel** (`intercession_mur`) : flux d'intentions courtes (« Je prie pour… », « Exaucé ! »), poussé via Supabase Realtime. Modération légère (signalement, masquage service-role). Alimente le mur des victoires à partir des `temoignages` validés.

5. **Escalade par priorité** (`priere_escalades` + colonnes sur `priere_demandes`) : l'engine PUR décide, selon `priorite` et le temps sans assignation, du palier d'escalade (intercesseur → responsable_mahanaim → coordinateur → cure d'âme/délivrance). Chaque palier émet une notification ciblée.

## Flux de données type (cas urgent)

1. Membre soumet une demande `priorite=tres_urgent` via `/api/member/intercession/demande` (réutilise `priere_demandes`).
2. Serveur insère, puis `intercession-engine.escaladePalier()` renvoie `palier=1` immédiat → insertion `priere_escalades` + `notifyBroadcast('admin', …)` aux responsables Mahanaïm de l'antenne.
3. Si non assignée sous X min (vérifié au prochain accès cockpit ou par cron léger), palier monte ; un `tres_urgent` non traité sous 30 min crée une `delivrance_demandes` (pont cure d'âme) + notif coordinateur.
4. Un intercesseur l'assigne (`priere_assignations`), la rattache à une salle live (`salle_id`), prie, journalise une action.
5. Réponse reçue → témoignage soumis → validé → apparaît sur le mur des victoires et incrémente le **taux d'exaucement** dans le cockpit.

### APIs
- `GET /api/admin/mahanaim` — Cockpit Mahanaïm : appelle RPC mahanaim_cockpit(?antenne) + file d'escalade urgents + couverture des chaînes (engine). Garde isAdminRequest. Alimente /admin/gouvernement module priere.
- `GET/POST/PATCH /api/admin/mahanaim/[resource]` — CRUD service-role des ressources : salles | chaines | creneaux | mur | escalades. POST salle ouvre/clôture (statut live/cloturee) ; PATCH creneau assigne un intercesseur (+ notify) ; PATCH mur masque un message ; sanitize() whitelist + slugify.
- `GET /api/admin/mahanaim/garde` — Planning de garde consolidé d'une chaîne (grille jour x heure, trous de couverture calculés par intercession-engine), + assiduité par intercesseur depuis intercession_garde_log.
- `GET /api/intercession/salles` — Liste PUBLIQUE des salles live/planifiées (est_publique=true) pour la home et l'espace membre. Lecture anon via RLS, pas de garde.
- `GET /api/intercession/mur` — Flux PUBLIC du mur (messages non masqués, paginé created_at desc). Lecture initiale ; le live arrive ensuite par Supabase Realtime côté client.
- `POST /api/intercession/mur` — Soumission PUBLIQUE d'une intention/amen sur le mur. clientIp + rateLimit (anti-spam), sanitize, langue/pays. user_id = session si connecté sinon null. Peut incrémenter prayers_count de la demande liée.
- `POST /api/member/intercession/demande` — Membre soumet une demande de prière (réutilise priere_demandes) avec priorite. getSessionProfile + rateLimit. Déclenche intercession-engine.escaladePalier + notify aux responsables si urgent/tres_urgent.
- `POST /api/member/intercession/rejoindre` — Membre rejoint une salle live : upsert intercession_participants, incrémente participants_count, envoie un 'amen' (+amen_count) ; heartbeat last_seen. getSessionProfile.
- `GET/POST /api/member/intercession/garde` — Intercesseur voit ses créneaux à venir et fait son check-in/check-out (intercession_garde_log, calcul duree_min). RBAC : rôle dans MAHANAIM_ROLES via getSessionProfile.
- `POST /api/cron/intercession-escalade` — Tâche périodique (cron léger / Passenger) : passe la file idx_priere_escalade_queue, monte les paliers via engine, crée delivrance_demandes pour tres_urgent bloqués, recalcule couverture_pct des chaînes. Protégée par secret header.

### Sécurité
## RLS (défense en profondeur, écriture = service role)
- **Lecture publique restreinte** : `intercession_salles` (actif+publique+live/planifiee), `intercession_chaines` (actif), `intercession_mur` (masque=false) exposés à `anon, authenticated`. Aucune donnée sensible (pas de contenu de demande privée).
- **Lecture propriétaire** : `intercession_participants` / `intercession_garde_log` réservés à `user_id = auth.uid()` (un intercesseur ne voit pas l'agenda des autres via le client).
- **`priere_escalades` : aucune policy de lecture** → suivi pastoral interne strictement service-role. Le contenu des demandes urgentes reste invisible côté client.
- **Soumission publique encadrée** : `intercession_mur` insert avec `with check (masque=false and signale=false and (user_id is null or user_id=auth.uid()))` — empêche l'auto-masquage contournant la modération et l'usurpation d'identité. Même pattern que `temoignages_insert`.
- Toutes les autres écritures (salles, chaînes, créneaux, escalades, modération du mur) passent par `supabaseAdmin` (bypass RLS) côté serveur uniquement ; libs service-role marquées `import 'server-only'`.

## RBAC côté serveur (portée antenne/nation)
- Routes `/api/admin/mahanaim/*` : `isAdminRequest(req)` (cookie admin) + filtrage `?antenne` / `?pays`. Pour un `responsable_mahanaim`/`coordinateur` connecté en membre, ajouter un groupe `MAHANAIM_ROLES` dans `roles.ts` (`['responsable_mahanaim','coordinateur', ...ADMIN_ROLES]`) et imposer la **portée antenne** côté serveur : on dérive `antenne_id` autorisée depuis `profiles.antenne_id`/`nation_responsables` — jamais depuis un paramètre client non vérifié.
- `RPC mahanaim_cockpit` en `security definer` mais `revoke … from anon, authenticated` → invocable seulement via service role : le client ne peut pas la déclencher avec un `p_antenne` arbitraire.

## Rate-limit & données sensibles
- `clientIp` + `rateLimit` sur `POST /api/intercession/mur` (ex. 10/min/IP) et `POST /api/member/intercession/demande` (ex. 5/min) pour bloquer le spam d'intentions et l'inondation d'escalades.
- `sanitize()` whitelist stricte des champs (corps, titre, categorie, priorite, langue, pays) ; `slugify` pour salles/chaînes ; la `priorite` validée contre l'enum applicatif (rejet de valeurs hors `normale|important|urgent|tres_urgent`).
- Le **contenu** des demandes n'est jamais agrégé ni renvoyé dans les KPI (le cockpit ne manipule que des comptages, comme `gouvernement/route.ts`). Le pont vers `delivrance_demandes` (cas tres_urgent) hérite du régime confidentiel existant.

## Logs & traçabilité
- Chaque escalade automatique journalisée dans `priere_escalades` (raison, palier, rôle notifié) + `activity_logs` (`action_type='intercession_escalade'`).
- Check-in/out de garde = preuve horodatée non répudiable. Cron protégé par secret header (comparaison constante), runtime `nodejs`.

### Scalabilité (100 000 membres)
## Tenue à 100 000 membres
- **Index ciblés** : `idx_priere_escalade_queue` est un **index partiel** (`where assigned_to is null and statut in (...)`) — la file d'escalade reste minuscule (quelques centaines de lignes) même avec des millions de demandes historiques ; le cron la balaie en O(file ouverte), pas O(total). Idem `idx_mur_recent` partiel sur `masque=false`.
- **Agrégats côté Postgres via RPC** `mahanaim_cockpit` : un seul aller-retour réseau, `count(*)` sur index, au lieu de tirer les lignes en Node (anti-pattern). Calque du pattern `nation-stats.ts`/`admin_dashboard`. Le cockpit reste sous 100 ms.
- **Compteurs dénormalisés** : `participants_count`, `amen_count` (salles), `prayers_count` (demande), `couverture_pct` (chaîne) sont des caches incrémentés à l'écriture (ou recalculés par le cron) — le mur live n'a jamais besoin de `count(*)` à chaque rendu.
- **Pagination** systématique du mur et des listes (created_at desc + cursor `before=<id|ts>`, `limit` borné 50). Jamais de `select *` non borné — toutes les requêtes lourdes du cockpit sont bornées comme dans `gouvernement/route.ts` (`.limit(5000/20000)`).
- **Realtime au lieu de polling** : le mur et le statut des salles sont poussés via `supabase_realtime` (1 WebSocket/membre) — comme `app_notifications`. À 100k membres, on n'a pas 100k requêtes périodiques ; seuls les abonnés à une salle reçoivent ses events (filtre `salle_id`).
- **Garde 24/7 sans explosion de lignes** : le planning est **récurrent** (un créneau hebdo = 1 ligne), pas matérialisé par occurrence. Les check-ins (`intercession_garde_log`) croissent linéairement mais sont indexés par intercesseur/chaîne + date et purgeables/archivables.
- **Escalade asynchrone** : pas de calcul d'escalade à chaque lecture ; le cron léger (intervalle 1–5 min) traite la file partielle, et l'escalade « immédiate » (palier 1 d'un tres_urgent) est faite inline à la soumission. Charge constante quel que soit le volume historique.
- Le cron recalcule `couverture_pct` par chaîne en batch (peu de chaînes), évitant tout calcul à la volée.

### UX/UI
## Cockpit unique — /admin/gouvernement (extension du module « Prière » existant)
- Nouveau bandeau **Mahanaïm** dans le module priere déjà présent (`modules.priere`) : tuiles KPI `Salles live`, `Couverture 24/7 %` (jauge), `Garde du jour`, `Escalades ouvertes`, `Urgents sans suivi` (rouge clignotant si > 0), `Taux d'exaucement 30j`. Filtre `?antenne`/`?pays` réutilisé.
- **File d'escalade** : liste priorisée (tres_urgent → urgent), badge palier (1 responsable / 2 coordinateur / 3 cure d'âme), bouton « Assigner » (ouvre le sélecteur d'intercesseurs `/api/admin/intercesseurs` existant) — sans afficher le contenu sensible.

## /admin/mahanaim (responsable_mahanaim / coordinateur)
- Onglets : **Salles** (CRUD, bouton Ouvrir/Clôturer le live, lien visio), **Chaînes 24/7** (grille hebdo 7×24 colorée par couverture, trous en rouge depuis `engine.couverture`), **Tours de garde** (drag d'un intercesseur sur un créneau → PATCH + notif), **Mur** (modération : masquer/lever signalement), **Exaucements** (validation des témoignages liés + courbe).
- Composants réutilisés : tableaux/cartes du back-office existant, sélecteur d'intercesseurs, badges de priorité.

## Espace membre — /member/dashboard/intercession
- **Mur de prière temps réel** : flux d'intentions (Realtime), bouton « 🙏 Je prie » (amen) qui incrémente en live, filtre par catégorie/pays. Mur des victoires (témoignages validés) en tête.
- **Salles live** : cartes des salles `live`/`planifiee` (hôte, participants en direct), bouton « Rejoindre » → écran salle (compteur d'amen, lien visio optionnel, intentions de la salle).
- **Soumettre une demande** : formulaire avec choix de priorité, catégorie (`priere_categories`), public/privé, langue ; suivi du statut (timeline assignation → intercession → réponse).
- **Mon tour de garde** (intercesseurs) : agenda de mes créneaux, rappel avant la prise de poste, bouton **Check-in / Check-out**, score d'assiduité.
- Notifications in-app (cloche existante `app_notifications`) : « Vous êtes assigné(e) à une demande urgente », « Votre tour de garde commence dans 15 min », « Une prière que vous portiez a reçu une réponse 🎉 ».

### Cas d'usage pastoraux
- Relais mondial 24/7 : une chaîne 'Réveil des Nations' couvre les 168h en s'appuyant sur les fuseaux des antennes — Abidjan (UTC) prie 06h-14h, l'Europe (Paris) 14h-22h, le Canada (Toronto) 22h-06h ; l'engine signale tout trou de couverture au responsable.
- Demande tres_urgent (accident, hospitalisation) à 03h Abidjan : palier 1 notifie immédiatement les responsables Mahanaïm de l'antenne ; non assignée à 03h15 → palier 2 coordinateur ; à 03h30 sans suivi → création automatique d'un dossier delivrance_demandes (cure d'âme) + notif coordinateur national.
- Salle de combat spirituel live ouverte pendant une veillée : 400 membres rejoignent, le compteur d'amen monte en temps réel, l'hôte poste les sujets, le mur affiche les intentions ; à la clôture, les exaucements sont collectés en témoignages.
- Intercesseur affecté au créneau 'mardi 04h-06h' reçoit un rappel 15 min avant, fait son check-in ; son assiduité (présences/créneaux) est suivie par le responsable pour repérer les postes à renforcer.
- Mur des victoires : un témoignage validé ('guérison après 3 semaines de prière') bascule sur le mur public et incrémente le taux d'exaucement du cockpit, nourrissant la foi de l'assemblée et les campagnes.
- Coordinateur national filtre le cockpit sur son pays : il voit 7 escalades ouvertes, 92% de couverture sur la chaîne nationale, 3 urgents sans suivi — il réassigne en deux clics sans jamais lire le contenu confidentiel des demandes.
- Vague d'intentions après une prédication : le mur public reçoit 600 messages/h ; le rate-limit bloque le spam, la modération masque les abus, et chaque intention liée à une demande incrémente son prayers_count visible par le priant.

### Lacunes restantes
- Cron/scheduler de production : PlanetHoster/Passenger n'a pas de cron natif Node — il faut soit un cron système appelant /api/cron/intercession-escalade avec secret, soit un setInterval gardé dans app.js standalone. L'escalade 'immédiate' (palier 1) est faite inline, mais les montées différées dépendent de ce déclencheur.
- Conversion fuseau → UTC : les créneaux sont stockés en heure LOCALE du fuseau de la chaîne ; le calcul de couverture suppose des fuseaux à offset entier et ne gère pas finement l'heure d'été (DST). Pour une précision parfaite, prévoir une lib (date-fns-tz/luxon) côté serveur lors du recalcul cron.
- Visio/audio temps réel des salles : le champ lien_live référence une URL externe (Jitsi/Zoom/Google Meet/lien live existant) ; il n'y a pas de WebRTC intégré. Le compteur de présence et le mur sont natifs, mais la voix/vidéo reste déléguée.
- MAHANAIM_ROLES à ajouter dans src/lib/roles.ts (groupe responsable_mahanaim/coordinateur/intercesseur) et garde RBAC membre-side à câbler sur /api/member/intercession/garde — non encore présent.
- Dérivation server-side de la portée antenne pour un responsable connecté en MEMBRE (pas via cookie admin) : il faut relier profiles.antenne_id / nation_responsables à la garde des routes /api/admin/mahanaim si on ouvre l'accès hors cookie admin global.
- Pages UI réelles (/admin/mahanaim, /member/dashboard/intercession) et composant client Realtime du mur (abonnement supabase.channel par salle_id) restent à implémenter — la migration, l'engine et les contrats d'API les rendent constructibles.
- Internationalisation des notifications : notify() envoie un title/body FR ; pour le multi-langue (langue de la demande), prévoir des templates par langue comme email-templates.ts.

<details><summary>SQL du module (référence)</summary>

```sql
-- ============================================================================
-- CENTRE D'INTERCESSION (MAHANAÏM) — Salles live, chaînes 24/7, tours de garde,
-- mur temps réel, escalade par priorité, statistiques d'exaucement.
-- ----------------------------------------------------------------------------
-- ADDITIF & IDEMPOTENT. Étend priere_demandes / priere_assignations / temoignages
-- (NE recrée AUCUNE table existante). Réutilise antennes (fuseau), profiles,
-- priere_categories, notify()/app_notifications, delivrance_demandes.
-- Timestamp > 20260602270000.
-- ============================================================================

-- 0) Extension de priere_demandes : rattachement salle/chaîne + traçabilité escalade
alter table public.priere_demandes add column if not exists salle_id uuid;        -- references intercession_salles (FK posée plus bas, après création)
alter table public.priere_demandes add column if not exists chaine_id uuid;       -- references intercession_chaines
alter table public.priere_demandes add column if not exists antenne_id uuid references public.antennes(id) on delete set null;
alter table public.priere_demandes add column if not exists escalade_palier int not null default 0;   -- 0=aucune,1=responsable,2=coordinateur,3=cure d'âme
alter table public.priere_demandes add column if not exists escalade_at timestamptz;
alter table public.priere_demandes add column if not exists fuseau text;          -- copie du fuseau d'antenne pour routage 24/7
create index if not exists idx_priere_salle on public.priere_demandes (salle_id);
create index if not exists idx_priere_chaine on public.priere_demandes (chaine_id);
create index if not exists idx_priere_antenne on public.priere_demandes (antenne_id);
-- Index partiel : la file d'escalade (urgents ouverts non assignés) reste O(petit) à 100k demandes.
create index if not exists idx_priere_escalade_queue on public.priere_demandes (priorite, created_at)
  where assigned_to is null and statut in ('nouvelle','recue','assignee','en_intercession');

-- 1) Salles d'intercession (sessions live) ----------------------------------
create table if not exists public.intercession_salles (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique,
  titre         text not null,
  description   text,
  categorie     text,                                          -- slug priere_categories
  antenne_id    uuid references public.antennes(id) on delete set null,
  demande_id    uuid references public.priere_demandes(id) on delete set null,  -- salle dédiée à 1 cas
  hote_id       uuid references public.profiles(id) on delete set null,
  statut        text not null default 'planifiee',             -- planifiee | live | cloturee
  est_publique  boolean not null default true,                 -- visible des membres (sinon intercesseurs)
  lien_live     text,                                          -- URL visio/audio optionnelle
  debut_prevu   timestamptz,
  demarre_le    timestamptz,
  cloture_le    timestamptz,
  participants_count int not null default 0,
  amen_count    int not null default 0,
  actif         boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_salles_statut on public.intercession_salles (statut, debut_prevu);
create index if not exists idx_salles_antenne on public.intercession_salles (antenne_id);
create index if not exists idx_salles_demande on public.intercession_salles (demande_id);
alter table public.intercession_salles enable row level security;
drop policy if exists salles_read on public.intercession_salles;
create policy salles_read on public.intercession_salles for select to anon, authenticated
  using (actif = true and est_publique = true and statut in ('planifiee','live'));
-- Écriture : service role uniquement (back-office Mahanaïm).

-- FK différée de priere_demandes.salle_id (la table existe désormais), idempotente.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'priere_demandes_salle_fk') then
    alter table public.priere_demandes
      add constraint priere_demandes_salle_fk foreign key (salle_id)
      references public.intercession_salles(id) on delete set null;
  end if;
end $$;

-- 2) Participants d'une salle (présence + compteur amen) ---------------------
create table if not exists public.intercession_participants (
  id          uuid primary key default gen_random_uuid(),
  salle_id    uuid not null references public.intercession_salles(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete cascade,
  role        text not null default 'priant',                  -- hote | intercesseur | priant
  amen_count  int not null default 0,
  joined_at   timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  unique (salle_id, user_id)
);
create index if not exists idx_partic_salle on public.intercession_participants (salle_id);
create index if not exists idx_partic_user on public.intercession_participants (user_id);
alter table public.intercession_participants enable row level security;
drop policy if exists partic_read_own on public.intercession_participants;
create policy partic_read_own on public.intercession_participants for select to authenticated
  using (user_id = auth.uid());

-- 3) Chaînes de prière 24/7 (couverture continue d'un sujet) -----------------
create table if not exists public.intercession_chaines (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique,
  titre        text not null,
  description  text,
  categorie    text,
  antenne_id   uuid references public.antennes(id) on delete set null,
  fuseau       text,                                           -- hérité de l'antenne (ex. 'Africa/Abidjan')
  objectif     text,                                           -- intention de la chaîne
  date_debut   date,
  date_fin     date,                                           -- null = permanente
  couverture_pct int not null default 0,                       -- cache d'agrégat (recalculé serveur)
  actif        boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists idx_chaines_actif on public.intercession_chaines (actif);
create index if not exists idx_chaines_antenne on public.intercession_chaines (antenne_id);
alter table public.intercession_chaines enable row level security;
drop policy if exists chaines_read on public.intercession_chaines;
create policy chaines_read on public.intercession_chaines for select to anon, authenticated using (actif = true);

-- 4) Créneaux de garde (tours d'intercesseurs sur une chaîne) ----------------
-- Modèle hebdomadaire : jour_semaine 0..6 (0=dimanche) + heure locale fuseau chaîne.
create table if not exists public.intercession_creneaux (
  id              uuid primary key default gen_random_uuid(),
  chaine_id       uuid not null references public.intercession_chaines(id) on delete cascade,
  intercesseur_id uuid references public.profiles(id) on delete set null,
  jour_semaine    int not null,                                -- 0..6
  heure_debut     time not null,                               -- heure LOCALE (fuseau chaîne)
  heure_fin       time not null,
  recurrent       boolean not null default true,
  date_specifique date,                                        -- pour un créneau ponctuel
  actif           boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_creneaux_chaine on public.intercession_creneaux (chaine_id, jour_semaine, heure_debut);
create index if not exists idx_creneaux_inter on public.intercession_creneaux (intercesseur_id);
alter table public.intercession_creneaux enable row level security;
drop policy if exists creneaux_read on public.intercession_creneaux;
-- Lecture authentifiée (le planning de garde n'est pas public ; un intercesseur voit la grille).
create policy creneaux_read on public.intercession_creneaux for select to authenticated using (actif = true);

-- 5) Journal de garde (preuve de présence / check-in) ------------------------
create table if not exists public.intercession_garde_log (
  id              uuid primary key default gen_random_uuid(),
  creneau_id      uuid references public.intercession_creneaux(id) on delete set null,
  chaine_id       uuid references public.intercession_chaines(id) on delete set null,
  intercesseur_id uuid references public.profiles(id) on delete set null,
  check_in_at     timestamptz not null default now(),
  check_out_at    timestamptz,
  duree_min       int,                                         -- calculée au check-out
  statut          text not null default 'present',             -- present | absent | remplace
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_garde_inter on public.intercession_garde_log (intercesseur_id, check_in_at desc);
create index if not exists idx_garde_chaine on public.intercession_garde_log (chaine_id, check_in_at desc);
alter table public.intercession_garde_log enable row level security;
drop policy if exists garde_read_own on public.intercession_garde_log;
create policy garde_read_own on public.intercession_garde_log for select to authenticated
  using (intercesseur_id = auth.uid());

-- 6) Mur de prière temps réel (intentions courtes) --------------------------
create table if not exists public.intercession_mur (
  id          uuid primary key default gen_random_uuid(),
  salle_id    uuid references public.intercession_salles(id) on delete cascade,
  chaine_id   uuid references public.intercession_chaines(id) on delete set null,
  demande_id  uuid references public.priere_demandes(id) on delete set null,
  user_id     uuid references public.profiles(id) on delete set null,
  auteur      text,                                            -- prénom affiché (ou 'Anonyme')
  type        text not null default 'intention',               -- intention | amen | victoire | verset
  corps       text not null,
  pays        text,
  langue      text not null default 'fr',
  masque      boolean not null default false,                  -- modération (service role)
  signale     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_mur_salle on public.intercession_mur (salle_id, created_at desc);
create index if not exists idx_mur_recent on public.intercession_mur (created_at desc) where masque = false;
alter table public.intercession_mur enable row level security;
drop policy if exists mur_public_read on public.intercession_mur;
-- Lecture publique des messages non masqués (mur visible sur la salle/site).
create policy mur_public_read on public.intercession_mur for select to anon, authenticated using (masque = false);
-- SOUMISSION publique encadrée (comme temoignages_insert) : pas de masque/signalement forcé,
-- pas d'usurpation de user_id (doit être null OU = auth.uid()).
drop policy if exists mur_insert on public.intercession_mur;
create policy mur_insert on public.intercession_mur for insert to anon, authenticated
  with check (masque = false and signale = false and (user_id is null or user_id = auth.uid()));

-- 7) Historique d'escalade par priorité --------------------------------------
create table if not exists public.priere_escalades (
  id          uuid primary key default gen_random_uuid(),
  demande_id  uuid not null references public.priere_demandes(id) on delete cascade,
  palier      int not null,                                    -- 1 responsable | 2 coordinateur | 3 cure d'âme
  raison      text,                                            -- ex. 'tres_urgent non assigné > 15 min'
  notifie_role text,                                           -- rôle ciblé par la notif
  cree_par    uuid references public.profiles(id) on delete set null,  -- null = automatique
  created_at  timestamptz not null default now()
);
create index if not exists idx_escalade_demande on public.priere_escalades (demande_id, created_at desc);
alter table public.priere_escalades enable row level security;
-- Aucune lecture publique : suivi pastoral interne (service role uniquement).

-- 8) Realtime : push instantané du mur et des salles (idempotent) ------------
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

-- 9) RPC d'agrégat cockpit (évite N requêtes ; scope antenne/pays facultatif) -
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
-- Appelé exclusivement via supabaseAdmin (service role) côté serveur.
```
</details>

## Centre de Discipulat — parcours de croissance, mentorat 1-1, cellules & jalons, dashboard discipulat dans le cockpit
**Réutilise :**
- profiles (id, role, membre_statut, pays, ville, parcours_disciple_etape/parcours_etape, derniere_connexion, antenne_id) — base de l'intelligence membre, jamais recréée
- LMS existant : parcours, parcours_formations, formations, formation_modules, module_completions (progression RÉELLE), inscriptions_formation, certificats — le discipulat s'appuie dessus pour les prérequis pédagogiques et les certifications
- groupes (type 'cellule'/'groupe_priere') + membres_groupe (role leader/co-leader/membre, date_adhesion) — cellules/familles reliées au discipulat, ZÉRO nouvelle table de groupe
- chapelle.integration_journeys (stage_courant, a_ete_baptise, a_rejoint_service, a_suivi_leadership) + RPC chapelle.integration_funnel() — jalons d'intégration déjà posés, réutilisés comme jalons de base
- src/lib/pastoral-intelligence.ts (engagementLevel 6 paliers, conversionStage Visiteur→Leader, memberAlerts, MemberIntel) — moteur PUR réutilisé pour 'qui stagne / qui est prêt à servir'
- src/lib/pastoral-prediction.ts (churnRisk, needsFollowUp, ACTION_LABEL) — déjà branché au cockpit /admin/gouvernement
- antennes + profiles.antenne_id + nation_responsables — portée multi-antenne/nation imposée côté serveur (pattern nation-stats.ts / member/nation/route.ts)
- src/lib/notify.ts notifyUser()/notifyBroadcast() (app_notifications + Realtime) — alertes mentor/disciple temps réel
- src/lib/admin-auth.ts isAdminRequest + src/lib/member-auth.ts getSessionProfile + src/lib/roles.ts (ADMIN_ROLES, INTEGRATION_ROLES, isAdmin) — RBAC existant
- src/lib/rate-limit.ts (rateLimit/clientIp) — durcissement des écritures publiques/membre
- sensitive_access_logs + activity_logs — journalisation des accès et actions pastorales
- Cockpit /admin/gouvernement (page.tsx) + son endpoint /api/admin/gouvernement — on AJOUTE un onglet/bloc 'Discipulat' nourri par un nouvel agrégat, sans casser l'existant

### Architecture
## Centre de Discipulat — vue d'ensemble

Le module est une **couche d'orchestration relationnelle** posée par-dessus le LMS, le tunnel d'intégration et les cellules existants. Il n'invente pas de pédagogie (le LMS la fournit) ni de signaux (l'intelligence pastorale les fournit) : il ajoute la **dimension humaine du discipulat** — qui accompagne qui, sur quel chemin de croissance, avec quels jalons validés.

### Composants

1. **Chemins de croissance (`discipulat_chemins` + `discipulat_etapes`)** — séquences structurées d'étapes (ex. « Nouvelle Naissance », « Affermissement », « École de Leaders ») avec **prérequis** (étape précédente) et **liaison optionnelle** à un `parcours` LMS, une `formation`, un jalon d'intégration, ou un type d'engagement (service, cellule). Réutilise le concept `parcours`/`etape_tunnel` sans le dupliquer : un chemin AGRÈGE des parcours LMS + des actes relationnels.

2. **Relations de mentorat (`discipulat_relations`)** — appariement 1-1 disciple↔mentor, avec statut (active/en_pause/terminee), antenne, dates. Source de vérité du « qui accompagne qui ».

3. **Progression discipulat (`discipulat_progressions`)** — avancement RÉEL d'un membre sur les étapes d'un chemin (statut par étape : non_commence/en_cours/valide), validé soit automatiquement (module_completions / integration_journeys atteints), soit manuellement par le mentor (jalon relationnel).

4. **Jalons & rencontres (`discipulat_jalons`)** — journal des rencontres mentor↔disciple et des jalons franchis (baptême confirmé, premier service, première âme gagnée…). Alimente le suivi qualitatif.

5. **Certifications discipulat** — réutilise la table `certificats` existante (type='parcours') : la complétion d'un chemin délivre un certificat, comme le fait déjà /api/member/formations/progress.

### Flux de données
```
Signaux RÉELS (module_completions, integration_journeys, membres_groupe, dons, analytics)
        │
        ▼
discipulat-engine.ts (lib PURE, sans I/O) ── réutilise pastoral-intelligence
        │  → readiness (prêt à servir / prêt à être mentor), stagnation, étape suivante suggérée
        ▼
Auto-validation d'étapes (RPC discipulat_recompute_progression)
        │
        ▼
discipulat_progressions / discipulat_jalons  ──notify()──► mentor & disciple (Realtime)
        │
        ▼
Agrégat discipulat_overview (RPC) ──► /api/admin/discipulat ──► bloc « Discipulat » du cockpit /admin/gouvernement
                                  └─► /api/member/discipulat ──► espace disciple & espace mentor
```

### Intégration au Centre de Commandement
Le cockpit unique `/admin/gouvernement` gagne un **module Discipulat** (au même niveau que Croissance / Santé / Formation / Prière / Finance / Mission) : nb de relations actives, disciples sans mentor, mentors saturés, disciples stagnants, prêts-à-servir, taux d'achèvement des chemins, entonnoir d'étapes. La portée (antenne/nation) est **imposée côté serveur** exactement comme `member/nation/route.ts`.

### APIs
- `GET /api/admin/discipulat` — Agrégat cockpit (RPC discipulat_overview) + listes : disciples sans mentor, mentors saturés, disciples stagnants, prêts-à-servir. Garde isAdminRequest, portée ?antenne=/?pays= imposée serveur, accès journalisé (sensitive_access_logs).
- `POST /api/admin/discipulat/relations` — Créer/réassigner une relation mentor↔disciple (et notifyUser des deux parties). sanitize() whitelist {disciple_id, mentor_id, chemin_id, antenne_id, groupe_id}.
- `PATCH /api/admin/discipulat/relations` — Changer statut (active/en_pause/terminee) ou réassigner le mentor d'une relation existante.
- `GET /api/admin/discipulat/chemins` — CRUD lecture des chemins+étapes pour le back-office (admin/discipulat).
- `POST /api/admin/discipulat/chemins` — Créer/éditer un chemin et ses étapes (slugify, liaison parcours_id/formation_id/integration_flag).
- `GET /api/member/discipulat` — Espace disciple : mon chemin, mes étapes (statut RÉEL), mon mentor, mes jalons. getSessionProfile, appelle RPC discipulat_recompute avant lecture.
- `GET /api/member/discipulat/mentor` — Espace mentor : mes disciples, leur progression et alertes de suivi (réutilise pastoral-intelligence). Filtré sur mentor_id = session.
- `POST /api/member/discipulat/jalon` — Le mentor consigne une rencontre/jalon et peut valider manuellement une étape 'mentor'. rateLimit/clientIp, vérifie que la relation appartient au mentor connecté, notifyUser(disciple).

### Sécurité
RLS sur les 5 tables : catalogue (chemins/étapes) lisible anon/authenticated quand actif ; relations/progressions/jalons lisibles UNIQUEMENT par le disciple ou le mentor concerné (disciple_id = auth.uid() OR mentor_id = auth.uid()). Toute ÉCRITURE passe par le service role via routes gardées — aucune policy insert/update côté client. RBAC double couche : routes admin protégées par isAdminRequest (cookie cier_admin) ; routes membre par getSessionProfile + vérification que la relation appartient bien au mentor connecté avant tout jalon/validation (jamais de confiance dans l'UI). Portée antenne/nation IMPOSÉE serveur : un nation_pastor ne voit que son antenne_id/pays via la RPC discipulat_overview(p_antenne, p_pays) — le param client est ignoré pour les non-super_admin, exactement comme member/nation/route.ts. Données sensibles : le discipulat est intime ; le contenu des jalons/notes n'est JAMAIS exposé au cockpit (agrégats et comptages uniquement), seul le mentor/disciple lit le détail. Écritures membre durcies par rateLimit/clientIp (anti-spam jalons). sanitize() à whitelist stricte de champs sur POST relations/jalons. Journalisation : sensitive_access_logs (action 'discipulat_overview_view') + activity_logs (mentor_assigned, jalon_logged, etape_validee). La RPC discipulat_recompute est security definer mais ne valide que des étapes adossées à des faits déjà accomplis (module_completions, integration_journeys) — pas d'auto-promotion arbitraire.

### Scalabilité (100 000 membres)
Cible 100 000 membres. (1) Agrégats par RPC SQL (discipulat_overview) renvoyant un seul blob JSON — comme chapelle.integration_funnel() et admin_dashboard — au lieu d'agréger en mémoire. (2) Index composites créés : idx_disc_rel_mentor (mentor_id,statut), idx_disc_rel_disciple (disciple_id,statut), idx_disc_rel_antenne (antenne_id,statut), idx_disc_prog_disc (disciple_id,chemin_id), idx_disc_prog_statut (chemin_id,statut), idx_disc_jalons_disc (disciple_id,jalon_at desc) — couvrent les filtres conjoints du cockpit et des espaces mentor/disciple. (3) Pagination : listes disciples/jalons paginées (range/limit), jamais de SELECT * non borné ; les .limit(20000) servent de garde-fou agrégat et seront remplacés par count via RPC à mesure que le volume croît. (4) discipulat_recompute appelé à la demande (ouverture espace disciple) et idempotent (on conflict do update where statut<>'valide') — coût borné au nb d'étapes d'UN chemin (poignée de lignes), pas O(membres). (5) Le scope antenne/pays réduit drastiquement les jeux de données : un nation_pastor ne scanne que son périmètre via les index pays/antenne. (6) Cache court (ex. revalidate côté page cockpit / SWR) sur l'overview, données non temps-réel-critiques. (7) Realtime ciblé : notify() écrit dans app_notifications (déjà optimisé) pour pousser au mentor/disciple sans polling. (8) Unicité (disciple_id, chemin_id) et (disciple_id, etape_id) garantit l'absence de doublons à grande échelle.

### UX/UI
## Cockpit /admin/gouvernement — nouveau module « Discipulat »
Carte au même niveau que Croissance/Santé/Formation : KPIs (relations actives, disciples sans mentor [badge rouge actionnable], mentors saturés, étapes validées 30 j, jalons 30 j) + mini-entonnoir par chemin + liste « À apparier » avec bouton « Assigner un mentor » (modale : sélection mentor par antenne, suggestions readiness-to-mentor) + liste « Disciples stagnants » avec action « Relancer / Notifier le mentor ». Filtre antenne/pays partagé avec le reste du cockpit. Charbon & Lumière (or #D4AF37, violet #4B0082), composant PageHeader réutilisé.

## /admin/discipulat (back-office dédié)
Constructeur de chemins : drag-order d'étapes, choix du type de validation (mentor/parcours/formation/integration/service/cellule/don) avec sélecteur du parcours/formation existant, prérequis. Tableau des relations (filtrable antenne/chemin/statut) avec réassignation mentor.

## Espace MEMBRE — disciple (member/dashboard/discipulat)
« Mon chemin de croissance » : timeline verticale des étapes (validée ✓ / en cours / verrouillée par prérequis), barre de progression RÉELLE, carte « Mon mentor » (photo, prochain rendez-vous), journal de mes jalons, certificat à 100 %. Réutilise le style des pages formations/parcours existantes.

## Espace MEMBRE — mentor (onglet « Mes disciples »)
Liste de mes disciples avec pastille d'engagement (6 niveaux réutilisés), dernière rencontre, étape courante, bouton « Consigner une rencontre / valider une étape » et « Voir le parcours ». Alertes de suivi (réutilise memberAlerts) en tête. Intégré au layout member existant, accessible si l'utilisateur a au moins une relation mentor active.

### Cas d'usage pastoraux
- Apparier automatiquement : le cockpit liste les nouveaux convertis (conversionStage='disciple') sans mentor de leur antenne ; le responsable assigne en un clic, les deux reçoivent une notification Realtime.
- Détecter qui stagne : un disciple en relation active sans aucune étape validée depuis 30 j remonte dans 'Disciples stagnants' → le mentor est relancé.
- Détecter qui est prêt à servir : un membre engagé/très engagé ayant validé ≥2 étapes (readinessToServe) est proposé pour rejoindre une équipe de service (lien tunnel 'serviteur').
- Reproduire des disciples : un serviteur/leader ayant achevé le chemin 'École de Leaders' (readinessToMentor) devient mentor éligible et apparaît dans le sélecteur d'assignation.
- Auto-validation de jalons : quand un disciple termine une formation/parcours LMS ou est marqué baptisé dans integration_journeys, l'étape correspondante du chemin passe 'validée' sans saisie manuelle (RPC discipulat_recompute).
- Suivi 1-1 traçable : le mentor consigne chaque rencontre (discipulat_jalons) ; l'historique relationnel est conservé même si le mentor change.
- Cellule reliée au discipulat : un disciple est rattaché à un groupe (membres_groupe) ; le leader de cellule voit ses disciples dans son espace mentor.
- Mentor saturé : dès qu'un mentor atteint 8 disciples actifs, il est signalé 'saturé' pour rééquilibrer la charge pastorale et éviter l'épuisement.

### Lacunes restantes
- Aucun rôle dédié 'mentor' dans l'enum user_role : on s'appuie sur la présence d'une relation mentor active. À formaliser via add value if not exists 'mentor' si une garde par rôle est souhaitée.
- Le seuil de saturation (8) et les seuils de readiness sont codés en dur dans discipulat-engine.ts — à externaliser en table de config si besoin de réglage par antenne.
- Pas encore de planification des rencontres (calendrier/rappels) ni de visioconférence intégrée : les jalons sont consignés a posteriori. Réutiliser cms_events/event_registrations pour planifier serait l'étape suivante.
- Auto-validation 'service'/'cellule'/'don' non encore branchée dans discipulat_recompute (seuls formation/parcours/integration le sont) — à compléter en lisant membres_groupe et dons.
- Pas de vue 'arbre de multiplication' (qui a discipulé qui sur plusieurs générations) — exploitable plus tard via discipulat_relations en self-join.
- Notifications de rappel périodiques (mentor inactif depuis X jours) nécessitent un cron/CronCreate, hors périmètre de cette migration.
- Les listes du cockpit utilisent encore des .limit(20000) comme garde-fou : à migrer vers comptages purs RPC quand le volume de relations dépassera quelques dizaines de milliers.

<details><summary>SQL du module (référence)</summary>

```sql
-- ============================================================================
-- CENTRE DE DISCIPULAT — chemins de croissance, mentorat 1-1, jalons, progression
-- ----------------------------------------------------------------------------
-- Additif & idempotent. RÉUTILISE profiles, parcours, formations, formation_modules,
-- module_completions, certificats, groupes, antennes, chapelle.integration_journeys.
-- Ne recrée AUCUNE table existante. Écriture = service role (back-office / API gardée).
-- ============================================================================

-- 1) Chemins de croissance (séquences structurées) ---------------------------
create table if not exists public.discipulat_chemins (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        unique not null,
  titre         text        not null,
  description   text,
  -- étape de conversion ciblée (cohérent avec pastoral-intelligence.conversionStage)
  cible_stage   text        not null default 'disciple', -- inscrit|disciple|membre|serviteur|leader
  niveau        int         not null default 1,          -- 1 fondations … 5 leadership
  cover_url     text,
  langue        text        not null default 'fr',
  ordre         int         not null default 0,
  actif         boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_disc_chemins_actif on public.discipulat_chemins (actif, ordre);

-- 2) Étapes d'un chemin (avec prérequis + liaison à l'existant) ---------------
create table if not exists public.discipulat_etapes (
  id             uuid       primary key default gen_random_uuid(),
  chemin_id      uuid       not null references public.discipulat_chemins(id) on delete cascade,
  ordre          int        not null default 0,
  titre          text       not null,
  description    text,
  -- type de validation : ce qui « valide » l'étape
  validation     text       not null default 'mentor', -- mentor|parcours|formation|integration|service|cellule|don
  -- liens OPTIONNELS vers l'existant (réutilisation, pas de duplication)
  parcours_id    uuid       references public.parcours(id) on delete set null,
  formation_id   uuid       references public.formations(id) on delete set null,
  integration_flag text,    -- a_ete_baptise|a_rejoint_service|a_suivi_leadership (integration_journeys)
  prerequis_etape_id uuid   references public.discipulat_etapes(id) on delete set null,
  obligatoire    boolean    not null default true,
  created_at     timestamptz not null default now(),
  unique (chemin_id, ordre)
);
create index if not exists idx_disc_etapes_chemin on public.discipulat_etapes (chemin_id, ordre);

-- 3) Relations de mentorat 1-1 (disciple ↔ mentor) ---------------------------
create table if not exists public.discipulat_relations (
  id            uuid        primary key default gen_random_uuid(),
  disciple_id   uuid        not null references public.profiles(id) on delete cascade,
  mentor_id     uuid        references public.profiles(id) on delete set null,
  chemin_id     uuid        references public.discipulat_chemins(id) on delete set null,
  antenne_id    uuid        references public.antennes(id) on delete set null,
  groupe_id     uuid        references public.groupes(id) on delete set null, -- cellule/famille de rattachement
  statut        text        not null default 'active', -- active|en_pause|terminee
  demarre_le    timestamptz not null default now(),
  termine_le    timestamptz,
  note          text,
  created_at    timestamptz not null default now(),
  -- un disciple a UNE relation active par chemin (réassignable)
  unique (disciple_id, chemin_id)
);
create index if not exists idx_disc_rel_mentor  on public.discipulat_relations (mentor_id, statut);
create index if not exists idx_disc_rel_disciple on public.discipulat_relations (disciple_id, statut);
create index if not exists idx_disc_rel_antenne on public.discipulat_relations (antenne_id, statut);

-- 4) Progression par étape (avancement RÉEL) ---------------------------------
create table if not exists public.discipulat_progressions (
  id            uuid        primary key default gen_random_uuid(),
  disciple_id   uuid        not null references public.profiles(id) on delete cascade,
  etape_id      uuid        not null references public.discipulat_etapes(id) on delete cascade,
  chemin_id     uuid        not null references public.discipulat_chemins(id) on delete cascade,
  statut        text        not null default 'en_cours', -- non_commence|en_cours|valide
  valide_le     timestamptz,
  valide_par    uuid        references public.profiles(id) on delete set null, -- mentor (validation manuelle)
  source        text,        -- auto|mentor (traçabilité)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (disciple_id, etape_id)
);
create index if not exists idx_disc_prog_disc on public.discipulat_progressions (disciple_id, chemin_id);
create index if not exists idx_disc_prog_statut on public.discipulat_progressions (chemin_id, statut);

-- 5) Jalons & rencontres (journal qualitatif) --------------------------------
create table if not exists public.discipulat_jalons (
  id            uuid        primary key default gen_random_uuid(),
  relation_id   uuid        references public.discipulat_relations(id) on delete cascade,
  disciple_id   uuid        not null references public.profiles(id) on delete cascade,
  mentor_id     uuid        references public.profiles(id) on delete set null,
  type          text        not null default 'rencontre', -- rencontre|jalon|priere|note
  titre         text        not null,
  detail        text,
  jalon_at      timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists idx_disc_jalons_disc on public.discipulat_jalons (disciple_id, jalon_at desc);
create index if not exists idx_disc_jalons_rel  on public.discipulat_jalons (relation_id, jalon_at desc);

-- 6) RLS ---------------------------------------------------------------------
alter table public.discipulat_chemins      enable row level security;
alter table public.discipulat_etapes       enable row level security;
alter table public.discipulat_relations    enable row level security;
alter table public.discipulat_progressions enable row level security;
alter table public.discipulat_jalons       enable row level security;

-- Catalogue public en lecture (chemins/étapes actifs) ; écriture service role.
drop policy if exists disc_chemins_read on public.discipulat_chemins;
create policy disc_chemins_read on public.discipulat_chemins for select
  to anon, authenticated using (actif = true);
drop policy if exists disc_etapes_read on public.discipulat_etapes;
create policy disc_etapes_read on public.discipulat_etapes for select
  to anon, authenticated using (true);

-- Relations : le disciple ET le mentor lisent la leur (gestion via service role).
drop policy if exists disc_rel_select_own on public.discipulat_relations;
create policy disc_rel_select_own on public.discipulat_relations for select
  to authenticated using (disciple_id = auth.uid() or mentor_id = auth.uid());

-- Progression : le disciple lit la sienne (écriture serveur uniquement).
drop policy if exists disc_prog_select_own on public.discipulat_progressions;
create policy disc_prog_select_own on public.discipulat_progressions for select
  to authenticated using (disciple_id = auth.uid());

-- Jalons : disciple + mentor lisent ; écriture serveur (route gardée).
drop policy if exists disc_jalons_select_own on public.discipulat_jalons;
create policy disc_jalons_select_own on public.discipulat_jalons for select
  to authenticated using (disciple_id = auth.uid() or mentor_id = auth.uid());

-- 7) RPC : recalcul auto de la progression depuis l'existant ------------------
-- Valide les étapes liées à un parcours/formation/intégration déjà accomplis.
create or replace function public.discipulat_recompute(p_disciple uuid, p_chemin uuid)
returns void
language plpgsql
security definer
set search_path = public, chapelle
as $$
declare e record; v_done boolean;
begin
  for e in select * from public.discipulat_etapes where chemin_id = p_chemin loop
    v_done := false;
    if e.validation = 'formation' and e.formation_id is not null then
      select coalesce(progression,0) >= 100 into v_done
        from public.inscriptions_formation
       where user_id = p_disciple and formation_id = e.formation_id;
    elsif e.validation = 'parcours' and e.parcours_id is not null then
      -- toutes les formations du parcours achevées
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

-- 8) RPC d'agrégat pour le cockpit (un seul blob JSON, scope antenne/pays) ----
create or replace function public.discipulat_overview(p_antenne uuid default null, p_pays text default null)
returns jsonb
language sql
security definer
set search_path = public
as $$
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

-- 9) Seed minimal idempotent (3 chemins de base) -----------------------------
insert into public.discipulat_chemins (slug, titre, description, cible_stage, niveau, ordre) values
  ('nouvelle-naissance', 'Nouvelle Naissance', 'Premiers pas du nouveau converti.', 'disciple', 1, 0),
  ('affermissement',     'Affermissement',     'Fondations de la foi et vie de prière.', 'membre', 2, 1),
  ('ecole-leaders',      'École de Leaders',   'Formation au service et au leadership.', 'serviteur', 4, 2)
on conflict (slug) do nothing;
```
</details>

## Cartographie Mondiale — Carte interactive d'expansion territoriale (Centre de Commandement Apostolique V4)
**Réutilise :**
- profiles (pays, ville, role, antenne_id, membre_statut, score_engagement, created_at) — source membres déjà agrégée par /api/admin/cartographie
- antennes (pays, ville, fuseau, devise, responsable_id, parent_id, actif) + seed Abidjan/Canada/Europe — on les place sur la carte sans recréer la table
- src/lib/nation-stats.ts (countIn count:'exact',head:true, scope par pays) — pattern d'agrégat réutilisé pour la croissance par territoire
- src/lib/flags.ts (flagOf) — drapeaux des nations déjà mappés
- src/app/api/admin/cartographie/route.ts existant — réécrit en lecteur d'une RPC SQL agrégée (plus de scan profiles en mémoire)
- src/lib/admin-auth.ts (isAdminRequest) + cookie cier_admin — garde back-office
- src/lib/rate-limit.ts (rateLimit/clientIp) — anti-abus sur l'écriture des zones cibles
- src/lib/pastoral-intelligence.ts (paliers engagement) — réutilisé pour la heatmap d'engagement régional
- groupes (familles/cellules) — comptage déjà présent dans la route actuelle
- RPC pattern chapelle.admin_dashboard (jsonb_build_object, security definer, search_path) — modèle pour la nouvelle RPC carto
- dons (antenne_id, devise FCFA) — croissance financière par territoire
- AdminSidebar NAV_ITEMS (entrée Cartographie déjà présente) + cockpit /admin/gouvernement

### Architecture
## Vue d'ensemble

Le module transforme la liste actuelle (pays→villes→familles) en **carte mondiale interactive** pilotable depuis le cockpit, sans jamais dupliquer de données : la géographie réelle (lat/lng) est attachée aux entités déjà existantes (`antennes` et un **référentiel léger de localités**), tandis que les volumes (membres, responsables, dons, engagement) restent calculés à la volée par agrégat SQL sur `profiles`/`dons`.

### Composants

1. **Référentiel géo additif** — table `geo_localites` (couple pays/ville → lat/lng + code ISO), peuplée par seed + géocodage paresseux côté serveur. C'est le SEUL nouvel objet « données ». On ajoute aussi `antennes.lat/lng/rayon_km` (additif) pour épingler chaque antenne.
2. **Table d'expansion** `expansion_zones` (zones cibles, implantations en cours, statut prospect→implantée). C'est l'apport stratégique du module.
3. **RPC d'agrégation** `public.cartographie_monde(p_scope_pays)` (security definer) : renvoie en UN aller-retour, sans PII, les nations géocodées avec membres/responsables/familles/dons + indice d'engagement + tendance de croissance (30/90 j).
4. **API** `/api/admin/cartographie` (réécrite, lit la RPC) + `/api/admin/cartographie/expansion` (CRUD zones cibles).
5. **Couche carte client** : `react-simple-maps` (TopoJSON monde, ~0 dépendance lourde, SSR-safe via dynamic import) — markers proportionnels (membres), choropleth pays (heatmap engagement), épingles antennes, halos zones cibles.
6. **Intégration cockpit** : la page `/admin/cartographie` devient l'onglet « Monde » ; un mini-widget carte est exposable dans `/admin/gouvernement`.

### Flux de données

```
profiles.pays/ville  ─┐
dons.antenne_id      ─┼─►  RPC cartographie_monde() ──► /api/admin/cartographie ──► <WorldMap/>
antennes(lat,lng)    ─┤        (jsonb agrégé)              (isAdminRequest)         (choropleth + markers)
geo_localites(lat,lng)┘
expansion_zones ──────────►  /api/admin/cartographie/expansion (CRUD)  ──► couche « implantations »
```

La RPC fait toute l'agrégation (jamais en JS) → tient à 100k. Le client ne reçoit qu'un JSON déjà roulé-up par nation/ville.

### APIs
- `GET /api/admin/cartographie` — Carte mondiale agrégée via RPC cartographie_monde (nations géocodées + markers + heatmap engagement + antennes + zones cibles). Garde isAdminRequest, scope ?pays optionnel.
- `GET /api/admin/cartographie/expansion` — Liste complète des zones d'expansion (prospects/en_cours/implantées) pour la vue stratégique back-office.
- `POST /api/admin/cartographie/expansion` — Crée/met à jour une zone cible (sanitize whitelist, slugify, rateLimit par IP). Service role.
- `DELETE /api/admin/cartographie/expansion?id=` — Désactive (actif=false) une zone d'expansion (soft delete).

### Sécurité
RLS : geo_localites et expansion_zones ont `enable row level security` ; SELECT anon/authenticated limité à actif=true (et statut='implantee' pour expansion → les prospects ne fuient JAMAIS au public). Écriture exclusivement service role. La RPC `cartographie_monde` est `security definer` avec `revoke ... from anon, authenticated` : seul supabaseAdmin (service role, server-only) peut l'appeler — aucune exposition directe. RBAC : la route admin est gardée par isAdminRequest (cookie cier_admin). Pour le scope antenne/nation côté serveur, on étend en lisant le profil appelant : un nation_pastor/responsable ne voit que son pays (paramètre p_scope_pays forcé serveur via nation_responsables, jamais piloté librement par le client — calqué sur /api/admin/nation vs /api/member/nation). PII : la RPC ne renvoie que des AGRÉGATS (count, avg) — aucune ligne nominative, aucun email/nom. Rate-limit (rate-limit.ts + clientIp) sur POST /expansion (ex. 20 req/min) contre l'abus. sanitize() avec whitelist stricte (nom, pays, ville, lat, lng, statut, priorite, objectif_membres, notes) avant tout insert/update ; slugify(nom) pour le slug. Lat/lng validés numériquement et bornés [-90..90]/[-180..180] côté serveur. Toute action d'écriture sur les zones est traçable via activity_logs (action_type 'expansion_update') et sensitive_access_logs si scope nation consulté.

### Scalabilité (100 000 membres)
À 100 000 membres, AUCUNE agrégation en JS : tout est roulé-up par la RPC `cartographie_monde` (un seul aller-retour réseau, group by pays). Index : idx_profiles_pays_statut (existant, sert le group by/filtre pays), idx_profiles_created (existant, fenêtres 30/90 j), idx_antennes_geo, idx_geo_localites_pays (lower(pays)), idx_expansion_statut partiel. Le join profiles↔geo_localites se fait sur lower(pays) (centroïde, ~20 lignes) → négligeable. La sortie est bornée par le nombre de NATIONS (~quelques dizaines), pas par le nombre de membres → payload constant ~10-50 KB même à 100k. Pas de pagination nécessaire (granularité nation/antenne) ; le drill-down ville charge à la demande via p_scope_pays. Cache : la RPC est `stable` ; on peut ajouter un cache HTTP court (Cache-Control s-maxage 60) ou un revalidate côté route — la carte n'a pas besoin de temps réel à la seconde. Le géocodage des nouvelles villes se fait en arrière-plan (insert geo_localites source='geocode'), jamais sur le chemin de lecture. Realtime non requis ici (vue stratégique) — on s'appuie sur le rafraîchissement périodique du cockpit.

### UX/UI
Page /admin/cartographie réécrite en onglet « Monde » du cockpit, dans la charte cinématographique existante (bg-abyss, card-cinematic, font-cinzel/inter, cinematic-gold). Composant <WorldMap/> client : react-simple-maps importé en dynamic (ssr:false) pour rester SSR-safe. Couches superposables (toggles) : (1) Choropleth heatmap — pays teintés selon engagement_moyen (gradient froid→or) ; (2) Markers proportionnels — bulle dont le rayon ∝ membres, click → drill-down ville (fetch ?pays=) ; (3) Épingles antennes (icône Crown dorée) avec popover nom/devise/membres ; (4) Halos pulsants pour expansion_zones (prospect=gris, en_cours=ambre, implantée=vert). Bandeau KPI réutilisant le composant Kpi existant : Nations, Membres, Antennes, Zones cibles, Nouveaux 30 j. Panneau latéral « Expansion territoriale » listant les zones cibles triées par priorité + bouton admin « Nouvelle zone cible » (modal POST). Sous la carte, on conserve la liste pays→villes existante (accordéon flagOf) comme repli accessible/SEO et pour les territoires non géocodés. Mini-widget <WorldMapMini/> embarquable dans /admin/gouvernement (vue monde du cockpit unique). Vue membre : aucune (module stratégique), sauf éventuelle carte publique « Nos antennes » limitée aux antennes actif=true (déjà autorisé par RLS).

### Cas d'usage pastoraux
- Le Super Admin ouvre la vue Monde et voit en un coup d'œil les bulles de membres : la diaspora (Canada, France) grossit, signal pour renforcer les antennes existantes.
- La heatmap d'engagement révèle un pays à fort effectif mais engagement_moyen faible → déclenche une campagne de relance pastorale ciblée (réutilise pastoral-intelligence).
- Un nation_pastor consulte sa carte limitée à son pays (scope serveur) pour répartir les responsables ville par ville (responsables/membres par localité).
- L'équipe stratégique crée des zones cibles (ex. Dakar, Lagos) en statut prospect, suit la bascule prospect→en_cours→implantée, et mesure l'atteinte de objectif_membres.
- Le taux croissance_30j par territoire identifie les nations en accélération pour y prioriser formations et événements.
- Repérage des villes avec membres mais 0 responsable → besoin urgent de nommer un berger local.
- Vue antennes sur carte avec membres rattachés → équilibrage des charges pastorales et détection des antennes sous-staffées.

### Lacunes restantes
- Pas de géocodeur réel branché : geo_localites n'a que des centroïdes pays seedés ; les villes saisies librement dans profiles.ville ne sont pas géolocalisées (job de géocodage Nominatim/Mapbox à ajouter, en arrière-plan).
- profiles.ville/pays sont en texte libre (orthographe variable, ex. 'Cote d Ivoire' vs 'Côte d'Ivoire') → besoin d'une normalisation/référentiel pays-ISO pour fiabiliser le join (table pays canonique ou mapping).
- Aucune dépendance carte installée : react-simple-maps + topojson-client à ajouter au package.json, plus le fichier TopoJSON monde dans /public.
- Scope nation côté serveur (nation_pastor) à câbler concrètement via nation_responsables dans la route (actuellement scope=?pays libre, à restreindre selon le rôle appelant).
- Pas encore d'historisation de la croissance (snapshots mensuels par territoire) pour des courbes de tendance long terme — table geo_snapshots à envisager en V4.1.
- Heatmap basée sur score_engagement : vérifier que cette colonne est bien alimentée pour tous les membres (sinon avg biaisé vers 0).
- Pas de cache applicatif : ajouter revalidate/Cache-Control si la RPC est appelée fréquemment depuis le cockpit.

<details><summary>SQL du module (référence)</summary>

```sql
-- ============================================================================
-- CARTOGRAPHIE MONDIALE — géolocalisation réelle, expansion, heatmap engagement
-- Additif & idempotent. Réutilise profiles / antennes / dons / groupes.
-- Ne recrée AUCUNE table existante : étend antennes + ajoute geo_localites +
-- expansion_zones, et une RPC d'agrégation (zéro scan JS).
-- Timestamp > 20260602270000.
-- ============================================================================

-- 1) Géolocalisation des antennes (additif) -----------------------------------
alter table public.antennes add column if not exists lat       double precision;
alter table public.antennes add column if not exists lng       double precision;
alter table public.antennes add column if not exists rayon_km  integer not null default 25; -- zone de couverture
create index if not exists idx_antennes_geo on public.antennes (lat, lng);

-- Géocodage des antennes connues (idempotent, ne touche que si null).
update public.antennes set lat = 5.3599517,  lng = -4.0082563 where slug = 'abidjan' and lat is null;
update public.antennes set lat = 45.5018869, lng = -73.567256 where slug = 'canada'  and lat is null;
update public.antennes set lat = 48.856614,  lng = 2.3522219  where slug = 'europe'  and lat is null;

-- 2) Référentiel léger de localités (pays/ville → coordonnées) -----------------
create table if not exists public.geo_localites (
  id          uuid        primary key default gen_random_uuid(),
  pays        text        not null,                 -- nom FR tel que saisi dans profiles.pays
  ville       text,                                 -- null = centroïde pays
  code_iso2   text,                                 -- ex 'CI','CA','FR'
  lat         double precision not null,
  lng         double precision not null,
  source      text        not null default 'seed',  -- seed | geocode | manuel
  actif       boolean     not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists uq_geo_localites_pays_ville
  on public.geo_localites (lower(pays), lower(coalesce(ville, '')));
create index if not exists idx_geo_localites_pays on public.geo_localites (lower(pays));
alter table public.geo_localites enable row level security;
drop policy if exists geo_localites_read on public.geo_localites;
create policy geo_localites_read on public.geo_localites for select to anon, authenticated using (actif = true);
-- Écriture : service role uniquement (géocodage serveur).

-- Centroïdes des nations prioritaires de la Chapelle (diaspora + Afrique).
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

-- 3) Expansion territoriale (zones cibles / implantations en cours) -----------
create table if not exists public.expansion_zones (
  id             uuid        primary key default gen_random_uuid(),
  nom            text        not null,
  slug           text        unique,
  pays           text        not null,
  ville          text,
  lat            double precision,
  lng            double precision,
  statut         text        not null default 'prospect',  -- prospect|en_cours|implantee|suspendue
  priorite       text        not null default 'moyenne',    -- haute|moyenne|basse
  objectif_membres integer,
  antenne_id     uuid        references public.antennes(id) on delete set null, -- antenne pilote
  responsable_id uuid        references public.profiles(id) on delete set null,
  notes          text,
  actif          boolean     not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists idx_expansion_statut on public.expansion_zones (statut) where actif;
create index if not exists idx_expansion_pays   on public.expansion_zones (lower(pays));
create index if not exists idx_expansion_geo     on public.expansion_zones (lat, lng);
alter table public.expansion_zones enable row level security;
drop policy if exists expansion_read on public.expansion_zones;
create policy expansion_read on public.expansion_zones for select to anon, authenticated using (actif = true and statut = 'implantee');
-- Vue stratégique complète (prospects/en_cours) = service role (back-office) uniquement.

-- 4) RPC d'agrégation monde (1 aller-retour, sans PII, scope optionnel) --------
create or replace function public.cartographie_monde(p_scope_pays text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare j jsonb;
begin
  select jsonb_build_object(
    'nations', (
      select coalesce(jsonb_agg(t order by t.membres desc), '[]'::jsonb) from (
        select
          coalesce(nullif(trim(p.pays), ''), 'Non renseigné')                      as pays,
          g.code_iso2,
          g.lat, g.lng,
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
comment on function public.cartographie_monde(text) is
  'Cartographie mondiale agrégée (nations géocodées, antennes, zones d''expansion) — sans PII, service role.';
```
</details>

## Centre de Commandement Apostolique (cockpit unifiant — orchestration transverse Membres / Antennes / Discipulat / Finances / Marketplace / Formations / Prières / Événements)
**Réutilise :**
- pastoral-intelligence.ts (engagementLevel 6 paliers, conversionStage Visiteur→Leader, memberAlerts, MemberIntel) — réutilisé tel quel pour la santé spirituelle agrégée du cockpit
- pastoral-prediction.ts (churnRisk, needsFollowUp, RISK_META) — file de suivi prioritaire consolidée
- nation-stats.ts (pattern countIn avec count:'exact',head:true ; nationStats / listNations) — base d'agrégation par pays, étendu au scope antenne
- Table antennes (hiérarchie parent_id, responsable_id, pays, ville, devise) + profiles.antenne_id / evenements.antenne_id / dons.antenne_id DÉJÀ présents — colonne de partitionnement du cockpit
- nation_responsables (user_id, pays, role) + user_role enum (super_admin, nation_pastor, platform_admin) — résolution de portée serveur
- sensitive_access_logs — journalisation des consultations du cockpit (déjà utilisé par /api/admin/nation)
- admin-auth.ts (isAdminRequest) + roles.ts (ADMIN_ROLES, isAdmin) — garde d'accès
- dons (montant, devise='FCFA', statut='complete', antenne_id, date_creation, meta json) ; product_purchases ; inscriptions_formation ; priere_demandes ; event_registrations ; analytics_sessions/events ; app_notifications + notify() — sources brutes des tuiles KPI
- Index composites de 20260602250000_scale_indexes.sql (idx_dons_statut_devise, idx_profiles_pays_statut, idx_asess_lastseen_pays…) — déjà en place pour les agrégats
- supabase.ts (supabaseAdmin BYPASS RLS, IS_DEMO_MODE) ; rate-limit.ts (rateLimit/clientIp) ; route conventions runtime=nodejs/dynamic=force-dynamic
- Cockpit existant /admin/gouvernement (modules croissance/santé/formation/prière/finance/mission) — le Command Center le coiffe avec le sélecteur de contexte (global/nation/antenne) et la portée RBAC imposée serveur

### Architecture
## Principe
Le Centre de Commandement N'EST PAS un 7e silo : c'est la **couche d'orchestration** qui se branche sur les agrégats existants et impose UNE portée (global / nation / antenne) résolue côté serveur selon le rôle de l'opérateur.

## Composants
1. **command-center.ts (lib PURE)** — calcul des KPIs transverses et de la portée. Aucune I/O : prend des compteurs bruts + le scope, renvoie tuiles KPI normalisées, deltas, alertes consolidées. Réutilise les types/fonctions de pastoral-intelligence et pastoral-prediction.
2. **command-scope.ts (lib service-role)** — `import 'server-only'`. Résout la PORTÉE autorisée : à partir du rôle (`profiles.role`) + affectations (`nation_responsables`, `antennes.responsable_id`), retourne `{ kind:'global'|'nation'|'antenne', paysAllowed:string[]|null, antenneIdsAllowed:string[]|null }`. La hiérarchie `antennes.parent_id` est descendue (une antenne mère voit ses filles).
3. **RPC SQL `command_center_kpis(scope_pays, scope_antennes)`** — agrégation SET-BASED en base (pas de N+1, pas de fetch 100k lignes en mémoire). Renvoie une ligne JSON de compteurs : membres, nouveaux 30j, dons par devise, prières en attente, formations actives, événements à venir, achats marketplace, connectés temps réel.
4. **Vue matérialisée `mv_command_center_daily`** — pré-agrégat quotidien par antenne/pays pour les courbes de tendance (rafraîchie par cron/webhook). Évite de scanner l'historique à chaque ouverture du cockpit.
5. **Route `/api/admin/command-center`** — garde admin, résout le scope, applique le filtre `context` demandé (mais BORNÉ à ce que le scope autorise), appelle la RPC, fusionne avec l'intelligence pastorale, journalise l'accès, renvoie `{ ok, scope, contexts, kpis, alertes, flux, actions }`.
6. **Page `/admin/command-center` (cockpit)** — sélecteur de contexte, grille de tuiles KPI, panneau alertes consolidées, flux temps réel (Realtime app_notifications), actions rapides.

## Flux de données
UI cockpit → GET `/api/admin/command-center?context=antenne:abidjan`
→ `resolveScope(operatorId)` (RBAC serveur) → intersection avec `context` demandé
→ RPC `command_center_kpis(paysAllowed, antenneIdsAllowed)` (agrégats SQL)
→ `buildKpiTiles()` (lib pure) + `consolidateAlerts()` (réutilise memberAlerts/churnRisk sur l'échantillon prioritaire borné)
→ JSON → tuiles + alertes + flux. Le flux temps réel est poussé séparément par Supabase Realtime sur `app_notifications` filtré par antenne_id.

## Intégration au cockpit unique
Le Command Center devient l'écran d'atterrissage `/admin` (au-dessus de gouvernement, nation-dashboard, dons, marketplace…) : chaque tuile est un lien profond vers le module silo concerné, pré-filtré par le contexte actif. Le sélecteur de contexte est persisté (cookie `cc_context`) et propagé en query string aux modules.

### APIs
- `GET /api/admin/command-center` — Cockpit unifié : résout la portée RBAC serveur, applique le contexte demandé (global/nation/antenne) borné au scope autorisé, appelle la RPC command_center_kpis, fusionne avec l'intelligence pastorale (alertes/churn consolidés), journalise l'accès. Renvoie { ok, scope, contexts, kpis, alertes, flux, actions }.
- `GET /api/admin/command-center/contexts` — Liste les contextes sélectionnables par l'opérateur courant (global si super_admin ; sinon ses nations via nation_responsables et ses antennes via antennes.responsable_id + descendants parent_id). Alimente le sélecteur de contexte.
- `POST /api/admin/command-center/prefs` — Enregistre les préférences cockpit (contexte par défaut, ordre/visibilité des tuiles) dans command_center_prefs. sanitize() whitelist { contexte, tuiles }, rateLimit par IP.
- `POST /api/admin/command-center/refresh` — Déclenche refresh_command_center_daily (RPC) pour rafraîchir la vue matérialisée des tendances. Idempotent, rate-limité, réservé au scope global.

### Sécurité
## RBAC unifiée — portée IMPOSÉE CÔTÉ SERVEUR
- Garde d'entrée : `isAdminRequest(req)` (cookie admin) sur toutes les routes /api/admin/command-center*.
- `command-scope.ts` (`import 'server-only'`) est la SOURCE UNIQUE de la portée. Il lit le rôle de l'opérateur et ses affectations :
  - `super_admin` / `platform_admin` → `{ kind:'global', paysAllowed:null, antenneIdsAllowed:null }` (tout).
  - `nation_pastor` → `paysAllowed` = ses pays dans `nation_responsables` ; `antenneIdsAllowed` = antennes de ces pays.
  - responsable d'antenne (`antennes.responsable_id = user`) → `antenneIdsAllowed` = son antenne + descendants via `parent_id` (récursif borné).
  - responsables de centres (intercession/discipulat) → portée fonctionnelle restreinte (tuiles prières/discipulat uniquement).
- `clampContext()` + `contextToFilters()` rejettent tout contexte hors portée : un `nation_pastor` qui force `?context=nation:FR` se voit ramené à sa propre nation. Le filtre passé à la RPC est TOUJOURS l'intersection portée∩demande, jamais la demande brute.
- La RPC `command_center_kpis` est `security definer` mais `revoke all ... from public/anon/authenticated` : appelable seulement par le service role (donc seulement après la garde admin + résolution de scope). `supabaseAdmin` BYPASS RLS — réservé au serveur.
- **Données sensibles** : le cockpit n'agrège que des COMPTAGES. Il ne lit jamais le CONTENU des prières, cure d'âme, délivrance (cohérent avec gouvernement). La file de suivi expose nom + score, pas le motif pastoral.
- **Logs** : chaque ouverture insère dans `sensitive_access_logs` (role, scope_pays=contexte, action='command_center_view').
- **Rate-limit** : POST /prefs et /refresh utilisent `rateLimit(clientIp(req), …)`. /refresh réservé au scope global.
- **Écriture** : `command_center_prefs` en service role uniquement (RLS SELECT own pour le membre), sanitize() whitelist `{ contexte, tuiles }`.

### Scalabilité (100 000 membres)
## Tenue à 100 000 membres
- **Agrégation SET-BASED en base (RPC `command_center_kpis`)** : un seul aller-retour SQL au lieu du pattern actuel de gouvernement (fetch jusqu'à 5 000 profils + 20 000 sessions + 40 000 events en mémoire Node). À 100k membres, l'approche en mémoire devient intenable ; la RPC laisse Postgres faire les `count(*)` sur index.
- **Index dédiés** : idx_dons_antenne_statut, idx_profiles_antenne_statut, idx_evenements_antenne (nouveaux) + les composites existants (idx_dons_statut_devise, idx_profiles_pays_statut, idx_asess_lastseen_pays). Tous les filtres de la RPC tombent sur un index.
- **Vue matérialisée `mv_command_center_daily`** : pré-agrégat des nouveaux membres/jour par antenne/pays sur 400 j pour les courbes de tendance, rafraîchie `concurrently` par cron (pas de scan d'historique à chaque ouverture, pas de lock lecture).
- **Cache** : réponse cockpit cachée par contexte (clé `cc:<contexte>`) avec TTL court (30–60 s) côté serveur, suffisant car les KPI sont des compteurs ; la présence temps réel est gérée par Realtime, pas par re-fetch.
- **Pagination** : les listes profondes (file de suivi, top membres) restent dans les modules silo paginés ; le cockpit ne renvoie que des agrégats + un échantillon borné (≤60 items) pour les alertes.
- **Pas de N+1** : aucune boucle de requêtes ; les top-formations/top-pays sont calculés par `group by` SQL, pas par requête par entité.
- **Realtime** : abonnement `app_notifications` filtré par `antenne_id` (le flux n'écoute que la portée active), évitant un firehose global.

### UX/UI
## Cockpit /admin/command-center (écran d'atterrissage du back-office)
**En-tête — sélecteur de contexte** : segmenté `Global · Nation ▾ · Antenne ▾`. Les options sont peuplées par /contexts (seulement ce que la portée autorise — un responsable d'antenne ne voit QUE son antenne). Contexte persisté en cookie `cc_context`.

**Grille de tuiles KPI** (composant `KpiTile`, réutilisant le style des cartes de gouvernement) : Membres · Nouveaux 30 j · Connectés (temps réel) · Dons (par devise, jamais sommés) · Prières en attente · Formations actives · Événements à venir · Achats marketplace. Chaque tuile a un `tone` (positif/neutre/attention) et est un **lien profond** vers le module silo, pré-filtré par le contexte (`href` déjà suffixé `?context=`).

**Panneau alertes pastorales consolidées** : agrège memberAlerts + churnRisk (réutilisés tels quels), triés par sévérité, bornés à 80, scopés au contexte. Chaque alerte → action rapide (assigner, contacter).

**Flux temps réel** : colonne latérale abonnée à Supabase Realtime sur `app_notifications` (filtré antenne_id) — dons reçus, nouvelles inscriptions, prières urgentes, achats.

**Actions rapides** : barre de boutons (Nouvelle annonce, Affecter une prière, Voir nation, Rafraîchir tendances) — chaque action route vers le module compétent avec le contexte.

**Côté membre** : pas d'écran membre dédié (cockpit = admin). L'impact membre est indirect (meilleure réactivité pastorale). Une mini-tuile « Ma nation » peut réutiliser /api/member/nation existant pour les responsables locaux.

**Intégration cockpit unique** : remplace/coiffe le dashboard /admin comme point d'entrée ; gouvernement, nation-dashboard, dons, marketplace deviennent des vues de détail accessibles depuis les tuiles, déjà filtrées.

### Cas d'usage pastoraux
- Le Super Admin ouvre le cockpit en 'Global', voit d'un coup les dons FCFA/EUR/CAD séparés par devise, les prières en attente toutes nations, et 12 membres en risque critique — puis bascule sur 'Nation: CI' pour zoomer sans changer d'écran.
- Le pasteur de nation Canada (nation_pastor) se connecte : il ne voit QUE le Canada (portée imposée serveur) ; s'il tente de forcer ?context=nation:FR, le cockpit le ramène au Canada. Il repère 5 nouveaux inscrits 30 j non encore en parcours et lance une relance.
- Le responsable de l'antenne Abidjan voit ses KPI d'antenne (membres, dons antenne_id, événements locaux), clique la tuile Prières → arrive sur /admin/prieres déjà filtré sur son antenne pour assigner les demandes sans suivi.
- Une alerte consolidée 'pays à mobiliser' (≥40% des membres à risque) remonte au cockpit ; le pasteur national déclenche une campagne via l'action rapide qui ouvre /admin/newsletter pré-scopé.
- Le flux temps réel affiche un don entrant et une nouvelle demande de prière urgente pendant un live ; l'intercesseur de garde l'assigne en un clic sans quitter le cockpit.
- Le responsable du centre d'intercession a une portée fonctionnelle restreinte : son cockpit n'expose que les tuiles Prières/Discipulat de sa zone, pas les finances.

### Lacunes restantes
- command-scope.ts (résolution de portée serveur) n'existe pas encore : il faut le créer en réutilisant nation_responsables + antennes.responsable_id + descente récursive parent_id. C'est la pièce RBAC centrale à écrire.
- L'enum user_role n'a pas de rôle 'responsable_antenne' dédié : le rattachement responsable↔antenne passe aujourd'hui par antennes.responsable_id uniquement. Ajouter éventuellement une table antenne_responsables (many-to-many) si une antenne a plusieurs co-responsables.
- Pas de mécanisme de cron en place pour refresh_command_center_daily : prévoir un déclencheur (CronCreate ou webhook après inscription) — sinon les courbes de tendance se figent.
- Le cockpit gouvernement fait encore ses agrégats en mémoire (fetch jusqu'à 5000 profils) ; il faudra migrer ses 6 modules vers des RPC SQL analogues pour tenir 100k — la RPC command_center_kpis pose le patron mais ne couvre pas encore croissance détaillée / churn agrégés en SQL.
- Le filtrage temps réel app_notifications par antenne_id suppose que app_notifications porte une colonne antenne_id (ou un payload exploitable) : à vérifier/ajouter dans la migration realtime existante.
- Pas de couche de cache serveur (Redis/mémoire) formalisée pour les réponses cockpit ; le rate-limit actuel est mono-processus (PlanetHoster Passenger) — à brancher sur un store partagé en multi-instances.
- La RPC scope par pays sur les dons utilise user_id ∈ profils du scope, ce qui ignore dons.antenne_id quand le scope est 'nation' sans antennes : à arbitrer (un don rattaché à une antenne d'un autre pays mais fait par un membre du pays).

<details><summary>SQL du module (référence)</summary>

```sql
-- ============================================================================
-- CENTRE DE COMMANDEMENT APOSTOLIQUE — agrégation transverse multi-portée
-- ----------------------------------------------------------------------------
-- Additif & idempotent. NE recrée RIEN d'existant (antennes, dons, profiles,
-- nation_responsables, scale_indexes sont déjà en place). Ajoute :
--   1) une table de config cockpit (tuiles épinglées par opérateur),
--   2) des index manquants pour le partitionnement par antenne,
--   3) une RPC d'agrégation SET-BASED (zéro N+1) bornée par scope,
--   4) une vue matérialisée de tendance quotidienne par antenne/pays.
-- ============================================================================

-- 1) Préférences de cockpit par opérateur (tuiles épinglées, contexte par défaut).
create table if not exists public.command_center_prefs (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  contexte      text,                                   -- 'global' | 'nation:CI' | 'antenne:<slug>'
  tuiles        jsonb       not null default '[]'::jsonb, -- ordre/visibilité des KPI
  actif         boolean     not null default true,
  created_at    timestamptz not null default now(),
  unique (user_id)
);
create index if not exists idx_cc_prefs_user on public.command_center_prefs (user_id);
alter table public.command_center_prefs enable row level security;
drop policy if exists cc_prefs_select_own on public.command_center_prefs;
create policy cc_prefs_select_own on public.command_center_prefs for select
  to authenticated using (user_id = auth.uid());
-- Écriture via service role (back-office). Commentaire : config cockpit, non sensible.

-- 2) Index manquants pour le partitionnement par antenne (scale 100k).
create index if not exists idx_dons_antenne_statut on public.dons (antenne_id, statut);
create index if not exists idx_profiles_antenne_statut on public.profiles (antenne_id, membre_statut);
create index if not exists idx_evenements_antenne on public.evenements (antenne_id);

-- 3) RPC d'agrégation transverse, bornée par scope (NULL = toutes nations/antennes).
--    SET-BASED : un seul aller-retour, pas de fetch de 100k lignes côté Node.
create or replace function public.command_center_kpis(
  scope_pays      text[] default null,   -- pays autorisés (nation_pastor) ; null = tous
  scope_antennes  uuid[] default null    -- antennes autorisées ; null = toutes
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with bornes as (
    select (now() - interval '30 days') as d30,
           (now() - interval '90 seconds') as donline,
           date_trunc('day', now()) as djour
  ),
  prof as (
    select p.* from public.profiles p, bornes b
    where (scope_pays is null or upper(p.pays) = any (select upper(x) from unnest(scope_pays) x))
      and (scope_antennes is null or p.antenne_id = any (scope_antennes))
  ),
  dons_ok as (
    select d.devise, d.montant from public.dons d, bornes b
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
                                 and (scope_pays is null or upper(pr.pays) = any (select upper(x) from unnest(scope_pays) x))),
    'formations_actives',   (select count(*) from public.inscriptions_formation i
                               where i.user_id in (select id from prof) and lower(coalesce(i.statut,'')) <> 'abandonne'),
    'evenements_a_venir',   (select count(*) from public.evenements e
                               where (scope_antennes is null or e.antenne_id = any (scope_antennes))),
    'achats_marketplace',   (select count(*) from public.product_purchases pp where lower(coalesce(pp.statut,'')) = 'complete'),
    'connectes_now',        (select count(*) from public.analytics_sessions s, bornes b
                               where s.last_seen >= b.donline
                                 and (scope_pays is null or upper(s.pays) = any (select upper(x) from unnest(scope_pays) x))),
    'visiteurs_aujourdhui', (select count(*) from public.analytics_sessions s, bornes b
                               where s.last_seen >= b.djour
                                 and (scope_pays is null or upper(s.pays) = any (select upper(x) from unnest(scope_pays) x)))
  );
$$;
revoke all on function public.command_center_kpis(text[], uuid[]) from public, anon, authenticated;
-- Appelée uniquement par le service role (route back-office) — bypass RLS contrôlé.

-- 4) Vue matérialisée de tendance quotidienne par antenne/pays (courbes du cockpit).
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

-- Rafraîchissement concurrent (déclenché par cron/webhook ; sans lock lecture).
create or replace function public.refresh_command_center_daily()
returns void language sql security definer set search_path = public as $$
  refresh materialized view concurrently public.mv_command_center_daily;
$$;
revoke all on function public.refresh_command_center_daily() from public, anon, authenticated;
```
</details>
