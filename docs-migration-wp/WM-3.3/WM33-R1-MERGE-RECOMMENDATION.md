# WM-3.3 — R1 · Recommandation de fusion (pour décision finale humaine)

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.3` |
| Nature | **recommandation uniquement** — aucune fusion, désactivation ou correction exécutée |
| Base | `WM33-R1-PROFILE-DEPENDENCIES-MATRIX.csv` + `WM33-R1-READONLY-IDENTITY-EVIDENCE.md` |
| Décision amont | `MANUAL_IDENTITY_REVIEW` (DG-1 et DG-2) ; DG-2 = double validation |
| État `PRE-ID-03` | **FAIL** (2 groupes subsistent — rien n'a été fusionné) |

> Ce document **prépare** la décision finale. Il ne l'exécute pas. Toute fusion/désactivation
> reste un acte humain ultérieur, hors WM-3.3.

---

## 1. DG-1 — boîte `8c12c2c748ecc387` (6 profils)

**Diagnostic**
- `role_conflict = oui` : super_admin, admin, berger, membre coexistent sur une seule boîte.
- `privilege_data_split = oui` : les 4 comptes privilégiés (créés le **2026-07-09**) ont **0 donnée** ;
  la donnée est sur les 2 comptes `visiteur` plus anciens (P1 = 1, P2 = 5).
- Hypothèse forte : les 4 comptes du 2026-07-09 sont des **comptes de test de rôles** de
  l'administrateur. À **confirmer** avant toute action.

**Compte candidat à conserver**
- Pour le **privilège** : `DG-1-P3` (super_admin) — mais 0 donnée.
- Pour la **donnée** : `DG-1-P2` (visiteur, 5 rattachements).
- **Décision réelle suspendue** à la confirmation : « ces 6 comptes sont-ils une seule personne ? »

**Deux scénarios possibles (au choix du décideur)**

| Scénario | Si confirmé que… | Action recommandée | Données à fusionner |
|----------|------------------|--------------------|---------------------|
| S1 — comptes de test | les 4 privilégiés du 2026-07-09 sont des tests | conserver 1 compte réel (le compte de travail admin), **désactiver** les 3 autres comptes de test, **fusionner** P1+P2 (formations, vidéo, notifs) vers le compte conservé | formations=2, vidéo=2, notifs=2 |
| S2 — usages distincts réels | chaque rôle correspond à un usage voulu | `KEEP_ALL` provisoire **impossible** (bloque WM-4) → trancher un compte principal + rattacher les 5 autres | idem |

**Risque de perte** : **faible** — la donnée est concentrée sur 2 comptes (`visiteur`), facilement
re-rattachable ; les 4 comptes privilégiés n'ont aucune donnée à perdre.

**Recommandation Claude (DG-1)** : `MERGE_THEN_DISABLE` après confirmation « comptes de test »,
gardien = compte de travail réel de l'administrateur, ré-attacher les rattachements des 2 comptes
`visiteur`. Ne rien exécuter avant validation.

---

## 2. DG-2 — boîte `62a52607eec94560` (4 profils) — **double validation**

**Diagnostic**
- `role_conflict = oui` : admin/pasteur + formateur + 2 visiteurs.
- `privilege_data_split = non` : le gardien naturel `DG-2-P1` (admin/pasteur) est le plus ancien
  (2026-05-30) **et** le plus doté (8 rattachements).
- **Point sensible** : `DG-2-P3` (formateur) porte **3 actions pastorales** — à re-rattacher, pas
  à perdre.

**Compte candidat à conserver** : `DG-2-P1` (admin/pasteur, 8 rattachements, le plus ancien).

**Données à fusionner vers le gardien**
| Depuis | Domaines |
|--------|----------|
| DG-2-P2 | formations=1 ; notifs=1 |
| DG-2-P3 | **actions_pastorales=3** ; notifs=3 |
| DG-2-P4 | notifs=2 |

**Risque de perte** : **élevé** — compte à privilèges pastoraux + 3 actions pastorales sur un compte
secondaire. Une désactivation avant re-rattachement perdrait de l'historique pastoral.

**Recommandation Claude (DG-2)** : `MERGE_THEN_DISABLE` — gardien `DG-2-P1`, re-rattacher
formations / actions pastorales / notifications des 3 comptes secondaires **puis** désactiver.
**Double validation obligatoire** avant exécution (compte admin/pasteur). Ne rien exécuter ici.

---

## 3. Synthèse

| Groupe | Gardien recommandé | Option | Risque | Pré-requis |
|--------|--------------------|--------|--------|-----------|
| DG-1 | compte de travail admin (à confirmer) | `MERGE_THEN_DISABLE` | faible | confirmer « comptes de test 2026-07-09 » |
| DG-2 | DG-2-P1 (admin/pasteur) | `MERGE_THEN_DISABLE` | élevé | **double validation** + préserver actions pastorales |

**Après exécution humaine** (hors WM-3.3), une re-sonde devra confirmer `PRE-ID-03 = PASS`
(1 seul compte actif par boîte canonique). Tant que non fait : **`PRE-ID-03 = FAIL`**, WM-4 NO-GO.

---

## 4. Interdits respectés

Aucune fusion · aucune désactivation · aucune écriture · recommandation lecture seule uniquement.
