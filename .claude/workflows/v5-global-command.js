export const meta = {
  name: 'v5-global-command',
  description: 'Fondation V5 — Centre de Commandement Apostolique Global : 9 capacités (vision/gouvernement/santé/finances/croissance/alertes prophétiques/IA prédictive/crise/mission) + synthèse + fondation code',
  phases: [
    { title: 'Capacités', detail: '9 architectes de capacité mondiale en parallèle' },
    { title: 'Fondation', detail: 'synthèse consolidée + lib intelligence + migration + plan' },
  ],
}

const CONVENTIONS = `
PROJET : Citadelle / CIER — plateforme apostolique. Next.js App Router + Supabase (Postgres) + TypeScript. UI FR. Échelle cible : plusieurs dizaines de milliers de membres, plusieurs pays, plusieurs antennes.

# MIGRATIONS SQL — règles strictes
- supabase/migrations/AAAAMMJJHHMMSS_nom.sql. Dernier timestamp = 20260603100000 (réservé V4). Utilise > 20260603200000 pour V5.
- TOUJOURS idempotent & additif : create table if not exists ; add column if not exists ; create index if not exists ; drop policy if exists + create policy ; insert ... on conflict do nothing ; alter type ... add value if not exists.
- snake_case. id uuid pk default gen_random_uuid(), created_at timestamptz default now(), slug unique, actif boolean default true. Devise 'FCFA'. Commentaires FR.
- RLS activée. SELECT public si pertinent (anon, authenticated). ÉCRITURE = service role. Données sensibles = aucune policy (service role only) + journal sensitive_access_logs.

# EXISTANT à réutiliser (NE PAS recréer)
- profiles (role, membre_statut, pays, ville, parcours_etape, derniere_connexion, antenne_id, created_at).
- antennes (hiérarchie parent_id, pays, devise, responsable_id) + seed. dons/evenements/profiles rattachés à antenne_id.
- nation_responsables (user_id, pays, role) ; sensitive_access_logs ; user_role enum (super_admin, nation_pastor, platform_admin, intercesseur, responsable_mahanaim, coordinateur, pasteur, admin, formateur...).
- prayer_center : priere_demandes (priorite, statut, is_public, pays, langue, assigned_to), priere_assignations, priere_categories, temoignages. delivrance_demandes.
- marketplace_products + product_purchases (Chariow). dons (paiements Chariow, devise, antenne_id, meta json).
- LMS formations + modules, inscriptions_formation, parcours d'intégration, groupes (cellules), activity_logs (action_type), analytics_sessions/events (heartbeat), app_notifications + Realtime + notify().
- pastoral-intelligence.ts : LOGIQUE PURE — engagementLevel (6 paliers), conversionStage (Visiteur→Leader), memberAlerts. pastoral-prediction.ts existe.
- nation-stats.ts : agrégats par nation (countIn, count exact head). roles.ts : ADMIN_ROLES, isAdmin().

# FONDATION V4 (en cours, à supposer disponible)
- RBAC scopé par antenne (responsable d'antenne) côté serveur ; stats par antenne ; src/lib/command-center.ts (agrégation KPIs transverses) ; /api/admin/command-center ; cockpit unique multi-contexte (global/antenne/nation).

# API (route.ts)
- runtime='nodejs'; dynamic='force-dynamic'. Garde isAdminRequest(req) (admin) ; getSessionProfile() (membre). supabaseAdmin (bypass RLS, serveur only) ; IS_DEMO_MODE early return. Réponses {ok, data|message}. rateLimit/clientIp en écriture. 'server-only' pour libs service-role.

# OBJECTIF V5 — CENTRE DE COMMANDEMENT APOSTOLIQUE GLOBAL
Couche d'INTELLIGENCE & d'ORCHESTRATION MONDIALE au-dessus de V4. Une seule console mondiale pour piloter l'œuvre à travers les nations et antennes : voir, comprendre, anticiper, alerter, décider. Pas des silos — un cerveau central qui agrège et prédit. Tout calcul sensible CÔTÉ SERVEUR, portée par rôle.
`;

