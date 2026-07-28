# WM-3.2 — Statut final

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.2` |
| Branche | `stabilisation-p0-recette-citadelle` |
| Commit de référence | `f369f0fa8304c4dce09da697c1a925230783b3dd` |
| Périmètre | **R1** (doublons profils) + **R2** (5 médias manquants) uniquement |
| Amont | `WM-3.1` (verdict `WM31_OK_WITH_RESERVATIONS`) — non modifié |
| Nature | analyse + dossiers de décision ; **aucune** mutation |
| Verdict | **`WM32_AWAITING_HUMAN_DECISION`** |

---

## 1. Réserves traitées

| Réserve | Contrôle | Statut WM-3.2 | Décision humaine |
|---------|----------|---------------|------------------|
| R1 — doublons de profils Citadelle | `PRE-ID-03` (bloquant) | **documentée**, options + recommandation prêtes | **en attente** |
| R2 — cinq médias manquants | `PRE-MED-04` (bloquant) | **documentée**, options + recommandation prêtes | **en attente** |
| R3 — 19 leçons `INCOMPLETE` | `PRE-LMS-05` (non bloquant) | **hors périmètre WM-3.2** | — |

Comme les deux décisions ne sont pas encore formellement rendues, le verdict autorisé est
**`WM32_AWAITING_HUMAN_DECISION`** (et non `WM32_DECISIONS_DOCUMENTED`).

---

## 2. Livrables produits (sous `docs-migration-wp/WM-3.2/`)

| Fichier | Objet |
|---------|-------|
| `WM32-R1-DUPLICATE-PROFILES-DECISION.md` | dossier R1 |
| `WM32-R1-DUPLICATE-PROFILES-MATRIX.csv` | matrice anonymisée R1 (2 groupes) |
| `WM32-R2-MISSING-MEDIA-DECISION.md` | dossier R2 |
| `WM32-R2-MISSING-MEDIA-MATRIX.csv` | matrice R2 (5 références) |
| `WM32-HUMAN-DECISION-SHEET.md` | feuille de décision humaine (2 décisions) |
| `WM32-IMPACT-ON-WM4.md` | impact sur les conditions d'ouverture WM-4 |
| `WM32-FINAL-STATUS.md` | présent document |
| `manifests/WM32-MANIFEST.json` | manifeste du lot |
| `manifests/SHA256SUMS.txt` | empreintes des livrables |

---

## 3. Marqueurs

| Marqueur | État |
|----------|------|
| `WM32_AWAITING_HUMAN_DECISION` | **émis** (verdict courant) |
| `WM32_DECISIONS_DOCUMENTED` | non émis (décisions non encore rendues) |
| `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` | **interdit** (reste interdit) |
| WM-4 | **NO-GO** |

---

## 4. Interdits respectés (non-impact)

| Contrôle | Valeur |
|----------|--------|
| Écritures WordPress | 0 |
| Écritures Supabase / Citadelle | 0 |
| Fusion de comptes | 0 |
| Désactivation d'utilisateurs | 0 |
| Média créé / fichier de substitution | 0 |
| Profil modifié | 0 |
| Export WM-4 produit | 0 |
| Migration exécutée | 0 |
| Déploiement | 0 |
| Commit Git | 0 |
| Push Git | 0 |
| Sauvegarde WM-1 modifiée | non (réutilisée en lecture seule via WM-3.1) |
| Fichiers hors périmètre touchés (chapelle-home / offline-browser-test / scripts deploy / settings.local) | non |
| WM-3.1 modifié | non |

Seule écriture disque : création des livrables **sous `docs-migration-wp/WM-3.2/`**.
