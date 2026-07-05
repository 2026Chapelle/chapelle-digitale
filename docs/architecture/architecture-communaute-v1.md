# Architecture Communautaire de Citadelle — V1

> Document de référence validé (Chantier 3, Phase 1 & 2).
> Citadelle est une **Église digitale structurée**, pas un réseau social.
> Les communautés servent : intégration, discipulat, accompagnement, prière, formation, mission.

## 1. Modèle canonique (source unique de vérité)

Tout le système communautaire repose sur **deux tables `public`** déjà existantes, étendues :

- `public.groupes` — l'unité communautaire (cellule, groupe, équipe, cohorte…).
- `public.membres_groupe` — l'appartenance d'un membre à un groupe.

Les autres constructions historiques sont **gelées** :

- `chapelle.cellules_*` (schéma parallèle, lié à `chapelle.members` ≠ `profiles`) → **non activé**.
- `public.group_join_requests` → **conservé** mais cantonné au **flux d'approbation** d'adhésion.

## 2. Hiérarchie fonctionnelle

```
PLATEFORME (8, fixe — enum plateforme_id)
   └── GROUPE / COMMUNAUTÉ   (rattaché à 1 plateforme — plateforme_id OBLIGATOIRE)
            └── CELLULE        (groupe de type='cellule', multipliable via parent_id)
                   └── MEMBRE  (profiles, via membres_groupe + rôle local)
```

- **Plateforme** : branche ministérielle officielle. Fixe (enum), non créable par les utilisateurs.
  CIER · Mahanaïm · Femmes d'Exceptions · Jeunesse · Cité du Refuge · Familles de la Chapelle · Chapelle Familiale · CFIC / Académie des Élus.
- **Groupe / Communauté** : unité d'appartenance rattachée à **une** plateforme (`plateforme_id` **obligatoire**).
  Typé via `groupes.type` : `cellule` · `groupe_priere` · `equipe_service` · `equipe_ministere` · `formation` · `departement`.
- **Cellule** : un groupe de `type='cellule'` (proximité / discipulat local), multipliable (`parent_id`).
- **Équipe** : groupe de type `equipe_service` / `equipe_ministere` (serviteurs / ouvriers).
- **Membre** : `profiles`, rattaché par `membres_groupe` (avec un rôle **local**).

## 3. Delta de schéma (V1)

### `public.groupes` — colonnes ajoutées
| Colonne | Type | Règle |
|---|---|---|
| `plateforme_id` | `plateforme_id` **NOT NULL** | **obligatoire** sur chaque groupe |
| `responsable_id` | uuid → profiles(id) | **référence principale** du responsable du groupe |
| `parent_id` | uuid → groupes(id) | multiplication de cellule (posé V1, exploité V2) |
| `niveau` | integer **default 1** | profondeur hiérarchique (préparation V2/V3) |
| `code` | text unique | identifiant lisible (ex. `CEL-ABJ-001`) |
| `pays` / `ville` / `zone` | text | scoping géographique (périmètre national) |
| `capacite_max` | integer | seuil de capacité (alerte V2) |

Colonnes **réutilisées telles quelles** : `nom`, `description`, `type`, `leader_id` *(legacy — voir §4)*, `membres_count`, `lieu_reunion`, `jour_reunion`, `heure_reunion`, `est_virtuel`, `reunion_url`, `image`, `statut`, `created_at`.

### `public.membres_groupe` — colonnes ajoutées
| Colonne | Type | Règle |
|---|---|---|
| `is_primary` | boolean **default false** | **groupe principal** du membre (un seul) |
| `statut` | text default `'actif'` (`actif` / `en_attente` / `sorti`) | cycle de vie de l'appartenance |
| `date_sortie` | timestamptz | historisation de la sortie |
| `updated_at` | timestamptz | audit |

Colonnes réutilisées : `user_id`, `groupe_id`, `role` (`leader` / `co-leader` / `membre`), `date_adhesion`, PK `(user_id, groupe_id)`.

## 4. Levée d'ambiguïté `leader_id` ↔ `responsable_id`

- **`responsable_id`** = **référence principale et canonique** du responsable d'un groupe. Toute lecture/écriture « qui dirige ce groupe » passe par `responsable_id`.
- **`leader_id`** = colonne **legacy** conservée pour compatibilité, **synchronisée** sur `responsable_id` (jamais source de vérité).
- **`membres_groupe.role`** = **rôles locaux** (`leader`, `co-leader`, `membre`) — gestion fine de l'animation au sein du groupe, indépendante du RBAC global.

## 5. Règle `is_primary` (groupe principal)

1. Le **premier** groupe rejoint devient `is_primary = true` automatiquement.
2. **Un seul** `is_primary` par membre (index unique partiel + bascule par trigger).
3. Si le groupe principal est une **cellule**, `profiles.groupe_cellule_id` est synchronisé.
4. Le **rattachement pastoral**, la **fiche 360°** et les **statistiques principales** lisent le groupe `is_primary`.
5. À la **sortie** du groupe principal, bascule automatique vers un autre groupe actif (ou `null`).

## 6. Couches techniques

```
DB  ── migration additive (ALTER groupes / membres_groupe + index + RLS + triggers)
LIB ── permissions.ts (perms groupes) · group-scope.ts (PUR) · community/membership.ts (PUR)
API ── /api/admin/groupes · /api/member/groupes · flux group_join_requests
UI  ── /admin/groupes · /member/dashboard/groupes · /groupes · vue leader · fiche 360°
```

- Scoping **imposé côté serveur** (service role), comme pour l'intégration.
- RLS minimale en complément (lecture annuaire `authenticated`, écriture service role).
- Aucune donnée fictive ; le chat factice de la page membre est retiré.

## 7. Périmètre V1 (rappel)

Inclus : groupes, adhésions, leadership, dashboards, notifications, annuaire.
**Exclus V1** : réunions & présences (→ Chantier 4), fils de messagerie de groupe (→ V2), rattachement événements/formation aux groupes (→ V2).
