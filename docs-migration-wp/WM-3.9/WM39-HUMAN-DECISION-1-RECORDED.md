# WM-3.9 — Décision humaine 1 enregistrée

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.9` |
| Décision | **`RPC_TEMPORAIRE_AUTORISÉE = OUI`** |
| Portée | **INSTALLATION + SÉCURISATION + DRY-RUN UNIQUEMENT** |
| Fusion réelle | **NON AUTORISÉE à ce stade** |

---

## 1. Conditions imposées (toutes reprises dans le bundle SQL)

| Condition | Prise en compte |
|-----------|-----------------|
| Fonction strictement limitée à la fusion R1 | ✅ un seul objet `wm3_merge_duplicate_group`, agit uniquement sur les UUID fournis |
| `SECURITY DEFINER` | ✅ |
| `search_path` explicitement fixé | ✅ `set search_path = public` |
| Révocation PUBLIC / anon / authenticated | ✅ 3 `revoke` |
| Seul `service_role` reçoit l'exécution | ✅ `grant execute … to service_role` |
| Aucune commande SQL dynamique | ✅ aucun `EXECUTE format(...)` |
| Aucune modification de table/colonne métier | ✅ DML uniquement, aucun DDL sur tables métier |
| Aucune fusion réelle à ce stade | ✅ appels **`p_dry_run => true`** exclusivement |
| Dry-run transactionnel réel autorisé | ✅ le corps applique puis **annule** les mutations |
| Révocation + suppression après opération | ✅ bloc `drop` fourni (à exécuter en toute fin, hors WM-3.9) |

## 2. Contrainte d'environnement (transparence)

Je **ne dispose d'aucun moyen d'exécuter du DDL** (pas de token Management/PAT, pas d'accès Postgres
direct ; PostgREST ne permet pas `CREATE FUNCTION`). **Le déploiement du bundle est donc une action
humaine** dans l'éditeur SQL Supabase (voir `WM39-DEPLOYMENT-INSTRUCTIONS.md`).

Après confirmation du déploiement, **je peux exécuter le dry-run** (POST `/rest/v1/rpc/...` avec la
clé `service_role`, `p_dry_run => true`) — c'est dans la portée autorisée et **sans persistance**.

## 3. État

- Bundle SQL prêt : `WM39-RPC-DEPLOYMENT-BUNDLE.sql`.
- Paramètres de dry-run calculés (lecture seule) : `private/WM39-DRYRUN-PARAMS.json` (UUID cloisonnés).
- Fonction **non encore déployée** (vérifié : `/rpc/...` → 404).
- **Aucune écriture production.** Fusion réelle **non exécutée** (non autorisée).
