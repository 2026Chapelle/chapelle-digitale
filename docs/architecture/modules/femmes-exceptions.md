# Module — Femmes d'Exceptions

> Plateforme `femmes-exceptions` · fondée sur [le core](../01-core-schema.md).

# Module d'Architecture — « Femmes d'Exceptions »

**Slug** : `femmes-exceptions` · **Type** : `ministere` · **Parent** : `cier` · **Préfixe tables** : `femmes_`
**Domaine** : Ministère des femmes — accompagnement spirituel, retraites, conférences, cercles de mentorat.

---

## 1. Tables spécifiques (`femmes_…`)

Toutes les tables suivent les conventions universelles : `id uuid pk default gen_random_uuid()`, `created_at timestamptz not null default now()`, `updated_at timestamptz` (trigger `set_updated_at`). Le `platform_id` est résolu une fois pour `femmes-exceptions` et réutilisé. Les retraites/conférences sont des `events` du core (voir §5) ; les tables ci-dessous portent le métier propre au ministère.

### 1.1 `femmes_profils` — Extension de profil (1-1 avec `members`)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete cascade**, **unique**, not null |
| `tranche_age` | text | check in (`-25`,`25-34`,`35-44`,`45-54`,`55-64`,`65+`), nullable |
| `situation_familiale` | text | check in (`celibataire`,`mariee`,`fiancee`,`veuve`,`divorcee`,`autre`), nullable |
| `est_mere` | boolean | not null default false |
| `centres_interet` | text[] | nullable (`priere`,`maternite`,`entrepreneuriat`,`guerison`,`leadership`...) |
| `souhaite_mentorat` | boolean | not null default false |
| `disponibilite` | text | nullable (créneaux préférés en texte libre) |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : la membre lit/modifie sa propre ligne (`member_id = current_member_id()`). `serviteur`+ et `responsable_plateforme` de `femmes-exceptions` en lecture. `pasteur`/`admin` global.

### 1.2 `femmes_cercles` — Cercles / groupes de sororité

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | **FK → platforms(id) on delete cascade**, not null (= `femmes-exceptions`) |
| `nom` | text | not null |
| `theme` | text | nullable (ex: `Mères`, `Jeunes femmes`, `Entrepreneuriat`) |
| `description` | text | nullable |
| `animatrice_id` | uuid | **FK → members(id) on delete set null**, nullable |
| `jour_rencontre` | text | nullable (`lundi`...`dimanche`) |
| `capacite` | integer | check `> 0`, nullable |
| `est_ouvert` | boolean | not null default true |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : lecture par membres authentifiées de la plateforme ; écriture `leader_cellule`+ de `femmes-exceptions`.

