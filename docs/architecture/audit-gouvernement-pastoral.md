# Audit de maturité — Gouvernement Pastoral de Citadelle

> **Document de référence officielle du projet.** Audit en lecture seule (aucune modification).
> Méthode : 4 investigations parallèles croisées (dashboards, alertes/score/360°, statistiques, multi-nations + tables).
> Statut : le Gouvernement Pastoral est un **ACQUIS PARTIELLEMENT TERMINÉ** (~70-75 %). 7 terminés · 4 partiels · 1 manquant.

## Matrice des 12 éléments

| # | Élément | Maturité | Preuve (route + table/RPC réelle) |
|---|---|---|---|
| 1 | Dashboard Global | 🟢 Existe | `/admin/global-command` (RPC `world_overview`, `crisis_overview`, `aggregate_spiritual_health`), `/admin/command-center` (`command_center_kpis`), `/admin/gouvernement` (`pastoral_member_signals`) |
| 2 | Dashboard National | 🟢 Existe | `/admin/nation-dashboard` + `/api/admin/nation?pays=`, `/member/dashboard/nation` (scopé serveur), `/admin/international` ; `nation_responsables`, `nation-stats.ts` |
| 3 | Dashboard Plateforme | 🔴 N'existe pas | Aucune route. `plateforme_id` = filtre de liste + champ CRUD ; carte plateformes de `/admin/dashboard` = placeholder |
| 4 | Dashboard Leader | 🟡 Partiel | Onglet « Animation » de `/member/dashboard/groupes` → `/api/member/groupes?manage=1` (`groupsLedBy`, `isGroupLeader`) — gestion, pas analytique |
| 5 | Alertes Pastorales | 🟢 Existe (mature) | Table `pastoral_alerts` ; `raisePastoralAlert` (`events.ts`) ; 6 déclencheurs cron + `absence_repetee` ; escalade responsable→pasteur_national→admin→super_admin |
| 6 | Stats Croissance | 🟡 Partiel | `/api/admin/gouvernement` (module croissance) + `metrics.ts:bucketGrowth` → `/admin/pastoral` ; `profiles.created_at`, `analytics_*` |
| 7 | Stats Intégration | 🟢 Existe | RPC `chapelle.integration_funnel()` + `/admin/tunnel-integration` ; `/api/member/integration` (scopé) ; `integration-progress-server.ts` |
| 8 | Stats Formation | 🟢 Existe | `/api/admin/gouvernement` (module formation) + `/api/admin/stats` (bloc `lms`, taux_completion) ; `inscriptions_formation`, `module_completions`, `certificats` |
| 9 | Stats Présence | 🟡 Partiel | `groupAttendanceStats(groupeId)` → `/admin/reunions` onglet « Par groupe » UNIQUEMENT ; `group_reunions`, `group_attendance` |
| 10 | Score d'engagement | 🟡 Partiel | Colonne `profiles.score_engagement` LUE partout, JAMAIS écrite ; calcul réel `pastoral-intelligence.ts:engagementScore` consommé seulement par `/admin/gouvernement` sans persistance |
| 11 | Fiche 360° | 🟢 Existe (très mature) | `getMemberDossier` (13 domaines) ; `/admin/membres/[id]` ; `pastoral_notes`, `pastoral_actions_log`, `pastoral_alerts`, `membre_statut_history`, `membres_groupe` |
| 12 | Multi-nations | 🟢 Existe (réserves) | `nation_responsables` (unique user_id+pays) ; scoping serveur `resolveMyPays` ; agrégation/comparaison `/admin/international` |

## Terminé (acquis solides)
Dashboard Global · Dashboard National · Alertes Pastorales · Stats Intégration · Stats Formation · Fiche 360° · Multi-nations.

## Partiellement terminé
- **Dashboard Leader** : gestion oui, analytique par groupe non (pas de score/santé/présence/churn au niveau groupe).
- **Stats Croissance** : instantané + courbe d'inscriptions, mais `membre_statut_history` jamais agrégée → pas de conversion de statut dans le temps.
- **Stats Présence** : seulement par groupe ; aucune agrégation transverse ; `/api/admin/gouvernement` ne lit jamais `group_attendance`.
- **Score d'engagement** : colonne lue partout mais jamais alimentée (reste à 0) ; vrai calcul non persisté ; deux jeux de seuils divergents.
- *(Multi-nations : réserves — dashboard nation membre ne lit que `myPays[0]` ; `pays` texte libre sans référentiel ; agrégation inter-nations en JS non-RPC.)*

## Manque réellement
- **Dashboard Plateforme** : inexistant. Les 8 plateformes ne sont qu'une dimension de données, jamais un axe de pilotage. Aucune route, aucun scope `plateforme`, aucune RPC d'agrégation par plateforme.

## Tables existantes (socle)
`profiles` (role, membre_statut, score_engagement, berger_id, plateforme_principale, pays, archived_at, derniere_connexion) · `pastoral_notes` · `pastoral_actions_log` · `pastoral_alerts` · `membre_statut_history` · `nation_responsables` · `sensitive_access_logs` · `groupes` · `membres_groupe` · `group_reunions` · `group_attendance` · `analytics_sessions` · `analytics_events` · tables/RPC V4-V5 (`command_center_*`, `world_*`, `spiritual_health_*`, `growth_*`, `finance_*`, `mission_*`, `crisis_*`).
RPC pivots : `pastoral_member_signals(p_pays)` · `chapelle.admin_dashboard` · `chapelle.integration_funnel`.

## Verdict
Gouvernement Pastoral majoritairement construit. Décision : **ne pas ouvrir de nouveau chantier** — appliquer la règle des acquis ([[regle-acquis]]) et **enrichir uniquement**. 4 priorités : (1) persister le score d'engagement, (2) gouvernement des présences (agrégation transverse), (3) Dashboard Plateforme (seul élément absent), (4) exploiter `membre_statut_history`. Voir `plan-enrichissement-gouvernement.md`.
