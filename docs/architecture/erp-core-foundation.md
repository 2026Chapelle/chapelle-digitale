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

## Lot 3 — Permissions centrales minimales des membres administratifs (clôture en production)

**Commit applicatif** : `5f3ec90accf5211900f8122200ad9dcca1019dc1`
**Message** : `fix(citadelle): enforce organization permissions on member admin`
**Parent** : `0d7b2dc12a7a595081610c8c1d1f357b606b4afd`

### 1. Objectif

- Supprimer le dernier accès global prouvé sur `GET`/`POST` `/api/admin/membres` ;
- Appliquer la borne tenant issue de `organization_members` ;
- Exiger une membership active `owner`/`admin` ;
- Ne faire confiance à aucun `organization_id` client ;
- Conserver `service_role` uniquement derrière les gardes ;
- Éviter tout second RBAC et toute nouvelle infrastructure d’audit.

### 2. Audit préalable

**Marqueur** :

`CITADELLE_ERP_LOT3_PERMISSIONS_AUDIT_CORRECTED_READONLY_OK`

**Constat central** :

- `GET`/`POST` `/api/admin/membres` restait global ;
- Les routes Lot 2-B étaient déjà tenant-bornées ;
- Modules CMS, académie, giving, communication et autres exclus du socle ;
- Décision de Fast Lock limité au cœur ERP membres.

### 3. Scope Git

Commit applicatif complet :

`5f3ec90accf5211900f8122200ad9dcca1019dc1`

Message :

`fix(citadelle): enforce organization permissions on member admin`

Parent :

`0d7b2dc12a7a595081610c8c1d1f357b606b4afd`

Fichiers :

- `src/app/api/admin/membres/route.ts` ;
- `src/lib/__tests__/membres-admin-routes.test.ts` ;
- `src/lib/erp/admin-profiles-scope.ts`.

Diff :

- Exactement 3 fichiers ;
- 181 insertions ;
- Aucune suppression.

### 4. Comportements livrés

**GET** `/api/admin/membres` :

- Garde admin legacy conservée ;
- Organisation canonique résolue côté serveur ;
- Membership active `owner`/`admin` exigée ;
- `allowedIds` issus des memberships actives ;
- Requête `profiles` bornée avec `.in('id', allowedIds)` ;
- Liste vide → `200` sans requête globale `profiles` ;
- Aucun `organization_id` client utilisé.

**POST** `/api/admin/membres` :

- Gardes exécutées avant `service_role` ;
- Payload strict ;
- `organization_id` et champs inconnus/protégés rejetés ;
- Membership créée uniquement dans l’organisation canonique ;
- `membership_role` forcé à `member` ;
- `status` `active` selon le flux validé ;
- Aucune promotion `owner`/`admin` ;
- Compensation `deleteUser` limitée au nouvel utilisateur si la membership échoue ;
- Log `pastoral_actions_log` existant conservé ;
- Aucune nouvelle table d’audit.

**Helper** :

- `requireActiveOwnerOrAdmin` ;
- `status='active'` ;
- `membership_role` `owner` ou `admin` ;
- `staff`/`member` refusés.

### 5. Validations locales

- Tests ciblés routes membres : 27 réussis ;
- Tests tenant-scope : 11 réussis ;
- Suite complète :
  - Test Files : 59 passed ;
  - Tests : 658 passed ;
- TypeScript : `TSC_EXIT=0` ;
- Build :
  - `BUILD_EXIT=0` ;
  - `BUILD_ID=kZ6wWi1Q5IdTx8MEWpsFV`.

### 6. Décision SQL

- **NO SQL REQUIRED** ;
- `organizations` et `organization_members` existantes suffisantes ;
- Aucune colonne ajoutée à `profiles` ;
- Aucune nouvelle table `audit_logs` ;
- Aucune migration créée ;
- Aucun SQL exécuté ;
- Aucune modification de migration history.

### 7. Push Git

**Marqueur** :

`CITADELLE_ERP_LOT3_PUSH_OK`

État après push :

- Local = origin ;
- Commit `5f3ec90accf5211900f8122200ad9dcca1019dc1` ;
- Avance/retard `0/0`.

### 8. Release

Archive :

`citadelle-lot3-5f3ec90-kZ6wWi1Q5IdTx8MEWpsFV-strict-linuxsafe.tar.gz`

Taille :

32578375 octets

Entrées :

4022

SHA256 :

