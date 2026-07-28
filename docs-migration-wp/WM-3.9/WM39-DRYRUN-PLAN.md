# WM-3.9 — Plan de dry-run

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.9` |
| Mode | dry-run transactionnel via RPC (`p_dry_run => true`) |
| État | **en attente du déploiement humain de la RPC** |
| Paramètres réels | `private/WM39-DRYRUN-PARAMS.json` (UUID + `formation_id` — hors Git) |

---

## 1. Paramètres (anonymisés)

| Groupe | Gardien | Secondaires | Conflits de dédup (`formation_id`) |
|--------|---------|-------------|-------------------------------------|
| DG-1 | `DG-1-P2` | `DG-1-P1`, `DG-1-P3`, `DG-1-P4`, `DG-1-P5`, `DG-1-P6` | **1** |
| DG-2 | `DG-2-P1` | `DG-2-P2`, `DG-2-P3`, `DG-2-P4` | **1** |

## 2. Appels prévus (dans l'ordre)

1. `wm3_merge_duplicate_group(DG-1…, p_dry_run => true)` → attend `would_result` DG-1.
2. `wm3_merge_duplicate_group(DG-2…, p_dry_run => true)` → attend `would_result` DG-2.

Chaque appel :
- applique dédup + re-point + archivage **dans la transaction de la fonction**,
- calcule les comptes projetés,
- **annule tout** (dry-run) et retourne `would_result`,
- ne laisse **aucune** écriture.

## 3. Critères de succès du dry-run

- `would_result.secondaries_active = 0` (les 5 / 3 secondaires seraient désactivés).
- `would_result.dangling_to_secondary = 0` (aucun rattachement résiduel vers un secondaire).
- `would_result.active_in_box = 1` (un seul actif par boîte).
- Comptes = tableau attendu (`WM39-DEPLOYMENT-INSTRUCTIONS.md` §4).
- Aucune exception hors le signal de dry-run.

## 4. Après un dry-run conforme

Le dry-run **ne déclenche pas** la fusion réelle (non autorisée). Une **Décision humaine 2**
distincte sera requise pour autoriser l'exécution réelle (`p_dry_run => false`).

## 5. Interdits respectés

Dry-run uniquement (aucune persistance) · aucune fusion réelle · UUID/PII hors Git.
