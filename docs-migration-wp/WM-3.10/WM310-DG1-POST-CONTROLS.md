# WM-3.10 — DG-1 · Contrôles post-exécution

| Champ | Valeur |
|-------|--------|
| Groupe | DG-1 |
| Résultat global | **PASS** |

---

## 1. Contrôles

| Contrôle | Attendu | Constaté | OK |
|----------|---------|----------|----|
| 1 seul profil actif dans la boîte | 1 | 1 | ✅ |
| Tous les secondaires archivés | 5/5 | 5/5 | ✅ |
| 0 rattachement vers un secondaire archivé | 0 | 0 | ✅ |
| Compteurs gardien = attendus | 1/2/0/2 | 1/2/0/2 | ✅ |
| Gardien actif | oui | oui | ✅ |
| Progression maximale conservée | pre_max = after | 14 = 14 | ✅ |
| 0 conflit de rôle (aucun cumul) | oui | oui | ✅ |

## 2. Conservation des données

- Inscription dédupliquée : progression **14** conservée (max des deux lignes) sur le gardien.
- Aucune donnée métier perdue ; aucune action pastorale concernée (0 sur DG-1).

## 3. Décision de passage

DG-1 **totalement conforme** → autorisation de passer à **DG-2** (règle « seulement si DG-1
conforme »).

Preuve brute : `private/WM310-EXECUTION-LOG.json`.
