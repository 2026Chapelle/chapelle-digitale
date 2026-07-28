# WM-3.8 — Architecture transactionnelle R1

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.8` |
| Objet | Choisir et concevoir le chemin transactionnel pour exécuter la fusion R1 atomiquement |
| Écriture production | **0** (conception uniquement) |

---

## 1. Contexte

La fusion R1 (DG-1, DG-2) touche plusieurs tables et **doit** être atomique. WM-3.6/3.7 ont montré
qu'aucun chemin transactionnel n'est disponible en l'état :

| Moyen | Disponible | Atomique |
|-------|------------|----------|
| PostgREST `PATCH` (service role) | oui | **non** (auto-commit par requête) |
| Connexion Postgres directe | **non** (pas de `DIRECT_URL`, pas de client) | oui |
| RPC PostgreSQL (`/rest/v1/rpc/…`) | oui (via service role) — **mais la fonction doit exister** | **oui** (corps de fonction = 1 transaction implicite) |

## 2. Comparaison des options

### Option A — RPC PostgreSQL transactionnelle temporaire

Une fonction `plpgsql` `SECURITY DEFINER` exécute toute la fusion d'un groupe dans **une seule
transaction serveur** (atomicité native : toute exception annule l'intégralité). Appelée via
`POST /rest/v1/rpc/wm3_merge_duplicate_group` avec la clé `service_role` déjà disponible.

| Avantage | Inconvénient |
|----------|--------------|
| Atomique par nature | Création de la fonction = objet de schéma (temporaire) → **autorisation humaine requise** |
| Utilise l'accès existant (service role + PostgREST) | Déploiement du `CREATE FUNCTION` via l'éditeur SQL Supabase (action humaine) |
| Aucun identifiant de connexion directe à exposer | À **supprimer/verrouiller** après usage |
| `dry_run` transactionnel intégré (savepoint + rollback) | |

### Option B — Accès Postgres direct contrôlé

Fournir `DIRECT_URL` (`postgres://…:5432/…`) + client (`psql`/`psycopg`) et piloter `BEGIN;…COMMIT;`.

| Avantage | Inconvénient |
|----------|--------------|
| Aucun objet de schéma créé | **Identifiants de connexion directe à fournir/exposer** (surface de risque) |
| Contrôle fin | Non disponible dans l'environnement actuel ; client absent |
| | Pas de garde applicative encapsulée (logique côté client) |

## 3. Choix : **Option A** (RPC transactionnelle temporaire sécurisée)

Justification, alignée sur l'architecture Citadelle/Supabase :

1. **Compatibilité native** : Supabase expose déjà `/rest/v1/rpc/*` ; la clé `service_role` est en place.
2. **Atomicité garantie** sans ouvrir de connexion directe ni exposer d'identifiants Postgres.
3. **Gardes encapsulées** dans la fonction (vérifications, comptes attendus, `dry_run`) — auditable en un seul objet.
4. **Cycle de vie maîtrisé** : la fonction est **temporaire**, à portée réduite, **révoquée puis supprimée** après usage (`WM38-SECURITY-CONTROLS.md`).

> **La fonction n'est PAS une migration de schéma métier** : elle ne crée/modifie aucune table ni
> colonne, ne fait partie d'aucune migration versionnée applicative, et est supprimée après usage.
> C'est un **outil de maintenance ponctuel**, soumis à autorisation humaine explicite.

## 4. Frontière de responsabilité

| Étape | Acteur |
|-------|--------|
| Concevoir la fonction + procédure (ce lot) | WM-3.8 — **aucune écriture** |
| Revoir + déployer `CREATE FUNCTION` (éditeur SQL Supabase) | **humain** (autorisation) |
| Appeler la RPC en `dry_run` puis réel | exécution contrôlée (lot ultérieur) |
| `DROP FUNCTION` après usage | **humain** |

## 5. Interdits respectés

Conception uniquement · aucune fonction créée · aucune écriture · aucun accès direct ouvert.
