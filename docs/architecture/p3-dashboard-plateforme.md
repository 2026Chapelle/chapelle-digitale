# P3 — Dashboard Plateforme (livré)

> Cockpit lecture seule des 8 plateformes officielles. Extension d'acquis ([[regle-acquis]]) : aucune refonte, aucun nouveau moteur, **aucun nouveau RBAC, aucune nouvelle table, aucune nouvelle RPC**, JS V1.

## 8 plateformes (enum `plateforme_id` → label officiel)
`cier`→CIER · `mahanaim`→Mahanaïm · `familles-chapelle`→Familles de la Chapelle · `femmes-exceptions`→Femmes d'Exceptions · `jeunesse`→Jeunesse de la Chapelle · `cite-refuge`→Cité du Refuge · `cfic`→CFIC · `chapelle-familiale`→**Académie des Élus** *(hypothèse projet « Académie remplace Familiale »)*.

## Fichiers
**Créés** : `src/lib/platforms.ts` (référentiel + purs : `resolvePlatformScope`, `aggregatePlatformMembers`, `platformLabel`/`isValidPlatform`) · `src/lib/pastoral/platform-server.ts` (`getAllPlatformsOverview`, `getPlatformDetail`) · `src/app/api/member/plateformes/route.ts` · `src/app/(member)/member/dashboard/plateformes/page.tsx` · `src/lib/__tests__/platforms.test.ts`.
**Modifiés (additif)** : `src/components/features/member/MemberSidebar.tsx` (lien conditionnel « Dashboard Plateformes »).

## RBAC (réutilise les axes existants, zéro nouveau)
`resolvePlatformScope({role, hasNationAssignment})` → `all` (admin/super_admin) · `nation` (responsable/pasteur national ou affectation `nation_responsables`) · `denied` (autre → **403**). National → données **bornées à son pays** (`myPays[0]`, `?pays=` ignoré) ; **national sans affectation → 403** (pas de fuite globale). Membre simple → 403.

## Données par plateforme (réutilisation)
membres + engagement moyen (**score_engagement persisté P1**) + rétention/actifs (`classifyActivity`) → `aggregatePlatformMembers` ; groupes + leaders → `groupes`/`membres_groupe` ; présence/assiduité → **`presenceOverview` (P2)** ; conversions de statut → `membre_statut_history` + `conversionsOverTime`/`topTransitions` (**purs P4**) ; alertes liées → `pastoral_alerts` ; croissance → `bucketGrowth`.

## UI
`/member/dashboard/plateformes` : vue **globale** (grille des 8 plateformes, KPIs légers) + vue **détail** (membres/groupes/leaders/engagement/présence/rétention/alertes + croissance + conversions). Lecture seule, responsive, états vides honnêtes, skeleton, zéro donnée fictive.

## Performance (V1 JS)
Bornes : `.limit(20000)` profiles/groupes, `.limit(5000)` history, `MAX_IN=5000` sur `.in()`, présence bornée (2000 réunions). Overview = ~5 requêtes + bucketing JS (pas de requête par-plateforme massive).

## Vérifications
type-check ✅ · tests **280/280** (+7 `platforms.test.ts`) ✅ · build ✅ `Compiled successfully`. QA → **GO** (réserve MEDIUM « national sans pays » corrigée → 403).

## Réserves (mineures, non bloquantes)
- Overview lit les alertes globales puis filtre en JS (léger surcoût, pas de fuite).
- Leaders bornés à 5000 groupes (sous-comptage théorique au-delà).
- Slugs `familles-chapelle` vs `chapelle-familiale` proches (état de données préexistant).