### 1.3 `femmes_cercle_membres` — Adhésion N-N membre ↔ cercle

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `cercle_id` | uuid | **FK → femmes_cercles(id) on delete cascade**, not null |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `role_cercle` | text | check in (`participante`,`co_animatrice`,`animatrice`) default `'participante'` |
| `statut` | member_statut | not null default `'actif'` |
| `date_entree` | date | not null default current_date |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (cercle_id, member_id)`.
> **Index** : `cercle_id`, `member_id`.
> **RLS** : la membre lit ses adhésions ; animatrice/`leader_cellule`+ gèrent leur cercle.

### 1.4 `femmes_evenement_meta` — Métadonnées métier sur un `event`

Spécialise un `events` du core en retraite / conférence / atelier (sans dupliquer date/lieu/capacité).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | **FK → events(id) on delete cascade**, **unique**, not null |
| `categorie` | text | check in (`retraite`,`conference`,`atelier`,`veillee`,`brunch`), not null |
| `theme` | text | nullable |
| `oratrice_principale` | text | nullable |
| `frais_participation` | numeric(10,2) | check `>= 0`, nullable (0 = gratuit) |
| `nb_nuitees` | integer | check `>= 0`, nullable (retraites résidentielles) |
| `cible` | text | nullable (`toutes`,`meres`,`jeunes`,`leaders`...) |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `categorie`, `event_id`.
> **RLS** : lecture publique si l'`event` lié est `publie` ; écriture `responsable_plateforme`+ de la plateforme.

### 1.5 `femmes_inscriptions` — Inscriptions aux événements (participantes)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | **FK → events(id) on delete cascade**, not null |
| `member_id` | uuid | **FK → members(id) on delete set null**, nullable (inscription invitée possible) |
| `nom_complet` | text | nullable (si non-membre) |
| `email` | text | nullable |
| `telephone` | text | nullable |
| `statut` | text | check in (`inscrite`,`confirmee`,`presente`,`absente`,`annulee`,`liste_attente`) default `'inscrite'` |
| `frais_du` | numeric(10,2) | check `>= 0`, nullable |
| `paiement_donation_id` | uuid | **FK → donations(id) on delete set null**, nullable (lien vers le paiement core) |
| `checkin_at` | timestamptz | nullable (pointage présence) |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (event_id, member_id)` (un membre ne s'inscrit qu'une fois ; non appliqué aux invitées sans `member_id`).
> **Index** : `event_id`, `member_id`, `(event_id, statut)`.
> **RLS** (sensible) : la membre lit/gère ses inscriptions ; `serviteur`+ de la plateforme gèrent les inscriptions de leurs events. Insertion publique tolérée via formulaire (capture lead → `form_submissions`).

### 1.6 `femmes_mentorat` — Binômes mentore / mentorée

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | **FK → platforms(id) on delete cascade**, not null |
| `mentore_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `mentoree_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `statut` | text | check in (`propose`,`actif`,`en_pause`,`termine`) default `'propose'` |
| `objectif` | text | nullable |
| `date_debut` | date | nullable |
| `date_fin` | date | nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `check (mentore_id <> mentoree_id)` ; `unique (mentore_id, mentoree_id, statut)` partiel sur `actif`.
> **RLS** (sensible) : mentore et mentorée lisent leur binôme ; `responsable_plateforme`+ gère les attributions.

