# Module — Cité du Refuge

> Plateforme `cite-refuge` · fondée sur [le core](../01-core-schema.md).

# Module Architecture — Cité du Refuge (`cite-refuge`)

> Plateforme fille de CIER. Type : `ministere`. Domaine : accompagnement, restauration, délivrance, suivi pastoral confidentiel.
> **Sensibilité maximale** : ce module traite des données ultra-confidentielles (situations de crise, addictions, violences, santé mentale, spirituel). RLS stricte par défaut, principe du moindre privilège, anonymisation possible.
> Préfixe des tables spécifiques : `cite_refuge_`. Réutilisation stricte du core (`members`, `platforms`, `memberships`, `events`, `prayer_requests`, `notifications`, `integration_journeys`, helpers RBAC §6.2).

---

## 1. Tables spécifiques (`cite_refuge_…`)

### Énumérations dédiées

```text
refuge_categorie_besoin : 'addiction' | 'deuil' | 'famille_couple' | 'finances' | 'sante_mentale' | 'violences' | 'delivrance' | 'spirituel' | 'autre'
refuge_niveau_urgence   : 'faible' | 'moyen' | 'eleve' | 'critique'
refuge_cas_statut       : 'nouveau' | 'en_evaluation' | 'en_accompagnement' | 'en_pause' | 'restaure' | 'oriente_externe' | 'clos'
refuge_session_type     : 'ecoute' | 'accompagnement' | 'delivrance' | 'pastorale' | 'suivi' | 'groupe'
refuge_session_statut   : 'planifiee' | 'realisee' | 'annulee' | 'no_show'
refuge_milestone_key    : 'prise_en_charge' | 'stabilisation' | 'travail_de_fond' | 'consolidation' | 'restauration' | 'rechute'
```

### 1.1 `cite_refuge_cases` — Dossier d'accompagnement (cas suivi)

Unité centrale du module : un dossier confidentiel par personne accompagnée sur cette plateforme.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | FK → platforms(id) on delete cascade, not null (toujours la plateforme `cite-refuge`) |
| `member_id` | uuid | FK → members(id) on delete set null, nullable (peut démarrer avant création de compte) |
| `reference_dossier` | text | unique, not null (code anonymisable, ex: `CR-2026-0042`) |
| `categorie_principale` | refuge_categorie_besoin | not null |
| `categories_secondaires` | refuge_categorie_besoin[] | nullable |
| `niveau_urgence` | refuge_niveau_urgence | not null default `'moyen'` |
| `statut` | refuge_cas_statut | not null default `'nouveau'` |
| `confidentiel` | boolean | not null default true (restreint la visibilité au seul accompagnateur + pasteur) |
| `accompagnateur_referent_id` | uuid | FK → members(id) on delete set null, nullable |
| `resume_chiffre` | text | nullable (synthèse, accès restreint) |
| `prayer_request_id` | uuid | FK → prayer_requests(id) on delete set null, nullable (lien vers demande de prière liée) |
| `date_ouverture` | timestamptz | not null default now() |
| `date_cloture` | timestamptz | nullable |
| `created_by` | uuid | FK → members(id) on delete set null, nullable |
| `created_at` / `updated_at` | timestamptz | |

> **RLS (critique)** : lecture/écriture limitée à `accompagnateur_referent_id`, aux membres explicitement affectés via `cite_refuge_assignments`, et `pasteur`/`admin`. `responsable_plateforme` ne voit les dossiers `confidentiel = true` qu'en métadonnées (statut, catégorie, urgence) sans `resume_chiffre`. Le membre concerné lit son propre dossier (champs non cliniques). Jamais d'accès anonyme.

### 1.2 `cite_refuge_accompagnants` — Profil accompagnateur / intercesseur

Qualifie les serviteurs habilités à prendre en charge des cas (capacité, spécialités, supervision).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | FK → members(id) on delete cascade, not null, unique |
| `platform_id` | uuid | FK → platforms(id) on delete cascade, not null |
| `specialites` | refuge_categorie_besoin[] | nullable |
| `capacite_max_cas` | integer | not null default 5, check `> 0` |
| `cas_actifs` | integer | not null default 0, check `>= 0` (compteur maintenu par trigger) |
| `est_certifie` | boolean | not null default false |
| `certifie_le` | timestamptz | nullable |
| `superviseur_id` | uuid | FK → members(id) on delete set null, nullable |
| `disponible` | boolean | not null default true |
| `engagement_confidentialite_at` | timestamptz | nullable (charte signée) |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : l'accompagnateur lit/modifie sa fiche (champs non sensibles). `responsable_plateforme`+ gère certifications, capacités et supervision. `pasteur`/`admin` : global.

