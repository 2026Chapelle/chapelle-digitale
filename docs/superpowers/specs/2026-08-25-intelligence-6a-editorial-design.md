# CITADELLE INTELLIGENCE 6A - Editorial Intelligence

Status: design spec only.

## 1. Contexte

6A est le copilote editorial de Citadelle. Il ne remplace pas un calendrier.
Il aide a repondre a quatre questions simples:

1. Que devons-nous publier maintenant ?
2. Que pouvons-nous reutiliser plutot que recreer ?
3. Ou et quand devons-nous le diffuser ?
4. Pourquoi cette recommandation est-elle prioritaire ?

Le produit vit dans l Intelligence Hub existant. Il ne cree ni seconde app, ni
seconde auth, ni seconde base.

## 2. Probleme

Aujourd hui, le Hub sait deja lire des signaux de performance, de goals, de SEO,
de podcasts, de lives et de campagnes. En revanche, il ne sait pas encore:

- transformer ces signaux en recommandations editoriales actionnables;
- garder la memoire des decisions humaines;
- preparer une semaine de travail sans surestimer la capacite;
- distinguer clairement creation, reutilisation et promotion;
- respecter une vie humaine des recommandations sans autopublication.

## 3. Objectifs

- Proposer des recommandations simples et lisibles.
- Favoriser la reutilisation avant la recreation.
- Limiter la surface UI a 3 vues: Aujourd hui, Calendrier, Opportunites.
- Permettre le bouton "Preparer ma semaine".
- Preserver les decisions humaines et les editions manuelles.
- Rester compatible avec les patterns existants du repo.
- Supporter une actualisation quotidienne + une actualisation manuelle idempotente.

## 4. Non-objectifs

6A ne doit pas:

- publier automatiquement;
- autoposter Facebook, Instagram, WhatsApp ou YouTube;
- utiliser des agents autonomes pour publier sans humain;
- faire de la prediction ML opaque;
- faire du scraping externe;
- dependre activement de Google Trends en v1;
- modifier automatiquement les formations ou parcours;
- creer un second dashboard;
- creer une seconde auth;
- creer une seconde base;
- introduire un workflow d approbation lourd.

## 5. Principes de verite

- Une valeur absente n est jamais interpretee comme zero.
- Les signaux sources gardent leur propre disponibilite:
  - `REAL`
  - `PARTIAL`
  - `UNAVAILABLE`
- Les recommandations sont des objets de synthese, pas des faits bruts.
- Une recommandation peut porter le marquage logique `EDITORIAL_RECOMMENDATION`.
- Les sources, la disponibilite, la justification, la date de generation et la
  derniere mise a jour doivent rester visibles.
- Les decisions humaines ne sont jamais ecrasees par une regeneration.
- Une recommandation rejetee ne doit pas revenir sans nouveau signal significatif.

## 6. Architecture actuelle reutilisee

Le repo possede deja les briques utiles suivantes:

- `src/app/(admin)/admin/intelligence/page.tsx` pour le cockpit Hub.
- `src/app/(admin)/admin/intelligence/performance/page.tsx` et `.../goals/page.tsx`
  pour les surfaces admin adjacentes.
- `src/lib/intelligence/decision/*` pour les contrats de verite, disponibilite,
  evidence et priorisation deterministe.
- `src/lib/intelligence/performance/*` pour les signaux, les alertes et les
  cartes de commande.
- `src/lib/intelligence/goals/*` et `supabase/migrations/20260824120000_intelligence_goals.sql`
  pour le modele objectif + `organization_id` + archivage.
- `src/lib/intelligence/seo/*` pour les opportunites SEO deterministes.
- `src/lib/intelligence/types/content.ts` pour le graphe de contenu transverse.
- `src/lib/intelligence/connectors/*` pour le pattern futur-ready des providers.
- `src/lib/admin-auth.ts`, `src/lib/permissions.ts`, `src/lib/roles.ts` et les
  helpers ERP pour les gardes admin / unit scope.
- `supabase/migrations/20260818120000_podcast_editorial_spine.sql` pour le spine
  editorial podcast.
- `supabase/migrations/20260819170000_live_programs_foundation.sql` pour les
  programmes live recurrent.
- `supabase/migrations/20260820120000_hub3_campaign_utm.sql` pour les signaux de
  campagne first-touch.

