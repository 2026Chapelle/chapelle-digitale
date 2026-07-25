# WM-3 — ADR LMS : modèle cible Citadelle (verrouillé)

| Champ | Valeur |
|-------|--------|
| ID | ADR-WM3-LMS-001 |
| Date | 2026-07-20 |
| Statut | **ACCEPTÉ / VERROUILLÉ** |
| Entrées | WM-2 `audit-20260720-231559` · migrations locales Citadelle |
| Sortie attendue | Cible unique pour WM-4/5 |

## Contexte

Trois univers formation coexistent en migrations locales Citadelle :

1. **Legacy** : `formations` + `modules_formation` + `lecons`
2. **LMS actuel** : `formations` + `formation_modules` (+ `youtube_id`, hybrid video) + `module_completions` / `video_progress`
3. **Académie** : `academy_*` (parcours 6×20)

WordPress Tutor LMS (WM-2) :

- CPT : `courses` → `topics` → `lesson` (+ `tutor_enrolled`)
- 7 cours (5 publish, 2 private) · 10 topics · 38 lessons · 33 enrollments (cours 732 uniquement)
- Tables `wp_tutor_*` **toutes vides** (quiz/orders/progress fine absents)
- Vidéos : YouTube non répertorié (8 IDs) + 3 HTML5 locaux

## Décision

**Modèle d’import WP → Citadelle = univers (2) uniquement.**

| Entité WP | Cible Citadelle | Règle |
|------------|-----------------|-------|
| `courses` (publish) | `public.formations` | 1 cours → 1 formation ; slug conservé si unique |
| `topics` | **Non table dédiée** | Regroupement logique : préfixe titre leçon `« Topic — »` + plages d’`ordre` contiguës |
| `lesson` | `public.formation_modules` | 1 leçon → 1 module plat ; `ordre` = `menu_order` global recalculé |
| YouTube unlisted | `formation_modules.youtube_id` | ID seul · **ne pas télécharger** · `type='youtube'` |
| HTML5 / URL | `formation_modules.video_url` (+ storage ultérieur WM-4/5) | `type='video'` |
| `tutor_enrolled` | Archive WM-4 **puis** éventuel `inscriptions_formation` | **progression = 0**, `statut='actif'`, **jamais** `video_progress` / `module_completions` depuis WP |
| Quiz / orders Tutor | — | **ABANDONNER** (volume 0) |
| `academy_*` | — | **Hors import WP direct** |
| `modules_formation` / `lecons` | — | **Non utilisés** pour le chemin d’import WP |

## Cours déjà seedés Citadelle

Slugs WP alignés sur seeds locaux (`20260604115000_*`, `20260604100000_*`, `20260604117000_*`) :

| WP ID | slug | Action mapping |
|-------|------|----------------|
| 732 | `parcours-1-je-decouvre-la-maison` | **RAPPROCHER** par slug (ne pas dupliquer) |
| 734 | `parcours-2-je-stabilise-ma-foi` | **RAPPROCHER** (shell vide WP — privilégier seed Citadelle) |
| 736 | `parcours-3-je-deviens-un-disciple-actif` | **RAPPROCHER** slug ; modules/leçons WP → combler `formation_modules` manquants |
| 738 | `ecole-des-appeles` | **IMPORTER** shell ou **RECRÉER** contenu (shell vide) |
| 867 | `le-chemin-des-elus-…` | **IMPORTER** formation + modules |
| 876, 879 | private | **HORS CATALOGUE PUBLIC** sauf GO métier explicite |

## Alternatives rejetées

| Option | Motif de rejet |
|--------|----------------|
| Import dans `modules_formation`+`lecons` | Schéma legacy ; `video_progress` référence `formation_modules` |
| Import direct `academy_*` | Modèle 6×20 distinct ; hors correspondance Tutor |
| Progression Tutor active | Décision validée WM-0/2 : ARCHIVER ; status enroll `completed` sémantiquement ambigu |

## Conséquences pour lots suivants

- **WM-4** : exports normalisés conformes à ce schéma uniquement.
- **WM-5** : scripts d’upsert ciblent `formations` / `formation_modules` / `inscriptions_formation` (niveau initial).
- **Interdit** : écrire `video_progress` depuis données WP ; importer roles admin WP ; migrer passwords.

## Preuves

- Schéma : `001_initial_schema.sql`, `20260531100200_lms_formation_modules.sql`, `20260604140000_video_progress.sql`, `20260604160000_video_hybrid_source.sql`
- Audit : `WM2-TUTOR-INVENTORY.json`, `WM2-COUNTS.json`, `WM2-DECISION-MATRIX.csv`

## Marqueur ADR

`WM3_ADR_LMS_LOCKED`
