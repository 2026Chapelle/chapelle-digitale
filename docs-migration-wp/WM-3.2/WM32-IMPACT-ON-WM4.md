# WM-3.2 — Impact sur WM-4

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.2` |
| Objet | Situer R1/R2 dans les conditions d'ouverture de WM-4 |
| État WM-4 | **NO-GO** (inchangé par WM-3.2) |

---

## 1. Conditions d'ouverture de WM-4 (rappel `WM31-WM4-EXPORT-CONTRACT.md` §10)

WM-4 ne peut être ouvert que si les trois conditions sont réunies :

| # | Condition | État après WM-3.2 |
|---|-----------|-------------------|
| 1 | `WM31_OK` / `WM31_OK_WITH_RESERVATIONS` émis **et** réserves acceptées par décision humaine | verdict émis ; **réserves NON encore acceptées** |
| 2 | `PRE-ID-03` **et** `PRE-MED-04` corrigés **ou** levés par décision humaine tracée | **NON satisfait** — décisions en attente (voir feuille de décision) |
| 3 | Sauvegarde WM-1 vérifiée intacte (`PRE-00`) | hors périmètre WM-3.2 (à revérifier à l'ouverture WM-4) |

**Conclusion :** la condition 2 dépend directement des 2 décisions humaines préparées par WM-3.2.
WM-3.2 rend ces décisions **prêtes**, mais ne les prend pas. WM-4 reste donc **NO-GO**.

---

## 2. Effet des deux réserves sur le contrat WM-4

| Réserve | Contrôle | Registre WM-4 | Volume | Bloquant |
|---------|----------|---------------|--------|----------|
| R1 | `PRE-ID-03` | `quarantine.csv` → `QU-ID-TARGET-DUPLICATE` | 2 groupes (8 profils redondants) | **oui** |
| R2 | `PRE-MED-04` | `quarantine.csv` → `QU-MED-MISSING-REFERENCE` | 5 références | **oui** |

Ces deux lignes de quarantaine portent `blocking=true`, `decision_owner=technique`. Elles doivent
recevoir un `proposed_default` **confirmé par décision humaine** avant que WM-4 puisse produire un
export.

---

## 3. Ce qui n'est PAS impacté

- La **réconciliation** des 8 domaines reste `delta=0` (R1/R2 ne modifient aucun comptage source).
- Les 5 références R2 ne figurent dans **aucun** terme de l'équation média (elles ne sont pas dans
  les 383) : elles sont suivies uniquement par `QU-MED-MISSING-REFERENCE`.
- R3 (`PRE-LMS-05`, 19 leçons `INCOMPLETE`) reste **non bloquant** et hors périmètre WM-3.2.
- Aucun autre contrôle pré/post-export n'est modifié par WM-3.2.

---

## 4. Chemin vers le GO WM-4

```
WM-3.2 (dossiers prêts)
   └─> Décision humaine R1 (DG-1, DG-2)  ─┐
   └─> Décision humaine R2 (5 médias)    ─┤
                                          ├─> Réserves acceptées + tracées dans quarantine.csv
                                          │   (PRE-ID-03 / PRE-MED-04 levés ou corrigés)
                                          └─> PRE-00 revérifié
                                                └─> Condition d'ouverture WM-4 satisfaite
                                                      └─> WM-4 peut être ouvert (lot séparé)
```

Tant que les 2 décisions ne sont pas rendues : **WM-4 = NO-GO**, marqueur d'approbation **interdit**.
