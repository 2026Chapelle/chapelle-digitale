# WM-3.1 — Gap 4 · Contrat technique complet de WM-4

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.1` |
| Gap fermé | **G4** — liste des fichiers d'export + registre rejet/quarantaine formalisés |
| Nature | **spécification uniquement** — aucun export produit par ce lot |
| Autorité amont | `WM-3/mapping-20260720/` (mapping verrouillé) — ce contrat ne le modifie pas |
| Marqueur d'ouverture WM-4 | à émettre par WM-4, pas ici |

> Ce document définit ce que WM-4 **devra** produire. Aucun fichier listé ci-dessous n'existe.
> Toute divergence entre ce contrat et un export WM-4 réel est un défaut de WM-4.

---

## 1. Emplacement et nommage

```
docs-migration-wp/WM-4/export-<AAAAMMJJ-HHMMSS>/
  exports/        <- jeux normalisés destinés au chargement
  rejects/        <- lignes écartées définitivement, avec motif
  quarantine/     <- lignes suspendues en attente de décision humaine
  manifests/      <- manifeste, checksums, réconciliation
  reports/        <- rapport WM-4
  private/        <- PII, jamais commité (couvert par docs-migration-wp/.gitignore)
```

Le pointeur `docs-migration-wp/WM-4/_ACTIVE_EXPORT.txt` contient le nom du lot actif, sur le
modèle de `WM-2/_ACTIVE_AUDIT.txt` et `WM-3/_ACTIVE_MAPPING.txt`.

---

## 2. Format et encodage — invariants

| Propriété | Valeur imposée |
|-----------|----------------|
| Format | CSV **RFC 4180** |
| Encodage | **UTF-8 sans BOM** |
| Fin de ligne | **LF** (`\n`) uniquement |
| Séparateur | virgule `,` |
| Guillemet | `"` — doublé pour échappement |
| En-tête | obligatoire, 1 ligne, noms exacts de ce contrat, ordre imposé |
| Valeur nulle | **chaîne vide non quotée** — jamais `NULL`, jamais `\N`, jamais `""` |
| Booléen | `true` / `false` en minuscules |
| Horodatage | ISO 8601 UTC `AAAA-MM-JJTHH:MM:SSZ` |
| Date | `AAAA-MM-JJ` |
| Décimal | point décimal, pas de séparateur de milliers |
| Tri | par la clé primaire technique, croissant, déterministe |
| Reproductibilité | deux exécutions sur la même source produisent des fichiers **bit-identiques** |

Un champ dont la valeur contient `,`, `"`, `\n` ou `\r` **doit** être quoté.
Aucun champ ne contient de retour à la ligne littéral non quoté.

---

## 3. Fichiers d'export attendus

### 3.1 Identités

| Fichier | Source | Cible | Lignes attendues |
|---------|--------|-------|------------------|
| `exports/identities.csv` | `wp_users` + `wp_usermeta` | `auth.users` + `profiles` | **30** |
| `exports/identities-reconcile.csv` | idem | `profiles` (rapprochement, aucune création) | **4** |

`identities.csv` — colonnes :

| # | Colonne | Type | Nullable | Source | Transformation |
|---|---------|------|----------|--------|----------------|
| 1 | `wp_user_id` | integer | non | `wp_users.ID` | identité |
| 2 | `email` | text | non | `wp_users.user_email` | N1 (`NFKC`+`trim`+`lower`) |
| 3 | `email_fingerprint` | text(16) | non | dérivé | `sha256("WM31\|"+email)[:16]` |
| 4 | `prenom` | text | oui | `usermeta.first_name` | `trim` · défaut `''` |
| 5 | `nom` | text | oui | `usermeta.last_name` | `trim` · défaut `''` |
| 6 | `telephone` | text | oui | `usermeta` (clés WM-2 `15-phone-meta-keys.tsv`) | `trim` · vide si absent |
| 7 | `role` | enum `user_role` | non | — | **constante `visiteur`** (WM-3 `force_visiteur`) |
| 8 | `statut` | enum `user_status` | non | — | constante `actif` |
| 9 | `membre_statut` | enum `membre_statut` | non | — | constante `visiteur` |
| 10 | `parcours_disciple_etape` | integer | non | — | **constante `0`** |
| 11 | `plateforme_principale` | enum `plateforme_id` | non | — | constante `cier` |
| 12 | `newsletter` | boolean | non | FluentCRM `status` | `true` si `subscribed`, sinon `false` |
| 13 | `date_inscription` | timestamptz | non | `wp_users.user_registered` | interprété UTC → ISO 8601 |
| 14 | `source_inscription` | text | non | — | constante `migration-wp-wm4` |
| 15 | `integre_via` | text | oui | — | constante `wordpress-chapelle-premium` |

