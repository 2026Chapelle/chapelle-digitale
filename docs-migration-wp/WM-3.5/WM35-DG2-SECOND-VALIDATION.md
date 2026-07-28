# WM-3.5 — DG-2 · Fiche de seconde validation

| Champ | Valeur |
|-------|--------|
| Groupe | DG-2 — boîte canonique `62a52607eec94560` (4 profils) |
| Décision | `MERGE_THEN_DISABLE` |
| Validation humaine 1 | **APPROUVÉE** |
| Validation humaine 2 | **EN ATTENTE** ← objet de cette fiche |
| Source | WM-3.4 dry-run — **aucune nouvelle sonde** |
| Action | **aucune** tant que la validation 2 n'est pas enregistrée |

---

## 1. Gardien

**`DG-2-P1`** — rôle `admin`, statut `pasteur` — le plus ancien (2026-05-30) et le plus doté (8 rattachements).

## 2. Profils secondaires (à transférer puis désactiver)

| Pseudonyme | Rôle | Rattachements |
|------------|------|---------------|
| `DG-2-P2` | visiteur | formations=1 ; notifs=1 |
| `DG-2-P3` | formateur / membre_actif | **actions_pastorales=3** ; notifs=3 |
| `DG-2-P4` | visiteur | notifs=2 |

## 3. Relations transférées vers le gardien

| Table | Transféré | Gardien après |
|-------|-----------|---------------|
| `pastoral_actions_log` | **3** (de `DG-2-P3`) | 3 |
| `app_notifications` | 6 (P2+P3+P4) | 10 |
| `inscriptions_formation` | 0 (dédup — voir §4) | 1 |
| `video_progress` | 0 | 3 |
| **Total** | **9 transférables** | **17** |

## 4. Conflit unique traité

Un seul conflit : `inscriptions_formation` UNIQUE(user_id, formation_id) — `DG-2-P2` inscrit à une
formation **déjà** présente sur le gardien. **Traitement non destructif** : conserver l'inscription
du gardien, retenir la **progression la plus avancée** (`GREATEST`), ne pas re-pointer le doublon.

## 5. Absence de perte attendue

- Éléments non transférables : **0**.
- Pertes potentielles : **0** (le conflit conserve la meilleure valeur).
- Les 3 actions pastorales sont **préservées** sur le gardien.

## 6. Rollback prévu

- Niveau A : `ROLLBACK` avant `COMMIT` (transaction unique).
- Niveau B : restauration depuis snapshot pré-fusion (aucun `DELETE` ; désactivation par
  `archived_at` → tout re-pointable). Détail : `WM-3.4/WM34-ROLLBACK-PLAN.md`.

---

## 7. Décision — seconde validation humaine

> Compte à **privilèges pastoraux** : seconde validation obligatoire avant toute exécution.

- [ ] **APPROUVER** — j'autorise l'exécution de la fusion DG-2 selon le plan WM-3.4 (après snapshot vérifié)
- [ ] **REFUSER** — je n'autorise pas l'exécution

Validateur 2 : `____________________`  ·  Rôle : `____________`  ·  Date : `__________`

**Tant que cette case n'est pas cochée « APPROUVER » : aucune exécution DG-2.**
