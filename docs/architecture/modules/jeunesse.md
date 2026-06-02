# Module — Jeunesse

> Plateforme `jeunesse` · fondée sur [le core](../01-core-schema.md).

# Module d'architecture — Plateforme « Jeunesse » (`slug: jeunesse`)

> Type `ministere`, `parent_id → cier`. Domaine : jeunes, leadership, entrepreneuriat, conférences.
> S'appuie strictement sur le core (`members`, `platforms`, `memberships`, `events`, `donations`, `prayer_requests`, `form_submissions`, `notifications`, `analytics_events`, `integration_journeys`, helpers RBAC §6.2). Aucune redéfinition du core.

---

## 1. Tables spécifiques (préfixe `jeunesse_`)

### 1.0 Énumérations propres au module

```text
jeunesse_tranche_age      : 'ado' | 'jeune' | 'jeune_adulte'        -- 13-17 / 18-25 / 26-35
jeunesse_leader_niveau    : 'aspirant' | 'leader_junior' | 'leader' | 'leader_senior' | 'mentor'
jeunesse_projet_statut    : 'idee' | 'incubation' | 'lance' | 'en_croissance' | 'pause' | 'arrete'
jeunesse_conf_role        : 'participant' | 'benevole' | 'intervenant' | 'organisateur'
jeunesse_inscription_statut : 'en_attente' | 'confirmee' | 'liste_attente' | 'annulee' | 'presente' | 'absente'
jeunesse_certif_statut    : 'en_cours' | 'obtenue' | 'expiree' | 'revoquee'
```

### 1.1 `jeunesse_profils` — Extension de profil jeune (1-1 avec `members`)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete cascade**, **unique**, not null |
| `tranche_age` | jeunesse_tranche_age | nullable |
| `date_naissance` | date | nullable |
| `ville` | text | nullable |
| `etablissement` | text | nullable (école / université / employeur) |
| `domaine_etude_pro` | text | nullable |
| `centres_interet` | text[] | not null default `'{}'` (sport, musique, tech, business...) |
| `est_leader` | boolean | not null default false (cache dérivé de `jeunesse_leaders`) |
| `est_entrepreneur` | boolean | not null default false (cache dérivé de `jeunesse_projets`) |
| `tuteur_id` | uuid | **FK → members(id) on delete set null**, nullable (mentor/parrain) |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : le jeune lit/modifie sa propre ligne (`member_id = current_member_id()`). `serviteur`+ / `responsable_plateforme` de `jeunesse` lisent les profils rattachés. `pasteur`/`admin` global.

### 1.2 `jeunesse_leaders` — Vivier & progression leadership

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `niveau` | jeunesse_leader_niveau | not null default `'aspirant'` |
| `domaine` | text | nullable (louange, accueil, com, cellule jeunes...) |
| `cellule_animee` | text | nullable (nom du groupe animé) |
| `mentor_id` | uuid | **FK → members(id) on delete set null**, nullable |
| `date_nomination` | date | not null default current_date |
| `est_actif` | boolean | not null default true |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (member_id, domaine)`.
> **RLS** : lecture par `serviteur`+ de `jeunesse`. Écriture (nomination/changement de niveau) réservée à `responsable_plateforme`+ via `has_platform_role(jeunesse, 'responsable_plateforme')`.

### 1.3 `jeunesse_projets` — Projets entrepreneuriaux / incubateur

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `porteur_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `platform_id` | uuid | **FK → platforms(id) on delete cascade**, not null (= `jeunesse`) |
| `titre` | text | not null |
| `pitch` | text | nullable |
| `secteur` | text | nullable (tech, food, mode, service, social...) |
| `statut` | jeunesse_projet_statut | not null default `'idee'` |
| `mentor_id` | uuid | **FK → members(id) on delete set null**, nullable |
| `besoin_financement` | numeric(12,2) | nullable, check `> 0` |
| `site_url` | text | nullable |
| `date_lancement` | date | nullable |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : le porteur lit/modifie son projet. `serviteur`+ (jury/mentors) de `jeunesse` lisent ; `responsable_plateforme`+ gère statut & affectation mentor.

### 1.4 `jeunesse_conferences` — Conférences (extension d'`events`)

