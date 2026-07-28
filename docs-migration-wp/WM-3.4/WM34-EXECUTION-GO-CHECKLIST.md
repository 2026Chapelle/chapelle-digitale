# WM-3.4 — Checklist de GO d'exécution

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.4` |
| Objet | Porte finale humaine avant l'exécution de la fusion R1 (lot ultérieur) |
| Statut | **checklist vierge** — WM-3.4 n'exécute rien |

> Aucune case n'est cochée par WM-3.4. La fusion ne peut débuter que lorsque **toutes** les cases
> ci-dessous sont cochées et signées par les décideurs.

---

## 1. Décisions & validations

- [ ] DG-1 — confirmation documentée : les 4 profils privilégiés du 2026-07-09 sont des comptes de test
- [ ] DG-1 — gardien réel confirmé (`DG-1-P3` ou compte désigné)
- [ ] DG-2 — **validation 1** (technique)
- [ ] DG-2 — **validation 2** (pastorale — compte admin/pasteur)

## 2. Sauvegarde & réversibilité

- [ ] Snapshot pré-fusion des 8 tables réalisé et vérifié (`PRE-M-03`)
- [ ] `SHA256SUMS` du snapshot généré et copié hors session
- [ ] Plan de rollback A/B relu et compris (`WM34-ROLLBACK-PLAN.md`)

## 3. Cohérence dry-run ↔ live

- [ ] Comptes de rattachement live = dry-run (`PRE-M-04`)
- [ ] Gardien actif + secondaires identifiés par UUID (`PRE-M-05`)
- [ ] Conflit unique DG-2 confirmé = 1, stratégie de dédup validée

## 4. Fenêtre d'exécution

- [ ] Exécution en **transaction unique par groupe**
- [ ] Contrôles `IN-M-*` armés (rollback si échec)
- [ ] Contrôles `POST-M-*` armés (dont `PRE-ID-03 = PASS`)

## 5. Après exécution

- [ ] Re-sonde lecture seule → `PRE-ID-03 = PASS` (0 doublon canonique actif)
- [ ] Total rattachements conservé (aucune perte)
- [ ] Production d'un lot `WM-3.5` (ou WM-4 pré-ouverture) consignant le résultat

---

## 6. Portes restantes indépendantes de R1

- [ ] R2 exécuté (restauration/abandon médias) → `PRE-MED-04 = PASS`
- [ ] `PRE-00` (sauvegarde WM-1 intacte) revérifié

**Tant que les sections 1→5 ne sont pas intégralement cochées : fusion interdite, WM-4 NO-GO,
marqueur `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` interdit.**