Decision clef: 6A doit reutiliser ces conventions, pas en creer une nouvelle.

## 7. Architecture 6A proposee

Route UI principale:

- `/admin/intelligence/editorial`

API admin:

- `/api/admin/intelligence/editorial`
- `/api/admin/intelligence/editorial/refresh`
- `/api/admin/intelligence/editorial/recommendations/:id`
- `/api/admin/intelligence/editorial/settings`

Modules metier conseilles:

- `signals`
- `engine`
- `prioritization`
- `persistence/repository`
- `refresh orchestration`
- `capacity`
- `dto`
- `authorization`

Le calendrier est un read model sur les recommandations, pas une application
separee.

## 8. Domain model

### Entites conceptuelles

- `EditorialSignal`
- `EditorialRecommendation`
- `EditorialRecommendationEvent`
- `EditorialSettings`
- `EditorialCapacity`
- `EditorialCalendarView` (read model, pas table)

### Familles de recommandations

- `CREATE`
- `REPURPOSE`
- `PROMOTE`

### Types de contenu

- `article`
- `podcast`
- `live`
- `youtube`
- `facebook`
- `instagram`
- `whatsapp`

### Etats de vie humains

Recommandation:

- `PROPOSED`
- `ACCEPTED`
- `SCHEDULED`
- `COMPLETED`
- `REJECTED`
- `ARCHIVED`

## 9. Data model final propose

Decision finale: **3 tables physiques** + 1 read model calendrier.

### A. `editorial_recommendations`

Table principale. Une ligne = une recommandation editoriale vivante ou archivee.
Elle sert aussi de source pour la vue Calendrier.

Champs minimum:

- `id`
- `organization_id`
- `family` (`CREATE|REPURPOSE|PROMOTE`)
- `content_kind`
- `channel`
- `status`
- `priority_band` (`FORTE|NORMALE|A_SURVEILLER`)
- `planned_for` nullable
- `planned_timezone`
- `batch_id` nullable
- `dedupe_key`
- `source_content_type` nullable
- `source_content_id` nullable
- `source_snapshot_jsonb`
- `signals_jsonb`
- `why_jsonb`
- `human_title_override` nullable
- `human_notes` nullable
- `human_edit_jsonb`
- `generated_at`
- `last_refreshed_at`
- `last_human_action_at`
- `accepted_at`
- `scheduled_at`
- `completed_at`
- `rejected_at`
- `archived_at`
- `performance_snapshot_jsonb`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

Contraintes:

- `organization_id` reference `organizations(id)`.
- `status` strict enum.
- `family` strict enum.
- `priority_band` strict enum.
- index unique sur `organization_id + dedupe_key`.
- index sur `organization_id + status + planned_for`.
- aucun DELETE physique pour la vie normale.

### B. `editorial_recommendation_events`

Journal append-only de memoire.

Champs minimum:

- `id`
- `organization_id`
- `recommendation_id`
- `event_type`
- `payload_jsonb`
- `created_by`
- `created_at`

Evenements cibles:

- `PROPOSED`
- `ACCEPTED`
- `MODIFIED`
- `SCHEDULED`
- `COMPLETED`
- `REJECTED`
- `ARCHIVED`
- `PERFORMANCE_CAPTURED`
- `REFRESHED`

### C. `editorial_settings`

Une ligne par organisation.

Champs minimum:

- `organization_id`
- `timezone`
- `refresh_mode`
- `refresh_time_local`
- `weekly_capacity_jsonb`
- `channel_capacity_jsonb`
- `content_kind_capacity_jsonb`
- `manual_refresh_enabled`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

### Read model Calendrier

Pas de table `editorial_calendar_items` en v1.
La vue Calendrier lit `editorial_recommendations` filtrees sur:

- `status in ('ACCEPTED','SCHEDULED','COMPLETED')`
- `planned_for` dans la fenetre de 30 jours

Si un futur besoin impose de scinder plusieurs executions concretes sous une
meme recommandation, on ajoutera alors une table fille. Ce n est pas requis en
v1.

## 10. Signal model

Chaque signal porte:

- `origin`:
  - `FIRST_PARTY`
  - `CONNECTED`
  - `CONTENT`
  - `FUTURE_EXTERNAL`
- `availability`:
  - `REAL`
  - `PARTIAL`
  - `UNAVAILABLE`
