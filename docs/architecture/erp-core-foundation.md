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

## Lot 2-A — Isolation tenant de newcomer_intakes (clôture en production)

**Commit applicatif** : `7fabe13f4f95752fe6a143e3fd2d9d365273d8fd`  
**Message** : `feat(citadelle): isolate newcomer intakes by organization`

### 1. Scope Lot 2-A

- Seule table métier migrée : `public.newcomer_intakes`
- `organization_id` injecté **côté serveur**
- Aucune confiance dans `organization_id` client
- Repository exigeant `organizationId`
- Requêtes service-role bornées par `organization_id`
- `cier_admin` limité temporairement à l’organisation canonique
- Aucune deuxième organisation
- Aucun second RBAC
- `newcomer_pipeline` et tables journey hors migration
- **Lot 2-B : NO-GO**

### 2. Migration

**Fichier** :  
`supabase/migrations/20260716120000_citadelle_erp_lot2a_newcomer_intakes_organization.sql`

**Blob** :  
`c83fd4f50e02981e0eeb106c6ed483d72618ae41`

- Application manuelle réussie.
- **Ne jamais rejouer aveuglément la migration.**
- `migration_history_rows = 0` attendu.
- Ne pas réparer l’historique sans procédure et GO séparés.

**Postcheck** :  
`CITADELLE_ERP_LOT2A_SQL_APPLIED_CHECK`  
`all_checks_ok = true`

**QA comportementale avec ROLLBACK** :  
`CITADELLE_ERP_LOT2A_BEHAVIORAL_QA`  
`all_checks_ok = true`

**Rollback** :  
`CITADELLE_ERP_LOT2A_ROLLBACK_CHECK`  
`persisted_qa_rows = 0`  
`all_checks_ok = true`

### 3. Validations locales

- 58 fichiers de tests réussis
- 626 tests réussis
- `TEST_EXIT=0`
- `TSC_EXIT=0`
- `BUILD_EXIT=0`
- `BUILD_ID=II-Xa7w8ed7n04ckv57Vf`

### 4. Release

| Élément     | Valeur |
|-------------|--------|
| Archive     | `citadelle-lot2a-7fabe13-II-Xa7w8ed7n04ckv57Vf-strict-linuxsafe.tar.gz` |
| SHA256      | `cb3ff15ace1f5847e21f6c91d7808ecf6241b58c661cd5efb554da82ab8e6085` |
| Taille      | 32579131 octets |
| Backup      | `/home/frprszbd/releases/backups/citadelle-active-before-lot2a-20260716-063310.tar.gz` |
| SHA256 backup | `2679930241b0d72945ee79b0790fcc1253251fe16d7499ad41fd2f6f1091f33b` |
| Candidat    | `/home/frprszbd/releases/citadelle-lot2a-7fabe13-II-Xa7w8ed7n04ckv57Vf` |

**Marqueurs** :
- `CITADELLE_ERP_LOT2A_REMOTE_CANDIDATE_READY`
- `CITADELLE_ERP_LOT2A_SWITCH_RESTART_OK`
- `CITADELLE_ERP_LOT2A_HTTP_QA_CAPTURED`

### 5. Production

**Domaine** : https://www.citadelle.chapelleduroyaume.org/

**HTTP** :
- `/` → 200
- `/admin/login` → 200
- `/nouveau-venu` → 200
- `/admin/nouveaux-venus` → 307 vers login
- `/api/admin/newcomer-intakes` → 401 sans session
- `/api/admin/newcomer-journey` → 401 sans session

**QA fonctionnelle connectée** :
- liste des demandes chargée ;
- statistiques chargées ;
- fiche détaillée chargée ;
- parcours et historique visibles ;
- Intelligence Pastorale chargée ;
- indicateurs, priorités et recommandations visibles ;
- aucune donnée de QA supplémentaire créée.

**Fichiers protégés inchangés après switch** :

| Fichier                  | SHA256 |
|--------------------------|--------|
| `.env`                   | `4680a76f70fb7f3b0021c59c3627aebb5a627bb466d1672de1d8027b78fe5073` |
| `.env.exemple-production`| `20ff174beb6c38a7fcef11952fa35833ecfd58ab2ca3528215e00738de2fe04e` |
| `.htaccess`              | `2edfc6726dc471eadd69a8cd7d270a83f364928ee4328d70c0a615085832aa52` |
| `app.js`                 | `910030c42f41fdb8d1d5bcd0f3676d03d50cecad04d6c072b3580211a46ae6ac` |

**Décision** :

Lot 2-A officiellement clôturé en production.  
**Lot 2-B reste NO-GO.**
