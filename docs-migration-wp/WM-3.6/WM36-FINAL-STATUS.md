# WM-3.6 — Statut final

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.6` |
| Branche | `stabilisation-p0-recette-citadelle` |
| Commit de référence | `f369f0fa8304c4dce09da697c1a925230783b3dd` |
| Objet | Exécution contrôlée de la fusion R1 (plan WM-3.4) |
| Écritures production | **0** |
| Verdict | **`WM36_EXECUTION_BLOCKED_PRECHECK`** |

---

## 1. Pourquoi bloqué (avant toute écriture)

| # | Cause | Type |
|---|-------|------|
| A | **Aucune transaction atomique disponible** — pas de connexion Postgres directe / `psql` / `psycopg` / `node-pg` ; PostgREST auto-commit ; RPC = migration de schéma **interdite** | environnemental (dur) |
| B | **Pré-check `C4` en échec** — le gardien DG-1 retenu (`DG-1-P2` au lieu de `DG-1-P3`) crée un conflit `inscriptions_formation` **absent du plan validé WM-3.4** → re-validation requise | dérive du plan |

Conformément à la mission (« si un seul contrôle échoue, arrêter immédiatement sans modification »)
et à l'exigence d'atomicité, **aucune écriture n'a été émise**.

## 2. Ce qui a été fait (lecture seule)

| Étape | État |
|-------|------|
| Re-vérification identités (10 UUID actifs) | ✅ |
| Snapshot pré-fusion (7 fichiers, 10 profils + rattachements) | ✅ produit |
| Intégrité snapshot + SHA-256 | ✅ vérifiée |
| Pré-contrôles C1, C2, C3, C5 | ✅ PASS |
| Pré-contrôle C4 | ⚠️ FAIL |
| Écriture / fusion / désactivation | ⛔ non émise (0) |

## 3. Livrables (`docs-migration-wp/WM-3.6/`)

`WM36-HUMAN-VALIDATIONS-RECORDED.md`, `WM36-PRE-MERGE-SNAPSHOT-REPORT.md`, `WM36-EXECUTION-LOG.md`,
`WM36-DG1-MERGE-RESULT.md`, `WM36-DG2-MERGE-RESULT.md`, `WM36-POST-MERGE-CONTROLS.md`,
`WM36-PRE-ID-03-REEVALUATION.md`, `WM36-ROLLBACK-STATUS.md`, `WM36-IMPACT-ON-WM4.md`,
`WM36-FINAL-STATUS.md`, `manifests/` — + `private/backup-premerge-20260726/` (**non commité**).

## 4. Marqueurs

| Marqueur | État |
|----------|------|
| `WM36_EXECUTION_BLOCKED_PRECHECK` | **émis** |
| `WM36_R1_MERGE_EXECUTED_AND_PRE_ID_03_PASS` | non émis |
| `WM36_EXECUTION_ROLLED_BACK` | non émis (aucune écriture, aucun rollback) |
| `PRE-ID-03` | **FAIL** |
| WM-4 | **NO-GO** |
| `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` | **interdit** |

## 5. Reprise (2 conditions)

1. **Chemin transactionnel** : fournir une connexion Postgres directe (`DATABASE_URL`/`DIRECT_URL`)
   **ou** autoriser explicitement une RPC transactionnelle ponctuelle (dérogation à « aucune migration »).
2. **Re-validation DG-1** : valider le plan avec gardien `DG-1-P2` incluant la dédup
   `inscriptions_formation` (1 conflit, non destructif).

## 6. Non-impact (interdits respectés)

| Contrôle | Valeur |
|----------|--------|
| `UPDATE`/`DELETE`/`PATCH` production | 0 |
| Fusion / désactivation / cumul de rôle | 0 |
| Modification hors DG-1/DG-2 | 0 |
| Migration de schéma / déploiement | non |
| PII en clair dans fichiers suivis | 0 |
| Commit / push Git | non |
| Fichiers Chapelle Home / Offline hors périmètre | intacts |
| Lots WM-3.1→3.5 modifiés | non |

Seules écritures disque : livrables sous `docs-migration-wp/WM-3.6/` + snapshot cloisonné dans
`private/` (ignoré par Git).
