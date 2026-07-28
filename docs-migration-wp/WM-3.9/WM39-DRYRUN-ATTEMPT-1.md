# WM-3.9 — Dry-run, tentative 1 (v1 de la RPC)

| Champ | Valeur |
|-------|--------|
| Appels | `wm3_merge_duplicate_group(DG-1 …, p_dry_run=true)` puis `(DG-2 …, p_dry_run=true)` |
| Résultat | **erreur SQL — annulée atomiquement** |
| Persistance production | **AUCUNE** (état identique à la baseline, vérifié après chaque appel) |
| Fusion réelle | **non exécutée** |

---

## 1. Ce qui s'est passé

Les deux appels ont retourné **HTTP 400** :

```
{"code":"42703","message":"column \"termine\" does not exist"}
```

Le corps v1 de la fonction supposait une colonne `termine` (booléen) sur `inscriptions_formation`.
Le schéma **réel** de cette table est :

```
progression int (0-100) · statut text {actif|termine|abandonne} · lecons_completees uuid[]
· score_quiz int · dernier_acces timestamptz · date_completion timestamptz · (pas de "termine")
```

## 2. Valeur défensive confirmée

- L'erreur est survenue **dans la transaction** de la fonction → **rollback total automatique**.
- Vérification de persistance **après chaque groupe** : baseline = post = **10 profils actifs, 0
  archivé, compteurs gardiens inchangés**. Aucune écriture n'a subsisté.
- Le dry-run a fait exactement son travail : **révéler un défaut sans toucher la production**.

## 3. Baseline (avant/après identiques)

| Mesure | Valeur |
|--------|--------|
| profils actifs (sur 10) | 10 |
| profils archivés | 0 |
| DG-1 gardien : inscriptions / vidéo / pastoral / notifs | 1 / 2 / 0 / 2 |
| DG-2 gardien : inscriptions / vidéo / pastoral / notifs | 1 / 3 / 0 / 4 |

## 4. Correction

`WM39-RPC-DEPLOYMENT-BUNDLE.sql` mis à jour en **v2** : dédup alignée sur le schéma réel
(`progression` = GREATEST, `statut` promu vers `termine`/`actif`, `lecons_completees` unionnées,
`score_quiz`/`dernier_acces`/`date_completion` fusionnés au mieux). `CREATE OR REPLACE` → un
redéploiement remplace la v1.

## 5. Suite

1. **Humain** : ré-exécuter le bundle v2 dans l'éditeur SQL Supabase (remplace la fonction).
2. **Agent** : relancer le dry-run DG-1 puis DG-2, vérifier `would_result` + absence de persistance.

Aucune fusion réelle (`p_dry_run` restera `true`).
