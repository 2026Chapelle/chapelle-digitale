# WM-3.8 — Contrôles de sécurité de la RPC

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.8` |
| Objet | Encadrer la fonction temporaire : privilèges, portée, cycle de vie |
| État | spécification |

---

## 1. Privilèges d'exécution (principe du moindre privilège)

Après `CREATE FUNCTION`, exécuter immédiatement :

```sql
revoke all on function public.wm3_merge_duplicate_group(uuid, uuid[], uuid[], jsonb, boolean) from public;
revoke all on function public.wm3_merge_duplicate_group(uuid, uuid[], uuid[], jsonb, boolean) from anon, authenticated;
grant  execute on function public.wm3_merge_duplicate_group(uuid, uuid[], uuid[], jsonb, boolean) to service_role;
```

- **Aucun** accès `anon`/`authenticated` → non appelable depuis le front ou une session utilisateur.
- Appelable **uniquement** avec la clé `service_role` (hors navigateur).

## 2. `SECURITY DEFINER` maîtrisé

- `set search_path = public` **figé** (anti-hijack de schéma).
- Le corps ne touche **que** les tables de rattachement listées + `profiles` (archivage).
- **Aucune** commande dynamique (`EXECUTE format(...)`) → pas d'injection possible.

## 3. Gardes internes (défense en profondeur)

| Garde | Effet |
|-------|-------|
| gardien ≠ secondaire | refuse un appel incohérent |
| gardien actif requis | refuse si gardien archivé/inexistant |
| secondaires non déjà archivés | refuse une double exécution |
| comptes « après » = `p_expected_after` | **anti-dérive** vs plan validé |
| `secondaries_active = 0` **et** `dangling_to_secondary = 0` | invariants post obligatoires |
| `p_dry_run` par défaut `true` | aucune persistance sans intention explicite |

## 4. Portée d'usage stricte

- Appelée **par groupe** (DG-1 puis DG-2), avec les UUID exacts issus de `private/` (jamais en Git).
- Aucun paramètre « wildcard » : la fonction n'agit que sur les UUID fournis.
- Idempotence de sécurité : un second appel réel échoue (secondaires déjà archivés).

## 5. Cycle de vie — suppression / verrouillage après usage

**Obligatoire** une fois les 2 groupes fusionnés et contrôlés :

```sql
drop function if exists public.wm3_merge_duplicate_group(uuid, uuid[], uuid[], jsonb, boolean);
```

- Verrouillage intermédiaire possible entre DG-1 et DG-2 : `revoke execute … from service_role;`
  puis `grant` juste avant l'appel suivant.
- La suppression est **contrôlée** dans la checklist d'exécution (`WM38-EXECUTION-PROCEDURE.md`).
- **Aucune trace résiduelle** : la fonction ne doit pas subsister au-delà de l'opération.

## 6. Journalisation

- Chaque appel réel retourne un `jsonb` de résultat → archivé dans `private/` (comptes avant/après).
- Le snapshot pré-fusion (`WM-3.6`) borne l'état initial pour audit et rollback.

## 7. Interdits respectés

Spécification uniquement · aucun `GRANT`/`CREATE`/`DROP` exécuté · aucune écriture.
