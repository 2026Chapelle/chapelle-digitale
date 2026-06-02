# Architecture — Centre de Commandement Apostolique (V4 + V5)

> Document maître. Décrit la fondation construite, l'ordre des migrations, les
> dashboards, le modèle de sécurité, et le **pivot stratégique vers le mode
> optimisation**. Référence unique pour stabiliser puis faire grandir l'œuvre.

## 1. Vision

Piloter **Membres, Antennes, Discipulat, Finances, Marketplace, Formations,
Prières, Événements** — puis l'œuvre **mondiale** — depuis une seule interface,
à l'échelle de **plusieurs dizaines de milliers de membres**, multi-pays,
multi-antennes, multi-devises.

Trois couches :

| Couche | Rôle | Construit |
|---|---|---|
| **Existant Citadelle** | Modules métier (CMS, LMS, prayer center Mahanaïm, marketplace, dons Chariow, analytics, intelligence pastorale) | déjà en place |
| **V4 — Centre de Commandement** | Cockpit transverse unique : agrégation KPI temps réel, RBAC scopé (global/nation/antenne), 6 modules consolidés | ✅ ce palier |
| **V5 — Commandement Global** | Couche d'intelligence mondiale : santé, finances, croissance, prédiction, alertes prophétiques, crise, mission | ✅ ce palier (fondation) |

**Principe directeur** : on **étend**, on ne recrée jamais. Chaque table existante
(`antennes`, `prayer_center`, `marketplace`, `dons`, `profiles`) est réutilisée.

## 2. Migrations finales — ordre de poussée

```bash
supabase db push   # applique dans l'ordre chronologique des timestamps
```

| Ordre | Fichier | Contenu |
|---|---|---|
| … | migrations existantes (jusqu'à `20260602270000_antennes`) | socle |
| **1** | `20260603100000_v4_command_center.sql` | antennes étendues + `antenne_responsables` ; marketplace (catégories/avis/abonnements/RPC) ; mobile (devices/sessions/prefs/push) ; intercession (salles/chaînes/créneaux/garde/mur/escalades) ; discipulat (chemins/étapes/relations/jalons) ; cartographie (`geo_localites`/`expansion_zones`) ; cockpit (`command_center_kpis`, MV tendances) |
| **2** | `20260603200000_v5_global_command.sql` | gouvernement par antenne, vision mondiale, santé spirituelle, croissance, finances (`fx_rates`), IA prédictive, alertes prophétiques, crise, mission — 32 tables, 16 RPC |

**Propriétés vérifiées** : idempotentes & additives (`if not exists`,
`drop policy`+`create policy`, `add value if not exists`), RLS activée,
fonctions `security definer` + `revoke` sur les publics, vues matérialisées avec
index unique (refresh `concurrently`). Aucune collision de nom de table.

> ⚠️ Après `db push` : créer le bucket Storage privé `produits` (marketplace) et
> configurer les **crons de rafraîchissement** (voir §5). Puis `npm run db:generate`
> pour régénérer `src/types/supabase.ts`.

## 3. Dashboards définitifs

| Écran | Route | API | Données |
|---|---|---|---|
| **Centre de Commandement** | `/admin/command-center` | `/api/admin/command-center` | `command_center_kpis` (RPC SET-BASED), tuiles KPI, sélecteur contexte global/nation, deep-links pré-filtrés |
| **Commandement Global** | `/admin/global-command` | `/api/admin/global-command` | orchestrateur des 9 capacités : pouls mondial, alertes multi-sources, santé par territoire, gouvernement par antenne |

Les deux sont en tête de l'`AdminSidebar`. Auto-refresh (30s cockpit / 60s
console mondiale). Le cockpit transverse est l'écran d'atterrissage `/admin`.

## 4. Modèle de sécurité

- **Garde** : cookie `cier_admin` (`isAdminRequest`) sur tout `/api/admin/*` ;
  `getSessionProfile()` côté membre. Jeton de prod obligatoire (pas de repli).
- **Portée imposée côté serveur** : `command-center.ts` (`clampContext`) borne le
  contexte demandé par l'UI à la portée RBAC réelle (super_admin global ;
  nation_pastor → ses pays ; responsable d'antenne → son sous-arbre).
- **Service role uniquement en écriture** : `supabaseAdmin` bypass RLS, jamais
  importé côté client (`'server-only'`). Lectures publiques via policies SELECT.
- **Données sensibles** : RPC `revoke all from public/anon/authenticated` ;
  journalisation dans `sensitive_access_logs` (`command_center_view`,
  `global_command_view`). Incidents de crise `confidentiel`.
- **Anti-abus** : `rateLimit`/`clientIp` sur les écritures.

## 5. Scalabilité (dizaines de milliers de membres)

- **Agrégation SET-BASED** : tout KPI passe par une RPC SQL (`command_center_kpis`,
  `world_overview`, `finance_aggregate`, …) — zéro pull de 100k lignes en Node.
- **Index composites de scope** : `(antenne_id, membre_statut)`, `(antenne_id, statut)` sur les tables chaudes.
- **Snapshots + vues matérialisées** : tendances pré-calculées (`mv_command_center_daily`,
  `mv_mission_pulse`, `*_snapshots`) rafraîchies par cron — à brancher :
  - `refresh_command_center_daily()` — nuit
  - `capture_world_snapshot()`, `growth_snapshot_run()`, `finance_build_snapshots()`, `antenne_scorecard_refresh()`, `prophetic_compute_snapshot()`, `refresh_mission_pulse()` — quotidien
- **Console mondiale défensive** : chaque capacité est un appel indépendant
  (`Promise.all` + `safeRpc`) — une RPC absente dégrade sans casser.

## 6. Pivot stratégique — du mode « ajout » au mode « optimisation »

La fondation d'architecture est posée (V4 + V5). **On arrête l'ajout massif de
nouvelles capacités structurelles.** Priorité désormais à la **profondeur** :

### Prochaine priorité — Contenu & parcours (à optimiser, pas à réarchitecturer)

1. **Contenu** — qualité éditoriale, médias, articles, enseignements (CMS existant).
2. **Parcours de formation** — LMS : compléter modules, quiz, certifications, progression.
3. **Intégration des membres** — tunnel d'intégration : fluidité, relances, jalons.
4. **Mahanaïm** — activer pleinement le centre d'intercession (salles, chaînes 24/7, tours de garde déjà en base V4).
5. **Académie des Élus** — structurer le parcours de discipulat (chemins/étapes/mentorat V4).
6. **Bibliothèque numérique** — marketplace + accès post-achat : catalogue, collections.
7. **Masterclass** — type marketplace `masterclass` : production, accès, suivi.

### Posture de travail

- **Mesurer avant d'ajouter** : brancher les crons, observer les KPI réels du cockpit.
- **Approfondir l'existant** : remplir les tables construites, pas en créer.
- **Industrialiser** : tests des libs pures (`command-center`, `global-intelligence`,
  `pastoral-intelligence`), cache court par contexte, store de rate-limit partagé.

## 7. Détail des conceptions

- V4 : voir [`V4_SYNTHESE_CENTRE_COMMANDEMENT.md`](./V4_SYNTHESE_CENTRE_COMMANDEMENT.md)
- V5 : voir [`V5_SYNTHESE_COMMANDEMENT_GLOBAL.md`](./V5_SYNTHESE_COMMANDEMENT_GLOBAL.md)
