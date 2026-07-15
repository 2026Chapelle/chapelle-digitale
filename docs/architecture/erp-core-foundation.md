# Core ERP Citadelle — Fondation TypeScript

## Rôle

Le module `src/core/erp` définit des **contrats TypeScript purs** pour la fondation multi-tenant SaaS de Citadelle :

- organisations et adhésions ;
- résolution de l’organisation active (contrat + implémentation pure Lot 1) ;
- pont de permissions ERP (contrats uniquement, sans moteur) ;
- audit unifié (contrat) ;
- paramètres d’organisation (types) ;
- contexte organisationnel enrichi (Lot 0.6-A).

L’infrastructure de lecture authentifiée vit sous **`src/lib/erp/**`** (pas dans le Core).

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

## Trois axes de « rôle » (ne pas fusionner)

| Axe | Emplacement | Rôle |
|-----|-------------|------|
| `organization_members.membershipRole` | Core / futur SQL | Gouvernance SaaS |
| `profiles.role` | `src/lib/roles.ts`, `permissions.ts` | Capacité métier Citadelle |
| `profiles.membre_statut` | profil | Progression spirituelle |

## Lot 0.6-A — Contexte organisationnel

- **`OrganizationContext`** étend **`ActiveOrganizationContext`** + `permissions` (snapshot) + `settings`.
- **`buildOrganizationContext`** : invariants purs ; **aucun** droit calculé selon `membershipRole`.
- **`CurrentOrganizationProvider`** : port abstrait (non branché runtime global).

## Lot 1 — Organizations SaaS (préparé, non appliqué)

### Migration locale (fichier uniquement)

Fichier : `supabase/migrations/20260715120000_citadelle_erp_lot1_organizations.sql`

- Tables **`public.organizations`** et **`public.organization_members`** (CREATE fail-fast).
- Seed canonique **`chapelle-du-royaume`** + contrôle de drift.
- Seed memberships insert-only depuis `profiles` (mapping legacy hors Core).
- RLS **ENABLE** (pas FORCE) ; **3 policies SELECT** ; **aucune** policy de mutation.
- Helpers `erp_org_*` SECURITY DEFINER.
- **Non exécutée** dans le dépôt tant qu’un GO SQL distinct n’est pas donné.

### Code

| Zone | Contenu |
|------|---------|
| `src/core/erp/organization/resolve-active.ts` | Resolve **pur** |
| `src/lib/erp/*` | Mappers + repositories **session authentifiée** |

### Règles

- **Aucun** `supabaseAdmin` dans repositories / resolve.
- **Aucune** table métier avec `organization_id`.
- **Aucun** comportement runtime UI/middleware/API encore branché.
- **Interdit** de créer une 2ᵉ organisation réelle avant le Lot 2 (isolation métier).

## Limite de sécurité

Tant que les données métier ne sont pas filtrées par organisation côté serveur, le Core + tables org **n’offrent pas** d’isolation multi-tenant. `supabaseAdmin` contourne la RLS.

## Prochaines étapes

1. GO SQL : appliquer la migration en environnement contrôlé.
2. Brancher éventuellement `CurrentOrganizationProvider` (hors scope Lot 1 minimal).
3. Lot 2 : `organization_id` métier + filtres serveur avant multi-org.
