# WM-3.8 — Statut final

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.8` |
| Branche | `stabilisation-p0-recette-citadelle` |
| Commit de référence | `f369f0fa8304c4dce09da697c1a925230783b3dd` |
| Objet | Préparer le chemin transactionnel R1 (conception, sans exécution) |
| Verdict | **`WM38_READY_FOR_CONTROLLED_EXECUTION`** |

---

## 1. Justification du verdict

Le chemin transactionnel est **entièrement conçu et faisable** avec l'accès existant (service role +
RPC PostgREST + éditeur SQL Supabase pour le déploiement humain de la fonction). Aucun blocage
technique résiduel : l'exécution peut être menée de façon **contrôlée et atomique** dès que le
décideur autorise le déploiement temporaire de la RPC et le retrait ciblé des inscriptions
redondantes. Verdict = **`WM38_READY_FOR_CONTROLLED_EXECUTION`** (et non `WM38_BLOCKED_TECHNICAL_REASON`).

## 2. Décision retenue

**Option A — RPC PostgreSQL transactionnelle temporaire sécurisée.** Préférée à l'accès Postgres
direct (Option B, indisponible et plus exposée). La fonction :
- s'exécute **atomiquement** (transaction implicite),
- intègre un **`dry_run` transactionnel** (test sans persistance),
- porte des **gardes anti-dérive** et des **invariants post**,
- est **restreinte à `service_role`**, puis **supprimée après usage**.

## 3. Livrables (`docs-migration-wp/WM-3.8/`)

| Fichier | Objet |
|---------|-------|
| `WM38-TRANSACTION-ARCHITECTURE.md` | comparaison A/B + choix |
| `WM38-RPC-DESIGN.md` | SQL de la fonction + point d'autorisation (dédup) |
| `WM38-SECURITY-CONTROLS.md` | privilèges, gardes, cycle de vie |
| `WM38-EXECUTION-PROCEDURE.md` | conditions d'autorisation + phases 0→7 |
| `WM38-ROLLBACK-PROCEDURE.md` | rollback A/B |
| `WM38-FINAL-STATUS.md` | présent document |
| `manifests/` | manifeste + SHA-256 |

## 4. Éléments inclus (exigés)

| Exigence | Couverture |
|----------|-----------|
| Conditions d'autorisation d'exécution | `WM38-EXECUTION-PROCEDURE.md` §1 |
| Snapshot obligatoire | procédure §Phase 1 + contrat WM-3.4 |
| Contrôles avant/après | procédure §Phases 2/4/6 + `POST-M-*` |
| Stratégie rollback | `WM38-ROLLBACK-PROCEDURE.md` (A/B) |
| Suppression/verrouillage après usage | `WM38-SECURITY-CONTROLS.md` §5 + procédure §Phase 7 |

## 5. Points de décision restants (humains)

1. Autoriser le **déploiement temporaire** de la RPC (dérogation limitée, non versionnée, supprimée après).
2. Autoriser le **retrait ciblé des inscriptions redondantes** (2 lignes) **ou** assouplir `POST-M-03`.

## 6. Non-impact (interdits respectés)

| Contrôle | Valeur |
|----------|--------|
| Écritures production | 0 |
| Fonction créée / `GRANT` / `DROP` exécuté | 0 |
| Fusion / désactivation | 0 |
| Migration de schéma métier | non |
| Déploiement | non |
| PII en clair dans fichiers suivis | 0 |
| Commit / push Git | non |
| Lots WM-3.1→3.7 modifiés | non |
| Fichiers hors périmètre touchés | non |

`PRE-ID-03` = **FAIL** (inchangé) · WM-4 = **NO-GO** ·
`CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` = **interdit**.
