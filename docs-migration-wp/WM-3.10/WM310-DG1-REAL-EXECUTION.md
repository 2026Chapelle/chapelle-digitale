# WM-3.10 — DG-1 · Exécution réelle

| Champ | Valeur |
|-------|--------|
| Groupe | DG-1 — boîte `8c12c2c748ecc387` |
| Gardien | `DG-1-P2` |
| Secondaires archivés | `DG-1-P1`, `DG-1-P3`, `DG-1-P4`, `DG-1-P5`, `DG-1-P6` |
| Appel | `wm3_merge_duplicate_group(…, p_dry_run = false)` |
| HTTP | **200** |
| Résultat | **conforme** |

---

## 1. Résultat RPC (`result`, réel)

| Mesure | Valeur | Attendu |
|--------|--------|---------|
| `inscriptions_formation` | 1 | 1 |
| `video_progress` | 2 | 2 |
| `pastoral_actions_log` | 0 | 0 |
| `app_notifications` | 2 | 2 |
| `active_in_box` | 1 | 1 |
| `secondaries_active` | 0 | 0 |
| `dangling_to_secondary` | 0 | 0 |

`dry_run = false` → mutations **persistées atomiquement** dans la transaction de la fonction.

## 2. Opérations appliquées

- Dédup non destructive de l'inscription redondante (`DG-1-P1`) : progression fusionnée (`GREATEST`) sur le gardien, ligne redondante retirée.
- Re-point des rattachements non conflictuels vers `DG-1-P2` (aucun autre que déjà détenu).
- Désactivation (`archived_at`) des 5 secondaires. **Aucun `DELETE` de compte.**
- Aucun cumul de rôle : `DG-1-P2` conserve `visiteur`.

## 3. Interdits respectés

Aucun `DELETE` de profil · aucune modification hors DG-1 · aucun cumul de rôle · atomicité garantie.
