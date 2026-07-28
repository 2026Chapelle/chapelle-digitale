# WM-3.1 — Gap 2 · Qualification individuelle des 27 leçons sans vidéo

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.1` |
| Gap fermé | **G2** — classification ID-level des 27 leçons sans vidéo |
| Population | 38 `lesson` publiées (Tutor LMS 3.9.11) dont **27** sans vidéo |
| Matrice | `WM31-LESSONS-WITHOUT-VIDEO-MATRIX.csv` — 27 lignes de données |
| Leçons non examinées | **0** |

---

## 1. Définition de « sans vidéo »

Une leçon est **sans vidéo** lorsque sa méta `_video` est absente, ou présente mais dont la
`source` est vide / `-1`, ou dont aucune clé `source_*` ne porte de charge utile non vide.

| Mesure | N | Preuve |
|--------|---|--------|
| `lesson` publiées | 38 | WM-2 `55-tutor-content-counts.tsv` `lessons_total=38` |
| Méta `_video` présente **et** exploitable | 11 | WM-2 `t05-tutor-cpt-meta-keys.tsv` `lesson _video 11` |
| **Sans vidéo** | **27** | WM-2 `t07-video-summary.txt` `lessons_without_video=27` |

Réconciliation : `11 + 27 = 38`. ✅

IDs avec vidéo (11) : `864 865 866 869 870 871 872 873 875 878 881`
IDs sans vidéo (27) : `874 1095 1096 1097 1098 1099 1101 1102 1103 1104 1106 1107 1108 1109 1111 1112 1113 1114 1116 1117 1118 1119 1121 1122 1123 1124 1125`

---

## 2. Dimensions examinées pour chaque leçon

| Dimension | Source | Colonne CSV |
|-----------|--------|-------------|
| Texte | `wp_posts.post_content` — longueur HTML, longueur texte brut, nombre de mots, titres `<hN>`, items `<li>` | `content_html_len`, `content_text_len`, `word_count`, `headings`, `list_items` |
| Document | `_tutor_attachments` déréférencé vers `wp_posts` (type MIME, fichier, existence) | `attachments_n`, `attachments_ok`, `attachments_broken`, `attachment_mimes` |
| Contenu | empreinte `sha256` du corps, extrait | `content_sha256_16`, `excerpt_len` |
| Rattachement | `post_parent` → `topics` → `courses`, plus `_tutor_course_id_for_lesson` | `topic_id`, `topic_slug`, `course_id`, `course_slug`, `menu_order` |
| Référence vidéo ailleurs | URL YouTube/Vimeo ou fichier vidéo dans le corps, l'extrait ou toute autre méta ; pièce jointe vidéo ; balise `<iframe>`/`[video]` ; vidéo au niveau du cours parent | `video_reference_elsewhere` |
| Complétude pédagogique | densité rédactionnelle + structure + **marqueur d'inachèvement laissé par l'auteur** | `pedagogical_completeness`, `author_placeholder_found` |

### Constat déterminant

19 des 27 leçons contiennent un **marqueur de rédaction inachevée** explicitement laissé par
l'auteur dans le corps HTML, de la forme :

```
[Insérer vidéo + développement]                                          ×13
[Insérer ici la vidéo enseignement et le développement complet]          ×1
[Insérer vidéo + développement complet]                                  ×1
[Insérer vidéo + développement sur la croix et la résurrection ...]      ×1
[Insérer vidéo + développement sur les marqueurs visibles ...]           ×1
[Insérer vidéo + développement sur les différents types de jeûne ...]    ×1
[Insérer vidéo + méthode SOAP, lectio divina, ou autre]                  ×1
```

Une lecture par volumétrie seule aurait déclaré ces 27 leçons « texte valide ». Elles portent en
réalité une **coquille pédagogique** : titre, verset clé, objectif, section « Activation » —
mais la section « Enseignement » est un emplacement réservé. `placeholder_requests_video=yes`
sur les 19 : l'auteur attendait précisément la vidéo absente.

---

## 3. Résultat — classification exhaustive 27/27

| Classe | N | Décision de migration | Revue humaine |
|--------|---|-----------------------|---------------|
| `TEXT_VALID` | **8** | `MIGRABLE` | non |
| `DOCUMENT_VALID` | **0** | — | — |
| `TEXT_AND_DOCUMENT_VALID` | **0** | — | — |
| `EMPTY` | **0** | — | — |
| `INCOMPLETE` | **19** | `MIGRABLE_AVEC_RESERVE` | **oui** |
| `VIDEO_REFERENCE_FOUND_ELSEWHERE` | **0** | — | — |
| `TO_REVIEW` | **0** | — | — |
| **Total** | **27** | — | — |

### Répartition par décision demandée

| Décision | N | Leçons |
|----------|---|--------|
| Migrable | **8** | 874, 1099, 1104, 1109, 1114, 1119, 1124, 1125 |
| Migrable avec réserve | **19** | les 19 porteuses d'un marqueur `[Insérer …]` |
| Quarantaine | **0** | — |
| Décision humaine | **19** | identiques aux 19 « avec réserve » — `human_review_required=yes` |

`MIGRABLE_AVEC_RESERVE` et « décision humaine » se recouvrent volontairement : la structure est
techniquement exportable, mais la **publication** de ces 19 leçons en l'état est un arbitrage
éditorial et pastoral qui n'appartient pas à la migration.

---

## 4. Matrice complète 27/27

| Leçon | Cours | Topic | Ordre | Mots | H/LI | Marqueur | Classe | Décision |
|-------|-------|-------|-------|------|------|----------|--------|----------|
| 1095 | 736 | 1094 | 1 | 79 | 4/2 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1096 | 736 | 1094 | 2 | 51 | 3/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1097 | 736 | 1094 | 3 | 61 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1098 | 736 | 1094 | 4 | 53 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1099 | 736 | 1094 | 5 | 53 | 4/0 | non | `TEXT_VALID` | `MIGRABLE` |
| 1101 | 736 | 1100 | 1 | 44 | 3/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1102 | 736 | 1100 | 2 | 58 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1103 | 736 | 1100 | 3 | 32 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1104 | 736 | 1100 | 4 | 44 | 4/0 | non | `TEXT_VALID` | `MIGRABLE` |
| 1106 | 736 | 1105 | 1 | 43 | 3/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1107 | 736 | 1105 | 2 | 35 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1108 | 736 | 1105 | 3 | 37 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1109 | 736 | 1105 | 4 | 48 | 4/0 | non | `TEXT_VALID` | `MIGRABLE` |
| 1111 | 736 | 1110 | 1 | 63 | 2/5 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1112 | 736 | 1110 | 2 | 42 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1113 | 736 | 1110 | 3 | 44 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1114 | 736 | 1110 | 4 | 60 | 4/0 | non | `TEXT_VALID` | `MIGRABLE` |
| 1116 | 736 | 1115 | 1 | 75 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1117 | 736 | 1115 | 2 | 38 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1118 | 736 | 1115 | 3 | 38 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1119 | 736 | 1115 | 4 | 51 | 4/0 | non | `TEXT_VALID` | `MIGRABLE` |
| 1121 | 736 | 1120 | 1 | 32 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1122 | 736 | 1120 | 2 | 58 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1123 | 736 | 1120 | 3 | 31 | 2/0 | oui | `INCOMPLETE` | `MIGRABLE_AVEC_RESERVE` |
| 1124 | 736 | 1120 | 4 | 54 | 4/0 | non | `TEXT_VALID` | `MIGRABLE` |
| 1125 | 736 | 1120 | 5 | 103 | 3/2 | non | `TEXT_VALID` | `MIGRABLE` |
| 874 | 867 | 868 | 4 | 218 | 4/9 | non | `TEXT_VALID` | `MIGRABLE` |

---

## 5. Lecture par cours

| Cours | Slug | Leçons sans vidéo | `INCOMPLETE` | `TEXT_VALID` |
|-------|------|-------------------|--------------|--------------|
| 736 | `parcours-3-je-deviens-un-disciple-actif` | 26 | 19 | 7 |
| 867 | `le-chemin-des-elus-7-etapes-...` | 1 | 0 | 1 |
| **Total** | | **27** | **19** | **8** |

Motif remarquable dans le cours 736 : chaque topic suit la séquence
`enseignement (coquille) × N` → `activités pratiques (rédigé)`. Les 6 leçons `x-4/x-5 Activités`
plus la `6-5 Validation finale` sont complètes ; les leçons d'enseignement ne le sont pas.
La leçon 874 (cours 867, « Le Saint-Esprit ») est un texte long et autonome (218 mots, 4 titres,
9 items) sans attente de vidéo.

---

## 6. Mesures agrégées

| Mesure | Valeur |
|--------|--------|
| Mots cumulés sur les 27 | 1 545 |
| Minimum / maximum de mots | 31 / 218 |
| Pièces jointes réelles sur les 27 | **0** |
| Pièces jointes cassées | 0 |
| Référence vidéo trouvée ailleurs | 0 |
| Leçons vides | 0 |

Précision sur `_tutor_attachments` : WM-2 comptait 28 leçons portant cette méta
(`t05-tutor-cpt-meta-keys.tsv`). La lecture des valeurs montre **26 valeurs `a:0:{}` (vides)** et
**2 valeurs non vides** (attachments `34549` et `34553`), toutes deux rattachées à des leçons
**avec** vidéo. Les 27 leçons sans vidéo n'ont donc effectivement **aucun** document. Le compte 28
de WM-2 est un compte de clés, pas de pièces jointes — pas de contradiction.

---

## 7. Constat connexe transmis à WM-4 (hors périmètre Gap 2)

Les 2 pièces jointes ci-dessus (`34549`, `34553`) et les 3 identifiants vidéo HTML5
(`34548`, `34555`, `34577`) référencés par les leçons **avec** vidéo **n'existent pas** dans
`wp_posts` (plage d'IDs 34xxx absente ; ID maximal observé : 1481). Voir
`WM31-PHYSICAL-FILES-REPORT.md` §6 et le contrôle `PRE-MED-04`.

---

## 8. Interdits respectés

Aucune donnée WordPress lue autrement qu'en lecture seule depuis la sauvegarde externe WM-1 ·
aucune écriture · aucun export WM-4 · aucun contenu de leçon recopié intégralement dans Git
(seuls des marqueurs et des mesures sont publiés).
