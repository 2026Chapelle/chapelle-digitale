# WM-3.7 — Statut final

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.7` |
| Branche | `stabilisation-p0-recette-citadelle` |
| Commit de référence | `f369f0fa8304c4dce09da697c1a925230783b3dd` |
| Objet | Réalignement final du dossier R1 avant WM-4 (aucune fusion) |
| Verdict | **`WM37_BLOCKED_PENDING_TRANSACTION_ACCESS`** |

---

## 1. Justification du verdict

Le plan R1 est **entièrement réaligné et prêt** (DG-1 gardien `DG-1-P2` + conflit intégré + nouveau
dry-run ; DG-2 inchangé et validé). Mais l'exécution reste **impossible** faute de chemin
transactionnel (ni RPC autorisée, ni accès Postgres direct). Le verdict retenu est donc
**`WM37_BLOCKED_PENDING_TRANSACTION_ACCESS`** (et non `WM37_R1_READY_FOR_FINAL_EXECUTION`, qui
supposerait le moyen d'exécution disponible).

## 2. Actions réalisées

| Action | État |
|--------|------|
| Documenter le blocage volontaire de WM-3.6 | ✅ `WM37-WM36-BLOCKING-REPORT.md` |
| Mettre à jour le plan DG-1 (gardien P2 + conflit) | ✅ `WM37-R1-DG1-UPDATED-DECISION.md` |
| Nouveau dry-run DG-1 (lecture seule) | ✅ `WM37-DG1-NEW-DRY-RUN.md` |
| Conserver DG-2 inchangé | ✅ (gardien `DG-2-P1`, double validation) |
| Définir les exigences transactionnelles futures | ✅ `WM37-TRANSACTION-REQUIREMENTS.md` |
| Aucune modification production | ✅ 0 écriture |

## 3. Livrables (`docs-migration-wp/WM-3.7/`)

`WM37-R1-DG1-UPDATED-DECISION.md`, `WM37-DG1-NEW-DRY-RUN.md`, `WM37-TRANSACTION-REQUIREMENTS.md`,
`WM37-WM36-BLOCKING-REPORT.md`, `WM37-WM4-READINESS.md`, `WM37-FINAL-STATUS.md`,
`manifests/WM37-MANIFEST.json` + `SHA256SUMS.txt`.

## 4. Marqueurs

| Marqueur | État |
|----------|------|
| `WM37_BLOCKED_PENDING_TRANSACTION_ACCESS` | **émis** |
| `WM37_R1_READY_FOR_FINAL_EXECUTION` | non émis (prérequis transactionnel manquant) |
| `PRE-ID-03` | **FAIL** |
| WM-4 | **NO-GO** |
| `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` | **interdit** |

## 5. Seul blocage restant

Fournir **Option A** (RPC PostgreSQL transactionnelle, dérogation limitée) **ou Option B** (accès
Postgres direct contrôlé) — voir `WM37-TRANSACTION-REQUIREMENTS.md`.

## 6. Non-impact (interdits respectés)

| Contrôle | Valeur |
|----------|--------|
| Écritures production | 0 |
| Fusion / désactivation | 0 |
| Migration de schéma / déploiement | non |
| PII en clair dans fichiers suivis | 0 |
| Commit / push Git | non |
| Lots WM-3.1→3.6 modifiés | non |
| Fichiers hors périmètre touchés | non |

Seules écritures disque : livrables sous `docs-migration-wp/WM-3.7/`.
