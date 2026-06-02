# PROJECT_MASTER_STATE — Citadelle (V1 → V5)

> **SAUVEGARDE (2026-06-02 soir)** : tout le source V1→V5+P4 + 55 migrations + docs
> est **commité et poussé sur GitHub** (`origin` = `github.com/2026Chapelle/chapelle-digitale`,
> commit `50a05ad` sur `main`). **Source de vérité = le dépôt Git**, PAS le ZIP.
> Le `deploy-citadelle.zip` (20,1 Mo) a été **régénéré** depuis le build frais (V1→V5+P4,
> BUILD_ID `EvLb8KsGA4zN5OWUSf6KS`) : c'est un build *standalone compilé* (sans source ni
> migrations — par nature). Pour reconstruire : `git clone` + `npm ci` + `npm run build`.
> `.env.local` (secrets) reste hors Git/ZIP ; `chapelle-digitale/` & `deploy-citadelle/`
> sont désormais gitignorés.
>
> **Document de reprise unique.** Un nouvel agent doit pouvoir reprendre le projet
> à partir de ce seul fichier. Mis à jour à la pause du 2026-06-02.
> Compléments : `docs/ARCHITECTURE_COMMANDEMENT_APOSTOLIQUE.md`,
> `docs/V4_SYNTHESE_*`, `docs/V5_SYNTHESE_*`, `FINAL_PROJECT_AUDIT.md`,
> `CONTENT_ROADMAP.md`, et la mémoire `~/.claude/.../memory/`.

## 0. Identité du projet

- **Nom** : Citadelle — plateforme digitale de la Chapelle du Royaume (CIER).
- **Stack** : Next.js 14 (App Router, standalone) · TypeScript · Supabase (Postgres + Auth + Storage + Realtime) · Tailwind · Framer Motion. UI **française**.
- **Paiement** : **Chariow** (PAS Stripe) — store `zrqcqzjz.mychariow.shop`, webhook → table `dons`.
- **Déploiement** : PlanetHoster N0C / Passenger, build portable standalone → `/home/frprszbd/citadelle`, lancé par `app.js` (qui charge lui-même `.env`). Images `unoptimized` (pas de `sharp` natif).
- **Domaine canonique** : `https://citadelle.chapelleduroyaume.org`. Email officiel `info@chapelleduroyaume.org`. Siège : Abidjan (Cocody Angré). Devise par défaut **FCFA**.
- **Principe permanent** : **zéro donnée fictive** (états vides ou données réelles) · type-check + build verts · ne jamais casser Auth/Supabase/Chariow/Live · migrations idempotentes & additives.
- **Mode démo** : si Supabase non configuré (`IS_DEMO_MODE`), repli statique/états vides — le site tourne sans backend.

---

## 1. États par version

> Découpage rétroactif par grappes de migrations + jalons mémoire. V1–V5 = **fondation officielle**.

### V1 — Ouverture (jusqu'au 2026-06-01) — ✅ TERMINÉ & DÉPLOYÉ
Plateforme publique + espace membre + back-office, prête à l'ouverture.
- **Public** : accueil, formations, événements, articles, enseignements, podcast, live, témoignages, dons/offrandes/partenariat, contact, communauté, légal. Tout en zéro fictif (états vides).
- **Auth réelle** : login/register/OAuth (masqué tant que providers off), `/forgot-password`, confirmation email (template premium, domaine canonique via `site-url.ts`).
- **Espace membre** : dashboard, formations (+progression), dons (FCFA), ressources, prières, profil/paramètres (100% client, RLS `auth.uid()=id`), **Bible** (proxy LSG `bolls.life`, progression localStorage).
- **CMS réel** (`cms_*`) : pages, médias, lives, podcasts, enseignements, événements, témoignages, articles, blocs d'accueil — via `CmsManager` + `/api/admin/cms/[resource]`. Upload réel (bucket `media`).
- **Giving Chariow** (`giving_*`) : catalogue + widget + log clics.
- **Back-office** : auth cookie `cier_admin` (code → `ADMIN_ACCESS_CODE`), 10+ modules.
- **Notifications cloche** (dérivée des tables publiques, localStorage lu).

