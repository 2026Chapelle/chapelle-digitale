# WM3-FINAL — Registre des risques

- **Date** : 2026-07-28

Échelle : 🔴 bloquant · 🟠 réserve non bloquante · 🟢 résolu/nul.

| # | Risque | Niveau | Détail | Mitigation / action |
|---|--------|--------|--------|---------------------|
| R-01 | Sauvegarde WM-1 non re-vérifiable depuis le repo | 🟠 | PRE-00 = INCOMPLETE : backup hors dépôt, crypto/restaurabilité/non-dérive non re-jouables localement (attestées via WM-2) | Confirmer la source externe avant WM-4 ou intégrer un manifeste de conservation ; ne pas émettre le marqueur complet |
| R-02 | Contrat WM-4 non amendé avant export | 🟠 | `QU-MED-MISSING-REFERENCE` N=5 vs 3 produits ; `RJ-MED-MISSING-REFERENCE` inexistant au §4.1 → POST-10 échouerait | Ratifier A1 (5→3) + A2 (ajout RJ N=2) + A2-bis (hors 313/§6) à l'ouverture de WM-4 |
| R-03 | Comptage naïf des rejets média (POST-05) | 🟠 | Les 2 lignes RJ-MED-MISSING-REFERENCE (domain=media) hors des 383 pourraient donner 315 ≠ 313 | Stipuler explicitement le cloisonnement dans A2-bis |
| R-04 | Email en clair dans un fichier versionné WM-2 | 🟠 | `WM-2/audit-20260720-231559/evidence/t11-seo-options.tsv:5` : un email en clair (valeur non reproduite ici ; api_key déjà masqué) | Hors périmètre WM-3/R2 ; hygiène données à corriger indépendamment (masquage/purge historique) |
| R-05 | 3 vidéos obligatoires sans source réelle | 🟠 | Sources 404 définitives, aucun repli ; leçons 864/865/866 non enseignables tant qu'aucune vidéo approuvée | Quarantaine `draft` (non bloquante) ; réactivation future via `REPLACE_WITH_APPROVED_MEDIA` |
| R-06 | Import « en l'état » sans quarantaine | 🟢 | Neutralisé : décision QUARANTINE_CONTENT + contrat LMS `draft` (invisible, hors dénominateur) | Résolu par WM-3.13 |
| R-07 | Perte de données R1 / RPC résiduelle | 🟢 | `data_loss=0`, 3 actions pastorales préservées, RPC droppée (HTTP 404) | Résolu par WM-3.10 |
| R-08 | Fuite PII/secret dans le versionné WM-3.* | 🟢 | 0 email/UUID/JWT/secret dans WM-3.* ; private/.sql/média non suivis | Résolu (gitignore + contrôles) |

## Synthèse

- **Aucun risque bloquant (🔴).**
- 5 réserves non bloquantes (🟠) : R-01 à R-05.
- 3 risques résolus (🟢).

Les réserves R-01 (PRE-00) et R-02/R-03 (amendements contrat) doivent être levées **avant l'exécution effective de WM-4** ; elles n'empêchent pas l'approbation documentaire du mapping WM-3 sous réserves.
