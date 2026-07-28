# WM-3.10 — Décision humaine 2 enregistrée

| Champ | Valeur |
|-------|--------|
| Décision | **`FUSION_R1_PRODUCTION_AUTORISÉE = OUI`** |
| Base | verdict `WM39_TRANSACTIONAL_DRY_RUN_APPROVED` |
| Portée | exécution réelle contrôlée de la fusion R1 (DG-1 puis DG-2) |

---

## 1. DG-1

| Élément | Valeur |
|---------|--------|
| Gardien | `DG-1-P2` |
| Décision | `MERGE_THEN_DISABLE` |
| Secondaires | `DG-1-P1`, `DG-1-P3`, `DG-1-P4`, `DG-1-P5`, `DG-1-P6` |
| Dédup non destructive | autorisée (inscription redondante) |
| Rôles secondaires | **aucun cumul automatique** |

## 2. DG-2

| Élément | Valeur |
|---------|--------|
| Gardien | `DG-2-P1` |
| Décision | `MERGE_THEN_DISABLE` |
| Secondaires | `DG-2-P2`, `DG-2-P3`, `DG-2-P4` |
| Dédup non destructive | autorisée |
| 3 actions pastorales | **intégralement préservées** |
| Notifications / rattachements | transférés |
| Double validation | **APPROUVÉE** |

## 3. Conditions obligatoires imposées

1. RPC v2 déployée = celle validée par WM-3.9 → **vérifié** (`WM310-PRE-EXECUTION-CHECKS.md`).
2. Données live = baseline du dry-run → **vérifié**.
3. Intégrité snapshot WM-3.6 → **vérifiée**.
4. RPC accessible uniquement à `service_role` → **vérifié** (anon refusé HTTP 401).
5. Arrêt immédiat en cas de dérive → **appliqué** (aucune dérive rencontrée).

## 4. Interdictions rappelées (respectées)

Aucun `DELETE` de profil · aucune modification hors DG-1/DG-2 · aucune modification de rôle non
validée · aucun déploiement applicatif · aucune migration WordPress · aucun commit/push avant
rapport final.
