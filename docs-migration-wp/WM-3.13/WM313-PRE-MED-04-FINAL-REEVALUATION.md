# WM-3.13 — Ré-évaluation finale PRE-MED-04

- **Lot** : WM-3.13 (clôture R2)
- **Date** : 2026-07-28
- **Contrôle** : PRE-MED-04 — *« 0 référence média pointant vers un objet absent de la base ET du disque »* (`WM-3.1/WM31-WM4-EXPORT-CONTRACT.md:277`).

## 0. Statut final

## PRE-MED-04 = `PASS_WITH_QUARANTINE`

La réserve est **levée par décision humaine tracée dans `quarantine.csv`**, mécanisme exact prévu par la clause d'ouverture WM-4 (`WM31-WM4-EXPORT-CONTRACT.md:330-331`), sans correction technique des vidéos (impossible, source 404) et **sans aucune donnée fictive**.

Ce n'est **pas** un PASS technique plein : les 3 vidéos n'ont pas de source réelle ré-hébergée. C'est un PASS **conditionné à la quarantaine** (`draft`) + traçage.

## 1. Vérifications (les 5 conditions)

| # | Condition | Vérdict | Preuve |
|---|-----------|---------|--------|
| 1 | Aucune leçon active vide importée | ✅ | 3 leçons en `draft` (invisibles) — `progress/route.ts:68-69` ; `modules/route.ts:87` |
| 2 | Aucune progression bloquée | ✅ | draft hors dénominateur — `progress/route.ts:25-27,31` |
| 3 | 3 vidéos explicitement quarantainées | ✅ | `WM313-WM4-QUARANTINE-ROWS.csv` (QU-MED-MISSING-REFERENCE, blocking, technique) |
| 4 | 2 pièces jointes explicitement abandonnées | ✅ | `WM313-WM4-REJECT-ROWS.csv` (ABANDON_REFERENCE, reversible=false) |
| 5 | Aucune donnée fictive | ✅ | aucun média/URL/youtube_id/video_url/fichier vide créé — `WM33-R2-HUMAN-DECISIONS-RECORDED.md:23` |

## 2. Définition et clause de levée

- Définition : `WM31-WM4-EXPORT-CONTRACT.md:277` (bloquant, 5 références).
- Clause de levée : PRE-MED-04 « corrigé, **soit levé par décision humaine tracée dans `quarantine.csv`** » (`WM31-WM4-EXPORT-CONTRACT.md:330-331`).
- Code dédié : `QU-MED-MISSING-REFERENCE` (`:203, 207-209`).

## 3. Amendements de contrat à ratifier (traçés honnêtement)

La décision scinde le lot des 5 références (contrat initial : 5 sous `QU-MED-MISSING-REFERENCE`). Deux amendements de `WM31-WM4-EXPORT-CONTRACT.md` sont requis pour que les contrôles `POST-10` restent cohérents :

1. **Volumétrie quarantaine** : `QU-MED-MISSING-REFERENCE` N=5 → **N=3** (34548/34555/34577).
2. **Nouveau code de rejet** : ajouter `RJ-MED-MISSING-REFERENCE` **N=2** (34549/34553) au §4.1 (absent aujourd'hui : les codes média existants sont uniquement RJ-MED-THUMBNAIL/GENERATED/DUPLICATE/CORRUPT).

Note : l'équation volumétrique média du §6 (`SOURCE_TOTAL` des 383 fichiers) reste **inchangée** — ces 5 références n'y figurent dans aucun terme (`WM31-WM4-EXPORT-CONTRACT.md:248-249`). Seule la table des codes §4.1/§5.1 est à corriger. Ces amendements sont à ratifier à l'ouverture de WM-4 (non lancé ici).

## 4. Réserve d'honnêteté

Dans WM-3.11 et WM-3.12, PRE-MED-04 était marqué **FAIL** (aucune exécution/traçage à ces dates). Le passage à **PASS_WITH_QUARANTINE** est légitime **dès lors que** la décision QUARANTINE_CONTENT est matérialisée : lignes `quarantine.csv` (×3) + `rejects.csv` (×2) documentées ici, et modules destinés à `draft`. La matérialisation en base (`draft` effectif, écriture des registres) relève de WM-4.

## 5. Conclusion

➡️ **PRE-MED-04 = `PASS_WITH_QUARANTINE`.**
➡️ WM-4 reste **NO-GO** tant que l'ouverture n'est pas décidée (ce lot ne lance pas WM-4).