`ec863b80f4149b06d6a1baba573101498b02d5228d60a66d311fb442a38485f0`

`BUILD_ID` :

`kZ6wWi1Q5IdTx8MEWpsFV`

`RELEASE-META.json` :

- JSON valide ;
- UTF-8 sans BOM ;
- Commit et `BUILD_ID` exacts ;
- `sql_required=false`.

Upload :

`/home/frprszbd/releases/uploads/citadelle-lot3-5f3ec90-kZ6wWi1Q5IdTx8MEWpsFV-strict-linuxsafe.tar.gz`

Candidat :

`/home/frprszbd/releases/citadelle-lot3-5f3ec90-kZ6wWi1Q5IdTx8MEWpsFV`

### 9. Backup et bascule

Backup :

`/home/frprszbd/releases/backups/citadelle-active-before-lot3-20260716-120116.tar.gz`

Taille :

32623623 octets

Entrées :

4064

SHA256 :

`3f5e57eeba2c46babdecb66440887cd212d2a9ab689afb0e519c84b0f459fede`

Dry-run :

`/home/frprszbd/releases/lot3-rsync-dryrun-20260716-120116.txt`

- 2354 lignes ;
- 87 suppressions runtime ;
- Aucun chemin protégé touché.

Log de bascule :

`/home/frprszbd/releases/lot3-rsync-switch-20260716-120856.txt`

Restart Passenger :

`2026-07-16T12:09:04Z`

**Marqueur** :

`CITADELLE_ERP_LOT3_REMOTE_SWITCH_RESTART_OK`

**Fichiers protégés inchangés après switch** :

| Fichier                  | SHA256 |
|--------------------------|--------|
| `.env`                   | `4680a76f70fb7f3b0021c59c3627aebb5a627bb466d1672de1d8027b78fe5073` |
| `.env.exemple-production`| `20ff174beb6c38a7fcef11952fa35833ecfd58ab2ca3528215e00738de2fe04e` |
| `.htaccess`              | `2edfc6726dc471eadd69a8cd7d270a83f364928ee4328d70c0a615085832aa52` |
| `app.js`                 | `910030c42f41fdb8d1d5bcd0f3676d03d50cecad04d6c072b3580211a46ae6ac` |

### 10. QA production

**HTTP** :

- `GET /` → 200 ;
- `GET /admin/login` → 200 ;
- `GET /admin/membres` → 307 vers login ;
- `GET /api/admin/membres` → 401 ;
- `POST /api/admin/membres` sans session → 401 ;
- `GET /api/membres` → 401 ;
- `GET /admin/nouveaux-venus` → 307 vers login ;
- `GET /api/admin/newcomer-intakes` → 401.

**QA connectée** :

**Marqueur** :

`CITADELLE_ERP_LOT3_PRODUCTION_QA_OK`

Captures validées :

- Liste administrative chargée ;
- 13 membres visibles ;
- 13 actifs ;
- 0 suspendu ;
- Fiche 360° Sarah Leader chargée ;
- Accès owner/admin fonctionnel ;
- Aucune mutation effectuée ;
- Aucune régression visible.

### 11. Limites acceptées

- Stratégie `.in(id, allowedIds)` adaptée au MVP canonique ;
- À réévaluer avant organisations volumineuses ;
- Garde admin legacy conservée comme première couche ;
- `pastoral_actions_log` reste un historique métier et non un audit immuable général ;
- Aucune migration générale des routes métier hors socle ;
- Aucune création de seconde organisation réelle ;
- Création de membre non testée par mutation en production, couverte par les tests automatisés.

### 12. Décision finale

Lot 3 officiellement clôturé en production.

La dernière tranche du socle reste soumise à un GO séparé :

**Lot 4 — Paramètres essentiels par organisation et QA finale.**

## Lot 4 — Paramètres essentiels par organisation et clôture finale de la Fondation ERP

**Commit applicatif** : `3e2db1a4f180798e6c00699fcac6dd9e35587166`
**Message** : `feat(citadelle): add essential organization settings`
**Parent** : `643592f09eb917b57e3041ecf81a1a2142a12c3f`

### 1. Objectif

Le Lot 4 constitue la dernière tranche de la Fondation ERP SaaS :

- exposer les paramètres essentiels de l’organisation canonique ;
- permettre leur lecture et leur mise à jour contrôlée ;
- conserver le bornage tenant côté serveur ;
- exiger une membership active `owner` ou `admin` ;
- ne faire confiance à aucun identifiant d’organisation fourni par le client ;
- valider transversalement les Lots 1 à 4 en production ;
- clôturer le socle sans élargissement fonctionnel.

