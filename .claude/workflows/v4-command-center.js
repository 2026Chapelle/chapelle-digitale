export const meta = {
  name: 'v4-command-center',
  description: 'Conçoit V4 (6 modules) + Centre de Commandement Apostolique, ancré sur les conventions Citadelle, puis synthèse consolidée + plan de build',
  phases: [
    { title: 'Conception', detail: '6 architectes module + 1 architecte Centre de Commandement, en parallèle' },
    { title: 'Synthèse', detail: 'consolidation unique + migration foundation + plan de build' },
  ],
}

// ── Conventions RÉELLES de Citadelle (ancrage pour des livrables drop-in) ──
const CONVENTIONS = `
PROJET : Citadelle / CIER — plateforme apostolique. Next.js App Router + Supabase (Postgres) + TypeScript. UI FR.

# Conventions MIGRATIONS SQL (à respecter à la lettre)
- Fichiers supabase/migrations/AAAAMMJJHHMMSS_nom.sql. Dernier timestamp utilisé = 20260602270000. Choisis un timestamp > celui-ci.
- TOUJOURS idempotent & additif : create table if not exists ; alter table ... add column if not exists ; create index if not exists ; drop policy if exists puis create policy ; insert ... on conflict do nothing.
- snake_case. Colonnes standard : id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), slug text unique, actif boolean not null default true.
- Devise par défaut 'FCFA'. Commentaires en français.
- RLS : alter table ... enable row level security ; policy SELECT pour 'anon, authenticated' sur le public (using actif=true). ÉCRITURE = service role uniquement (pas de policy insert/update sauf soumissions publiques explicites).
- ENUM rôles : alter type public.user_role add value if not exists '...'; (hors transaction d'usage).

# Tables/atouts EXISTANTS à RÉUTILISER (ne pas recréer)
- profiles (id, role, membre_statut, pays, ville, parcours_etape, derniere_connexion, created_at, antenne_id [déjà ajoutée]).
- antennes (id, nom, slug, pays, ville, fuseau, devise, responsable_id, parent_id [hiérarchie], actif) + seed Abidjan/Canada/Europe. profiles.antenne_id, evenements.antenne_id, dons.antenne_id existent déjà.
- nation_responsables (user_id, pays, role) ; sensitive_access_logs ; user_role enum inclut super_admin, nation_pastor, platform_admin, intercesseur, responsable_mahanaim, coordinateur.
- priere_demandes (étendue : priorite, pays, ville, langue, assigned_to, responsable_id, statut, is_public, prayers_count, reference) + priere_categories + priere_assignations + temoignages. delivrance_demandes existe.
- marketplace_products + product_purchases (access_token, chariow_*, don_id) + bucket privé 'produits'. Achats via webhook Chariow → table dons.
- dons (table paiements Chariow, devise FCFA, antenne_id, meta json). CMS : cms_events, cms_* . inscriptions_formation, formation modules (LMS). groupes. activity_logs (action_type). analytics_sessions/events (heartbeat). app_notifications (Realtime) + notify() helper.
- LMS formations, parcours d'intégration (tunnel), integration stages.

# Conventions API (route.ts)
- export const runtime='nodejs'; export const dynamic='force-dynamic';
- import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'; import { isAdminRequest } from '@/lib/admin-auth';
- Garde admin : if(!isAdminRequest(req)) return NextResponse.json({ok:false,message:'Non autorisé.'},{status:401}). Membre : getSessionProfile() de '@/lib/member-auth'.
- if(IS_DEMO_MODE) return early { ok:true, demo:true }. Réponses { ok, data | message }.
- Écritures : rateLimit/clientIp de '@/lib/rate-limit'. sanitize() avec whitelist de champs. slugify pour les slugs.
- supabaseAdmin BYPASS RLS — serveur uniquement. Libs service-role : import 'server-only'.

# Conventions LIB
- Logique pastorale PURE (sans I/O) dans des fonctions testables (cf. pastoral-intelligence.ts : engagementLevel 6 paliers, conversionStage Visiteur→Leader, memberAlerts).
- Agrégats : pattern nation-stats.ts (countIn avec count:'exact',head:true, scope par ids/pays).
- roles.ts : ADMIN_ROLES, groupes de capacités + isAdmin().

# OBJECTIF GLOBAL V4
Centre de Commandement Apostolique Digital : piloter Membres/Antennes/Discipulat/Finances/Marketplace/Formations/Prières/Événements depuis UNE interface, à l'échelle 100 000 membres, multi-pays/multi-antennes/multi-devises.
`;

