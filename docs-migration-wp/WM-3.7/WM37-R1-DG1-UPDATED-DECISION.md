# WM-3.7 — DG-1 · Décision mise à jour

| Champ | Valeur |
|-------|--------|
| Groupe | DG-1 — boîte canonique `8c12c2c748ecc387` (6 profils) |
| Décision | `MERGE_THEN_DISABLE` |
| **Gardien confirmé** | **`DG-1-P2`** (visiteur — compte réellement utilisé, 5 rattachements) |
| Comptes de test confirmés | `DG-1-P3` (super_admin), `P4` (admin), `P5` (berger), `P6` (membre) — créés le 2026-07-09, 0 donnée |
| Statut | plan mis à jour ; **non exécuté** |

---

## 1. Ce qui change vs WM-3.4

Le plan WM-3.4 ciblait `DG-1-P3` (super_admin, 0 donnée) comme gardien → il annonçait 6 lignes à
transférer et **0 conflit**. La décision humaine WM-3.6 retient **`DG-1-P2`** (le compte réellement
utilisé). Conséquence, confirmée par re-vérification lecture seule :

| Point | WM-3.4 (gardien P3) | WM-3.7 (gardien P2) |
|-------|---------------------|---------------------|
| Lignes à transférer | 6 | **0** (P2 détient déjà la donnée réelle du groupe) |
| Conflit `inscriptions_formation` | 0 | **1** (`DG-1-P1` inscrit à la même formation que `DG-1-P2`) |
| Secondaires à désactiver | 5 | 5 (`P1`, `P3`, `P4`, `P5`, `P6`) |

## 2. Nature du conflit intégré

`inscriptions_formation` porte `UNIQUE(user_id, formation_id)`. `DG-1-P1` et le gardien `DG-1-P2`
sont inscrits à **la même formation**. Un re-point violerait la contrainte. **Résolution non
destructive** (identique à DG-2) : conserver l'inscription du gardien, retenir la **progression la
plus avancée** (`GREATEST(progression)`, `termine = OR`), ne pas re-pointer le doublon.

Puisque l'unique donnée de `DG-1-P1` est cette inscription en conflit, **rien d'autre n'est à
transférer** sur DG-1 : la fusion se réduit à une **dédup** + la désactivation des 5 secondaires.

## 3. Règles conservées

- **Aucun cumul de rôle** : le gardien `DG-1-P2` garde `visiteur` ; les rôles des comptes de test
  ne sont **pas** transférés.
- **Préservation** : aucune donnée réelle perdue (la meilleure progression est conservée).
- **Désactivation** par `archived_at` uniquement (aucune suppression).

## 4. Interdits respectés

Décision mise à jour uniquement · aucune écriture · aucune fusion · aucun cumul de rôle.
