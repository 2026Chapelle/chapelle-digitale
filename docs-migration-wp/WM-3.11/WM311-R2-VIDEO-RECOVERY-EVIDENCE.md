# WM-3.11 — R2 / PRE-MED-04 — Preuves de récupération des vidéos obligatoires

- **Lot** : WM-3.11 (R2 — traitement final des médias manquants)
- **Date** : 2026-07-28
- **Branche** : `stabilisation-p0-recette-citadelle`
- **HEAD au moment de l'analyse** : `83561529bf4ac05ccafad76b22d94057fdf478fd`
- **Mode** : lecture seule, aucune écriture production, aucun téléchargement, aucun upload.

## 0. Objet

Fermer la réserve R2 / PRE-MED-04 sur les **3 vidéos obligatoires** manquantes :

| media_id | Leçon | Module / topic | Cours |
|----------|-------|----------------|-------|
| 34548 | 864 | topic 863 (module 1) | 867 `le-chemin-des-elus` |
| 34555 | 865 | topic 863 (module 1) | 867 `le-chemin-des-elus` |
| 34577 | 866 | topic 863 (module 1) | 867 `le-chemin-des-elus` |

Décision humaine déjà validée (WM-3.3/WM-3.4) : **`RESTORE_FROM_EXTERNAL_SOURCE`**, repli **`REPLACE_WITH_APPROVED_MEDIA`**. Aucun média fictif autorisé.

## 1. Résultat central