### 1.3 `cite_refuge_assignments` — Affectation N-N cas ↔ accompagnant

Permet le co-accompagnement (référent + intercesseur + superviseur) et l'historique des affectations.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `case_id` | uuid | FK → cite_refuge_cases(id) on delete cascade, not null |
| `accompagnant_member_id` | uuid | FK → members(id) on delete cascade, not null |
| `role_dans_cas` | text | check in (`referent`,`co_accompagnant`,`intercesseur`,`superviseur`) default `'co_accompagnant'` |
| `actif` | boolean | not null default true |
| `date_debut` | date | not null default current_date |
| `date_fin` | date | nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (case_id, accompagnant_member_id, role_dans_cas)`.
> **RLS (critique)** : seuls les accompagnants affectés au cas et `pasteur`/`admin` lisent. Écriture : `responsable_plateforme`+.

### 1.4 `cite_refuge_sessions` — Sessions / entretiens

Chaque rencontre d'écoute, d'accompagnement, de délivrance ou de suivi.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `case_id` | uuid | FK → cite_refuge_cases(id) on delete cascade, not null |
| `accompagnant_member_id` | uuid | FK → members(id) on delete set null, nullable (animateur) |
| `event_id` | uuid | FK → events(id) on delete set null, nullable (si rattachée à un programme/groupe du core) |
| `type` | refuge_session_type | not null default `'accompagnement'` |
| `statut` | refuge_session_statut | not null default `'planifiee'` |
| `date_prevue` | timestamptz | not null |
| `date_realisee` | timestamptz | nullable |
| `duree_min` | integer | nullable, check `> 0` |
| `est_confidentielle` | boolean | not null default true |
| `notes_chiffrees` | text | nullable (compte-rendu, accès ultra-restreint) |
| `milestone_atteint` | refuge_milestone_key | nullable (jalon validé lors de cette session) |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `case_id`, `date_prevue`, `statut`.
> **RLS (critique)** : accès limité à l'animateur, aux accompagnants affectés au cas et `pasteur`/`admin`. `notes_chiffrees` jamais exposées à `responsable_plateforme`.

### 1.5 `cite_refuge_milestones` — Jalons de restauration

Historique de progression d'un cas (source de vérité du parcours interne).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `case_id` | uuid | FK → cite_refuge_cases(id) on delete cascade, not null |
| `milestone` | refuge_milestone_key | not null |
| `atteint_at` | timestamptz | not null default now() |
| `valide_par` | uuid | FK → members(id) on delete set null, nullable |
| `commentaire` | text | nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (case_id, milestone)` pour les jalons non répétables ; `rechute` peut être multiple → exclure de la contrainte ou suffixer. Index `case_id`.
> **RLS (critique)** : mêmes règles que `cite_refuge_cases`.

### 1.6 `cite_refuge_orientations` — Orientations externes / ressources

Trace les renvois vers ressources externes (professionnel de santé, association, autre ministère).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `case_id` | uuid | FK → cite_refuge_cases(id) on delete cascade, not null |
| `type_ressource` | text | check in (`medical`,`psychologique`,`juridique`,`social`,`ministere_interne`,`autre`), not null |
| `partenaire` | text | nullable |
| `motif` | text | nullable |
| `oriente_le` | timestamptz | not null default now() |
| `suivi_effectue` | boolean | not null default false |
| `created_at` / `updated_at` | timestamptz | |

> **RLS** : accompagnants affectés + `pasteur`/`admin`.

**Rappel core** : l'admission initiale passe par `form_submissions` (`form_slug = 'refuge-demande-aide'`), les demandes de prière par `prayer_requests`, les programmes/groupes par `events`, le suivi de tunnel par `integration_journeys`. Aucune duplication de profil — toujours `references members(id)`.

---

## 2. Parcours utilisateur (visiteur → accompagné)

1. **Découverte / appel à l'aide** — Le visiteur arrive (page vitrine, orientation par un membre, mur de prière). Il soumet une demande via `form_submissions` (`form_slug = 'refuge-demande-aide'`) — possiblement anonyme.
2. **Prise de contact confidentielle** — La demande est triée ; un accompagnateur référent est pré-positionné. Création d'un `cite_refuge_cases` (statut `nouveau`). Le membre est rattaché si identifié.
3. **Évaluation** — Premier entretien d'écoute (`cite_refuge_sessions` type `ecoute`) → catégorisation du besoin, niveau d'urgence, statut `en_evaluation`. Demande de prière liée créée si pertinent (`prayer_requests`).
4. **Accompagnement** — Affectation formalisée (`cite_refuge_assignments`), plan de sessions récurrentes, statut `en_accompagnement`. Progression jalonnée (`cite_refuge_milestones`).
5. **Restauration / consolidation** — Atteinte des jalons `consolidation` puis `restauration` ; le membre peut être orienté vers un ministère d'intégration (Jeunesse, Familles, cellule Mahanaïm).
6. **Clôture & réintégration** — Dossier `restaure` puis `clos`. Mise à jour de `integration_journeys` (le membre poursuit son tunnel CIER comme `disciple`/`membre`).

