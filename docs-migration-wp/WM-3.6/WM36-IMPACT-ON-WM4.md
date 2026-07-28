# WM-3.6 — Impact sur WM-4

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.6` |
| État WM-4 | **NO-GO** (inchangé) |

---

## 1. Effet de WM-3.6

| Élément | État |
|---------|------|
| Fusion R1 exécutée | **non** (bloquée en pré-check, 0 écriture) |
| `PRE-ID-03` | **FAIL** (2 groupes de doublons actifs subsistent) |
| `PRE-MED-04` (R2) | arbitré (décisions tracées WM-3.3/3.5) — non exécuté |
| Snapshot pré-fusion | produit, vérifié, disponible |

## 2. Conditions d'ouverture de WM-4

| # | Condition | État |
|---|-----------|------|
| 1 | Réserves acceptées par décision humaine | R1/R2 décidées ; **R1 non exécutée** |
| 2 | `PRE-ID-03` **et** `PRE-MED-04` corrigés ou levés | **PRE-ID-03 encore FAIL** |
| 3 | Sauvegarde WM-1 intacte (`PRE-00`) | à revérifier |

**Condition 2 non satisfaite → WM-4 reste NO-GO.**

## 3. Chemin de reprise

```
WM-3.6 (bloqué : pas de transaction + drift DG-1)
   ├─ Fournir un chemin transactionnel (DATABASE_URL/DIRECT_URL, ou RPC transactionnelle autorisée)
   ├─ Re-valider le plan DG-1 (gardien DG-1-P2 + dédup inscriptions_formation)
   └─ Ré-exécuter la fusion R1 atomique
         └─> PRE-ID-03 = PASS
               └─> avec R2 exécuté + PRE-00 → réévaluation globale finale → WM-4 ouvrable
```

Après une future exécution réussie, WM-4 restera en attente d'une **réévaluation globale finale**.
`CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` reste **interdit**.