- `source`
- `timestamp`
- `evidence`
- `scope`
- `content_refs` quand pertinents

Regle:

- `null` ou absence ne devient jamais zero.
- un provider externe futur ne peut pas produire seul une recommandation.

### Future-ready provider contract

Nom recommande:

- `EditorialSignalProvider`

Forme:

- `id`
- `available()`
- `listSignals(window, organizationContext)`

Il doit suivre le meme esprit que `IntelligenceConnector`:

- contrat simple;
- read-only;
- pas de secret dans le browser;
- aucun provider externe actif en 6A.

## 11. Recommendation model

Chaque recommandation doit conserver:

- la famille: `CREATE|REPURPOSE|PROMOTE`;
- le contenu source si reutilisation ou promotion;
- le canal cible;
- la fenetre de publication;
- la bande de priorite;
- la justification lisible;
- les signaux sources;
- l empreinte de deduplication;
- la date de generation;
- la derniere actualisation;
- l historique humain via events.

La recommendation n est jamais un score magique. Elle doit rester explicable.

## 12. Prioritisation

La priorisation interne peut combiner:

- Mission / coherence spirituelle
- Audience
- Performance
- Opportunite
- Effort
- Timing

Mais l interface utilisateur doit rester:

- `PRIORITE FORTE`
- `PRIORITE NORMALE`
- `A SURVEILLER`

Regle de tri:

- pas de score opaque expose;
- tri interne deterministe autorise;
- le bouton "Pourquoi ?" ouvre les preuves.

## 13. Editorial capacity

La capacite editoriale doit rester simple.

Modele recommande:

- capacite hebdomadaire totale;
- capacite par famille;
- capacite par canal;
- capacite par type de contenu;
- fenetre prioritaire de 7 jours.

Exemple canonique:

- 1 live / enseignement
- 1 podcast
- 1 article
- 2 videos courtes
- 3 publications sociales
- 2 messages WhatsApp

Le moteur peut dire:

- "8 opportunites detectees, 4 recommandees cette semaine selon la capacite."

La capacite limite la proposition, pas la verite.

## 14. Lifecycle

Workflow canonique d une recommandation:

1. `PROPOSED`
2. `ACCEPTED`
3. `SCHEDULED`
4. `COMPLETED`

Sorties:

- `REJECTED`
- `ARCHIVED`

Regles:

- aucune recommandation auto ne devient decision editoriale sans humain;
- aucune publication automatique;
- aucun passage `PROPOSED -> COMPLETED` direct;
- `COMPLETED` n est possible qu apres confirmation humaine;
- `ARCHIVED` ne supprime pas la ligne.

## 15. Memory / feedback loop

Memoire a conserver:

- recommandations generees;
- acceptations;
- rejets;
- modifications humaines;
- planifications;
- completions;
- archivages;
- performances observees apres publication.

Regles:

- une recommandation `ACCEPTED` ou `SCHEDULED` ne doit pas etre ecrasee;
- les champs humains sont consideres comme protegees;
- les rechutes ou rejets ne doivent pas etre reproposes sans nouveau signal;
- la performance post-publication doit alimenter les futurs choix;
- la boucle doit rester explicable, sans ML opaque.

## 16. Refresh orchestration

Deux declencheurs:

1. actualisation quotidienne automatique;
2. bouton "Actualiser maintenant".

Decision de mise en oeuvre:

- utiliser un endpoint HTTP idempotent `POST /api/admin/intelligence/editorial/refresh`;
- l orchestration horaire doit venir du host / cron existant, pas d un timer
  in-app;
- la route doit etre compatible avec l hebergement actuel et le pattern deja
  utilise par les snapshots admin;
- si le host n a pas de scheduler natif, utiliser la solution cron externe la
  plus simple qui appelle cette route.

Idempotence:

- verrou transactionnel ou advisory lock;
- dedupe par signature des signaux + org + fenetre + contenu source;
- double appel dans la meme fenetre ne cree pas de doublon.

## 17. External Trends future-ready contract

6A v1 ne doit pas consommer de tendances externes actives.

Il doit toutefois prevoir une interface extensible:

- `ExternalTrendProvider`
  - ou `EditorialSignalProvider`

Providers futurs possibles:

- Google Trends
- tendances web
- tendances YouTube
- tendances sociales
- autres providers

Regle absolue:

