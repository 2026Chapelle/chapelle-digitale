# WM-3.4 — DG-1 · Plan de fusion réversible

| Champ | Valeur |
|-------|--------|
| Groupe | DG-1 — boîte canonique `8c12c2c748ecc387` (6 profils) |
| Décision | `MERGE_THEN_DISABLE` |
| Gardien (recommandé) | `DG-1-P3` (super_admin) — **conditionnel** (voir §1) |
| Secondaires | `DG-1-P1`, `DG-1-P2` (données) · `DG-1-P4`, `DG-1-P5`, `DG-1-P6` (privilégiés sans donnée) |
| Statut | **NON EXÉCUTÉ** — plan uniquement |

---

## 1. Condition préalable bloquante

Le plan ne peut passer en exécution qu'après **documentation** de la confirmation :

> « Les 4 profils privilégiés créés le 2026-07-09 (`DG-1-P3` super_admin, `DG-1-P4` admin,
> `DG-1-P5` berger, `DG-1-P6` membre) sont-ils des comptes de test de rôles ? Lequel est le compte
> de travail réel de l'administrateur (= gardien) ? »

- **Cas attendu** : `DG-1-P3` est le compte réel ; `P4`/`P5`/`P6` sont des tests → désactivables sans transfert (0 donnée).
- **Cas alterné** : si un autre compte est désigné gardien, ré-instancier ce plan sur ce gardien (méthode identique).

Sans cette confirmation documentée : **exécution interdite**.

---

## 2. Données à transférer (dry-run réel, lecture seule)

| Table | Contrainte | Gardien avant | Secondaires | Transférables | Conflits | Gardien après | Méthode |
|-------|------------|---------------|-------------|---------------|----------|---------------|---------|
| `inscriptions_formation` | UNIQUE(user_id,formation_id) | 0 | 2 (P1=1, P2=1) | 2 | **0** | 2 | re-point propre |
| `video_progress` | UNIQUE(user_id,module_id) | 0 | 2 (P2) | 2 | **0** | 2 | re-point propre |
| `app_notifications` | — | 0 | 2 (P2) | 2 | — | 2 | re-point libre |
| `group_attendance` | UNIQUE(reunion_id,user_id) | 0 | 0 | 0 | 0 | 0 | — |
| `pastoral_actions_log` | — | 0 | 0 | 0 | — | 0 | — |
| `newcomer_intakes` | — | 0 | 0 | 0 | — | 0 | — |
| **Total** | | **0** | **6** | **6** | **0** | **6** | |

**Aucun conflit de contrainte unique. Aucun élément non transférable. Aucune perte potentielle.**

---

## 3. Séquence d'exécution (réversible, à exécuter par un humain ultérieurement)

Toutes les étapes sous **transaction unique** ; rollback = `ROLLBACK` tant que non `COMMIT`.

1. **Sauvegarde pré-fusion** (voir `WM34-PRE-MERGE-BACKUP-CONTRACT.md`) — snapshot des lignes impactées.
2. `BEGIN;`
3. Re-pointer vers le gardien (`DG-1-P3.uuid`) :
   - `UPDATE inscriptions_formation SET user_id = :keeper WHERE user_id IN (:P1,:P2);`
   - `UPDATE video_progress        SET user_id = :keeper WHERE user_id IN (:P2);`
   - `UPDATE app_notifications     SET user_id = :keeper WHERE user_id IN (:P2);`
4. Contrôles intermédiaires (voir `WM34-PRE-POST-CONTROLS.md`) — comptes = attendus §2.
5. **Désactiver** (non supprimer) les 5 secondaires : `UPDATE profiles SET archived_at = now() WHERE id IN (:P1,:P2,:P4,:P5,:P6);`
   (les comptes `auth.users` correspondants sont bannis/désactivés, pas supprimés — réversible).
6. Contrôle `PRE-ID-03` : la boîte `8c12c2c748ecc387` ne présente plus qu'**1 profil actif**.
7. `COMMIT;` (uniquement si tous les contrôles passent).

> **Réversibilité** : aucune ligne n'est supprimée ; les rattachements sont **re-pointés** (donc
> re-pointables en sens inverse) et les comptes secondaires sont **désactivés** (`archived_at`),
> jamais effacés. Le rollback complet est décrit dans `WM34-ROLLBACK-PLAN.md`.

---

## 4. Rôles

- Le gardien conserve **son** rôle (`super_admin`). **Aucun cumul** de privilège : les rôles
  `admin`/`berger`/`membre` des secondaires ne sont **pas** transférés (comptes désactivés).
- Voir `WM34-ROLE-CONSOLIDATION-MATRIX.csv`.

---

## 5. Interdits respectés

Plan uniquement · aucun `UPDATE`/`DELETE` émis · aucune désactivation · aucune donnée modifiée.
