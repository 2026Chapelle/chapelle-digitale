# 01 — Schéma Canonique Partagé (Core)

> Document généré le 2026-05-29 — Architecture de gestion de la Chapelle (CIER).
> 8 plateformes · Supabase · mock aujourd'hui, cible production.
> Conçu par orchestration multi-agents (core → 8 modules → synthèse).

# Schéma Canonique Partagé — Plateforme "Église Digitale" (La Chapelle / CIER)

> **Statut** : Fondation imposée, stable. Tout module fille doit s'y conformer.
> **Cible** : PostgreSQL 15+ / Supabase. Extension requise : `pgcrypto` (pour `gen_random_uuid()`).
> **Conventions universelles** (implicites sur toutes les tables, non répétées) :
> `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`, `updated_at timestamptz` (mis à jour par trigger `set_updated_at`).

---

## 0. Énumérations (types Postgres)

```text
tunnel_stage   : 'visiteur' | 'contact' | 'integration' | 'disciple' | 'membre' | 'serviteur' | 'leader'
role_key       : 'visiteur' | 'membre' | 'serviteur' | 'leader_cellule' | 'responsable_plateforme' | 'pasteur' | 'admin'
member_statut  : 'actif' | 'inactif' | 'suspendu' | 'archive'
platform_type  : 'racine' | 'culte' | 'ministere' | 'cellule' | 'formation' | 'evenementiel'
donation_type  : 'offrande' | 'dime' | 'don_projet' | 'soutien_mission' | 'autre'
prayer_statut  : 'nouvelle' | 'en_cours' | 'exaucee' | 'cloturee'
event_statut   : 'brouillon' | 'publie' | 'annule' | 'termine'
notif_canal    : 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push'
```

> Convention : préférer **enum Postgres** pour les valeurs stables (ci-dessus). Pour les listes susceptibles d'évoluer fréquemment, utiliser `text + CHECK`. Élargir un enum se fait via `ALTER TYPE ... ADD VALUE`.

---

## 1. `platforms` — Référentiel des 8 plateformes

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `slug` | text | **unique, not null** (ex: `cier`, `mahanaim`) |
| `nom` | text | not null |
| `type` | platform_type | not null |
| `couleur` | text | check format hex `^#[0-9A-Fa-f]{6}$`, nullable |
| `description` | text | nullable |
| `parent_id` | uuid | **FK → platforms(id) on delete set null**, nullable (hiérarchie sous CIER) |
| `actif` | boolean | not null default true |
| `created_at` / `updated_at` | timestamptz | |

**Données de seed (les 8) :**

| slug | nom | type | parent |
|---|---|---|---|
| `cier` | CIER | racine | `null` (racine) |
| `chapelle-familiale` | La Chapelle Familiale | culte | cier |
| `jeunesse` | Jeunesse | ministere | cier |
| `cite-refuge` | Cité Refuge | ministere | cier |
| `cfic` | CFIC | formation | cier |
| `femmes-exceptions` | Femmes d'Exceptions | ministere | cier |
| `familles-chapelle` | Familles de la Chapelle | ministere | cier |
| `mahanaim` | Mahanaïm | cellule | cier |

> **RLS** : lecture publique des plateformes `actif = true` (vitrine). Écriture réservée aux rôles globaux `admin`/`pasteur`. Pas de données sensibles ici.

---

## 2. `members` — Profil unifié

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `auth_user_id` | uuid | **FK → auth.users(id) on delete set null**, unique, nullable (un membre peut exister avant de créer un compte) |
| `prenom` | text | not null |
| `nom` | text | nullable |
| `email` | text | unique (citext recommandé), nullable |
| `telephone` | text | nullable (format E.164 conseillé) |
| `pays` | text | nullable (ISO-3166 alpha-2 conseillé) |
| `statut` | member_statut | not null default `'actif'` |
| `tunnel_stage` | tunnel_stage | not null default `'visiteur'` |
| `role_global` | role_key | not null default `'visiteur'` (rôle RBAC global — voir §6) |
| `score_engagement` | integer | not null default 0, check `>= 0` |
| `avatar_url` | text | nullable |
| `consentement_rgpd_at` | timestamptz | nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `email`, `auth_user_id`, `tunnel_stage`, `score_engagement DESC`.
> **RLS** (table très sensible) : un membre lit/modifie **uniquement** sa propre ligne (`auth.uid() = auth_user_id`). Les rôles `responsable_plateforme`+ voient les membres rattachés à **leurs** plateformes (via jointure `memberships`). `pasteur`/`admin` : accès complet. Aucune lecture anonyme.