### 1.7 `femmes_temoignages` — Témoignages / récits de transformation

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete set null**, nullable |
| `event_id` | uuid | **FK → events(id) on delete set null**, nullable (témoignage issu d'une retraite/conf.) |
| `titre` | text | nullable |
| `contenu` | text | not null |
| `est_anonyme` | boolean | not null default false |
| `est_public` | boolean | not null default false |
| `statut_moderation` | text | check in (`soumis`,`approuve`,`rejete`) default `'soumis'` |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** (sensible) : l'autrice lit/modifie le sien ; modération `serviteur`+ ; lecture publique si `est_public` et `approuve`.

---

## 2. Parcours utilisateur (visiteuse → engagée)

1. **Découverte** — Une femme arrive sur la vitrine `femmes-exceptions` (lien CIER, réseaux, invitation). Tracking `analytics_events` (`page_view`, `cta`). Stage `visiteur`.
2. **Capture du lead** — Elle remplit un formulaire (« Je veux participer » / inscription à une conférence) → `form_submissions` (`form_slug = 'femmes_inscription'`). Création/rattachement d'un `members` + `memberships` (role `membre`) si email reconnu. Stage `contact`.
3. **Premier contact & WhatsApp** — Rejoint le groupe WhatsApp du ministère, jalon `a_rejoint_whatsapp` dans `integration_journeys`. Création de `femmes_profils` (tranche d'âge, intérêts, souhait mentorat). Stage `integration`.
4. **Première participation** — Inscription + présence à une conférence/atelier (`femmes_inscriptions.statut = 'presente'`, `checkin_at`). Jalon `a_participe_programme`. +score d'engagement.
5. **Ancrage en cercle** — Rejoint un `femmes_cercles` (sororité régulière). Stage `disciple`. Devient `membre` confirmée du ministère.
6. **Engagement & service** — Participe à une retraite, demande/reçoit un mentorat, peut devenir co-animatrice. Stage `serviteur` puis `leader` (animatrice de cercle).

---

## 3. Parcours de progression (jalons internes)

| Niveau interne | Jalon déclencheur | Reflet core |
|---|---|---|
| **Invitée** | Lead capturé (`form_submissions`) | `tunnel_stage = contact` |
| **Connectée** | A rejoint WhatsApp + profil créé | `tunnel_stage = integration`, `a_rejoint_whatsapp = true` |
| **Participante** | ≥ 1 présence à un event (`statut = presente`) | `a_participe_programme = true`, +score |
| **Sœur de cercle** | Membre active d'un `femmes_cercles` | `tunnel_stage = disciple`, `est_devenu_membre = true` |
| **Mentorée / Mentore** | Binôme `femmes_mentorat` actif | +score ; mentore = `serviteur` |
| **Animatrice** | `role_cercle = animatrice` ou `femmes_cercles.animatrice_id` | `memberships.role = leader_cellule` |

> Source de vérité unique : avancement via `integration_journeys` (jalons) et `members.score_engagement`. Aucun compteur dupliqué dans les tables `femmes_`.

---

## 4. Rôles & permissions spécifiques

| Rôle (core `role_key`) | Application « Femmes d'Exceptions » | Permissions clés |
|---|---|---|
| `membre` | Participante inscrite | Voir events publiés, s'inscrire, rejoindre un cercle ouvert, gérer son profil/inscriptions/témoignages. |
| `serviteur` | Intercesseuse / mentore / co-animatrice | Lecture des inscriptions et profils de la plateforme ; gestion d'un binôme mentorat ; co-animation de cercle. |
| `leader_cellule` | **Animatrice de cercle** | CRUD sur son `femmes_cercles` et ses `femmes_cercle_membres` ; check-in présence des participantes de son cercle. |
| `responsable_plateforme` | **Responsable du ministère** | CRUD events + `femmes_evenement_meta`, gestion de tous les cercles/mentorats/inscriptions, attribution des binômes, modération témoignages, accès stats plateforme. |
| `pasteur` / `admin` | Supervision globale | Accès complet (tous modules), lecture financière croisée. |

> Résolution des droits via les helpers core `has_platform_role(femmes_platform_id, min_role)`. Aucune logique RBAC réécrite ici.

---

## 5. Statistiques à suivre

| Indicateur | Définition | Source |
|---|---|---|
| **Participantes** *(attendu)* | Nombre de femmes distinctes ayant ≥ 1 présence (`statut = 'presente'`) sur la période | `count(distinct member_id)` sur `femmes_inscriptions` filtré `statut='presente'` |
| **Retraites** *(attendu)* | Nombre de retraites tenues + taux de remplissage | `events` joint `femmes_evenement_meta` (`categorie='retraite'`, `events.statut='termine'`) ; remplissage = inscrites `presente` / `events.capacite` |
| **Conférences** *(attendu)* | Nombre de conférences + audience cumulée | `femmes_evenement_meta` (`categorie='conference'`) + `count` inscriptions `presente` |
| Taux de conversion lead → participante | Leads devenus participantes | `form_submissions` (`form_slug` ministère) → `femmes_inscriptions.presente` |
| Membres actives en cercle | Adhésions de cercle actives | `femmes_cercle_membres` (`statut='actif'`) |
| Couverture mentorat | Binômes actifs / demandes | `femmes_mentorat` (`statut='actif'`) vs `femmes_profils.souhaite_mentorat=true` |
| Taux de présence (no-show) | Présentes / inscrites par event | `femmes_inscriptions` (`presente` vs `inscrite`+`confirmee`) |
| Engagement moyen | Score moyen des membres de la plateforme | `members.score_engagement` joint `memberships` (platform = femmes) |
| Témoignages publiés | Récits approuvés & publics | `femmes_temoignages` (`statut_moderation='approuve'` AND `est_public`) |

---

## 6. Workflows automatiques

1. **Inscription confirmée → onboarding** : à l'insertion d'une `femmes_inscriptions` rattachée à un `member_id`, upsert `integration_journeys` (`a_rempli_formulaire = true`), envoi notification `in_app` + email de confirmation, ajout au segment CRM `femmes_participantes`.
2. **Check-in présence → engagement** : quand `checkin_at` est renseigné (`statut='presente'`), incrément `members.score_engagement`, set `integration_journeys.a_participe_programme = true` (+ horodatage), et si retraite → passage `tunnel_stage` ≥ `disciple`.
3. **Abandon / no-show** : si `statut='confirmee'` sans `checkin_at` 48h après `events.date_fin` → bascule `statut='absente'`, création `prayer_requests` interne d'invitation au suivi + notification au `serviteur` du cercle (relance douce).
4. **Adhésion cercle → membre confirmée** : à l'insertion d'un `femmes_cercle_membres` actif, set `integration_journeys.est_devenu_membre = true`, mise à jour `memberships.role` au moins `membre`, et `members.tunnel_stage = disciple` (via trigger applicatif respectant le max global).

---

## 7. Déclencheurs emails

| Événement déclencheur | Email envoyé | Tag CRM / segment |
|---|---|---|
| Lead capturé (`form_submissions` ministère) | « Bienvenue chez Femmes d'Exceptions » + lien WhatsApp | `femmes_lead` |
| `femmes_inscriptions` créée/confirmée | Confirmation d'inscription (date, lieu, frais, infos pratiques) | `femmes_participantes` |
| J-3 avant `events.date_debut` (retraite/conférence) | Rappel + checklist (logistique, nuitées si retraite) | `femmes_rappel_event` |
| `checkin_at` enregistré (présence retraite) | Email post-retraite : ressources, invitation cercle/mentorat | `femmes_alumni_retraite` |
| `femmes_mentorat.statut = 'actif'` | Mise en relation mentore ↔ mentorée (cadre & objectif) | `femmes_mentorat_actif` |

> Emails routés via `notifications` (`canal='email'`) ; segmentation alimentée par les jalons `integration_journeys` et les statuts d'inscription.

---

## 8. Intégration des membres

1. **Entrée** : capture par formulaire public (`form_submissions`, insertion anonyme autorisée) ou inscription directe à un event. Si l'email correspond à un `members` existant → rattachement, sinon création d'un `members` (`tunnel_stage='contact'`, `role_global='visiteur'`).
2. **Rattachement plateforme** : création d'un `memberships` (member ↔ `femmes-exceptions`, `role='membre'`) — jamais de duplication de profil ; la table `femmes_profils` étend `members` en 1-1.
3. **Tunnel** : un seul `integration_journeys` par (membre, `femmes-exceptions`). Les jalons (`a_rempli_formulaire`, `a_rejoint_whatsapp`, `a_participe_programme`, `est_devenu_membre`) sont mis à jour par les workflows §6 ; `stage_courant` synchronisé avec `members.tunnel_stage` (max global).
4. **Suivi** : l'animatrice de cercle (`leader_cellule`) et le responsable suivent les parcours via `integration_journeys` filtré sur `platform_id`. Le score d'engagement (`members.score_engagement`) progresse aux présences, adhésion de cercle, mentorat et témoignages approuvés.
5. **Progression de rôle** : participante régulière → `serviteur` (mentore/co-animatrice) → `leader_cellule` (animatrice), via `memberships.role`. Les droits effectifs sont résolus par `max(niveau global, niveau membership)` selon le core §6.2.

> **Cohérence core** : aucune redéfinition d'enum/role ; toutes les références passent par `members(id)` / `platforms(id)` / `events(id)` / `donations(id)` ; compteurs et tunnel centralisés (`members.score_engagement` + `integration_journeys`).
