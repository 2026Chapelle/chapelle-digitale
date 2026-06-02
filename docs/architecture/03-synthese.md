# 03 — Synthèse transverse

> Document généré le 2026-05-29 — Architecture de gestion de la Chapelle (CIER).
> 8 plateformes · Supabase · mock aujourd'hui, cible production.
> Conçu par orchestration multi-agents (core → 8 modules → synthèse).

Voici les sections transverses de l'architecture.

---

# Architecture Transverse — Plateforme « Église Digitale » (CIER / La Chapelle)

> **Périmètre** : sections transverses bâties au-dessus du CORE canonique et des 8 modules.
> **Cible** : PostgreSQL 15+ / Supabase. RLS via helpers `current_member_id()`, `has_global_role()`, `has_platform_role()`.
> **Invariants respectés** : profil unique (`members`), appartenances N-N (`memberships`), tunnel unique (`integration_journeys`), scoring unique (`members.score_engagement`).

---

## 1. Relations entre plateformes

### 1.1 Diagramme — CIER hub & rattachement des 7 filles

```text
                                   ┌─────────────────────────────┐
                                   │        platforms             │
                                   │   (type=racine)              │
                                   │   slug = 'cier'              │
                                   │   parent_id = NULL  ◄─── HUB │
                                   └──────────────┬──────────────┘
                                                  │  parent_id (FK → platforms.id, on delete set null)
        ┌──────────────┬──────────────┬──────────┼──────────┬──────────────┬──────────────┐
        ▼              ▼              ▼           ▼          ▼              ▼              ▼
 ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐
 │chapelle-   │ │ jeunesse   │ │cite-refuge │ │ cfic │ │ femmes-    │ │ familles-  │ │mahanaim  │
 │familiale   │ │ ministere  │ │ ministere  │ │forma-│ │ exceptions │ │ chapelle   │ │ cellule  │
 │ culte      │ │            │ │ (confiden- │ │ tion │ │ ministere  │ │ ministere  │ │ (prière) │
 │            │ │            │ │  tiel++)   │ │      │ │            │ │ (cellules) │ │          │
 └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──┬───┘ └─────┬──────┘ └─────┬──────┘ └────┬─────┘
       │              │              │           │          │              │             │
       │  familiale_  │  jeunesse_   │ cite_     │  cfic_   │   femmes_    │  cellules_   │ mahanaim_
       │  (foyers,    │  (profils,   │ refuge_   │  (cursus,│   (cercles,  │  (cellules,  │ (intercessors,
       │   sessions)  │   leaders,   │ (cases,   │   modules│    mentorat) │   reunions)  │  watch_slots,
       │              │   projets,   │  sessions)│  certifs)│              │              │  prayer_log)
       │              │   confs)     │           │          │              │              │
       └──────────────┴──────────────┴───────────┴──────────┴──────────────┴──────────────┘
                                          │
                          Toutes les tables filles référencent :
                          references members(id)  /  references platforms(id)
                          (jamais de duplication de profil — CORE §8.2)
```

### 1.2 Graphe relationnel central (member ↔ memberships ↔ platforms)

```text
                          ┌──────────────────────────────┐
   auth.users  ──(1-1)──► │            members            │  ◄── PROFIL UNIQUE (1 compte)
   (Supabase Auth)        │  id, auth_user_id (unique)    │
                          │  role_global (plancher RBAC)  │
                          │  tunnel_stage (max global)    │
                          │  score_engagement (source U.) │
                          └───────┬───────────────┬───────┘
                                  │ 1             │ 1
                                  │ N             │ N
                    ┌─────────────▼──────┐   ┌────▼─────────────────────┐
                    │     memberships     │   │   integration_journeys   │
                    │  member_id (FK)     │   │  member_id (FK)          │
                    │  platform_id (FK)   │   │  platform_id (FK)        │
                    │  role (par platf.)  │   │  stage_courant           │
                    │  UNIQUE(member,platf)│  │  UNIQUE(member,platf)    │
                    └─────────┬───────────┘   └──────────┬───────────────┘
                              │ N                         │ N
                              │ 1                         │ 1
                    ┌─────────▼──────────────────────────▼───────┐
                    │                 platforms                    │
                    │     (1 racine cier + 7 filles)               │
                    └──────────────────────────────────────────────┘

   Partage transverse (toutes scopées par platform_id) :
   ┌──────────────────┬─────────────────────────────────────────────────────┐
   │ events           │ programmes/cultes/sessions de CHAQUE plateforme       │
   │ donations        │ offrandes/dîmes rattachées à member_id + platform_id  │
   │ prayer_requests  │ demandes de prière (relayées par mahanaim_*)          │
   │ form_submissions │ capture de leads (porte d'entrée de chaque tunnel)    │
   │ notifications    │ canal in_app/email/sms/whatsapp/push par member       │
   │ analytics_events │ tracking append-only (anonyme ou identifié)           │
   └──────────────────┴─────────────────────────────────────────────────────┘
```