Spécialise un `event` du core pour le métier conférence (ne duplique pas date/lieu/capacité — porté par `events`).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | **FK → events(id) on delete cascade**, **unique**, not null |
| `theme` | text | not null |
| `edition` | text | nullable (ex: « 2026 #3 ») |
| `prix` | numeric(12,2) | nullable, check `>= 0` (0 = gratuit) |
| `devise` | text | not null default `'EUR'` |
| `intervenants` | text[] | not null default `'{}'` |
| `affiche_url` | text | nullable |
| `quota_benevoles` | integer | nullable, check `> 0` |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : lecture publique si l'`event` lié est `publie` (vitrine). Écriture `responsable_plateforme`+ de `jeunesse`.

### 1.5 `jeunesse_inscriptions` — Inscriptions aux conférences / programmes

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | **FK → events(id) on delete cascade**, not null |
| `member_id` | uuid | **FK → members(id) on delete set null**, nullable (lead non identifié possible) |
| `form_submission_id` | uuid | **FK → form_submissions(id) on delete set null**, nullable (origine du lead) |
| `nom_complet` | text | nullable (si non-membre) |
| `email` | text | nullable |
| `telephone` | text | nullable |
| `role_evenement` | jeunesse_conf_role | not null default `'participant'` |
| `statut` | jeunesse_inscription_statut | not null default `'en_attente'` |
| `montant_paye` | numeric(12,2) | nullable, check `>= 0` |
| `donation_id` | uuid | **FK → donations(id) on delete set null**, nullable (lien paiement billet) |
| `checkin_at` | timestamptz | nullable (présence réelle) |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (event_id, member_id)` (anti-doublon membre). 
> **Index** : `event_id`, `member_id`, `statut`.
> **RLS** : insertion publique (capture inscription). Le membre lit ses inscriptions. `serviteur`+ de `jeunesse` gèrent check-in & statuts.

### 1.6 `jeunesse_parcours_modules` — Modules du parcours leadership/entrepreneuriat

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `slug` | text | **unique, not null** |
| `titre` | text | not null |
| `categorie` | text | check in (`leadership`,`entrepreneuriat`,`spirituel`,`soft_skills`) |
| `ordre` | integer | not null default 0 |
| `description` | text | nullable |
| `actif` | boolean | not null default true |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : lecture authentifiée. Écriture `responsable_plateforme`+ de `jeunesse`.

### 1.7 `jeunesse_certifications` — Certifications & progression sur les modules

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `module_id` | uuid | **FK → jeunesse_parcours_modules(id) on delete cascade**, not null |
| `statut` | jeunesse_certif_statut | not null default `'en_cours'` |
| `progression_pct` | integer | not null default 0, check `between 0 and 100` |
| `valide_par` | uuid | **FK → members(id) on delete set null**, nullable (formateur) |
| `obtenue_at` | timestamptz | nullable |
| `certificat_url` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (member_id, module_id)`.
> **RLS** : le jeune lit ses certifications. `serviteur`+ (formateurs) valident ; `responsable_plateforme`+ global module.

---

## 2. Parcours utilisateur (visiteur → engagé)

1. **Découverte** — Le visiteur arrive (vitrine conf / réseaux / QR flyer). Tracking via `analytics_events` (`page_view`, `cta`).
2. **Capture du lead** — Inscription à une conférence ou au groupe via formulaire → `form_submissions` (`form_slug = 'jeunesse_conf'` ou `'jeunesse_rejoindre'`), puis `jeunesse_inscriptions`. Création/rattachement d'un `members` (`tunnel_stage = 'contact'`).
3. **Onboarding** — Ajout WhatsApp + création `memberships` (member ↔ `jeunesse`, role `membre`), `jeunesse_profils` initialisé, `integration_journeys` créé (`a_rejoint_whatsapp = true`).
4. **Première participation** — Présence à une conférence/rencontre (`jeunesse_inscriptions.checkin_at`) → `integration_journeys.a_participe_programme = true`, +score engagement.
5. **Engagement régulier** — Entrée dans un parcours (`jeunesse_certifications`), rejoint une cellule jeunes ou un projet (`jeunesse_projets`). `tunnel_stage → 'integration'/'disciple'`.
6. **Activation** — Devient serviteur/bénévole conf, ou aspirant-leader (`jeunesse_leaders`), ou entrepreneur incubé. `tunnel_stage → 'serviteur'/'leader'`.

---

## 3. Parcours de progression (niveaux internes / jalons)

**Axe Leadership** (`jeunesse_leaders.niveau`) :
`aspirant` → `leader_junior` → `leader` → `leader_senior` → `mentor`.
Jalons : nomination, ≥1 cellule animée, certifications leadership obtenues, mentorat d'au moins 1 jeune.

**Axe Entrepreneuriat** (`jeunesse_projets.statut`) :
`idee` → `incubation` → `lance` → `en_croissance` (avec `pause`/`arrete` comme sorties). Jalons : pitch validé, mentor affecté, lancement (`date_lancement`).

**Axe Formation** (`jeunesse_certifications`) : progression par modules (`progression_pct`, `statut = obtenue`). Le franchissement de jalons alimente `members.score_engagement` et synchronise `integration_journeys.stage_courant` (source de vérité unique du core).

---

## 4. Rôles & permissions spécifiques

| Acteur | Rôle core | Portée | Droits clés sur le module |
|---|---|---|---|
| **Jeune / participant** | `membre` (sur `jeunesse`) | sa ligne | Voir/éditer `jeunesse_profils`, son projet, ses inscriptions & certifications. |
| **Bénévole conf** | `serviteur` | jeunesse | Check-in inscriptions, gérer logistique d'un `event`/`jeunesse_conferences`. |
| **Formateur / mentor** | `serviteur` | jeunesse | Valider `jeunesse_certifications`, suivre projets/leaders assignés. |
| **Leader de cellule jeunes** | `leader_cellule` | jeunesse | Suivre les jeunes de sa cellule, `integration_journeys`, proposer nominations. |
| **Responsable Jeunesse** | `responsable_plateforme` | jeunesse | Tout sur les tables `jeunesse_*` : nominations leaders, statut projets, créer conférences/events, lire stats. |
| **Pasteur / Admin** | `pasteur`/`admin` | global | Accès complet (helpers `has_global_role`). |

> Toutes les policies réutilisent `has_platform_role('jeunesse'::uuid, ...)` et `current_member_id()` — pas de logique RBAC réécrite.

---

## 5. Statistiques à suivre

| Indicateur | Définition | Source |
|---|---|---|
| **Leaders** | Nb de leaders actifs (tous niveaux) | `count(jeunesse_leaders WHERE est_actif = true)` ; ventilation par `niveau`. |
| **Entrepreneurs** | Nb de porteurs distincts avec projet non arrêté | `count(distinct porteur_id) FROM jeunesse_projets WHERE statut NOT IN ('arrete')`. |
| **Conférences** | Nb de conférences publiées / tenues sur la période | `jeunesse_conferences` joint `events` (`statut IN ('publie','termine')`, filtre `date_debut`). |
| **Inscriptions** | Nb d'inscriptions (total / confirmées / présentes) | `jeunesse_inscriptions` par `statut` ; taux de présence = `count(checkin_at not null)/count(statut='confirmee')`. |
| Taux de conversion lead→membre | leads conf devenus membres `jeunesse` | `form_submissions` → `memberships` (jeunesse). |
| Certifications obtenues | modules validés | `count(jeunesse_certifications WHERE statut='obtenue')`. |
| Engagement moyen | score moyen des membres jeunesse | `avg(members.score_engagement)` joint `memberships(platform=jeunesse)`. |

> Tracking d'audience (vues vitrine conf, clics CTA) via `analytics_events` filtré `platform_id = jeunesse`.

---

## 6. Workflows automatiques

1. **Confirmation d'inscription** — `INSERT jeunesse_inscriptions` (paiement réussi / gratuit) → `statut = 'confirmee'`, `notification` (in_app + email), création/rattachement `members` (`tunnel_stage='contact'`), seed `integration_journeys`.
2. **Check-in conférence** — `UPDATE jeunesse_inscriptions.checkin_at` → `integration_journeys.a_participe_programme = true (+_at)`, `members.score_engagement += N`.
3. **Relance abandon / liste d'attente** — Inscription `en_attente` non confirmée à J+2, ou place libérée → notification de relance / promotion automatique depuis `liste_attente` vers `confirmee`.
4. **Certification obtenue** — `UPDATE jeunesse_certifications.statut='obtenue'` → `obtenue_at = now()`, `+score`, recalcul progression leadership ; si module leadership complet → suggestion de nomination au `responsable_plateforme`.

> Tous les triggers respectent §6 du core : score & tunnel passent uniquement par `members.score_engagement` et `integration_journeys`.

---

## 7. Déclencheurs emails

| Événement | Email | Tag CRM / segment |
|---|---|---|
| Inscription confirmée (`jeunesse_inscriptions.statut='confirmee'`) | Billet + infos pratiques conf | `jeunesse_inscrit_conf` |
| Absence après check-in raté (`statut='confirmee'` & pas de `checkin_at` post-event) | « On t'a manqué » + replay/prochaine date | `jeunesse_absent_conf` |
| Nomination leader (`INSERT jeunesse_leaders`) | Félicitations + onboarding leader | `jeunesse_nouveau_leader` |
| Projet passé en `incubation` (`jeunesse_projets.statut`) | Bienvenue incubateur + mentor assigné | `jeunesse_entrepreneur_incube` |

> Envois via service role écrivant dans `notifications` (`canal='email'`, `platform_id=jeunesse`).

---

## 8. Intégration des membres

- **Entrée** : lead capté par `form_submissions` (formulaire conf ou « rejoindre la Jeunesse ») → si non identifié, création `members` (`tunnel_stage='contact'`), sinon rattachement.
- **Adhésion** : création d'un `memberships` (member ↔ plateforme `jeunesse`, `role='membre'`) et d'un `jeunesse_profils`. Une seule adhésion par couple (contrainte core).
- **Suivi** : un `integration_journeys` (member, jeunesse) matérialise les jalons (formulaire, WhatsApp, parcours, participation, devenu membre). `stage_courant` synchronisé avec `members.tunnel_stage`.
- **Affectation humaine** : `jeunesse_profils.tuteur_id` (parrain) et leader de cellule jeunes assurent le suivi ; visibilité via RLS `has_platform_role('jeunesse', 'serviteur')`.
- **Progression** : participation (`jeunesse_inscriptions`), formation (`jeunesse_certifications`), leadership (`jeunesse_leaders`) et entrepreneuriat (`jeunesse_projets`) font évoluer `score_engagement` et le tunnel — source de vérité unique au core, jamais dupliquée dans le module.
