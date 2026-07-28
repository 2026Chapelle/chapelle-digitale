# WM-3.4 — Statut final

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.4` |
| Branche | `stabilisation-p0-recette-citadelle` |
| Commit de référence | `f369f0fa8304c4dce09da697c1a925230783b3dd` |
| Périmètre | Plan de fusion R1 réversible + dry-run (lecture seule) ; R2 confirmé inchangé |
| Nature | plan + dry-run ; **aucune** mutation de production |
| Verdict | **`WM34_EXECUTION_PLAN_READY_FOR_DOUBLE_VALIDATION`** |

---

## 1. Ce qui a été produit

| Livrable | Objet |
|----------|-------|
| `WM34-HUMAN-DECISIONS-CONFIRMED.md` | décisions formelles DG-1/DG-2/R2 |
| `WM34-DG1-MERGE-PLAN.md` | plan réversible DG-1 (conditionnel) |
| `WM34-DG2-MERGE-PLAN.md` | plan réversible DG-2 (double validation) |
| `WM34-DEPENDENCY-TRANSFER-MATRIX.csv` | 12 lignes — transferts par table/groupe |
| `WM34-ROLE-CONSOLIDATION-MATRIX.csv` | 10 lignes — gardien/désactivation, aucun cumul de rôle |
| `WM34-PRE-MERGE-BACKUP-CONTRACT.md` | contrat de sauvegarde pré-fusion |
| `WM34-ROLLBACK-PLAN.md` | rollback niveau A/B |
| `WM34-DRY-RUN-REPORT.md` | dry-run complet (11 points exigés) |
| `WM34-PRE-POST-CONTROLS.md` | contrôles pré/intra/post |
| `WM34-EXECUTION-GO-CHECKLIST.md` | porte finale humaine |
| `WM34-FINAL-STATUS.md` | présent document |
| `manifests/WM34-MANIFEST.json` + `SHA256SUMS.txt` | manifeste + empreintes |
| `private/WM34-DRYRUN-RAW.json` | clés/UUID bruts — **non commité** (`**/private/`) |

## 2. Synthèse dry-run

| Groupe | Gardien | Secondaires | Transférables | Conflits uniques | Non transférables | Pertes |
|--------|---------|-------------|---------------|------------------|-------------------|--------|
| DG-1 | `DG-1-P3` (super_admin, conditionnel) | 5 | 6 | 0 | 0 | 0 |
| DG-2 | `DG-2-P1` (admin/pasteur, double validation) | 3 | 9 | 1 (dédup sans perte) | 0 | 0 |

- Conflits de rôle exécutoires : **0** (aucun cumul de privilège).
- 3 actions pastorales (DG-2) : **transférables et préservées**.
- `PRE-ID-03` : **FAIL** (aucune fusion exécutée) — passe à PASS uniquement après exécution humaine + re-sonde (contrôles C1..C5 / `POST-M-01..02`).

## 3. Marqueurs

| Marqueur | État |
|----------|------|
| `WM34_EXECUTION_PLAN_READY_FOR_DOUBLE_VALIDATION` | **émis** |
| `PRE-ID-03` | **FAIL** (plan prêt, non exécuté) |
| `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` | **interdit** |
| WM-4 | **NO-GO** |

## 4. Non-impact (interdits respectés)

| Contrôle | Valeur |
|----------|--------|
| Sonde production | **lecture seule** (GET) |
| `UPDATE`/`DELETE`/fusion/désactivation | 0 |
| Migration exécutée | non |
| Déploiement | non |
| Donnée de production modifiée | non |
| PII publiée hors `private/` | 0 (matrices pseudonymisées) |
| Commit / push Git | non |
| WM-3.1 / WM-3.2 / WM-3.3 modifiés | non |
| Fichiers hors périmètre touchés | non |

Seules écritures disque : livrables sous `docs-migration-wp/WM-3.4/` + brut cloisonné dans
`docs-migration-wp/WM-3.4/private/` (ignoré par Git).
