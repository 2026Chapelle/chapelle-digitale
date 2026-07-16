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

## Lot 1 — Organizations SaaS (code + SQL manuellement appliqué)

### Source Git

| Élément | Valeur |
|---------|--------|
| Commit | `5543107b2557c8eca5378be314c54935d6fcefcd` |
| Fichier | `supabase/migrations/20260715120000_citadelle_erp_lot1_organizations.sql` |
| Blob | `d64cff2bcf9596c9d6493d92fb4474500b634c33` |

### Application SQL (manuel)

- **Appliquée manuellement** via Supabase SQL Editor (pas via `supabase db push`).
- Postcheck structurel visible le **2026-07-15 23:35:40 UTC** — marqueur `CITADELLE_ERP_LOT1_SQL_APPLIED_CHECK`.
- Postcheck structurel : **`all_checks_ok=true`**.

### QA RLS (transactionnelle, ROLLBACK)

Aucune donnée persistante modifiée par la QA.

| Profil | Résumé | `all_checks_ok` |
|--------|--------|-----------------|
| **member** | orgs=1, memberships=1, own=1, others=0, `has_active_membership=true`, `is_owner_or_admin=false` | true |
| **owner** | orgs=1, memberships=13, own=1, others=12, `has_active_membership=true`, `is_owner_or_admin=true` | true |

### Historique de migration Supabase

- `migration_history_rows=0` après exécution manuelle (attendu hors `db push`).
- **Ne pas** lancer `supabase db push` en aveugle : risquerait de rejouer ou de désaligner l’historique.
- **Ne pas** réparer manuellement `supabase_migrations.schema_migrations` sans **GO séparé**.
- L’alignement de l’historique de migration reste un chantier **ultérieur contrôlé**.

### Code (inchangé fonctionnellement)

| Zone | Contenu |
|------|---------|
| `src/core/erp/organization/resolve-active.ts` | Resolve **pur** |
| `src/lib/erp/*` | Mappers + repositories **session authentifiée** |

### Limites et interdictions (toujours en vigueur)

- **Aucune isolation tenant** des tables métier : le Lot 1 ne rend **pas** encore le monolithe multi-tenant.
- **Interdit** de créer une **deuxième organisation réelle** avant le **Lot 2**.
- **Aucun** `supabaseAdmin` dans repositories / resolve.
- Runtime UI / middleware / API **non branché** sur le tenant org.

## Limite de sécurité

Tant que les données métier ne sont pas filtrées par organisation côté serveur, le Core + tables org **n’offrent pas** d’isolation multi-tenant. `supabaseAdmin` contourne la RLS.

## Prochaines étapes

1. GO séparé éventuel : historique `schema_migrations` (sans réparation improvisée).
2. Brancher éventuellement `CurrentOrganizationProvider` (hors scope Lot 1 minimal).
3. Lot 2 : `organization_id` métier + filtres serveur **avant** multi-org réel.
