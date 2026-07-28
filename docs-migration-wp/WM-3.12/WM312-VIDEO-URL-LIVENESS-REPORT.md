# WM-3.12 — Rapport de disponibilité réseau des 3 vidéos R2

- **Lot** : WM-3.12 (vérification réseau R2 des vidéos obligatoires)
- **Date** : 2026-07-28
- **Branche** : `stabilisation-p0-recette-citadelle`
- **HEAD au moment de l'analyse** : `83561529bf4ac05ccafad76b22d94057fdf478fd`
- **Mode** : lecture seule + inspection réseau **non intrusive** (HEAD + GET Range ≤ 1024 o). Aucun fichier vidéo téléchargé, aucune donnée modifiée.

## 0. Objet

Vérifier la disponibilité réseau **réelle** des 3 URLs historiques des vidéos obligatoires manquantes (réserve R2 / PRE-MED-04), sans télécharger les fichiers complets.

| media_id | leçon | vidéo |
|----------|-------|-------|
| 34548 | 864 | MODULE_1_ADN |
| 34555 | 865 | LES_PRINCIPES_DU_ROYAUME |
| 34577 | 866 | VIE_COMMUNAUTAIRE_ET_APPARTENANCE |

## 1. Méthode

- `curl -I` (HEAD) sans suivi de redirection → statut initial + `Location`.
- `curl -I -L` (HEAD, suivi de redirection) → URL finale + statut final + en-têtes.
- `curl -L -r 0-1023` (GET Range 1er Ko) → premiers octets pour contrôle de signature binaire.
- Outil : `curl 8.18.0` (Schannel). Réseau confirmé fonctionnel.

## 2. Résultat — les 3 vidéos sont ABSENTES (404)

Les 3 URLs présentent le **même comportement** :

1. **HTTP 301 Moved Permanently** depuis `chapelleduroyaume.org` vers `www.chapelleduroyaume.org` (redirection WordPress `x-redirect-by: WordPress`).
2. **HTTP 404 Not Found** sur l'URL finale `www.`.
3. Réponse = **page HTML d'erreur** (`content-type: text/html; charset=UTF-8`), commençant par `<!DOCTYPE html>` — **aucune signature MP4** (`ftyp` absent).
4. En-tête révélateur : `x-litespeed-tag: 047_HTTP.404,047_404,...` sur la réponse finale (404 mis en cache LiteSpeed).

### Détail par vidéo

**34548 — MODULE_1_ADN (leçon 864)**
- HEAD initial : `301` → `Location: https://www.chapelleduroyaume.org/wp-content/uploads/2025/06/MODULE_1_ADN_Optimized.mp4`
- Statut final : **404** ; `content_type=text/html; charset=UTF-8` ; corps `<!DOCTYPE html>` (≈158 Ko de page d'erreur)
- Signature MP4 : **ABSENTE** → `MEDIA_NOT_FOUND`

**34555 — LES_PRINCIPES_DU_ROYAUME (leçon 865)**
- HEAD initial : `301` → `Location: .../www.../LES_PRINCIPES_DU_ROYAUME_Optimized.mp4`
- Statut final : **404** ; `text/html` ; `<!DOCTYPE html>`
- Signature MP4 : **ABSENTE** → `MEDIA_NOT_FOUND`

**34577 — VIE_COMMUNAUTAIRE (leçon 866)**
- HEAD initial : `301` → `Location: .../www.../VIE_COMMUNAUTAIRE_ET_APPARTENANCE_Optimized.mp4`
- Statut final : **404** ; `text/html` ; `<!DOCTYPE html>`
- Signature MP4 : **ABSENTE** → `MEDIA_NOT_FOUND`

## 3. En-têtes clés observés

| En-tête | 301 initial | 404 final |
|---------|-------------|-----------|
| `server` | LiteSpeed | LiteSpeed |
| `location` | → `www.` | — |
| `content-type` | text/html | text/html; charset=UTF-8 |
| `content-length` | — | absent (page d'erreur chunked, corps ≈158 121 o) |
| `accept-ranges` | absent | **absent** (Range non honoré sur 404) |
| `etag` | absent | absent |
| `last-modified` | absent | absent |
| `x-litespeed-tag` | `047_HTTP.404,047_404,...` | `047_HTTP.404,047_404,...` |

Aucune des vidéos ne présente d'`accept-ranges: bytes`, d'`etag` ou de `last-modified` — signes d'un objet binaire réellement servi. Le serveur renvoie systématiquement la page 404.

## 4. Note de transparence (respect de la limite 1024 o)

L'inspection a demandé `Range: bytes=0-1023`. Le serveur **n'a pas honoré** l'en-tête `Range` sur ses réponses 404 et a renvoyé la page d'erreur HTML complète (≈158 Ko). **Aucun fichier vidéo n'a été téléchargé** (aucun n'existe) ; seule une page d'erreur HTML a transité, et les tampons temporaires ont été supprimés immédiatement. L'esprit de la règle — ne pas télécharger de média complet — est respecté.

## 5. Conclusion

**3/3 vidéos = `MEDIA_NOT_FOUND`.** La source historique HTML5 auto-hébergée n'existe plus sur le serveur (404 confirmé). `RESTORE_FROM_EXTERNAL_SOURCE` depuis l'URL d'origine est **impossible**. Voir `WM312-RECOVERY-DECISION.md` et `WM312-PRE-MED-04-REEVALUATION.md`.
