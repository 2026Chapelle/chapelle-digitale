# WM-3.2 — Feuille de décision humaine

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.2` |
| Objet | Convertir les réserves bloquantes **R1** et **R2** de WM-3.1 en décisions humaines tracées |
| Bloquants concernés | `PRE-ID-03` (R1) · `PRE-MED-04` (R2) — les 2 conditions d'ouverture de WM-4 non satisfaites |
| Ce que WM-3.2 a fait | analyse + dossier ; **aucune** écriture, fusion, désactivation, création de média |
| Ce que WM-3.2 attend de vous | **2 décisions formelles** ci-dessous |

> Tant que ces 2 décisions ne sont pas cochées et signées, WM-4 reste **NO-GO** et le marqueur
> `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` reste **interdit**.

---

## DÉCISION 1 — R1 · Doublons de profils Citadelle (`PRE-ID-03`)

**Contexte**
La base cible Citadelle contient **13 profils pour 5 boîtes e-mail réelles**. Deux groupes de
doublons subsistent : **DG-1** (6 profils, rôle `visiteur`) et **DG-2** (4 profils, rôle
`admin`/`pasteur`). Défaut d'hygiène **préexistant**, non causé par l'import. Les UUID, données
rattachées et l'activité récente **n'ont pas été mesurés** (anonymisation WM-3.1) et doivent être
collectés en revue technique lecture seule avant toute fusion/désactivation.

**Choix possibles** — `KEEP_ONE_DISABLE_OTHERS` · `MERGE_THEN_DISABLE` · `KEEP_ALL_TEMPORARILY` ·
`MANUAL_IDENTITY_REVIEW` · `BLOCK_IMPORT`

**Conséquence**
- Ne rien faire (`KEEP_ALL_TEMPORARILY`) → l'import de 30 identités aggrave le défaut ; WM-4 reste bloqué.
- Désactiver en aveugle → risque de perte de données rattachées ; pour DG-2, risque de retrait d'un accès **admin/pasteur**.
- `MANUAL_IDENTITY_REVIEW` → collecte préalable, arbitrage cas par cas, aucun risque aveugle.

**Recommandation de Claude**
`MANUAL_IDENTITY_REVIEW` pour DG-1 **et** DG-2 (collecter UUID + données + activité), puis
`MERGE_THEN_DISABLE` si des données sont réparties, sinon `KEEP_ONE_DISABLE_OTHERS` en conservant
le profil strict-matché. **Double validation exigée pour DG-2** (compte admin/pasteur).
`BLOCK_IMPORT` reste actif jusqu'à résolution.

**Case de validation humaine**
- [ ] DG-1 — option retenue : `______________________`
- [ ] DG-2 — option retenue : `______________________`
- [ ] J'autorise la collecte lecture seule (UUID / données rattachées / activité) préalable à toute action
- [ ] Je confirme qu'**aucune** fusion ni désactivation n'est exécutée par WM-3.2
- Décideur : `____________________`  ·  Date : `__________`

---

## DÉCISION 2 — R2 · Cinq médias manquants (`PRE-MED-04`)

**Contexte**
Cinq références pointent vers des objets **absents de la base et de la sauvegarde WM-1** :
3 vidéos d'enseignement HTML5 (`34548`→leçon 864, `34555`→leçon 865, `34577`→leçon 866, chemins
`2025/06/*.mp4` inexistants) et 2 pièces jointes de leçon (`34549`, `34553`, nom/type inconnus,
rattachées à des leçons déjà pourvues d'une vidéo).

**Choix possibles** — `RESTORE_FROM_EXTERNAL_SOURCE` · `REPLACE_WITH_APPROVED_MEDIA` ·
`MIGRATE_WITHOUT_MEDIA` · `QUARANTINE_CONTENT` · `ABANDON_REFERENCE` · `BLOCK_CONTENT_MIGRATION`

**Conséquence**
- Vidéos non traitées → leçons 864/865/866 sans vidéo d'enseignement, ou `video_url` vers une URL morte (404).
- Pièces jointes non traitées → document annexe manquant ; la leçon reste complète via sa vidéo.
- `BLOCK_CONTENT_MIGRATION` → bloque tout le corpus alors que seules 5 références sont en cause.

**Recommandation de Claude**
- **3 vidéos** (obligatoires) : `RESTORE_FROM_EXTERNAL_SOURCE` (vérifier serveur WP live / autres
  sauvegardes) ; repli `REPLACE_WITH_APPROVED_MEDIA` (re-héberger, renseigner `youtube_id`/`video_url`) ;
  dernier recours `MIGRATE_WITHOUT_MEDIA`.
- **2 pièces jointes** (facultatives) : `MIGRATE_WITHOUT_MEDIA` ou `ABANDON_REFERENCE`.
- Ne **jamais** créer de média fictif.

**Case de validation humaine**
- [ ] Vidéos 34548 / 34555 / 34577 — option retenue : `______________________`
- [ ] Pièces jointes 34549 / 34553 — option retenue : `______________________`
- [ ] Une source externe (serveur WP live / autre sauvegarde) sera vérifiée avant repli : Oui / Non
- [ ] Je confirme qu'**aucun** média fictif n'est créé par WM-3.2
- Décideur : `____________________`  ·  Date : `__________`

---

## Synthèse des cases à cocher

| # | Décision | Bloquant WM-4 | Recommandation Claude | Statut |
|---|----------|---------------|-----------------------|--------|
| 1 | R1 — doublons profils (DG-1, DG-2) | `PRE-ID-03` | `MANUAL_IDENTITY_REVIEW` | ☐ en attente |
| 2 | R2 — 5 médias manquants | `PRE-MED-04` | `RESTORE`/`MIGRATE_WITHOUT_MEDIA` | ☐ en attente |

Tant qu'une case « Statut » reste en attente : **WM32_AWAITING_HUMAN_DECISION**.
