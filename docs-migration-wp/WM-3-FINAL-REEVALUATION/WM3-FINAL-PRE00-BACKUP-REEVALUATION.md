# WM3-FINAL — Réévaluation PRE-00 / Sauvegarde WM-1

- **Date** : 2026-07-28
- **Branche** : `stabilisation-p0-recette-citadelle`
- **HEAD** : `d1151c540c55e1ea3fa798e9cf549ad061f1d376`
- **Mode** : lecture seule.

## Verdict local

## PRE-00 = **INCOMPLETE**

La sauvegarde WM-1 et ses preuves cryptographiques sont **hors dépôt** (par conception). Le dépôt ne contient qu'un **pointeur** documenté et des transcriptions dans les lots ultérieurs. Ni FAIL (preuves déportées cohérentes, non contredites), ni PASS (rien de re-vérifiable depuis le repo seul).

## Constat

- Répertoire `docs-migration-wp/WM-1/` **absent**. Seul `docs-migration-wp/WM-1-EXTERNAL-SOURCE.md` existe (pointeur).
- Emplacement externe : `…\EGLISE EN LIGNE\docs-migration-wp\WM-1\backup-20260720-111659` (`WM-1-EXTERNAL-SOURCE.md:6-8`), hors du dépôt `cier-platform`.
- Exclusion volontaire : `docs-migration-wp/.gitignore:4-13` (`**/*.sql`, `**/backup-*/`, `**/restore-test/`, `**/files-extract/`…).
- Statut confirmé au manifeste : `WM-3.1/manifests/WM31-MANIFEST.json:8-9` (`wm1_backup: backup-20260720-111659 (externe, lecture seule)`).

## Vérifiable depuis le repo

| Élément | Preuve |
|---------|--------|
| Pointeur source externe | `WM-1-EXTERNAL-SOURCE.md:6-8` |
| ID batch sauvegarde + restauration | `WM-2/…/reports/WM2-REPORT.md:9-10` |
| 126 tables (base restaurée `wm1r_restore_isolated`) | `WM2-REPORT.md:11,28,41` ; `WM2-DATA-DICTIONARY.md:1` ; `evidence/00-gate.txt:3` |
| MariaDB 10.11.11 @ 127.0.0.1:3307 | `WM2-REPORT.md:27` ; `00-gate.txt:4` |
| Réconciliation restauration `WM1R_RESTORE_RECONCILIATION_OK` | `WM2-REPORT.md:10,23` |
| 3 checksums SHA-256 transcrits | `WM-3.1/WM31-GAP-CLOSURE-EVIDENCE.md:34-38` |
| Attestations lecture seule / non-mutation | `WM-1-EXTERNAL-SOURCE.md:10-13` ; `WM31-GAP-CLOSURE-EVIDENCE.md:20,40,221` |

## NON vérifiable depuis le repo

- Présence physique de la sauvegarde.
- Recalcul/recoupement des SHA-256 (artefacts gitignorés/absents).
- Complétude réelle des 126 tables au niveau de la sauvegarde elle-même.
- Re-exécution / preuve de restaurabilité (répertoires `restore-test/`, `files-extract/` gitignorés).
- Absence de dérive (aucune comparaison hash actuel vs référence possible sans la source).

## Condition de passage à PASS

Accéder à la source externe pour recalculer les hashes, **ou** intégrer au dépôt un manifeste de conservation (SHA256SUMS + SOURCE-CERT + rapport WM-1R) sous la procédure dédiée (`WM-1-EXTERNAL-SOURCE.md:13`).

## Classification pour la décision globale

Réserve **non bloquante mais non résolue** : la sauvegarde est attestée et cohérente (restauration réconciliée en WM-2), mais son intégrité n'est pas re-vérifiable depuis le dépôt. → empêche un PASS plein de PRE-00, donc empêche l'émission du marqueur complet. Voir `WM3-FINAL-DECISION.md`.
