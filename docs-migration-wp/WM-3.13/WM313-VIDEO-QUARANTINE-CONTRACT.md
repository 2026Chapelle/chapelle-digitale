# WM-3.13 — Contrat de quarantaine des 3 vidéos

- **Lot** : WM-3.13
- **Date** : 2026-07-28
- **Décision** : `QUARANTINE_CONTENT` pour 34548/34555/34577 (leçons 864/865/866).

## 0. Traduction technique de « quarantine »

Il n'existe **aucun statut applicatif `quarantine`** dans Citadelle (grep `quarantine` dans `src/` = 0). L'équivalent technique est **`formation_modules.status = 'draft'`** (`supabase/migrations/20260531100200_lms_formation_modules.sql:25` ; admin `src/app/(admin)/admin/modules/page.tsx:24`). « Quarantaine » = module `draft` conservé (pas de suppression).

## 1. Clauses du contrat (prouvées par le code)

| Clause | Garantie | Preuve fichier:ligne |
|--------|----------|----------------------|
| **Statut cible** | `status='draft'` à l'import | migration `20260531100200_lms_formation_modules.sql:25` ; admin `page.tsx:24,82` |
| **Invisibilité publique** | RLS + filtre API liste + garde validation, tous `status='published'` | RLS `20260531100200:33-34` ; `api/member/formations/[id]/modules/route.ts:87` ; `api/member/formations/progress/route.ts:68` ; page publique `(public)/formations/[slug]/page.tsx:50` |
| **Exclusion progression** | dénominateur `recompute` = `published` uniquement → draft hors total | `progress/route.ts:25-27,31` ; corroboré `parcours-gate-server.ts:63`, `integration-progress-server.ts:55` |
| **Complétion / certificat** | 100 % + `termine` + certificat atteignables sans les 3 modules | `progress/route.ts:32,110,128-138` |
| **Réactivation sans recréer** | `draft→published` + `youtube_id`/`video_url` via PATCH sur l'`id` existant (titre/ordre/cours parent préservés) | admin `page.tsx:68-71,82` ; `api/admin/lms/[resource]/route.ts:44-53` |
| **Garde-fou** | un module réactivé sans vidéo jouable reste non-validable | `progress/route.ts:69` ; `video-validation.ts:96-102` |

## 2. Conservation des métadonnées

La quarantaine est un changement de `status`, **pas** un `DELETE`. Les 3 lignes `formation_modules` conservent `id`, `titre`, `ordre`, `formation_id` (cours parent 867), `acces_min_statut`, `prerequis_module_id`, `langue` (`20260531100200_lms_formation_modules.sql:10-28`). Rien n'est perdu.

## 3. Procédure de réactivation future (sans recréation)

1. Obtenir une **vidéo officielle approuvée** (`REPLACE_WITH_APPROVED_MEDIA`), ré-héberger (Supabase Storage privé ou YouTube).
2. Via l'admin (`/admin/modules`) : renseigner `source_video` + `youtube_id` **XOR** `video_url`/`video_path` (`page.tsx:68-71`), vérifier non-404.
3. Repasser `status` `draft → published` (`page.tsx:82`).
4. Transport = `PATCH /api/admin/lms/formation_modules` avec `body.id` du module existant → `update(patch).eq('id', body.id)` (`route.ts:44-53`) : mise à jour sur la ligne existante, `id`/`ordre`/`formation_id` préservés.

## 4. Interdits maintenus

Aucun média fictif, aucune URL inventée, aucun fichier vide, aucun `youtube_id` fictif, aucun `video_url` non vérifié. Tant qu'aucune vidéo réelle approuvée n'est fournie, les 3 modules **restent `draft`**.
