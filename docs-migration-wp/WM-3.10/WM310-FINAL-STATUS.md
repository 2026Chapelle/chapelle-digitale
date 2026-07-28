# WM-3.10 — Statut final

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.10` |
| Branche | `stabilisation-p0-recette-citadelle` |
| Commit de référence | `f369f0fa8304c4dce09da697c1a925230783b3dd` |
| Objet | Exécution réelle contrôlée de la fusion R1 en production |
| Verdict | **`WM310_R1_MERGE_COMPLETED_PRE_ID_03_PASS_RPC_REMOVED`** ✅ |

---

## 1. Résultat

| Étape | Résultat |
|-------|----------|
| Pré-contrôles C1–C5 | ✅ tous PASS (`ALL_PRECHECKS_PASS`) |
| DG-1 réel (`p_dry_run=false`) | ✅ conforme, post-contrôles PASS |
| DG-2 réel (`p_dry_run=false`) | ✅ conforme, post-contrôles PASS |
| Contrôles post obligatoires | ✅ tous vérifiés (voir §2) |
| `PRE-ID-03` | ✅ **PASS** (0 doublon canonique actif) |
| Rollback | non requis (aucune dérive) |
| Suppression RPC | ✅ **exécutée et vérifiée** (appel → HTTP 404) |

## 2. Contrôles post-exécution (exigés) — tous satisfaits

| Contrôle | DG-1 | DG-2 |
|----------|------|------|
| 1 seul profil actif par groupe | ✅ | ✅ |
| Tous les secondaires archivés | ✅ 5/5 | ✅ 3/3 |
| 0 rattachement vers un secondaire archivé | ✅ | ✅ |
| 0 donnée métier perdue | ✅ | ✅ |
| 0 action pastorale perdue | n/a (0) | ✅ **3/3** |
| Progression maximale conservée | ✅ 14 | ✅ 33 |
| 0 conflit de rôle | ✅ | ✅ |
| `PRE-ID-03 = PASS` | ✅ (global) | |

État global : **13 profils → 5 actifs, 8 archivés** ; 5 boîtes canoniques ↔ 5 profils actifs.

## 3. Verdict complet acquis

La RPC temporaire a été **révoquée puis supprimée** (humain, éditeur SQL Supabase) et son absence
est **vérifiée** : `POST /rest/v1/rpc/wm3_merge_duplicate_group` → **HTTP 404** (fonction introuvable).
Les trois volets sont donc acquis : **fusion R1 terminée**, **`PRE-ID-03 = PASS`**, **RPC supprimée**.
Verdict final : **`WM310_R1_MERGE_COMPLETED_PRE_ID_03_PASS_RPC_REMOVED`**.

## 4. Marqueurs

| Marqueur | État |
|----------|------|
| `FUSION_R1_PRODUCTION_AUTORISÉE` | OUI (exécutée) |
| Fusion R1 | **TERMINÉE** (DG-1 + DG-2) |
| `PRE-ID-03` | **PASS** |
| Rollback | non déclenché |
| RPC supprimée | ✅ **oui** (vérifié HTTP 404) |
| WM-4 | **NO-GO** (pas de démarrage automatique) |
| `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` | **interdit** |

## 5. Non-impact / interdits respectés

| Contrôle | Valeur |
|----------|--------|
| `DELETE` de profil | 0 (8 archivés `archived_at`) |
| Modification hors DG-1/DG-2 | 0 |
| Modification de rôle non validée | 0 (aucun cumul) |
| Déploiement applicatif / migration WordPress | non |
| PII en clair dans fichiers suivis | 0 |
| Commit / push (avant rapport) | non |
| Lots WM-3.1→3.9 modifiés | non |
| Fichiers hors périmètre touchés | non |
| WM-4 démarré | **non** |

## 6. Suite (nouveau GO requis)

1. RPC supprimée et vérifiée — **terminé**.
2. WM-4 uniquement sur **nouveau GO explicite** (R2 médias + `PRE-00` + réévaluation globale).
