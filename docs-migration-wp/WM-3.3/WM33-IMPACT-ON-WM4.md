# WM-3.3 — Impact sur WM-4

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.3` |
| État WM-4 | **NO-GO** (inchangé) |

---

## 1. Conditions d'ouverture de WM-4 (rappel contrat §10)

| # | Condition | Avant WM-3.3 | Après WM-3.3 |
|---|-----------|--------------|--------------|
| 1 | Verdict WM-3.1 + réserves acceptées | réserves non acceptées | **R2 acceptée** ; R1 : décision de méthode (`MANUAL_IDENTITY_REVIEW`) prise, **exécution en attente** |
| 2 | `PRE-ID-03` **et** `PRE-MED-04` corrigés ou levés par décision tracée | aucun | **R2 : décision tracée** ; **R1 : PRE-ID-03 encore FAIL** (aucune fusion faite) |
| 3 | Sauvegarde WM-1 intacte (`PRE-00`) | à vérifier | à vérifier à l'ouverture WM-4 |

---

## 2. État des deux contrôles bloquants

| Réserve | Contrôle | Avant | Après WM-3.3 | Bloquant |
|---------|----------|-------|--------------|----------|
| R1 | `PRE-ID-03` | FAIL non instruit | **FAIL instruit** — preuve complète collectée, gardiens recommandés, fusion **non exécutée** | **oui** |
| R2 | `PRE-MED-04` | FAIL non arbitré | **arbitré** — décisions rendues et tracées (`WM33-R2-HUMAN-DECISIONS-RECORDED.md`) | levable (voir ci-dessous) |

- **R1 / `PRE-ID-03`** : reste **FAIL**. WM-3.3 a rendu la décision *prête* (evidence complète), mais
  la fusion/désactivation est un acte humain ultérieur. Tant que 2 comptes actifs subsistent par
  boîte canonique, le contrôle échoue. **WM-4 reste bloqué par R1.**
- **R2 / `PRE-MED-04`** : **décision rendue**. Les 2 pièces jointes sont levables immédiatement
  (`MIGRATE_WITHOUT_MEDIA`/`ABANDON_REFERENCE`) ; les 3 vidéos sont levables en WM-4 après obtention
  d'une source (`RESTORE`/repli `REPLACE`). Condition §10-2 **satisfaite côté R2**.

---

## 3. Ce qui reste avant le GO WM-4

```
WM-3.3 (evidence R1 prête + décisions R2 tracées)
   ├─ R1 : décision finale humaine (gardien DG-1 + DG-2, double validation DG-2)
   │        └─> exécution fusion/désactivation (acte humain, hors WM-3.3)
   │              └─> re-sonde lecture seule : PRE-ID-03 = PASS
   ├─ R2 : exécution WM-4 (restauration/abandon selon décisions tracées)
   │        └─> PRE-MED-04 = PASS
   └─ PRE-00 revérifié
         └─> Conditions §10 satisfaites → WM-4 ouvrable (lot séparé)
```

**Tant que `PRE-ID-03` n'est pas repassé à PASS (fusion R1 exécutée + re-sondée) : WM-4 = NO-GO.**
Le marqueur `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` reste **interdit**.

---

## 4. Non-impact

R1 et R2 ne modifient aucun comptage de réconciliation des 8 domaines (`delta = 0` inchangé).
R3 (`PRE-LMS-05`, 19 leçons `INCOMPLETE`) reste non bloquant et hors périmètre.
