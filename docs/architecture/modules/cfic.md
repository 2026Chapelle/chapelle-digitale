# Module — CFIC — Centre de Formation

> Plateforme `cfic` · fondée sur [le core](../01-core-schema.md).

# Module CFIC — Centre de Formation (slug: `cfic`)

> Plateforme `type = 'formation'`, `parent = cier`. Domaine : formation biblique, parcours certifiants (école). S'appuie intégralement sur le core (`members`, `platforms`, `memberships`, `events`, `integration_journeys`, RBAC §6).

---

## 1. Tables spécifiques (`cfic_…`)

### 1.1 Énumérations propres au module

```text
cfic_cursus_niveau   : 'fondations' | 'disciple' | 'leadership' | 'theologie' (text + CHECK — susceptible d'évoluer)
cfic_inscription_statut : 'inscrit' | 'en_cours' | 'termine' | 'certifie' | 'abandonne' | 'suspendu'
cfic_lecon_type      : 'video' | 'texte' | 'quiz' | 'devoir' | 'live'
cfic_progression_statut : 'non_commence' | 'en_cours' | 'complete'
cfic_certif_statut   : 'emise' | 'revoquee' | 'expiree'
```

### 1.2 `cfic_cursus` — Catalogue de cursus (programmes diplômants)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | FK → platforms(id) on delete cascade, not null (toujours = `cfic`) |
| `slug` | text | unique, not null |
| `titre` | text | not null |
| `description` | text | nullable |
| `niveau` | text | not null, CHECK in `cfic_cursus_niveau` |
| `duree_estimee_h` | integer | nullable, check `> 0` |
| `prerequis_cursus_id` | uuid | FK → cfic_cursus(id) on delete set null, nullable (chaînage de niveaux) |
| `note_minimale` | numeric(5,2) | not null default 70.00 (seuil de certification, %) |
| `certifiant` | boolean | not null default true |
| `ordre` | integer | not null default 0 (tri vitrine) |
| `actif` | boolean | not null default true |
| `created_at` / `updated_at` | timestamptz | |

> RLS : lecture publique si `actif = true` (vitrine catalogue). Écriture `responsable_plateforme`+ de `cfic`.

### 1.3 `cfic_modules` — Modules d'un cursus

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `cursus_id` | uuid | FK → cfic_cursus(id) on delete cascade, not null |
| `titre` | text | not null |
| `description` | text | nullable |
| `ordre` | integer | not null default 0 |
| `created_at` / `updated_at` | timestamptz | |

> RLS : lecture liée à l'accès du cursus parent. Écriture `responsable_plateforme`+.

### 1.4 `cfic_lecons` — Leçons d'un module

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `module_id` | uuid | FK → cfic_modules(id) on delete cascade, not null |
| `titre` | text | not null |
| `type` | text | not null, CHECK in `cfic_lecon_type` |
| `contenu_url` | text | nullable (vidéo / support) |
| `contenu_texte` | text | nullable |
| `duree_min` | integer | nullable, check `> 0` |
| `event_id` | uuid | FK → events(id) on delete set null, nullable (si `type = 'live'`, rattache une session core) |
| `ordre` | integer | not null default 0 |
| `obligatoire` | boolean | not null default true |
| `created_at` / `updated_at` | timestamptz | |

> RLS : lecture réservée aux inscrits du cursus + `serviteur`(formateur)+. Écriture `responsable_plateforme`+.