**Interdit d'export** : `user_pass`, `user_activation_key`, `wp_capabilities`, `user_level`,
`session_tokens`. Les mots de passe sont abandonnés (décision WM-3, lock §5).

`identities-reconcile.csv` — colonnes : `wp_user_id`, `email`, `email_fingerprint`,
`citadelle_profile_id`, `match_level` (constante `strict_norm`), `action` (constante
`RAPPROCHER_NO_CREATE`). **Aucune colonne modifiable** : ce fichier documente un rapprochement, il
ne porte aucune écriture de `role`, `membre_statut` ni `parcours_disciple_etape`.

### 3.2 LMS

| Fichier | Source | Cible | Lignes attendues |
|---------|--------|-------|------------------|
| `exports/formations.csv` | `wp_posts` type `courses` | `formations` | **5** (7 − 2 `HORS_CATALOGUE_PUBLIC`) |
| `exports/formation-modules.csv` | `wp_posts` type `lesson` | `formation_modules` | **38** |
| `exports/inscriptions-formation.csv` | `wp_comments` `tutor_enrolled` | `inscriptions_formation` | **33** |

`formations.csv` — colonnes : `wp_course_id`, `slug`, `titre`, `description`, `type`,
`ordre`, `image_couverture`, `statut`, `citadelle_action` (issu de
`WM-3/evidence/course-slug-map.csv`), `wp_thumbnail_attachment_id`.

`formation-modules.csv` — colonnes : `wp_lesson_id`, `wp_course_id`, `formation_slug`,
`titre`, `slug`, `contenu`, `ordre`, `topic_ordre`, `youtube_id`, `video_url`,
`source_classification`, `wm31_decision`.

Règle de peuplement vidéo (WM-3 ADR) : `youtube_id` renseigné pour les 8 leçons YouTube,
`video_url` pour les 3 leçons HTML5, les deux vides sinon. **Jamais** les deux à la fois.

`inscriptions-formation.csv` — colonnes : `wp_comment_id`, `wp_user_id`, `email_fingerprint`,
`wp_course_id`, `formation_slug`, `date_inscription`, `progression` (**constante `0`**),
`termine` (**constante `false`**).

**Interdit d'export** : toute ligne à destination de `video_progress` ou `module_completions`
(WM-3 lock §6, manifest `video_progress_from_wp:false`), toute ligne vers
`modules_formation`, `lecons` ou `academy_*` (tables écartées, WM-3 ADR).

### 3.3 Médias

| Fichier | Source | Cible | Lignes attendues |
|---------|--------|-------|------------------|
| `exports/media-originals.csv` | inventaire WM-3.1 | Supabase Storage | **69** |

Colonnes : `rel_path`, `file_name`, `extension`, `size_bytes`, `mime_type`, `sha256`,
`width`, `height`, `wp_attachment_id`, `classification`, `target_bucket`, `target_path`.

`sha256` est recopié **tel quel** depuis `WM31-PHYSICAL-FILES-INVENTORY.csv` et revérifié à
l'octet lors du contrôle post-export `POST-04`.

### 3.4 Contenus, formulaires, CRM

| Fichier | Source | Cible | Lignes attendues |
|---------|--------|-------|------------------|
| `exports/pages-archive.csv` | `wp_posts` type `page` | archive hors design Next | **56** |
| `exports/forms-definitions.csv` | `wp_fluentform_forms` | recréation manuelle | **7** |
| `exports/crm-subscribers.csv` | `fc_subscribers` | newsletter / CRM | **33** |

`crm-subscribers.csv` porte la règle de désabonnement absolue de WM-3 : toute ligne dont le
statut n'est pas `subscribed` est écartée vers `rejects/`, jamais réactivée.

---

## 4. Registre des rejets

Fichier unique `rejects/rejects.csv`, colonnes imposées :

