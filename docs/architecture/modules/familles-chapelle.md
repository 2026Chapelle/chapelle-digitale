# Module — Familles de la Chapelle

> Plateforme `familles-chapelle` · fondée sur [le core](../01-core-schema.md).

# Module « Familles de la Chapelle » — Architecture

> **Plateforme** : `familles-chapelle` (type `ministere`, parent `cier`)
> **Domaine** : Cellules de maison (petits groupes / home cells)
> **Préfixe tables** : `cellules_`
> **Statut core** : conforme au schéma canonique. Réutilise `members`, `platforms`, `memberships`, `events`, `integration_journeys`, `notifications`, `form_submissions`, helpers RBAC §6.2.

---

## 1. Tables spécifiques (`cellules_…`)

### 1.1 Énumérations dédiées

```text
cellules_cellule_statut   : 'active' | 'multiplication' | 'en_pause' | 'fermee'
cellules_freq_reunion     : 'hebdomadaire' | 'bimensuelle' | 'mensuelle'
cellules_role_cellule     : 'leader' | 'co_leader' | 'hote' | 'membre' | 'invite'   -- rôle interne au foyer (≠ role_key core)
cellules_presence_statut  : 'present' | 'absent' | 'excuse' | 'en_ligne'
cellules_certif_statut    : 'en_cours' | 'valide' | 'echoue' | 'expire'
```

> Note : `cellules_role_cellule` décrit la fonction dans le foyer (hôte du logement, co-animateur…) et **ne remplace pas** `role_key`. Le droit RBAC reste porté par `memberships.role` (ex. `leader_cellule`).

### 1.2 `cellules_cellules` — Les cellules de maison

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `platform_id` | uuid | FK → platforms(id) on delete cascade, not null (toujours `familles-chapelle`) |
| `nom` | text | not null |
| `code` | text | unique, not null (ex: `CHA-NORD-01`) |
| `leader_id` | uuid | FK → members(id) on delete set null, nullable |
| `co_leader_id` | uuid | FK → members(id) on delete set null, nullable |
| `cellule_parent_id` | uuid | FK → cellules_cellules(id) on delete set null, nullable (cellule mère après multiplication) |
| `zone` | text | nullable (quartier / secteur géographique) |
| `ville` | text | nullable |
| `pays` | text | nullable (ISO-3166 alpha-2) |
| `latitude` | numeric(9,6) | nullable |
| `longitude` | numeric(9,6) | nullable |
| `jour_reunion` | text | nullable (`lundi`…`dimanche`) |
| `heure_reunion` | time | nullable |
| `frequence` | cellules_freq_reunion | not null default `'hebdomadaire'` |
| `capacite_max` | integer | nullable, check `> 0` |
| `est_en_ligne` | boolean | not null default false |
| `lien_visio` | text | nullable |
| `statut` | cellules_cellule_statut | not null default `'active'` |
| `date_ouverture` | date | nullable |
| `date_fermeture` | date | nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `platform_id`, `leader_id`, `statut`, `(zone, ville)`, `cellule_parent_id`.
> **RLS** : lecture des cellules `statut IN ('active','multiplication')` par membres authentifiés (annuaire de cellules). Écriture réservée à `has_platform_role(platform_id,'leader_cellule')` pour sa propre cellule, et `responsable_plateforme`+ pour toutes.

