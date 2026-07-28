# WM-3.9 — Instructions de déploiement (action humaine)

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.9` |
| Objet | Étapes pour installer + sécuriser la RPC, puis déclencher le dry-run |
| Rappel | fusion réelle **non autorisée** — dry-run uniquement |

---

## 1. Pourquoi une action humaine

L'installation exige du **DDL** (`CREATE FUNCTION`, `GRANT`). Aucun moyen d'exécution DDL n'est
disponible côté agent (pas de token Management/PAT, pas d'accès Postgres direct, PostgREST = DML
seulement). Le déploiement se fait donc **manuellement**, une fois, dans l'éditeur SQL Supabase.

## 2. Étapes

1. Ouvrir **Supabase → SQL Editor** (projet `nvyuyffywnuollaxguen`).
2. Coller **l'intégralité** de `WM39-RPC-DEPLOYMENT-BUNDLE.sql` (bloc `create` + les 4 lignes
   `revoke`/`grant`). **Ne pas** exécuter le bloc `drop` final (commenté — c'est pour la fin d'opération).
3. Exécuter. Résultat attendu : fonction créée, droits restreints à `service_role`.
4. **Confirmer** ici que le déploiement est fait.

> Astuce : vous pouvez aussi lancer une commande interactive en tapant `! <commande>` dans l'invite,
> mais l'éditeur SQL du dashboard est le chemin recommandé (aucun identifiant à manipuler).

## 3. Ensuite — dry-run (exécuté par l'agent)

Dès votre confirmation, l'agent exécute le dry-run **transactionnel** pour DG-1 puis DG-2 :

```
POST /rest/v1/rpc/wm3_merge_duplicate_group
Headers: apikey/Authorization = service_role
Body: { p_keeper, p_secondaries, p_dedupe_formation_ids, p_dry_run: true }
```

- Les paramètres réels (UUID + `formation_id`) sont lus depuis `private/WM39-DRYRUN-PARAMS.json`.
- La fonction applique les mutations **puis les annule** (aucune persistance) et retourne
  `would_result` (comptes projetés).
- Aucune écriture ne subsiste.

## 4. Vérification du dry-run (attendu)

| Groupe | `would_result` attendu |
|--------|------------------------|
| DG-1 (gardien `DG-1-P2`) | inscriptions=1, video=2, pastoral=0, notifs=2, active_in_box=1, secondaries_active=0, dangling=0 |
| DG-2 (gardien `DG-2-P1`) | inscriptions=1, video=3, pastoral=3, notifs=10, active_in_box=1, secondaries_active=0, dangling=0 |

Tout écart → anomalie à investiguer **avant** toute exécution réelle (laquelle reste non autorisée).

## 5. Rappel de fin d'opération (plus tard)

Après la fusion réelle **et** ses contrôles (lot ultérieur, sur nouvelle autorisation), exécuter le
bloc `drop function` pour retirer le mécanisme.
