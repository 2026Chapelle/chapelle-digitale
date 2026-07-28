# WM-3.12 — Décision de récupération

- **Lot** : WM-3.12
- **Date** : 2026-07-28
- **Mode** : analyse ; aucune exécution.

## 0. Constat réseau

- 3/3 vidéos obligatoires : **HTTP 404** à l'URL historique (301 → `www.` → 404, page HTML, aucune signature MP4). Voir `WM312-VIDEO-URL-LIVENESS-REPORT.md`.
- `RESTORE_FROM_EXTERNAL_SOURCE` depuis l'URL d'origine : **IMPOSSIBLE** (source supprimée du serveur).

## 1. Recherche de repli (Agent 3, dépôt uniquement)

Résultat : **AUCUN_REPLI** pour les 3 vidéos.

| Piste | Résultat | Preuve |
|-------|----------|--------|
| Autre URL historique (domaine/chemin/année/sous-dossier) | Aucune — une seule URL par vidéo, champs `source_external_url/shortcode/youtube/vimeo/embedded` tous vides | `WM-2/audit-20260720-231559/private/video-meta-raw.tsv:12,14,16` |
| Variante de nom de fichier | Aucune (`t08-attached-files.tsv` : 0 `.mp4/.mov/.m4v/.webm`) | `WM-2/.../evidence/t08-attached-files.tsv` |
| CDN / redirection alternative | Aucune — LiteSpeed CDN & Cloudflare désactivés (`cdn=0`) | `WM-2/.../evidence/30-options-keys.tsv:304-316` |
| Repli YouTube/Vimeo pour 864/865/866 | Aucun — IDs YouTube seulement pour 869-881 | `WM-2/.../private/youtube-ids.tsv:1-8` ; `t07-video-summary.txt:6,8,9` |

## 2. Conséquence sur la chaîne de décision R2

- Voie primaire **`RESTORE_FROM_EXTERNAL_SOURCE`** : ÉCARTÉE (URL 404, aucune source alternative dans le dépôt ni sur le serveur live).
- Voie de repli **`REPLACE_WITH_APPROVED_MEDIA`** : SEULE voie restante — nécessite une **décision humaine** (ré-enregistrement / fourniture d'une vidéo officielle approuvée, puis ré-hébergement). Aucun média approuvé n'existe actuellement dans le dépôt.

## 3. Options possibles (aucune exécutée)

| Option | Faisabilité | Effet PRE-MED-04 |
|--------|-------------|------------------|
| Restaurer depuis une **sauvegarde hors dépôt / hors serveur live** (poste local, backup tiers du serveur WP avant purge) | À vérifier par l'humain — hors portée réseau de ce lot | PASS si octet réel obtenu + ré-hébergé |
| `REPLACE_WITH_APPROVED_MEDIA` (ré-enregistrement / lien officiel approuvé) | Décision humaine requise | PASS après ré-hébergement + référence non-404 |
| Masquer les 3 modules (`status='draft'`) + tracer quarantaine | Applicable immédiatement côté LMS | Ne restaure pas ; lève l'impact « parcours bloqué » mais laisse la réserve média arbitrée |
| Média fictif | **INTERDIT** | — |

## 4. Décision requise

➡️ **`WM312_R2_REPLACEMENT_DECISION_REQUIRED`**

Aucune source exploitable n'est disponible (URL d'origine 404, aucun repli dans le dépôt, aucun repli YouTube/Vimeo/CDN). La suite exige une **décision humaine de remplacement** (`REPLACE_WITH_APPROVED_MEDIA`) ou la production d'une sauvegarde vidéo hors dépôt, sans aucun média fictif. Voir `WM312-PRE-MED-04-REEVALUATION.md`.
