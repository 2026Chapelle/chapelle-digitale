# WM-3.4 — Décisions humaines confirmées

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.4` |
| Objet | Consigner les décisions humaines formelles servant de base au plan de fusion R1 |
| Nature | **plan + dry-run uniquement** — aucune donnée de production modifiée |

---

## 1. DG-1 — boîte `8c12c2c748ecc387` (6 profils)

| Élément | Décision |
|---------|----------|
| Décision | **`MERGE_THEN_DISABLE`** |
| Gardien | compte de travail administrateur recommandé par WM-3.3 (`DG-1-P3`, rôle `super_admin`) |
| **Condition préalable bloquante** | confirmer que les **4 profils privilégiés créés le 2026-07-09** (`DG-1-P3` super_admin, `DG-1-P4` admin, `DG-1-P5` berger, `DG-1-P6` membre) sont des **comptes de test de rôles** |
| Données à préserver | rattachements des **2 profils visiteurs** (`DG-1-P1`, `DG-1-P2`) → transférés vers le gardien |
| Verrou | **ne pas exécuter** tant que la confirmation « comptes de test » n'est pas documentée |

> **Précision du plan** : le gardien retenu par le dry-run est `DG-1-P3` (rôle le plus privilégié).
> Ceci **suppose** que `DG-1-P3` est le compte de travail réel de l'administrateur et que `P4/P5/P6`
> sont les comptes de test à désactiver. Si la confirmation désigne un **autre** compte comme
> gardien réel, le plan se ré-instancie mécaniquement (mêmes tables, même méthode) sur ce gardien.

## 2. DG-2 — boîte `62a52607eec94560` (4 profils)

| Élément | Décision |
|---------|----------|
| Décision | **`MERGE_THEN_DISABLE`** |
| Gardien | **`DG-2-P1`** (rôle `admin`, statut `pasteur`) |
| Donnée sensible à transférer | les **3 actions pastorales** du profil secondaire `DG-2-P3` (`pastoral_actions_log`) |
| Préservation | **tous** les rattachements du profil `formateur`/`membre_actif` (`DG-2-P3`) |
| Verrou | **double validation obligatoire** avant exécution (compte admin/pasteur) |

## 3. R2 — médias manquants

Décisions WM-3.3 **confirmées et inchangées** :
- `34548` / `34555` / `34577` → `RESTORE_FROM_EXTERNAL_SOURCE` (repli `REPLACE_WITH_APPROVED_MEDIA`)
- `34549` / `34553` → `MIGRATE_WITHOUT_MEDIA` + `ABANDON_REFERENCE`
- aucun média fictif.

---

## 4. Portée de WM-3.4

WM-3.4 produit **uniquement** : un plan d'exécution réversible, les matrices de transfert et de
consolidation des rôles, un contrat de sauvegarde pré-fusion, un plan de rollback, un **dry-run**
lecture seule, les contrôles pré/post et une checklist de GO. **Aucune fusion, désactivation,
migration ni déploiement.** WM-4 reste **NO-GO** ; `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK`
reste **interdit**.
