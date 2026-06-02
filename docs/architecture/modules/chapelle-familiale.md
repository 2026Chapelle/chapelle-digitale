# Module — Chapelle Familiale

> Plateforme `chapelle-familiale` · fondée sur [le core](../01-core-schema.md).

# Module d'architecture — **La Chapelle Familiale** (`chapelle-familiale`)

> Domaine : Couples, parents, familles. Type `culte`, rattachée à `cier`.
> Réutilise intégralement le core (`members`, `platforms`, `memberships`, `events`, `donations`, `prayer_requests`, `form_submissions`, `notifications`, `analytics_events`, `integration_journeys`, RBAC §6). Préfixe imposé des tables spécifiques : `familiale_`.

---

## 1. Tables spécifiques (`familiale_…`)

### 1.1 Enums dédiés (text + CHECK, listes évolutives)

```text
familiale_type_foyer      : 'couple_marie' | 'couple_fiance' | 'parent_solo' | 'famille_recomposee' | 'celibataire' | 'autre'
familiale_suivi_statut    : 'ouvert' | 'en_accompagnement' | 'en_pause' | 'cloture'
familiale_session_format  : 'couple' | 'parentalite' | 'pre_marital' | 'familial' | 'mediation'
familiale_inscription_st  : 'inscrit' | 'present' | 'absent' | 'excuse' | 'annule'
familiale_niveau          : 'decouverte' | 'fondations' | 'croissance' | 'mentor'
```

### 1.2 `familiale_foyers` — Cellule familiale (unité métier centrale)

Regroupe un ou plusieurs membres sous un même foyer. C'est l'objet « famille suivie ».

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | FK → platforms(id) on delete cascade, not null (toujours `chapelle-familiale`) |
| `nom_foyer` | text | nullable (ex: « Foyer Dupont ») |
| `type_foyer` | text | not null check ∈ `familiale_type_foyer`, default `'autre'` |
| `referent_member_id` | uuid | FK → members(id) on delete set null, nullable (contact principal) |
| `nb_enfants` | integer | not null default 0, check `>= 0` |
| `date_union` | date | nullable (mariage / engagement) |
| `accompagne_par` | uuid | FK → members(id) on delete set null, nullable (couple-mentor / serviteur) |
| `suivi_statut` | text | not null check ∈ `familiale_suivi_statut`, default `'ouvert'` |
| `notes_privees` | text | nullable (pastoral, sensible) |
| `created_at` / `updated_at` | timestamptz | |

**Index** : `platform_id`, `referent_member_id`, `accompagne_par`, `suivi_statut`.
**RLS (sensible)** : membres du foyer (via `familiale_foyer_membres`) lisent leur foyer (hors `notes_privees`). `serviteur`+/`responsable_plateforme` de `chapelle-familiale` lisent/gèrent les foyers qu'ils accompagnent. `pasteur`/`admin` global. `notes_privees` réservées `serviteur` assigné+.

### 1.3 `familiale_foyer_membres` — N-N foyer ↔ members

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `foyer_id` | uuid | FK → familiale_foyers(id) on delete cascade, not null |
| `member_id` | uuid | FK → members(id) on delete cascade, not null |
| `lien_foyer` | text | not null check ∈ (`conjoint`,`enfant`,`parent`,`autre`), default `'conjoint'` |
| `created_at` / `updated_at` | timestamptz | |

**Contrainte** : `unique (foyer_id, member_id)`.
**Index** : `foyer_id`, `member_id`.
**RLS** : membre lit ses propres rattachements ; `serviteur`+ de la plateforme gère.

### 1.4 `familiale_sessions` — Sessions couples / ateliers parentalité

Séances d'accompagnement (couple, parentalité, pré-marital). Le programme global reste un `events` ; une session peut référencer un `events` parent.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | FK → platforms(id) on delete cascade, not null |
| `event_id` | uuid | FK → events(id) on delete set null, nullable (si rattachée à un programme publié) |
| `format` | text | not null check ∈ `familiale_session_format` |
| `titre` | text | not null |
| `theme` | text | nullable |
| `animateur_member_id` | uuid | FK → members(id) on delete set null, nullable |
| `date_session` | timestamptz | not null |
| `duree_min` | integer | nullable, check `> 0` |
| `capacite` | integer | nullable, check `> 0` |
| `created_at` / `updated_at` | timestamptz | |

**Index** : `platform_id`, `format`, `date_session`, `animateur_member_id`.
**RLS** : lecture par membres inscrits + `serviteur`+ ; écriture `responsable_plateforme`+.

### 1.5 `familiale_session_inscriptions` — Présence aux sessions

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `session_id` | uuid | FK → familiale_sessions(id) on delete cascade, not null |
| `member_id` | uuid | FK → members(id) on delete cascade, not null |
| `foyer_id` | uuid | FK → familiale_foyers(id) on delete set null, nullable |
| `statut` | text | not null check ∈ `familiale_inscription_st`, default `'inscrit'` |
| `presence_at` | timestamptz | nullable (check-in effectif) |
| `created_at` / `updated_at` | timestamptz | |

