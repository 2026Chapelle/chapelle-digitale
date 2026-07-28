# WM-3.10 — Réévaluation finale `PRE-ID-03`

| Champ | Valeur |
|-------|--------|
| Contrôle | `PRE-ID-03` — 0 groupe de doublons canoniques côté `profiles` (actifs) |
| Résultat | **PASS** ✅ |
| Mode | re-sonde lecture seule (production) |

---

## 1. Mesure post-fusion (tous profils)

| Mesure | Avant fusion | Après fusion |
|--------|--------------|--------------|
| `profiles` total | 13 | 13 |
| `profiles` **actifs** | 13 | **5** |
| `profiles` archivés | 0 | **8** (5 DG-1 + 3 DG-2) |
| Empreintes canoniques actives distinctes | 5 | **5** |
| **Groupes de doublons canoniques actifs** | **2** | **0** |

## 2. Vérification par boîte cible

| Boîte canonique | Profils actifs après |
|-----------------|----------------------|
| `8c12c2c748ecc387` (DG-1) | **1** |
| `62a52607eec94560` (DG-2) | **1** |
| 3 autres boîtes (singletons sains) | 1 chacune |

Total : **5 boîtes canoniques ↔ 5 profils actifs**, un pour un.

## 3. Verdict

**`PRE-ID-03 = PASS`.** Le défaut d'hygiène (13 profils pour 5 boîtes) est résorbé : chaque boîte
réelle n'a plus qu'un seul profil actif. Aucun compte supprimé (8 archivés, réversibles).

Preuve brute : `private/WM310-PREID03.json`.
