# WM-3.10 — Contrôles pré-exécution

| Champ | Valeur |
|-------|--------|
| Mode | lecture seule + dry-run + test anon — **avant toute écriture réelle** |
| Résultat | **`ALL_PRECHECKS_PASS = true`** |

---

## 1. Les 5 conditions obligatoires

| # | Contrôle | Méthode | Résultat |
|---|----------|---------|----------|
| C1 | RPC v2 déployée = celle validée | dry-run `p_dry_run=true` DG-1 + DG-2 → `would_result` = attendus | ✅ conforme (les 2) |
| C2 | Live = baseline du dry-run | signature live vs `{10 actifs, 0 archivé, DG-1 1/2/0/2, DG-2 1/3/0/4}` | ✅ identique |
| C3 | Intégrité snapshot WM-3.6 | recalcul SHA-256 des 7 fichiers `backup-premerge-20260726` | ✅ vérifiée |
| C4 | RPC réservée à `service_role` | appel avec clé `anon` → refus | ✅ HTTP **401** (refusé) |
| C5 | Arrêt sur dérive | logique du script (aucun appel réel si un contrôle échoue) | ✅ armé |

## 2. Décision de porte

`ALL_PRECHECKS_PASS = true` → exécution réelle autorisée à démarrer par **DG-1** uniquement.

Preuve brute : `private/WM310-PRECHECKS.json` (non commité).

## 3. Interdits respectés

Aucune écriture · dry-run non persistant · test anon non mutant.
