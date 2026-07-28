# WM-3.10 — Statut du rollback

| Champ | Valeur |
|-------|--------|
| État | **ROLLBACK NON DÉCLENCHÉ** — les deux groupes ont réussi |

---

## 1. Situation

DG-1 et DG-2 ont été exécutés avec **tous les contrôles PASS**. Aucune dérive, aucune erreur
transactionnelle. Aucun rollback n'a été nécessaire.

| Niveau | Déclenché ? | Raison |
|--------|-------------|--------|
| A — annulation intra-fonction | non | les deux appels réels ont réussi (HTTP 200, invariants tenus) |
| B — restauration snapshot | non | aucune anomalie post-commit |

## 2. Réversibilité disponible (conservée)

- Aucun compte supprimé : 8 profils **archivés** (`archived_at`), réactivables.
- Snapshot pré-fusion WM-3.6 (`backup-premerge-20260726`, SHA-256 vérifiés) **intact**.
- En cas d'anomalie constatée ultérieurement, le rollback niveau B reste applicable
  (`WM-3.8/WM38-ROLLBACK-PROCEDURE.md`).

## 3. Garantie

Aucune donnée perdue, aucune action pastorale perdue, progression maximale conservée (contrôlé DG-1
et DG-2). L'opération est complète et réversible.
