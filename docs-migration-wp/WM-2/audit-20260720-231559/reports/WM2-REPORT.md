# LOT WM-2 — AUDIT COMPLET ET CHIFFRÉ DE WORDPRESS

**Verdict :** `WM2_AUDIT_COMPLETE_OK`  
**Audit ID :** `audit-20260720-231559`  
**Mode :** Evidence First · **lecture seule stricte** · sandbox uniquement  
**Clôture UTC (approx.) :** 2026-07-20T23:25:00Z  

**Sources certifiées :**
- Batch WM-1 : `backup-20260720-111659`
- Restauration : `restore-20260720-214535` · `WM1R_RESTORE_RECONCILIATION_OK`
- Base audit : `wm1r_restore_isolated` @ `127.0.0.1:3307` · **126 tables**
- Fichiers : copie restaurée (22 753 fichiers locaux)

**Non réalisé ici :** mapping Citadelle (WM-3) · import · mutation SQL · production.

---

## 1. Portes initiales

| Contrôle | Résultat |
|----------|----------|
| Batch WM-1 présent | OK |
| Restauration `restore-20260720-214535` | OK |
| Rapport WM-1R | OK |
| Checksums WM-1 (réf.) | OK (lot antérieur) |
| Base = `wm1r_restore_isolated` | **Prouvé** (`SELECT DATABASE()`) |
| Hôte/port | 127.0.0.1:3307 · MariaDB 10.11.11 |
| Tables | **126** |
| ≠ base production | Prod home = `https://www.chapelleduroyaume.org` ; grants prod limités à `frprszbd_chapelle_premium` ; sandbox locale dédiée |
| Compte lecture | **`wm2_ro`@127.0.0.1** · `GRANT SELECT` uniquement sur la sandbox |
| Citadelle | `stabilisation-p0-recette-citadelle` · `72dc006…` · porcelain 127 |
| Chapelle Next | `master` · `3e56492…` · porcelain 22 |
| Git fin de lot | **inchangé** |

---

## 2. Synthèse exécutive (chiffres clés)

| Domaine | Valeur |
|---------|--------:|
| Tables | 126 |
| Comptes `wp_users` | **35** |
| Emails renseignés / invalides (sans `@`) / doublons | 35 / 0 / 0 |
| Hash mdp | **35 × `wp_bcrypt`** → **NE PAS MIGRER** |
| Rôle admin + instructeur Tutor | **1** |
| Rôle UM `um_n1-semence-royale` | **34** |
| Étudiants Tutor (`_is_tutor_student`) | **33** |
| WhatsApp renseigné (méta) | **33** |
| Posts totaux | **1 087** (dont **853 révisions**) |
| Pages publiées | **56** |
| Articles blog publiés | **0** |
| Cours Tutor | **7** (5 publish + 2 private) |
| Topics / Lessons | **10 / 38** |
| Inscriptions `tutor_enrolled` | **33** (toutes sur cours ID 732) |
| Quiz / commandes / earnings Tutor | **0** |
| Médias (attachments) | **73** (71 images, 2 application) |
| FluentCRM abonnés | **33** (status `subscribed`) |
| Fluent Forms | **7 formulaires · 0 soumissions** |
| WooCommerce tables | **0** |
| H5P tables | **0** |
| Menus `nav_menu` | **0** |
| Commentaires | **0** |
| Plugins (dossiers) | **31** |
| Thèmes (dossiers) | **2** |
| Uploads fichiers | **383** · ~101 Mo |
| Fichiers totaux | **22 753** · ~516 Mo |

---

## 3. Dictionnaire de données (familles)

Inventaire exact des 126 tables : `evidence/02-exact-counts.tsv`  
Métadonnées tables : `evidence/01-tables-raw.tsv`  
Clés primaires : `evidence/03-primary-keys.tsv`

### 3.1 WordPress cœur

