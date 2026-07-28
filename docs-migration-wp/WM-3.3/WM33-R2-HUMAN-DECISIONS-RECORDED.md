# WM-3.3 — R2 · Enregistrement des décisions humaines (médias manquants)

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.3` |
| Objet | Consigner formellement les décisions humaines rendues pour les 5 références média R2 |
| Réserve | R2 — contrôle `PRE-MED-04` (bloquant) |
| Base | `WM-3.2/WM32-R2-MISSING-MEDIA-DECISION.md` · `WM31-PHYSICAL-FILES-REPORT.md` §6 |
| Nature | **enregistrement de décision** — aucun média créé, aucune donnée modifiée |

---

## 1. Décisions rendues

| Référence | Type | Leçon | Décision humaine | Repli autorisé |
|-----------|------|-------|------------------|----------------|
| `34548` | vidéo MP4 HTML5 | 864 | **`RESTORE_FROM_EXTERNAL_SOURCE`** | `REPLACE_WITH_APPROVED_MEDIA` |
| `34555` | vidéo MP4 HTML5 | 865 | **`RESTORE_FROM_EXTERNAL_SOURCE`** | `REPLACE_WITH_APPROVED_MEDIA` |
| `34577` | vidéo MP4 HTML5 | 866 | **`RESTORE_FROM_EXTERNAL_SOURCE`** | `REPLACE_WITH_APPROVED_MEDIA` |
| `34549` | pièce jointe leçon | leçon avec vidéo | **`MIGRATE_WITHOUT_MEDIA`** + `ABANDON_REFERENCE` | — |
| `34553` | pièce jointe leçon | leçon avec vidéo | **`MIGRATE_WITHOUT_MEDIA`** + `ABANDON_REFERENCE` | — |

**Contrainte transversale rappelée** : **ne créer aucun média fictif**.

---

## 2. Traduction opérationnelle pour WM-4 (spécification, non exécutée)

### 2.1 Trois vidéos (`34548`, `34555`, `34577`) — `RESTORE_FROM_EXTERNAL_SOURCE`

1. **Recherche de source externe** (préalable, hors WM-1) : serveur WordPress live
   (`chapelleduroyaume.org`), sauvegardes antérieures, ou espace de stockage d'origine, pour les
   fichiers `2025/06/MODULE_1_ADN_Optimized.mp4`, `LES_PRINCIPES_DU_ROYAUME_Optimized.mp4`,
   `VIE_COMMUNAUTAIRE_ET_APPARTENANCE_Optimized.mp4`.
2. **Si trouvés** → ré-héberger (Supabase Storage / YouTube) puis renseigner, pour les leçons
   864/865/866, `youtube_id` **ou** `video_url` (jamais les deux — règle WM-3 ADR).
3. **Si introuvables** → **repli autorisé** `REPLACE_WITH_APPROVED_MEDIA` : substituer une vidéo
   approuvée (ré-enregistrement / lien officiel) — jamais un média fictif ni un fichier de
   substitution non validé.
4. Levée de `QU-MED-MISSING-REFERENCE` pour ces 3 IDs conditionnée à l'obtention effective d'une
   source (restaurée ou approuvée).

### 2.2 Deux pièces jointes (`34549`, `34553`) — `MIGRATE_WITHOUT_MEDIA` + `ABANDON_REFERENCE`

1. Migrer les leçons **sans** la pièce jointe (les leçons concernées disposent déjà d'une vidéo).
2. **Abandonner** la référence orpheline dans le mapping (`_tutor_attachments` → aucune sortie
   média pour ces 2 IDs).
3. Tracer l'abandon dans `rejects/` ou `quarantine.csv` (WM-4) avec `evidence_ref` = WM-3.1 Gap 3 §6.

---

## 3. Effet sur `PRE-MED-04`

| Sous-ensemble | Décision | `PRE-MED-04` |
|---------------|----------|--------------|
| 2 pièces jointes (34549, 34553) | `MIGRATE_WITHOUT_MEDIA` + `ABANDON_REFERENCE` | **levable immédiatement** par décision tracée (facultatif, sans média) |
| 3 vidéos (34548, 34555, 34577) | `RESTORE_FROM_EXTERNAL_SOURCE` (repli `REPLACE`) | **levable après** obtention effective d'une source, en WM-4 |

`PRE-MED-04` passe de « échec non arbitré » à « **arbitré, en cours d'exécution WM-4** ». Il reste
techniquement non « PASS » tant que les 3 vidéos n'ont pas de source effective, mais la **décision**
est désormais rendue et tracée — condition d'ouverture WM-4 (§10, point 2) satisfaite côté R2.

---

## 4. Interdits respectés

Aucun média fictif · aucun fichier de substitution non validé · aucune URL réécrite · aucune donnée
source ou cible modifiée · enregistrement de décision uniquement.
