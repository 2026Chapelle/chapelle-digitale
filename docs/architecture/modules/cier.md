# Module — CIER — Corps Principal

> Plateforme `cier` · fondée sur [le core](../01-core-schema.md).

# CIER — Corps Principal — Module d'Architecture

> Plateforme `cier` (slug) · type `racine` · `parent_id = null`
> Rôle dans l'écosystème : **Hub central** de l'église. Fédère les 7 plateformes filles, porte les cultes du corps principal, le registre unifié des membres, les offrandes/dîmes globales, les événements généraux et la diffusion de la vision.
> S'appuie sur le core partagé. Réutilise `members`, `platforms`, `memberships`, `events`, `donations`, `prayer_requests`, `form_submissions`, `notifications`, `analytics_events`, `integration_journeys`, `roles`. Préfixe imposé des tables propres : `cier_`.

---

## 1. Tables spécifiques (`cier_…`)

Le hub n'a pas vocation à dupliquer les transverses. Ses tables propres couvrent : la programmation/présence aux cultes du corps principal, la vision & ses jalons, l'annuaire des plateformes pour la vitrine, la collecte de la dîme/promesse, et l'audit administratif.

### 1.1 `cier_cultes` — Programmation des cultes du corps principal

Un culte = un `events` typé culte. Cette table porte les métadonnées cultuelles non couvertes par `events`.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | **FK → events(id) on delete cascade**, not null, unique |
| `type_culte` | text | not null, check in (`dimanche`,`priere`,`veillee`,`special`,`bapteme`,`sainte_cene`) |
| `theme` | text | nullable |
| `predicateur_id` | uuid | **FK → members(id) on delete set null**, nullable |
| `texte_biblique` | text | nullable |
| `lien_replay` | text | nullable |
| `nb_places_physiques` | integer | nullable, check `> 0` |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : lecture publique des cultes dont l'`events.statut = 'publie'`. Écriture `responsable_plateforme`+ sur la plateforme `cier`.

### 1.2 `cier_presences_culte` — Présences (physique / en ligne)

