# WM-3.10 — DG-2 · Exécution réelle

| Champ | Valeur |
|-------|--------|
| Groupe | DG-2 — boîte `62a52607eec94560` |
| Gardien | `DG-2-P1` (admin/pasteur) |
| Secondaires archivés | `DG-2-P2`, `DG-2-P3`, `DG-2-P4` |
| Appel | `wm3_merge_duplicate_group(…, p_dry_run = false)` |
| HTTP | **200** |
| Résultat | **conforme** |
| Pré-condition | DG-1 totalement conforme (respectée) |

---

## 1. Résultat RPC (`result`, réel)

| Mesure | Valeur | Attendu |
|--------|--------|---------|
| `inscriptions_formation` | 1 | 1 |
| `video_progress` | 3 | 3 |
| `pastoral_actions_log` | **3** | **3** |
| `app_notifications` | 10 | 10 |
| `active_in_box` | 1 | 1 |
| `secondaries_active` | 0 | 0 |
| `dangling_to_secondary` | 0 | 0 |

## 2. Opérations appliquées

- **3 actions pastorales** (`DG-2-P3`) re-pointées vers le gardien → **intégralement préservées**.
- 6 notifications (P2+P3+P4) transférées → gardien à 10.
- Dédup non destructive de l'inscription redondante (`DG-2-P2`) : progression fusionnée (`GREATEST`).
- Désactivation (`archived_at`) des 3 secondaires. **Aucun `DELETE` de compte.**
- Gardien conserve `admin`/`pasteur` ; aucun cumul de rôle.

## 3. Interdits respectés

Aucun `DELETE` de profil · aucune modification hors DG-2 · aucune action pastorale perdue · atomicité garantie.
