# Infrastructure de données — Chapelle v2 (schéma `chapelle`)

Migrations SQL générées depuis `docs/architecture/` (core + 8 modules).
**Aucune page applicative créée** — uniquement l'infrastructure de données.

## Isolation & non-régression
Tout est créé dans le schéma Postgres **`chapelle`**, séparé du prototype v1
(`public.profiles`, `public.evenements`, …). Aucune table v1 n'est modifiée ou
supprimée → **zéro régression**. La seule collision potentielle (`notifications`)
est évitée par l'isolation de schéma.

> Pour exposer ce schéma à l'API REST/Realtime : Supabase → Settings → API →
> *Exposed schemas* → ajouter `chapelle`.

## Ordre d'application (les fichiers s'exécutent par ordre de nom)

| # | Fichier | Contenu |
|---|---------|---------|
| 01 | `..100000_chapelle_extensions_enums.sql` | schéma `chapelle`, extensions (`pgcrypto`,`pg_trgm`), **25 enums**, `set_updated_at()` |
| 02 | `..100100_chapelle_core_tables.sql` | **11 tables core** : platforms, members, memberships, roles, events, donations, prayer_requests, form_submissions, notifications, analytics_events, integration_journeys (+ index inline) |
| 03 | `..100200_module_cier.sql` | 6 tables `cier_*` |
| 04 | `..100300_module_chapelle_familiale.sql` | 5 tables `familiale_*` |
| 05 | `..100400_module_jeunesse.sql` | 7 tables `jeunesse_*` |
| 06 | `..100500_module_cite_refuge.sql` | 6 tables `cite_refuge_*` (confidentialité max) |
| 07 | `..100600_module_cfic.sql` | 7 tables `cfic_*` |
| 08 | `..100700_module_femmes_exceptions.sql` | 7 tables `femmes_*` |
| 09 | `..100800_module_familles_chapelle.sql` | 7 tables `cellules_*` |
| 10 | `..100900_module_mahanaim.sql` | 6 tables `mahanaim_*` |
| 11 | `..101000_chapelle_rbac_functions.sql` | helpers RBAC : `current_member_id`, `has_global_role`, `has_platform_role`, `platform_id`, `refuge_is_assigned`, `role_level` |
| 12 | `..101100_chapelle_triggers.sql` | `updated_at` auto (toutes tables), horodatage des jalons + sync `tunnel_stage` |
| 13 | `..101200_chapelle_indexes.sql` | index supplémentaires (perf dashboards) |
| 14 | `..101300_chapelle_analytics_views.sql` | **12 vues** : `v_admin_kpis`, `v_platform_overview`, `v_tunnel_funnel`, `v_*_stats` par module |
| 15 | `..101400_chapelle_rls_policies.sql` | activation RLS + **127 policies** sur les 61 tables |
| 16 | `..101500_chapelle_seed.sql` | seed des 7 rôles + 8 plateformes (hiérarchie sous CIER) |

## Modèle RBAC (double portée)
- `members.role_global` = plancher de droits (visiteur→admin).
- `memberships.role` = droits contextuels par plateforme.
- Droit effectif = `max(niveau global, niveau membership)` — via `has_platform_role(platform_id, role)`.
- Le **service role** Supabase contourne la RLS → insertions système (notifications,
  webhooks dons, tracking) côté serveur.

## Vues du dashboard admin
`v_admin_kpis` expose exactement les 6 KPI d'accueil : visiteurs aujourd'hui,
nouveaux inscrits, demandes de prière, offrandes (mois), formations actives,
événements à venir. `v_*_stats` couvrent les indicateurs imposés par plateforme
(ex. Mahanaïm : intercesseurs actifs / retraites / participants / sentinelles ;
CFIC : étudiants / progression / certifications / abandons).

## Application
```bash
# via Supabase CLI (recommandé)
supabase db push          # applique les migrations dans l'ordre
# ou, en SQL direct (ordre alphabétique des fichiers)
psql "$DATABASE_URL" -f 20260529100000_chapelle_extensions_enums.sql   # ... etc.
```

## Tunnel d'intégration
`integration_journeys` matérialise les jalons (formulaire, WhatsApp, parcours,
programme, devenu membre). Le trigger (`12`) horodate chaque jalon et recalcule
`stage_courant`, puis élève `members.tunnel_stage` (jamais de régression).

## Statistiques (récap objets)
61 tables · 25 enums · 11 fonctions · 147 index · 12 vues · 127 policies RLS.

> ⚠️ Les migrations n'ont pas été exécutées sur une base réelle dans cet
> environnement (pas de Postgres local). Valider avec `supabase db reset` sur
> une base de dev avant production.
