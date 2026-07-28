# WM-3.11 — R2 / PRE-MED-04 — Options d'exécution

- **Lot** : WM-3.11 (R2)
- **Date** : 2026-07-28
- **Mode** : analyse seule — **aucune option ci-dessous n'est exécutée dans ce lot**.

## 0. Rappel des décisions déjà validées (humaines, WM-3.3/WM-3.4)

- **Vidéos 34548/34555/34577** : `RESTORE_FROM_EXTERNAL_SOURCE` (primaire) → repli `REPLACE_WITH_APPROVED_MEDIA`.
- **Pièces jointes 34549/34553** : `MIGRATE_WITHOUT_MEDIA` (primaire) → repli `ABANDON_REFERENCE`.
- **Interdit absolu** : aucun média fictif ni fichier de substitution non validé.

## 1. Options par référence

| Option (décision WM) | Traduction technique Citadelle | Effet membre | Effet PRE-MED-04 |
|----------------------|-------------------------------|--------------|------------------|
| `RESTORE_FROM_EXTERNAL_SOURCE` (vidéos, primaire) | Récupérer le `.mp4` d'origine (serveur live / sauvegarde hors dépôt), ré-héberger, renseigner `video_url`/`video_path` ou `youtube_id` | Vidéo jouable, validation 90 % possible, parcours complétable | **PASS plein** |
| `REPLACE_WITH_APPROVED_MEDIA` (vidéos, repli) | Idem, avec vidéo approuvée (ré-enregistrement / lien officiel) | Idem | **PASS plein** |
| `MIGRATE_WITHOUT_MEDIA` (pièces jointes, primaire) | Importer le module sans l'annexe (`source_video='none'` si module vidéo — non applicable aux annexes qui sont simplement omises) | Aucun (annexe secondaire) | Levée arbitrée pour les 2 IDs facultatifs |
| `ABANDON_REFERENCE` (pièces jointes, repli) | Retirer la référence du mapping (34549/34553) | Aucun (leçon complète via sa vidéo) | Lève les 2 IDs facultatifs |
| Masquer la leçon (`status='draft'`) — levier complémentaire | `admin/modules/page.tsx:82` + filtres `status='published'` | Module retiré du parcours et du dénominateur | Ne corrige pas la référence ; à combiner avec traçage quarantaine |

## 2. Séquence d'exécution recommandée (hors périmètre de ce lot)

### 2.A Vidéos obligatoires (34548/34555/34577)
1. **Vérifier la liveness** des 3 URLs d'origine (`chapelleduroyaume.org/.../2025/06/*.mp4`) — HTTP 200 attendu. *(Non fait ici : aucune requête réseau autorisée.)*
2. Si **200** → `RESTORE_FROM_EXTERNAL_SOURCE` : télécharger, ré-héberger (Supabase Storage bucket privé `media-videos` **ou** YouTube), renseigner **soit** `youtube_id` **soit** `video_url` (jamais les deux — ADR WM-3).
3. Si **404 / indisponible** → basculer sur le repli `REPLACE_WITH_APPROVED_MEDIA` (vidéo officielle approuvée).
4. Vérifier que la nouvelle URL/ID résout réellement (non-404) avant de valider PRE-MED-04.

### 2.B Pièces jointes facultatives (34549/34553)
1. `MIGRATE_WITHOUT_MEDIA` : importer les leçons parentes sans l'annexe.
2. Tracer l'abandon dans `quarantine.csv` / `rejects.csv` (WM-4), `evidence_ref = WM-3.1 Gap 3 §6`.

## 3. Contraintes d'exécution

- **Aucun média fictif.** Si ni restauration ni remplacement approuvé ne sont possibles, le module vidéo doit rester en `draft` (masqué) plutôt que pointer vers une URL morte, et la décision de dégradation doit être tracée.
- Le renseignement `youtube_id` XOR `video_url` est impératif (contrat d'export WM-4, `WM31-WM4-EXPORT-CONTRACT.md:109-110`).
- `BLOCK_CONTENT_MIGRATION` (blocage global de la migration) est jugé disproportionné : PRE-MED-04 isole exactement ces 5 références, 69 médias exportables ne sont pas concernés (`WM32-R2-MISSING-MEDIA-DECISION.md:73-80`).

## 4. Ce qui reste à la main humaine

Toutes les actions ci-dessus (téléchargement, ré-hébergement, upload, renseignement de champ, exécution WM-4) sont **hors périmètre de ce lot documentaire** et requièrent une action humaine explicite. Voir `WM311-HUMAN-ACTION-SHEET.md`.