const CAP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['capacite', 'reuse', 'architecture', 'sql', 'apis', 'keyCode', 'intelligence', 'security', 'scalability', 'uxui', 'pastoralCases', 'gaps'],
  properties: {
    capacite: { type: 'string' },
    reuse: { type: 'array', items: { type: 'string' } },
    architecture: { type: 'string', description: 'markdown : composants, flux, agrégation transverse, intégration à la console mondiale' },
    sql: { type: 'string', description: 'NOUVEAU SQL idempotent additif uniquement (tables de config/snapshot/alerte, vues, RPC d agrégation). Ne recrée jamais l existant.' },
    apis: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['method', 'path', 'purpose'], properties: { method: { type: 'string' }, path: { type: 'string' }, purpose: { type: 'string' } } } },
    keyCode: { type: 'string', description: 'TypeScript drop-in : lib d intelligence PURE (calcul/score/prédiction sans I/O) ET/OU route.ts, conventions exactes' },
    intelligence: { type: 'string', description: 'Modèle de calcul/score/prédiction : signaux d entrée réels, formules, seuils, sorties. Aucune donnée inventée.' },
    security: { type: 'string' },
    scalability: { type: 'string', description: 'dizaines de milliers de membres, multi-pays : snapshots/vues matérialisées, jobs cron, cache, pagination' },
    uxui: { type: 'string' },
    pastoralCases: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
  },
};

const CAPS = [
  { key: 'vision-mondiale', titre: "Vision mondiale de l'œuvre", brief: `Vue d'ensemble mondiale temps réel : total membres / antennes / nations / disciples / dons / âmes / formations / prières, répartition géographique, tendances. Console "mappemonde + KPIs globaux" agrégeant TOUTES les antennes et nations. Réutilise nation-stats, cartographie, antennes. Snapshots quotidiens pour tendances historiques (table de snapshots).` },
  { key: 'gouvernement-antenne', titre: 'Gouvernement par antenne', brief: `Pilotage de la gouvernance de chaque antenne : responsables, conseil/équipe, santé de l'antenne (membres actifs, croissance, finances, intercession, discipulat), objectifs et redevabilité, comparaison inter-antennes. Réutilise antennes (parent_id), nation_responsables (étendre à antenne_id), RBAC V4. Table d'objectifs/jalons par antenne + scorecard.` },
  { key: 'sante-spirituelle-mondiale', titre: 'Santé spirituelle mondiale', brief: `Indice de santé spirituelle agrégé par antenne / nation / monde, dérivé de pastoral-intelligence (engagementLevel, conversionStage, alertes). Heatmap mondiale, répartition par palier d'engagement, détection des zones en déclin. Réutilise pastoral-intelligence (PUR). Snapshots de santé pour tendances.` },
  { key: 'finances-mondiales', titre: 'Finances mondiales', brief: `Consolidation multi-devises des dons/offrandes/marketplace par antenne/nation/monde, conversion en devise pivot, tendances, projections, transparence et redevabilité. Réutilise dons (devise, antenne_id, meta), marketplace product_purchases, Chariow. Table de taux de change + RPC d'agrégation. Détection d'anomalies financières.` },
  { key: 'croissance-mondiale', titre: 'Croissance mondiale', brief: `Mesure de la croissance : nouvelles âmes, nouveaux membres, conversions par étape (Visiteur→Leader), taux de rétention, vitesse d'intégration, nouvelles antennes, par période et territoire. Réutilise conversionStage, parcours, profiles.created_at. Table de snapshots de croissance + cohortes.` },
  { key: 'alertes-prophetiques', titre: 'Alertes prophétiques', brief: `Système d'alertes stratégiques de haut niveau (au-delà des alertes pastorales individuelles) : signaux mondiaux nécessitant attention apostolique — déclin d'une antenne, flambée d'urgences de prière dans une région, chute des dons, vague de nouveaux convertis non intégrés, fenêtre de moisson. Moteur de règles configurable + niveaux de sévérité + destinataires (responsables). Réutilise app_notifications/notify, sensitive_access_logs. Table de règles + d'alertes émises.` },
  { key: 'ia-pastorale-predictive', titre: 'Intelligence pastorale prédictive', brief: `Prédiction au niveau mondial : risque d'attrition par membre/antenne, propension au don, prêt-à-servir, prévision de croissance, prochaine meilleure action pastorale. Modèles explicables basés sur signaux réels (heuristiques/scores transparents, pas de boîte noire), étendant pastoral-prediction.ts. Sorties : scores + recommandations actionnables. Table de scores prédictifs (snapshot) + feature store léger.` },
  { key: 'centre-crise', titre: 'Centre de crise', brief: `Gestion des crises pastorales/urgences : déclenchement (urgence de prière critique, sinistre, crise dans une antenne), cellule de crise, escalade, assignation, suivi temps réel, communication, clôture & retour d'expérience. Réutilise priere_demandes (priorite tres_urgent), delivrance, notify, Realtime. Tables incidents + journal d'intervention + niveaux d'escalade.` },
  { key: 'centre-missionnaire', titre: 'Centre missionnaire', brief: `Pilotage de l'expansion missionnaire mondiale : champs de mission, missionnaires/envoyés, projets d'implantation d'antennes, financement de mission, suivi des fruits (conversions, cellules nées), cartographie des cibles. Réutilise antennes (implantations), cartographie, dons (financement), profiles (envoyés). Tables champs de mission + missionnaires + projets.` },
];

