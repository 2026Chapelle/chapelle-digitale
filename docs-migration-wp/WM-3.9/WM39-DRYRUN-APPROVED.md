# WM-3.9 — Dry-run transactionnel approuvé (v2 de la RPC)

| Champ | Valeur |
|-------|--------|
| Appels | `wm3_merge_duplicate_group(DG-1…, p_dry_run=true)` puis `(DG-2…, p_dry_run=true)` |
| Résultat | **CONFORME** — comptes attendus atteints, aucune persistance |
| Fusion réelle | **non exécutée** (`p_dry_run=false` jamais utilisé) |
| Verdict | **`WM39_TRANSACTIONAL_DRY_RUN_APPROVED`** |

---

## 1. Ordre exécuté (imposé)

1. DG-1 → `would_result` ✅
2. Vérification persistance DG-1 → **AUCUNE** (état = baseline) ✅
3. DG-2 → `would_result` ✅
4. Vérification persistance DG-2 → **AUCUNE** (état = baseline) ✅
5. Comparaison aux compteurs attendus → **CONFORME** ✅

## 2. Résultats projetés (`would_result`) vs attendus

### DG-1 (gardien `DG-1-P2`)

| Mesure | Attendu | Projeté | OK |
|--------|---------|---------|----|
| inscriptions_formation | 1 | 1 | ✅ |
| video_progress | 2 | 2 | ✅ |
| pastoral_actions_log | 0 | 0 | ✅ |
| app_notifications | 2 | 2 | ✅ |
| active_in_box | 1 | 1 | ✅ |
| secondaries_active | 0 | 0 | ✅ |
| dangling_to_secondary | 0 | 0 | ✅ |

### DG-2 (gardien `DG-2-P1`)

| Mesure | Attendu | Projeté | OK |
|--------|---------|---------|----|
| inscriptions_formation | 1 | 1 | ✅ |
| video_progress | 3 | 3 | ✅ |
| pastoral_actions_log | **3** | **3** | ✅ (3 actions pastorales préservées) |
| app_notifications | 10 | 10 | ✅ |
| active_in_box | 1 | 1 | ✅ |
| secondaries_active | 0 | 0 | ✅ |
| dangling_to_secondary | 0 | 0 | ✅ |

## 3. Absence de persistance (invariant clé)

| Mesure | Baseline | Après DG-1 | Après DG-2 | Final |
|--------|----------|------------|------------|-------|
| Profils actifs (/10) | 10 | 10 | 10 | 10 |
| Profils archivés | 0 | 0 | 0 | 0 |
| Compteurs gardiens | réf. | inchangés | inchangés | inchangés |

**État final strictement identique à la baseline.** Le dry-run applique les mutations dans la
transaction de la fonction puis les **annule** — rien ne subsiste.

## 4. Ce que le dry-run valide

- La logique de fusion (dédup non destructive + re-point + archivage) produit **exactement** l'état
  cible attendu.
- Les **3 actions pastorales** (DG-2) et toutes les notifications sont bien transférées.
- Après fusion : **1 seul profil actif par boîte**, **0 rattachement orphelin** → `PRE-ID-03`
  passerait à **PASS** en mode réel.
- L'atomicité et le rollback sont prouvés (v1 en erreur → 0 persistance ; v2 conforme → 0 persistance).

## 5. Suite (hors périmètre — non autorisé ici)

- La fusion **réelle** (`p_dry_run=false`) nécessitera une **Décision humaine 2** distincte.
- La RPC reste **déployée** (non supprimée), en attente de cette décision.
- WM-4 reste **NO-GO**.