| Colonne | Type | Description |
|---------|------|-------------|
| `domain` | text | `identity` \| `lms` \| `media` \| `content` \| `forms` \| `crm` |
| `source_table` | text | table ou racine physique d'origine |
| `source_key` | text | identifiant technique dans la source |
| `reject_code` | text | code du §4.1 |
| `reject_reason` | text | phrase courte factuelle |
| `evidence_ref` | text | livrable WM-2 / WM-3 / WM-3.1 qui prouve le rejet |
| `reversible` | boolean | `true` si un lot ultérieur peut reprendre la ligne |

### 4.1 Codes de rejet et volumes attendus

| Code | Domaine | N attendu | Justification |
|------|---------|-----------|---------------|
| `RJ-ID-PRIVILEGED` | identity | 1 | compte administrateur exclu du batch (WM-3 role policy) |
| `RJ-ID-INVALID-EMAIL` | identity | 0 | aucune adresse invalide (WM-3.1 Gap 1) |
| `RJ-ID-DUPLICATE` | identity | 0 | aucun doublon source (WM-3.1 Gap 1) |
| `RJ-LMS-COURSE-PRIVATE` | lms | 2 | `HORS_CATALOGUE_PUBLIC` (WM-3 `course-slug-map.csv`) |
| `RJ-LMS-QUIZ-EMPTY` | lms | 0 | 0 quiz, 0 devoir (WM-2 `55-tutor-content-counts.tsv`) |
| `RJ-LMS-ORDERS-EMPTY` | lms | 0 | 0 commande Tutor |
| `RJ-LMS-PROGRESSION` | lms | 33 | progression jamais importée — niveau initial forcé |
| `RJ-MED-THUMBNAIL` | media | 281 | vignette régénérable |
| `RJ-MED-GENERATED` | media | 8 | artefact de cache plugin régénérable |
| `RJ-MED-DUPLICATE` | media | 23 | doublon exact prouvé par SHA-256 |
| `RJ-MED-CORRUPT` | media | 1 | fichier de taille nulle |
| `RJ-CONTENT-REVISION` | content | 853 | révisions abandonnées (WM-3 §7) |
| `RJ-FORMS-ENTRIES` | forms | 0 | 0 soumission |
| `RJ-CRM-UNSUBSCRIBED` | crm | 0 | règle de désabonnement absolue |

Total média rejeté : `281 + 8 + 23 + 1 = 313`. ✅

---

## 5. Registre des quarantaines

Fichier unique `quarantine/quarantine.csv`, colonnes imposées :

| Colonne | Type | Description |
|---------|------|-------------|
| `domain` | text | domaine concerné |
| `source_key` | text | identifiant technique |
| `quarantine_code` | text | code du §5.1 |
| `blocking` | boolean | `true` si WM-4 ne peut pas se clore sans arbitrage |
| `decision_owner` | text | `pastoral` \| `technique` \| `editorial` |
| `evidence_ref` | text | livrable prouvant la mise en quarantaine |
| `proposed_default` | text | issue par défaut si aucune décision n'est rendue |

### 5.1 Codes de quarantaine et volumes attendus

| Code | Domaine | N attendu | Bloquant | Propriétaire |
|------|---------|-----------|----------|--------------|
| `QU-ID-TARGET-DUPLICATE` | identity | 2 groupes (8 `profiles` redondants) | **oui** | technique |
| `QU-LMS-LESSON-INCOMPLETE` | lms | 19 | non | editorial |
| `QU-MED-ORPHAN` | media | 1 | non | technique |
| `QU-MED-MISSING-REFERENCE` | media | 5 | **oui** | technique |
| `QU-SENSITIVE-PRAYER` | content | 1 | non | pastoral |
| `QU-PII-PRIVATE` | crm | n/a | non | technique |

`QU-MED-MISSING-REFERENCE` : les 3 vidéos HTML5 (`34548`, `34555`, `34577`) et les 2 pièces
jointes de leçon (`34549`, `34553`) référencées mais absentes de la base **et** de la sauvegarde
fichiers (WM-3.1 Gap 3 §6).

`QU-ID-TARGET-DUPLICATE` : 13 `profiles` Citadelle pour 5 boîtes canoniques (WM-3.1 Gap 1 §4).
Bloquant : un import de 30 nouvelles identités sur une table déjà porteuse de doublons aggrave le
défaut au lieu de le contenir.

---

## 6. Formule de réconciliation

Pour **chaque** domaine, sans exception :

```
SOURCE_TOTAL = EXPORTABLE + REJECTED + QUARANTINED
```

Toute différence, même de 1, **bloque WM-4**. Aucun arrondi, aucune tolérance, aucun « environ ».

