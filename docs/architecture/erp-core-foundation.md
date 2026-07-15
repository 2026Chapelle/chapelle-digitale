# Core ERP Citadelle — Fondation TypeScript

## Rôle

Le module `src/core/erp` définit des **contrats TypeScript purs** pour la fondation multi-tenant SaaS de Citadelle :

- organisations et adhésions ;
- résolution de l’organisation active (contrat) ;
- pont de permissions ERP (contrats uniquement, sans moteur) ;
- audit unifié (contrat) ;
- paramètres d’organisation (types) ;
- contexte organisationnel enrichi (Lot 0.6-A).

**Lots 0.5 / 0.6-A** : aucun branchement runtime (routes, middleware, UI, Supabase). Aucune migration SQL.

## Hiérarchie

```
Citadelle SaaS
└── Organization          ← tenant client (Église / ministère)
    ├── Nations
    ├── Antennes
    ├── Plateformes
    ├── Groupes / cellules
    └── Membres
```

Une **Organization** est l’entité contractuelle cliente. Elle **ne remplace pas** nation, antenne, plateforme, groupe ou cellule.

## Trois axes de « rôle » (ne pas fusionner)

| Axe | Emplacement | Rôle |
|-----|-------------|------|
| `organization_members.membershipRole` | Core ERP / futur SQL | Gouvernance SaaS : `owner` \| `admin` \| `staff` \| `member` |
| `profiles.role` | `src/lib/roles.ts`, `permissions.ts` | Capacité métier Citadelle |
| `profiles.membre_statut` | profil | Progression spirituelle |

Le Core **ne remplace pas** `src/lib/permissions.ts` ni `src/lib/admin/admin-context.ts`.

## Lot 0.6-A — Contexte organisationnel

- **`OrganizationContext`** étend **`ActiveOrganizationContext`** (Lot 0.5) en ajoutant uniquement `permissions` (snapshot fourni) et `settings`.
- **`buildOrganizationContext`** : factory pure qui valide les invariants (org active, membership actif, IDs cohérents). **Aucun droit n’est calculé** selon `membershipRole`.
- **`CurrentOrganizationProvider`** : port abstrait uniquement (`getCurrentOrganizationContext`). **Pas d’implémentation concrète** tant que le Lot 1 n’a pas de repositories réels.
- **Aucun adapter Supabase**, aucun moteur de permissions supplémentaire, aucun registre de modules ERP.

## Non implémenté (volontaire)

- Tables SQL `organizations` / `organization_members`
- Colonnes `organization_id` sur les tables métier
- Isolation multi-tenant réelle
- Implémentation Supabase des repositories
- UI, API, cookies d’organisation

## Limite de sécurité

Tant que `organization_id` n’est pas porté par les tables métier et filtré côté serveur, le Core **n’offre pas** d’isolation multi-tenant. **Aucune seconde organisation réelle avant le Lot 2.**

## Prochain lot

**Lot 1** — après validation du design : tables `organizations` et `organization_members` uniquement (+ seed / resolve), sans isolation des tables métier.
