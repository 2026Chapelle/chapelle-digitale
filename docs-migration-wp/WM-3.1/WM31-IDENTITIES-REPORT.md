# WM-3.1 — Gap 1 · Comparaison des 35 identités par empreinte normalisée

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.1` |
| Gap fermé | **G1** — comptages identité WP vs Citadelle |
| Population source | 35 comptes `wp_users` (base `frprszbd_chapelle_premium`) |
| Population cible | Citadelle production — 13 `profiles` / 13 `auth.users` |
| Sonde cible | **lecture seule** (`GET /rest/v1/profiles`, `GET /auth/v1/admin/users`) · `2026-07-25T11:30:18Z` · hôte `nvyuyffywnuollaxguen.supabase.co` |
| Écriture cible | **aucune** |
| Matrice | `WM31-IDENTITIES-MATRIX.csv` — 35 lignes de données |
| Verdicts sans classement | **0** |

---

## 1. Méthode d'empreinte

Deux niveaux, appliqués aux deux côtés (source WP et cible Citadelle).

| Niveau | Nom | Transformation | Usage |
|--------|-----|----------------|-------|
| N1 | `email_norm` | `NFKC` → `strip` → `strip('<>')` → `lower()` | clé de rapprochement **stricte** (décisionnelle) |
| N2 | `email_canon` | N1 + suppression du `+tag` + suppression des points du *local part* pour `gmail.com`/`googlemail.com` + alias `googlemail.com`→`gmail.com` | détection de **collision / doublon** (non décisionnelle) |

Empreinte publiée : `sha256("WM31|" + valeur)` tronquée à 16 hex.
Aucune adresse, aucun nom, aucun login, aucun hash de mot de passe n'est écrit dans ce lot.
Le domaine est publié seul (précédent WM-2 `evidence/65-fc-email-domains.tsv`).

Validité (`INVALID_EMAIL`) : exactement un `@`, longueur ≤ 254, conformité à
`^[A-Za-z0-9!#$%&'*+/=?^_\`{|}~.-]+@domaine(.tld)+$`, *local part* sans point initial/final ni `..`,
domaine contenant au moins un point et sans tiret en bordure.

### Ordre de précédence des verdicts (mutuellement exclusifs)

```
1. INVALID_EMAIL        — l'adresse ne passe pas la validation
2. PRIVILEGED_ACCOUNT   — capability administrator / user_level >= 8 / tutor_instructor
3. DUPLICATE_SOURCE     — collision N1, N2 ou user_login à l'intérieur des 35
4. AMBIGUOUS            — match canonique sans match strict, ou match strict multiple,
                          ou divergence profiles/auth.users
5. ALREADY_PRESENT      — match strict N1, cible unique et cohérente
6. ABSENT               — aucun match N1 ni N2
```

---

## 2. Résultat — classification exhaustive 35/35

| Classe | N | % | Action WM-4 |
|--------|---|---|-------------|
| `ALREADY_PRESENT` | **4** | 11,4 % | `RAPPROCHER_NO_CREATE` |
| `ABSENT` | **30** | 85,7 % | `EXPORTABLE_CREATE_VISITEUR` |
| `AMBIGUOUS` | **0** | 0 % | — |
| `INVALID_EMAIL` | **0** | 0 % | — |
| `DUPLICATE_SOURCE` | **0** | 0 % | — |
| `PRIVILEGED_ACCOUNT` | **1** | 2,9 % | `REJECTED_EXCLUDED_FROM_BATCH` |
| **Total** | **35** | **100 %** | — |

### Quantification exacte demandée

| Question | Réponse | Preuve |
|----------|---------|--------|
| Déjà présents | **4** | `verdict=ALREADY_PRESENT` — WP `ID` 2, 10, 21, 33 · `citadelle_match_level=strict_norm` · `citadelle_strict_profiles_hits=1` chacun |
| Absents | **30** | `verdict=ABSENT` · `citadelle_match_level=none` |
| Ambigus | **0** | aucun `AMBIGUOUS` — voir §4 pour la réserve cible |
| Invalides | **0** | `email_valid=yes` sur 35/35 · cohérent WM-2 `10-users-aggregates.tsv` (`users_email_no_at=0`) |
| Doublons | **0** | 35 empreintes N1 distinctes **et** 35 empreintes N2 distinctes · cohérent WM-2 `11-users-duplicates.tsv` (`duplicate_email_groups=0`) |
| Privilégiés | **1** | WP `ID` 1 · capability `a:2:{s:13:"administrator";b:1;s:16:"tutor_instructor";b:1;}` |

Réconciliation : `4 + 30 + 0 + 0 + 0 + 1 = 35`. **Aucune identité sans verdict.**

---

## 3. Détail des 4 identités déjà présentes

| WP ID | Empreinte N1 | Empreinte N2 | Domaine | Niveau de match | `profiles` stricts | Frères canoniques cible | `profiles.role` | `profiles.membre_statut` |
|-------|--------------|--------------|---------|-----------------|--------------------|--------------------------|-----------------|--------------------------|
| 2 | `32d7932c4e7b9847` | `8c12c2c748ecc387` | gmail.com | `strict_norm` | 1 | **5** | `visiteur` | `visiteur` |
| 10 | `46e26f9b1beb2b3a` | `46e26f9b1beb2b3a` | gmail.com | `strict_norm` | 1 | 0 | `visiteur` | `visiteur` |
| 21 | `55ecc0dd66653e05` | `55ecc0dd66653e05` | gmail.com | `strict_norm` | 1 | 0 | `visiteur` | `visiteur` |
| 33 | `62a52607eec94560` | `62a52607eec94560` | gmail.com | `strict_norm` | 1 | **3** | `admin` | `pasteur` |

Chacun des 4 rapprochements vise **exactement un** `profiles` par égalité stricte
(`citadelle_strict_profiles_hits = 1`) : la cible n'est jamais arbitrée.

Le WP ID 33 correspond à un profil déjà `admin`/`pasteur` côté Citadelle : la règle WM-3
« rôle forcé `visiteur` » ne doit **pas** l'écraser (voir §5, contrôle `PRE-ID-04`).

---

## 4. Réserve bloquante détectée côté cible (nouveau constat WM-3.1)

La sonde lecture seule révèle un défaut **de la base cible**, absent des livrables WM-2/WM-3 :

| Mesure | Valeur |
|--------|--------|
| `profiles` Citadelle | 13 |
| Empreintes canoniques N2 distinctes | **5** |
| Groupes de doublons canoniques | **2** |
| Comptes redondants | **8** (groupe de 6 → 1, groupe de 4 → 1) |

Détail (empreintes N2 publiées, adresses non publiées) :

| Empreinte N2 | `profiles` partageant la même boîte réelle |
|--------------|--------------------------------------------|
| `8c12c2c748ecc387` | **6** |
| `62a52607eec94560` | **4** |

Interprétation : chez `gmail.com`, les variantes ponctuées (`p.r.enom@`) et taguées (`prenom+x@`)
désignent **une seule boîte**. Citadelle héberge donc 13 comptes pour **5 boîtes réelles**.

Conséquence sur Gap 1 : **aucune** des 35 identités ne devient ambiguë, car chacun des 4
rapprochements se fait sur une égalité **stricte** N1 — la cible est déterminée sans arbitrage.
La colonne `citadelle_target_duplicate_siblings` porte l'information (valeur 5 pour le WP ID 2,
valeur 3 pour le WP ID 33).