- une tendance externe ne peut jamais imposer seule une recommandation;
- elle doit etre croisee avec:
  - mission / coherence;
  - audience;
  - historique;
  - contenu existant;
  - timing;
  - donnees Citadelle.

## 18. Permissions

Lecture:

- accessible aux admins deja autorises a l Intelligence Hub via les conventions
  existantes.

Ecriture editoriale:

- permission dediee recommandee: `can_manage_editorial_intelligence`
- cette permission doit etre compatible avec les conventions du repo:
  - `can_*`
  - `world_admin`
  - `world_super_admin`

Decision:

- `world_admin` et `world_super_admin` doivent pouvoir l avoir;
- les roles pastoraux ne doivent pas l heriter automatiquement;
- un futur responsable communication/editorial doit pouvoir l obtenir sans
  obtenir tous les pouvoirs admin.

Routes serveur:

- garder le guard de portee existant style `requireGuardedAdminUnit`;
- ajouter la verification de permission pour les ecritures.

## 19. API boundaries

Frontieres a garder petites et testables:

- `signals`: collecte et normalisation
- `engine`: proposition CREATE / REPURPOSE / PROMOTE
- `prioritization`: bande de priorite + tri deterministe
- `persistence/repository`: lecture / ecriture
- `calendar`: read model 30 jours
- `capacity`: estimation et bornage
- `refresh orchestration`: idempotence + lock
- `dto`: admin/public shapes
- `authorization`: scope org + permission

Contrats API proposes:

- `GET /api/admin/intelligence/editorial`
  - retourne Today + Calendar + Opportunities + settings + capacity + freshness
- `POST /api/admin/intelligence/editorial/refresh`
  - lance la generation ou actualisation
- `PATCH /api/admin/intelligence/editorial/recommendations/:id`
  - accepte, modifie, planifie, rejette, complete, archive
- `GET /api/admin/intelligence/editorial/settings`
- `PATCH /api/admin/intelligence/editorial/settings`

## 20. UI / UX - Aujourd hui / Calendrier / Opportunites

### Aujourd hui

Cockpit operationnel.

Doit afficher:

- 3 a 5 priorites maximum;
- recommandations de la semaine;
- quelques opportunites a surveiller;
- bouton "Pourquoi ?";
- actions:
  - Accepter
  - Modifier
  - Planifier
  - Ignorer / Rejeter
  - "Preparer ma semaine"

### Calendrier

Fenetre glissante de 30 jours.

Contient:

- les recommandations acceptees;
- les recommandations planifiees;
- les recommendations completes tant que l historique reste utile.

Cartes par type:

- Article
- Podcast
- Live / YouTube
- Facebook
- Instagram
- WhatsApp

Edition simple:

- date;
- titre / sujet;
- canal;
- statut;
- notes editoriales.

Deplacement ou replanification seulement si la UX reste simple.

### Opportunites

Bibliotheque secondaire.

Filtres simples:

- Creer
- Reutiliser
- Promouvoir
- SEO
- Sous-exploite
- A surveiller
- tendance externe future compatible

## 21. "Preparer ma semaine"

Fonction majeure de 6A.

Il analyse:

- calendrier actuel;
- capacite editoriale;
- contenus recents;
- contenus existants;
- performances;
- SEO;
- podcasts;
- lives;
- campagnes;
- opportunites sous-exploitees;
- recommandations deja presentes.

Il produit un plan a 7 jours.

Sorties:

- accepter tout;
- accepter individuellement;
- modifier;
- rejeter.

Contrainte:

- aucune publication automatique.

## 22. Error states / partial data / unavailable connectors

Regle principale:

- un connecteur absent ou indisponible ne doit pas casser le cockpit entier.

Affichages:

- `REAL` = preuve disponible;
- `PARTIAL` = preuve partielle;
- `UNAVAILABLE` = pas de source exploitable;
- les recommandations restent visibles mais mieux etiquetees.

Cas a gerer:

- Search Console partielle;
- GA4 non connecte;
- YouTube non disponible;
- Meta indisponible;
- WhatsApp indisponible;
- historique editorial vide.

Messages:

- explicites;
- non alarmistes;
- jamais de zero invente.

## 23. Idempotency / deduplication

Chaque recommandation doit avoir:

- une empreinte dedupe stable;
- une signature de signaux;
- une fenetre de temps;
- une source de contenu ou un contexte editorial.

