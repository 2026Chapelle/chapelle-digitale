# WM-3.2 — R1 · Doublons de profils Citadelle (dossier de décision)

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.2` |
| Réserve traitée | **R1** — contrôle `PRE-ID-03` **BLOQUANT en échec** |
| Source de preuve | `WM-3.1/WM31-IDENTITIES-REPORT.md` §4 · `WM31-IDENTITIES-MATRIX.csv` · `WM31-WM4-EXPORT-CONTRACT.md` §5.1 (`QU-ID-TARGET-DUPLICATE`) |
| Nature | **analyse + dossier de décision uniquement** — aucune donnée modifiée |
| Écriture cible | **aucune** (ni profil, ni auth.users, ni fusion, ni désactivation) |
| Matrice | `WM32-R1-DUPLICATE-PROFILES-MATRIX.csv` — 2 lignes (2 groupes) |

> R1 n'est **pas** un défaut d'import. C'est un défaut d'hygiène **préexistant de la base cible
> Citadelle**, révélé par la sonde lecture seule WM-3.1. WM-3.2 le documente et prépare la décision
> humaine ; il ne le corrige pas.

---

## 1. Constat ancré (WM-3.1)

La cible Citadelle héberge **13 `profiles` / 13 `auth.users` pour seulement 5 boîtes e-mail
réelles** (empreintes canoniques N2 distinctes). Deux boîtes concentrent les doublons :

| Groupe | Empreinte canonique N2 | `profiles` | `auth.users` | Rôle du gardien | Statut membre | Frères redondants |
|--------|------------------------|-----------|--------------|-----------------|---------------|-------------------|
| **DG-1** | `8c12c2c748ecc387` | 6 | 6 | `visiteur` | `visiteur` | 5 |
| **DG-2** | `62a52607eec94560` | 4 | 4 | `admin` | `pasteur` | 3 |

Total redondant : **8 comptes** (5 + 3). Les 3 autres boîtes canoniques sont des singletons sains,
hors périmètre R1.

Cause racine (gmail.com) : les variantes **ponctuées** (`p.r.enom@`) et **taguées** (`prenom+x@`)
désignent une seule boîte réelle ; chaque variante a créé un compte distinct côté Citadelle.

### Rattachement aux 35 identités WordPress (non ambigu)

Aucune des 35 identités WP ne devient ambiguë : les 4 rapprochements `ALREADY_PRESENT` se font par
égalité **stricte N1**, la cible est déterminée sans arbitrage. Deux de ces rapprochements tombent
toutefois **dans** un groupe de doublons cible :

- WP ID 2 → boîte DG-1 (`citadelle_target_duplicate_siblings = 5`)
- WP ID 33 → boîte DG-2 (`citadelle_target_duplicate_siblings = 3`, profil `admin`/`pasteur`)

---

## 2. Ce qui est prouvé vs ce qui reste à collecter

| Attribut | État en WM-3.1 | Pour la décision |
|----------|----------------|------------------|
| Nombre de profils par groupe | **prouvé** (6 / 4) | suffisant |
| Empreinte canonique | **prouvée** (N2 publiée) | suffisant |
| Présence `auth.users` | **prouvée** (6 / 4) | suffisant |
| Rôle / statut du gardien | **prouvé** (visiteur/visiteur ; admin/pasteur) | suffisant |
| UUID distincts par membre | **non publié** (anonymisation PII) | **à collecter en revue technique lecture seule** |
| Données rattachées (inscriptions, notes pastorales, groupes, présences) | **non mesuré** | **à collecter avant toute fusion** |
| Activité récente (dernière connexion, événements) | **non mesuré** | **à collecter avant toute désactivation** |

**Conséquence méthodologique :** aucune fusion ni désactivation ne peut être décidée en aveugle.
La matrice porte explicitement `non_publie_wm31_a_collecter` sur ces colonnes — WM-3.2 **ne fabrique
aucun UUID ni aucune mesure d'activité**.

---

## 3. Options possibles (par groupe)

| Option | Description | Quand la retenir |
|--------|-------------|------------------|
| `KEEP_ONE_DISABLE_OTHERS` | Conserver le gardien, désactiver les redondants **sans** déplacer leurs données | données rattachées nulles ou négligeables sur les redondants |
| `MERGE_THEN_DISABLE` | Ré-attacher les données des redondants vers le gardien, **puis** désactiver | données rattachées présentes sur plusieurs comptes |
| `KEEP_ALL_TEMPORARILY` | Ne rien changer, lever la réserve sans corriger | jamais recommandé — aggrave le défaut à l'import |
| `MANUAL_IDENTITY_REVIEW` | Collecter UUID + données + activité, arbitrer cas par cas | **données inconnues (état actuel)** |
| `BLOCK_IMPORT` | Suspendre l'import des 30 nouvelles identités tant que non résolu | conséquence automatique de `PRE-ID-03` |

---

## 4. Recommandation Claude

| Groupe | Recommandation primaire | Enchaînement probable après collecte | Justification |
|--------|-------------------------|--------------------------------------|---------------|
| **DG-1** (6, visiteur) | `MANUAL_IDENTITY_REVIEW` | → `MERGE_THEN_DISABLE` si données réparties, sinon `KEEP_ONE_DISABLE_OTHERS` | risque faible à modéré, gardien = profil strict-matché WP2 |
| **DG-2** (4, admin/pasteur) | `MANUAL_IDENTITY_REVIEW` | → `MERGE_THEN_DISABLE` avec double validation | **risque élevé** : compte à privilèges pastoraux ; une désactivation erronée retire un accès admin ou casse un rattachement pastoral |

**Transversal :** `BLOCK_IMPORT` reste **actif de fait** — `PRE-ID-03` interdit l'ouverture de WM-4
tant que les 2 groupes ne sont pas arbitrés (importer 30 identités sur une table déjà porteuse de
doublons aggraverait le défaut). `KEEP_ALL_TEMPORARILY` est **déconseillé**.

---

## 5. Interdits respectés

Aucune fusion · aucune désactivation · aucune écriture `profiles`/`auth.users` · aucun UUID publié ·
aucune adresse, nom ou login publié · sonde WM-3.1 réutilisée en lecture seule, non ré-exécutée.