| Table | Lignes | Utilité migratoire | PII |
|-------|-------:|--------------------|-----|
| wp_users | 35 | **Import / rapprochement** comptes | Oui (email, login) |
| wp_usermeta | 773 | Profils, rôles, méta Tutor/UM | Oui (partiel) |
| wp_posts | 1087 | Pages, cours, leçons, médias, révisions | Contenu public + révisions |
| wp_postmeta | 7485 | Elementor, Tutor, SEO… | Variable |
| wp_options | 689 | Config site (filtrer secrets) | Secrets possibles |
| wp_terms / term_taxonomy / term_relationships | 3 / 3 / 2 | Taxonomies quasi vides | Non |
| wp_termmeta | 0 | — | Non |
| wp_comments / commentmeta | 0 / 0 | Rien à migrer | — |
| wp_links | 0 | Abandon | Non |

### 3.2 Tutor LMS (17 tables — toutes vides sauf contenu dans `wp_posts`)

| Table | Lignes | Note |
|-------|-------:|------|
| wp_tutor_* (carts, orders, quiz_*, earnings, coupons, customers, withdraws, …) | **0** chacune | Schéma présent, **pas de données transactionnelles** |

**Contenu LMS réel = CPT WordPress :** courses, topics, lesson, tutor_enrolled.

### 3.3 FluentCRM (18 tables)

| Table | Lignes | Utilité |
|-------|-------:|---------|
| wp_fc_subscribers | 33 | Abonnés CRM — migrer avec masquage |
| wp_fc_subscriber_meta / pivot | 45 / 132 | Méta & liaisons |
| wp_fc_campaigns / campaign_emails | 3 / 66 | Historique campagnes |
| wp_fc_funnels* | 1+metrics | Automation |
| wp_fc_lists / tags | 2 / 10 | Segmentation |
| Autres fc_* | faible | Support |

### 3.4 Fluent Forms (11 tables)

| Table | Lignes | Utilité |
|-------|-------:|---------|
| wp_fluentform_forms | 7 | Définitions formulaires |
| wp_fluentform_form_meta | 57 | Config |
| wp_fluentform_submissions (+ details) | **0** | **Aucune soumission à migrer** |
| transactions / orders | 0 | — |

### 3.5 Rank Math (10 tables)

| Exemples | Lignes | Note |
|----------|-------:|------|
| internal_links | 1425 | Graphe liens |
| link_genius_audit | 2129 | Audit SEO |
| 404_logs | 58 | Logs |
| redirections | 3 | À évaluer |
| postmeta rank_math_title/description | **0 posts** | SEO on-page peu renseigné en postmeta standard |

### 3.6 Elementor (`wp_e_*` + postmeta)

| Table / signal | Lignes / mesure |
|----------------|----------------:|
| wp_e_submissions* / notes / events | **0** |
| Posts avec `_elementor_edit_mode=builder` | **850** (inclut probablement révisions) |
| Pages Elementor = structure site | **Haute priorité migration contenu** |

### 3.7 Ultimate Member

| Signal | Valeur |
|--------|--------:|
| wp_um_metadata | 0 |
| CPT um_form / um_directory | 3 / 1 |
| Rôle custom `um_n1-semence-royale` | 34 users |
| account_status=approved | 35 |

### 3.8 Sécurité / cache / logs (non prioritaires migration métier)

| Famille | Exemples | Lignes (ordres de grandeur) | Décision probable |
|---------|----------|------------------------------|-------------------|
| Wordfence | wffilemods, wfknownfilelist, wfhits, wflogins… | 21k+ / 1.7k / 264 | **Archiver / abandonner** |
| Action Scheduler | actions 2641, logs 7909 | élevé | **Abandonner** (jobs) |
| ABJ 404 | redirects 995, logs 2434 | moyen | **Évaluer redirections** utiles |
| LiteSpeed | 0 | — | Abandonner |
| Code snippets | 41 | config | **Revue manuelle** |

### 3.9 Tables personnalisées Chapelle (`wp_cr_*`)

