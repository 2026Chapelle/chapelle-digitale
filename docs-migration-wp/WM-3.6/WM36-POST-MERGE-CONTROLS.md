# WM-3.6 — Contrôles post-fusion

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.6` |
| État | **NON APPLICABLE** — aucune fusion exécutée (0 écriture) |

---

## 1. Statut

Les contrôles `POST-M-01` et `POST-M-02` (et suivants) **n'ont pas été exécutés** : ils supposent
une fusion réalisée. L'exécution ayant été **bloquée en pré-check avant toute écriture**, il n'y a
aucun état post-fusion à contrôler.

| Contrôle | Cible (si fusion exécutée) | État |
|----------|----------------------------|------|
| `POST-M-01` | 1 profil actif par empreinte canonique (`8c12c2c…`, `62a52607…`) | **non exécuté** |
| `POST-M-02` | 0 groupe de doublons canoniques actifs → `PRE-ID-03 = PASS` | **non exécuté** |
| `POST-M-03` | 0 rattachement vers un UUID désactivé | non exécuté |
| `POST-M-04` | Total rattachements après = avant (aucune perte) | non exécuté |
| `POST-M-05` | Gardien conserve son rôle, aucun cumul | non exécuté |
| `POST-M-06` | 3 actions pastorales (DG-2) présentes sur le gardien | non exécuté |
| `POST-M-07` | Secondaires `archived_at NOT NULL` (désactivés, non supprimés) | non exécuté |
| `POST-M-08` | Re-sonde lecture seule reproductible | non exécuté |

## 2. Conséquence

L'état de production est **inchangé** : 13 profils actifs, 2 groupes de doublons subsistants.
Les contrôles post seront exécutés lors d'une reprise, après levée des blocages (transaction +
re-validation DG-1).

## 3. Interdits respectés

Aucun contrôle sur donnée modifiée · aucune écriture · production intacte.