### 1.3 Le partage de membre — « un compte, plusieurs appartenances »

- **Un seul `members.id` par personne**, résolu par `email`/`telephone`, lié à `auth.users` à la création du compte. Aucune fille ne duplique le profil : elles l'**étendent** (1-1, ex. `jeunesse_profils`, `femmes_profils`, `mahanaim_intercessors`) ou le **référencent** (FK).
- **Plusieurs `memberships`** : la même personne peut être `serviteur` à la Jeunesse, `leader_cellule` à Mahanaïm et `membre` à CIER. Contrainte `unique(member_id, platform_id)` → une adhésion par couple.
- **Droit effectif sur une plateforme P** : `niveau_effectif = max( niveau(role_global), niveau(membership.role WHERE platform_id = P) )`. Le `role_global` est le **plancher** ; le `membership.role` ajoute le **contextuel**.
- **Tunnel & score centralisés** : il existe un `integration_journeys` par couple (member, platform), mais `members.tunnel_stage` est le **max global** et `members.score_engagement` l'**unique compteur**. Aucune fille ne maintient de score local (CORE §8.6).
- **Aiguillage cross-plateforme** : depuis le hub ou une fille, orienter une personne = créer un nouveau `memberships` sur la plateforme cible — le profil, l'historique et le score restent uniques.
- **Confidentialité Cité du Refuge** : exception de visibilité — l'appartenance `cite-refuge` n'apparaît jamais dans les annuaires inter-plateformes ; couche de confidentialité **au-dessus** du RBAC standard.

---

## 2. Matrice RBAC globale (Rôle × Capacité par domaine)

Légende : **—** aucun accès · **R** lecture · **R+** lecture (périmètre limité / agrégé) · **W** écriture · **Rself/Wself** sa propre donnée uniquement · **(P)** limité à ses plateformes/cellules/cas assignés · **G** global.

| Domaine \ Rôle | `visiteur` | `membre` | `serviteur` | `leader_cellule` | `responsable_plateforme` | `pasteur` | `admin` |
|---|---|---|---|---|---|---|---|
| **Membres / Profils** (`members`, `memberships`, extensions `*_profils`) | — | Rself / Wself | R (P) | R (P, sa cellule/groupe) | R/W (P) | R/W G | R/W G |
| **Finances** (`donations`, `cier_promesses_dons`) | — | Rself dons & promesses | — | — | R+ agrégé (P), sans PII croisée | R/W G | R/W G |
| **Formations** (`cfic_*`, certifs `jeunesse_*`, `cellules_formations_leader`) | R catalogue public | s'inscrire, Rself progression/certifs | corriger/valider (P, ses étudiants) | + animer sessions live (P) | CRUD catalogue & certifs (P) | R/W G | R/W G |
| **Prière** (`prayer_requests`, `mahanaim_*`) | déposer + R mur public | Rself + créer demandes | R demandes assignées + relais (P) | gérer gardes/retraites & relais (P) | R/W (P) | R/W G | R/W G |
| **Contenu** (`events`, cultes/conf/sessions, vitrine, `cier_annuaire_plateformes`, témoignages) | R publié | R publié + s'inscrire | check-in, logistique (P) | créer/animer sessions & réunions (P) | CRUD events & vitrine (P) | + vision (`cier_vision_axes`) G | R/W G |
| **Paramètres / Plateformes** (`platforms`, `roles`, activation, `cier_admin_audit`) | R vitrine `actif=true` | — | — | config de sa cellule | config de sa plateforme | R audit, R/W vision G | R/W G + rôles, bascule plateformes, audit |
| **Cas sensibles** (`cite_refuge_*`, confidentiel) | — | Rself dossier (champs non cliniques) | R/W (cas assignés via `assignments`) | R (périmètre supervisé) | R+ **métadonnées seulement** (pas de contenu clinique) | R/W G (y compris clinique) | R/W G |
| **Analytics** (`analytics_events`) | insert (tracking anonyme) | insert | — | — | R+ agrégé (P) | R G | R G |

