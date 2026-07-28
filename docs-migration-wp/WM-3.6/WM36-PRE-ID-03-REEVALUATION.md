# WM-3.6 — Réévaluation `PRE-ID-03`

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.6` |
| Contrôle | `PRE-ID-03` — 0 groupe de doublons canoniques côté `profiles` |
| Résultat | **FAIL** (inchangé) |

---

## 1. Mesure live (lecture seule)

| Mesure | Valeur |
|--------|--------|
| `profiles` actifs | 13 |
| Empreintes canoniques N2 distinctes | 5 |
| Groupes de doublons canoniques actifs | **2** (DG-1 = 6, DG-2 = 4) |

Aucune fusion n'ayant été exécutée (blocage pré-check, 0 écriture), l'état est **identique** à
WM-3.3 / WM-3.4 / WM-3.5.

## 2. Verdict

**`PRE-ID-03 = FAIL`.** Le contrôle ne pourra passer à `PASS` qu'après :
1. levée du blocage transactionnel (connexion Postgres directe ou RPC transactionnelle autorisée) ;
2. re-validation du plan DG-1 (gardien `DG-1-P2`, conflit de dédup `inscriptions_formation`) ;
3. exécution effective de la fusion + re-sonde confirmant 1 profil actif par empreinte canonique.

## 3. Conséquence

**WM-4 reste NO-GO.** `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` reste **interdit**.