Conséquence sur WM-4 : le contrôle pré-export `PRE-ID-03` (voir `WM31-WM4-EXPORT-CONTRACT.md`)
**bloque** tant que ces doublons cible ne sont pas arbitrés par décision humaine. Il s'agit d'un
défaut d'hygiène de la cible, hors périmètre de correction de WM-3.1 (aucune donnée modifiée).

---

## 5. Points de contrôle transmis à WM-4

| ID | Contrôle | Effet si échec |
|----|----------|----------------|
| `PRE-ID-01` | 35 lignes classées, somme des classes = 35 | BLOQUANT |
| `PRE-ID-02` | 0 `INVALID_EMAIL`, 0 `DUPLICATE_SOURCE` dans l'export | BLOQUANT |
| `PRE-ID-03` | 0 groupe de doublons canoniques côté `profiles` | **BLOQUANT — actuellement en échec (2 groupes)** |
| `PRE-ID-04` | Aucun `RAPPROCHER_NO_CREATE` ne réécrit `role`/`membre_statut` d'un profil existant | BLOQUANT |
| `PRE-ID-05` | 0 `user_pass` présent dans l'export (mots de passe abandonnés — WM-3) | BLOQUANT |
| `PRE-ID-06` | Le compte `PRIVILEGED_ACCOUNT` est absent du lot d'import | BLOQUANT |

---

## 6. Cohérence avec les lots antérieurs

| Assertion WM-2 / WM-3 | Mesure WM-3.1 | État |
|------------------------|---------------|------|
| `total_users=35` (WM-2 `10-users-aggregates.tsv`) | 35 lignes | **concordant** |
| `duplicate_email_groups=0` (WM-2 `11-users-duplicates.tsv`) | 0 doublon N1 et N2 | **concordant** |
| 1 admin WP exclu du batch (WM-3 `WM3-ROLE-POLICY.md`) | 1 `PRIVILEGED_ACCOUNT` | **concordant** |
| 34 comptes `um_n1-semence-royale` (WM-2 `13-capabilities-raw-counts.tsv`) | 34 lignes avec cette *shape* | **concordant** |
| « N matches / N absents non mesuré » (WM-3 addendum §1) | 4 / 30 mesurés | **gap fermé** |

---

## 7. Interdits respectés

Aucune écriture WordPress · aucune écriture Supabase · aucune écriture Citadelle · aucun export WM-4
produit · aucune adresse, nom, login ou hash publié · sauvegarde externe WM-1 non déplacée,
non modifiée, lue en seule lecture.
