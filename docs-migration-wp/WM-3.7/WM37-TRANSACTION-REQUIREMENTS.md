# WM-3.7 — Exigences transactionnelles pour l'exécution future

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.7` |
| Objet | Définir le prérequis technique bloquant à lever avant toute exécution R1 |
| État | **non satisfait** — aucun chemin transactionnel disponible |

---

## 1. Prérequis obligatoire : atomicité

La fusion R1 touche plusieurs tables (dédup + re-point + désactivation) et **doit** être atomique :
soit tout réussit, soit rien n'est appliqué. Deux options acceptables, **l'une ou l'autre** :

### Option A — RPC PostgreSQL transactionnelle (recommandée)

Une fonction `SECURITY DEFINER` exécutant toute la fusion d'un groupe dans **une** transaction
serveur, appelée via `POST /rest/v1/rpc/...`. Elle encapsule `BEGIN`/`COMMIT` implicites de la
fonction et garantit l'atomicité.

- ⚠️ **Créer cette fonction = migration de schéma** → nécessite une **dérogation humaine explicite**
  à l'interdit « aucune migration », **limitée** à cette fonction et **révoquée** après usage.
- Avantage : pas d'exposition d'identifiants de connexion directe.

### Option B — Accès Postgres direct contrôlé

Fournir une **connexion directe** (`DIRECT_URL` / chaîne `postgres://…:5432/…`) + un client
(`psql` ou `psycopg`), permettant `BEGIN; … COMMIT;` piloté.

- Avantage : aucun objet de schéma créé.
- Exigence : identifiants fournis de façon contrôlée, non commités, révoqués après usage.

## 2. Garanties requises dans les deux cas

| Exigence | Détail |
|----------|--------|
| **Snapshot obligatoire** | capture lecture seule des lignes impactées + `SHA256SUMS`, **avant** `BEGIN` (contrat `WM-3.4/WM34-PRE-MERGE-BACKUP-CONTRACT.md`) |
| **Contrôles pré** | `C1..C5` + `PRE-M-*` tous PASS avant `BEGIN` |
| **Transaction unique par groupe** | DG-1 et DG-2 traités chacun en une transaction |
| **Contrôles intra** | comptes = dry-run, sinon `ROLLBACK` |
| **Contrôles post** | `POST-M-01/02` → `PRE-ID-03 = PASS`, sinon rollback |
| **Aucun DELETE** | désactivation par `archived_at` uniquement |
| **Aucun cumul de rôle** | gardien conserve son rôle |
| **Réversibilité** | rollback A (avant COMMIT) / B (snapshot) — `WM-3.4/WM34-ROLLBACK-PLAN.md` |

## 3. Décision attendue du décideur

- [ ] **Option A** — autoriser une RPC transactionnelle ponctuelle (dérogation « migration » limitée + révoquée), **ou**
- [ ] **Option B** — fournir un accès Postgres direct contrôlé.

Tant qu'aucune option n'est fournie : **exécution R1 impossible**, WM-4 NO-GO.

## 4. Interdits respectés

Spécification uniquement · aucune fonction créée · aucun accès ouvert · aucune écriture.