### 1.5 `cfic_inscriptions` — Inscription d'un membre à un cursus

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | FK → members(id) on delete cascade, not null |
| `cursus_id` | uuid | FK → cfic_cursus(id) on delete cascade, not null |
| `statut` | text | not null default `'inscrit'`, CHECK in `cfic_inscription_statut` |
| `formateur_id` | uuid | FK → members(id) on delete set null, nullable (tuteur assigné) |
| `progression_pct` | numeric(5,2) | not null default 0, check `between 0 and 100` (dérivé, mis à jour par trigger) |
| `note_finale` | numeric(5,2) | nullable, check `between 0 and 100` |
| `inscrit_le` | timestamptz | not null default now() |
| `termine_le` | timestamptz | nullable |
| `abandonne_le` | timestamptz | nullable |
| `derniere_activite_at` | timestamptz | nullable (pour détection d'absence/abandon) |
| `created_at` / `updated_at` | timestamptz | |

> Contrainte : `unique (member_id, cursus_id)`. Index : `member_id`, `cursus_id`, `statut`, `derniere_activite_at`.
> RLS (sensible) : l'étudiant lit/modifie sa propre inscription ; le `formateur_id` assigné et `responsable_plateforme`+ de `cfic` lisent celles de leur plateforme ; `pasteur`/`admin` global.

### 1.6 `cfic_progressions` — Avancement par leçon

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `inscription_id` | uuid | FK → cfic_inscriptions(id) on delete cascade, not null |
| `lecon_id` | uuid | FK → cfic_lecons(id) on delete cascade, not null |
| `statut` | text | not null default `'non_commence'`, CHECK in `cfic_progression_statut` |
| `temps_passe_min` | integer | not null default 0, check `>= 0` |
| `complete_le` | timestamptz | nullable |
| `created_at` / `updated_at` | timestamptz | |

> Contrainte : `unique (inscription_id, lecon_id)`. Index : `inscription_id`, `lecon_id`, `statut`.
> RLS (sensible) : l'étudiant propriétaire (via inscription) + formateur assigné + `responsable_plateforme`+.

### 1.7 `cfic_evaluations` — Quiz / devoirs notés

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `inscription_id` | uuid | FK → cfic_inscriptions(id) on delete cascade, not null |
| `lecon_id` | uuid | FK → cfic_lecons(id) on delete set null, nullable |
| `titre` | text | not null |
| `note` | numeric(5,2) | nullable, check `between 0 and 100` |
| `note_max` | numeric(5,2) | not null default 100 |
| `reponses` | jsonb | not null default `'{}'` |
| `corrige_par` | uuid | FK → members(id) on delete set null, nullable (formateur correcteur) |
| `soumis_le` | timestamptz | nullable |
| `corrige_le` | timestamptz | nullable |
| `created_at` / `updated_at` | timestamptz | |

> Index : `inscription_id`, `lecon_id`. RLS (sensible) : étudiant lit ses notes ; correcteur/formateur + `responsable_plateforme`+ écrivent/corrigent.

### 1.8 `cfic_certifications` — Certificats émis

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `inscription_id` | uuid | FK → cfic_inscriptions(id) on delete cascade, not null, **unique** (1 certif / inscription) |
| `member_id` | uuid | FK → members(id) on delete cascade, not null (dénormalisé pour vérif publique) |
| `cursus_id` | uuid | FK → cfic_cursus(id) on delete set null, nullable |
| `numero` | text | unique, not null (référence vérifiable, ex: `CFIC-2026-000123`) |
| `note_obtenue` | numeric(5,2) | not null |
| `statut` | text | not null default `'emise'`, CHECK in `cfic_certif_statut` |
| `url_pdf` | text | nullable |
| `emise_le` | timestamptz | not null default now() |
| `expire_le` | timestamptz | nullable |
| `created_at` / `updated_at` | timestamptz | |

> Index : `member_id`, `cursus_id`, `numero`. RLS : titulaire lit la sienne ; vérification publique par `numero` (vue/RPC dédiée exposant uniquement statut + cursus, sans PII) ; émission/révocation `responsable_plateforme`+.

---

## 2. Parcours utilisateur (visiteur → engagé)

1. **Découverte** — Le visiteur consulte le catalogue public (`cfic_cursus` actifs) depuis la vitrine `cfic`. Tracking via `analytics_events` (`page_view`, `cta`).
2. **Lead** — Il remplit le formulaire « S'inscrire à une formation » → `form_submissions` (`form_slug = 'cfic_preinscription'`). Crée/rattache un `members`.
3. **Adhésion plateforme** — Validation → `memberships` (member ↔ `cfic`, `role = 'membre'`) + jalon `integration_journeys.a_rempli_formulaire`.
4. **Inscription cursus** — Création d'une `cfic_inscriptions` (`statut = 'inscrit'`), assignation d'un `formateur_id`.
5. **Apprentissage** — L'étudiant suit les `cfic_lecons` ; chaque complétion alimente `cfic_progressions` ; les `cfic_evaluations` sont notées. `derniere_activite_at` mise à jour.
6. **Certification** — Cursus terminé + `note_finale >= note_minimale` → `cfic_certifications` émise, `statut = 'certifie'`, montée de `tunnel_stage` vers `disciple`/`serviteur`.

---

## 3. Parcours de progression (jalons internes)

| Jalon interne | Condition | Effet core |
|---|---|---|
| **Inscrit** | `cfic_inscriptions.statut = 'inscrit'` | `a_rempli_formulaire = true` |
| **Apprenant actif** | `progression_pct > 0` + activité < 14 j | `tunnel_stage → 'integration'`, `a_suivi_parcours = true` |
| **Assidu** | `progression_pct >= 50` | `+score_engagement` |
| **Diplômé (niveau)** | `statut = 'certifie'` sur un cursus | `tunnel_stage → 'disciple'`, `a_participe_programme = true` |
| **Cursus de leadership certifié** | certif sur `niveau = 'leadership'` | éligible `tunnel_stage → 'serviteur'` ; promotion `memberships.role → 'serviteur'` (proposée au responsable) |

> Chaînage de niveaux via `cfic_cursus.prerequis_cursus_id` : `fondations` → `disciple` → `leadership` → `theologie`.
> La progression de tunnel passe **exclusivement** par `integration_journeys` + `members.score_engagement` (source unique, règle core §8.6).

---

## 4. Rôles & permissions (spécifiques `cfic`)

| Rôle (core `role_key`) | Portée CFIC | Permissions |
|---|---|---|
| `visiteur` | global | Voir catalogue public (`cfic_cursus.actif`), vérifier un certificat par `numero`. |
| `membre` | `cfic` | S'inscrire à un cursus, suivre ses leçons, voir sa progression/notes/certifs. |
| `serviteur` (= **Formateur/Tuteur**) | `cfic` | Lire les inscriptions où il est `formateur_id`, corriger `cfic_evaluations`, suivre les progressions de ses étudiants. |
| `leader_cellule` | `cfic` | Idem formateur + animer les sessions `live` (leçons `type='live'` liées à `events`). |
| `responsable_plateforme` (= **Directeur école**) | `cfic` | CRUD complet catalogue (`cfic_cursus`/`modules`/`lecons`), assignation formateurs, émission/révocation `cfic_certifications`, accès stats. |
| `pasteur` / `admin` | global | Accès complet transverse. |

> Permissions résolues via helpers core `has_platform_role('cfic'::uuid, …)` — aucune logique RBAC réécrite (§6.2).

---

## 5. Statistiques à suivre

| Indicateur | Définition | Source |
|---|---|---|
| **Étudiants** | Nb de membres avec ≥1 inscription active (`statut in ('inscrit','en_cours','termine','certifie')`). | `cfic_inscriptions` (count distinct `member_id`) |
| **Progression** | Avancement moyen des inscriptions actives. | `avg(cfic_inscriptions.progression_pct)` filtré `statut in ('inscrit','en_cours')` |
| **Certifications** | Nb de certificats valides émis (par période / cursus). | `cfic_certifications` (count where `statut='emise'`) ; ventilation par `cursus_id` |
| **Abandons** | Taux d'abandon = `abandonnées / total inscriptions`. | `cfic_inscriptions` (count `statut='abandonne'` / count total) |
| Taux de certification | `certifie / (termine+certifie+abandonne)`. | `cfic_inscriptions.statut` |
| Inactifs (à risque) | Inscriptions actives sans activité > 21 j. | `cfic_inscriptions.derniere_activite_at` |
| Note moyenne | Moyenne des notes finales des certifiés. | `cfic_inscriptions.note_finale` |
| Engagement formation | Apport CFIC au score global. | `members.score_engagement` (delta attribué par module) |

---

## 6. Workflows automatiques

1. **Inscription → onboarding** : insert `cfic_inscriptions` ⇒ crée les lignes `cfic_progressions` (`non_commence`) pour toutes les leçons obligatoires + `memberships` si absent + jalon `integration_journeys.a_rempli_formulaire = true` (+ horodatage).
2. **Complétion de leçon → recalcul** : update `cfic_progressions.statut = 'complete'` ⇒ recalcul `cfic_inscriptions.progression_pct`, MAJ `derniere_activite_at`, `+score_engagement`. Si 100 % + notes OK ⇒ `statut = 'termine'`.
3. **Détection d'abandon** : job quotidien — inscriptions actives avec `derniere_activite_at < now() - 21 j` ⇒ `statut = 'abandonne'`, `abandonne_le = now()`, notification au formateur. (Réveil possible si reprise d'activité.)
4. **Certification** : `statut → 'termine'` avec `note_finale >= cursus.note_minimale` ⇒ génère `cfic_certifications` (`numero` séquencé), `statut = 'certifie'`, MAJ `integration_journeys.a_participe_programme = true`, montée de `tunnel_stage`, notification + email.