Regles:

- un refresh ne duplique pas une recommandation deja connue;
- les recommendations rejetees ne reviennent qu avec nouveaux signaux;
- les recommandations acceptees / planifiees / completes restent stables;
- les modifications humaines ne sont jamais ecrasees par un refresh.

Technique conseillee:

- unique index sur `organization_id + dedupe_key`;
- champ `batch_id` pour regrouper les sorties d un "Preparer ma semaine";
- event log append-only pour les changements humains.

## 24. Security / privacy / aggregate-only where appropriate

Regles:

- agregats seulement quand possible;
- pas de PII brute dans les DTOs UI;
- pas de secrets dans le navigateur;
- aucun provider externe en ecriture;
- aucun autopost;
- aucune modification automatique de contenu canonique pedagogique/pastoral;
- `created_by` / `updated_by` ne doivent pas etre exposes en public si non
  necessaires;
- les signaux doivent etre suffisa mment anonymises ou agrégés.

## 25. Testing strategy

Tests attendus:

- tests purs du moteur de recommandation;
- tests de priorisation et dedupe;
- tests du repository;
- tests de route pour permissions / scope / redaction;
- tests de calendrier read model;
- tests de refresh idempotent;
- tests UI pour les 3 vues principales;
- tests SQL / migration pour contraintes, indexes et RLS.

Pattern de repo a suivre:

- Vitest co-localise;
- route tests style `src/app/api/admin/intelligence/goals/__tests__/route.test.ts`;
- no hidden I/O in unit tests.

## 26. Migration strategy

Migration unique, additive, idempotente.

Contenu:

- tables 6A;
- contraintes enum / check;
- indexes de dedupe et de vue calendrier;
- trigger `updated_at` si le repo utilise deja ce pattern;
- RLS deny-by-default;
- grants minimaux par role.

Ne pas faire:

- pas de backfill massif;
- pas de DELETE physique;
- pas de mutation distante;
- pas de migration concurrente qui reconfigure le contenu canonique.

## 27. Rollout strategy

Ordre recommande:

1. foundation
2. engine
3. workspace

Phase 6A-1:

- contrats;
- persistence;
- permissions;
- read/write API;
- aucune generation intelligente encore.

Phase 6A-2:

- signaux;
- create / repurpose / promote;
- priorisation;
- dedupe;
- refresh quotidien + manuel.

Phase 6A-3:

- UI Aujourd hui;
- UI Calendrier;
- UI Opportunites;
- bouton "Preparer ma semaine";
- workflow d edition.

## 28. Rollback strategy

Rollback simple:

- couper la route UI;
- couper le refresh automatique;
- conserver les lignes archivees;
- ne pas dropper les donnees utiles si ce n est pas necessaire.

Comme la migration est additive, le rollback doit etre operationnel sans
destruction de la memoire editoriale.

## 29. Risks / mitigations

### Risque: surproduction de recommandations

Mitigation:

- capacite stricte;
- tri simple;
- plafond 3 a 5 priorites visibles;
- reuse first.

### Risque: duplication infinie

Mitigation:

- dedupe_key unique;
- batch id;
- signature de signaux;
- refresh idempotent.

### Risque: ecrasement des decisions humaines

Mitigation:

- event log append-only;
- champs humains proteges;
- refresh qui n ecrit pas sur les statuts humains.

### Risque: score opaque

Mitigation:

- pas de score magique expose;
- only bands;
- preuve accessible via "Pourquoi ?".

### Risque: integration externe prematuree

Mitigation:

- future-only contract;
- aucun provider externe actif en 6A v1.

## 30. Explicit implementation slices recommended

### 6A-1 - Foundation

- domain contracts
- DB persistence
- permissions
- repository
- read/write API
- no recommendation generation yet

### 6A-2 - Editorial Engine

- signals
- create / repurpose / promote detection
- prioritization
- dedupe
- memory behavior
- daily / manual refresh

### 6A-3 - Editorial Workspace

- Aujourd hui
- Calendrier
- Opportunites
- "Preparer ma semaine"
- editing workflow

## Self-review checkpoints

The implementation plan for this spec must preserve:

- no auto-publication;
- no overwrite of human decisions;
- missing data never shown as zero;
- external trends remain future-only;
- no ambiguous permissions;
- no hidden second dashboard;
- scope small enough for incremental delivery.

