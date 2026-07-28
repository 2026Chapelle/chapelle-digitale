# WM-3.4 — Rapport de dry-run (lecture seule)

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.4` |
| Mode | **dry-run** — sonde production **lecture seule** (GET), **0 écriture** |
| Base | UUID cloisonnés `WM-3.3/private/` · schémas `supabase/migrations` |
| Résultat brut | `private/WM34-DRYRUN-RAW.json` (gitignored) |
| Matrices | `WM34-DEPENDENCY-TRANSFER-MATRIX.csv` · `WM34-ROLE-CONSOLIDATION-MATRIX.csv` |

---

## 1. Gardien par groupe

| Groupe | Gardien | Rôle | Condition |
|--------|---------|------|-----------|
| DG-1 | `DG-1-P3` | `super_admin` | **conditionnel** — confirmer « comptes de test 2026-07-09 » |
| DG-2 | `DG-2-P1` | `admin`/`pasteur` | **double validation** |

## 2. Profils secondaires

| Groupe | Secondaires (à transférer puis désactiver) |
|--------|--------------------------------------------|
| DG-1 | `DG-1-P1`, `DG-1-P2` (porteurs de données) · `DG-1-P4`, `DG-1-P5`, `DG-1-P6` (privilégiés sans donnée) |
| DG-2 | `DG-2-P2`, `DG-2-P3` (formateur, 3 actions pastorales), `DG-2-P4` |

## 3. Tables et relations à transférer · lignes avant / après

### DG-1 (gardien `DG-1-P3`)

| Table | Relation (FK) | Avant (gardien) | Secondaires | Transférables | Après (gardien) |
|-------|---------------|-----------------|-------------|---------------|-----------------|
| `inscriptions_formation` | `user_id` | 0 | 2 | 2 | 2 |
| `video_progress` | `user_id` | 0 | 2 | 2 | 2 |
| `app_notifications` | `user_id` | 0 | 2 | 2 | 2 |
| `group_attendance` | `user_id` | 0 | 0 | 0 | 0 |
| `pastoral_actions_log` | `member_id` | 0 | 0 | 0 | 0 |
| `newcomer_intakes` | `converted_profile_id` | 0 | 0 | 0 | 0 |
| **Total** | | **0** | **6** | **6** | **6** |

### DG-2 (gardien `DG-2-P1`)

| Table | Relation (FK) | Avant (gardien) | Secondaires | Transférables | Après (gardien) |
|-------|---------------|-----------------|-------------|---------------|-----------------|
| `inscriptions_formation` | `user_id` | 1 | 1 | 0 (dédup) | 1 |
| `video_progress` | `user_id` | 3 | 0 | 0 | 3 |
| `pastoral_actions_log` | `member_id` | 0 | **3** | **3** | **3** |
| `app_notifications` | `user_id` | 4 | 6 | 6 | 10 |
| `group_attendance` | `user_id` | 0 | 0 | 0 | 0 |
| `newcomer_intakes` | `converted_profile_id` | 0 | 0 | 0 | 0 |
| **Total** | | **8** | **10** | **9** | **17** |

## 4. Conflits de contraintes uniques

| Groupe | Table | Contrainte | Conflits | Résolution |
|--------|-------|------------|----------|------------|
| DG-1 | — | — | **0** | aucune |
| DG-2 | `inscriptions_formation` | UNIQUE(user_id, formation_id) | **1** | dédup non destructive : conserver l'inscription du gardien, retenir la progression la plus avancée |
| DG-2 | autres | UNIQUE(...) / — | 0 | re-point propre / libre |

**Total conflits uniques : 1 (DG-2), résolu sans perte.**

## 5. Conflits de rôles

| Groupe | Rôles présents | Traitement |
|--------|----------------|------------|
| DG-1 | super_admin, admin, berger, membre, 2×visiteur | gardien garde `super_admin` ; **aucun cumul** — rôles secondaires non transférés (comptes désactivés) |
| DG-2 | admin/pasteur, formateur, 2×visiteur | gardien garde `admin`/`pasteur` ; **aucun cumul** — rôle `formateur` non transféré, mais ses **données** le sont |

**Aucun conflit de rôle exécutoire** : la fusion ne cumule jamais les privilèges. Le seul point
d'attention (DG-1) est **identitaire** (les 4 privilégiés sont-ils une seule personne ?) et fait
l'objet de la condition préalable, pas d'un conflit technique.

## 6. Éléments non transférables

**Aucun.** Toutes les lignes de rattachement sont soit re-pointables proprement, soit dédupliquables
sans perte. `non_transferable = 0` sur les 12 lignes de `WM34-DEPENDENCY-TRANSFER-MATRIX.csv`.

## 7. Pertes potentielles

**Aucune.** Le seul conflit (DG-2 inscription) conserve la meilleure valeur de progression. Aucune
suppression de donnée ; les comptes secondaires sont **désactivés** (`archived_at`), non supprimés.

## 8. Conditions de rollback

- Niveau A : `ROLLBACK` avant `COMMIT` (chemin nominal si un contrôle échoue).
- Niveau B : restauration depuis snapshot pré-fusion (aucune suppression → tout re-pointable).
- Détail : `WM34-ROLLBACK-PLAN.md`. Pré-requis : snapshot vérifié (`WM34-PRE-MERGE-BACKUP-CONTRACT.md`).

## 9. Contrôles pour passer `PRE-ID-03` à PASS

`PRE-ID-03` = « 0 groupe de doublons canoniques côté `profiles` ». Après fusion :

| Contrôle | Cible |
|----------|-------|
| C1 — Profils **actifs** (`archived_at IS NULL`) par empreinte canonique N2 | **1** pour `8c12c2c748ecc387` **et** `62a52607eec94560` |
| C2 — Groupes de doublons canoniques (profils actifs) | **0** |
| C3 — `profiles` actifs distincts = empreintes canoniques distinctes | 13 → **5** actifs / 5 boîtes |
| C4 — Aucune ligne de rattachement ne pointe encore un UUID désactivé | 0 |
| C5 — Somme des rattachements après = somme avant (conservation) | égalité stricte |

`PRE-ID-03 = PASS` **si et seulement si** C1..C5 sont tous vérifiés par re-sonde lecture seule
**après** exécution humaine. En l'état WM-3.4 (aucune fusion) : **`PRE-ID-03 = FAIL`**.

---

## 10. Interdits respectés

Dry-run **lecture seule** (GET) · 0 `UPDATE`/`DELETE` · aucune fusion · aucune désactivation ·
aucune donnée modifiée · UUID/PII hors Git (`private/`).
