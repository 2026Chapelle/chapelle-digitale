# WM-3.6 — DG-2 · Résultat de fusion

| Champ | Valeur |
|-------|--------|
| Groupe | DG-2 — boîte `62a52607eec94560` (4 profils) |
| Gardien | `DG-2-P1` (admin/pasteur) |
| Secondaires | `DG-2-P2`, `DG-2-P3` (formateur), `DG-2-P4` |
| Validations | 1 **APPROUVÉE** · 2 **APPROUVÉE** |
| **État** | **NON EXÉCUTÉ** — bloqué en pré-check (0 écriture) |

---

## 1. Re-vérification live (lecture seule) — conforme au plan WM-3.4

| Table | Gardien avant | Secondaires | Transférables | Conflits | Gardien après (attendu) | Méthode |
|-------|---------------|-------------|---------------|----------|-------------------------|---------|
| `inscriptions_formation` | 1 | 1 (P2) | 0 | **1** | 1 | dédup non destructive (GREATEST) |
| `video_progress` | 3 | 0 | 0 | 0 | 3 | — |
| `pastoral_actions_log` | 0 | **3 (P3)** | 3 | — | **3** | re-point libre |
| `app_notifications` | 4 | 6 | 6 | — | 10 | re-point libre |
| `group_attendance` | 0 | 0 | 0 | 0 | 0 | — |
| `newcomer_intakes` | 0 | 0 | 0 | — | 0 | — |

**Conforme au dry-run WM-3.4** : 1 conflit unique (dédup sans perte), 3 actions pastorales
transférables, notifications 4 → 10. Aucun élément non transférable, aucune perte attendue.

## 2. Rôles

- Gardien conserve `admin`/`pasteur`. **Aucun cumul** : `formateur`/`visiteur` non transférés.
- Les **données** du formateur (3 actions pastorales + notifs) seraient transférées ; son **rôle** non.

## 3. Pourquoi non exécuté

Bien que DG-2 soit **conforme au plan validé** et **doublement approuvé**, l'exécution est bloquée
au niveau **global** :
1. **Pas de transaction atomique** disponible (voir `WM36-EXECUTION-LOG.md` §3).
2. Arrêt global déclenché par l'échec `C4` (DG-1), la mission imposant l'arrêt « si un seul contrôle
   échoue ».

**Aucune écriture. Données intactes.**

## 4. Pour reprendre

Disposer d'un chemin transactionnel ; DG-2 est prêt (plan validé, double validation obtenue).
