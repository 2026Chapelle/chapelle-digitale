# WM-3.2 — R2 · Cinq médias manquants (dossier de décision)

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.2` |
| Réserve traitée | **R2** — contrôle `PRE-MED-04` **BLOQUANT en échec** |
| Source de preuve | `WM-3.1/WM31-PHYSICAL-FILES-REPORT.md` §6 · `WM31-LESSONS-WITHOUT-VIDEO-REPORT.md` §6-7 · `WM31-WM4-EXPORT-CONTRACT.md` §5.1 (`QU-MED-MISSING-REFERENCE`) |
| Nature | **analyse + dossier de décision uniquement** — aucune donnée modifiée, aucun média créé |
| Matrice | `WM32-R2-MISSING-MEDIA-MATRIX.csv` — 5 lignes |

> Les 5 références ne sont **pas** dans les 383 fichiers inventoriés et n'appartiennent à aucun
> terme de l'équation de réconciliation média. Ce sont des **références orphelines** : un objet est
> pointé, mais n'existe ni en base (`wp_posts`, ID max 1481) ni sur disque (sauvegarde WM-1).

---

## 1. Les cinq références (ancré WM-3.1)

### 1.1 Trois vidéos HTML5 (leçons **avec** vidéo)

| ID | Leçon | URL référencée (`_video.source_html5`) | Type attendu |
|----|-------|----------------------------------------|--------------|
| `34548` | 864 | `…/wp-content/uploads/2025/06/MODULE_1_ADN_Optimized.mp4` | vidéo MP4 HTML5 |
| `34555` | 865 | `…/wp-content/uploads/2025/06/LES_PRINCIPES_DU_ROYAUME_Optimized.mp4` | vidéo MP4 HTML5 |
| `34577` | 866 | `…/wp-content/uploads/2025/06/VIE_COMMUNAUTAIRE_ET_APPARTENANCE_Optimized.mp4` | vidéo MP4 HTML5 |

### 1.2 Deux pièces jointes de leçon (`_tutor_attachments` non vide)

| ID | Rattachement | Type attendu | Nom / URL |
|----|--------------|--------------|-----------|
| `34549` | leçon **avec** vidéo (non précisée exactement en WM-3.1) | document (MIME inconnu) | **inconnu — non publié** |
| `34553` | leçon **avec** vidéo (non précisée exactement en WM-3.1) | document (MIME inconnu) | **inconnu — non publié** |

---

## 2. Preuves d'absence (double)

| Preuve | Constat |
|--------|---------|
| **Absence en base** | Les IDs `34xxx` sont hors plage : ID maximal observé dans `wp_posts` = **1481**. Aucun des 5 n'existe comme `attachment`. |
| **Absence sur disque** | Le répertoire `2025/06` **n'existe pas** dans les 383 fichiers (seul `2026/` présent). Aucun `.mp4` dans l'inventaire (`by_extension` sans `.mp4`). Aucun fichier rattaché aux pièces jointes `34549`/`34553`. |

Les octets vidéo ne sont donc **pas disponibles dans la sauvegarde WM-1** si un rapatriement
devenait nécessaire. La règle WM-3 « 3 MP4/HTML5 → `video_url` » reste valide **en tant que règle**
(l'URL est référencée, non rapatriée), mais l'URL pointe vers l'ancien domaine WordPress.

---

## 3. Caractère obligatoire / facultatif

| Référence | Caractère | Raison |
|-----------|-----------|--------|
| `34548`, `34555`, `34577` | **OBLIGATOIRE** | vidéos d'enseignement **principales** de leurs leçons (864/865/866) — cœur pédagogique |
| `34549`, `34553` | **FACULTATIF** | pièces jointes annexes de leçons **déjà pourvues d'une vidéo** ; la leçon reste complète sans elles |

---

## 4. Options possibles

| Option | Description | Applicabilité |
|--------|-------------|---------------|
| `RESTORE_FROM_EXTERNAL_SOURCE` | Rapatrier le `.mp4` depuis le serveur WP live ou une autre sauvegarde | 3 vidéos — **si** une source détient encore les fichiers |
| `REPLACE_WITH_APPROVED_MEDIA` | Ré-héberger la vidéo (YouTube / Supabase Storage) et renseigner `youtube_id`/`video_url` | 3 vidéos — repli si restauration impossible |
| `MIGRATE_WITHOUT_MEDIA` | Migrer la leçon sans le média (référence annexe abandonnée) | 2 pièces jointes ; envisageable en dégradé pour les vidéos |
| `QUARANTINE_CONTENT` | Suspendre la leçon entière en attente | non nécessaire (leçons par ailleurs valides) |
| `ABANDON_REFERENCE` | Supprimer la référence orpheline du mapping | 2 pièces jointes facultatives |
| `BLOCK_CONTENT_MIGRATION` | Bloquer la migration de contenu globale | non — seules 5 références sont concernées, pas le corpus |

---

## 5. Recommandation Claude

| Référence(s) | Recommandation primaire | Repli | Conséquence si non traité |
|--------------|-------------------------|-------|---------------------------|
| `34548` `34555` `34577` (vidéos) | `RESTORE_FROM_EXTERNAL_SOURCE` (vérifier serveur WP live / autres sauvegardes) | `REPLACE_WITH_APPROVED_MEDIA` (re-upload YouTube/Storage), sinon `MIGRATE_WITHOUT_MEDIA` en dégradé | leçons 864/865/866 sans vidéo d'enseignement, ou `video_url` vers une URL morte (404) |
| `34549` `34553` (pièces jointes) | `MIGRATE_WITHOUT_MEDIA` | `ABANDON_REFERENCE` | pièce jointe annexe manquante ; leçon complète via sa vidéo |

**Transversal :** ne **jamais** créer de média fictif ni de fichier de substitution non validé.
`BLOCK_CONTENT_MIGRATION` est **disproportionné** : `PRE-MED-04` isole exactement ces 5 références
via `QU-MED-MISSING-REFERENCE`, le reste du corpus média (69 exportables) n'est pas concerné.

---

## 6. Interdits respectés

Aucun média fictif créé · aucun fichier de substitution · aucune donnée source ou cible modifiée ·
sauvegarde WM-1 lue en seule lecture · aucune URL réécrite · aucun octet vidéo rapatrié.
