# RBAC Communautaire — V1

> Source unique de vérité : `src/lib/permissions.ts`. Scoping : `src/lib/group-scope.ts` (calque de `integration-scope.ts`).
> Deux axes séparés conservés : **rôle fonctionnel** (`profiles.role`) ≠ **statut spirituel** (`profiles.membre_statut`).
> Le leadership local est un **3ᵉ axe** porté par `membres_groupe.role` — jamais un droit administratif.

## 1. Nouvelles permissions (ajoutées à `permissions.ts`)

| Permission | Signification |
|---|---|
| `can_manage_groups` | créer / modifier / archiver des groupes (selon périmètre) |
| `can_view_group_members` | voir la liste des membres d'un groupe |
| `can_supervise_community` | superviser plusieurs groupes / statistiques |

Attribution par rôle :
- `super_admin`, `admin` : les trois (périmètre **global**).
- `responsable_national`, `pasteur_national`, `pasteur` : les trois (périmètre **national**, via `nation_responsables`).
- `responsable_integration` : `can_view_group_members` (périmètre **assigné** — cellules d'accueil).
- autres rôles : aucune permission groupe globale (le leadership reste local via `membres_groupe.role`).

## 2. Scoping serveur — `resolveGroupScope`

```
resolveGroupScope({ role, hasNationAssignment }) → 'all' | 'nation' | 'assigned' | 'denied'
```

| Entrée | Résultat | Filtre appliqué côté serveur |
|---|---|---|
| admin / super_admin | `all` | aucun (global) |
| responsable/pasteur national, ou affectation `nation_responsables` | `nation` | `.in('pays', mesPays)` |
| responsable_integration | `assigned` | `responsable_id = lui` (ses cellules) |
| autre / inconnu / null | `denied` | aucun accès |

> **Précision V1 (implémentation).** Le périmètre `assigned` (responsable_integration) est un périmètre de **lecture/animation**, **pas** de gestion CRUD : il n'a que `can_view_group_members`. La création / modification / archivage de groupes et la gestion des membres exigent `can_manage_groups` (national / admin). Un responsable d'intégration agit sur l'**affectation d'intégration** (module Intégration, `berger_id`) et peut **approuver / éditer les horaires** d'un groupe uniquement s'il en est **leader** (`membres_groupe.role`). La barrière serveur `can('can_manage_groups')` est franchie **après** les actions self / leader (approbation, `update_infos`), conformément au principe « animation locale ».

## 3. Matrice de gouvernance effective

| Action | Membre | Leader / Co‑leader (son groupe) | Resp. national (son pays) | Admin / Super Admin |
|---|:--:|:--:|:--:|:--:|
| Créer un groupe | ❌ | ❌ | ✅ | ✅ |
| Modifier un groupe | ❌ | ✅ (infos/horaires) | ✅ | ✅ |
| Archiver / fermer | ❌ | ❌ | ✅ | ✅ |
| Rejoindre / quitter | ✅ (avec approbation) | — | — | ✅ |
| Approuver une adhésion | ❌ | ✅ (son groupe) | ✅ | ✅ |
| Nommer leader / co‑leader | ❌ | ❌ | ✅ | ✅ |
| Voir les membres | ❌ (annuaire public) | ✅ (les siens) | ✅ (son pays) | ✅ (global) |
| Définir `is_primary` | ✅ (sur soi) | — | ✅ | ✅ |
| Statistiques / supervision | ❌ | ✅ (son groupe) | ✅ (national) | ✅ (global) |

## 4. Principe directeur (anti-anarchie)

- **Structuration descendante** : création/fermeture réservée aux responsables nationaux et admins.
- **Animation locale** : le leader anime, approuve les adhésions, mais ne crée pas de groupe en V1.
- **Adhésion encadrée** : un membre demande, un responsable approuve.

## 5. Réutilisation stricte

- Aucun test de rôle « en dur » dans les routes : tout passe par `can()` / `resolveGroupScope()`.
- Le scoping national réutilise `nation_responsables` (déjà livré pour l'intégration) — aucune régression.
- Les routes `/admin/*` restent gardées par `isAdminRequest` ; les routes membre par `getSessionProfile`.