**Contrainte** : `unique (session_id, member_id)`.
**Index** : `session_id`, `member_id`, `(session_id, statut)`, `foyer_id`.
**RLS** : membre lit/gère sa propre inscription ; `serviteur`+ pointe les présences.

### 1.6 `familiale_parcours_progression` — Niveau interne par foyer

Source du « parcours de progression » propre à la plateforme (distinct du tunnel core, qu'il alimente).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `foyer_id` | uuid | FK → familiale_foyers(id) on delete cascade, not null |
| `niveau` | text | not null check ∈ `familiale_niveau`, default `'decouverte'` |
| `a_fait_bilan_initial` | boolean | not null default false |
| `a_fait_bilan_initial_at` | timestamptz | nullable |
| `sessions_completees` | integer | not null default 0, check `>= 0` |
| `a_certifie_pre_marital` | boolean | not null default false |
| `a_certifie_pre_marital_at` | timestamptz | nullable |
| `est_couple_mentor` | boolean | not null default false |
| `derniere_activite_at` | timestamptz | nullable |
| `created_at` / `updated_at` | timestamptz | |

**Contrainte** : `unique (foyer_id)`.
**Index** : `foyer_id`, `niveau`.
**RLS** : membres du foyer lisent ; `serviteur`+ met à jour ; `responsable_plateforme`+ promeut au niveau `mentor`.

> Tout avancement individuel reste synchronisé vers `members.score_engagement` et `integration_journeys` (source de vérité unique du tunnel — règle core §8.6) via trigger applicatif.

---

## 2. Parcours utilisateur (visiteur → engagé)

1. **Découverte** — Visiteur arrive sur la vitrine `chapelle-familiale` (`analytics_events` page_view). CTA « Faire accompagner mon couple / ma famille ».
2. **Lead** — Soumission d'un `form_submissions` (`form_slug = 'familiale_demande_accompagnement'`), création/rattachement d'un `members` et d'un `familiale_foyers` (`suivi_statut = 'ouvert'`).
3. **Contact & qualification** — Un `serviteur` contacte le foyer, complète `type_foyer` / `nb_enfants`, ouvre un `familiale_parcours_progression` (`niveau = 'decouverte'`).
4. **Première session** — Inscription à une `familiale_sessions` (couple ou parentalité) → `familiale_session_inscriptions`. Présence pointée (`presence_at`).
5. **Accompagnement régulier** — Participation récurrente ; `sessions_completees` croît, montée en `niveau`, `suivi_statut = 'en_accompagnement'`.
6. **Engagement** — Le foyer devient `membre` (tunnel core) ; les plus matures deviennent `couple_mentor` et accompagnent d'autres foyers.

---

## 3. Parcours de progression (niveaux internes)

Stocké dans `familiale_parcours_progression.niveau`. Mapping vers `integration_journeys.stage_courant` / `members.tunnel_stage`.

| Niveau | Jalon déclencheur | Tunnel core équivalent |
|---|---|---|
| `decouverte` | Foyer créé + bilan initial à faire | `contact` |
| `fondations` | Bilan initial réalisé (`a_fait_bilan_initial`) + ≥ 1 session | `integration` |
| `croissance` | `sessions_completees >= 4` ou certification pré-maritale | `disciple` / `membre` |
| `mentor` | Promu `est_couple_mentor` par `responsable_plateforme`, accompagne ≥ 1 foyer | `serviteur` |

Jalons clés : `a_fait_bilan_initial`, `sessions_completees`, `a_certifie_pre_marital`, `est_couple_mentor`.

---

## 4. Rôles & permissions (réutilise `role_key`, portée plateforme — core §6.2)

| Rôle (sur `chapelle-familiale`) | Permissions spécifiques |
|---|---|
| `membre` | Voir/éditer son foyer (hors `notes_privees`), s'inscrire aux sessions, voir sa progression, soumettre demandes de prière. |
| `serviteur` (couple-mentor / accompagnateur) | Accompagner les foyers assignés (`accompagne_par`), pointer les présences, mettre à jour la progression, rédiger `notes_privees` sur ses foyers. |
| `leader_cellule` | Animer/créer des `familiale_sessions`, superviser un groupe de foyers, lecture étendue des présences de son groupe. |
| `responsable_plateforme` | Gestion complète des foyers/sessions/programmes de la plateforme, assignation des accompagnateurs, promotion au niveau `mentor`, lecture des stats agrégées. |
| `pasteur` / `admin` | Accès global (core), lecture des `notes_privees`, supervision transverse. |

> Permissions résolues via les helpers core `has_platform_role(<id chapelle-familiale>, …)`. Aucune logique RBAC réécrite.

---

## 5. Statistiques à suivre

| Indicateur | Définition | Source (table/colonne) |
|---|---|---|
| **Familles suivies** (imposé) | Nb de `familiale_foyers` avec `suivi_statut ∈ ('ouvert','en_accompagnement')` sur la plateforme | `familiale_foyers` (count, filtre `suivi_statut`, `platform_id`) |
| **Sessions couples** (imposé) | Nb de `familiale_sessions` `format = 'couple'` (ou `'pre_marital'`) sur période | `familiale_sessions` (count, filtre `format`, `date_session`) |
| **Ateliers parentalité** (imposé) | Nb de `familiale_sessions` `format = 'parentalite'` sur période | `familiale_sessions` (count, filtre `format`, `date_session`) |
| Taux de présence | `present` / total inscrits | `familiale_session_inscriptions` (`statut`, `presence_at`) |
| Foyers en accompagnement actif | Foyers avec `derniere_activite_at` < 30 j | `familiale_parcours_progression.derniere_activite_at` |
| Certifications pré-maritales | Count `a_certifie_pre_marital = true` | `familiale_parcours_progression` |
| Couples-mentors actifs | Count `est_couple_mentor = true` | `familiale_parcours_progression` |
| Conversion foyer → membre | Foyers atteignant `niveau ∈ ('croissance','mentor')` / foyers créés | `familiale_parcours_progression.niveau` + `familiale_foyers` |
| Engagement moyen | Moyenne `members.score_engagement` des membres rattachés | `members.score_engagement` via `familiale_foyer_membres` |
| Trafic vitrine | page_views / CTA | `analytics_events` (`platform_id`, `event_type`) |

---

## 6. Workflows automatiques

1. **Lead → foyer** : à l'insertion d'un `form_submissions` (`form_slug = 'familiale_demande_accompagnement'`), créer `members` (si nouveau) + `familiale_foyers` (`suivi_statut = 'ouvert'`) + `familiale_parcours_progression` (`decouverte`) + `integration_journeys` (flag `a_rempli_formulaire = true`), et notifier le `responsable_plateforme`.
2. **Pointage présence → progression** : quand `familiale_session_inscriptions.statut = 'present'`, incrémenter `familiale_parcours_progression.sessions_completees`, mettre à jour `derniere_activite_at`, recalculer `niveau`, +score `members.score_engagement`, et synchroniser `integration_journeys.a_participe_programme`.
3. **Abandon / inactivité** : foyer `en_accompagnement` sans présence ni session depuis 45 j → bascule `suivi_statut = 'en_pause'`, notification de relance à l'accompagnateur (`accompagne_par`).
4. **Certification pré-maritale** : passage `a_certifie_pre_marital = true` → `niveau` ≥ `croissance`, mise à jour `integration_journeys.est_devenu_membre`, notification de félicitations + génération d'une notification au `responsable_plateforme`.

---

## 7. Déclencheurs emails

| Événement déclencheur | Email | Tag CRM / segment |
|---|---|---|
| Nouveau `familiale_foyers` créé (lead) | Bienvenue + prise de RDV pour bilan initial | `familiale_nouveau_foyer` |
| Inscription à une `familiale_sessions` confirmée | Confirmation + détails session (date, lieu/visio) | `familiale_session_confirmee` |
| `statut = 'absent'` à une session | Relance « on a pensé à vous » + reprogrammation | `familiale_foyer_absent` |
| `a_certifie_pre_marital = true` / passage `niveau = 'mentor'` | Félicitations + invitation à devenir couple-mentor | `familiale_certifie` / `familiale_mentor` |

> Envois via `notifications` (canal `email`), insertion par service role. Segments alimentés depuis `familiale_parcours_progression` et `familiale_foyers.suivi_statut`.

---

## 8. Intégration des membres

1. **Entrée** : un visiteur devient lead via `form_submissions` (capture publique autorisée par RLS core). Un `members` est créé/rattaché ; aucune duplication de profil (règle core §8.2).
2. **Rattachement foyer** : le membre est lié à un `familiale_foyers` via `familiale_foyer_membres` (`conjoint`/`parent`/`enfant`). Le conjoint éventuel est rattaché au même foyer.
3. **Adhésion plateforme** : création d'un `memberships` (`platform_id = chapelle-familiale`, `role = 'membre'`) → ouvre les droits contextuels.
4. **Suivi** : un `serviteur` est assigné via `familiale_foyers.accompagne_par` ; le `familiale_parcours_progression` matérialise l'avancement interne.
5. **Synchronisation tunnel** : chaque jalon (bilan, sessions, certification) met à jour `integration_journeys` (par couple member/platform) et `members.score_engagement` — source de vérité unique du tunnel (règle core §8.6).
6. **Montée en responsabilité** : un foyer mature passe `est_couple_mentor`, son membre référent peut être promu `serviteur` sur la plateforme via `memberships.role`, et accompagner de nouveaux foyers (`accompagne_par`).

---

**Fichiers / objets clés** : tables `familiale_foyers`, `familiale_foyer_membres`, `familiale_sessions`, `familiale_session_inscriptions`, `familiale_parcours_progression` — toutes rattachées au core via `platforms(id)` et `members(id)`, RLS activée, helpers RBAC §6.2 réutilisés.
