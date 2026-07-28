# WM-3.11 — R2 / PRE-MED-04 — Preuves d'abandon des pièces jointes facultatives

- **Lot** : WM-3.11 (R2 — traitement final des médias manquants)
- **Date** : 2026-07-28
- **Mode** : lecture seule.

## 0. Objet

Traiter les **2 pièces jointes facultatives** manquantes :

| media_id | Décision validée |
|----------|------------------|
| 34549 | `MIGRATE_WITHOUT_MEDIA` (primaire) + `ABANDON_REFERENCE` (repli) |
| 34553 | `MIGRATE_WITHOUT_MEDIA` (primaire) + `ABANDON_REFERENCE` (repli) |

## 1. Caractérisation

Les deux références proviennent de la méta Tutor LMS `_tutor_attachments` (valeur non vide). Ce sont des **documents annexes** rattachés à des leçons **déjà pourvues de leur vidéo d'enseignement** — pas des vidéos principales.

| Attribut | 34549 | 34553 | Preuve |
|----------|-------|-------|--------|
| Origine du pointeur | méta `_tutor_attachments` non vide | idem | `WM-3.2/WM32-R2-MISSING-MEDIA-MATRIX.csv:5-6` ; `WM-3.1/WM31-LESSONS-WITHOUT-VIDEO-REPORT.md:154-156` |
| Contenu parent | leçon Tutor LMS avec vidéo (leçon exacte non précisée en WM-3.1) | idem | `WM32-R2-MISSING-MEDIA-DECISION.md:31-32` |
| Type probable | document / pièce jointe annexe, MIME inconnu (non vidéo) | idem | `WM32-R2-MISSING-MEDIA-DECISION.md:31-32` ; CSV col. `expected_type` |
| Nom historique | INCONNU — non publié (aucun `_wp_attached_file`) | idem | `WM32-R2-MISSING-MEDIA-DECISION.md:31-32` |
| Caractère | **FACULTATIF** | **FACULTATIF** | `WM32-R2-MISSING-MEDIA-MATRIX.csv:5-6` (col. `mandatory`) ; `WM32-R2-MISSING-MEDIA-DECISION.md:54` |
| Preuve d'absence | absent de `wp_posts` (ID max 1481) ET aucun fichier rattaché dans les 383 inventoriés | idem | `WM32-R2-MISSING-MEDIA-DECISION.md:40-41` ; CSV ligne 5-6 ; `WM31-PHYSICAL-FILES-REPORT.md:192` |
| Décision humaine actée | `MIGRATE_WITHOUT_MEDIA` + `ABANDON_REFERENCE` | idem | `WM-3.3/WM33-R2-HUMAN-DECISIONS-RECORDED.md:20-21` ; confirmée `WM-3.4/WM34-HUMAN-DECISIONS-CONFIRMED.md:40` |

## 2. Preuve convergente du caractère facultatif

Établie en trois points de WM-3.2 (R2-MISSING-MEDIA) :

1. **`WM32-R2-MISSING-MEDIA-MATRIX.csv:5-6`** — colonne `mandatory = FACULTATIF_document_annexe_lecon_deja_pourvue_de_video` (donnée machine-lisible).
2. **`WM32-R2-MISSING-MEDIA-DECISION.md:54`** — tableau « obligatoire / facultatif » : `34549, 34553 → FACULTATIF`.
3. **Racine factuelle `WM31-LESSONS-WITHOUT-VIDEO-REPORT.md:153-157`** — sur 28 leçons portant `_tutor_attachments`, 26 sont vides (`a:0:{}`) ; seules 2 valeurs non vides (34549, 34553), toutes deux rattachées à des leçons **AVEC** vidéo → l'annexe est secondaire par rapport au média principal.

## 3. Impact de l'abandon

- La leçon parente perd **une pièce jointe annexe** (document complémentaire) ; son cœur pédagogique — sa vidéo — reste intact.
- Conséquence formalisée : « pièce jointe annexe manquante ; leçon reste complète via sa vidéo » (`WM32-R2-MISSING-MEDIA-DECISION.md:76` ; CSV lignes 5-6, `consequence_if_not_migrated`).
- **`MIGRATE_WITHOUT_MEDIA` est SANS impact critique — OUI.** Le levier PRE-MED-04 est classé « levable immédiatement par décision tracée (facultatif, sans média) » pour ces 2 IDs (`WM33-R2-HUMAN-DECISIONS-RECORDED.md:56`). Le blocage résiduel de PRE-MED-04 provient **uniquement des 3 vidéos** (`WM33-R2-HUMAN-DECISIONS-RECORDED.md:57`).

## 4. Action restante (traçage uniquement, non exécutée ici)

Inscrire l'abandon des 2 références dans `quarantine.csv` / `rejects.csv` lors de WM-4, avec `evidence_ref = WM-3.1 Gap 3 §6` (`WM33-R2-HUMAN-DECISIONS-RECORDED.md:48`). Aucun média fictif ni substitut créé.

## 5. Limites

- L'ID exact de la leçon parente de chaque pièce jointe n'est pas déterminable dans le dépôt (WM-3.1 le déclare « non précisé » : `gap2_lessons.py:74` saute les leçons **avec** vidéo).
- Type MIME et nom réels restent inconnus (objet orphelin, absent de `wp_posts`) ; la restauration est jugée « peu probable » (CSV lignes 5-6, `replacement_possibility = peu_probable_nom_et_type_inconnus`).