### V2 — Église Digitale Complète (2026-06-02, vagues 1-6) — ✅ TERMINÉ
- **P1 Dons Chariow** : webhook idempotent (`/api/webhook/chariow`), tracking source/programme/campagne, reçu email auto, offrande en live (`LiveOffering`).
- **P2 Accueil administrable** : `cms_homepage_blocks` (ordre + visibilité), `/admin/homepage-blocks`.
- **P3 CMS public + multi-plateformes** : 8 plateformes lisent Supabase.
- **P4 International par pays** : `/admin/international` (carte, classement, croissance recharts).
- **P5 Délivrance / cure d'âme** : workflow confidentiel, **RLS stricte select-own** (`delivrance_demandes`).
- **P6 Santé spirituelle** + **P7 classification auto** (`health.ts`, 🟢🟡🟠🔴).
- **P8 Cartographie du Royaume** : pays→villes→familles (`/admin/cartographie`).
- **Transversal** : `email.ts` (Resend) + `email-templates.ts`, certificats PDF+QR, Q&A formations, tunnel d'intégration (étapes 6-8), gouvernance pastorale, ShareButtons, Bible robuste multi-sources.

### V3 — Intelligence & Échelle (2026-06-02, suite) — ✅ TERMINÉ
- **Gouvernement pastoral** : `pastoral-intelligence.ts` (6 paliers d'engagement, conversion Visiteur→Leader, alertes auto) + `pastoral-prediction.ts` (churn/abandon/absence, file de suivi) + cockpit `/admin/gouvernement`.
- **Analytics interne** : `analytics_sessions/events`, tracker heartbeat 30s, `/admin/analytics` temps réel.
- **RBAC par nation** : `nation_responsables`, `sensitive_access_logs`, rôles `super_admin/nation_pastor/platform_admin`, `/admin/nation` + `/admin/nation-dashboard`.
- **Marketplace** : `marketplace_products` + `product_purchases` + accès post-achat `/api/acces/[token]`.
- **Notifications temps réel** : `app_notifications` + Supabase Realtime + état lu serveur, `notify()`.
- **Multi-antennes (base)** : table `antennes` (hiérarchie, devise), `profiles/dons/evenements.antenne_id`.
- **Scale** : `20260602250000_scale_indexes` (index composites), `admin-auth.ts` centralisé.

### V4 — Centre de Commandement Apostolique (cockpit transverse) — ✅ FONDATION POSÉE
- Migration `20260603100000_v4_command_center.sql` : `antenne_responsables`, marketplace (catégories/avis/abonnements/RPC), mobile (devices/sessions/prefs/push), intercession (salles/chaînes/créneaux/garde/mur/escalades), discipulat (chemins/étapes/relations/jalons), cartographie (`geo_localites`/`expansion_zones`), cockpit (`command_center_kpis`, MV).
- `src/lib/command-center.ts` (pur), `/api/admin/command-center`, page `/admin/command-center` (tuiles KPI, sélecteur contexte, deep-links).

### V5 — Centre de Commandement Apostolique Global — ✅ FONDATION POSÉE
- Migration `20260603200000_v5_global_command.sql` : **32 tables, 16 RPC** — gouvernement par antenne, vision mondiale, santé spirituelle mondiale, croissance, finances multi-devises (`fx_rates`), IA prédictive, alertes prophétiques, centre de crise, centre missionnaire.
- `src/lib/global-intelligence.ts` (pur), `/api/admin/global-command` (orchestrateur défensif des 9 capacités), page `/admin/global-command` (console mondiale).

---

## 2. Modules — terminés vs partiels

### ✅ Terminés (fonctionnels, branchés réel)
Auth · Espace membre · CMS contenu · Giving Chariow + webhook + reçu · Formations/LMS (lecture, progression, Q&A, certificats) · Prières + mur public · Délivrance/cure d'âme (RLS stricte) · Événements + inscriptions · Newsletter (Resend) + contact · Analytics interne · Gouvernement pastoral + intelligence prédictive · International/Cartographie · Santé spirituelle + classification · Notifications (dérivées + Realtime).

### 🟡 Partiels / fondation posée — à REMPLIR (phase contenu)
- **LMS / Académie des Élus** : moteur OK ; **contenu de cours à produire** (objectif 120 modules) ; quiz/évaluations à compléter.
- **Mahanaïm (intercession)** : tables V4 (salles/chaînes/garde/mur/escalades) **créées mais non remplies ni câblées UI**.
- **Discipulat** : tables V4 (chemins/étapes/relations/mentorat/jalons) créées, **UI + contenu à faire**.
- **Marketplace / Bibliothèque / Masterclass** : moteur + catégories/avis/abonnements en base V4 ; **catalogue à produire**, bucket privé `produits` à créer, abonnements récurrents (cron) à brancher.
- **Application mobile / PWA** : tables `mobile_*` + dispatch push en base V4 ; **service worker, clés VAPID, endpoints `/api/mobile/v1/*` à implémenter**.
- **Command Center / Global Command** : cockpits livrés ; **dépendent des migrations poussées + crons de snapshot**.
- **Playlist Podcast perso** (backlog V2) : conçu, non implémenté.
- **Bible** : progression en localStorage → à migrer Supabase (multi-appareils).

---

## 3. Migrations (53 fichiers)

### Poussées en prod lors du wiring initial (à confirmer côté Supabase)
`001_initial_schema`, `002_rls_complete_and_seed`, `20260529*` (schéma `chapelle` complet + modules + RBAC + triggers + index + RLS + seed + `admin_dashboard` RPC), `20260530100000_cms_core`, `20260530100100_giving_chariow`.

### ⚠️ Documentées « à pousser » (cumulées, additives & idempotentes)
`20260530100300_storage_and_articles` · `…100400_roles_formateur_integration` · `…100500_handle_new_user_metadata` · `…100600_avatars_storage_rls` · `…100700_contact_newsletter` · `…100800_groupes_events_prieres` · `20260531100000_event_reg_user_read` · `…100200_lms_formation_modules` · `…100300_prayer_center` · `…100400_formations_public_read` · `…100500_fix_rls_recursion` · `20260601100000_event_whatsapp` · `…100100_newsletter_campaigns` · `20260602110000_integration_stages_6_8` · `…120000_qa_formations` · `…130000_dons_chariow_tracking` · `…140000_delivrance` · `…150000_pre_ouverture_fixes` · `…160000_event_lien_live` · `…170000_activity_logs` · `…180000_nation_rbac` · `…190000_dons_email_sent` · `…200000_dons_meta_json` · `…210000_dons_devise_fcfa` · `…220000_marketplace` · `…230000_analytics_interne` · `…240000_marketplace_lien_achat` · `…250000_scale_indexes` · `…260000_realtime_notifications` · `…270000_antennes`.

### 🆕 NON POUSSÉES — fondation V4/V5 (ce palier)
- `20260603100000_v4_command_center.sql` (cockpit + 6 modules étendus)
- `20260603200000_v5_global_command.sql` (32 tables, 16 RPC — couche mondiale)
- `20260603300000_pastoral_member_signals.sql` (P4 — RPC d'agrégation set-based des signaux membres ; **adoptée par la route gouvernement avec repli JS strict** → la route marche identiquement avant/après push)

> **À la reprise** : `supabase db push` (ordre chronologique respecté), puis `npm run db:generate` (régénère `src/types/supabase.ts`), créer bucket privé `produits`, brancher les crons de refresh (snapshots/MV). ⚠️ Mémoire : **état du schéma prod incertain** — pas de DROP aveugle, vérifier avant.

---

## 4. Inventaire technique

- **APIs (63 route.ts)** : `/api/admin/*` (cms, giving, lms, data, marketplace, gouvernement, gouvernance, analytics, international, nation, cartographie, sante, delivrance, command-center, global-command, notifications, newsletter, upload, health, transactions, …) ; `/api/member/*` (formations[+modules/questions/progress/enroll], dons, ressources, delivrance, integration, nation, notifications, profile, achats, certificats, formateur) ; public (`/api/dons`, `/api/prieres`, `/api/priere/pray`, `/api/bible`, `/api/analytics/track`, `/api/tunnel/lead`, `/api/giving/*`, `/api/webhook/chariow`, `/api/acces/[token]`, `/api/certificat`, `/api/recu`, `/api/live`).
- **Pages** : 47 admin · 21 membre · 32 public.
- **Dashboards** : `/admin/dashboard` (chapelle RPC), `/admin/gouvernement` (cockpit pastoral), `/admin/gouvernance`, `/admin/analytics`, `/admin/international`, `/admin/nation-dashboard`, `/admin/sante-spirituelle`, `/admin/cartographie`, **`/admin/command-center` (V4)**, **`/admin/global-command` (V5)**.
- **Libs clés** : `supabase(.ts/-server/-browser)`, `admin-auth`, `member-auth`, `roles`, `rate-limit`, `cms`, `giving`, `email(+templates)`, `pastoral-intelligence`, `pastoral-prediction`, `nation-stats`, `health`, `analytics-server`, `bible`, `site-url`, `notify`, **`command-center`**, **`global-intelligence`**.

---

## 5. Dépendances critiques

- `@supabase/supabase-js` + `@supabase/auth-helpers-nextjs` (auth SSR, service role).
- `resend` + `nodemailer` (emails transactionnels/newsletter).
- `recharts` (graphes dashboards, code-split), `framer-motion`, `lucide-react`.
- `three` / `@react-three/*` / `gsap` / `lottie-react` / `tsparticles` (visuels — à code-splitter pour le mobile).
- `zod`, `react-hook-form` (formulaires), `date-fns`, `jsonwebtoken`, `bcryptjs`.
- **Chariow** : intégration par lien + webhook (pas de SDK).
- Externes : `bolls.life`/`getbible.net` (Bible), `qrserver` (QR certificats), FluentCRM (fallback leads).

## 6. Variables d'environnement requises

**Indispensables backend** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_ACCESS_CODE`, `ADMIN_SESSION_TOKEN`.
**Email** : `RESEND_API_KEY`, `EMAIL_FROM`, `NEWSLETTER_FROM`, `ADMIN_NOTIFY_EMAIL`.
**Paiement** : `CHARIOW_WEBHOOK_SECRET`, `CHARIOW_WEBHOOK_HMAC_SECRET`.
**Site / SEO** : `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_SITE_VERIFICATION`, `NODE_ENV`.
**Optionnels** : `FLUENTCRM_*`, `NEXT_PUBLIC_*` (réseaux/podcast/analytics endpoints), `NEXT_PUBLIC_SHOW_DEMO_BANNER`.

> Standalone : `app.js` charge `.env`/`.env.local`/`.env.production` au runtime (Passenger n'injecte pas les vars non-`NEXT_PUBLIC`). Déposer `.env` dans `/home/frprszbd/citadelle/`. Diag : `GET /api/admin/health` (cookie admin).

---

## 7. Backlog priorisé (à la reprise)

**P0 — Activer la fondation** : pousser migrations V4+V5, `db:generate`, bucket `produits`, crons de refresh, vérifier cockpits en réel.
**P1 — CONTENU (phase officielle)** : Académie des Élus (120 modules), Mahanaïm, Bibliothèque numérique, Masterclass premium → voir `CONTENT_ROADMAP.md`.
**P2 — Discipulat** : câbler UI mentorat/parcours sur les tables V4, appliquer l'intelligence pastorale (qui stagne / prêt à servir).
**P3 — Mobile/PWA** : service worker, VAPID, `/api/mobile/v1/*`, push (dispatch déjà en base).
**P4 — Optimisation** _(en cours — 2026-06-02/03)_ :
  - ✅ **Tests des libs pures** : Vitest installé (`npm test` / `test:watch`, `vitest.config.ts`, alias `@/`), **106 tests** verts verrouillant `pastoral-intelligence`, `pastoral-prediction`, `command-center`, `global-intelligence`, `health`, `cache`, `utils`, `tunnel`. Tests sous `src/lib/__tests__/`.
  - ✅ **Cache court par contexte** : `src/lib/cache.ts` (`cached(key,ttl,fn)` anti-stampede, ne cache jamais une erreur ; `invalidate`/`invalidatePrefix`). Câblé sur 4 endpoints lourds : `gouvernement` (TTL 20s/pays), `analytics` (15s), `command-center` (20s/contexte, audit log préservé hors cache), `global-command` (30s, audit log préservé).
  - ✅ **RPC d'agrégation** : `pastoral_member_signals(p_pays)` (migration `…300000`) remplace 5 lectures de tables entières + boucles JS par 1 aller-retour set-based dans la route gouvernement. **Repli JS strict** si RPC absente → parité exacte. ⚠️ À POUSSER pour activer le gain.
  - ℹ️ **Code-split visuels** : sans objet — `three/gsap/lottie/tsparticles` sont dans package.json mais **importés nulle part** dans `src/` (hors bundle). `recharts`/`framer-motion` déjà optimisés (`optimizePackageImports`).
  - ⏳ Restant : a11y, RPC d'agrégation pour `analytics` (idem pattern), micro-cache des `headCount` modules.
**P5 — Finitions** : Bible→Supabase, playlist podcast, abonnements récurrents (cron), remboursement/révocation achats, quotas billets.

> **Règle** : ne plus créer de couches architecturales majeures. **Remplir et optimiser l'existant.**