const MODULE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['module', 'reuse', 'architecture', 'sql', 'apis', 'keyCode', 'security', 'scalability', 'uxui', 'pastoralCases', 'gaps'],
  properties: {
    module: { type: 'string' },
    reuse: { type: 'array', items: { type: 'string' }, description: 'Atouts Citadelle existants réutilisés (tables, libs, APIs)' },
    architecture: { type: 'string', description: 'Architecture en markdown (composants, flux de données, intégration au Centre de Commandement)' },
    sql: { type: 'string', description: 'Migration SQL complète idempotente & additive prête à coller (uniquement le NOUVEAU nécessaire, sans recréer l existant)' },
    apis: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['method', 'path', 'purpose'], properties: { method: { type: 'string' }, path: { type: 'string' }, purpose: { type: 'string' } } } },
    keyCode: { type: 'string', description: 'Code TypeScript représentatif drop-in : un route.ts OU un helper lib, suivant les conventions exactes' },
    security: { type: 'string', description: 'RLS, RBAC (portée antenne/nation côté serveur), rate-limit, données sensibles, logs' },
    scalability: { type: 'string', description: 'Tenue à 100 000 membres : index, pagination, agrégats RPC, cache, Realtime' },
    uxui: { type: 'string', description: 'Écrans admin + membre, composants, intégration au cockpit unique' },
    pastoralCases: { type: 'array', items: { type: 'string' }, description: 'Cas d usage pastoraux concrets' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'Ce qui manque encore dans Citadelle pour ce module' },
  },
};

const MODULES = [
  { key: 'multi-antennes', titre: 'Multi-Antennes', brief: `Pilotage multi-antennes (Abidjan/Canada/Europe + futures). La table antennes existe DÉJÀ avec hiérarchie parent_id et profiles.antenne_id. Lacune principale : RBAC SCOPÉ PAR ANTENNE côté serveur (un responsable d'antenne ne voit que SON antenne), stats par antenne (réutiliser pattern nation-stats), affectation responsable↔antenne (table d'affectation type nation_responsables mais par antenne_id), bascule de contexte d'antenne dans le cockpit, consolidation des dons/événements/membres par antenne et par devise locale.` },
  { key: 'marketplace', titre: 'Marketplace', brief: `marketplace_products + product_purchases + webhook Chariow existent DÉJÀ. Lacune : catégories/collections, gestion de stock physique, abonnements récurrents, revenus par antenne/devise, tableau de bord ventes dans le cockpit, droits d'accès post-achat robustes, avis/notes, mise en avant. Étendre sans casser l'existant (Chariow, table dons, access_token).` },
  { key: 'application-mobile', titre: 'Application Mobile', brief: `RIEN n'existe côté mobile. Concevoir une stratégie : PWA d'abord (réutilise le Next.js existant) + couche API mobile dédiée (auth par token/JWT Supabase, endpoints versionnés /api/mobile/v1/*), push notifications (réutiliser app_notifications + Realtime), offline/cache, deep links. Tables : device tokens (push), sessions mobiles, préférences. Penser app native future (Expo/React Native) consommant la même API.` },
  { key: 'centre-intercession', titre: "Centre d'Intercession (Mahanaïm)", brief: `prayer_center (priere_demandes étendue, priere_assignations, priere_categories, temoignages, rôles intercesseur/responsable_mahanaim/coordinateur) existe DÉJÀ. Lacune : salles d'intercession (sessions live de prière), chaînes de prière 24/7 par fuseau/antenne, tours de garde (planning intercesseurs), murs de prière temps réel, statistiques d'exaucement, escalade par priorité, notifications aux intercesseurs (notify()), suivi pastoral des demandes urgentes dans le cockpit.` },
  { key: 'centre-discipulat', titre: 'Centre de Discipulat', brief: `Parcours d'intégration (tunnel), LMS formations/modules, integration stages, conversionStage (Visiteur→Leader) existent DÉJÀ. Lacune : CENTRE unifié de discipulat — parcours de croissance structurés (étapes, prérequis, mentorat 1-1 disciple↔mentor), assignation de mentors, suivi de progression spirituelle, cellules/familles (groupes) reliées au discipulat, jalons & certifications, tableau de bord discipulat dans le cockpit, intelligence pastorale appliquée (qui stagne, qui est prêt à servir).` },
  { key: 'cartographie-mondiale', titre: 'Cartographie Mondiale', brief: `/api/admin/cartographie (pays→villes→familles depuis profiles) + nation-stats + antennes existent DÉJÀ. Lacune : géolocalisation réelle (lat/lng), carte mondiale interactive, expansion territoriale (zones cibles, implantations en cours), heatmap d'engagement par région, vue antennes sur carte, indicateurs de croissance par territoire, intégration au cockpit comme vue "monde". Réutiliser pays/ville de profiles et antennes.` },
];