---

## 3. Parcours de progression (jalons internes)

Source de vérité : `cite_refuge_milestones` (`refuge_milestone_key`), reflété dans `cite_refuge_cases.statut`.

| Niveau | Jalon (`milestone`) | Signification | Statut cas associé |
|---|---|---|---|
| 1 | `prise_en_charge` | Dossier ouvert, référent affecté, première écoute réalisée | `en_evaluation` |
| 2 | `stabilisation` | Situation de crise contenue, cadre de suivi posé | `en_accompagnement` |
| 3 | `travail_de_fond` | Sessions régulières, traitement des racines | `en_accompagnement` |
| 4 | `consolidation` | Acquis durables, espacement des sessions | `en_accompagnement` |
| 5 | `restauration` | Objectifs atteints, réintégration communautaire | `restaure` |
| — | `rechute` | Régression — re-priorise et relance un cycle (peut survenir à tout niveau) | `en_pause` / `en_accompagnement` |

> Articulation avec le tunnel CIER : un cas `restaure` déclenche la mise à jour de `integration_journeys` (`a_participe_programme`, voire `est_devenu_membre`) et peut élever `members.tunnel_stage` (jamais l'inverse — source de vérité unique au core §8.6).

---

## 4. Rôles & permissions (réutilise `role_key`, aucun nouvel enum)

| Acteur | Rôle core | Périmètre dans Cité du Refuge |
|---|---|---|
| Personne accompagnée | `membre` | Lit son propre dossier (champs non cliniques), ses sessions à venir, sa demande de prière. Aucun accès aux notes chiffrées. |
| Accompagnateur / intercesseur | `serviteur` (+ fiche `cite_refuge_accompagnants`) | Lit/écrit **uniquement** les cas auxquels il est affecté (`cite_refuge_assignments`). Crée sessions, jalons, orientations. Pas de vue transverse. |
| Leader de pôle / superviseur | `leader_cellule` | Supervise un groupe d'accompagnateurs (`superviseur_id`), voit les cas de son périmètre, valide les certifications de second niveau. |
| Responsable de plateforme | `responsable_plateforme` | Pilote l'activité : affecte les référents, gère capacités/certifications, voit **métadonnées** des cas (jamais `resume_chiffre`/`notes_chiffrees` des cas `confidentiel = true`). Accès aux stats agrégées. |
| Pasteur / Admin | `pasteur` / `admin` | Accès complet (y compris contenus confidentiels), supervision finale, clôtures sensibles. |

> Résolution via helpers core : `has_platform_role(platform_cite_refuge, 'serviteur')` + filtre d'affectation. La confidentialité ajoute une couche **au-dessus** du RBAC : même un `responsable_plateforme` n'accède pas aux contenus cliniques d'un cas confidentiel. Charte de confidentialité obligatoire (`engagement_confidentialite_at`) avant toute affectation.

---

## 5. Statistiques à suivre

| Indicateur | Définition | Source |
|---|---|---|
| **Cas suivis** | Nombre de dossiers actifs (`statut` ∈ `en_evaluation`, `en_accompagnement`, `en_pause`) | `count(cite_refuge_cases)` filtré sur `statut` |
| **Cas suivis (cumul / nouveaux)** | Dossiers ouverts sur une période | `cite_refuge_cases.date_ouverture` |
| **Accompagnateurs** | Accompagnateurs certifiés et disponibles | `cite_refuge_accompagnants` où `est_certifie = true AND disponible = true` |
| **Charge moyenne** | Cas actifs par accompagnateur | `avg(cite_refuge_accompagnants.cas_actifs)` vs `capacite_max_cas` |
| **Sessions** | Nb de sessions réalisées / planifiées / no-show sur période | `cite_refuge_sessions` groupé par `statut` et `date_realisee` |
| **Taux de présence** | Sessions `realisee` / sessions planifiées | `cite_refuge_sessions.statut` |
| **Restaurations** | Cas ayant atteint le jalon `restauration` (et/ou `statut = restaure`) | `cite_refuge_milestones` où `milestone = 'restauration'` ; recoupé avec `cite_refuge_cases.statut = 'restaure'` |
| **Taux de restauration** | Restaurations / cas clos sur période | `cite_refuge_cases` (`statut` ∈ `restaure`,`clos`) |
| **Délai moyen de restauration** | `restauration.atteint_at − date_ouverture` | `cite_refuge_milestones` + `cite_refuge_cases` |
| **Orientations externes** | Cas renvoyés vers ressources externes | `cite_refuge_orientations` |
| **Rechutes** | Occurrences du jalon `rechute` | `cite_refuge_milestones` où `milestone = 'rechute'` |

> Toutes les stats sont consommées **agrégées** par `responsable_plateforme`+ (jamais de PII croisée sur les cas confidentiels).

---

## 6. Workflows automatiques

1. **Triage à la soumission** — `INSERT` sur `form_submissions` (`form_slug = 'refuge-demande-aide'`) → création auto d'un `cite_refuge_cases` (statut `nouveau`), notification (`notifications`, canal `in_app`) au pool des accompagnateurs `disponible = true` dont les `specialites` matchent la catégorie. Si `niveau_urgence = critique`, alerte immédiate au `responsable_plateforme` + `pasteur`.
2. **Maintien des compteurs & capacité** — Trigger sur `cite_refuge_assignments` (actif true/false) → recalcule `cite_refuge_accompagnants.cas_actifs` ; bascule `disponible = false` quand `cas_actifs >= capacite_max_cas`. Empêche d'affecter un accompagnateur saturé.
3. **Détection d'abandon / décrochage** — Cas en `en_accompagnement` sans session `realisee` depuis 30 jours, ou 2 `no_show` consécutifs → statut `en_pause`, notification au référent et au superviseur pour relance.
4. **Restauration → tunnel** — `INSERT` jalon `restauration` → passe `cite_refuge_cases.statut = restaure`, met à jour `integration_journeys` (`a_participe_programme = true`) et notifie le `responsable_plateforme` pour orientation vers un ministère d'intégration.

---

## 7. Déclencheurs emails

| Événement | Email | Tag CRM / segment |
|---|---|---|
| Création d'un cas (membre identifié) | Accusé de prise en charge confidentielle + cadre de confiance | `refuge_pris_en_charge` |
| Session planifiée / J-1 | Rappel d'entretien (discret, sans détail clinique) | `refuge_session_rappel` |
| 2 `no_show` ou 30 j sans session (cas `en_pause`) | Message de réengagement bienveillant | `refuge_decrochage` |
| Jalon `restauration` atteint | Félicitations + invitation à rejoindre un ministère d'intégration | `refuge_restaure` |
| Certification d'un accompagnateur | Confirmation d'habilitation + rappel charte de confidentialité | `refuge_accompagnant_certifie` |

> Tous les emails respectent la confidentialité : aucun contenu clinique, sujets neutres, expéditeur générique. Envoi via service role (notifications core).

---

## 8. Intégration des membres

1. **Entrée** — Via `form_submissions` (lead, possiblement anonyme) ou orientation interne (un `serviteur` d'une autre plateforme crée le cas). Si la personne a déjà un `members.id`, le cas s'y rattache ; sinon un profil minimal `members` peut être créé (consentement RGPD horodaté) et lié plus tard à `auth.users`.
2. **Rattachement plateforme** — Création d'un `memberships` (member ↔ plateforme `cite-refuge`, rôle `membre`) à l'ouverture du dossier, sans exposer le caractère confidentiel dans les vues transverses.
3. **Suivi** — Le parcours interne vit dans `cite_refuge_cases` / `_sessions` / `_milestones`. L'engagement global remonte au core : incréments de `members.score_engagement` (présence aux sessions) et mise à jour de `integration_journeys` aux jalons clés.
4. **Confidentialité by design** — Le rattachement à Cité du Refuge n'est jamais affiché publiquement ni dans les annuaires inter-plateformes ; seules les personnes affectées (`cite_refuge_assignments`) et `pasteur`/`admin` connaissent l'existence du dossier.
5. **Sortie / réintégration** — À la clôture (`clos`/`restaure`), le membre conserve son `members` et son historique CIER ; il est orienté vers un ministère d'intégration (cellule, Familles, Jeunesse), avec mise à jour de `integration_journeys` et, le cas échéant, élévation de `tunnel_stage`.

> **Note transverse RLS** : sur toute table `cite_refuge_*`, `enable row level security` activée ; policies fondées sur les helpers `current_member_id()`, `has_platform_role()`, complétées par le filtre d'affectation (`cite_refuge_assignments`) et le flag `confidentiel`. Principe directeur : moindre privilège + confidentialité au-dessus du RBAC standard.
