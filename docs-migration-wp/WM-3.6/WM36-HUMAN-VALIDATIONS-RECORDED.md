# WM-3.6 — Validations humaines enregistrées

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.6` |
| Objet | Consigner les validations finales et le paramètre gardien avant exécution |
| Résultat d'exécution | **BLOQUÉ EN PRÉ-CHECK — 0 écriture** (voir `WM36-EXECUTION-LOG.md`) |

---

## 1. DG-1

| Élément | Valeur |
|---------|--------|
| Gardien | **`DG-1-P2`** *(changement vs plan WM-3.4 qui ciblait `DG-1-P3`)* |
| Décision | `MERGE_THEN_DISABLE` |
| Comptes de test 2026-07-09 | **confirmés** (`DG-1-P3`, `P4`, `P5`, `P6`) |
| Cumul de rôles | **interdit** (pas de cumul automatique) |
| Données secondaires | **toutes préservées** (transfert vers `DG-1-P2`) |

## 2. DG-2

| Élément | Valeur |
|---------|--------|
| Gardien | **`DG-2-P1`** (admin/pasteur) |
| Décision | `MERGE_THEN_DISABLE` |
| Validation humaine 1 | **APPROUVÉE** |
| Validation humaine 2 | **APPROUVÉE** |
| À préserver | 3 actions pastorales + notifications + rattachements |
| Dédup `inscriptions_formation` | non destructive (conserver la meilleure progression) |

## 3. Conséquence du changement de gardien DG-1 (constat)

Le plan WM-3.4 a été dry-runné avec gardien `DG-1-P3` (0 rattachement) → **0 conflit** sur DG-1.
Le gardien retenu est désormais `DG-1-P2` (porteur de données). La **re-vérification live** (lecture
seule, `WM36-DG1-MERGE-RESULT.md`) révèle un **conflit `inscriptions_formation` nouveau** : `DG-1-P1`
est inscrit à la **même formation** que `DG-1-P2`. Les chiffres validés en WM-3.4 ne couvrent donc
plus exactement DG-1 → **re-validation requise** (pré-check `C4` en échec, voir log).

---

## 4. Interdits respectés

Validations consignées uniquement · aucune écriture · aucun cumul de rôle · aucune donnée modifiée.
