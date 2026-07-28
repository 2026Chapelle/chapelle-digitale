# WM3-FINAL — Checklist GO / NO-GO WM-4

- **Date** : 2026-07-28

## Prérequis d'ouverture WM-4 (§10 du contrat d'export)

| # | Prérequis | État | Bloquant ? |
|---|-----------|------|------------|
| 1 | PRE-00 — sauvegarde WM-1 intacte | **INCOMPLETE** (attestée, non re-vérifiable depuis le repo) | Non (réserve) |
| 2 | PRE-ID-03 — identités | **PASS** | — |
| 3 | PRE-MED-04 — médias | **PASS_WITH_QUARANTINE** | Non (levé par décision tracée) |
| 4 | Contrat WM-4 cohérent | **COHÉRENT SOUS RÉSERVE** (2 amendements à ratifier) | Non (réserve) |
| 5 | Cohérence volumétrique (§6) | **OK** (inchangée) | — |
| 6 | Décisions humaines R1/R2 tracées | **OK** | — |
| 7 | Intégrité documentaire WM-3.1..3.13 | **OK** (13/13 sha256sum -c) | — |
| 8 | PII / secrets / private / sql / média (WM-3.*) | **OK** (0) | — |
| 9 | Git readiness (HEAD/sync/périmètre) | **OK** (`d1151c5` / `0 0`) | — |

## Réserves ouvertes (à lever avant exécution WM-4)

- [ ] **R-01** Confirmer/re-vérifier la sauvegarde WM-1 (source externe ou manifeste de conservation).
- [ ] **R-02** Ratifier l'amendement A1 : `QU-MED-MISSING-REFERENCE` N=5 → N=3.
- [ ] **R-02** Ratifier l'amendement A2 : ajouter `RJ-MED-MISSING-REFERENCE` N=2 au §4.1.
- [ ] **R-03** Ratifier A2-bis : les 2 rejets restent hors des 383 / hors du sous-total 313.
- [ ] **R-04** Corriger l'email en clair dans `WM-2/.../t11-seo-options.tsv:5` (hygiène, hors R2).

## Décision

- **Aucun blocage dur (aucun FAIL).**
- Prérequis identités (PRE-ID-03) et médias (PRE-MED-04) satisfaits ; les autres contrôles OK.
- Réserves non bloquantes ouvertes (PRE-00 INCOMPLETE + amendements + hygiène WM-2).

➡️ **GO conditionnel = `WM3_GLOBAL_REEVALUATION_APPROVED_WITH_RESERVATIONS`.**

➡️ Le marqueur complet `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` **n'est PAS émis** (réservé au cas « tous prérequis satisfaits » sans réserve — PRE-00 n'est pas PASS plein).
