# Module — Mahanaïm — Prière

> Plateforme `mahanaim` · fondée sur [le core](../01-core-schema.md).

# Module d'architecture — Plateforme « Mahanaïm — Prière » (`mahanaim`)

> Domaine : Intercession, veillées, sentinelles. Type core : `cellule`, `parent_id → cier`.
> Toutes les tables ci-dessous réutilisent `members`, `platforms`, `events`, `prayer_requests`, `notifications`, `integration_journeys` du core. Aucune duplication de profil. Préfixe imposé : `mahanaim_`.

---

## 1. Tables spécifiques (`mahanaim_…`)

### 1.1 `mahanaim_intercessors` — Fiche intercesseur (engagement de prière)
Extension métier du membre rattaché à la plateforme. **Ne duplique pas** le profil (FK vers `members`).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null, **unique** |
| `niveau` | text | not null default `'recrue'`, check in (`recrue`,`intercesseur`,`veilleur`,`sentinelle`,`chef_de_garde`) |
| `engagement_hebdo_min` | integer | nullable, check `> 0` (minutes de prière engagées/semaine) |
| `disponibilites` | jsonb | not null default `'{}'` (créneaux : jours/heures préférés) |
| `charismes` | text[] | nullable (ex: `intercession`, `delivrance`, `prophetie`, `louange`) |
| `est_actif` | boolean | not null default true |
| `derniere_activite_at` | timestamptz | nullable (dernière garde/veillée/relais effectué) |
| `serment_at` | timestamptz | nullable (date d'engagement / serment d'intercesseur) |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `member_id`, `niveau`, `(est_actif, derniere_activite_at)`.
> **RLS** : l'intercesseur lit/modifie sa propre fiche (`member_id = current_member_id()`). `leader_cellule`+/`responsable_plateforme` de `mahanaim` lisent et gèrent les fiches de la plateforme. `pasteur`/`admin` global.

### 1.2 `mahanaim_retreats` — Retraites & veillées (programmées)
Spécialisation métier des `events`. Le créneau calendaire reste dans `events` ; cette table porte les attributs propres à la retraite/veillée.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `event_id` | uuid | **FK → events(id) on delete cascade**, not null, **unique** |
| `type_retraite` | text | not null default `'veillee'`, check in (`veillee`,`retraite`,`jeune`,`chaine_priere`,`nuit_priere`) |
| `theme` | text | nullable |
| `intention_principale` | text | nullable (axe d'intercession) |
| `duree_heures` | numeric(5,2) | nullable, check `> 0` |
| `est_chaine_continue` | boolean | not null default false (relais 24/7 → segmenté en `mahanaim_watch_slots`) |
| `responsable_id` | uuid | **FK → members(id) on delete set null**, nullable (chef de garde) |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `event_id`, `type_retraite`, `responsable_id`.
> **RLS** : lecture suivant la visibilité de l'`events` lié (publique si `events.statut='publie'`). Écriture `leader_cellule`+ de `mahanaim`.

### 1.3 `mahanaim_watch_slots` — Créneaux de garde (chaîne de prière 24/7)
Segmentation horaire d'une chaîne/veillée continue, avec affectation des sentinelles.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `retreat_id` | uuid | **FK → mahanaim_retreats(id) on delete cascade**, not null |
| `debut` | timestamptz | not null |
| `fin` | timestamptz | not null, check `fin > debut` |
| `capacite` | integer | nullable, check `> 0` |
| `intention` | text | nullable (sujet du créneau) |
| `statut` | text | not null default `'ouvert'`, check in (`ouvert`,`complet`,`clos`) |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `exclude` ou check applicatif pour éviter le chevauchement sur un même `retreat_id` (optionnel selon besoin de relais parallèles).
> **Index** : `retreat_id`, `(retreat_id, debut)`, `statut`.
> **RLS** : lecture pour membres authentifiés de `mahanaim` ; affectation gérée via `mahanaim_watch_assignments`. Écriture `leader_cellule`+.

### 1.4 `mahanaim_watch_assignments` — Affectation sentinelle ↔ créneau
Relation N-N intercesseur/créneau (qui veille quand).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `slot_id` | uuid | **FK → mahanaim_watch_slots(id) on delete cascade**, not null |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `statut` | text | not null default `'inscrit'`, check in (`inscrit`,`confirme`,`present`,`absent`,`annule`) |
| `confirme_at` | timestamptz | nullable |
| `pointe_at` | timestamptz | nullable (check-in réel du veilleur) |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (slot_id, member_id)`.
> **Index** : `slot_id`, `member_id`, `(member_id, statut)`.
> **RLS** : le membre lit/gère ses propres affectations. `leader_cellule`+ de `mahanaim` voient toutes les affectations. Source d'absence pour le workflow §6.

### 1.5 `mahanaim_prayer_assignments` — Relais d'intercession sur demande de prière
Attribue une `prayer_requests` du core à un ou plusieurs intercesseurs (au-delà du `assigne_a` unique du core).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `prayer_request_id` | uuid | **FK → prayer_requests(id) on delete cascade**, not null |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null (intercesseur) |
| `statut` | text | not null default `'a_prier'`, check in (`a_prier`,`en_cours`,`prie`,`exauce_signale`) |
| `note_intercesseur` | text | nullable (parole, verset, suivi) |
| `prie_at` | timestamptz | nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (prayer_request_id, member_id)`.
> **Index** : `prayer_request_id`, `member_id`, `statut`.
> **RLS** (sensible) : l'intercesseur lit les demandes qui lui sont relayées + ses notes. `leader_cellule`+/`pasteur`/`admin` global. Respecte `prayer_requests.est_anonyme` (masquage de l'auteur côté lecture).

