# WM-3.11 — Fiche d'action humaine (R2 / PRE-MED-04)

- **Lot** : WM-3.11 (R2)
- **Date** : 2026-07-28
- **Statut** : décisions déjà validées ; **actions d'exécution en attente d'une main humaine** (hors périmètre de ce lot documentaire).

## 0. Ce que ce lot NE fait PAS

Aucun téléchargement, upload, remplacement, modification de leçon, opération WordPress/Citadelle/Supabase, commit, push ou déploiement. Ce lot **documente** l'état R2 et prépare l'exécution.

## 1. Actions à réaliser par un opérateur autorisé

### Action 1 — Vérifier la disponibilité des 3 sources vidéo
Vérifier (navigateur / requête) que les 3 URLs d'origine répondent en HTTP 200 :

| Leçon | URL à vérifier | Durée attendue |
|-------|----------------|----------------|
| 864 | `https://chapelleduroyaume.org/wp-content/uploads/2025/06/MODULE_1_ADN_Optimized.mp4` | 2:15 |
| 865 | `https://chapelleduroyaume.org/wp-content/uploads/2025/06/LES_PRINCIPES_DU_ROYAUME_Optimized.mp4` | 2:41 |
| 866 | `https://chapelleduroyaume.org/wp-content/uploads/2025/06/VIE_COMMUNAUTAIRE_ET_APPARTENANCE_Optimized.mp4` | 3:03 |

- **Si 200** → Action 2 (RESTORE).
- **Si 404 / indisponible** → Action 3 (REPLACE).

### Action 2 — RESTORE_FROM_EXTERNAL_SOURCE (voie primaire)
Pour chaque vidéo disponible : télécharger le `.mp4`, ré-héberger (Supabase Storage bucket privé `media-videos` **ou** YouTube), renseigner **soit** `youtube_id` **soit** `video_url` (jamais les deux). Vérifier que la nouvelle référence résout (non-404).

### Action 3 — REPLACE_WITH_APPROVED_MEDIA (repli, si source indisponible)
Fournir une vidéo officielle approuvée (ré-enregistrement / lien officiel), ré-héberger, renseigner la référence. **Aucun média fictif.**

### Action 4 — Pièces jointes facultatives (34549/34553)
`MIGRATE_WITHOUT_MEDIA` : importer les leçons parentes sans l'annexe, puis tracer l'abandon dans `quarantine.csv` / `rejects.csv` (WM-4), `evidence_ref = WM-3.1 Gap 3 §6`.

### Action 5 — Traçage quarantaine (préalable WM-4)
Inscrire les 5 références dans `quarantine.csv` avec `QU-MED-MISSING-REFERENCE` (bloquant) et la décision correspondante.

## 2. Cases de décision à cocher (à renseigner par l'humain)

| # | Décision | Choix | Renseigné par | Date |
|---|----------|-------|---------------|------|
| 1 | 34548 — RESTORE (200) ou REPLACE (404) ? | ____ | ____ | ____ |
| 2 | 34555 — RESTORE (200) ou REPLACE (404) ? | ____ | ____ | ____ |
| 3 | 34577 — RESTORE (200) ou REPLACE (404) ? | ____ | ____ | ____ |
| 4 | 34549 — MIGRATE_WITHOUT_MEDIA confirmé ? | ____ | ____ | ____ |
| 5 | 34553 — MIGRATE_WITHOUT_MEDIA confirmé ? | ____ | ____ | ____ |

## 3. Condition de clôture R2

PRE-MED-04 ne passera PASS qu'après exécution **et** vérification (non-404) des références vidéo, plus traçage de l'abandon des pièces jointes. Tant que ces actions ne sont pas faites, **PRE-MED-04 reste FAIL** et **WM-4 reste NO-GO**.

## 4. Interdits maintenus

Aucun média fictif. Aucun renseignement de `video_url` vers une URL morte (préférer `draft` masqué). `youtube_id` XOR `video_url`.