> **Notes de résolution**
> - `pasteur` (niveau 90) & `admin` (niveau 100) sont `est_global_only=true` → portée G systématique.
> - Toute policy fille s'appuie sur `has_platform_role(<platform_id>, <min role_key>)` + `current_member_id()` ; **aucune logique RBAC réécrite** (CORE §6.2).
> - **Cité du Refuge** ajoute un filtre d'affectation (`cite_refuge_assignments`) + flag `confidentiel` qui **prime sur le RBAC** : un `responsable_plateforme` ne voit jamais `resume_chiffre` / `notes_chiffrees`.
> - Hiérarchie : un niveau supérieur hérite des capacités des niveaux inférieurs sur le même périmètre.

---

## 3. Dashboard administrateur (back-office global)

### 3.1 Arborescence du back-office

```text
ADMIN / PASTEUR — Back-office global
├── 1. Accueil (Vue d'ensemble)         ◄── KPI exacts ci-dessous
├── 2. Membres
│     ├── Annuaire unifié (members + memberships)
│     ├── Fiche 360° (tunnel, score, dons, présences, plateformes)
│     ├── Fusion de doublons (→ cier_admin_audit)
│     └── Gestion des rôles (role_global / memberships.role)
├── 3. Tunnel & Intégration
│     ├── Entonnoir global (integration_journeys.stage_courant)
│     └── Cohortes & relances
├── 4. Finances
│     ├── Offrandes / Dîmes (donations)
│     ├── Promesses (cier_promesses_dons)
│     └── Avancement vision financière (cier_vision_axes)
├── 5. Formations (cfic_*, jeunesse_certifications, cellules_formations_leader)
├── 6. Prière (prayer_requests, mahanaim_* — agrégats, anonymisé)
├── 7. Événements & Cultes (events, cier_cultes, présences)
├── 8. Plateformes (8 vues filles — voir 3.3)
├── 9. Notifications & Emails (file, segments, taux d'ouverture)
├── 10. Analytics (analytics_events — audience, conversion)
└── 11. Paramètres (platforms, roles, activation, audit cier_admin_audit)
```

### 3.2 Cartes KPI de l'écran d'accueil (les 6 imposées)

| Carte KPI | Définition | Requête source |
|---|---|---|
| **Visiteurs aujourd'hui** | Sessions distinctes du jour | `count(distinct session_id)` sur `analytics_events` WHERE `event_type='page_view'` AND `occurred_at::date = current_date` |
| **Nouveaux inscrits** | Membres créés aujourd'hui (ou période) | `count(*)` sur `members` WHERE `created_at::date = current_date` ; complément `memberships.date_adhesion = current_date` |
| **Demandes de prière** | Demandes ouvertes (`nouvelle`/`en_cours`) | `count(*)` sur `prayer_requests` WHERE `statut IN ('nouvelle','en_cours')` |
| **Offrandes** | Total réussi sur la période courante | `sum(montant)` sur `donations` WHERE `statut_paiement='reussi'` AND `donne_le >= date_trunc('month', now())` |
| **Formations actives** | Cursus CFIC actifs / inscriptions en cours | `count(*)` sur `cfic_cursus` WHERE `actif=true` ; détail `cfic_inscriptions` WHERE `statut IN ('inscrit','en_cours')` |
| **Événements à venir** | Événements publiés futurs | `count(*)` sur `events` WHERE `statut='publie'` AND `date_debut >= now()` |

