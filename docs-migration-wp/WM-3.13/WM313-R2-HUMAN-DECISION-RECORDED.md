# WM-3.13 — Décision humaine finale R2 (enregistrée)

- **Lot** : WM-3.13 (clôture définitive R2 / PRE-MED-04)
- **Date** : 2026-07-28
- **Branche** : `stabilisation-p0-recette-citadelle`
- **HEAD au moment de l'analyse** : `83561529bf4ac05ccafad76b22d94057fdf478fd`
- **Mode** : documentaire / lecture seule. Aucune modification WordPress / Citadelle / Supabase, aucun upload, aucun remplacement média, aucune migration.

## 0. Contexte de bascule

- WM-3.11 : sources des 3 vidéos identifiées (URLs d'origine), décision primaire `RESTORE_FROM_EXTERNAL_SOURCE`.
- WM-3.12 : vérification réseau — les 3 URLs renvoient **HTTP 404** (301 → `www.` → 404, page HTML, aucune signature MP4), aucun repli (URL alternative / variante / CDN / YouTube / Vimeo). Verdict `WM312_R2_REPLACEMENT_DECISION_REQUIRED`.
- La voie `RESTORE_FROM_EXTERNAL_SOURCE` est **définitivement fermée** (source d'origine supprimée). Décision humaine finale requise.

## 1. Décision humaine finale — VIDÉOS OBLIGATOIRES

| media_id | Leçon | Vidéo | Décision finale |
|----------|-------|-------|-----------------|
| 34548 | 864 | MODULE_1_ADN | **QUARANTINE_CONTENT** |
| 34555 | 865 | LES_PRINCIPES_DU_ROYAUME | **QUARANTINE_CONTENT** |
| 34577 | 866 | VIE_COMMUNAUTAIRE_ET_APPARTENANCE | **QUARANTINE_CONTENT** |

**Conséquences obligatoires :**
- Ces 3 leçons ne doivent **jamais** être importées comme actives/publiées sans média.
- Elles conservent leurs métadonnées, titres, ordre et cours parent (867 `le-chemin-des-elus`).
- Elles sont importées en statut `draft` / quarantaine si WM-4 le permet ; sinon exclues temporairement de l'import actif.
- Elles **ne comptent pas** dans la progression obligatoire.
- Elles **n'empêchent pas** l'achèvement du cours.
- Réactivables ultérieurement après ajout d'une **vidéo officielle approuvée**.
- Interdits : aucun média fictif, aucune URL inventée, aucun fichier vide, aucun `youtube_id` fictif, aucun `video_url` non vérifié.

## 2. Décision humaine finale — PIÈCES JOINTES FACULTATIVES

| media_id | Décision finale |
|----------|-----------------|
| 34549 | **MIGRATE_WITHOUT_MEDIA** + **ABANDON_REFERENCE** |
| 34553 | **MIGRATE_WITHOUT_MEDIA** + **ABANDON_REFERENCE** |

**Conséquences :**
- Ne pas créer de remplacement.
- Ne pas bloquer la leçon ni le cours.
- Tracer l'abandon dans `rejects.csv`.
- Conserver la référence historique dans les preuves documentaires.

## 3. Chaîne de traçabilité de la décision

- Décisions R2 initialement enregistrées : `WM-3.3/WM33-R2-HUMAN-DECISIONS-RECORDED.md:17-21` ; confirmées `WM-3.4/WM34-HUMAN-DECISIONS-CONFIRMED.md:40`.
- Preuve réseau de fermeture de `RESTORE` : `WM-3.12/WM312-VIDEO-URL-LIVENESS-REPORT.md:37-73`.
- `evidence_ref` prescrit : `WM-3.1 Gap 3 §6` (`WM33-R2-HUMAN-DECISIONS-RECORDED.md:48` ; racine `WM31-PHYSICAL-FILES-REPORT.md:178-197`).
- Bascule finale WM-3.13 : `RESTORE` fermé (404) → `QUARANTINE_CONTENT` (vidéos) + `ABANDON_REFERENCE` (annexes).

## 4. Portée

Cette décision **clôture définitivement R2**. Aucun nouveau lot WM-3.x ne sera proposé pour R2 après WM-3.13. L'exécution effective (import en `draft`, écriture des registres, réactivation future) relève de WM-4, non lancé ici.
