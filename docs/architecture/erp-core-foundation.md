# Core ERP Citadelle — Fondation TypeScript (Lot 0.5)

## Rôle

Le module `src/core/erp` définit des **contrats TypeScript purs** pour la fondation multi-tenant SaaS de Citadelle :

- organisations et adhésions ;
- contexte d’organisation active ;
- pont de permissions ERP (sans remplacer le RBAC produit) ;
- audit unifié (contrat) ;
- paramètres d’organisation (types).

**Lot 0.5** : aucun branchement runtime (routes, middleware, UI, Supabase). Aucune migration SQL.

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

Une **Organization** est l’entité contractuelle cliente. Elle **ne remplace pas** nation, antenne, plateforme, groupe ou cellule — elle en est le parent SaaS futur.

## Trois axes de « rôle » (ne pas fusionner)

| Axe | Emplacement | Rôle |
|-----|-------------|------|
| `organization_members.membershipRole` | Core ERP / futur SQL | Gouvernance SaaS : `owner` \| `admin` \| `staff` \| `member` |
| `profiles.role` | `src/lib/roles.ts`, `permissions.ts` | Capacité métier Citadelle (formateur, admin, …) |
| `profiles.membre_statut` | profil | Progression spirituelle (leader_cellule, berger, …) |

Le Core **ne remplace pas** `src/lib/permissions.ts` ni `src/lib/admin/admin-context.ts`.

## Non implémenté (volontaire)

- Tables SQL `organizations` / `organization_members`
- Colonnes `organization_id` sur les tables métier
- Implémentations repository / resolver
- Évaluateur de permissions ERP réel
- Writer d’audit réel
- UI, API, cookies d’organisation, URLs multi-tenant

## Intégration des modules futurs

1. Implémenter les interfaces (`OrganizationRepository`, etc.) dans des modules serveur dédiés.
2. Brancher le résolveur **après** seed mono-tenant (Lot 1).
3. Isoler les données métier (Lot 2+) **avant** d’activer une 2ᵉ organisation réelle.
4. Importer uniquement depuis `@/core/erp`.

## Limite de sécurité

Tant que `organization_id` n’est pas porté par les tables métier et filtré côté serveur (y compris les routes `supabaseAdmin`), le Core **n’offre pas** d’isolation multi-tenant. Une 2ᵉ organisation en production serait dangereuse.

## Prochain lot

**Lot 1 — Organisations SaaS (SQL + seed Chapelle + module de résolution)** : migration additive, rattachement des profils existants, résolveur d’organisation active, sans refonte UI ni migration massive des tables métier.
