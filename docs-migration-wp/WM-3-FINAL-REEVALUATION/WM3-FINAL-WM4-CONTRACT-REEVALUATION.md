# WM3-FINAL — Réévaluation du contrat WM-4

- **Date** : 2026-07-28
- **Mode** : lecture seule (aucune modification du contrat).

## Verdict local

## Contrat **COHÉRENT SOUS RÉSERVE** des 2 amendements à ratifier

Aucune contradiction bloquante entre `WM-3.1/WM31-WM4-EXPORT-CONTRACT.md` et la décision finale WM-3.13. La décision R2 (scission 3 quarantaine + 2 rejet) est traçable, sans donnée fictive, et emploie le mécanisme de levée prévu au §10 (`:330-331`).

## Amendements NÉCESSAIRES (à ratifier à l'ouverture de WM-4)

| # | Amendement | Preuve du besoin |
|---|-----------|------------------|
| **A1** | §5.1 : `QU-MED-MISSING-REFERENCE` N=5 → **N=3** | contrat `:203` (N=5, énumère les 5 IDs `:207-209`) vs `WM313-WM4-QUARANTINE-ROWS.csv` (3 lignes) ; POST-10 `:296` |
| **A2** | §4.1 : ajouter `RJ-MED-MISSING-REFERENCE` **N=2** | §4.1 `:170-173` ne liste que RJ-MED-THUMBNAIL/GENERATED/DUPLICATE/CORRUPT ; contrainte `:154` (reject_code doit être un code du §4.1) vs `WM313-WM4-REJECT-ROWS.csv` (2 lignes) |
| **A2-bis** | Stipuler que les 2 rejets N=2 restent **hors des 383 et hors du sous-total média 313** | cohérence POST-05 `:291,233` ; fondé sur `:248-249` (5 références hors équation) |

## Invariance volumétrique §6

L'équation média `383 = 69 + 313 + 1` (`:233`) reste **inchangée** : les 5 références manquantes ne figurent dans aucun terme (`:248-249`), confirmé par `WM313-PRE-MED-04-FINAL-REEVALUATION.md:38`. Condition : la ratification de A2 doit reconduire ce cloisonnement (les 2 lignes `RJ-MED-MISSING-REFERENCE` ne s'additionnent pas au « 313 » ni au REFECTED §6), sans quoi un comptage naïf donnerait 315 et ferait échouer POST-05.

## Conditions d'ouverture WM-4 (§10 :324-332)

| Condition | État |
|-----------|------|
| WM31_OK(_WITH_RESERVATIONS) accepté | Documenté (`WM31-FINAL-VERDICT`) |
| PRE-ID-03 corrigé/levé | **PASS** (R1, WM-3.10) |
| PRE-MED-04 corrigé/levé par décision tracée quarantine.csv | **PASS_WITH_QUARANTINE** (R2, WM-3.13) |
| WM-1 intacte | **Attestée, non re-vérifiable depuis le repo** (PRE-00 = INCOMPLETE) |

## Conclusion

Le contrat est cohérent et non contredit. Deux amendements de nomenclature (A1, A2 + précision A2-bis) sont **nécessaires** et **déjà documentés honnêtement** dans WM-3.13 comme « à ratifier à l'ouverture de WM-4 ». Ils ne sont pas appliqués ici (aucune modification du contrat). Réserve non bloquante pour l'approbation du mapping WM-3, à lever au démarrage de WM-4.
