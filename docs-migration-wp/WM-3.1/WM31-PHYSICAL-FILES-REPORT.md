# WM-3.1 — Gap 3 · Classement des 383 fichiers physiques

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.1` |
| Gap fermé | **G3** — le comptage 383 n'était porté par aucun livrable WM-3 |
| Racine inventoriée | `…/backup-20260720-111659/restore-test/files-extract/public_html/wp-content/uploads` (sauvegarde externe WM-1, **lecture seule**) |
| Fichiers inventoriés | **383** |
| Octets cumulés | **101 219 207** |
| Inventaire | `WM31-PHYSICAL-FILES-INVENTORY.csv` — 383 lignes de données, 24 colonnes |
| Fichiers non classés | **0** |

---

## 1. Attributs relevés par fichier

| Attribut demandé | Colonne | Couverture |
|------------------|---------|------------|
| Chemin relatif | `rel_path` | 383/383 |
| Nom | `file_name` | 383/383 |
| Extension | `extension` | 383/383 |
| Taille | `size_bytes` | 383/383 |
| Type MIME | `mime_type` + `mime_source` (`magic` ou `extension`) | 383/383 |
| Checksum | `sha256` (SHA-256 complet) | 383/383 |
| Dimensions | `width` / `height` (en-tête PNG et JPEG SOF) | 371/371 images · non applicable aux 12 non-images |
| Référence WordPress | `wp_attachment_id`, `wp_reference_role`, `wp_parent_post` | 373/383 (10 fichiers hors médiathèque) |
| Contenu utilisateur | `user_content` (arborescence `AAAA/MM`) | 383/383 |
| Relation avec un original | `derived_from` (dérivé du motif `-LxH`) | 300/300 variantes |
| État d'utilisation | `referenced_in_content` + `reference_signals` | 383/383 |

`mime_source=magic` : le type est confirmé par les octets d'en-tête (signature PNG, `FF D8 FF`,
`%PDF`, …), pas seulement déduit de l'extension. **373** fichiers sur 383 sont confirmés par
signature ; les 10 restants (`.css`, `.xml`, `.txt`) sont typés par extension.

### Détection d'utilisation — correction méthodologique

Un fichier de médiathèque est trivialement cité par sa **propre** métadonnée
(`_wp_attached_file`, `_wp_attachment_metadata`). Ces auto-références sont **exclues** du corpus
de recherche, sans quoi les 383 fichiers apparaîtraient « utilisés ». Les signaux retenus sont :

| Signal | Sens |
|--------|------|
| `path_in_content` / `filename_in_content` | cité dans le corps, l'extrait ou le `guid` d'un post non-attachment, ou dans une méta tierce |
| `featured_image` | désigné par un `_thumbnail_id` |
| `attached_to_post:<id>` | `post_parent` pointant vers un post existant |

---

## 2. Résultat — classement exhaustif 383/383

| Classe | N | Octets | Action WM-4 |
|--------|---|--------|-------------|
| `ORIGINAL_USED` | **60** | 33 397 037 | `EXPORTABLE` |
| `ORIGINAL_UNUSED` | **9** | 5 156 878 | `EXPORTABLE` |
| `THUMBNAIL` | **281** | 56 730 040 | `REJECTED_REGENERABLE` |
| `GENERATED_VARIANT` | **8** | 37 125 | `REJECTED_REGENERABLE` |
| `EXACT_DUPLICATE` | **23** | 4 786 854 | `REJECTED_DEDUP` |
| `PROBABLE_DUPLICATE` | **0** | 0 | — |
| `ORPHAN` | **1** | 1 111 273 | `QUARANTINED` |
| `REFERENCED_MISSING_CONTEXT` | **0** | 0 | — |
| `CORRUPT` | **1** | 0 | `REJECTED_CORRUPT` |
| `UNCLASSIFIED_REVIEW_REQUIRED` | **0** | 0 | — |
| **Total** | **383** | **101 219 207** | — |

Réconciliation : `60 + 9 + 281 + 8 + 23 + 0 + 1 + 0 + 1 + 0 = 383`. ✅
Somme des octets par classe = 101 219 207 = `uploads_bytes` de WM-2 `uploads-summary.txt`. ✅

### Réconciliation croisée par origine

| Origine | N | Ventilation |
|---------|---|-------------|
| Originaux déclarés en base (`_wp_attached_file`) | 73 | 60 `ORIGINAL_USED` + 9 `ORIGINAL_UNUSED` + 4 `EXACT_DUPLICATE` |
| Variantes déclarées en base (`_wp_attachment_metadata.sizes`) | 300 | 281 `THUMBNAIL` + 19 `EXACT_DUPLICATE` |
| Hors médiathèque | 10 | 8 `GENERATED_VARIANT` + 1 `ORPHAN` + 1 `CORRUPT` |
| **Total** | **383** | ✅ |

Les 73 originaux déclarés en base sont **tous** présents sur disque
(`wp_originals_declared_missing_on_disk = []`) : aucun `REFERENCED_MISSING_CONTEXT` de ce type.

---

## 3. Doublons exacts — prouvés par checksum

| Mesure | Valeur |
|--------|--------|
| Checksums SHA-256 distincts | **360** |
| Groupes de doublons exacts | **23** |
| Fichiers impliqués | **46** |
| Copies redondantes (rejetées) | **23** |
| Octets récupérables | 4 786 854 |

`383 − 360 = 23` copies redondantes. ✅

Cause racine : **4 médias téléversés deux fois**, WordPress ayant suffixé le second exemplaire
en `-1` et régénéré la totalité de ses vignettes.

| Média dupliqué | Groupes de checksum | Fichiers redondants |
|----------------|---------------------|---------------------|
| `2026/05/Parcours-dintegration.png` | 6 | 6 |
| `2026/05/cropped-Logo-facion-chapelle.png` | 7 | 7 |
| `2026/05/f09f9191-le-retour-des-herit.jpg` | 5 | 5 |
| `2026/05/ouragan.png` | 5 | 5 |
| **Total** | **23** | **23** |

Règle de conservation (`duplicate_keeper`) : original déclaré en base > référencé dans le contenu >
plus petit `attachment_id` > chemin le plus court > ordre lexicographique. Le groupe complet est
tracé par `duplicate_group_sha` ; le détail exhaustif figure dans
`evidence/gap3-files-summary.json` → `duplicate_groups_detail`.

`PROBABLE_DUPLICATE = 0` : aucune paire ne partage (taille, extension, largeur, hauteur) sans
partager également son checksum. Tous les doublons sont donc **exacts et prouvés**, aucun présumé.

---

## 4. Fichiers hors médiathèque (10)

| Fichier | Octets | Classe | Justification |
|---------|--------|--------|---------------|
| `elementor/css/base-desktop.css` | 5 338 | `GENERATED_VARIANT` | cache CSS régénérable |
| `elementor/css/post-11.css` | 3 290 | `GENERATED_VARIANT` | idem |
| `elementor/css/post-31.css` | 183 | `GENERATED_VARIANT` | idem |
| `elementor/css/post-1473.css` | 77 | `GENERATED_VARIANT` | idem |
| `rank-math/rank_math_090fad….xml` | 17 382 | `GENERATED_VARIANT` | export SEO régénérable |
| `rank-math/rank_math_152186….xml` | 8 804 | `GENERATED_VARIANT` | idem |
| `rank-math/rank_math_625060….xml` | 1 437 | `GENERATED_VARIANT` | idem |
| `rank-math/rank_math_ee736d….xml` | 614 | `GENERATED_VARIANT` | idem |
| `temp_abj404_solution/abj404_debug_6b3df31158f638.txt` | 1 111 273 | `ORPHAN` | journal de débogage de plugin, aucune référence en base |
| `temp_abj404_solution/sync_mode_options.txt` | **0** | `CORRUPT` | fichier de taille nulle (`corrupt_signal=zero_byte`) |

Aucune de ces 10 entrées ne relève de la migration de contenu.
Le seul `QUARANTINED` du lot média est le journal de débogage de 1,1 Mo : il n'est pas un contenu
utilisateur, mais son volume et sa nature justifient une décision explicite plutôt qu'un rejet
silencieux.

---

## 5. Ventilations

| Extension | N | Cohérence WM-2 `uploads-by-extension.tsv` |
|-----------|---|-------------------------------------------|
| `.png` | 336 | ✅ 336 |
| `.jpg` | 35 | ✅ 35 |
| `.css` | 4 | ✅ 4 |
| `.xml` | 4 | ✅ 4 |
| `.pdf` | 2 | ✅ 2 |
| `.txt` | 2 | ✅ 2 |
| **Total** | **383** | ✅ 383 |

| Répertoire racine | N | Octets | Cohérence WM-2 `uploads-top-dirs.tsv` |
|-------------------|---|--------|---------------------------------------|
| `2026` | 373 | 100 070 809 | ✅ |
| `elementor` | 4 | 8 888 | ✅ |
| `rank-math` | 4 | 28 237 | ✅ |
| `temp_abj404_solution` | 2 | 1 111 273 | ✅ |

| Type MIME (par signature) | N | Cohérence WM-2 `t08-mime.tsv` (base) |
|---------------------------|---|--------------------------------------|
| `image/png` | 336 | 64 originaux PNG déclarés — dont 61 conservés + 3 dédupliqués |
| `image/jpeg` | 35 | 7 originaux JPEG déclarés — dont 6 conservés + 1 dédupliqué |
| `application/pdf` | 2 | ✅ 2 |
| `text/css`, `application/xml`, `text/plain` | 10 | hors médiathèque |

`64 + 7 + 2 = 73` attachments en base — concordant avec WM-2 `t08-media-db-agg.tsv`. ✅

### Rectification d'un chiffre WM-3

WM-3 `WM3-REPORT.md` §7 annonçait « ~83 originaux / ~300 thumbs ». La mesure ancrée sur la base
donne **73 originaux déclarés** et **300 variantes déclarées**. Le chiffre 83 provenait de
l'heuristique de nommage de WM-2 (`t08-dup-size-summary.txt` `originals=83`), qui compte comme
originaux des fichiers ne portant pas le motif `-LxH` mais absents de la médiathèque. Le chiffre
retenu pour WM-4 est **73**, prouvé par `_wp_attached_file`.

De même, WM-2 `t08-dup-size-summary.txt` annonçait `dup_size_groups=4` sur un échantillonnage. La
passe checksum intégrale de WM-3.1 en établit **23**, tous prouvés.

---

## 6. Références sans fichier — constat bloquant pour WM-4

Trois vidéos HTML5 sont référencées par les leçons **avec** vidéo, par URL absolue :

| Leçon | URL référencée dans `_video.source_html5` | `source_video_id` |
|-------|-------------------------------------------|-------------------|
| 864 | `…/wp-content/uploads/2025/06/MODULE_1_ADN_Optimized.mp4` | `34548` |
| 865 | `…/wp-content/uploads/2025/06/LES_PRINCIPES_DU_ROYAUME_Optimized.mp4` | `34555` |
| 866 | `…/wp-content/uploads/2025/06/VIE_COMMUNAUTAIRE_ET_APPARTENANCE_Optimized.mp4` | `34577` |

Constats :

1. Le répertoire `2025/06` **n'existe pas** dans les 383 fichiers ; seul `2026/` est présent.
2. Aucun fichier `.mp4` ne figure dans l'inventaire (`by_extension` ne contient pas `.mp4`).
3. Les IDs `34548`, `34555`, `34577` — ainsi que les pièces jointes de leçon `34549` et `34553` —
   **n'existent pas** dans `wp_posts` (ID maximal observé : 1481).

Ces cinq références pointent donc vers des objets absents **de la base et de la sauvegarde
fichiers**. Ce ne sont pas des fichiers à classer (ils ne sont pas dans les 383) mais des
**références orphelines**, traitées par le contrôle pré-export `PRE-MED-04`.

Conséquence : la décision WM-3 « 3 MP4/HTML5 → `video_url` » reste valide **en tant que règle**
(l'URL est référencée, non rapatriée), mais aucun octet vidéo n'est disponible dans la sauvegarde
si un rapatriement devenait nécessaire.

---

## 7. Ventilation pour WM-4

| Action | N | Octets |
|--------|---|--------|
| `EXPORTABLE` | **69** | 38 553 915 |
| `REJECTED_REGENERABLE` | 289 | 56 767 165 |
| `REJECTED_DEDUP` | 23 | 4 786 854 |
| `REJECTED_CORRUPT` | 1 | 0 |
| `QUARANTINED` | 1 | 1 111 273 |
| **Total** | **383** | **101 219 207** |

`SOURCE_TOTAL(383) = EXPORTABLE(69) + REJECTED(313) + QUARANTINED(1)`. ✅

Les 9 `ORIGINAL_UNUSED` restent `EXPORTABLE` par conformité à la décision WM-3 verrouillée
(`domain-decisions.csv` → `medias_originaux = IMPORTER`), qui ne conditionne pas l'import à
l'usage. Le contrôle `PRE-MED-03` les signale sans bloquer.

---

## 8. Interdits respectés

Sauvegarde externe WM-1 lue en seule lecture, ni déplacée ni modifiée · aucun fichier binaire,
archive ou base SQL ajouté au dépôt · aucun contenu utilisateur recopié · aucun export WM-4
produit · aucune donnée WordPress, Supabase ou Citadelle modifiée.