### 2. Décision d’audit

Audit préalable :

`CITADELLE_ERP_LOT4_FAST_FINAL_AUDIT_READONLY_OK`

Décision :

- `NO SQL REQUIRED` ;
- tables `organizations` et `organization_members` existantes suffisantes ;
- aucune migration nécessaire ;
- aucune modification de l’historique des migrations ;
- aucune nouvelle table ;
- aucune configuration SaaS avancée ajoutée.

### 3. Scope Git applicatif

Commit :

`3e2db1a4f180798e6c00699fcac6dd9e35587166`

Fichiers exactement inclus :

- `src/app/(admin)/admin/parametres/OrganizationEssentialsForm.tsx` ;
- `src/app/(admin)/admin/parametres/page.tsx` ;
- `src/app/api/admin/organization/route.ts` ;
- `src/lib/__tests__/organization-admin-routes.test.ts`.

Diff :

- exactement 4 fichiers ;
- 1 009 insertions ;
- 61 suppressions ;
- aucun fichier hors scope ;
- `package.json` et `package-lock.json` inchangés ;
- aucune migration ;
- aucun fichier protégé.

Marqueur local :

`CITADELLE_ERP_LOT4_FAST_FINAL_LOCAL_COMMIT_OK`

### 4. API des paramètres essentiels

Endpoint :

`/api/admin/organization`

Méthodes :

- `GET` ;
- `PATCH`.

Ordre des gardes avant tout usage de `service_role` :

1. `isAdminRequest` ;
2. `resolveAdminOrganizationForRequest(true)` ;
3. `requireActiveOwnerOrAdmin` ;
4. opération bornée par l’identifiant de l’organisation canonique.

#### GET

- sélection limitée aux champs publics ;
- requête bornée par `.eq('id', organizationId)` ;
- aucun `organization_id` client ;
- `404` si l’organisation est absente ;
- `200` avec l’organisation canonique si elle existe.

#### PATCH

Liste blanche exacte :

- `name` ;
- `country` ;
- `timezone` ;
- `default_locale` ;
- `default_currency`.

Champs protégés ou inconnus rejetés avec `400`, notamment :

- `id` ;
- `slug` ;
- `status` ;
- `created_by` ;
- timestamps ;
- `logo_url` ;
- `organization_id` ;
- `organizationId`.

Validations :

- `name` : trim, non vide, maximum 200 caractères ;
- `country` : trim ou `null`, maximum 100 caractères ;
- `timezone` : fuseau IANA valide ;
- `default_locale` : normalisée en minuscules ;
- `default_currency` : trois lettres majuscules.

L’update reste strictement limité à l’organisation canonique. Aucun changement de `slug` ou de `status` n’est permis.

### 5. Interface administrative

Page :

`/admin/parametres`

Comportements livrés :

- nouveau composant `OrganizationEssentialsForm` ;
- remplacement du bloc mock « Identité de l’Église » ;
- cinq champs réels ;
- chargement par `GET` ;
- enregistrement par `PATCH` ;
- états de chargement, erreur et succès ;
- formulaire désactivé avant chargement ;
- aucune valeur mock `EUR` ou `Europe/Paris` envoyée ;
- slug et statut affichés mais non modifiables ;
- sections Livret d’accueil, passkeys et autres paramètres préservées ;
- navigation, middleware et authentification administrative inchangés.

Valeurs de production validées :

- organisation : `La Chapelle Internationale des Élus du Royaume` ;
- identifiant : `0504dc6a-c75c-441a-a206-8b1ddfe599e6` ;
- slug : `chapelle-du-royaume` ;
- statut : `active` ;
- pays : `CI` ;
- fuseau : `Africa/Abidjan` ;
- langue : `fr` ;
- devise : `XOF`.

### 6. Validations locales

Tests ciblés Lot 4 :

- 27 réussis ;
- exit `0`.

Régression Lot 3 :

- 27 réussis ;
- exit `0`.

Régression Lot 2-A :

- 11 réussis ;
- exit `0`.

Suite complète :

- Test Files : 60 passed ;
- Tests : 685 passed ;
- exit `0`.

TypeScript :

`TSC_EXIT=0`

Build :

- `BUILD_EXIT=0` ;
- `BUILD_ID=wAreTexeETfv5rDLgCjLT`.

