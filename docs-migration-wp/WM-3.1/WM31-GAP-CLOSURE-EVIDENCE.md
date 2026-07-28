# WM-3.1 — Preuves de fermeture des quatre gaps

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.1` |
| Baseline documentaire | `8906b4c — docs(migration): integrate WM-2 and WM-3 evidence` |
| Branche | `stabilisation-p0-recette-citadelle` |
| Gaps traités | G1, G2, G3, G4 (`WM-3/mapping-20260720/reports/WM3-ADDENDUM-FINAL.md` § Synthèse gaps) |
| Périmètre | fermeture des gaps **uniquement** — ni re-exécution de WM-3, ni ouverture de WM-4 |

---

## 1. Sources utilisées

| Source | Emplacement | Mode d'accès |
|--------|-------------|--------------|
| WM-2 audit | `docs-migration-wp/WM-2/audit-20260720-231559/` | lecture |
| WM-3 mapping | `docs-migration-wp/WM-3/mapping-20260720/` | lecture |
| Pointeur WM-1 | `docs-migration-wp/WM-1-EXTERNAL-SOURCE.md` | lecture |
| Sauvegarde WM-1 | `…\EGLISE EN LIGNE\docs-migration-wp\WM-1\backup-20260720-111659` | **lecture seule externe** |
| Cible Citadelle | Supabase production — `profiles`, `auth.users` | **`SELECT` / `GET` uniquement** |

Éléments de la sauvegarde WM-1 effectivement lus :

| Chemin (relatif à `backup-20260720-111659/`) | Usage |
|----------------------------------------------|-------|
| `manifests/SOURCE-CERT.json` | certification de la source (domaine, préfixe, versions) |
| `checksums/SHA256SUMS.txt` | intégrité des 3 artefacts |
| `database/chapelle-premium-db.sql` | `wp_users`, `wp_usermeta`, `wp_posts`, `wp_postmeta` |
| `restore-test/files-extract/public_html/wp-content/uploads/` | les 383 fichiers physiques |

Empreintes de la sauvegarde, relevées telles quelles :

```
acc657fe827a7f5109f6008b68ea92d2d869199aba873392f2a2e2b2a3860dfc  database/chapelle-premium-db.sql
42c87d03416914d6b9266c2ef2925b2d6d8a1376fb3e9420560f48c3269081bc  database/chapelle-premium-db.sql.gz
d64c5642d43a3b191e2bd52095ba023755ac07957b0e91558c6097a3f01f4507  files/public_html-files.tar.gz
```

Ni déplacement, ni renommage, ni suppression, ni modification, ni intégration au dépôt.

---

## 2. Validation de l'extracteur

Le dump SQL est relu par un analyseur d'`INSERT` dédié (`evidence/sqlparse.py`). Sa fidélité est
prouvée par recoupement avec des agrégats WM-2 produits indépendamment par MariaDB :

| Table | Lignes extraites | Agrégat WM-2 | Preuve WM-2 | État |
|-------|------------------|--------------|-------------|------|
| `wp_users` | 35 | 35 | `10-users-aggregates.tsv` `total_users` | ✅ |
| `wp_usermeta` | 773 | 773 | `10-users-aggregates.tsv` `usermeta_rows` | ✅ |
| `wp_posts` type `lesson` | 38 | 38 | `55-tutor-content-counts.tsv` `lessons_total` | ✅ |
| `wp_posts` type `attachment` | 73 | 73 | `t08-media-db-agg.tsv` `attachments` | ✅ |
| `wp_posts` type `page` | 56 | 56 | `21-posts-type-summary.tsv` | ✅ |
| `wp_posts` type `courses` | 7 | 7 | `21-posts-type-summary.tsv` | ✅ |
| `wp_posts` type `revision` | 853 | 853 | `21-posts-type-summary.tsv` | ✅ |

Aucun écart. L'extraction est donc utilisable comme preuve.

---

## 3. Gap 1 — 35 identités

| Exigence | Preuve | État |
|----------|--------|------|
| Comparaison par email normalisé | `WM31-IDENTITIES-REPORT.md` §1 — niveau N1 `NFKC+trim+lower` | ✅ |
| Comparaison par empreinte stable | N2 canonique + `sha256("WM31\|"+valeur)[:16]` | ✅ |
| Classification exhaustive en 6 classes | `WM31-IDENTITIES-MATRIX.csv` colonne `verdict` | ✅ |
| Déjà présents quantifiés | **4** | ✅ |
| Absents quantifiés | **30** | ✅ |
| Ambigus quantifiés | **0** | ✅ |
| Invalides quantifiés | **0** | ✅ |
| Doublons quantifiés | **0** | ✅ |
| Privilégiés quantifiés | **1** | ✅ |
| Aucune identité sans verdict | 35 lignes, 35 `verdict` non vides, somme = 35 | ✅ |

Contrôle mécanique : `4 + 30 + 0 + 0 + 0 + 1 = 35`.

Constat additionnel non demandé mais bloquant, remonté à WM-4 : la cible héberge 13 `profiles`
pour **5** empreintes canoniques (2 groupes de doublons). Voir `WM31-IDENTITIES-REPORT.md` §4 et
le contrôle `PRE-ID-03`.

**Gap 1 : FERMÉ.**

---

## 4. Gap 2 — 27 leçons sans vidéo

| Exigence | Preuve | État |
|----------|--------|------|
| Texte examiné | `content_html_len`, `content_text_len`, `word_count`, `headings`, `list_items` | ✅ |
| Document examiné | `_tutor_attachments` déréférencé — `attachments_n/ok/broken`, `attachment_mimes` | ✅ |
| Contenu examiné | `content_sha256_16`, `excerpt_len` | ✅ |
| Rattachement examiné | `topic_id`, `topic_slug`, `course_id`, `course_slug`, `menu_order` | ✅ |
| Référence vidéo ailleurs recherchée | corps, extrait, toutes métas, pièces jointes, cours parent — `video_reference_elsewhere` | ✅ |
| Complétude pédagogique évaluée | `pedagogical_completeness` + `author_placeholder_found` | ✅ |
| Classification en 7 classes | `classification` | ✅ |
| Migrable / avec réserve / quarantaine / décision humaine | `migration_decision` + `human_review_required` | ✅ |
| Aucune leçon non examinée | 27 lignes, 27 classifications, somme = 27 | ✅ |

Contrôle mécanique : `8 TEXT_VALID + 19 INCOMPLETE = 27`, et `11 avec vidéo + 27 sans = 38`.

Élément décisif obtenu par examen individuel : **19 leçons portent un marqueur d'inachèvement
laissé par l'auteur** (`[Insérer vidéo + développement]` et variantes). Une classification par
volumétrie seule les aurait déclarées valides ; l'examen ligne à ligne les qualifie
`INCOMPLETE` / décision humaine.

**Gap 2 : FERMÉ.**

---

## 5. Gap 3 — 383 fichiers physiques

| Exigence | Preuve | État |
|----------|--------|------|
| Chemin, nom, extension, taille | colonnes 1–4 de l'inventaire — 383/383 | ✅ |
| Type MIME | `mime_type` + `mime_source` — 373 par signature, 10 par extension | ✅ |
| Checksum | `sha256` complet — 383/383 | ✅ |
| Dimensions | `width`/`height` — 371/371 images | ✅ |
| Référence WordPress | `wp_attachment_id`, `wp_reference_role`, `wp_parent_post` — 373/383 | ✅ |
| Contenu utilisateur | `user_content` — 383/383 | ✅ |
| Relation avec un original | `derived_from` — 300/300 variantes | ✅ |
| État d'utilisation | `referenced_in_content` + `reference_signals` — 383/383 | ✅ |
| Classification en 10 classes | `classification` | ✅ |
| Doublons exacts prouvés par checksum | 383 fichiers − 360 checksums distincts = 23 redondances | ✅ |
| Total réconcilié = 383 | `60+9+281+8+23+0+1+0+1+0 = 383` | ✅ |

Contrôle mécanique complémentaire : `73 originaux + 300 variantes + 10 hors médiathèque = 383`,
et somme des octets par classe = `101 219 207` = `uploads_bytes` de WM-2.

Deux chiffres antérieurs sont rectifiés, preuve à l'appui : « ~83 originaux » (heuristique de
nommage) devient **73** (ancré sur `_wp_attached_file`) ; `dup_size_groups=4` (échantillon)
devient **23 groupes** (passe checksum intégrale).

**Gap 3 : FERMÉ.**

---

## 6. Gap 4 — Contrat WM-4

| Élément exigé | Section du contrat | État |
|---------------|--------------------|------|
| Fichiers | §3 — 9 fichiers d'export nommés + 2 registres | ✅ |
| Formats | §2 — CSV RFC 4180 | ✅ |
| Encodage | §2 — UTF-8 sans BOM, LF | ✅ |
| Schémas | §3.1 à §3.4 | ✅ |
| Colonnes | §3.1 (15 colonnes typées), §3.2, §3.3, §3.4 | ✅ |
| Types | colonne `Type` de chaque tableau | ✅ |
| Valeurs nulles | §2 — chaîne vide non quotée, jamais `NULL`/`\N` ; `POST-08` | ✅ |
| Sources | colonne `Source` de chaque tableau | ✅ |
| Cibles | colonne `Cible` de chaque tableau | ✅ |
| Transformations | colonne `Transformation` + règles de peuplement | ✅ |
| Rejets | §4 — registre à 7 colonnes, 14 codes volumés | ✅ |
| Quarantaines | §5 — registre à 7 colonnes, 6 codes volumés | ✅ |
| Checksums | §9 — `SHA256SUMS.txt` + `POST-04` + `POST-12` | ✅ |
| Manifestes | §9 — `EXPORT-MANIFEST.json`, clés imposées | ✅ |
| Contrôles pré-export | §7 — 20 contrôles | ✅ |
| Contrôles post-export | §8 — 13 contrôles | ✅ |
| Réconciliation | §6 — formule appliquée aux 8 domaines | ✅ |
| Formule obligatoire | §6 — `SOURCE_TOTAL = EXPORTABLE + REJECTED + QUARANTINED`, tolérance nulle | ✅ |

Aucun export n'a été produit : `docs-migration-wp/WM-4/` n'existe pas.

**Gap 4 : FERMÉ** (le contrat est complet ; deux de ses contrôles pré-export sont en échec
**connu et documenté**, ce qui est le comportement attendu d'un contrat, non une lacune du
contrat).

---

## 7. Contrôles obligatoires avant verdict

| Contrôle exigé | Résultat | Preuve |
|----------------|----------|--------|
| `35/35` identités classées | **35/35** | `WM31-IDENTITIES-MATRIX.csv` — 35 lignes, 0 verdict vide |
| `27/27` leçons classées | **27/27** | `WM31-LESSONS-WITHOUT-VIDEO-MATRIX.csv` — 27 lignes, 0 classification vide |
| `383/383` fichiers classés | **383/383** | `WM31-PHYSICAL-FILES-INVENTORY.csv` — 383 lignes, 0 classification vide |
| Aucune donnée privée suivie par Git | **conforme** | §8 ci-dessous |
| Aucune donnée source ou cible modifiée | **conforme** | §9 ci-dessous |
| Aucun export WM-4 produit | **conforme** | `docs-migration-wp/WM-4/` inexistant |
| Tous les totaux réconciliés | **conforme** | §3, §4, §5 ci-dessus |
| Toutes les conclusions reliées à une preuve | **conforme** | chaque ligne de chaque tableau cite sa colonne ou son fichier |
| Contrat WM-4 complet | **conforme** | §6 ci-dessus — 18/18 éléments exigés |

Vérification mécanique : `evidence/wm31-controls.json` — **42 contrôles bloquants, 42 PASS,
0 FAIL**, plus 1 contrôle informatif. Le script de contrôle est joint (`evidence/controls.py`)
et rejouable.

Manifeste et empreintes des livrables : `manifests/WM31-MANIFEST.json` et
`manifests/SHA256SUMS.txt` (19 fichiers). Les deux fichiers de `manifests/` sont exclus de leur
propre somme.

---

## 8. Contrôle de confidentialité

| Vérification | Résultat |
|--------------|----------|
| Adresse email en clair dans les livrables WM-3.1 | **0** |
| Nom, prénom, téléphone en clair | **0** |
| `user_login`, `display_name`, `user_pass` | **0** |
| Identifiant YouTube non listé | **0** (restent dans `WM-2/…/private/`) |
| Fichier `private/` ajouté | **0** |
| Base SQL, archive, sauvegarde brute ajoutée | **0** |
| Contenu de leçon recopié intégralement | **0** (mesures et marqueurs uniquement) |
| Chemins de fichiers médias publiés | oui — noms de fichiers média du site, non personnels |

Les identités sont représentées exclusivement par `wp_user_id`, empreinte tronquée et domaine.
Le domaine seul suit le précédent WM-2 `evidence/65-fc-email-domains.tsv`.
Le fichier `citadelle.json` (réponse brute de la sonde, porteuse d'emails) reste dans le
répertoire temporaire de session et **n'est pas** dans le dépôt.

---

## 9. Contrôle de non-impact

| Cible | Action WM-3.1 |
|-------|---------------|
| WordPress production | aucune connexion |
| Sandbox MariaDB | aucune connexion — le dump est lu comme fichier |
| Sauvegarde externe WM-1 | **lecture seule** — ni déplacée, ni renommée, ni modifiée |
| Supabase / Citadelle | **2 requêtes de lecture** (`GET /rest/v1/profiles`, `GET /auth/v1/admin/users`) — 0 écriture |
| Code applicatif Citadelle | non modifié |
| Page d'accueil | non modifiée |
| Fichiers Chapelle Home hors commit | non touchés — vérifié par `C6-05` |
| Fichiers `src/` du chantier « mode hors ligne » | modifiés par un **processus tiers concurrent** pendant le lot ; WM-3.1 n'y a pas écrit — signalé par `C6-06` |
| WM-3 | non ré-exécuté, non modifié |
| WM-4 | non ouvert |
| Git | aucun commit, aucun push |

La sonde Citadelle est justifiée : le gap G1 était précisément « match users live non fait »
(`WM3-ADDENDUM-FINAL.md` §12). Sans lecture de la cible, G1 ne peut pas être fermé. La sonde
n'émet que des requêtes de lecture.