### 1.3 `cellules_membres_cellule` — Appartenance membre ↔ cellule

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `cellule_id` | uuid | FK → cellules_cellules(id) on delete cascade, not null |
| `member_id` | uuid | FK → members(id) on delete cascade, not null |
| `role_cellule` | cellules_role_cellule | not null default `'membre'` |
| `date_arrivee` | date | not null default current_date |
| `date_depart` | date | nullable |
| `est_actif` | boolean | not null default true |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (cellule_id, member_id)` — une appartenance par couple.
> **Index** : `cellule_id`, `member_id`, `(cellule_id, est_actif)`.
> **RLS** (sensible) : le membre lit sa propre appartenance ; le leader de la cellule lit/gère les membres de **sa** cellule ; `responsable_plateforme`+ global plateforme.

### 1.4 `cellules_reunions` — Séances de cellule

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `cellule_id` | uuid | FK → cellules_cellules(id) on delete cascade, not null |
| `event_id` | uuid | FK → events(id) on delete set null, nullable (si rattachée à un `events` plateforme) |
| `date_reunion` | timestamptz | not null |
| `theme` | text | nullable |
| `support_url` | text | nullable (PDF/lien d'étude) |
| `nb_presents` | integer | not null default 0, check `>= 0` (dénormalisé, maj par trigger) |
| `nb_invites` | integer | not null default 0, check `>= 0` |
| `offrande_montant` | numeric(12,2) | nullable, check `>= 0` |
| `compte_rendu` | text | nullable |
| `statut` | event_statut | not null default `'brouillon'` |
| `created_by` | uuid | FK → members(id) on delete set null, nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `cellule_id`, `date_reunion`, `statut`.
> **RLS** : leader de la cellule (CRUD sur ses réunions) ; `responsable_plateforme`+ lecture/écriture globale plateforme. Pas de lecture anonyme.

### 1.5 `cellules_presences` — Feuille de présence par réunion

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `reunion_id` | uuid | FK → cellules_reunions(id) on delete cascade, not null |
| `member_id` | uuid | FK → members(id) on delete set null, nullable (null si invité non identifié) |
| `nom_invite` | text | nullable (nom libre si non-membre) |
| `statut` | cellules_presence_statut | not null default `'present'` |
| `est_premiere_visite` | boolean | not null default false |
| `created_at` / `updated_at` | timestamptz | |

> **Contrainte** : `unique (reunion_id, member_id)` (partielle, `where member_id is not null`).
> **Index** : `reunion_id`, `member_id`, `statut`.
> **RLS** (sensible) : le leader de la cellule rattachée saisit/lit les présences ; le membre lit ses propres lignes ; `responsable_plateforme`+ global.

### 1.6 `cellules_formations_leader` — Parcours de certification des leaders

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | FK → members(id) on delete cascade, not null |
| `niveau` | text | not null, check in (`hote`,`co_leader_forme`,`leader_certifie`,`superviseur`) |
| `statut` | cellules_certif_statut | not null default `'en_cours'` |
| `formateur_id` | uuid | FK → members(id) on delete set null, nullable |
| `date_debut` | date | nullable |
| `date_certification` | date | nullable |
| `date_expiration` | date | nullable |
| `score` | integer | nullable, check `between 0 and 100` |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `member_id`, `statut`, `niveau`.
> **RLS** : le membre lit ses propres certifications ; `responsable_plateforme`+/formateur (`serviteur`+) gèrent. Pas de lecture anonyme.

### 1.7 `cellules_affectations` — File d'attente / placement des nouveaux

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `member_id` | uuid | FK → members(id) on delete cascade, not null |
| `cellule_id` | uuid | FK → cellules_cellules(id) on delete set null, nullable (null tant que non placé) |
| `form_submission_id` | uuid | FK → form_submissions(id) on delete set null, nullable (lead d'origine) |
| `zone_souhaitee` | text | nullable |
| `statut` | text | not null check in (`en_attente`,`proposee`,`acceptee`,`refusee`,`expiree`) default `'en_attente'` |
| `traite_par` | uuid | FK → members(id) on delete set null, nullable |
| `created_at` / `updated_at` | timestamptz | |

> **Index** : `statut`, `cellule_id`, `member_id`.
> **RLS** : insertion possible via lead (`form_submissions`) ; lecture/traitement par `leader_cellule` (cellule proposée) et `responsable_plateforme`+.

---

## 2. Parcours utilisateur (visiteur → engagé)

1. **Découverte** — Le visiteur arrive sur la vitrine (carte des cellules `cellules_cellules` actives par zone). Tracking via `analytics_events` (`page_view`, `cta`).
2. **Demande de rattachement** — Il remplit le formulaire « Trouver une cellule près de chez moi » → `form_submissions` (`form_slug = 'cellules-rejoindre'`) + création/mise à jour `members`. Jalon `integration_journeys.a_rempli_formulaire = true`.
3. **Affectation** — Le responsable crée une `cellules_affectations` (`en_attente` → `proposee`) et propose une cellule selon `zone_souhaitee` / géoloc.
4. **Première visite** — Le membre assiste à une `cellules_reunions` ; saisie d'une `cellules_presences` (`est_premiere_visite = true`). Jalon `a_participe_programme = true`.
5. **Intégration au foyer** — Création de `cellules_membres_cellule` (`role_cellule = 'membre'`, `est_actif = true`). `memberships` (member ↔ `familles-chapelle`) confirmé en `role = 'membre'`.
6. **Engagement régulier** — Présences récurrentes, montée du `score_engagement`, éventuel passage `tunnel_stage` → `membre` puis `serviteur`/`leader_cellule`.

---

## 3. Parcours de progression (jalons internes)

| Niveau interne | Condition d'atteinte | Reflet core |
|---|---|---|
| **Invité** | ≥ 1 présence enregistrée, pas encore dans un foyer | `tunnel_stage='contact'` |
| **Membre de cellule** | `cellules_membres_cellule` actif | `tunnel_stage='integration'`, `memberships.role='membre'` |
| **Membre régulier** | ≥ 4 présences sur 8 dernières réunions | `tunnel_stage='disciple'`, `score_engagement` ↑ |
| **Hôte / Co-leader** | `cellules_formations_leader` niveau `hote`/`co_leader_forme` validé | `tunnel_stage='serviteur'`, `memberships.role='serviteur'` |
| **Leader certifié** | `cellules_formations_leader` niveau `leader_certifie` `valide` | `memberships.role='leader_cellule'`, devient `leader_id` d'une cellule |
| **Superviseur de zone** | Encadre ≥ 3 cellules d'une zone | `memberships.role='responsable_plateforme'` (sur décision) |

> Progression et compteurs passent **uniquement** par `members.score_engagement` et `integration_journeys` (source unique, §8.6 core).

---

## 4. Rôles & permissions

| Acteur | role_key | Périmètre |
|---|---|---|
| **Membre de cellule** | `membre` | Lit l'annuaire des cellules actives ; lit sa propre appartenance, ses présences, son parcours. |
| **Hôte / Serviteur** | `serviteur` | Assiste le leader ; saisit présences de sa cellule ; pas de gestion des membres. |
| **Leader de cellule** | `leader_cellule` | CRUD sur **sa** cellule (`leader_id = self`) : réunions, présences, membres, compte-rendu. Voit les affectations proposées à sa cellule. |
| **Responsable de plateforme** | `responsable_plateforme` | CRUD sur **toutes** les cellules de `familles-chapelle` ; gère affectations, certifications, multiplications, supervise les leaders. |
| **Pasteur / Admin** | `pasteur` / `admin` | Accès global (lecture/écriture), reporting transverse. |

> Résolution via helpers core : `has_platform_role(<familles-chapelle id>, 'leader_cellule')`, etc. Le rôle interne `cellules_role_cellule` (hôte/co-leader) sert l'organisation du foyer, **pas** l'autorisation RLS.

---

## 5. Statistiques à suivre

| Indicateur | Définition | Source |
|---|---|---|
| **Cellules** | Nombre de cellules actives | `count(cellules_cellules) where statut IN ('active','multiplication')` |
| **Leaders** | Nombre de leaders actifs (distincts) | `count(distinct leader_id) from cellules_cellules where statut='active'` ; complément `memberships.role='leader_cellule'` sur la plateforme |
| **Participants** | Membres actifs rattachés à une cellule | `count(distinct member_id) from cellules_membres_cellule where est_actif=true` |
| **Présences** | Taux/volume de présence par réunion | `cellules_presences` (`statut='present'`) ÷ effectif ; agrégat via `cellules_reunions.nb_presents` |
| Taux d'assiduité | Présences / réunions attendues, 8 dernières semaines | `cellules_presences` × `cellules_reunions` |
| Multiplications | Cellules nées d'une mère sur la période | `count(cellules_cellules) where cellule_parent_id is not null` |
| Nouveaux placés | Affectations acceptées / mois | `cellules_affectations where statut='acceptee'` |
| Leaders en formation | Certifications en cours | `cellules_formations_leader where statut='en_cours'` |
| Délai de placement | Médiane `created_at`(affectation) → date 1ʳᵉ présence | `cellules_affectations` ↔ `cellules_presences` |

---

## 6. Workflows automatiques

1. **Lead → affectation** — À l'insertion d'un `form_submissions` (`form_slug='cellules-rejoindre'`) : créer `cellules_affectations` (`en_attente`), upsert `members`, set `integration_journeys.a_rempli_formulaire=true (+ _at)`, notifier le responsable de zone (`notifications` in_app).
2. **Présence → engagement & tunnel** — À la saisie d'une `cellules_presences` (`statut='present'`) : incrémenter `cellules_reunions.nb_presents`, augmenter `members.score_engagement`, et si `est_premiere_visite` set `integration_journeys.a_participe_programme=true`. Au 4ᵉ présent sur 8 réunions → passage `tunnel_stage='disciple'`.
3. **Détection d'absence** — Job planifié : membre `est_actif` sans présence sur 3 réunions consécutives de sa cellule → créer alerte (`notifications` au leader) + flag de relance. 6 réunions → `cellules_membres_cellule.est_actif=false` (sortie douce).
4. **Certification → promotion** — À `cellules_formations_leader.statut='valide'` (niveau `leader_certifie`) : mettre `memberships.role='leader_cellule'`, `members.tunnel_stage='leader'`, déclencher workflow de création/affectation d'une nouvelle cellule (multiplication).

---

## 7. Déclencheurs emails

| Événement déclencheur | Email | Tag CRM / segment |
|---|---|---|
| Insertion `form_submissions` (`cellules-rejoindre`) | « Bienvenue — nous cherchons votre cellule » | `cellules_lead_nouveau` |
| `cellules_affectations.statut='proposee'` | « Votre cellule proposée + coordonnées du leader » | `cellules_affecte` |
| Première `cellules_presences` (`est_premiere_visite=true`) | « Merci pour ta première visite ! » | `cellules_premiere_visite` |
| Absence détectée (workflow 3, 3 réunions) | « Tu nous manques — on prend de tes nouvelles » | `cellules_relance_absent` |
| `cellules_formations_leader` `valide` (leader) | « Félicitations, tu es leader certifié » | `cellules_leader_certifie` |

> Emails envoyés via `notifications` (`canal='email'`) + segmentation CRM par tag ci-dessus.

---

## 8. Intégration des membres

- **Entrée** : un visiteur devient `members` via le formulaire `cellules-rejoindre` (`form_submissions`) ou est ajouté directement par un leader. Aucune duplication de profil — toujours `references members(id)`.
- **Rattachement plateforme** : à l'acceptation, création d'un `memberships` (member ↔ plateforme `familles-chapelle`, `role='membre'`) **et** d'un `cellules_membres_cellule` (lien au foyer précis).
- **Suivi** : `integration_journeys` (couple member/plateforme) matérialise les jalons (formulaire, participation, devenu membre) ; `cellules_presences` alimente l'assiduité ; `members.score_engagement` agrège l'engagement (source unique).
- **Encadrement** : le `leader_id` de la cellule suit ses membres via `cellules_membres_cellule` + présences ; le `responsable_plateforme` supervise via les stats §5 et les affectations en attente.
- **Sortie / transfert** : `cellules_membres_cellule.est_actif=false` (+ `date_depart`) pour une sortie ; transfert = nouvelle ligne sur la cellule cible. Le `members` et son historique d'intégration restent intacts.

---

**Fichiers/artefacts** : ce livrable est une spécification d'architecture (aucun fichier généré). Toutes les tables `cellules_*` ci-dessus s'intègrent au schéma core sans le redéfinir.
