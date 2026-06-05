# Plan d'exécution — PRIORITÉ 4 : Exploitation de `membre_statut_history`

> Extension d'acquis ([[regle-acquis]]). JS V1 (décision validée), aucune RPC, **aucune migration** (table existante). Conversions de statuts · progression spirituelle · rétention · évolution dans le temps.

## Objectif
La table `membre_statut_history` est **écrite mais jamais agrégée**. On l'exploite pour surfacer, dans les cockpits existants, la dynamique de conversion (Visiteur→…→Berger) dans le temps + la rétention — **sans recréer** de moteur de stats.

## Acquis réutilisés
| Acquis | Rôle | Réutilisation |
|---|---|---|
| `membre_statut_history` (Ch. stabilisation) | transitions de statut | **source de lecture** (service role) |
| `bucketGrowth` / `repartition` — `src/lib/pastoral/metrics.ts` | time-series + comptages purs | base des fonctions pures P4 |
| `classifyActivity` — `metrics.ts` | actif/inactif (30 j) | calcul de rétention |
| `conversionStage` / `STAGE_META` — `pastoral-intelligence.ts` | échelle Visiteur→Leader | libellés/ordre |
| `/admin/gouvernement` (cockpit) | surface de pilotage | **enrichi** d'une carte (additif, comme P2) |

## Architecture (additive, centralisée)
```
LIB (purs, testés)   metrics.ts  → + conversionsOverTime(rows, granularity), topTransitions(rows, limit)
LIB (service)        src/lib/pastoral/statut-history-server.ts → getConversionsAnalytics({pays?, granularity?})
API                  /api/admin/conversions (admin cookie) ?pays=&granularity=
UI                   ConversionsCard (client) inséré dans /admin/gouvernement (additif)
```

## Détail
**1. Fonctions PURES (metrics.ts) — testées**
- `conversionsOverTime(rows: {nouveau_statut, created_at}[], 'month'|'week')` → `[{period, total, byStatut: Record<statut, number>}]` (réutilise le bucketing de `bucketGrowth`).
- `topTransitions(rows: {ancien_statut, nouveau_statut}[], limit)` → `[{from, to, count}]` trié décroissant (matrice de conversion condensée).

**2. Service `statut-history-server.ts`**
- `getConversionsAnalytics({pays?, granularity='month'})` :
  - lit `membre_statut_history` (borne : 12 mois / 5000 lignes) ; si `pays`, restreint aux `user_id` des `profiles.pays = pays`.
  - renvoie `{ conversions_over_time, top_transitions, total_transitions, nb_membres_progresses, retention }`.
  - **rétention** : parmi les membres ayant un historique, % encore **actifs** (`classifyActivity(profiles.derniere_connexion)`), réutilise l'acquis (pas de nouvelle définition).

**3. API `/api/admin/conversions`** (garde `isAdminRequest`) — GET `?pays=&granularity=` → `{ ok, data }`. Thin endpoint de surfacing (pas un nouveau module métier).

**4. UI `ConversionsCard`** (client autonome, même patron que `PresenceCard` de P2) inséré dans `/admin/gouvernement` :
- courbe/colonnes des conversions par mois (par statut),
- top transitions (from → to),
- KPI rétention + nb de membres ayant progressé.

## Tests
Purs : `conversionsOverTime` (bucketing, byStatut, vide), `topTransitions` (tri, agrégation, vide). I/O non testée (service).

## Risque de régression
Très faible : lectures additives sur une table déjà alimentée ; aucune signature existante modifiée ; carte cockpit isolée (composant enfant client). `bucketGrowth`/`classifyActivity` inchangés.

## Hors-scope / verrous
- ❌ Aucune migration (table existante). ❌ Aucune RPC (JS V1). ❌ Aucun nouveau moteur de stats : on réutilise `bucketGrowth`/`classifyActivity`/`conversionStage`.
- La distribution **instantanée** par statut reste l'acquis existant du cockpit (snapshot `par_statut`) — P4 ajoute uniquement la **dimension temporelle**.

## Décisions appliquées (validées)
Agrégation **JS V1**, granularité **mois** par défaut, surfacing dans le **cockpit gouvernement** (+ filtre pays = vue nationale).
