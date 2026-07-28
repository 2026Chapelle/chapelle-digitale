# WM3-CLOSURE — PRE-00 final (Sauvegarde WM-1)

- **Date** : 2026-07-28
- **Branche** : `stabilisation-p0-recette-citadelle`
- **HEAD (avant commit de clôture)** : `d1151c540c55e1ea3fa798e9cf549ad061f1d376`
- **Mode** : lecture seule pour la vérification (aucune mutation de la sauvegarde).

## Verdict

## PRE-00 = **PASS_ATTESTED**

La réserve R-01 (« hashes non recalculables depuis le dépôt ») est **levée** : la sauvegarde externe est accessible depuis l'environnement et ses 3 empreintes SHA-256 ont été **recalculées à l'identique** (byte-for-byte) en lecture seule.

## Re-vérification cryptographique directe

Source : `C:\Users\Révérend Doxa\Desktop\EGLISE EN LIGNE\docs-migration-wp\WM-1\backup-20260720-111659` (hors dépôt, lecture seule).

| Artefact | Taille | SHA-256 recalculé | Attendu (ARTIFACTS.json / WM31-MANIFEST.json:10-14) | État |
|----------|--------|-------------------|------------------------------------------------------|------|
| `database/chapelle-premium-db.sql` | 86 574 033 o | `acc657fe…60dfc` | `acc657fe…60dfc` | ✅ IDENTIQUE |
| `database/chapelle-premium-db.sql.gz` | 16 228 649 o | `42c87d03…081bc` | `42c87d03…081bc` | ✅ IDENTIQUE |
| `files/public_html-files.tar.gz` | 216 327 752 o | `d64c5642…f4507` | `d64c5642…f4507` | ✅ IDENTIQUE |

Aucune mutation : la sauvegarde n'a été ni déplacée, ni renommée, ni modifiée.

## Les 5 conditions strictes de PASS_ATTESTED

| # | Condition | État | Preuve |
|---|-----------|------|--------|
| 1 | Restauration isolée antérieure formellement documentée | ✅ | `WM-2/…/reports/WM2-REPORT.md:10,23` (`WM1R_RESTORE_RECONCILIATION_OK`, `restore-20260720-214535`) ; `AUDIT-MANIFEST.json:11` ; source `restore-test/RESTORE-EVIDENCE.txt` |
| 2 | 126 tables attestées | ✅ | `WM2-REPORT.md:11,28,41` ; `WM2-COUNTS.json` (`tables:126`) ; `evidence/00-gate.txt:3` ; `AUDIT-MANIFEST.json:15-16` ; source `SOURCE-CERT.json` (`table_count_live:126`) |
| 3 | Preuves WM-1/WM-2 cohérentes | ✅ | checksums `WM31-GAP-CLOSURE-EVIDENCE.md:34-38` == `WM31-MANIFEST.json:10-14` == `ARTIFACTS.json` == `checksums/SHA256SUMS.txt` == valeurs recalculées |
| 4 | Aucune corruption / dérive | ✅ | 3/3 hashes identiques ; écart documenté `create_table=128` vs `prod_tables=126` (connu, non contradictoire) |
| 5 | Limite « backup externe non re-vérifié dans le repo » documentée | ✅ | `WM-1-EXTERNAL-SOURCE.md:1-13` ; `.gitignore` ; `WM31-MANIFEST.json` |

## Classification des preuves

- **PREUVE DIRECTE** : existence + tailles des 3 artefacts, 3 SHA-256 recalculés identiques, existence de `restore-test/restore-20260720-214535/`.
- **PREUVE ATTESTÉE** : la restauration SQL isolée elle-même (RC=0, 126 tables réconciliées) — documentée (`RESTORE-EVIDENCE.txt`, `WM1-STATUS-AFTER-WM1R.md`, `WM2-REPORT.md`), non ré-exécutée ici.
- **NON RE-VÉRIFIABLE** : état temps réel du WordPress de production d'origine (hors périmètre).

## Pourquoi PASS_ATTESTED et non PASS plein

La re-vérification directe des hashes est **éphémère** (cette session) et n'est pas persistée comme artefact du dépôt ; la sauvegarde reste hors dépôt par conception (`.gitignore`). La restaurabilité table-par-table reste PREUVE ATTESTÉE (non ré-exécutée). PASS_ATTESTED reflète honnêtement : socle attesté complet + intégrité cryptographique confirmée en direct, sans fabriquer une re-exécution non faite.

## Conséquence

R-01 **levée**. PRE-00 = PASS_ATTESTED est un verdict acceptable pour l'ouverture de WM-4 (règle de décision PRE-00). Chemin optionnel vers PASS plein : intégrer au dépôt un manifeste de conservation (SHA256SUMS + SOURCE-CERT + rapport WM-1R) figeant la re-vérification.
