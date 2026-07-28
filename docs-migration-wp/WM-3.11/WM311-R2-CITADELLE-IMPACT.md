# WM-3.11 — R2 / PRE-MED-04 — Impact applicatif Citadelle / LMS

- **Lot** : WM-3.11 (R2)
- **Date** : 2026-07-28
- **Mode** : lecture seule (analyse code + schéma, aucune modification).

## 0. Nature exacte des leçons 864/865/866

Ce ne sont pas des leçons « texte sans vidéo ». Ce sont 3 leçons Tutor LMS qui **référencent une vidéo dont le fichier physique n'existe plus** (voir `WM311-R2-VIDEO-RECOVERY-EVIDENCE.md`). Elles appartiennent au cours 867 `le-chemin-des-elus`, dont l'action de mapping est **IMPORTER formation + modules** (`WM3-ADR-LMS.md:52`).

**Elles ne sont pas encore dans la base Citadelle** : aucun export WM-4 n'a été produit (`WM31-FINAL-VERDICT.md:107`). L'impact décrit est donc l'impact **au moment de l'import**, pas un bug live actuel.

## 1. Modélisation cible (Citadelle)

Import WP → LMS `formations` + `formation_modules` (l'Académie `academy_*` est hors import : `WM3-ADR-LMS.md:39`).

- `formation_modules` : `youtube_id`, `video_url`, `pdf_url`, `type`, `status` (draft|published) — `supabase/migrations/20260531100200_lms_formation_modules.sql:16-25`.
- Hybride : `source_video` ('youtube'|'internal'|'none') + `video_path` (bucket privé) — `20260604160000_video_hybrid_source.sql:11-12`.
- Progression : `module_completions` (unique user/module) + `video_progress` (percent_watched, completed) — `20260531100200:38-45`, `20260604140000_video_progress.sql:10-22`.

Résolution vidéo (lib pure) :
- `resolveVideoSource` : 'youtube' si `youtube_id`, 'internal' si `video_url`/`video_path`, sinon 'none' — `video-validation.ts:47-53`.
- `hasPlayableVideo` : internal jouable **dès que `video_url` OU `video_path` est renseigné** — `video-validation.ts:96-102`. **Point crucial : une `video_url` morte (404) rend quand même `hasPlayableVideo = true`** (`:100-101`).

## 2. Validation 90 % et verrouillages

- Seuil `WATCH_THRESHOLD = 90` — `video-validation.ts:10`.
- Validation serveur anti-contournement : module terminé seulement si `video_progress.percent_watched ≥ 90` — `progress/route.ts:92-99`.
- **Module sans vidéo jouable = non-validable** : `if (!hasPlayableVideo(mod)) return 403 'Module en préparation : validation indisponible.'` — `progress/route.ts:69`.
- Verrous : inter-parcours P1→P2→P3 (`progress/route.ts:57-62`), inscription obligatoire, statut minimal, prérequis module, verrou quotidien.
- PDF déverrouillé uniquement après validation ≥ 90 % — `video-validation.ts:36-38`.

## 3. Comportement membre selon le remplissage à l'import

**Scénario A — `video_url` = URL WordPress morte** (règle WM-3 « 3 MP4 → `video_url` ») :
- `hasPlayableVideo = true` → l'UI rend le lecteur pointant vers une **URL 404** → lecteur cassé, aucune progression enregistrable.
- `video_progress` ne peut jamais atteindre 90 % → validation refusée serveur → **module jamais validable**.

**Scénario B — vidéo vide (`none`)** :
- `hasPlayableVideo = false` → **pas d'affichage cassé** : « Vidéo bientôt disponible / Module en préparation », bouton « Marquer terminé » désactivé — `formations/[slug]/page.tsx:346-361`.
- Validation bloquée serveur (`progress/route.ts:69`).

**Impact commun (le plus important) — progression du parcours bloquée :**
`recompute` calcule la progression sur **tous** les modules `status='published'` (`progress/route.ts:25-31`). Un module publié non-validable reste au dénominateur, jamais au numérateur → **la formation ne peut jamais atteindre 100 %** → pas de certificat, pas de montée de statut membre, pas de Certificat d'Intégration CIER, pas de déblocage Académie (`progress/route.ts:110-149`). Si posés en `prerequis_module_id`, tout l'aval se verrouille (`modules/route.ts:112`).

**Le cours n'est PAS globalement inaccessible** : les autres modules restent consultables (verrous par-module). C'est la **complétion/certification** qui est cassée, pas l'accès.

## 4. Leviers existants (masquage / quarantaine / remplacement)

| Levier | Traduction technique | Effet |
|--------|----------------------|-------|
| Masquage / dépublication | `status='draft'` (`admin/modules/page.tsx:82` ; filtres `status='published'` partout) | Module retiré du dénominateur → parcours redevient complétable sans lui |
| Remplacement média a posteriori | CRUD admin `source_video`/`youtube_id`/`video_url` ; bucket privé `media-videos` + URL signée (`20260604160000:23-30`) | Vidéo jouable, validation 90 % possible |
| Quarantaine | Pas de statut applicatif dédié → équivalent = `draft` + ligne `quarantine.csv` (mécanisme migration) | Leçon suspendue, invisible membre |

## 5. Conclusion

- **Aucun impact live actuel** (leçons non encore importées).
- **Impact à l'import si non traitées** : parcours `le-chemin-des-elus` structurellement non complétable à 100 %.
- Le code offre déjà tous les leviers ; ce qui manque pour un PASS plein n'est **pas du code** mais **une source vidéo réelle** ré-hébergée et référencée, sans média fictif (condition R2 encore ouverte).
