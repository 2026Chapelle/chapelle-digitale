# WM-3.7 — Préparation de WM-4

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.7` |
| État WM-4 | **NO-GO** |

---

## 1. État consolidé des réserves

| Réserve | Contrôle | État | Reste à faire |
|---------|----------|------|---------------|
| R1 — doublons profils | `PRE-ID-03` | **FAIL** | fusion atomique DG-1 (gardien P2, dédup) + DG-2 (validée) |
| R2 — médias manquants | `PRE-MED-04` | arbitré (décidé) | exécution WM-4 (restauration/abandon) |
| R3 — 19 leçons INCOMPLETE | `PRE-LMS-05` | non bloquant | éditorial (hors R1/R2) |

## 2. R1 — état de préparation

| Élément | État |
|---------|------|
| DG-1 gardien | **confirmé `DG-1-P2`** |
| DG-1 conflit intégré | oui (`inscriptions_formation`, dédup non destructive) |
| DG-1 nouveau dry-run | produit (`WM37-DG1-NEW-DRY-RUN.md`) |
| DG-2 gardien + validations | **inchangé** — `DG-2-P1`, double validation conservée |
| Snapshot | disponible (WM-3.6) |
| Contrôles pré/post | définis (WM-3.4) |
| **Prérequis transactionnel** | **NON satisfait** (bloquant) |

## 3. Chemin critique restant

```
Fournir Option A (RPC transactionnelle) OU Option B (accès Postgres direct)   ← SEUL blocage restant
   └─> exécuter fusion R1 atomique (DG-1 + DG-2)
         └─> PRE-ID-03 = PASS
               └─> exécuter R2 (médias)  →  PRE-MED-04 = PASS
                     └─> PRE-00 revérifié
                           └─> réévaluation globale finale
                                 └─> WM-4 ouvrable
```

Le plan R1 est **entièrement réaligné et prêt** ; il ne manque que le **moyen d'exécution
transactionnel**. `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` reste **interdit**.