| Table | Lignes | Domaine | Migration |
|-------|-------:|---------|-----------|
| wp_cr_live_views | 41 | Live analytics | Optionnel / analytics |
| wp_cr_live_sessions | 4 | Live | Optionnel |
| wp_cr_live_comments / likes / presence | 5 / 3 / 2 | Live social | Faible volume |
| wp_cr_forum_posts | 2 | Forum | Faible |
| wp_cr_prayer_requests | **1** | Prière | **Sensible — ne pas exposer** ; décision métier |
| wp_cr_pdf_downloads | 1 | Tracking | Faible |
| wp_cr_event_signups | 0 | Events | Vide |

### 3.10 WooCommerce / H5P

| Domaine | Tables | Décision |
|---------|-------:|----------|
| WooCommerce | **0** | Non présent |
| H5P | **0** | Non présent |

---

## 4. Utilisateurs (agrégé)

| Métrique | N |
|----------|--:|
| Total comptes | 35 |
| Avec email | 35 |
| Sans email | 0 |
| Email sans `@` | 0 |
| Groupes email dupliqués (lower/trim) | 0 |
| Logins dupliqués | 0 |
| Avec date d’inscription | 35 (tous **2026**) |
| Avec hash mdp | 35 · format **wp_bcrypt** |
| Avec capabilities | 35 |
| Sans rôle (capabilities) | 0 |
| first_name non vide | 34 |
| last_name non vide | 31 |
| nickname | 35 |
| description | 0 |
| Méta WhatsApp non vide | 33 |
| Orphan usermeta | 0 |
| Users sans meta | 0 |

### 4.1 Rôles (d’après `wp_capabilities` sérialisé)

| Rôle / motif | Comptes |
|--------------|--------:|
| `administrator` + `tutor_instructor` | **1** |
| `um_n1-semence-royale` (Ultimate Member) | **34** |
| editor / author / contributor / subscriber WP natifs | **0** |
| customer Woo | **0** |

**Décision déjà validée (rappel) :**
- Comptes valides → futurs **IMPORTER** ou **RAPPROCHER** (WM-3/4)
- Mots de passe → **NE PAS MIGRER** · reset obligatoire 1ʳᵉ connexion
- Rôles WP/UM → **NE PAS reproduire automatiquement** dans Citadelle

### 4.2 Matrice d’anomalies utilisateurs

| Type | Qté | Gravité | Action proposée WM-3/4 |
|------|----:|---------|------------------------|
| Hash mdp non migrables (wp_bcrypt) | 35 | Info / attendu | Reset forcé |
| Rôle UM custom unique (pas de subscriber WP) | 34 | Moyen | Mapper vers rôle Citadelle métier |
| Un seul instructeur Tutor | 1 | Info | Compte staff |
| Tous inscrits en 2026 | 35 | Info | Site récent / reset data |
| WhatsApp quasi systématique | 33 | Info | Champ téléphone optionnel |
| last_name manquant | 4 | Faible | Complétion profil |
| Doublons email/login | 0 | — | OK |
| Sans email | 0 | — | OK |

*Aucun `user_pass`, email ou téléphone en clair dans ce rapport.*

---

## 5. Profils & métadonnées utilisateur (clés utiles)

Inventaire complet : `evidence/16-usermeta-keys-inventory.tsv`

| Clé | Users | Remplissage | Sensible | Intérêt migration |
|-----|------:|------------:|----------|-------------------|
| first_name / last_name | 34 / 31 | élevé | Identité | **Oui** |
| nickname | 35 | 100 % | Faible | Optionnel |
| whatsapp | 33 | 100 % si présent | **Oui** | Téléphone |
| city / country | 3 | faible | Localisation | Optionnel |
| spiritual_status | 3 | faible | Méta pastorale | À qualifier |
| newsletter_optin / terms_accepted | 3 | faible | Consentement | **Oui si prouvé** |
| account_status (UM) | 35 | approved | Statut | Mapper |
| _is_tutor_student | 33 | — | LMS | **Oui** |
| _is_tutor_instructor | 1 | — | LMS | **Oui** |
| _tutor_instructor_course_id | 7 rows / 1 user | — | LMS | Lien cours |
| session_tokens / last_login* | 5 | — | Session | **Abandonner** |
| wp_googlesitekit_* tokens | 1 user | — | **Secrets** | **Ne pas migrer** |
| wp_capabilities / user_level | 35 | — | Rôles | Ne pas copier tels quels |
| um_member_directory_data | 35 | sérialisé | UM | Extraire champs utiles seulement |

