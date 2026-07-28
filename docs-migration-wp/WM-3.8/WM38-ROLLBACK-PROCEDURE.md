# WM-3.8 — Procédure de rollback

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.8` |
| Objet | Réversibilité de l'exécution via RPC |
| État | spécification |

---

## 1. Niveau A — atomicité intra-fonction (nominal)

La fonction `wm3_merge_duplicate_group` s'exécute dans **une transaction unique**. Toute exception
(garde en échec, invariant non tenu, `dry_run`) **annule l'intégralité** — aucune mutation partielle
n'est possible. C'est la protection principale : un appel qui échoue **ne laisse aucune trace**.

| Cas | Effet |
|-----|-------|
| `dry_run = true` | mutations appliquées puis **annulées** ; retourne les comptes projetés |
| garde d'entrée en échec | aucune mutation |
| écart comptes attendus | rollback total |
| invariant post (`dangling`, `secondaries_active`) non tenu | rollback total |

## 2. Niveau B — restauration snapshot (après COMMIT réel)

Si un appel réel a **commité** puis qu'une anomalie est constatée, restaurer depuis le snapshot
pré-fusion (`WM-3.6/private/backup-premerge-*`, intégrité SHA-256 vérifiée) :

1. Réactiver les secondaires : `UPDATE profiles SET archived_at = <valeur snapshot | NULL> WHERE id IN (...)`.
2. Ré-attribuer les rattachements re-pointés à leur `user_id`/`member_id`/`converted_profile_id` d'origine.
3. Ré-insérer les lignes d'inscription redondantes retirées (présentes dans le snapshot).
4. Restaurer `progression`/`termine` d'origine du gardien (fusion `GREATEST` annulée).
5. Débannir les `auth.users` le cas échéant.
6. Re-sonde : l'état = snapshot ; `PRE-ID-03` revient à **FAIL** (cohérent avec l'annulation).

> La restauration B peut elle-même être encapsulée dans une **RPC inverse** temporaire (même modèle
> de sécurité) pour rester atomique, ou exécutée dans l'éditeur SQL en `BEGIN;…COMMIT;`.

## 3. Pourquoi le rollback est toujours possible

| Garantie | Effet |
|----------|-------|
| Désactivation par `archived_at` (jamais `DELETE` de compte) | réactivation triviale |
| Re-point réversible | ré-attribution depuis snapshot |
| Retrait d'inscription **redondante** seulement, valeur snapshotée | ré-insérable |
| Snapshot complet + SHA-256 avant toute écriture | source de vérité |
| `auth.users` banni (non supprimé) | débannissable |

## 4. Déclencheurs

| Déclencheur | Niveau |
|-------------|--------|
| Dry-run ≠ attendu | A (ne pas passer en réel) |
| Garde/invariant en échec pendant l'appel réel | A (rollback automatique de la fonction) |
| Anomalie constatée après COMMIT | B (restauration snapshot) |

## 5. Interdits respectés

Spécification uniquement · aucun rollback réel · aucune écriture.