Source de vérité de l'indicateur « présences cultes ».

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `culte_id` | uuid | **FK → cier_cultes(id) on delete cascade**, not null |
| `member_id` | uuid | **FK → members(id) on delete set null**, nullable (présence anonyme/comptée) |
| `mode` | text | not null, check in (`physique`,`en_ligne`), default `'physique'` |
| `check_in_at` | timestamptz | not null default now() |
| `source` | text | nullable (`qr`,`manuel`,`stream`,`auto`) |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (culte_id, member_id)` — une présence par membre/culte (les présences anonymes `member_id = null` ne sont pas contraintes).
> **RLS** (sensible) : le membre lit ses propres présences. `serviteur`+ de `cier` enregistre/lit les présences ; agrégats pour `responsable_plateforme`+.

### 1.3 `cier_vision_axes` — Axes de vision & objectifs annuels

Diffusion et pilotage de la vision du corps principal.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `annee` | integer | not null, check `>= 2020` |
| `titre` | text | not null |
| `description` | text | nullable |
| `objectif_chiffre` | numeric(14,2) | nullable (cible mesurable) |
| `unite` | text | nullable (`ames`,`membres`,`eur`,`cultes`...) |
| `valeur_courante` | numeric(14,2) | not null default 0 |
| `ordre` | integer | not null default 0 |
| `est_public` | boolean | not null default true |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : lecture publique si `est_public = true`. Écriture `pasteur`/`admin`.

### 1.4 `cier_annuaire_plateformes` — Vitrine/aiguillage des plateformes filles

Métadonnées de présentation propres au hub (la hiérarchie reste dans `platforms.parent_id`). Évite de polluer `platforms` avec du contenu marketing.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | **FK → platforms(id) on delete cascade**, not null, unique |
| `accroche` | text | nullable |
| `image_couverture_url` | text | nullable |
| `cta_label` | text | nullable |
| `cta_url` | text | nullable |
| `ordre_affichage` | integer | not null default 0 |
| `est_mise_en_avant` | boolean | not null default false |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : lecture publique. Écriture `responsable_plateforme`+ de `cier`.

### 1.5 `cier_promesses_dons` — Promesses / engagements de dîme

Couvre l'engagement récurrent (pledge). Le versement réel reste dans `donations`.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `type` | donation_type | not null default `'dime'` |
| `montant_cible` | numeric(12,2) | not null, check `> 0` |
| `devise` | text | not null default `'EUR'` |
| `frequence` | text | not null, check in (`unique`,`hebdo`,`mensuel`,`annuel`), default `'mensuel'` |
| `date_debut` | date | not null default current_date |
| `date_fin` | date | nullable, check `date_fin >= date_debut` |
| `statut` | text | not null, check in (`active`,`honoree`,`en_retard`,`annulee`), default `'active'` |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** (financière) : le membre lit/gère ses promesses. `pasteur`/`admin` : global ; `responsable_plateforme` de `cier` : agrégats sans PII croisée.

### 1.6 `cier_admin_audit` — Journal d'audit administratif du hub

Traçabilité des actions sensibles globales (changement de rôle, fusion de membres, validation financière).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `acteur_id` | uuid | **FK → members(id) on delete set null**, nullable |
| `action` | text | not null (`role_change`,`member_merge`,`donation_validate`,`platform_toggle`...) |
| `cible_table` | text | nullable |
| `cible_id` | uuid | nullable |
| `payload` | jsonb | not null default `'{}'` |
| `occurred_at` | timestamptz | not null default now() |
| `created_at` | timestamptz | (append-only, pas d'`updated_at`) |

> **RLS** (sensible) : lecture `admin` uniquement (`pasteur` en lecture). Insertion via service role / triggers.

---

## 2. Parcours utilisateur (visiteur → engagé)

Le hub est la porte d'entrée principale de l'écosystème.

1. **Découverte (visiteur anonyme)** — Arrive sur la vitrine du hub (cultes à venir, vision, annuaire des plateformes). Tracké via `analytics_events` (`page_view`, `cta`), `session_id` non identifié.
2. **Contact / capture de lead** — Remplit un formulaire « Je viens pour la première fois » ou « Suivre un culte en ligne » → `form_submissions` (`form_slug = 'cier_premiere_visite'`). Création (ou rattachement) d'un `members` ; `tunnel_stage = 'contact'`.
3. **Première présence** — Check-in à un culte (physique via QR ou en ligne via stream) → `cier_presences_culte`. Ouverture/MAJ d'un `integration_journeys` sur `cier` (`a_participe_programme = true`).
4. **Intégration** — Rejoint le groupe WhatsApp d'accueil, suit un premier pas de discipulat → `integration_journeys.a_rejoint_whatsapp` / `a_suivi_parcours`. `tunnel_stage = 'integration'`.
5. **Adhésion** — Devient membre du corps principal → `memberships` (`platform_id = cier`, `role = 'membre'`), `integration_journeys.est_devenu_membre = true`, `members.tunnel_stage = 'membre'`.
6. **Engagement** — Donne régulièrement (`donations` / `cier_promesses_dons`), participe assidûment aux cultes, peut être aiguillé vers une plateforme fille (Jeunesse, CFIC, etc.) selon son profil.

---

## 3. Parcours de progression (jalons internes)

Aligné sur `tunnel_stage` (core) — le hub matérialise les jalons via `integration_journeys` (couple membre / plateforme `cier`).

| Niveau | Stage core | Jalon déclencheur (hub) | Signal mesuré |
|---|---|---|---|
| Visiteur | `visiteur` | Vue de page / culte en ligne | `analytics_events` |
| Contact | `contact` | Formulaire première visite | `form_submissions` + `a_rempli_formulaire` |
| En intégration | `integration` | WhatsApp + 1ʳᵉ présence culte | `a_rejoint_whatsapp`, `cier_presences_culte` |
| Disciple | `disciple` | Parcours de fondation suivi | `a_suivi_parcours` |
| Membre | `membre` | Adhésion validée au corps | `memberships(cier)` + `est_devenu_membre` |
| Serviteur / Leader | `serviteur` / `leader` | Engagement service + promesse de dîme active | `memberships.role`, `cier_promesses_dons.statut='active'` |

> `members.score_engagement` est incrémenté par les workflows (§6) sur présence, don et complétion de jalon. Source de vérité unique : `integration_journeys` + `members.score_engagement` (jamais de compteur local dans `cier_`).

---

## 4. Rôles & permissions spécifiques

Réutilise `role_key` (aucun nouvel enum). Portée combinée global + `memberships(platform_id = cier)` via les helpers `has_platform_role` / `has_global_role`.

| Rôle (sur `cier`) | Peut faire |
|---|---|
| `visiteur` | Voir vitrine, cultes publiés, vision publique, annuaire. Soumettre un formulaire. |
| `membre` | + Check-in culte, consulter ses présences/dons, gérer ses promesses (`cier_promesses_dons`), demandes de prière. |
| `serviteur` | + Enregistrer les présences (`cier_presences_culte`), gérer l'accueil des nouveaux, suivre des `integration_journeys` assignés. |
| `leader_cellule` | + Suivre un groupe de nouveaux convertis (cohorte d'intégration), voir leurs jalons. |
| `responsable_plateforme` | + Créer/éditer cultes (`cier_cultes`, `events`), gérer l'annuaire vitrine, voir les agrégats (présences, offrandes, leads) de `cier`. |
| `pasteur` | + Éditer la vision (`cier_vision_axes`), accès global aux membres/dons/parcours, lecture audit. |
| `admin` | + Tout, configuration, gestion des rôles, lecture/écriture `cier_admin_audit`, bascule activation des plateformes. |

> Le hub étant la racine, `responsable_plateforme(cier)` a une visibilité transverse de coordination, mais **les données détaillées des plateformes filles restent gouvernées par leurs propres RLS** — pas d'accès PII croisé automatique.

---

## 5. Statistiques à suivre

| Indicateur | Définition | Source (table.colonne) |
|---|---|---|
| **Visiteurs** | Sessions uniques sur la vitrine du hub sur une période | `analytics_events` distinct `session_id` WHERE `platform_id = cier` AND `event_type = 'page_view'` |
| **Nouveaux inscrits** | Membres dont la 1ʳᵉ adhésion/contact tombe dans la période | `members.created_at` (croisé `memberships.date_adhesion` WHERE `platform_id = cier`) ; ou `form_submissions` WHERE `form_slug LIKE 'cier_%'` |
| **Offrandes** | Somme des dons réussis rattachés au hub | `donations.montant` WHERE `platform_id = cier` AND `statut_paiement = 'reussi'`, groupé par `type` et `donne_le` |
| **Présences cultes** | Nb de check-ins par culte (physique + en ligne) et taux de récurrence | `cier_presences_culte` (count par `culte_id`, ventilé par `mode`) |
| **Événements** | Nb d'événements publiés et taux de remplissage | `events` WHERE `platform_id = cier` AND `statut = 'publie'` ; remplissage = présences / `capacite` |

Indicateurs complémentaires de pilotage : taux de conversion tunnel (`integration_journeys.stage_courant`), avancement vision (`cier_vision_axes.valeur_courante / objectif_chiffre`), taux d'honoration des promesses (`cier_promesses_dons.statut`).

---

## 6. Workflows automatiques

1. **Check-in culte → engagement & jalon** — À l'insertion dans `cier_presences_culte` : incrémente `members.score_engagement`, marque `integration_journeys.a_participe_programme = true` (+ `_at`) pour `(member_id, cier)`, recalcule `stage_courant`. Si 1ʳᵉ présence d'un `contact` → passe en `integration`.
2. **Don reçu → mise à jour promesse** — À l'insertion d'un `donations` (`statut_paiement = 'reussi'`, `platform_id = cier`) : rattache au `cier_promesses_dons` actif du membre, met à jour `valeur_courante` de l'axe de vision financier (`cier_vision_axes`), recalcule le statut de la promesse (`honoree` / `en_retard`).
3. **Absence prolongée → ré-engagement** — Job planifié : membre `actif` sans présence culte depuis > 30 jours → crée une `notification` (canal `whatsapp`/`email`) et baisse `score_engagement` (decay). Tag de relance pour l'équipe d'accueil.
4. **Adhésion validée → provisioning** — À la création d'un `memberships(platform_id = cier, role = 'membre')` : passe `members.tunnel_stage = 'membre'`, met `integration_journeys.est_devenu_membre = true` (+ `_at`), notifie l'intéressé et crée une entrée `cier_admin_audit` (`action = 'role_change'`).

---

## 7. Déclencheurs emails

| Événement déclencheur | Email envoyé | Tag CRM / segment |
|---|---|---|
| `form_submissions` `form_slug = 'cier_premiere_visite'` créé | Bienvenue + infos prochain culte + lien WhatsApp | `cier_nouveau_contact` |
| 1ʳᵉ présence enregistrée (`cier_presences_culte`) | « Heureux de t'avoir vu » + invitation parcours de fondation | `cier_premiere_presence` |
| Aucune présence depuis > 30 j (workflow 3) | Relance « Tu nous manques » + agenda des cultes | `cier_inactif_30j` |
| `donations` réussi (offrande/dîme) sur `cier` | Reçu de don + remerciement + impact vision | `cier_donateur` |

> Tous les envois passent par `notifications` (canal `email`) et respectent `members.consentement_rgpd_at`.

---

## 8. Intégration des membres

- **Point d'entrée unique** : le hub crée ou rattache le `members` (jamais de duplication — règle core §8.2). Identité résolue par `email`/`telephone` ; rattachement à `auth.users` au moment de la création de compte.
- **Adhésion explicite** : matérialisée par une ligne `memberships(member_id, platform_id = cier, role)`. Un même membre peut adhérer ensuite à plusieurs plateformes filles avec des rôles distincts.
- **Suivi** : un `integration_journeys(member_id, cier)` unique trace les jalons (formulaire, WhatsApp, parcours, présence, adhésion). `stage_courant` synchronisé avec `members.tunnel_stage` (max global) par trigger.
- **Aiguillage cross-plateforme** : depuis le hub, un `responsable_plateforme`/`serviteur` peut orienter un membre vers une fille (Jeunesse, CFIC, Mahanaïm…) ; l'orientation crée un `memberships` sur la fille concernée, mais le profil et le score restent centralisés sur `members`.
- **Engagement** : présences (`cier_presences_culte`), dons (`donations` / `cier_promesses_dons`) et complétion de jalons alimentent `members.score_engagement`, source de classement et de déclenchement des workflows de soin pastoral.

---

### Récapitulatif FK du module → core

```text
cier_cultes.event_id                → events(id)          on delete cascade
cier_cultes.predicateur_id          → members(id)         on delete set null
cier_presences_culte.culte_id       → cier_cultes(id)     on delete cascade
cier_presences_culte.member_id      → members(id)         on delete set null
cier_annuaire_plateformes.platform_id → platforms(id)     on delete cascade
cier_promesses_dons.member_id       → members(id)         on delete cascade
cier_admin_audit.acteur_id          → members(id)         on delete set null
```
(`cier_vision_axes` est autonome — pilotage global, pas de FACT FK obligatoire.)