---

## 6. Tutor LMS — formations & progression

### 6.1 Contenu

| Type | Total | Publish | Private | Note |
|------|------:|--------:|--------:|------|
| courses | 7 | 5 | 2 | 1 auteur distinct |
| topics | 10 | 10 | 0 | rattachés aux cours |
| lesson | 38 | 38 | 0 | via topics parents |
| tutor_quiz | 0 | — | — | **Aucun quiz CPT** |
| tutor_assignments | 0 | — | — | — |
| tutor_enrolled | 33 | 33 | 0 | **toutes parent = cours 732** |

**Cours (titres publics LMS) :**

| ID | Statut | Titre (public) |
|----|--------|----------------|
| 732 | publish | PARCOURS 1 — Formation d’Intégration |
| 734 | publish | PARCOURS 2 — Je stabilise ma foi |
| 736 | publish | PARCOURS 3 — Je deviens un disciple actif |
| 738 | publish | École des Appelés |
| 867 | publish | Le Chemin des Élus — 7 étapes… |
| 876 | private | Né pour Régner |
| 879 | private | La Formation du Leader Royal |

**Répartition leçons par cours (via topic→course) :**  
732→3 · 736→26 · 867→7 · 876→1 · 879→1 (total 38).

### 6.2 Inscriptions & progression

| Signal | Valeur |
|--------|--------:|
| CPT tutor_enrolled | 33 |
| Répartition | **33 / 33 sur cours 732 uniquement** |
| Tables quiz_attempts / answers / questions | **0** |
| Orders / earnings / carts / coupons | **0** |
| Méta `_is_tutor_student` | 33 users |

**Conclusion progression :**  
Inscriptions « enrollment posts » présentes pour le Parcours 1 uniquement. **Pas de traces chiffrées de quiz, notes, certificats, commandes Tutor** dans les tables dédiées. La progression fine (complétion leçon) — si existante — serait surtout en **postmeta/usermeta** à cartographier en WM-3 (`evidence/44-tutor-postmeta-keys.tsv`, `45-tutor-usermeta-keys.tsv`).

### 6.3 Formateurs

| Métrique | N |
|----------|--:|
| Users `_is_tutor_instructor` | 1 |
| Auteurs distincts de cours | 1 |
| `_tutor_instructor_approved` | 1 |

### 6.4 Certificats

Aucune table ni CPT certificat Tutor détecté avec données. **Certificats : non prouvés / volume 0.**

---

## 7. Médias

