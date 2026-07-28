# WM-3.5 — Porte d'exécution production

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.5` |
| Objet | Porte unique consolidant les validations humaines avant tout GO d'exécution |
| État | **FERMÉE** — GO d'exécution production **interdit** |

---

## 1. État des validations

| Groupe | Élément | État |
|--------|---------|------|
| DG-1 | Statut | **HOLD** |
| DG-1 | Confirmation « comptes de test 2026-07-09 » | **en attente** |
| DG-1 | Gardien formellement confirmé | **non** (candidat P3 incohérent avec « compte réellement utilisé » — voir fiche DG-1) |
| DG-2 | Validation humaine 1 | **APPROUVÉE** |
| DG-2 | Validation humaine 2 | **EN ATTENTE** |

## 2. Conditions du GO d'exécution (toutes requises)

- [ ] DG-1 — confirmation « comptes de test » documentée
- [ ] DG-1 — gardien réel désigné et cohérent
- [ ] DG-2 — validation 1 (✅ obtenue)
- [ ] DG-2 — validation 2 enregistrée « APPROUVER »
- [ ] Snapshot pré-fusion vérifié (`WM-3.4/WM34-PRE-MERGE-BACKUP-CONTRACT.md`)
- [ ] Contrôles `PRE-M-*` armés (`WM-3.4/WM34-PRE-POST-CONTROLS.md`)

**État actuel : 1/6 obtenue (DG-2 validation 1). Porte FERMÉE.**

## 3. Décision de porte

| Marqueur | État |
|----------|------|
| GO d'exécution production | **INTERDIT** |
| `PRE-ID-03` | **FAIL** (aucune fusion) |
| WM-4 | **NO-GO** |
| `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK` | **interdit** |

Le GO ne pourra être émis que dans un lot ultérieur (`WM-3.6`), **après** que les 6 conditions du §2
soient toutes cochées. WM-3.5 n'ouvre **aucune** exécution.

---

## 4. Interdits respectés

Aucune fusion · aucune désactivation · aucune écriture de production · aucun GO émis · fiches de
décision uniquement.