phase('Conception');
const designs = await parallel([
  ...MODULES.map((m) => () => agent(
    `${CONVENTIONS}\n\n# TA MISSION — Architecte du module : ${m.titre}\n${m.brief}\n\nProduis une conception COMPLÈTE et CONSTRUCTIBLE pour ce module dans le cadre du Centre de Commandement Apostolique, à l'échelle 100 000 membres. Réutilise IMPÉRATIVEMENT l'existant Citadelle (ne recrée jamais une table qui existe — étends-la). Le SQL doit être une migration idempotente prête à coller. Le keyCode doit suivre EXACTEMENT les conventions API/lib ci-dessus (drop-in). Couvre : architecture, SQL, APIs, sécurité, scalabilité, UX/UI, cas pastoraux, lacunes.`,
    { label: `design:${m.key}`, phase: 'Conception', schema: MODULE_SCHEMA }
  )),
  () => agent(
    `${CONVENTIONS}\n\n# TA MISSION — Architecte du CENTRE DE COMMANDEMENT APOSTOLIQUE (la pièce unifiante)\nConçois la couche d'orchestration UNIQUE qui pilote depuis une seule interface : Membres, Antennes, Discipulat, Finances, Marketplace, Formations, Prières, Événements. Ce n'est PAS un 7e silo mais le cockpit qui agrège tous les autres.\nDois inclure :\n- Un modèle d'agrégation transverse (KPIs temps réel par antenne/nation/global) réutilisant nation-stats, pastoral-intelligence, analytics, dons, app_notifications.\n- Une vue "command center" : sélecteur de contexte (global / antenne / nation), tuiles KPI, alertes pastorales consolidées, flux d'événements, actions rapides.\n- Une RBAC unifiée : super_admin (tout), nation_pastor (sa nation), responsable d'antenne (son antenne), responsables de centres (intercession/discipulat). Portée imposée CÔTÉ SERVEUR.\n- Une API d'agrégation /api/admin/command-center (et la lib pure de calcul des KPIs).\n- Scalabilité 100k : vues matérialisées / RPC d'agrégation, cache, pagination, éviter les N+1.\nProduis le SQL (vues/RPC d'agrégation + table de config cockpit si utile), le keyCode (lib d'agrégation pure + route.ts), l'UX du cockpit, la sécurité, les cas pastoraux.`,
    { label: 'design:command-center', phase: 'Conception', schema: MODULE_SCHEMA }
  ),
]);

const valid = designs.filter(Boolean);
log(`${valid.length}/${MODULES.length + 1} conceptions produites`);

phase('Synthèse');
const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['synthesis', 'unifiedSql', 'libCommandCenter', 'apiCommandCenter', 'buildPlan', 'roadmap'],
  properties: {
    synthesis: { type: 'string', description: 'Document de synthèse consolidé UNIQUE en markdown : vision Centre de Commandement, architecture globale, les 6 modules + cockpit, sécurité, scalabilité 100k, UX, cas pastoraux. Complet et structuré.' },
    unifiedSql: { type: 'string', description: 'UNE migration SQL consolidée idempotente & additive (timestamp > 20260602270000) regroupant les NOUVELLES tables/colonnes/vues/RPC de tous les modules, dédupliquée, ordonnée, prête à coller dans supabase/migrations/.' },
    libCommandCenter: { type: 'string', description: 'Fichier lib TypeScript complet (src/lib/command-center.ts) : logique d agrégation des KPIs transverses, pure autant que possible, suivant les conventions (server-only si I/O). Drop-in.' },
    apiCommandCenter: { type: 'string', description: 'Fichier route.ts complet (src/app/api/admin/command-center/route.ts) : agrégation gardée isAdminRequest, scope antenne/nation, conventions exactes. Drop-in.' },
    buildPlan: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['path', 'purpose'], properties: { path: { type: 'string' }, purpose: { type: 'string' } } }, description: 'Fichiers à créer/étendre, ordonnés' },
    roadmap: { type: 'array', items: { type: 'string' }, description: 'Paliers de livraison V4 ordonnés' },
  },
};

const synthesis = await agent(
  `${CONVENTIONS}\n\n# TA MISSION — Synthèse consolidée V4 (Centre de Commandement Apostolique)\nVoici les ${valid.length} conceptions produites par les architectes (6 modules + cockpit). Consolide-les en UN livrable unique, cohérent, sans doublons, prêt à construire.\n\nCONCEPTIONS (JSON):\n${JSON.stringify(valid).slice(0, 220000)}\n\nProduis :\n1) synthesis : le document de synthèse unique (markdown) — la référence V4.\n2) unifiedSql : UNE migration consolidée idempotente (réconcilie les SQL des modules, supprime les doublons, ordonne les dépendances, ne recrée jamais l existant). Timestamp 20260603100000.\n3) libCommandCenter : src/lib/command-center.ts complet (agrégation KPIs transverses).\n4) apiCommandCenter : src/app/api/admin/command-center/route.ts complet.\n5) buildPlan + roadmap.\nRespecte EXACTEMENT les conventions Citadelle. Tout doit être réellement collable.`,
  { label: 'synthese', phase: 'Synthèse', schema: SYNTH_SCHEMA }
);

return { modules: valid, synthesis };