> Filtres globaux d'en-tête : **période** (jour / semaine / mois / 90j), **plateforme** (toutes ou une fille), **comparatif** (vs période précédente, delta %).

### 3.3 Vue par plateforme (drill-down — répétée pour les 8)

```text
┌── PLATEFORME : <nom>  (type · slug · actif ▣) ──────────────────────────┐
│ Membres rattachés ····· memberships(platform_id=P, statut='actif')       │
│ Visiteurs (30j) ········ analytics_events distinct session_id (P)        │
│ Tunnel ················· integration_journeys.stage_courant (P) [barre]   │
│ Offrandes (mois) ······· donations sum (platform_id=P, reussi)           │
│ Événements à venir ····· events publie futurs (P)                        │
│ Demandes de prière ····· prayer_requests ouvertes (P)                    │
│ Engagement moyen ······· avg(members.score_engagement) via memberships(P)│
│ KPI métier spécifique ── (voir mapping ci-dessous)                       │
└──────────────────────────────────────────────────────────────────────────┘
```

| Plateforme | KPI métier spécifique affiché |
|---|---|
| `cier` | Présences cultes (`cier_presences_culte`), avancement vision (`cier_vision_axes`), taux d'honoration promesses |
| `chapelle-familiale` | Familles suivies, sessions couples, ateliers parentalité (`familiale_*`) |
| `jeunesse` | Leaders actifs, entrepreneurs, conférences/inscriptions (`jeunesse_*`) |
| `cite-refuge` | Cas suivis, accompagnateurs dispo, restaurations (**agrégés, sans PII**) |
| `cfic` | Étudiants, progression moyenne, certifications, abandons |
| `femmes-exceptions` | Participantes, retraites, conférences, cercles actifs |
| `familles-chapelle` | Cellules actives, leaders, participants, multiplications |
| `mahanaim` | Intercesseurs actifs, heures de prière cumulées, sentinelles, couverture 24/7 |

---

## 4. Statistiques globales à suivre (consolidé)

| Catégorie | KPI | Définition | Source (table.colonne) |
|---|---|---|---|
| **Acquisition** | Visiteurs uniques | Sessions distinctes sur période | `analytics_events` distinct `session_id` WHERE `event_type='page_view'` |
| Acquisition | Nouveaux leads | Soumissions de formulaire | `form_submissions` (count, par `form_slug`/`platform_id`) |
| Acquisition | Nouveaux membres | Profils créés | `members.created_at` ; `memberships.date_adhesion` |
| Acquisition | Taux de conversion visiteur→lead | leads / sessions | `form_submissions` ÷ `analytics_events` |
| **Engagement** | Score d'engagement moyen | Moyenne globale / par plateforme | `avg(members.score_engagement)` (jointure `memberships`) |
| Engagement | Présences cultes | Check-ins | `cier_presences_culte` (count, par `mode`) |
| Engagement | Participants actifs cellules | Membres actifs en foyer | `cellules_membres_cellule` WHERE `est_actif=true` |
| Engagement | Heures de prière | Minutes cumulées | `sum(mahanaim_prayer_log.duree_minutes)` |
| Engagement | Taux de participation events | présents / inscrits | `*_inscriptions`/présences vs `events.capacite` |
| **Rétention** | Progression du tunnel | Répartition par stage | `integration_journeys.stage_courant` (group by) |
| Rétention | Taux de conversion tunnel | `membre` / `contact` | `integration_journeys` / `members.tunnel_stage` |
| Rétention | Membres inactifs (à risque) | Sans activité > 30j | `members` recoupé présences/logs/`derniere_activite_at` |
| Rétention | Taux d'abandon formation | abandons / inscriptions | `cfic_inscriptions` `statut='abandonne'` |
| **Finances** | Offrandes & dîmes | Somme réussie | `donations.montant` WHERE `statut_paiement='reussi'` (par `type`) |
| Finances | Dons récurrents | Part de `est_recurrent` | `donations` WHERE `est_recurrent=true` |
| Finances | Taux d'honoration promesses | `honoree` / total | `cier_promesses_dons.statut` |
| Finances | Avancement vision | `valeur_courante / objectif_chiffre` | `cier_vision_axes` |
| **Formation** | Étudiants actifs | Inscriptions actives | `cfic_inscriptions` `statut IN ('inscrit','en_cours')` |
| Formation | Certifications émises | Certificats valides | `cfic_certifications` `statut='emise'` + `jeunesse_certifications` `obtenue` |
| Formation | Progression moyenne | Avancement % | `avg(cfic_inscriptions.progression_pct)` |
| **Prière** | Demandes (par statut) | Volume & exaucées | `prayer_requests` group by `statut` |
| Prière | Taux d'exaucement | `exaucee` / total | `prayer_requests.statut` |
| Prière | Intercesseurs actifs | Actifs 30j | `mahanaim_intercessors` (`est_actif`, `derniere_activite_at`) |
| Prière | Couverture chaîne 24/7 | créneaux `complet` / total | `mahanaim_watch_slots.statut` |