---

## 3. `memberships` — Relation N-N member ↔ platform (RBAC par plateforme)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `platform_id` | uuid | **FK → platforms(id) on delete cascade**, not null |
| `role` | role_key | not null default `'membre'` (rôle **dans cette plateforme**) |
| `date_adhesion` | date | not null default current_date |
| `statut` | member_statut | not null default `'actif'` |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (member_id, platform_id)` — une seule adhésion par couple membre/plateforme.
> **Index** : `member_id`, `platform_id`, `(platform_id, role)`.
> **RLS** : le membre lit ses propres `memberships`. `responsable_plateforme`+ gère les adhésions de sa plateforme. `admin`/`pasteur` : global.

---

## 4. Tables transverses

### 4.1 `events` — Événements / programmes

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | **FK → platforms(id) on delete cascade**, not null |
| `titre` | text | not null |
| `description` | text | nullable |
| `lieu` | text | nullable |
| `est_en_ligne` | boolean | not null default false |
| `lien_visio` | text | nullable |
| `date_debut` | timestamptz | not null |
| `date_fin` | timestamptz | nullable, check `date_fin >= date_debut` |
| `capacite` | integer | nullable, check `> 0` |
| `statut` | event_statut | not null default `'brouillon'` |
| `created_by` | uuid | **FK → members(id) on delete set null**, nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `platform_id`, `date_debut`, `statut`.
> **RLS** : lecture publique si `statut = 'publie'`. Écriture : `responsable_plateforme`+ de la plateforme concernée.

### 4.2 `donations` — Offrandes / dons

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete set null**, nullable (don anonyme possible) |
| `platform_id` | uuid | **FK → platforms(id) on delete set null**, nullable |
| `type` | donation_type | not null default `'offrande'` |
| `montant` | numeric(12,2) | not null, check `> 0` |
| `devise` | text | not null default `'EUR'` (ISO-4217) |
| `methode` | text | nullable (`carte`, `virement`, `especes`, `mobile_money`...) |
| `reference_externe` | text | nullable (id Stripe/PSP), unique-soft |
| `est_recurrent` | boolean | not null default false |
| `statut_paiement` | text | check in (`en_attente`,`reussi`,`echoue`,`rembourse`) default `'reussi'` |
| `donne_le` | timestamptz | not null default now() |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `member_id`, `platform_id`, `donne_le`, `reference_externe`.
> **RLS** (financière, sensible) : le donateur lit ses propres dons. Lecture agrégée/détaillée réservée à `pasteur`/`admin` (et `responsable_plateforme` limité à sa plateforme, sans PII croisée). Insertion via service role / webhook PSP.

### 4.3 `prayer_requests` — Demandes de prière

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete set null**, nullable |
| `platform_id` | uuid | **FK → platforms(id) on delete set null**, nullable |
| `sujet` | text | nullable |
| `contenu` | text | not null |
| `est_anonyme` | boolean | not null default false |
| `est_public` | boolean | not null default false (affichable sur mur de prière) |
| `statut` | prayer_statut | not null default `'nouvelle'` |
| `assigne_a` | uuid | **FK → members(id) on delete set null**, nullable (intercesseur) |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `statut`, `platform_id`, `assigne_a`.
> **RLS** (sensible) : l'auteur lit/modifie sa demande. Les intercesseurs (`serviteur`+ assignés) et `pasteur`/`admin` lisent. Les demandes `est_public = true` et non `est_anonyme` peuvent être lues par les membres authentifiés.

### 4.4 `form_submissions` — Leads / soumissions de formulaire

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | **FK → platforms(id) on delete set null**, nullable |
| `member_id` | uuid | **FK → members(id) on delete set null**, nullable (rattaché si identifié) |
| `form_slug` | text | not null (identifiant du formulaire source) |
| `payload` | jsonb | not null default `'{}'` (champs libres) |
| `email` | text | nullable |
| `telephone` | text | nullable |
| `source` | text | nullable (campagne / UTM) |
| `traite` | boolean | not null default false |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `platform_id`, `form_slug`, `member_id`, GIN sur `payload`.
> **RLS** : insertion publique/anonyme autorisée (capture de lead). Lecture réservée à `responsable_plateforme`+ de la plateforme.

### 4.5 `notifications` — Notifications multi-canal

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null (destinataire) |
| `platform_id` | uuid | **FK → platforms(id) on delete set null**, nullable |
| `canal` | notif_canal | not null default `'in_app'` |
| `titre` | text | not null |
| `corps` | text | nullable |
| `lien` | text | nullable |
| `lu_at` | timestamptz | nullable |
| `envoye_at` | timestamptz | nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `(member_id, lu_at)`, `created_at`.
> **RLS** : le destinataire lit/marque comme lues **ses** notifications. Insertion via service role.

### 4.6 `analytics_events` — Tracking (visiteurs / pages / clics)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | **FK → platforms(id) on delete set null**, nullable |
| `member_id` | uuid | **FK → members(id) on delete set null**, nullable (anonyme si null) |
| `session_id` | text | nullable (visiteur non identifié) |
| `event_type` | text | not null (`page_view`, `click`, `cta`, `scroll`, `form_open`...) |
| `path` | text | nullable (URL/route) |
| `referrer` | text | nullable |
| `utm` | jsonb | nullable |
| `metadata` | jsonb | not null default `'{}'` |
| `occurred_at` | timestamptz | not null default now() |
| `created_at` | timestamptz | (pas d'`updated_at` — table append-only) |

> **Volume** : table à fort volume → envisager partitionnement par `occurred_at` (mensuel) et rétention.
> **Index** : `(platform_id, occurred_at)`, `event_type`, `session_id`.
> **RLS** : insertion publique (tracking anonyme). Lecture agrégée réservée à `responsable_plateforme`+ / `admin`. Aucun accès membre.

---

## 5. `integration_journeys` — Tunnel d'intégration matérialisé

Un parcours par couple membre/plateforme. Jalons booléens + horodatages.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `platform_id` | uuid | **FK → platforms(id) on delete cascade**, not null |
| `a_rempli_formulaire` | boolean | not null default false |
| `a_rempli_formulaire_at` | timestamptz | nullable |
| `a_rejoint_whatsapp` | boolean | not null default false |
| `a_rejoint_whatsapp_at` | timestamptz | nullable |
| `a_suivi_parcours` | boolean | not null default false |
| `a_suivi_parcours_at` | timestamptz | nullable |
| `a_participe_programme` | boolean | not null default false |
| `a_participe_programme_at` | timestamptz | nullable |
| `est_devenu_membre` | boolean | not null default false |
| `est_devenu_membre_at` | timestamptz | nullable |
| `stage_courant` | tunnel_stage | not null default `'visiteur'` (étape calculée) |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (member_id, platform_id)` — un seul parcours actif par plateforme.
> **Cohérence** : chaque flag `true` doit avoir son `*_at` renseigné (trigger d'horodatage). `stage_courant` synchronisé avec `members.tunnel_stage` (max global) via trigger applicatif.
> **Index** : `member_id`, `platform_id`, `stage_courant`.
> **RLS** (sensible) : le membre lit son parcours. `serviteur`+/`responsable_plateforme` de la plateforme suivent les parcours. `pasteur`/`admin` : global.

---

## 6. Système de rôles & RBAC

### 6.1 `roles` — Référentiel des rôles (table de définition)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `key` | role_key | **unique, not null** |
| `label` | text | not null |
| `description` | text | nullable |
| `niveau` | integer | not null (rang hiérarchique, voir ci-dessous) |
| `est_global_only` | boolean | not null default false (ex: `admin`, `pasteur` = portée globale) |
| `created_at` / `updated_at` | timestamptz | |

**Seed des rôles (du plus bas au plus haut `niveau`) :**

| key | label | niveau | portée |
|---|---|---|---|
| `visiteur` | Visiteur | 0 | global |
| `membre` | Membre | 10 | par plateforme |
| `serviteur` | Serviteur | 20 | par plateforme |
| `leader_cellule` | Leader de cellule | 30 | par plateforme |
| `responsable_plateforme` | Responsable de plateforme | 40 | par plateforme |
| `pasteur` | Pasteur | 90 | global |
| `admin` | Administrateur | 100 | global |

### 6.2 Principe RBAC (double portée)

- **Rôle global** : `members.role_global` (role_key). Détermine les droits transverses (ex: `admin`, `pasteur` voient tout ; `visiteur` par défaut). C'est le **plancher** de droits de l'utilisateur sur l'ensemble de la plateforme.
- **Rôle par plateforme** : `memberships.role` (role_key). Détermine les droits **contextuels** dans une plateforme fille donnée (un membre peut être `serviteur` à la Jeunesse et `responsable_plateforme` à Mahanaïm).
- **Résolution effective d'un droit** sur une ressource de plateforme `P` :
  `niveau_effectif(user, P) = max( niveau(role_global), niveau(membership.role WHERE platform_id = P) )`.
- **Hiérarchie** : un `niveau` supérieur hérite des droits des niveaux inférieurs.
- **Implémentation RLS** : exposer des fonctions `SECURITY DEFINER` réutilisables, ex :
  - `current_member_id() → uuid` (résout `members.id` depuis `auth.uid()`).
  - `has_global_role(min role_key) → boolean`.
  - `has_platform_role(p uuid, min role_key) → boolean` (combine global + membership).
  Toutes les policies des modules filles s'appuient sur ces helpers — **ne pas réécrire la logique RBAC dans chaque module**.

---

## 7. Récapitulatif des FK (graphe d'intégrité)

```text
platforms.parent_id              → platforms.id            (on delete set null)
members.auth_user_id             → auth.users.id           (on delete set null)
memberships.member_id            → members.id              (on delete cascade)
memberships.platform_id          → platforms.id            (on delete cascade)
events.platform_id               → platforms.id            (on delete cascade)
events.created_by                → members.id              (on delete set null)
donations.member_id              → members.id              (on delete set null)
donations.platform_id            → platforms.id            (on delete set null)
prayer_requests.member_id        → members.id              (on delete set null)
prayer_requests.platform_id      → platforms.id            (on delete set null)
prayer_requests.assigne_a        → members.id              (on delete set null)
form_submissions.platform_id     → platforms.id            (on delete set null)
form_submissions.member_id       → members.id              (on delete set null)
notifications.member_id          → members.id              (on delete cascade)
notifications.platform_id        → platforms.id            (on delete set null)
analytics_events.platform_id     → platforms.id            (on delete set null)
analytics_events.member_id       → members.id              (on delete set null)
integration_journeys.member_id   → members.id              (on delete cascade)
integration_journeys.platform_id → platforms.id            (on delete cascade)
```

---

## 8. Règles imposées aux 8 modules filles

1. **Préfixe obligatoire** pour toute table spécifique : `cfic_`, `mahanaim_`, `jeunesse_`, `femmes_`, `refuge_`, `familiale_`, `cellules_`, `cier_`.
2. Toute table fille référençant un membre/une plateforme **doit** utiliser `references members(id)` / `references platforms(id)` — jamais de duplication de profil.
3. Respect strict des conventions universelles (`id` uuid, `created_at`, `updated_at`).
4. RLS **activée par défaut** (`enable row level security`) sur toute table contenant des données membres ; policies basées sur les helpers RBAC du §6.2.
5. Pas de nouvel enum de rôle dans un module : réutiliser `role_key`.
6. Les compteurs d'engagement et l'avancement de tunnel passent **uniquement** par `members.score_engagement` et `integration_journeys` (source de vérité unique).
