# WM-3.12 — FINAL STATUS (vérification réseau R2)

- **Lot** : WM-3.12 — vérification réseau des 3 vidéos obligatoires R2
- **Date** : 2026-07-28
- **Branche** : `stabilisation-p0-recette-citadelle`
- **HEAD au moment de l'analyse** : `83561529bf4ac05ccafad76b22d94057fdf478fd`
- **Mode** : lecture seule + inspection réseau non intrusive (HEAD + GET Range ≤ 1024 o). Aucun téléchargement complet, aucun upload, aucune modification (WordPress / Citadelle / Supabase / leçons), aucun commit / push / déploiement.

## Verdict

## `WM312_R2_REPLACEMENT_DECISION_REQUIRED`

Aucune source vidéo exploitable n'est disponible : les 3 URLs historiques renvoient HTTP 404 et aucun repli (URL alternative, variante de nom, CDN, YouTube/Vimeo) n'existe dans le dépôt. La voie `RESTORE_FROM_EXTERNAL_SOURCE` est écartée ; seule reste `REPLACE_WITH_APPROVED_MEDIA`, qui exige une décision humaine.

## PRE-MED-04

**FAIL** (inchangé) — reste FAIL tant que les vidéos ne sont pas réellement rattachées ou remplacées.

## Résultat par vidéo

| media_id | Leçon | HEAD | Range GET | Content-Type | Signature MP4 | Verdict liveness |
|----------|-------|------|-----------|--------------|---------------|------------------|
| 34548 | 864 | 301 | 404 | text/html | ABSENTE | `MEDIA_NOT_FOUND` |
| 34555 | 865 | 301 | 404 | text/html | ABSENTE | `MEDIA_NOT_FOUND` |
| 34577 | 866 | 301 | 404 | text/html | ABSENTE | `MEDIA_NOT_FOUND` |

## Codes HTTP

- Étape 1 : `301 Moved Permanently` → `www.chapelleduroyaume.org` (redirection WordPress).
- Étape 2 : `404 Not Found` (page HTML d'erreur, `x-litespeed-tag: 047_HTTP.404`).

## Preuve de validité MP4

Aucune. Les 3 corps commencent par `<!DOCTYPE html>` (hex `3c21 444f 4354 5950...`), sans box `ftyp`. `content-type: text/html` sur les 3. Ce ne sont pas des vidéos.

## Sources récupérables

**Aucune.** URL d'origine 404 ; aucun repli dans le dépôt (Agent 3 : `AUCUN_REPLI` × 3) ; aucun repli YouTube/Vimeo ; CDN désactivé côté serveur. Aucune sauvegarde WM-1 versionnée.

## Action humaine restante

1. Rechercher une **sauvegarde vidéo hors dépôt / hors serveur live** (poste local, backup WP antérieur à la purge) — hors portée réseau de ce lot.
2. À défaut : **`REPLACE_WITH_APPROVED_MEDIA`** — fournir une vidéo officielle approuvée (ré-enregistrement / lien officiel), ré-héberger, renseigner `youtube_id` XOR `video_url`, vérifier non-404.
3. Option de dégradation tracée : masquer les 3 modules (`status='draft'`) + quarantaine `QU-MED-MISSING-REFERENCE`.
4. **Aucun média fictif.**

## Impact sur PRE-MED-04

Confirmé **FAIL**. La preuve réseau durcit le constat : la restauration depuis la source d'origine est impossible. Le passage à PASS exige un octet vidéo réel (remplacement approuvé ou sauvegarde hors dépôt), ré-hébergé et référencé sans 404.

## Impact sur WM-4

**WM-4 reste NO-GO.**

## Livrables du lot

- `WM312-VIDEO-URL-LIVENESS-REPORT.md`
- `WM312-HTTP-EVIDENCE-MATRIX.csv`
- `WM312-MEDIA-SIGNATURE-CONTROL.md`
- `WM312-RECOVERY-DECISION.md`
- `WM312-PRE-MED-04-REEVALUATION.md`
- `WM312-FINAL-STATUS.md`
- `manifests/WM312-MANIFEST.json`
- `manifests/SHA256SUMS.txt`