---

## 5. Système d'intégration des membres (tunnel global)

### 5.1 Modèle de progression — `integration_journeys` (par couple member/platform)

```text
ÉTAPES DU TUNNEL (flags booléens + horodatage *_at, source de vérité unique)

 [visiteur]                                                  members.tunnel_stage
     │   analytics_events (page_view, cta)                   = 'visiteur'
     ▼
 ┌─────────────────────────┐
 │ a_rempli_formulaire (O/N)│  ◄── form_submissions          → 'contact'
 └───────────┬─────────────┘
             ▼
 ┌─────────────────────────┐
 │ a_rejoint_whatsapp (O/N) │  ◄── lien groupe WhatsApp       → 'integration'
 └───────────┬─────────────┘
             ▼
 ┌─────────────────────────┐
 │ a_suivi_parcours   (O/N) │  ◄── cfic_/parcours fondation   → 'disciple'
 └───────────┬─────────────┘
             ▼
 ┌─────────────────────────┐
 │ a_participe_programme(O/N│  ◄── présence culte/session/    (renforce 'integration'+)
 └───────────┬─────────────┘     garde/réunion
             ▼
 ┌─────────────────────────┐
 │ est_devenu_membre  (O/N) │  ◄── memberships(role='membre') → 'membre'
 └───────────┬─────────────┘
             ▼
   [serviteur] → [leader]      ◄── memberships.role élevé      → 'serviteur'/'leader'
                                    + engagement service
```

### 5.2 Mécanique d'avancement

