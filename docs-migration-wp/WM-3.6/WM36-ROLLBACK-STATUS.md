# WM-3.6 — Statut du rollback

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.6` |
| État | **ROLLBACK NON DÉCLENCHÉ** — aucune écriture à annuler |

---

## 1. Situation

L'exécution a été **bloquée en pré-check avant toute écriture** (`writes_performed = 0`). Il n'y a
donc **rien à annuler** : aucun re-point, aucune désactivation, aucune dédup n'a été appliquée.

| Niveau de rollback | Déclenché ? | Raison |
|--------------------|-------------|--------|
| A — `ROLLBACK` avant `COMMIT` | non | aucune transaction ouverte (aucune écriture) |
| B — restauration snapshot | non | aucun `COMMIT` à défaire |

## 2. Réversibilité disponible

Le snapshot pré-fusion (`private/backup-premerge-20260726/`, intégrité SHA-256 vérifiée) reste
**intact et disponible**. Si une exécution ultérieure a lieu et échoue après écriture, ce snapshot
sert de source de vérité au rollback niveau B (`WM-3.4/WM34-ROLLBACK-PLAN.md`).

## 3. Garantie d'état

L'état de production est **strictement identique** à celui d'avant WM-3.6. Aucune ligne modifiée,
aucun compte désactivé, aucune suppression.

## 4. Interdits respectés

Aucun rollback réel émis (aucun nécessaire) · aucune écriture · production intacte.
