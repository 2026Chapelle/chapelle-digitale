# WM-3.3 — Statut final

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.3` |
| Branche | `stabilisation-p0-recette-citadelle` |
| Commit de référence | `f369f0fa8304c4dce09da697c1a925230783b3dd` |
| Périmètre | R1 (collecte lecture seule + recommandation) + R2 (enregistrement des décisions) |
| Sonde | **lecture seule** production Supabase (`GET`/`HEAD` uniquement) |
| Nature | analyse + collecte + recommandation ; **aucune** mutation |
| Verdict | **`WM33_R1_EVIDENCE_READY_FOR_FINAL_DECISION`** |

---

## 1. Ce qui a été fait

| Action | État |
|--------|------|
| Enregistrer les décisions R2 | **fait** (`WM33-R2-HUMAN-DECISIONS-RECORDED.md`) |
| Collecter R1 en lecture seule (UUID, auth, rôles, statut, données, activité, dépendances) | **fait** (10 profils sondés) |
| Produire une matrice anonymisée complète | **fait** (`WM33-R1-PROFILE-DEPENDENCIES-MATRIX.csv`, 10 lignes) |
| Aucune fusion / désactivation / correction | **respecté** |
| Réévaluer `PRE-ID-03` | **fait** → **FAIL** (2 groupes subsistent, rien fusionné) |
| Maintenir WM-4 NO-GO tant que R1 non levé | **respecté** |

---

## 2. Résultats clés (anonymisés)

| Groupe | Profils | Gardien recommandé | Signal | Risque | Double validation |
|--------|---------|--------------------|--------|--------|-------------------|
| DG-1 | 6 | compte de travail admin (à confirmer) | `role_conflict` + `privilege_data_split` (4 comptes privilégiés du 2026-07-09 sans donnée) | faible | non |
| DG-2 | 4 | DG-2-P1 (admin/pasteur) | `role_conflict` ; 3 actions pastorales sur un compte secondaire | élevé | **oui** |

- `profiles` = 13, `auth.users` = 13 (concordant WM-3.1).
- Correspondance `profiles.id` ↔ `auth.users.id` : **10/10 = oui**.
- `PRE-ID-03` = **FAIL** (attendu — aucune donnée modifiée).

---

## 3. Livrables (`docs-migration-wp/WM-3.3/`)

| Fichier | Objet |
|---------|-------|
| `WM33-R1-READONLY-IDENTITY-EVIDENCE.md` | preuve de collecte lecture seule (méthode + constats) |
| `WM33-R1-PROFILE-DEPENDENCIES-MATRIX.csv` | matrice anonymisée 10 profils (2 groupes) |
| `WM33-R1-MERGE-RECOMMENDATION.md` | gardiens recommandés + données à fusionner + risque |
| `WM33-R2-HUMAN-DECISIONS-RECORDED.md` | décisions R2 consignées + traduction WM-4 |
| `WM33-IMPACT-ON-WM4.md` | impact sur les conditions d'ouverture WM-4 |
| `WM33-FINAL-STATUS.md` | présent document |
| `manifests/WM33-MANIFEST.json` | manifeste du lot |
| `manifests/SHA256SUMS.txt` | empreintes des livrables |
| `private/` (non commité, `**/private/`) | UUID / e-mail / prénom bruts (PII) — hors Git |

---

## 4. Marqueurs

| Marqueur | État |
|----------|------|
| `WM33_R1_EVIDENCE_READY_FOR_FINAL_DECISION` | **émis** (verdict courant) |
| `PRE-ID-03` | **FAIL** (R1 non levé — fusion non exécutée) |
| `PRE-MED-04` | arbitré (décisions R2 tracées) |
| `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` | **interdit** (reste interdit) |
| WM-4 | **NO-GO** |

---

## 5. Non-impact (interdits respectés)

| Contrôle | Valeur |
|----------|--------|
| Écritures WordPress / Supabase / Citadelle | 0 |
| Fusion de comptes / désactivation | 0 |
| Correction de profil | 0 |
| Média créé | 0 |
| Sonde production | **lecture seule** (GET/HEAD) |
| PII publiée hors `private/` | 0 (matrice pseudonymisée) |
| Export WM-4 produit | 0 |
| Migration exécutée | non |
| Déploiement | non |
| Commit Git | non |
| Push Git | non |
| Sauvegarde WM-1 modifiée | non |
| WM-3.1 / WM-3.2 modifiés | non |
| Fichiers hors périmètre touchés | non |

Seules écritures disque : livrables sous `docs-migration-wp/WM-3.3/` + PII cloisonnée dans
`docs-migration-wp/WM-3.3/private/` (ignorée par Git).
