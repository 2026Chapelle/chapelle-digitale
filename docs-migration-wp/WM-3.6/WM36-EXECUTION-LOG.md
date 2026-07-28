# WM-3.6 — Journal d'exécution

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.6` |
| Mode | exécution contrôlée du plan WM-3.4 |
| Écritures production | **0** |
| Issue | **`WM36_EXECUTION_BLOCKED_PRECHECK`** — arrêt avant toute écriture |

---

## 1. Déroulé ordonné (conforme à la mission)

| Étape | Action | État |
|-------|--------|------|
| 1 | Re-vérifier les identifiants gardiens + secondaires (lecture seule) | ✅ fait — 10/10 UUID actifs |
| 2 | Produire le snapshot pré-fusion | ✅ fait (`WM36-PRE-MERGE-SNAPSHOT-REPORT.md`) |
| 3 | Vérifier l'intégrité + SHA-256 du snapshot | ✅ fait — intégrité confirmée |
| 4 | Exécuter les pré-contrôles C1–C5 | ⚠️ **C4 ÉCHEC** (voir §2) |
| 5 | Si un contrôle échoue → arrêter sans modification | ✅ **appliqué — arrêt** |
| 6 | Exécuter la fusion en transaction contrôlée | ⛔ **non atteint** — capacité transactionnelle absente (voir §3) |
| 7–13 | Re-point / dédup / désactivation / contrôles post | ⛔ non exécutés (0 écriture) |

## 2. Pré-contrôles C1–C5 (lecture seule)

| Contrôle | Définition | Résultat |
|----------|------------|----------|
| C1 | Identités gardiens + secondaires actives (10 UUID) | **PASS** |
| C2 | Comptes de rattachement live obtenus (recalcul nouveaux gardiens) | **PASS** |
| C3 | Snapshot produit + intégrité SHA-256 vérifiée | **PASS** |
| C4 | Seul conflit unique attendu = DG-2 `inscriptions_formation` | **FAIL** |
| C5 | Périmètre strict = 10 profils DG-1/DG-2 | **PASS** |

**C4 en échec** : le gardien DG-1 retenu (`DG-1-P2`, au lieu de `DG-1-P3` dans le dry-run validé)
introduit un **conflit `inscriptions_formation` sur DG-1** (`DG-1-P1` inscrit à la même formation que
`DG-1-P2`) **non présent dans le plan validé WM-3.4**. La réalité d'exécution diverge des chiffres
validés → re-validation du plan DG-1 requise avant toute écriture.

> Note : ce conflit est bénin (même méthode de dédup non destructive que DG-2), mais il **modifie**
> les chiffres validés. Conformément à « exécuter uniquement le plan validé WM-3.4 », l'écart impose
> une re-validation, pas une exécution silencieuse d'un plan modifié.

## 3. Blocage transactionnel (étape 6)

| Mécanisme | Disponible ? |
|-----------|--------------|
| Connexion Postgres directe (`DATABASE_URL` / `DIRECT_URL`) | **non** |
| Client `psql` / `psycopg` / `node-pg` | **non** |
| API PostgREST (service role) | oui — mais **auto-commit par requête** |
| Transaction atomique multi-requêtes | **impossible** via PostgREST |
| RPC transactionnelle | **exige une migration de schéma → INTERDITE** |

La mission (étape 6) et le plan WM-3.4 exigent une **exécution atomique dans une transaction
contrôlée**. Aucun chemin transactionnel n'est disponible sans migration de schéma interdite.
Exécuter la fusion via des `PATCH` REST auto-commit **non atomiques** exposerait la donnée
pastorale de production à un état partiel en cas d'échec intermédiaire — **non conforme** à
l'exigence d'atomicité. **Décision : ne pas écrire.**

## 4. Bilan

- **Écritures production : 0.**
- Snapshot disponible pour exécution ultérieure.
- Deux conditions à lever avant reprise : (A) fournir un chemin transactionnel (connexion Postgres
  directe **ou** autorisation explicite d'une RPC transactionnelle ponctuelle) ; (B) re-valider le
  plan DG-1 avec gardien `DG-1-P2` et son conflit de dédup.

## 5. Interdits respectés

Aucun `UPDATE`/`DELETE`/`PATCH` de production émis · aucune désactivation · aucune donnée modifiée ·
arrêt avant écriture · snapshot lecture seule uniquement.
