# WM-3.4 — DG-2 · Plan de fusion réversible (double validation)

| Champ | Valeur |
|-------|--------|
| Groupe | DG-2 — boîte canonique `62a52607eec94560` (4 profils) |
| Décision | `MERGE_THEN_DISABLE` |
| Gardien | **`DG-2-P1`** (rôle `admin`, statut `pasteur`) |
| Secondaires | `DG-2-P2` (visiteur), `DG-2-P3` (formateur/membre_actif), `DG-2-P4` (visiteur) |
| Exigence | **double validation obligatoire** avant exécution |
| Statut | **NON EXÉCUTÉ** — plan uniquement |

---

## 1. Données à transférer (dry-run réel, lecture seule)

| Table | Contrainte | Gardien avant | Secondaires | Transférables | Conflits uniques | Gardien après | Méthode |
|-------|------------|---------------|-------------|---------------|------------------|---------------|---------|
| `inscriptions_formation` | UNIQUE(user_id,formation_id) | 1 | 1 (P2) | 0 | **1** | 1 | **dédup — conserver la meilleure valeur** |
| `video_progress` | UNIQUE(user_id,module_id) | 3 | 0 | 0 | 0 | 3 | re-point propre |
| `pastoral_actions_log` | — | 0 | **3 (P3)** | 3 | — | **3** | re-point libre |
| `app_notifications` | — | 4 | 6 (P2+P3+P4) | 6 | — | 10 | re-point libre |
| `group_attendance` | UNIQUE(reunion_id,user_id) | 0 | 0 | 0 | 0 | 0 | — |
| `newcomer_intakes` | — | 0 | 0 | 0 | — | 0 | — |
| **Total** | | **8** | **10** | **9** | **1** | **17** | |

**Les 3 actions pastorales de `DG-2-P3` sont transférables sans conflit → préservées.**

### Le seul conflit — `inscriptions_formation` (1)

`DG-2-P2` est inscrit à **une formation déjà présente sur le gardien** (`DG-2-P1`). Un simple
re-point violerait `UNIQUE(user_id, formation_id)`. **Résolution non destructive** :
- conserver l'inscription du gardien ;
- comparer la progression (`progression`, `termine`) des deux inscriptions et **retenir la plus avancée** sur le gardien ;
- ne pas re-pointer la ligne secondaire en doublon (elle disparaît avec la désactivation du compte, après snapshot).
- **Perte : aucune** (la meilleure valeur est conservée).

**Aucun élément non transférable.**

---

## 2. Séquence d'exécution (réversible)

Transaction unique ; rollback = `ROLLBACK` tant que non `COMMIT`.

1. **Sauvegarde pré-fusion** (`WM34-PRE-MERGE-BACKUP-CONTRACT.md`) — snapshot des lignes impactées + les 2 inscriptions en conflit.
2. `BEGIN;`
3. **Résolution du conflit d'inscription** :
   - `UPDATE inscriptions_formation SET progression = GREATEST(progression, :sec_progression), termine = (termine OR :sec_termine) WHERE user_id = :keeper AND formation_id = :conflict_fid;`
   - (la ligne secondaire en doublon n'est **pas** re-pointée)
4. **Re-point libre** vers le gardien (`DG-2-P1.uuid`) :
   - `UPDATE pastoral_actions_log SET member_id = :keeper WHERE member_id IN (:P3);`  ← **3 actions pastorales**
   - `UPDATE app_notifications   SET user_id  = :keeper WHERE user_id  IN (:P2,:P3,:P4);`
   - `UPDATE inscriptions_formation SET user_id = :keeper WHERE user_id IN (:P2,:P3,:P4) AND formation_id <> :conflict_fid;` (les non-conflictuelles, ici 0)
5. Contrôles intermédiaires (`WM34-PRE-POST-CONTROLS.md`) — gardien après = §1.
6. **Désactiver** (non supprimer) : `UPDATE profiles SET archived_at = now() WHERE id IN (:P2,:P3,:P4);` + désactivation `auth.users` correspondants.
7. Contrôle `PRE-ID-03` : boîte `62a52607eec94560` = **1 profil actif**.
8. `COMMIT;` (si tous contrôles passent) — **après double validation**.

---

## 3. Rôles

- Gardien conserve `admin`/`pasteur`. **Aucun cumul** : `formateur`/`visiteur` des secondaires non transférés.
- Le rôle `formateur` de `DG-2-P3` disparaît avec la désactivation, mais ses **données** (3 actions
  pastorales + notifs) sont **transférées** au gardien : c'est la donnée qui est préservée, pas le rôle.

---

## 4. Interdits respectés

Plan uniquement · aucun `UPDATE`/`DELETE` émis · aucune désactivation · aucune donnée modifiée ·
exécution soumise à double validation humaine.