Aucun SQL n’a été exécuté.

### 7. Push applicatif

Marqueur :

`CITADELLE_ERP_LOT4_PUSH_OK`

État après push :

- local : `3e2db1a4f180798e6c00699fcac6dd9e35587166` ;
- distant : `3e2db1a4f180798e6c00699fcac6dd9e35587166` ;
- avance/retard : `0/0` ;
- working tree préexistant inchangé.

### 8. Release locale

Archive :

`citadelle-erp-lot4-3e2db1a-wAreTexeETfv5rDLgCjLT-strict-linuxsafe.tar.gz`

SHA256 :

`75771fa936052cfa20e2bcb9f425970b271ae8d03537b4c930b9042489887fa1`

Taille :

32 588 251 octets

Entrées :

4 026

Contrôles :

- `app.js` présent ;
- `server.js` présent ;
- `package.json` présent ;
- `.next/BUILD_ID` présent ;
- `BUILD_INFO.txt` présent ;
- `.next/static/` présent ;
- `public/` présent ;
- chemins Linux-safe ;
- fichiers interdits absents ;
- aucun rebuild ;
- working tree local inchangé.

Marqueurs :

- `CITADELLE_ERP_LOT4_RELEASE_LOCAL_READY` ;
- `CITADELLE_ERP_LOT4_RELEASE_LOCAL_VALIDATED`.

### 9. Déploiement production

Archive téléversée :

`/home/frprszbd/releases/uploads/citadelle-erp-lot4-3e2db1a-wAreTexeETfv5rDLgCjLT-strict-linuxsafe.tar.gz`

Backup pré-déploiement :

`/home/frprszbd/releases/backups/citadelle-active-before-erp-lot4-3e2db1a-20260716-135642.tar.gz`

SHA256 du backup :

`f88ac1c1d36a2dc7c409910ec43c1bd141d4af79d6ecb92ab5b35764425b400d`

Staging :

`/home/frprszbd/releases/staging/citadelle-erp-lot4-3e2db1a-20260716-135642`

Résultat :

- archive validée par SHA256 ;
- structure et `BUILD_INFO.txt` validés ;
- backup créé avant promotion ;
- staging validé ;
- dry-run `rsync` exécuté ;
- promotion `rsync` réussie ;
- commit actif correct ;
- `BUILD_ID` actif correct ;
- fichiers protégés inchangés ;
- restart Passenger déclenché le `2026-07-16 13:58:31 UTC` ;
- aucun build ;
- aucun `npm install` ;
- aucun `git pull` ;
- aucun SQL ;
- aucune migration.

Marqueur :

`CITADELLE_ERP_LOT4_REMOTE_SWITCH_RESTART_OK`

### 10. QA HTTP Lot 4

Identité active :

- commit : `3e2db1a4f180798e6c00699fcac6dd9e35587166` ;
- `BUILD_ID` : `wAreTexeETfv5rDLgCjLT`.

Résultats :

- `GET /` → `200` ;
- `GET /admin/login` → `200` ;
- `GET /admin/parametres` → `307` vers `/admin/login?redirect=%2Fadmin%2Fparametres` ;
- `GET /api/admin/organization` sans session → `401` ;
- `PATCH /api/admin/organization` sans session → `401` ;
- corps API : `{"ok":false,"message":"Non autorisé."}` ;
- tentative `PATCH` rejetée avant mutation ;
- aucune donnée modifiée.

Marqueur :

`CITADELLE_ERP_LOT4_PRODUCTION_HTTP_QA_OK`

### 11. QA connectée réversible Lot 4

Lecture initiale :

- organisation canonique correctement chargée ;
- pays initial : `CI`.

Mutation contrôlée :

- champ unique : `country` ;
- valeur temporaire : `CI [QA LOT 4]` ;
- `PATCH` → succès ;
- relecture `GET` → valeur temporaire confirmée.

Restauration :

- retour exact à `CI` ;
- `PATCH` de restauration → succès ;
- relecture finale → état fonctionnel identique à l’état initial ;
- `MUTATION_CONFIRMED=true` ;
- `RESTORATION_CONFIRMED=true` ;
- aucun champ protégé modifié ;
- aucune deuxième organisation ;
- aucun SQL.

Marqueur :

`CITADELLE_ERP_LOT4_CONNECTED_REVERSIBLE_QA_OK`

### 12. QA finale transversale du socle

#### QA serveur N0C

