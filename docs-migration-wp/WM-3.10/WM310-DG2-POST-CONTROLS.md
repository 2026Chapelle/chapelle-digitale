# WM-3.10 — DG-2 · Contrôles post-exécution

| Champ | Valeur |
|-------|--------|
| Groupe | DG-2 |
| Résultat global | **PASS** |

---

## 1. Contrôles

| Contrôle | Attendu | Constaté | OK |
|----------|---------|----------|----|
| 1 seul profil actif dans la boîte | 1 | 1 | ✅ |
| Tous les secondaires archivés | 3/3 | 3/3 | ✅ |
| 0 rattachement vers un secondaire archivé | 0 | 0 | ✅ |
| Compteurs gardien = attendus | 1/3/3/10 | 1/3/3/10 | ✅ |
| **3 actions pastorales préservées** | 3 | 3 | ✅ |
| Notifications transférées | 10 | 10 | ✅ |
| Progression maximale conservée | pre_max = after | 33 = 33 | ✅ |
| Gardien actif, rôle inchangé (admin/pasteur) | oui | oui | ✅ |
| 0 conflit de rôle (aucun cumul) | oui | oui | ✅ |

## 2. Conservation des données

- **0 action pastorale perdue** (3/3 sur le gardien).
- Inscription dédupliquée : progression **33** conservée (max) sur le gardien.
- 0 donnée métier perdue.

## 3. Décision

DG-2 **totalement conforme** → passage à la réévaluation globale `PRE-ID-03`.

Preuve brute : `private/WM310-EXECUTION-LOG.json`.
