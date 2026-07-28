# WM-3.10 — Révocation et suppression de la RPC temporaire

| Champ | Valeur |
|-------|--------|
| Objet | Retirer le mécanisme de fusion après succès des deux groupes |
| État | **SUPPRIMÉE ET VÉRIFIÉE** — `revoke` + `drop` exécutés (humain), absence confirmée |

---

## 1. Pourquoi une action humaine

`REVOKE` et `DROP FUNCTION` sont du **DDL**. L'agent n'a aucun moyen d'exécuter du DDL (pas de
token Management/PAT, pas d'accès Postgres direct ; PostgREST = DML/appels RPC uniquement). La
suppression doit donc être exécutée par un humain dans l'éditeur SQL Supabase.

## 2. SQL à exécuter (éditeur SQL Supabase)

```sql
revoke all on function public.wm3_merge_duplicate_group(uuid, uuid[], uuid[], jsonb, boolean) from service_role;
drop function if exists public.wm3_merge_duplicate_group(uuid, uuid[], uuid[], jsonb, boolean);
```

## 3. Vérification après suppression (par l'agent)

Après votre exécution, l'agent confirmera l'absence de la fonction :

```
POST /rest/v1/rpc/wm3_merge_duplicate_group  (service_role)
→ attendu : HTTP 404, code PGRST202 (fonction introuvable)
```

Tant que ce 404 n'est pas constaté, la fonction est considérée **encore présente**.

## 4. État courant — CLÔTURÉ

- Fusion réelle : **terminée** (DG-1 + DG-2, contrôles PASS).
- `revoke all … from service_role` + `drop function …` : **exécutés** (éditeur SQL Supabase — « Success. No rows returned »).
- Vérification agent : `POST /rest/v1/rpc/wm3_merge_duplicate_group` → **HTTP 404** (fonction introuvable). ✅
- Le mécanisme temporaire **n'existe plus**. Aucune recréation.

## 5. Note de sécurité

L'exposition temporaire (fonction restreinte à `service_role`) est **close** : la fonction a été
supprimée. Plus aucun objet de fusion ne subsiste en base.