- **Références « source » retrouvées : 3 / 3** (URL d'origine + type + durée + leçon liée), **certitude HAUTE**.
- **Fichiers vidéo restaurables depuis le dépôt : 0 / 3.** Aucun `.mp4` présent dans le dépôt ; répertoire `wp-content/uploads/2025/06` absent des 383 fichiers inventoriés ; objets absents de `wp_posts` (ID max 1481) ; aucune sauvegarde WM-1 versionnée.
- **Repli YouTube/Vimeo : INEXISTANT** pour ces 3 IDs (champs `source_youtube` / `source_vimeo` / `source_external_url` vides).
- **Média de remplacement approuvé : ABSENT** du dépôt.

La preuve brute décisive est la métadonnée sérialisée Tutor LMS `_video` (source `html5`) capturée dans l'audit WM-2.

## 2. Détail par vidéo

### media_id 34548 → leçon 864

| Attribut | Valeur | Preuve |
|----------|--------|--------|
| Source retrouvée | OUI — `_video.source_html5` (source d'origine `html5`, `source_video_id=34548`) | `docs-migration-wp/WM-2/audit-20260720-231559/private/video-meta-raw.tsv:12` |
| URL / chemin historique | `https://chapelleduroyaume.org/wp-content/uploads/2025/06/MODULE_1_ADN_Optimized.mp4` | `video-meta-raw.tsv:12` ; `WM-2/.../private/html5-local-videos.tsv:1` ; `WM-3.1/WM31-PHYSICAL-FILES-REPORT.md:184` |
| Titre | « MODULE 1 ADN » (dérivé du nom de fichier ; pas de champ titre distinct) | `video-meta-raw.tsv:12` |
| Leçon liée | 864 — CONFIRMÉE (topic 863) ; ancien ID d'import 34541 | `video-meta-raw.tsv:11-12` ; `t05-lesson-video-meta-keys.tsv:3` |
| Durée | 2:15 (`duration_sec=135.118`, `playtime=2:15`) | `video-meta-raw.tsv:12` |
| Restaurabilité | Externe uniquement (serveur live / sauvegarde hors dépôt) — NON restaurable depuis le dépôt | `WM31-PHYSICAL-FILES-REPORT.md:190-193` |
| Remplacement possible | Aucun média approuvé équivalent dans le dépôt ; aucun repli YouTube/Vimeo | `video-meta-raw.tsv:12` ; `WM-2/.../private/youtube-ids.tsv` |
| Certitude | HAUTE pour la référence ; source-fichier hors dépôt | — |

### media_id 34555 → leçon 865

| Attribut | Valeur | Preuve |
|----------|--------|--------|
| Source retrouvée | OUI — `_video.source_html5` (`source_video_id=34555`) | `video-meta-raw.tsv:14` |
| URL / chemin historique | `https://chapelleduroyaume.org/wp-content/uploads/2025/06/LES_PRINCIPES_DU_ROYAUME_Optimized.mp4` | `video-meta-raw.tsv:14` ; `html5-local-videos.tsv:2` ; `WM31-PHYSICAL-FILES-REPORT.md:185` |
| Titre | « LES PRINCIPES DU ROYAUME » (dérivé du nom de fichier) | `video-meta-raw.tsv:14` |
| Leçon liée | 865 — CONFIRMÉE (topic 863) ; ancien ID d'import 34551 | `video-meta-raw.tsv:13-14` ; `t05-lesson-video-meta-keys.tsv:5` |
| Durée | 2:41 (`duration_sec=160.589`, `playtime=2:41`) | `video-meta-raw.tsv:14` |
| Restaurabilité | Externe uniquement — NON restaurable depuis le dépôt | `WM31-PHYSICAL-FILES-REPORT.md:190-193` |
| Remplacement possible | Aucun média approuvé ; aucun repli YouTube/Vimeo | `video-meta-raw.tsv:14` ; `youtube-ids.tsv` |
| Certitude | HAUTE pour la référence ; source-fichier hors dépôt | — |

### media_id 34577 → leçon 866

| Attribut | Valeur | Preuve |
|----------|--------|--------|
| Source retrouvée | OUI — `_video.source_html5` (`source_video_id=34577`) | `video-meta-raw.tsv:16` |
| URL / chemin historique | `https://chapelleduroyaume.org/wp-content/uploads/2025/06/VIE_COMMUNAUTAIRE_ET_APPARTENANCE_Optimized.mp4` | `video-meta-raw.tsv:16` ; `html5-local-videos.tsv:3` ; `WM31-PHYSICAL-FILES-REPORT.md:186` |
| Titre | « VIE COMMUNAUTAIRE ET APPARTENANCE » (dérivé du nom de fichier) | `video-meta-raw.tsv:16` |
| Leçon liée | 866 — CONFIRMÉE (topic 863) ; ancien ID d'import 34554 | `video-meta-raw.tsv:15-16` ; `t05-lesson-video-meta-keys.tsv:7` |
| Durée | 3:03 (`duration_sec=182.51`, `playtime=3:03`) | `video-meta-raw.tsv:16` |
| Restaurabilité | Externe uniquement — NON restaurable depuis le dépôt | `WM31-PHYSICAL-FILES-REPORT.md:190-193` |
| Remplacement possible | Aucun média approuvé ; aucun repli YouTube/Vimeo | `video-meta-raw.tsv:16` ; `youtube-ids.tsv` |
| Certitude | HAUTE pour la référence ; source-fichier hors dépôt | — |

## 3. Origine commune

Les 3 vidéos sont les **seules vidéos HTML5 auto-hébergées** du site source `chapelleduroyaume.org` (module fondateur 1 : ADN, Principes du Royaume, Vie communautaire), toutes rattachées au **topic 863**. Les 8 autres leçons vidéo du site sont sur YouTube (`t07-video-summary.txt:6,10` ; `youtube-ids.tsv`) et **ne sont pas concernées** par cette réserve.

## 4. Limite de la preuve (honnêteté méthodologique)

- La **référence** (URL, nom, durée, leçon) est prouvée avec certitude HAUTE.
- La **liveness** de l'URL d'origine (HTTP 200 vs 404) **n'a pas été vérifiée** : cela exigerait une requête réseau, exclue par les interdictions (aucun téléchargement, lecture seule). Elle doit être vérifiée au moment de l'exécution humaine.
- Aucune donnée inventée : le titre provient exclusivement du nom de fichier, aucun titre éditorial distinct n'est stocké.

## 5. Conséquence pour R2

Les **sources sont identifiées et prêtes pour une exécution de restauration externe** (voir `WM311-R2-EXECUTION-OPTIONS.md`). La décision `RESTORE_FROM_EXTERNAL_SOURCE` dispose d'une cible concrète par vidéo. PRE-MED-04 **reste FAIL** tant que la restauration (ou le remplacement approuvé) n'est pas exécutée et vérifiée (voir `WM311-PRE-MED-04-REEVALUATION.md`).
