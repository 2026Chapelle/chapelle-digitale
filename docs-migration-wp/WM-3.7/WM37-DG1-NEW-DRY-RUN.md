# WM-3.7 — DG-1 · Nouveau dry-run (gardien `DG-1-P2`)

| Champ | Valeur |
|-------|--------|
| Portée | **DG-1 uniquement** |
| Gardien | `DG-1-P2` |
| Secondaires | `DG-1-P1` (1 inscription, en conflit) · `DG-1-P3`/`P4`/`P5`/`P6` (comptes de test, 0 donnée) |
| Mode | **lecture seule** (recalcul WM-3.6, production inchangée depuis — 0 écriture) |
| Source brute | `WM-3.6/private/WM36-PRECHECK-REPORT.json` (gitignored) |

---

## 1. Transfert par table

| Table | Contrainte | Gardien avant | Secondaires | Transférables | Conflits uniques | Gardien après | Méthode |
|-------|------------|---------------|-------------|---------------|------------------|---------------|---------|
| `inscriptions_formation` | UNIQUE(user_id,formation_id) | 1 | 1 (P1) | 0 | **1** | 1 | **dédup non destructive** (GREATEST progression) |
| `video_progress` | UNIQUE(user_id,module_id) | 2 | 0 | 0 | 0 | 2 | — |
| `app_notifications` | — | 2 | 0 | 0 | — | 2 | — |
| `group_attendance` | UNIQUE(reunion_id,user_id) | 0 | 0 | 0 | 0 | 0 | — |
| `pastoral_actions_log` | — | 0 | 0 | 0 | — | 0 | — |
| `newcomer_intakes` | — | 0 | 0 | 0 | — | 0 | — |
| **Total** | | **5** | **1** | **0** | **1** | **5** | |

## 2. Lecture des résultats

- **Lignes transférables : 0** — le gardien `DG-1-P2` détient déjà toute la donnée réelle du groupe.
- **Conflit unique : 1** (`inscriptions_formation`, depuis `DG-1-P1`) → dédup, **aucune perte**.
- **Éléments non transférables : 0.**
- **Pertes potentielles : 0.**
- **Conflits de rôle exécutoires : 0** (aucun cumul).

## 3. Séquence future (à exécuter dans une transaction — voir `WM37-TRANSACTION-REQUIREMENTS.md`)

1. Snapshot pré-fusion (réutiliser/rafraîchir `backup-premerge-*`).
2. `BEGIN;`
3. Dédup du conflit : `UPDATE inscriptions_formation SET progression = GREATEST(progression, :p1_prog), termine = (termine OR :p1_termine) WHERE user_id = :P2 AND formation_id = :conflict_fid;`
4. (aucun autre re-point — rien à transférer)
5. Désactiver : `UPDATE profiles SET archived_at = now() WHERE id IN (:P1,:P3,:P4,:P5,:P6);` + désactivation `auth.users` correspondants.
6. Contrôles post (1 profil actif pour `8c12c2c…`, 0 rattachement vers UUID désactivé, conservation).
7. `COMMIT;` si tous les contrôles passent, sinon `ROLLBACK;`.

## 4. Interdits respectés

Dry-run lecture seule · 0 écriture · aucune fusion · UUID/PII hors Git.
