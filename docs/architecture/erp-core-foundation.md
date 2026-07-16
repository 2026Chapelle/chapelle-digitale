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

## Lot 2-B — Isolation tenant des profils administratifs (clôture en production)

**Commit applicatif** : `06a37efaf60ca1a7fa5eae34e8c6a21d602c55d3`
**Message** : `feat(citadelle): isolate admin profiles by organization`

### 1. Objectif

- Isolation des accès administratifs à `public.profiles` ;
- `profiles` reste une identité globale ;
- `organization_members` constitue la borne tenant ;
- Seules les memberships `status='active'` sont admises ;
- Aucune confiance dans `organization_id` client ;
- Organisation canonique résolue côté serveur ;
- `service_role` conservé derrière les gardes serveur.

### 2. Scope applicatif

Routes sécurisées :

- `GET`/`PATCH` `/api/membres` ;
- `GET` `/api/admin/membres/[id]` ;
- Actions `/api/admin/membres/[id]/action`.

Comportements :

- `GET` borné aux `user_id` des memberships actives ;
- Liste vide → réponse `200` sans requête globale ;
- `PATCH` vérifie l’appartenance avant mutation ;
- Profil inexistant, hors tenant ou membership inactive → même `404` ;
- Liste blanche `PATCH` stricte ;
- Champs inconnus ou protégés → `400` ;
- Dossier 360 et actions gardés avant lecture/mutation.

### 3. Architecture

Nouveaux helpers :

- `src/lib/erp/resolve-canonical-organization.ts` ;
- `src/lib/erp/admin-profiles-scope.ts`.

Compatibilité :

- `src/lib/pastoral/newcomer-tenant-scope.ts` délègue au résolveur ERP neutre ;
- Aucune modification fonctionnelle de `newcomer_intakes` ;
- Aucun second RBAC ;
- Aucune deuxième organisation persistante.

### 4. Scope Git

Commit applicatif complet :

`06a37efaf60ca1a7fa5eae34e8c6a21d602c55d3`

Message :

`feat(citadelle): isolate admin profiles by organization`

Scope :

- Exactement 8 fichiers ;
- 649 insertions ;
- 70 suppressions.

### 5. Validations locales

- Tests routes Lot 2-B : 18 réussis ;
- Tests tenant-scope : 11 réussis ;
- Test Files : 59 réussis ;
- Tests : 649 réussis ;
- `TEST_EXIT=0` ;
- `TSC_EXIT=0` ;
- `BUILD_EXIT=0` ;
- `BUILD_ID=v3CFb0Tr0hDTAvs6EwFWR`.

### 6. Décision SQL

- **NO SQL REQUIRED** ;
- Aucune migration créée ou exécutée ;
- `organization_members` existante suffisante ;
- `profiles` n’a pas reçu `organization_id` ;
- Aucune réparation de migration history.

### 7. Release

Archive :

`citadelle-lot2b-06a37ef-v3CFb0Tr0hDTAvs6EwFWR-strict-linuxsafe.tar.gz`

Taille :

32580956 octets

Entrées :

4023

SHA256 :

`fc711d39415b0c9e6c0896576f52a26a25f5a5440033d04f1918ad97280e2a8f`

Candidat distant :

`/home/frprszbd/releases/citadelle-lot2b-06a37ef-v3CFb0Tr0hDTAvs6EwFWR`

Backup :

`/home/frprszbd/releases/backups/citadelle-active-before-lot2b-20260716-092747.tar.gz`

Taille backup :

32615940 octets

SHA256 backup :

`2c29c1fd186edc4872c84378d087c2c03bcf5422c6fd04c353218c90f64dba2f`

Particularité non bloquante :

- `RELEASE-META.json` comporte un BOM UTF-8 produit localement ;
- Métadonnées relues avec `utf-8-sig` ;
- Manifests runtime JSON standards valides ;
- Aucun effet sur Next.js ou Passenger.

### 8. Déploiement

Marqueurs :

- `CITADELLE_ERP_LOT2B_REMOTE_CANDIDATE_READY`
- `CITADELLE_ERP_LOT2B_REMOTE_SWITCH_RESTART_OK`

Logs :

- `/home/frprszbd/releases/lot2b-rsync-dryrun-20260716-094003.txt`
- `/home/frprszbd/releases/lot2b-rsync-switch-20260716-094003.txt`

Passenger redémarré :

16 juillet 2026 à 09:40:12 UTC.

**Fichiers protégés inchangés après switch** :

| Fichier                  | SHA256 |
|--------------------------|--------|
| `.env`                   | `4680a76f70fb7f3b0021c59c3627aebb5a627bb466d1672de1d8027b78fe5073` |
| `.env.exemple-production`| `20ff174beb6c38a7fcef11952fa35833ecfd58ab2ca3528215e00738de2fe04e` |
| `.htaccess`              | `2edfc6726dc471eadd69a8cd7d270a83f364928ee4328d70c0a615085832aa52` |
| `app.js`                 | `910030c42f41fdb8d1d5bcd0f3676d03d50cecad04d6c072b3580211a46ae6ac` |

### 9. QA production

**Domaine** : https://www.citadelle.chapelleduroyaume.org/

**HTTP** :

- `/` → 200 ;
- `/admin/login` → 200 ;
- `/admin/membres` → 307 vers login sans session ;
- `/api/membres` → 401 sans session ;
- `/admin/nouveaux-venus` → 307 vers login ;
- `/api/admin/newcomer-intakes` → 401 sans session.

**QA connectée** :

- Liste administrative chargée ;
- 13 membres visibles ;
- 13 actifs ;
- 0 suspendu ;
- Fiche 360° autorisée chargée ;
- Aucune mutation de donnée ;
- Aucune régression visible.

### 10. Limites acceptées

- Stratégie `.in(id, allowedIds)` adaptée au MVP canonique ;
- À réévaluer avant des organisations très volumineuses ;
- Garde tenant à l’entrée du dossier 360 ;
- Tables internes du dossier non migrées dans ce lot ;
- `service_role` maintenu derrière les gardes ;
- Aucune deuxième organisation réelle créée.

**Décision** :

Lot 2-B officiellement clôturé en production.
