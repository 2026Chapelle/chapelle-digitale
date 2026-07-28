# WM-3.12 — Ré-évaluation PRE-MED-04

- **Lot** : WM-3.12
- **Date** : 2026-07-28
- **Contrôle** : PRE-MED-04 — *« 0 référence média pointant vers un objet absent de la base ET du disque »* (`WM-3.1/WM31-WM4-EXPORT-CONTRACT.md:277`).

## 0. Statut

**PRE-MED-04 = FAIL** (inchangé).

PRE-MED-04 reste FAIL **tant que les vidéos ne sont pas réellement rattachées ou remplacées**.

## 1. Apport de WM-3.12

WM-3.11 avait identifié les URLs sources (certitude HAUTE) mais **différé** la vérification de disponibilité (200 vs 404) à l'exécution humaine. WM-3.12 **produit cette preuve réseau** :

- Les 3 URLs historiques renvoient **HTTP 404** (301 → `www.` → 404), page HTML, aucune signature MP4.
- Aucun repli (URL alternative, variante de nom, CDN, YouTube/Vimeo) n'existe dans le dépôt.

**Effet** : la voie primaire `RESTORE_FROM_EXTERNAL_SOURCE` (depuis l'URL d'origine) est **définitivement écartée** — la source n'existe plus en ligne. Le blocage résiduel PRE-MED-04 sur les 3 vidéos n'est plus « à vérifier » mais « source d'origine confirmée absente ».

## 2. Décompte des références vidéo

| media_id | Leçon | URL d'origine | Repli dépôt | PRE-MED-04 |
|----------|-------|---------------|-------------|------------|
| 34548 | 864 | 404 | aucun | FAIL |
| 34555 | 865 | 404 | aucun | FAIL |
| 34577 | 866 | 404 | aucun | FAIL |

Les 2 pièces jointes facultatives (34549/34553) restent traitées par WM-3.11 (`MIGRATE_WITHOUT_MEDIA` / `ABANDON_REFERENCE`, levables par décision tracée) et ne sont pas l'objet de ce lot réseau.

## 3. Conditions EXACTES pour PRE-MED-04 → PASS (mises à jour)

Un PASS plein exige désormais, pour **chaque** leçon 864/865/866 :
1. Obtenir un **octet vidéo réel** — non plus par l'URL d'origine (404), mais soit par une **sauvegarde hors dépôt / hors serveur live** (à produire par l'humain), soit par **`REPLACE_WITH_APPROVED_MEDIA`** (ré-enregistrement / vidéo officielle approuvée).
2. Ré-héberger (Supabase Storage privé ou YouTube) + renseigner `youtube_id` **XOR** `video_url`.
3. Vérifier que la nouvelle référence résout réellement (non-404).
4. **Aucun média fictif.**

Alternative de dégradation tracée : masquer les 3 modules (`status='draft'`) + quarantaine `QU-MED-MISSING-REFERENCE` — lève l'impact « parcours bloqué » mais ne constitue pas une restauration.

## 4. Verdict de ce lot

➡️ **`WM312_R2_REPLACEMENT_DECISION_REQUIRED`** — aucune source exploitable disponible (URL d'origine 404, aucun repli).

➡️ **PRE-MED-04 reste FAIL.** ➡️ **WM-4 reste NO-GO.**