| Domaine | `SOURCE_TOTAL` | `EXPORTABLE` | `REJECTED` | `QUARANTINED` | Contrôle |
|---------|----------------|--------------|------------|---------------|----------|
| identity | 35 | 34 | 1 | 0 | `34 + 1 + 0 = 35` ✅ |
| lms · cours | 7 | 5 | 2 | 0 | `5 + 2 + 0 = 7` ✅ |
| lms · leçons | 38 | 38 | 0 | 0 | `38 + 0 + 0 = 38` ✅ |
| lms · inscriptions | 33 | 33 | 0 | 0 | `33 + 0 + 0 = 33` ✅ |
| media | 383 | 69 | 313 | 1 | `69 + 313 + 1 = 383` ✅ |
| content · pages | 56 | 56 | 0 | 0 | `56 + 0 + 0 = 56` ✅ |
| forms | 7 | 7 | 0 | 0 | `7 + 0 + 0 = 7` ✅ |
| crm | 33 | 33 | 0 | 0 | `33 + 0 + 0 = 33` ✅ |

Notes de lecture :

- **identity** : `EXPORTABLE = 34` = 30 créations (`identities.csv`) + 4 rapprochements
  (`identities-reconcile.csv`). Les 4 rapprochements sont exportables au sens de la
  réconciliation (ils sortent dans un fichier), pas au sens d'une création de compte.
- **lms · leçons** : les 38 sont exportables. Les 19 `INCOMPLETE` figurent **à la fois** dans
  `formation-modules.csv` et dans `quarantine.csv` avec `blocking=false` : la quarantaine est
  ici un marqueur éditorial, pas un retrait du flux. Elle n'entre donc pas dans le terme
  `QUARANTINED` de l'équation, sous peine de double comptage. Cette convention est **imposée** :
  une ligne ne peut appartenir qu'à **un seul** terme de l'équation.
- **media** : les 5 références manquantes ne sont pas dans les 383 et ne figurent donc dans
  aucun terme de l'équation média ; elles sont suivies uniquement par `QU-MED-MISSING-REFERENCE`.

---

## 7. Contrôles pré-export

Exécutés avant toute écriture de fichier. Un contrôle `BLOQUANT` en échec interdit la production
de l'export.

| ID | Contrôle | Sévérité |
|----|----------|----------|
| `PRE-00` | La sauvegarde WM-1 est intacte : `SHA256SUMS.txt` revérifié sur les 3 artefacts | BLOQUANT |
| `PRE-01` | Le pointeur `WM-3/_ACTIVE_MAPPING.txt` désigne bien `mapping-20260720` | BLOQUANT |
| `PRE-02` | Aucune connexion en écriture ouverte vers WordPress, Supabase ou Citadelle | BLOQUANT |
| `PRE-ID-01` | 35 identités classées, somme des classes = 35 | BLOQUANT |
| `PRE-ID-02` | 0 `INVALID_EMAIL` et 0 `DUPLICATE_SOURCE` dans l'export | BLOQUANT |
| `PRE-ID-03` | 0 groupe de doublons canoniques côté `profiles` Citadelle | **BLOQUANT — en échec (2 groupes)** |
| `PRE-ID-04` | Aucun rapprochement ne réécrit `role` / `membre_statut` / `parcours_disciple_etape` | BLOQUANT |
| `PRE-ID-05` | 0 occurrence de `user_pass` ou `user_activation_key` dans les exports | BLOQUANT |
| `PRE-ID-06` | Le compte privilégié est absent de `identities.csv` | BLOQUANT |
| `PRE-LMS-01` | 38 leçons classées, 11 avec vidéo + 27 sans = 38 | BLOQUANT |
| `PRE-LMS-02` | 7 cours portent chacun une `citadelle_action` | BLOQUANT |
| `PRE-LMS-03` | Toute inscription exportée a `progression = 0` et `termine = false` | BLOQUANT |
| `PRE-LMS-04` | Aucune ligne à destination de `video_progress` / `module_completions` | BLOQUANT |
| `PRE-LMS-05` | Les 19 leçons `INCOMPLETE` sont signalées en quarantaine éditoriale | AVERTISSEMENT |
| `PRE-MED-01` | 383 fichiers inventoriés, somme des classes = 383 | BLOQUANT |
| `PRE-MED-02` | Tout `EXACT_DUPLICATE` a un `duplicate_group_sha` non vide et un gardien unique | BLOQUANT |
| `PRE-MED-03` | Les `ORIGINAL_UNUSED` sont signalés | AVERTISSEMENT |
| `PRE-MED-04` | 0 référence média pointant vers un objet absent de la base et du disque | **BLOQUANT — en échec (5 références)** |
| `PRE-PII-01` | Aucun fichier destiné à Git ne contient d'email, de nom, de téléphone ou de hash en clair | BLOQUANT |
| `PRE-PII-02` | `docs-migration-wp/.gitignore` couvre `private/`, `*.sql`, `*.tar.gz`, `backup-*/` | BLOQUANT |