Identité et intégrité :

- commit actif conforme ;
- `BUILD_ID` conforme ;
- archive de release conforme à son SHA256 ;
- backup pré-déploiement conforme à son SHA256.

Fichiers protégés strictement identiques au backup :

| Fichier | SHA256 |
|---------|--------|
| `.env` | `4680a76f70fb7f3b0021c59c3627aebb5a627bb466d1672de1d8027b78fe5073` |
| `.env.exemple-production` | `20ff174beb6c38a7fcef11952fa35833ecfd58ab2ca3528215e00738de2fe04e` |
| `.htaccess` | `2edfc6726dc471eadd69a8cd7d270a83f364928ee4328d70c0a615085832aa52` |
| `app.js` | `910030c42f41fdb8d1d5bcd0f3676d03d50cecad04d6c072b3580211a46ae6ac` |

Disponibilité :

- `/` → `200` ;
- `/nouveau-venu` → `200` ;
- `/admin/login` → `200`.

Frontières administratives sans session :

- `/admin/membres` → `307` vers login ;
- `/admin/nouveaux-venus` → `307` vers login ;
- `/admin/parametres` → `307` vers login ;
- `/api/admin/organization` → `401` ;
- `/api/admin/membres` → `401` ;
- `/api/admin/newcomer-intakes` → `401`.

Marqueur :

`CITADELLE_ERP_FOUNDATION_FINAL_SERVER_QA_OK`

#### QA connectée transversale en lecture seule

Lot 1 :

- organisation canonique unique validée ;
- slug `chapelle-du-royaume` ;
- statut `active`.

Lot 2-A :

- 3 demandes nouveaux venus ;
- 3 identifiants uniques ;
- statuts conformes ;
- 8 étapes du référentiel de parcours ;
- aucune fuite d’`organization_id`.

Lot 2-B :

- fiche membre 360° autorisée chargée ;
- membership active vérifiée avant chargement.

Lot 3 :

- 13 membres ;
- 13 retournés ;
- 13 actifs ;
- 0 suspendu ;
- 13 identifiants uniques ;
- accès owner/admin fonctionnel.

Lot 4 :

- pays `CI` ;
- fuseau `Africa/Abidjan` ;
- langue `fr` ;
- devise `XOF`.

Pages connectées :

- `/admin/membres` ;
- fiche membre 360° ;
- `/admin/nouveaux-venus` ;
- `/admin/parametres`.

Aucun `PATCH`, aucun `POST`, aucune mutation et aucun SQL durant cette QA.

Marqueur :

`CITADELLE_ERP_FOUNDATION_FINAL_CONNECTED_READONLY_QA_OK`

Décision :

`CITADELLE_ERP_FOUNDATION_FINAL_TRANSVERSE_QA_VALIDATED`

### 13. Limites acceptées du socle

- cookie admin legacy conservé comme première couche ;
- membership individuelle non portée par le cookie ;
- `service_role` utilisé uniquement derrière les gardes serveur ;
- une seule organisation canonique réelle ;
- stratégie `.in(id, allowedIds)` adaptée au MVP actuel ;
- page paramètres encore partiellement mock hors carte ERP ;
- pas d’email, téléphone, logo ou branding organisationnel dans le Lot 4 ;
- aucune deuxième organisation réelle ;
- aucune facturation ;
- aucun abonnement SaaS ;
- aucune configuration avancée ;
- aucune migration générale des modules métier hors socle ;
- aucun second RBAC ;
- aucune nouvelle infrastructure d’audit.

Ces limites sont documentées et ne bloquent pas la clôture du socle Fondation ERP.

### 14. Décision finale

Les Lots suivants sont officiellement clôturés :

- Lot 0 — Audit ;
- Lot 1 — Organisations SaaS ;
- Lot 2-A — Isolation tenant des nouveaux venus ;
- Lot 2-B — Isolation tenant des profils administratifs ;
- Lot 3 — Permissions centrales minimales des membres ;
- Lot 4 — Paramètres essentiels par organisation et QA finale.

La Fondation ERP SaaS de Citadelle est validée :

- localement ;
- sur GitHub ;
- en release ;
- en production ;
- par QA HTTP ;
- par QA connectée réversible ;
- par QA transversale en lecture seule ;
- avec fichiers protégés inchangés ;
- sans SQL au Lot 4 ;
- sans élargissement de périmètre.

`CITADELLE_ERP_FOUNDATION_COMPLETED`