| Métrique | N |
|----------|--:|
| Attachments | 73 |
| image/* | 71 |
| application/* | 2 |
| video/audio | 0 |
| Fichiers uploads (FS) | 383 |
| Taille uploads FS | ~101 Mo |
| postmeta orphelins | 0 |

Extensions FS : voir `evidence/uploads-by-extension.tsv`.

---

## 8. Pages publiques & articles

| Type | Publish | Autres |
|------|--------:|--------|
| page | **56** | — |
| post (blog) | **0** | 1 trash |
| Revisions | 853 | Bruit éditorial |
| elementor_library / elementskit_template | 1 / 2 | Templates |
| Headers/footers custom (tahefobu_*) | présents | Thème builder |

**Pages structurantes (échantillon d’URLs slug) :**  
accueil, vision, live, priere, plateformes, ressources, rejoindre, integration, mahanaim, forum, mon-compte, s’inscrire, se-connecter, boutique, contact, temoignages, donner, evenements, etc.  
Liste complète : `evidence/93-pages-publish.tsv`.

**SEO on-page Rank Math :** tables peuplées (liens/audit) mais **0** postmeta `rank_math_title` / `description` / `focus_keyword` non vides — SEO « riche » non prouvé au niveau meta standard.

**Menus WP (`nav_menu`) :** **0** termes — navigation probablement **Elementor / thème / headers custom**, pas menu WP classique.

---

## 9. Formulaires (Fluent Forms)

| ID | Titre | Status | has_payment | Soumissions |
|----|-------|--------|-------------|------------:|
| 1 | Contact Form Demo | published | 0 | 0 |
| 2 | Subscription Form | published | 0 | 0 |
| 3 | Contact — Chapelle Royale | unpublished | 0 | 0 |
| 4 | Newsletter — Lettre du Royaume | unpublished | 0 | 0 |
| 6 | Contact — Chapelle Royale | published | 0 | 0 |
| 7 | Demande de prière — Chapelle Royale | published | 0 | 0 |
| 8 | Newsletter — Lettre du Royaume | published | 0 | 0 |

**Total soumissions stockées : 0.**  
Les définitions de champs restent dans `form_fields` (longtext) — **à traiter en WM-3 sans exporter les contenus de réponses** (vides ici).

Plugin parallèle : `Chapelle Royale — Demande de prière structurée` + table `wp_cr_prayer_requests` (1 ligne) — **PII_PRIVATE**, hors rapport détaillé.

---

## 10. CRM & abonnés (FluentCRM)

| Métrique | N |
|----------|--:|
| Abonnés | 33 |
| Status | 33 × `subscribed` |
| Listes | 2 |
| Tags | 10 |
| Campagnes | 3 |
| Emails de campagne | 66 |
| Funnels | 1 |
| Funnel subscribers / metrics | 33 / 33 |

**Domaines email (agrégés, pas d’adresses) :**  
gmail.com 25 · yahoo.fr 3 · orange.fr 2 · yahoo.com 1 · chapelleduroyaume.org 1 · gmx.fr 1  

Cohérence forte : **33 abonnés CRM ≈ 33 étudiants Tutor ≈ 33 enrollments cours 732**.

---

## 11. Commandes & paiements historiques

| Source | Résultat |
|--------|----------|
| Tutor orders / items / earnings | **0** |
| Fluent Form transactions / order_items | **0** |
| WooCommerce | **Absent** |
| has_payment sur forms | tous 0 |

**Aucune commande/paiement historique prouvée dans la sandbox.**  
Page « boutique » / « donner » existent côté pages — probablement externes (lien / embed) non stockés en tables e-commerce WP.

---

## 12. Intégrations (preuves de présence)

| Intégration | Preuve | Données à migrer ? |
|-------------|--------|--------------------|
| Tutor + Tutor Pro | plugins + CPT + tables vides | Contenu + enrollments |
| FluentCRM + Campaign Pro | tables + 33 abonnés | **Oui** (agrégé) |
| Fluent Forms + Pro | 7 forms | Définitions oui, entries non |
| FluentSMTP | table logs 0 | Config only |
| Elementor + Pro + ElementsKit | plugins + 850 builder flags | **Contenu pages** |
| Rank Math + Pro | 10 tables | Redirections/liens |
| Ultimate Member | rôle + forms | Rôles/membership |
| LiteSpeed Cache | plugin, tables vides | Non |
| Wordfence | logs massifs | Non métier |
| Google Site Kit | usermeta tokens admin | **Secrets — ne pas migrer** |
| WordPress MCP | plugin | Outillage |
| Code Snippets | 41 snippets | Revue code |
| All-in-One WP Migration | plugin | Non (outil) |
| CR custom (live, forum, prière, badges, header…) | plugins + tables | Cas par cas |

---

## 13. Fichiers restaurés

| Zone | Fichiers | Octets (approx.) |
|------|--------:|-----------------:|
| Total public_html | 22 753 | 516 303 164 |
| wp-admin | (mesuré dans files-by-area) | — |
| plugins | 31 dossiers | — |
| themes | 2 dossiers | — |
| uploads | 383 | 101 219 207 |

Plugins listés : `evidence/plugins-dirs.txt`.

---

## 14. Matrice de disposition migratoire (provisoire — avant WM-3)

| Donnée | Conserver / importer | Recréer dans Citadelle | Archiver | Abandonner provisoirement |
|--------|----------------------|------------------------|----------|---------------------------|
| 35 comptes (+ profils de base) | **Oui** (sans mdp) | Rôles Citadelle | — | Hash mdp, sessions, tokens |
| 5 cours publish + structure leçons | **Oui** | UX LMS Citadelle | 2 private si hors scope | — |
| 33 enrollments Parcours 1 | **Oui** (lien user↔cours) | Progression fine si absente | — | Quiz/orders vides |
| 56 pages Elementor | Contenu HTML/JSON à extraire | Refonte progressive | Anciennes versions | 853 révisions |
| 73 médias + uploads | **Oui** (fichiers) | CDN Citadelle | — | — |
| FluentCRM 33 abonnés | **Oui** (consentements à valider) | Listes/tags | Campagnes hist. | — |
| Fluent Forms définitions | Optionnel | Formulaires natifs Citadelle | — | 0 entries |
| Rank Math redirections (3) | Si URLs critiques | Redirect rules | Logs 404 | Bulk audit tables |
| Wordfence / AS / cache | Non | — | Optionnel | **Oui** |
| wp_cr_prayer_requests | Décision pastorale | — | **Private** | Sinon ne pas exposer |
| Google Site Kit tokens | Non | Reconnecter | — | **Oui** |
| Snippets PHP | Revue sécu | Recoder features | — | Snippets risqués |

---

## 15. Anomalies & lacunes (globales)

| ID | Anomalie | Impact migration |
|----|----------|------------------|
| A1 | 78 % des posts = révisions (853/1087) | Nettoyage avant import contenu |
| A2 | Aucun article blog publié | Contenu = pages + LMS |
| A3 | Pas de menus WP | Navigation non standard |
| A4 | LMS transactionnel Tutor vide | Pas de CA / quiz / certificats en base |
| A5 | Enrollments concentrés sur 1 seul cours | Autres parcours sans inscrits en base |
| A6 | 0 soumissions Fluent Forms | Pas d’historique formulaires |
| A7 | SEO title/desc Rank Math vides en postmeta | Reprendre SEO en Citadelle |
| A8 | Site / comptes exclusivement 2026 | Jeu de données « relaunch » |
| A9 | Tokens OAuth Site Kit en usermeta | Risque fuite si dump mal filtré |
| A10 | 1 demande de prière en table custom | Traitement PII strict |

---

## 16. Preuves de non-écriture

- Utilisateur SQL : **`wm2_ro`** · privilège **SELECT** sur `wm1r_restore_isolated` uniquement  
- Aucun INSERT/UPDATE/DELETE/DDL exécuté sur l’audit  
- Production non ciblée  
- Dépôts applicatifs non modifiés  
- Dossier `private/` marqué `PII_PRIVATE_DO_NOT_COMMIT`  
- Aucun export de mots de passe  

---

## 17. Livrables

```
docs-migration-wp\WM-2\audit-20260720-231559\
  reports\WM2-REPORT.md          ← ce document
  reports\WM2-DATA-DICTIONARY.md
  reports\WM2-DECISIONS-MATRIX.md
  manifests\AUDIT-MANIFEST.json
  evidence\*.tsv|*.txt           ← preuves chiffrées
  queries\                       ← SQL de comptage
  private\PII_PRIVATE_DO_NOT_COMMIT
```

Preuves distantes miroir : `/home/frprszbd/ops-center/wm1r-restore-20260720-214535/wm2-audit/`

---

## 18. Prochaine action unique

**Ouvrir WM-3 — Mapping champ par champ & modèle LMS cible Citadelle**, en s’appuyant exclusivement sur cet audit.

**Ne pas :** importer Supabase · migrer mots de passe · démarrer un cutover · supprimer la sandbox.

---

## 19. Marqueur

### `WM2_AUDIT_COMPLETE_OK`

Audit chiffré sandbox complet · PII non exposée · Git inchangé · prêt pour mapping WM-3.
