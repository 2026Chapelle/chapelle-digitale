# WM-3.11 — Ré-évaluation PRE-MED-04

- **Lot** : WM-3.11 (R2)
- **Date** : 2026-07-28
- **Contrôle** : PRE-MED-04 — *« 0 référence média pointant vers un objet absent de la base ET du disque »* (`WM31-WM4-EXPORT-CONTRACT.md:277`).

## 0. Statut

**PRE-MED-04 = FAIL** (inchangé).

PRE-MED-04 **reste FAIL tant qu'aucune restauration ni décision finale de remplacement n'est exécutée**. Ce lot est documentaire et n'exécute aucune restauration.

## 1. Décompte des références en échec

| media_id | Type | Objet présent (base/disque) ? | Compte PRE-MED-04 |
|----------|------|-------------------------------|-------------------|
| 34548 | vidéo obligatoire | NON / NON | échec |
| 34555 | vidéo obligatoire | NON / NON | échec |
| 34577 | vidéo obligatoire | NON / NON | échec |
| 34549 | pièce jointe facultative | NON / NON | échec (levable par décision) |
| 34553 | pièce jointe facultative | NON / NON | échec (levable par décision) |

Références en échec : **5 / 5**. Aucun fichier physique présent (Agent 3 : 0/5).

## 2. Deux voies de PASS (contrat WM-4)

Ouverture WM-4 conditionnée à : PRE-MED-04 **soit corrigé, soit levé par décision humaine tracée dans `quarantine.csv`** (`WM31-WM4-EXPORT-CONTRACT.md:324-332`).

### Voie 1 — PASS « arbitré » (levée par décision)
- Décision humaine **déjà rendue et tracée** (WM-3.3). Effet acté : PRE-MED-04 passe de « échec non arbitré » à « arbitré, en cours d'exécution WM-4 » (`WM33-R2-HUMAN-DECISIONS-RECORDED.md:59-61`).
- **Preuve requise** : 5 références inscrites dans `quarantine.csv` (`QU-MED-MISSING-REFERENCE`, bloquant) + enregistrement de décision.
- Les 2 pièces jointes (34549/34553) sont **levables immédiatement** par cette voie (`WM33-R2-HUMAN-DECISIONS-RECORDED.md:56`).

### Voie 2 — PASS « corrigé » (vrai PASS technique, seul qui lève la réserve sur les 3 vidéos)
Pour **chaque** leçon 864/865/866 :
1. Obtention effective d'un octet vidéo réel — `RESTORE_FROM_EXTERNAL_SOURCE` ou repli `REPLACE_WITH_APPROVED_MEDIA`.
2. Ré-hébergement (YouTube ou Supabase Storage) + renseignement `youtube_id` **XOR** `video_url`.
3. **Aucun média fictif.**
4. Vérification que la référence ne pointe plus vers un objet absent (URL non-404) → PRE-MED-04 = 0 pour cet ID → PASS ; quarantaine `QU-MED-MISSING-REFERENCE` levée.

## 3. Conditions EXACTES pour PRE-MED-04 → PASS

**Preuve minimale pour lever intégralement R2 :**
- (a) 2 pièces jointes tracées `ABANDON_REFERENCE` / `MIGRATE_WITHOUT_MEDIA` dans `quarantine.csv` ou `rejects.csv` ;
- (b) 3 vidéos disposant d'une **source réelle ré-hébergée** et d'un `youtube_id`/`video_url` **valide vérifié (non-404)**, OU décision explicite de dégradation tracée (module `draft` masqué).

Sans (b), R2 reste « arbitré, en cours », **pas PASS**.

## 4. Verdict de ce lot

Les **sources des 3 vidéos sont identifiées avec certitude HAUTE** (URLs d'origine, durées, leçons) et **prêtes pour une exécution de restauration externe** ; les 2 pièces jointes sont prêtes pour traçage d'abandon.

➡️ Verdict WM-3.11 : **`WM311_R2_MEDIA_SOURCES_READY_FOR_EXECUTION`**.

➡️ **PRE-MED-04 reste FAIL** jusqu'à exécution + vérification de la restauration/remplacement (hors périmètre de ce lot).