### 1.6 `mahanaim_prayer_log` — Journal de prière (heures cumulées, source d'engagement)
Append-only. Source de vérité des heures de prière individuelles (alimente stats et `members.score_engagement` via trigger applicatif).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | **FK → members(id) on delete cascade**, not null |
| `slot_id` | uuid | **FK → mahanaim_watch_slots(id) on delete set null**, nullable (si lié à une garde) |
| `retreat_id` | uuid | **FK → mahanaim_retreats(id) on delete set null**, nullable |
| `duree_minutes` | integer | not null, check `> 0` |
| `source` | text | not null default `'garde'`, check in (`garde`,`veillee`,`relais`,`personnel`) |
| `effectue_le` | timestamptz | not null default now() |
| `created_at` | timestamptz | (pas d'`updated_at` — append-only) |

> **Index** : `member_id`, `(member_id, effectue_le)`, `retreat_id`.
> **RLS** : le membre lit son propre journal. Agrégats lisibles par `leader_cellule`+/`responsable_plateforme` de `mahanaim`. Insertion via service role / pointage.

---

## 2. Parcours utilisateur (visiteur → engagé)

1. **Découverte** — Le visiteur arrive sur la vitrine `mahanaim` (plateforme `actif=true`, lecture publique). Il voit le mur de prière public (`prayer_requests` `est_public=true`) et les veillées à venir (`events` `publie`). Tracking via `analytics_events`.
2. **Demande / dépôt de prière** — Il soumet une demande via formulaire (`form_submissions`, `form_slug='mahanaim_demande_priere'`) ou crée une `prayer_requests`. Un `members` est créé/rattaché s'il s'identifie.
3. **Adhésion à la cellule** — Création d'un `memberships` (`platform_id=mahanaim`, `role='membre'`) + initialisation d'`integration_journeys`. Invitation au groupe WhatsApp de prière.
4. **Engagement intercesseur** — Le membre remplit le formulaire d'intercesseur → création de `mahanaim_intercessors` (`niveau='recrue'`). Il choisit ses disponibilités et charismes.
5. **Première garde** — Il s'inscrit à un `mahanaim_watch_slots` (`mahanaim_watch_assignments`). Le pointage (`pointe_at`) déclenche un `mahanaim_prayer_log`.
6. **Engagement durable** — Gardes régulières, serment d'intercesseur (`serment_at`), montée en niveau jusqu'à `sentinelle`/`chef_de_garde`.

---

## 3. Parcours de progression (niveaux internes / jalons)

Niveaux portés par `mahanaim_intercessors.niveau`. Cartographie indicative avec `memberships.role` :

| Niveau Mahanaïm | Jalon de passage | Rôle plateforme suggéré (`memberships.role`) |
|---|---|---|
| `recrue` | Fiche intercesseur créée | `membre` |
| `intercesseur` | Serment posé (`serment_at`) + ≥ 3 gardes pointées | `serviteur` |
| `veilleur` | ≥ 12 gardes / ≥ 1 retraite + régularité 30j | `serviteur` |
| `sentinelle` | ≥ 50 h cumulées (`mahanaim_prayer_log`) + chaîne 24/7 tenue | `serviteur` / `leader_cellule` |
| `chef_de_garde` | Responsable d'au moins une garde/retraite (`mahanaim_retreats.responsable_id`) | `leader_cellule` |

> Les jalons s'évaluent depuis `mahanaim_prayer_log` (heures), `mahanaim_watch_assignments` (présence `present`) et `serment_at`. L'avancement de tunnel global passe **uniquement** par `integration_journeys` + `members.score_engagement` (règle core §8.6).

---

## 4. Rôles & permissions spécifiques

Réutilise `role_key` du core. Portée plateforme `mahanaim` via `memberships.role` + helpers `has_platform_role()`.

| Acteur | Rôle core | Droits sur `mahanaim` |
|---|---|---|
| Visiteur | `visiteur` | Voir vitrine, mur public, veillées publiées ; déposer une demande de prière. |
| Membre / Recrue | `membre` | Gérer sa fiche `mahanaim_intercessors`, s'inscrire à des `watch_slots`, voir ses affectations et son `prayer_log`. |
| Intercesseur | `serviteur` | Recevoir des relais (`mahanaim_prayer_assignments`), lire les demandes assignées, pointer ses gardes, ajouter notes. |
| Leader de cellule / Chef de garde | `leader_cellule` | Créer/gérer `mahanaim_retreats` et `watch_slots`, affecter sentinelles, assigner les relais de prière, suivre les fiches intercesseurs de la plateforme. |
| Responsable de plateforme | `responsable_plateforme` | Tout le périmètre `mahanaim` : gestion membres/adhésions, paramétrage, accès stats complètes, validation des montées en niveau. |
| Pasteur / Admin | `pasteur` / `admin` | Accès global, supervision, demandes sensibles/anonymes. |

> Toutes les policies s'appuient sur `current_member_id()`, `has_global_role()`, `has_platform_role(mahanaim_id, …)` — pas de logique RBAC réécrite.

---

## 5. Statistiques à suivre

| Indicateur | Définition | Source |
|---|---|---|
| **Intercesseurs actifs** | Intercesseurs avec `est_actif=true` ET au moins une activité de prière (garde pointée ou log) sur 30 j glissants. | `mahanaim_intercessors` (`est_actif`, `derniere_activite_at`) recoupé avec `mahanaim_prayer_log.effectue_le`. |
| **Retraites** | Nombre de retraites/veillées sur la période (par `type_retraite`). | `mahanaim_retreats` jointe `events` (`date_debut` pour le filtre période, `statut`). |
| **Participants** | Nombre de membres distincts ayant participé (présence effective) à une retraite/garde. | `mahanaim_watch_assignments` où `statut in ('present')` (distinct `member_id`), périmètre via `slot → retreat → event`. |
| **Sentinelles** | Intercesseurs ayant atteint le niveau `sentinelle` ou `chef_de_garde`. | `mahanaim_intercessors.niveau in ('sentinelle','chef_de_garde')`. |

Indicateurs complémentaires : **Heures de prière cumulées** (`SUM(mahanaim_prayer_log.duree_minutes)`), **Taux de présence aux gardes** (`present / inscrit` sur `mahanaim_watch_assignments`), **Demandes exaucées** (`prayer_requests.statut='exaucee'`), **Couverture chaîne 24/7** (créneaux `complet` / total sur une `mahanaim_retreats` `est_chaine_continue=true`).

---

## 6. Workflows automatiques

1. **Inscription à une garde → confirmation + rappel** — À l'insert d'un `mahanaim_watch_assignments` (`statut='inscrit'`), créer une `notifications` de confirmation, puis un rappel J-1 et H-1 avant `slot.debut`.
2. **Pointage de garde → log + engagement** — Quand `pointe_at` est renseigné (`statut='present'`), insérer un `mahanaim_prayer_log` (`duree_minutes` = durée du slot), mettre à jour `mahanaim_intercessors.derniere_activite_at`, et incrémenter `members.score_engagement`.
3. **Absence détectée → relance** — Si `slot.fin` est passé et `mahanaim_watch_assignments.statut` reste `inscrit`/`confirme` sans `pointe_at` → passer à `absent`, notifier le veilleur et alerter le `responsable_id` de la retraite ; après 2 absences/30 j, notifier le leader pour suivi.
4. **Promotion de niveau (certification)** — Trigger d'évaluation des jalons (§3) sur insert `mahanaim_prayer_log` / update `mahanaim_watch_assignments` : si seuils atteints, proposer la montée de `mahanaim_intercessors.niveau` (validation `responsable_plateforme`) et synchroniser `memberships.role` + `integration_journeys`.

---

## 7. Déclencheurs emails

| Événement déclencheur | Email envoyé | Tag CRM / segment |
|---|---|---|
| Création `mahanaim_intercessors` (`niveau='recrue'`) | Bienvenue intercesseur + charte de prière + lien WhatsApp | `mahanaim_intercesseur_nouveau` |
| Affectation `mahanaim_watch_assignments` confirmée | Confirmation de garde (créneau, intention) + rappel J-1 | `mahanaim_garde_confirmee` |
| Demande relayée (`mahanaim_prayer_assignments` insert) | Notification de relais d'intercession (sujet, non-PII si anonyme) | `mahanaim_relais_priere` |
| Promotion vers `sentinelle`/`chef_de_garde` | Félicitations + responsabilités + invitation chaîne 24/7 | `mahanaim_sentinelle_promue` |
| Inactivité 30 j (aucun `prayer_log`) | Email de réengagement « ta sentinelle te manque » | `mahanaim_intercesseur_dormant` |

> Canal effectif via `notifications.canal` (`email`) ; segments alignés sur l'outil CRM/emailing.

---

## 8. Intégration des membres

1. **Entrée** — Un membre rejoint via demande de prière (`form_submissions`/`prayer_requests`) ou candidature intercesseur. Si non identifié, création d'un `members` ; sinon rattachement à l'`members.id` existant (jamais de duplication, core §8.2).
2. **Adhésion** — Création d'un `memberships` (`platform_id=mahanaim`, `role='membre'`) et initialisation d'`integration_journeys` (un parcours par couple membre/plateforme).
3. **Activation** — Jalon `a_rejoint_whatsapp` (groupe de prière), puis création de `mahanaim_intercessors` (`niveau='recrue'`) marquant l'engagement spécifique. `a_rempli_formulaire` validé à la candidature.
4. **Suivi** — La participation aux gardes (`mahanaim_watch_assignments` `present`) coche `a_participe_programme` ; le serment (`serment_at`) et la régularité font progresser `stage_courant` (`integration` → `disciple` → `membre`/`serviteur`).
5. **Source de vérité** — Avancement de tunnel et engagement consolidés exclusivement dans `integration_journeys` + `members.score_engagement` (core §8.6) ; `mahanaim_prayer_log` alimente le score via trigger, sans le dupliquer.
6. **Suivi pastoral** — `leader_cellule`/`responsable_plateforme` suivent les fiches inactives (`derniere_activite_at`), déclenchent relances (§6.3) et valident les promotions (§6.4).

---

Fichiers / livrable : ce document est l'unique livrable d'architecture pour la plateforme `mahanaim`. Aucune table transverse redéfinie ; 6 tables spécifiques préfixées `mahanaim_` ajoutées au-dessus du core.