1. **Un parcours par (member, platform)** — contrainte `unique(member_id, platform_id)`. Le membre peut donc avoir un journey distinct par plateforme rejointe.
2. **Horodatage automatique** — chaque flag passé à `true` renseigne son `*_at` (trigger `set_milestone_timestamp`). Cohérence garantie : pas de flag `true` sans `*_at`.
3. **`stage_courant` calculé** — recalculé à chaque mise à jour de jalon selon la table ci-dessus (le plus haut jalon atteint détermine l'étape).
4. **Synchronisation `members.tunnel_stage`** — trigger applicatif `sync_tunnel_stage` : `members.tunnel_stage = max(stage_courant)` sur **tous** les journeys du membre. **Monotone croissant** : jamais de régression automatique (un cas Cité du Refuge ou une absence ne fait pas reculer le stage global).
5. **Alimentation par les filles** — chaque module mappe ses jalons métier vers ces flags (ex. `cfic` → `a_suivi_parcours`/`a_participe_programme` ; `familiale` → bilan/sessions ; `mahanaim` → serment/gardes). Les filles n'écrivent **jamais** un compteur parallèle.

### 5.3 Scoring (`members.score_engagement`, unique)

| Événement | Delta score | Source du trigger |
|---|---|---|
| Soumission formulaire qualifiée | +5 | `form_submissions` |
| Rejoint WhatsApp | +5 | jalon `a_rejoint_whatsapp` |
| Présence (culte / session / garde / réunion) | +10 | `cier_presences_culte`, `*_inscriptions`/présences, `mahanaim_watch_assignments` |
| Complétion leçon / jalon parcours | +5 à +15 | `cfic_progressions`, `*_parcours_*` |
| Certification obtenue | +25 | `cfic_certifications`, `jeunesse_certifications`, `cellules_formations_leader` |
| Don réussi | +15 | `donations` (`statut_paiement='reussi'`) |
| Devenu membre (adhésion) | +20 | `memberships` (`role='membre'`) |
| **Decay inactivité (>30j)** | **−N** | job planifié (voir §6) |

> Règle d'or : **un seul compteur** (`members.score_engagement`, `check >= 0`) et **une seule source de tunnel** (`integration_journeys`). Aucune duplication dans les tables préfixées.

---

## 6. Workflows automatiques globaux

| # | Déclencheur | Action(s) | Tables impactées |
|---|---|---|---|
| **W1** | `INSERT form_submissions` (tout `form_slug`) | Résolution/identité (email/tel) → upsert `members` ; upsert `integration_journeys` (`a_rempli_formulaire=true`, `_at`) ; `tunnel_stage→contact` ; +5 score ; notification interne au responsable de la plateforme | `members`, `integration_journeys`, `notifications` |
| **W2** | `INSERT memberships` (`role='membre'`) | `integration_journeys.est_devenu_membre=true` (+`_at`) ; recalcul `stage_courant` ; `members.tunnel_stage→membre` (max global) ; +20 score ; audit | `integration_journeys`, `members`, `cier_admin_audit`, `notifications` |
| **W3** | Présence enregistrée (check-in culte / session / garde / réunion) | `integration_journeys.a_participe_programme=true` (+`_at`) ; +10 score ; MAJ `derniere_activite_at` métier ; recalcul `stage_courant` | `integration_journeys`, `members`, tables `*_presences`/`*_assignments` |
| **W4** | Don réussi (`donations.statut_paiement='reussi'`) | Rattachement à `cier_promesses_dons` actif si existe ; MAJ `cier_vision_axes.valeur_courante` (axe financier) ; +15 score ; email reçu | `cier_promesses_dons`, `cier_vision_axes`, `members`, `notifications` |
| **W5** | Certification émise (CFIC / jeunesse / cellules) | `integration_journeys.a_participe_programme/a_suivi_parcours=true` ; +25 score ; montée `tunnel_stage` (disciple/serviteur) ; proposition de promotion `memberships.role` au responsable | `integration_journeys`, `members`, `notifications` |
| **W6** | **Job planifié** — inactivité > 30j (aucune présence / log / activité) | `members` taggé « à réengager » ; **decay** `score_engagement` ; notification de relance (canal `whatsapp`/`email`) ; **jamais** de régression de `tunnel_stage` | `members`, `notifications` |
| **W7** | `INSERT roles change / member_merge / platform_toggle` (action admin sensible) | Écriture `cier_admin_audit` (append-only) ; notification aux admins ; invalidation de cache RBAC si rôle modifié | `cier_admin_audit`, `notifications`, `members`/`memberships`/`platforms` |

> Tous les triggers respectent CORE §8.6 (score & tunnel centralisés) et insèrent les communications via `notifications` (service role), conditionnées par `members.consentement_rgpd_at`.

---

## 7. Déclencheurs emails globaux

| Événement | Email | Segment / Tag CRM | Délai |
|---|---|---|---|
| `form_submissions` créé (1ère visite / lead) | Bienvenue + prochaines étapes + lien WhatsApp | `lead_nouveau` (+ tag plateforme) | Immédiat |
| `memberships(role='membre')` créé | Confirmation d'adhésion + onboarding plateforme | `membre_nouveau` | Immédiat |
| 1ère présence (culte / session / garde) | « Heureux de t'avoir vu » + invitation parcours | `premiere_presence` | H+2 après check-in |
| `donations` réussi (offrande / dîme) | Reçu de don + remerciement + impact vision | `donateur` | Immédiat |
| Inscription formation confirmée (`cfic`/`jeunesse`) | Accès cours + 1ère leçon / billet conf | `formation_inscrit` | Immédiat |
| Certification émise | Félicitations + certificat PDF + suite suggérée | `certifie` | Immédiat |
| Inactivité 30j (W6) | « Tu nous manques » + agenda / replay | `inactif_30j` | J+30 sans activité |
| Demande de prière déposée | Accusé « nous prions pour toi » | `priere_recue` | Immédiat |
| J-3 avant événement / retraite | Rappel + infos pratiques (lieu / visio / logistique) | `event_rappel` | J-3 puis J-1/H-1 |
| Promotion de rôle (serviteur/leader/sentinelle) | Félicitations + responsabilités + onboarding rôle | `promotion_role` | Immédiat |

> Routage via `notifications.canal='email'`, insertion service role, respect `consentement_rgpd_at`. Les segments alimentent l'outil d'emailing depuis `integration_journeys` + statuts métier.

---

## 8. Roadmap d'implémentation Supabase (4 phases)

### Phase 1 — Fondation & CORE (Semaines 1–3)
**Mock aujourd'hui → Cible**
- Extension `pgcrypto`, enums Postgres (CORE §0), trigger `set_updated_at`.
- Tables CORE : `platforms` (+ seed des 8), `members`, `memberships`, `roles` (+ seed 7 rôles), `integration_journeys`.
- Helpers `SECURITY DEFINER` : `current_member_id()`, `has_global_role()`, `has_platform_role()`.
- RLS activée + policies de base sur tables sensibles. Auth Supabase branchée (`auth.users` ↔ `members.auth_user_id`).
- **Sortie de phase** : login fonctionnel, profil unique, 8 plateformes seedées, RBAC opérationnel.

### Phase 2 — Tables transverses & capture (Semaines 4–6)
- `events`, `donations`, `prayer_requests`, `form_submissions`, `notifications`, `analytics_events` (+ partitionnement mensuel + rétention sur analytics).
- Tracking front (`analytics_events` insert public) ; formulaires de lead → `form_submissions`.
- Workflows **W1, W3** (lead → member, présence → engagement) en triggers/Edge Functions.
- Intégration PSP (Stripe) via **webhook → service role** pour `donations`.
- **Sortie de phase** : tunnel démarre (visiteur→contact→intégration), dons enregistrés, dashboard KPI accueil (§3.2) alimenté en réel.

### Phase 3 — Modules filles (Semaines 7–12)
- Déploiement des 8 jeux de tables préfixées (`cier_`, `familiale_`, `jeunesse_`, `refuge_`/`cite_refuge_`, `cfic_`, `femmes_`, `cellules_`, `mahanaim_`), chacun avec RLS sur helpers.
- **Cité du Refuge** : couche de confidentialité (filtre `cite_refuge_assignments` + flag `confidentiel`) prioritaire sur RBAC.
- Workflows **W2, W4, W5** (adhésion, don→promesse/vision, certification→promotion) + emails §7.
- Mapping des jalons métier → `integration_journeys` + scoring §5.3 par module.
- **Sortie de phase** : chaque plateforme fonctionnelle, tunnel complet, vues drill-down par plateforme (§3.3).

### Phase 4 — Automatisation, audit & observabilité (Semaines 13–16)
- Jobs planifiés (`pg_cron`/Supabase Scheduled) : **W6** (decay/inactivité), relances, recalcul cohortes.
- `cier_admin_audit` + **W7** (audit des actions sensibles, fusion de membres, bascule plateformes).
- Emailing : segmentation CRM, délais programmés (§7), suivi taux d'ouverture.
- Optimisation : index complémentaires, vues matérialisées pour les KPI agrégés, vérification RLS (tests de non-fuite PII, en particulier Cité du Refuge), rétention analytics.
- **Sortie de phase** : plateforme en production, pilotage par KPI (§4), conformité RGPD (consentement, audit), monitoring opérationnel.

---

**Cohérence garantie** : aucun nom de table CORE/fille modifié ; profil unique (`members`), appartenances (`memberships`), tunnel unique (`integration_journeys`), scoring unique (`members.score_engagement`) ; RLS via helpers CORE §6.2 ; aucun nouvel enum de rôle.
