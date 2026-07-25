# LOT WM-2 — AUDIT COMPLET ET CHIFFRÉ DE WORDPRESS

## 1. Verdict

### `WM2_OK`

Marqueur :

### `CITADELLE_WP_MIGRATION_WM2_AUDIT_COMPLETE_OK`

Audit sandbox en **lecture seule** (`wm2_ro` SELECT), 126 tables inventoriées, Tutor/CRM/Forms/médias/contenu/anomalies documentés, **aucune PII en clair** dans les livrables publics, **aucun impact** production / Citadelle / Chapelle Next.

---

## 2. Identifiant audit

`audit-20260720-231559`  
Dossier : `docs-migration-wp\WM-2\audit-20260720-231559\`

---

## 3. Source auditée

| Champ | Valeur |
|-------|--------|
| Batch WM-1 | `backup-20260720-111659` |
| Restauration | `restore-20260720-214535` |
| Base | **`wm1r_restore_isolated`** |
| Hôte:port | **127.0.0.1:3307** |
| Tables | **126** (recontrôlé fin d’audit) |
| SQL user | `wm2_ro` · **SELECT only** |
| Fichiers | copie restaurée (22 753 fichiers) |
| Production | **non utilisée** pour l’audit |

---

## 4. Portes initiales

| Porte | Résultat |
|-------|----------|
| Artefacts WM-1 + WM-1R | OK |
| Base sandbox exacte | OK |
| ≠ base WP active | OK |
| Citadelle HEAD | `72dc0067399f652d3685eb679e97a2bbb0dea5c6` · porcelain 127 |
| Chapelle Next HEAD | `3e5649214aff52ee38bfdb8b2aaef3fac90cd620` · porcelain 22 |
| Ambiguïté source | **Aucune** |

---

## 5. Dictionnaire des 126 tables

Voir `WM2-DATA-DICTIONARY.csv` + `evidence/02-exact-counts.tsv`.

**Familles :** WP cœur · Tutor (17 tables **vides de data transactionnelle**) · FluentCRM (18) · Fluent Forms (11) · Rank Math (10) · Elementor `wp_e_*` (vides) · Wordfence (nombreux logs) · Action Scheduler · ABJ404 · CR custom (`wp_cr_*`) · UM · LiteSpeed · snippets · N0C autologin.

**WooCommerce : 0 table · H5P : 0 table.**

---

## 6. Utilisateurs et profils

| Métrique | N | Classe provisoire |
|----------|--:|-------------------|
| Comptes totaux | 35 | profil essentiel (compte) |
| Email non vide / invalide / doublon | 35 / 0 / 0 | essentiel |
| Hash mdp présent | 35 · **wp_bcrypt** | **à ne pas importer** |
| first_name / last_name | 34 / 31 | essentiel / facultatif si vide |
| nickname | 35 | facultatif |
| whatsapp | 33 | **sensible** + utile contact |
| city / country | 3 | facultatif |
| spiritual_status / newsletter_optin / terms | 3 | sensible / consentement · **WM-3** |
| session_tokens / last_login* | 5 | technique · ne pas importer |
| Google Site Kit tokens | 1 admin | **sensible secret** · ne pas importer |
| Inscription année | 100 % 2026 | historique / contexte |

---

## 7. Rôles

| Rôle (wp_capabilities) | N | Classe |
|------------------------|--:|--------|
| administrator + tutor_instructor | 1 | technique staff · **ne pas auto-mapper** |
| um_n1-semence-royale (UM) | 34 | membership · **WM-3 mapping** |
| subscriber/editor/author WP natifs | 0 | — |
| Sans capabilities | 0 | — |

**Décision validée :** rôles WP **ne pas importer automatiquement** dans Citadelle.

---

## 8. Tutor LMS — modèle réel

**Modèle observé :** Tutor LMS **3.9.x** (plugins `tutor` + `tutor-pro`) avec **contenu pédagogique en CPT WordPress** :

| CPT | Rôle |
|-----|------|
| `courses` | Formation |
| `topics` | Module / sujet (enfant de course) |
| `lesson` | Leçon (enfant de topic) |
| `tutor_enrolled` | Inscription (post_author = user, post_parent = course) |

**Tables `wp_tutor_*` (17) :** présentes mais **toutes à 0 ligne** (orders, quiz_attempts, earnings, carts, etc.).

Ordre pédagogique prouvé par : **`post_parent` + `menu_order`**.

---

## 9. Formations et structure pédagogique

### 9.1 Synthèse formations

| ID | Statut | Slug | Topics | Lessons | Quiz | Inscrits | Thumb |
|----|--------|------|-------:|--------:|-----:|---------:|-------|
| 732 | publish | parcours-1-je-decouvre-la-maison | 1 | 3 | 0 | **33** | oui |
| 734 | publish | parcours-2-je-stabilise-ma-foi | 0 | 0 | 0 | 0 | oui |
| 736 | publish | parcours-3-je-deviens-un-disciple-actif | 6 | 26 | 0 | 0 | oui |
| 738 | publish | ecole-des-appeles | 0 | 0 | 0 | 0 | oui |
| 867 | publish | le-chemin-des-elus-… | 1 | 7 | 0 | 0 | non |
| 876 | private | ne-pour-regner | 1 | 1 | 0 | 0 | non |
| 879 | private | la-formation-du-leader-royal | 1 | 1 | 0 | 0 | non |

**Totaux :** 7 cours · 5 publish · 2 private · 0 draft/trash · **1 formateur** (author_id unique) · **0 quiz CPT** · **0 assignments**.

**Titres publics (OK rapport) :**  
PARCOURS 1 — Formation d’Intégration · PARCOURS 2 — Je stabilise ma foi · PARCOURS 3 — Je deviens un disciple actif · École des Appelés · Le Chemin des Élus — 7 étapes… · (private) Né pour Régner · La Formation du Leader Royal.

### 9.2 Meta cours (agrégé)

| Meta | Remplie (cours) | Classe |
|------|----------------:|--------|
| `_tutor_course_price_type` / sale_price | 7 | tarification · **WM-3** (souvent gratuit) |
| `_tutor_course_level` | 7 | facultatif |
| `_course_duration` | 7 | facultatif |
| benefits / requirements / audience / materials | 3 | facultatif |
| `tutor_course_certificate_template` | 4 | **historique / à décider** (0 certificats émis) |
| `_video` cours | 4 vides `a:0:{}` | technique |

### 9.3 Modules (topics) — ordre

Exemple Parcours 3 (course 736), `menu_order` 1→6 :  
Module 1 Nouvelle naissance (5 leçons) … Module 6 Maturité et mission (5 leçons).  
Détail : `evidence/t05-topics-order.tsv`, `t05-lessons-order.tsv`.

**Anomalies structure :**
- Cours **734** et **738** : publish **sans topic/leçon** (coquilles).
- Contenu dense surtout sur **736** (26 leçons) et **867** (7).

Manifeste JSON : `WM2-TUTOR-INVENTORY.json`.

---

## 10. Inscriptions et progression

| Métrique | N | Note |
|----------|--:|------|
| Inscriptions totales (`tutor_enrolled`) | 33 | post_status = **`completed`** |
| Utilisateurs distincts inscrits | 33 | |
| Par formation | **33 sur cours 732 uniquement** | |
| Formations sans inscrit | **6** | |
| Orphelin user / course | 0 / 0 | |
| Doublons user×course | 0 | |
| Quiz attempts / réussites | **0** | |
| Certificats délivrés (data) | **0** | |
| usermeta progression métier | non significative | |
| postmeta completion leçon | non prouvée en masse | |

**Décision validée :** progression historique → **ARCHIVER** · tous les abonnés démarrent au **niveau initial** Citadelle · **ne pas** réinjecter comme progression active.

Classe : inscriptions = **donnée historique** (lien user↔parcours1 utile en archive) ; progression fine = **à ne pas importer** comme état actif.

---

## 11. Vidéos et pièces jointes pédagogiques

| Métrique | N | Classe |
|----------|--:|--------|
| Leçons publish | 38 | — |
| Leçons avec `_video` non vide | **11** | — |
| Leçons sans vidéo | **27** | anomalie / contenu texte seul |
| Source YouTube | **8** | **RÉFÉRENCER** (décision validée) |
| IDs YouTube uniques | **8** | détail **private only** |
| Source html5 locale (MP4 sur site) | **3** | **IMPORTER / RÉFÉRENCER** fichier |
| Vimeo | 0 | — |
| Doublons YouTube multi-leçons | 0 | chaque ID une leçon |
| `_tutor_attachments` (leçons) | 28 | PDF/docs liés · croiser médias |

**Rapport principal : pas d’URL YouTube non listée.**  
Fichiers privés : `private/youtube-ids.tsv`, `private/html5-local-videos.tsv`, `private/video-meta-raw.tsv` · `PII_PRIVATE_DO_NOT_COMMIT`.

---

## 12. Médias

| Métrique | N |
|----------|--:|
| Attachments DB | 73 |
| Fichiers physiques uploads | 383 |
| Octets uploads | 101 219 207 |
| `_wp_attached_file` existants sur disque | **73/73** (0 manquant) |
| Miniatures probables (-WxH) | ~300 |
| Originaux probables | ~83 |
| Groupes doublons taille (originaux) | 4 groupes / 8 fichiers |
| SHA-256 doublons confirmés (échantillon) | 4 copies extra |
| Attachments image / application | 71 / 2 |
| Vidéo/audio attachment MIME | 0 (vidéos html5 hors library ou peu indexées) |
| Alt text renseigné | (meta `_wp_attachment_image_alt`) à croiser · non bloquant |

**Classes provisoires médias :**
- Fichiers uploads originaux référencés → **IMPORTER**
- Miniatures dérivées → **ABANDONNER APRÈS VALIDATION** (régénérables)
- MP4 leçons html5 → **IMPORTER** ou **RÉFÉRENCER** storage
- YouTube → **RÉFÉRENCER**
- Logs Wordfence file lists → **ABANDONNER**

Voir `WM2-MEDIA-SUMMARY.json`.

---

## 13. Pages, articles et contenus

| Type | Publish | Autres | Classe |
|------|--------:|--------|--------|
| page | **56** | — | contenu public · **transformer** (pas design WP) |
| post | **0** | 1 trash | peu de blog |
| revision | 853 | — | **ne pas importer** |
| Elementor builder (pages publish) | signal fort | 850 flags site-wide (révisions incluses) | dépend Elementor |
| Pages avec shortcode `[` | comptage evidence | — | à transformer WM-3/5 |

**Pages utiles vs Next :** accueil, vision, live, prière, plateformes, ressources, rejoindre, integration, mahanaim, forum, compte, auth, boutique, contact, témoignages, donner, événements…  
**Chapelle Next** remplace une partie du design public → pages WP = **source de contenu**, pas de skin.

Liste : `evidence/t09-pages.tsv` · `WM2-URL-INVENTORY.csv`.

---

## 14. Taxonomies et menus

| Élément | N | Note |
|---------|--:|------|
| terms / term_taxonomy / relationships | 3 / 3 / 2 | quasi vide |
| taxonomies | `category` (1), `wp_theme` (2) | technique |
| Catégories Tutor produits | non matérialisées en terms utiles | |
| **nav_menu** | **0** | Nav = Elementor / headers custom |
| termmeta | 0 | |

**Mapping catégories Citadelle → WM-3.**

---

## 15. SEO et URLs

| Signal | Valeur |
|--------|--------|
| permalink_structure | `/%postname%/` |
| blogname | Chapelle Royale |
| WPLANG | fr_FR |
| Rank Math tables | 10 (liens, 404, redirections…) |
| postmeta rank_math_title/description/focus | **0** renseignés |
| Redirections Rank Math | 3 |
| 404 logs | 58 |
| Contenu avec domaine site | présent (URLs absolues) |
| Contenu avec youtube | présent (pages/leçons) |

**Inventaire URLs futures (WM-8) :** `WM2-URL-INVENTORY.csv`  
**Aucune redirection créée maintenant.**

---

## 16. FluentCRM

| Métrique | N |
|----------|--:|
| Contacts / abonnés | 33 |
| Status | 33 × `subscribed` |
| Listes / tags | 2 / 10 |
| Campagnes / emails campagne | 3 / 66 |
| Funnels | 1 |
| Désabonnements stockés | **0** ligne status unsubscribed (tous subscribed) |
| Domaines email (agrégés) | gmail 25, yahoo.fr 3, orange 2, autres 3 |

**Décisions :** contacts → **IMPORTER/RAPPROCHER** avec users · consentements **WM-3** · historiques campagnes → **ARCHIVER** · **ne jamais perdre** un désabonnement s’il apparaît plus tard.

---

## 17. Fluent Forms

| ID | Titre | Status | Soumissions |
|----|-------|--------|------------:|
| 1 | Contact Form Demo | published | 0 |
| 2 | Subscription Form | published | 0 |
| 3 | Contact — Chapelle Royale | unpublished | 0 |
| 4 | Newsletter — Lettre du Royaume | unpublished | 0 |
| 6 | Contact — Chapelle Royale | published | 0 |
| 7 | Demande de prière — Chapelle Royale | published | 0 |
| 8 | Newsletter — Lettre du Royaume | published | 0 |

**0 soumissions** en base Fluent Forms.  
Formulaire prière + table `wp_cr_prayer_requests` (1) → classe **archive sensible** · **private** · **à décider** (pas d’affichage contenu).

---

## 18. Commandes et paiements

| Source | Volume | Décision provisoire |
|--------|--------|---------------------|
| Tutor orders/items/earnings | **0** | N/A data |
| Fluent transactions | **0** | N/A |
| WooCommerce | **absent** | N/A |
| Chariow | **non détecté** en tables | UNKNOWN |

**Décision validée probable :** tout historique paiement → **ARCHIVER** (ici : rien à réinjecter).

---

## 19. Extensions et dépendances

**31 dossiers plugins** (restauration). Familles bloquantes pour retrait WP :

| Extension | Finalité | Remplacement Citadelle | Bloquant retrait WP |
|-----------|----------|------------------------|---------------------|
| Tutor + Pro | LMS | LMS Citadelle | **Oui** tant que non migré |
| FluentCRM + Campaign Pro | CRM/email | CRM Citadelle | Oui si newsletter |
| Fluent Forms + Pro | Forms | Forms Citadelle | Moyen (0 entries) |
| Elementor + Pro + ElementsKit | Pages | Chapelle Next / Citadelle UI | Oui pour contenu pages |
| Ultimate Member | Comptes/rôles | Auth Citadelle | Oui membership |
| Rank Math | SEO | SEO Next/Citadelle | Moyen |
| LiteSpeed / Wordfence | Perf/sécu | Infra | Non métier |
| FluentSMTP | Mail | Provider mail | Config |
| CR custom (live, forum, prière, badges…) | Features maison | Features Citadelle | Cas par cas |
| Google Site Kit | Analytics | GA reconnect | Non (tokens abandon) |
| All-in-One Migration / MCP | Outils | — | Non |

Secrets : **PRESENT** pour Site Kit tokens en usermeta (ne pas exporter) · autres **UNKNOWN** sans lecture wp-config prod.

---

## 20. Anomalies

Voir `WM2-ANOMALIES.csv`.

Principales :

| ID | Gravité | Anomalie |
|----|---------|----------|
| A1 | HAUT | 853/1087 posts = révisions |
| A2 | HAUT | 6/7 cours sans inscrit ; 2 publish vides (734,738) |
| A3 | HAUT | 27/38 leçons sans vidéo |
| A4 | MOYEN | Progression active non reconstituable (tables tutor vides) |
| A5 | MOYEN | 0 menus WP |
| A6 | MOYEN | SEO title/desc Rank Math vides en postmeta |
| A7 | MOYEN | 0 soumissions Fluent Forms |
| A8 | FAIBLE | Enrollments status `completed` (sémantique Tutor) |
| A9 | CRITIQUE (sécu export) | Tokens OAuth Site Kit en usermeta |
| A10 | HAUT (PII) | 1 prayer request + form prière |
| A11 | INFORMATION | Site/comptes 100 % 2026 |
| A12 | INFORMATION | Mix vidéos YouTube + MP4 locaux |

---

## 21. Matrice décisionnelle provisoire

Voir `WM2-DECISION-MATRIX.csv`.

Rappels verrouillés :
- users valides → **IMPORTER/RAPPROCHER**
- passwords → **ABANDONNER**
- progression → **ARCHIVER** (niveau initial Citadelle)
- YouTube → **RÉFÉRENCER**
- rôles WP → pas d’auto-import
- design WP → ne pas migrer · Next hors scope

---

## 22. Protection PII

| Règle | Application |
|-------|-------------|
| Emails/téléphones en clair | **Absents** des rapports |
| Password hashes | Famille agrégée seulement |
| Soumissions / prières | Non affichées |
| YouTube unlisted URLs | `private/` only |
| Dossier private | `PII_PRIVATE_DO_NOT_COMMIT` |
| Export import normalisé | **Non créé** (WM-4) |

---

## 23. Contrôles de non-impact

| Cible | Preuve |
|-------|--------|
| Sandbox tables | **126** fin d’audit |
| Sandbox mutations | Aucune (SELECT only `wm2_ro`) |
| Production HTTP | **200** |
| Production DB | Non ciblée |
| Citadelle git | HEAD/branche/porcelain inchangés |
| Chapelle Next git | inchangé |
| Email/webhook/cron audit | Non déclenchés |

---

## 24. Réserves

1. Sémantique exacte de `tutor_enrolled` status `completed` (inscription vs complétion cours) : **interprétée avec prudence** → progression **ARCHIVER**.  
2. Active plugins sérialisés : inventaire par **dossiers plugins + liste WM-1R** (31) ; parsing option PHP fragile sur flux distant.  
3. Checksums médias : échantillon doublons seulement (pas full tree).  
4. Unlisted YouTube : IDs en private ; **pas** d’appel API YouTube.

Ces réserves **n’empêchent pas** WM-3.

---

## 25. Prochaine action unique

**Attendre le contrôleur qualité**, puis un **GO WM-3 séparé** (mapping champ par champ + modèle LMS Citadelle).

**Interdit maintenant :** WM-3 sans GO · scripts d’import · export normalisé WM-4 · push · suppression sandbox · modification WP/Citadelle/Next.

---

## 26. Marqueur final

```
CITADELLE_WP_MIGRATION_WM2_AUDIT_COMPLETE_OK
```

sous verdict **`WM2_OK`**.