---

## 7. Déclencheurs emails

| Événement | Email | Tag CRM / segment |
|---|---|---|
| `cfic_inscriptions` créée | Bienvenue + accès au cursus, 1ʳᵉ leçon | `cfic_etudiant_actif` |
| Inactivité 7 j (`derniere_activite_at`) | Relance « Reprenez votre formation » | `cfic_relance_inactif` |
| Abandon détecté (workflow 3) | « On vous a perdu ? » + offre de réinscription | `cfic_abandon` |
| Certification émise (workflow 4) | Félicitations + lien certificat PDF + cursus suivant suggéré | `cfic_certifie` |

> Envois tracés dans `notifications` (`canal='email'`, `platform_id = cfic`).

---

## 8. Intégration des membres

- **Entrée** : lead via `form_submissions` (`form_slug='cfic_preinscription'`) ou inscription directe d'un membre existant. Aucun profil dupliqué — réutilisation de `members` (règle core §8.2).
- **Rattachement** : à la 1ʳᵉ inscription, création/activation d'un `memberships` (member ↔ `cfic`, `role='membre'`) ; `cfic_inscriptions` porte le lien pédagogique.
- **Suivi** : avancement matérialisé dans `cfic_progressions`/`cfic_inscriptions` ; le tunnel global reste dans `integration_journeys` (jalons `a_rempli_formulaire`, `a_suivi_parcours`, `a_participe_programme`, `est_devenu_membre`) et `members.tunnel_stage` (max global, jamais régressé par le module).
- **Encadrement** : un `serviteur` (formateur) est assigné via `cfic_inscriptions.formateur_id` ; il suit ses étudiants via RLS (`formateur_id = current_member_id()`).
- **Sortie / promotion** : la certification d'un cursus de leadership peut déclencher une proposition de promotion `memberships.role → 'serviteur'` (validée par le `responsable_plateforme`), alimentant le pipeline de serviteurs de l'écosystème.