phase('Capacités');
const designs = await parallel(CAPS.map((c) => () => agent(
  `${CONVENTIONS}\n\n# TA MISSION — Architecte de la capacité mondiale : ${c.titre}\n${c.brief}\n\nConçois cette capacité comme une brique du Centre de Commandement Apostolique GLOBAL (couche d'intelligence au-dessus de V4), CONSTRUCTIBLE immédiatement, à l'échelle de plusieurs dizaines de milliers de membres et plusieurs pays/antennes. Réutilise IMPÉRATIVEMENT l'existant Citadelle + la fondation V4. SQL = migration idempotente prête à coller (uniquement le NOUVEAU). keyCode = TypeScript drop-in suivant EXACTEMENT les conventions. Décris le modèle d'intelligence (signaux réels → scores/prédictions), la sécurité (portée serveur, données sensibles), la scalabilité (snapshots/vues/cron), l'UX de la console mondiale, et les cas pastoraux.`,
  { label: `cap:${c.key}`, phase: 'Capacités', schema: CAP_SCHEMA }
)));

const valid = designs.filter(Boolean);
log(`${valid.length}/${CAPS.length} capacités conçues`);

phase('Fondation');
const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['synthesis', 'unifiedSql', 'libGlobalIntel', 'apiGlobalCommand', 'buildPlan', 'roadmap'],
  properties: {
    synthesis: { type: 'string', description: 'Document de synthèse UNIQUE markdown : vision du Centre de Commandement Apostolique Global, architecture d intelligence, les 9 capacités, sécurité, scalabilité multi-pays, UX console mondiale, cas pastoraux. La référence V5.' },
    unifiedSql: { type: 'string', description: 'UNE migration consolidée idempotente additive (timestamp 20260603200000) : snapshots, alertes, règles, scores prédictifs, incidents, mission, taux de change, vues/RPC d agrégation mondiale. Dédupliquée, ordonnée, prête à coller.' },
    libGlobalIntel: { type: 'string', description: 'Fichier src/lib/global-intelligence.ts complet : logique PURE d agrégation/score/prédiction mondiale (indice de santé mondial, détection d alertes prophétiques, scores prédictifs), testable, réutilisant les types de pastoral-intelligence. Drop-in.' },
    apiGlobalCommand: { type: 'string', description: 'Fichier src/app/api/admin/global-command/route.ts complet : agrégation mondiale gardée isAdminRequest, scope par rôle, conventions exactes. Drop-in.' },
    buildPlan: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['path', 'purpose'], properties: { path: { type: 'string' }, purpose: { type: 'string' } } } },
    roadmap: { type: 'array', items: { type: 'string' } },
  },
};

const synthesis = await agent(
  `${CONVENTIONS}\n\n# TA MISSION — Fondation consolidée V5 (Centre de Commandement Apostolique Global)\nVoici les ${valid.length} capacités conçues par les architectes. Consolide-les en UNE fondation cohérente, sans doublons, prête à construire, au-dessus de V4.\n\nCAPACITÉS (JSON):\n${JSON.stringify(valid).slice(0, 230000)}\n\nProduis : 1) synthesis (markdown, référence V5) ; 2) unifiedSql (migration consolidée idempotente, timestamp 20260603200000, réconcilie les SQL, supprime doublons, ordonne dépendances, ne recrée jamais l'existant) ; 3) libGlobalIntel (src/lib/global-intelligence.ts complet) ; 4) apiGlobalCommand (src/app/api/admin/global-command/route.ts complet) ; 5) buildPlan + roadmap. Respecte EXACTEMENT les conventions. Tout doit être réellement collable.`,
  { label: 'synthese-v5', phase: 'Fondation', schema: SYNTH_SCHEMA }
);

return { capacites: valid, synthesis };
