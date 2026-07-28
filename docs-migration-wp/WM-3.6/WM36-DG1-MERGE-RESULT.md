# WM-3.6 — DG-1 · Résultat de fusion

| Champ | Valeur |
|-------|--------|
| Groupe | DG-1 — boîte `8c12c2c748ecc387` (6 profils) |
| Gardien | `DG-1-P2` (visiteur, compte réellement utilisé) |
| Secondaires | `DG-1-P1` (donnée) · `DG-1-P3`/`P4`/`P5`/`P6` (comptes de test, 0 donnée) |
| **État** | **NON EXÉCUTÉ** — bloqué en pré-check (0 écriture) |

---

## 1. Recalcul du transfert pour le gardien `DG-1-P2` (lecture seule)

| Table | Gardien avant | Secondaires | Transférables | Conflits uniques | Gardien après (attendu) | Méthode |
|-------|---------------|-------------|---------------|------------------|-------------------------|---------|
| `inscriptions_formation` | 1 | 1 (P1) | 0 | **1** | 1 | dédup non destructive (GREATEST progression) |
| `video_progress` | 2 | 0 | 0 | 0 | 2 | — |
| `app_notifications` | 2 | 0 | 0 | — | 2 | — |
| `group_attendance` | 0 | 0 | 0 | 0 | 0 | — |
| `pastoral_actions_log` | 0 | 0 | 0 | — | 0 | — |
| `newcomer_intakes` | 0 | 0 | 0 | — | 0 | — |

> **Divergence vs WM-3.4** : le dry-run validé (gardien `DG-1-P3`) annonçait **0 conflit** et 6 lignes
> transférables. Avec le gardien réel `DG-1-P2`, `DG-1-P1` partage la **même formation** → **1 conflit**
> de dédup, et les autres rattachements de P2 sont déjà sur le gardien (rien à transférer).

## 2. Rôles

- Gardien `DG-1-P2` conserve son rôle `visiteur`. **Aucun cumul** : les rôles des comptes de test
  (`super_admin`/`admin`/`berger`/`membre`) **ne sont pas** transférés.
- Les 4 comptes de test + `DG-1-P1` seraient désactivés (`archived_at`), non supprimés.

## 3. Pourquoi non exécuté

1. **C4 en échec** — conflit DG-1 non couvert par le plan validé (re-validation requise).
2. **Pas de transaction atomique** disponible (voir `WM36-EXECUTION-LOG.md` §3).

**Aucune écriture. Aucune désactivation. Données intactes.**

## 4. Pour reprendre

- Re-valider le plan DG-1 avec gardien `DG-1-P2` incluant la dédup `inscriptions_formation` (1).
- Disposer d'un chemin transactionnel.
