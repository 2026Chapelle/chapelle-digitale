# WM-3.9 — Statut final

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.9` |
| Branche | `stabilisation-p0-recette-citadelle` |
| Commit de référence | `f369f0fa8304c4dce09da697c1a925230783b3dd` |
| Décision traitée | `RPC_TEMPORAIRE_AUTORISÉE = OUI` — portée INSTALLATION + SÉCURISATION + DRY-RUN |
| Verdict | **`WM39_TRANSACTIONAL_DRY_RUN_APPROVED`** |

> Mise à jour : la RPC a été déployée (humain), le bundle a été corrigé en **v2** (schéma réel de
> `inscriptions_formation`), et le **dry-run transactionnel DG-1/DG-2 est CONFORME** avec **0
> persistance** (`WM39-DRYRUN-APPROVED.md`). Fusion réelle non exécutée. RPC non supprimée.

---

## 1. Ce qui a été fait

| Action | État |
|--------|------|
| Enregistrer la décision + conditions | ✅ `WM39-HUMAN-DECISION-1-RECORDED.md` |
| Produire le bundle SQL (create + revoke/grant) conforme aux 10 conditions | ✅ `WM39-RPC-DEPLOYMENT-BUNDLE.sql` |
| Calculer les paramètres de dry-run (lecture seule) | ✅ `private/WM39-DRYRUN-PARAMS.json` |
| Vérifier que la RPC n'existe pas encore | ✅ (`/rpc/…` → 404) |
| Instructions de déploiement humain | ✅ `WM39-DEPLOYMENT-INSTRUCTIONS.md` |
| Plan de dry-run | ✅ `WM39-DRYRUN-PLAN.md` |
| Déployer la RPC | ⛔ **impossible côté agent** (aucun DDL disponible) → action humaine |
| Exécuter le dry-run | ⏸️ **en attente** du déploiement humain |

## 2. Pourquoi « awaiting human deployment »

L'installation exige du DDL (`CREATE FUNCTION`/`GRANT`). L'agent n'a **aucun** moyen d'exécuter du
DDL (pas de token Management/PAT, pas d'accès Postgres direct, PostgREST = DML uniquement). Le
déploiement du bundle est donc une **action humaine** (éditeur SQL Supabase). Dès confirmation,
l'agent exécute le **dry-run transactionnel** (dans la portée autorisée, sans persistance).

## 3. Prochaine étape

1. **Humain** : coller/exécuter `WM39-RPC-DEPLOYMENT-BUNDLE.sql` dans l'éditeur SQL Supabase, puis confirmer.
2. **Agent** : exécuter le dry-run DG-1 puis DG-2, vérifier `would_result`, rapporter.
3. Fusion réelle : **non autorisée** — nécessitera une Décision humaine 2.

## 4. Marqueurs

| Marqueur | État |
|----------|------|
| `RPC_TEMPORAIRE_AUTORISÉE` | OUI (enregistré) |
| Bundle SQL prêt | ✅ |
| RPC déployée | non (attente humaine) |
| Dry-run exécuté | non (attente déploiement) |
| Fusion réelle | **non autorisée / non exécutée** |
| `PRE-ID-03` | **FAIL** |
| WM-4 | **NO-GO** |
| `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` | **interdit** |

## 5. Non-impact (interdits respectés)

| Contrôle | Valeur |
|----------|--------|
| Écritures production | 0 |
| Fonction créée / `GRANT` / `DROP` exécuté par l'agent | 0 |
| Fusion / désactivation | 0 |
| DDL exécuté | 0 |
| Migration de schéma métier / déploiement app | non |
| PII en clair dans fichiers suivis | 0 |
| Commit / push Git | non |
| Lots WM-3.1→3.8 modifiés | non |
| Fichiers hors périmètre touchés | non |

Seules écritures disque : livrables sous `docs-migration-wp/WM-3.9/` + paramètres cloisonnés dans
`private/` (ignoré par Git).