---

## 8. Contrôles post-export

| ID | Contrôle | Sévérité |
|----|----------|----------|
| `POST-01` | Chaque fichier attendu au §3 existe et n'est pas vide | BLOQUANT |
| `POST-02` | Chaque fichier est UTF-8 sans BOM, LF, en-tête conforme, colonnes dans l'ordre imposé | BLOQUANT |
| `POST-03` | Le nombre de lignes de données égale la valeur attendue au §3, fichier par fichier | BLOQUANT |
| `POST-04` | Chaque `sha256` de `media-originals.csv` est revérifié à l'octet sur le disque source | BLOQUANT |
| `POST-05` | `SOURCE_TOTAL = EXPORTABLE + REJECTED + QUARANTINED` vérifié sur les 8 domaines du §6 | BLOQUANT |
| `POST-06` | Toute clé primaire est unique dans son fichier | BLOQUANT |
| `POST-07` | Toute clé étrangère (`formation_slug`, `wp_course_id`, `wp_user_id`) résout | BLOQUANT |
| `POST-08` | Aucune valeur `NULL`, `\N`, `None`, `undefined` ni `nan` littérale | BLOQUANT |
| `POST-09` | Toute valeur d'énumération appartient au type Citadelle correspondant | BLOQUANT |
| `POST-10` | Chaque code de rejet et de quarantaine du §4.1 / §5.1 est présent avec le volume attendu | BLOQUANT |
| `POST-11` | Une seconde exécution produit des fichiers bit-identiques | BLOQUANT |
| `POST-12` | Le manifeste et les checksums couvrent 100 % des fichiers produits | BLOQUANT |
| `POST-13` | La source WordPress, Supabase et Citadelle sont inchangées (aucune écriture émise) | BLOQUANT |

---

## 9. Manifeste et checksums de WM-4

`manifests/EXPORT-MANIFEST.json` — clés imposées :

```
export_id, created_utc, closed_utc, upstream_audit, upstream_mapping, upstream_gap_closure,
wm1_backup_ref, wm1_backup_sha256, files[] {path, bytes, sha256, rows, encoding, eol},
volumes {domain -> {source_total, exportable, rejected, quarantined}},
reconciliation {domain -> bool}, precheck {id -> pass|fail}, postcheck {id -> pass|fail},
blocking_failures[], verdict
```

`manifests/SHA256SUMS.txt` : une ligne `<sha256>  <chemin relatif>` par fichier produit, y compris
les registres de rejet et de quarantaine, y compris le rapport. Le manifeste lui-même est exclu
de sa propre somme.

`manifests/RECONCILIATION.csv` : colonnes `domain`, `source_total`, `exportable`, `rejected`,
`quarantined`, `sum_check`, `delta`, `status`. `status = OK` exige `delta = 0`.

---

## 10. Condition d'ouverture de WM-4

WM-4 ne peut être ouvert que si :

1. `WM31_OK` ou `WM31_OK_WITH_RESERVATIONS` est émis **et** ses réserves sont explicitement
   acceptées par décision humaine ;
2. `PRE-ID-03` et `PRE-MED-04` sont soit corrigés, soit levés par une décision humaine tracée
   dans `quarantine.csv` ;
3. la sauvegarde WM-1 est vérifiée intacte (`PRE-00`).

En l'état de WM-3.1, les points 2 et 3 ne sont pas satisfaits : **deux contrôles pré-export sont
en échec connu**. WM-4 ne doit pas être ouvert sans arbitrage préalable.

---

## 11. Interdits reconduits pour WM-4

Aucun import en production · aucun cutover · aucune suppression de la sandbox · aucune migration
de mot de passe · aucune écriture WordPress, Supabase ou Citadelle · aucun commit de `private/`,
d'email en clair, de base SQL, d'archive ou de sauvegarde brute · aucune modification de la page
d'accueil ni du code applicatif.
