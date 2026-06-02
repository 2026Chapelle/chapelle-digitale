# Rapport de corrections — QA finale V1 (Citadelle du Royaume)

Date : 2026-06-01 · Build production : OK · ZIP : `deploy-citadelle.zip` (19,6 Mo)

> Principe respecté : **aucune refonte, aucune V2**. Seuls les points bloquants QA
> ont été corrigés, de façon additive, sans casser l'existant.
> `npx tsc --noEmit` ✅ · `npm run build` ✅

---

## 1. Parcours d'intégration — Niveau 1
**Fichier :** `src/app/(member)/member/dashboard/parcours/page.tsx`
- Ajout (additif) d'une section **« Programme d'Intégration — Niveau 1 »** au-dessus du
  parcours de discipulat existant (non modifié).
- Les 3 parcours progressifs : **1. Je découvre la maison → 2. Je stabilise ma foi →
  3. Je deviens un disciple actif**, avec la logique **Entrer → S'enraciner → Être formé → Être envoyé**.
- Progression dérivée du **statut réel** du membre ; chaque parcours est relié aux formations
  et au parcours de discipulat affiché en dessous.

## 2. Statut membre / accès formations
**Fichier :** `src/app/api/member/formations/[id]/modules/route.ts`
- Le verrou « Module verrouillé — statut requis : membre » est levé quand :
  - le membre est **inscrit** à la formation (connecté + inscrit → ouvre les modules), **ou**
  - la formation est un **parcours d'intégration** (détecté via type/niveau/catégorie/slug :
    `intégration`, `accueil`, `nouveau`, `premiers pas`, `découverte`).
- Le verrou de **prérequis** (module précédent) est conservé.

## 3. Live vidéo
**Fichier :** `src/app/(member)/member/dashboard/lives/page.tsx`
- Le **faux lecteur** est remplacé par un **vrai lecteur** :
  - iframe **YouTube** à partir de l'URL/ID admin (`youtube_url`), via l'extracteur d'ID existant ;
  - sinon balise `<video>` si une vidéo hébergée (`video_url`) est fournie ;
  - sinon **état clair** « vidéo pas encore disponible » + vignette.
- La **vignette téléversée** (`cover_url`) est affichée (live + replays).
- Les **replays** sont désormais cliquables (ouverture de la vidéo).

## 4. Livret d'accueil / Mes Ressources
**Fichier :** `src/app/(member)/member/dashboard/ressources/page.tsx`
- Le bouton **« Accéder »** ouvre/télécharge réellement le fichier (URL Supabase Storage / média).
- Le **compteur de téléchargement** n'est incrémenté **qu'après un clic réussi**.
- Si aucune URL n'est disponible, le bouton affiche « Bientôt » (jamais inactif silencieux).

## 5. Bible Louis Segond + plan annuel *(nouveau, léger et évolutif)*
**Fichiers :** `src/lib/bible.ts`, `src/app/api/bible/route.ts`,
`src/app/(member)/member/dashboard/bible/page.tsx`,
`src/components/features/member/BibleTodayWidget.tsx`
- **Bible du jour**, **plan annuel 365 jours** (Bible entière, ordre canonique).
- **Reprise automatique** là où le membre s'est arrêté.
- **Marquer un jour comme lu**, **pourcentage d'avancement**, **historique de lecture**.
- **Verset favori** et **recherche par référence** (« Jean 3 », « Psaumes 23 »…).
- **Widget « Lecture du jour »** sur le tableau de bord membre.
- **Architecture légère** : seules les métadonnées des 66 livres sont embarquées ; **le texte
  n'est jamais embarqué** — il est récupéré à la demande via le proxy serveur `/api/bible`
  (source LSG publique, interchangeable pour une future version premium).
- **API indisponible** : message élégant + lien vers une Bible en ligne ; **jamais de blocage**.
- Lien ajouté dans la barre latérale membre.

## 6. Boutons liens rapides
**Vérifié :** `src/app/(member)/member/dashboard/page.tsx`
- Live, Prières, Cours, Agenda, Groupes, Alertes pointent vers des pages **existantes**
  (`/lives`, `/prieres`, `/formations`, `/evenements`, `/groupes`, `/notifications`).
- Aucun bouton inactif. (Vérification confirmée — pages présentes au build.)

## 7. Dons en FCFA
**Fichier :** `src/app/(member)/member/dashboard/dons/page.tsx`
- Remplacement de l'euro par le **FCFA** partout dans « Mes Dons » (KPI, tableau, total,
  contributions de campagne).
- Format : `10 000 FCFA`, `50 000 FCFA` (séparateur de milliers FR).

## 8. Histoire de l'église
**Fichier :** `src/app/(public)/notre-histoire/page.tsx`
- Frise et textes corrigés :
  - **1998** = début du ministère du **Révérend Doxa Salomon**.
  - **2018** = naissance de la **CIER**, en **Israël**, suite à une vision de répandre
    l'Évangile dans les nations.
  - **Premier culte à Abidjan, Plateau Dokui**.
  - **Vision** : une Église **100 % physique et 100 % portée par Internet et le digital**.
- Suppression des chiffres/événements inventés (ex. « 127K membres », « Kinshasa »).
- Carte fondateur mise à jour au nom du Révérend Doxa Salomon.

## 9. Email de confirmation
**Fichiers :** `src/lib/site-url.ts`, `src/app/(auth)/register/page.tsx`,
`src/app/auth/callback/route.ts`, `EMAIL_CONFIRMATION_TEMPLATE.html`
- Le lien de confirmation et la redirection finale utilisent **le domaine canonique**
  (`NEXT_PUBLIC_SITE_URL`, défaut `https://citadelle.chapelleduroyaume.org`) — **plus jamais
  `node76-eu.n0c.com`**. La confirmation aboutit sur `/member/dashboard`.
- Template d'email **premium royal, en français**, bouton **« Activer mon compte »** :
  fourni dans `EMAIL_CONFIRMATION_TEMPLATE.html`.

### ⚠️ Étapes manuelles à faire dans Supabase (hors code)
1. **Authentication → URL Configuration**
   - Site URL : `https://citadelle.chapelleduroyaume.org`
   - Redirect URLs : `https://citadelle.chapelleduroyaume.org/auth/callback` et `…/**`
2. **Authentication → Email Templates → Confirm signup** : coller le contenu de
   `EMAIL_CONFIRMATION_TEMPLATE.html`.
3. **Déploiement** : définir `NEXT_PUBLIC_SITE_URL=https://citadelle.chapelleduroyaume.org`
   (dans le `.env` à côté de `app.js`).

## 10. Livraison
- `npm run build` (production, `output: standalone`) : **OK**.
- `deploy-citadelle/` réassemblé avec le build neuf + **ZIP** `deploy-citadelle.zip` régénéré.
- Déploiement PlanetHoster/N0C inchangé (Passenger `app.js`).

---

# Lot 2 — Zéro donnée fictive (espace membre)

Règle appliquée : **si donnée réelle → afficher ; sinon → état vide honnête**. Aucun chiffre, nom, badge, XP, graphique ou historique inventé.

- **Mes Dons** : plus aucun mock. Si aucun don réel → `0 FCFA` + « Aucun don enregistré pour le moment » ; graphique, statistiques, campagnes et historique masqués. Montants en **FCFA**.
- **Mon Parcours** : suppression des modules « terminés » codés en dur (XP, %, badges). Progression dérivée du profil réel ; sinon 0 % / aucun module / aucun badge.
- **Mon Engagement** : score réel (`profile.score_engagement`, défaut **0**), niveau réel (défaut **Visiteur**), **aucun badge débloqué**. Barème de points officiel affiché à titre informatif.
- **Tableau de bord** : retrait du widget d'engagement entièrement fictif (streak, habitudes, veillée, objectifs) ; suppression des valeurs de démo (prénom « Jean », score 72, étape 3).
- **Prières** : streak « 12 jours » et stats 3/7/34 remplacés par des stats réelles ; « Mes demandes » et « Mur communautaire » lus depuis `priere_demandes` ; journal vidé (état vide).
- **Ressources / Formations** : démarrent vides (plus de repli mock) → données réelles ou état vide.
- **Messages** : conversations fictives supprimées → état vide honnête.
- **Notifications** : déjà vide (aucune notification fictive).

# Lot 3 — Admin, articles, enseignements, formations

- **Aperçu admin (#4, #6)** : bouton « Aperçu » activé pour **Modules** et **Parcours** ; la route `/preview/[type]/[id]` gère désormais `formation_modules` et `parcours` (titre, vidéo YouTube/`youtube_id`, texte, PDF).
- **Enseignements (#5)** : image en **téléversement OU URL** (champ médiathèque) ; nouvel espace **/enseignements** (public + lien menu membre) listant `cms_teachings` (vidéo / audio / texte) avec état vide ; aperçu admin déjà fourni par le CmsManager.
- **Articles (#2)** : lien **Articles** ajouté au footer et au menu membre ; page détail refondue avec **image hero en overlay + titre par-dessus**.
- **Formations publiques (#3)** : cartes passées en flex-colonne (pied aligné, titre sur 2 lignes max, hauteurs égalisées) → plus de carte coupée, design inchangé.
- **CRUD générique (#7)** : le CmsManager fournit déjà Créer / Modifier / Supprimer / Dupliquer / Publier-Brouillon / Aperçu / état vide pour tous les contenus `cms_*`.
- **Admin zéro chiffre fictif (#1)** : tableaux de bord **Membres**, **Formulaires** et **Tableau de bord** démarrent à **0 / liste vide** (plus de repli mock) ; les vraies valeurs arrivent de Supabase.

# Lot 4 — Exploitation (événements, contact, newsletter, prière, live)

- **Mes Événements (#1)** : affiche l'**affiche/image** de l'événement ; **anti double-inscription** (« Déjà inscrit ✓ ») ; bouton **Rappel** dédupliqué (« Rappel activé »).
- **Champ WhatsApp événement (#2)** : ajouté au formulaire admin (numéro ou lien de groupe) + colonne DB (`cms_events.whatsapp`) + bouton WhatsApp côté membre.
- **Contact (#3)** : email officiel **info@chapelleduroyaume.org** ; siège **Abidjan — Cocody Angré, Rue M123**, +225 07 48 84 24 15, Lun–Sam 8h–17h ; bureaux non vérifiés retirés.
- **Newsletter (#4)** : gestion de **campagnes** (créer, audience, programmer, envoyer, brouillon/programmé/envoyé, historique) + table `newsletter_campaigns`. Bandeau clair : **« préparé — envoi réel à configurer »** (pas d'expédition réelle branchée).
- **Plans / engagement (#5)** : section renommée **« Soutenir l'œuvre & accéder aux ressources avancées »** ; texte clarifiant que le parcours Visiteur→Leader reste **gratuit et ouvert**, les formules ne sont pas une barrière.
- **Mur de prière (#6)** : soumission **réservée aux comptes connectés** ; message « Connectez-vous ou créez un compte… » + bouton désactivé pour les visiteurs ; stats fictives remplacées par des repères qualitatifs.
- **Live & Streaming (#7)** : section **« Programmes réguliers »** avec les horaires officiels (Abidjan/GMT) — Culte dimanche 10h30, Matinale mercredi 05h30, Oracle mardi 20h30, Vendredi de Puissance 21h00, Batailles de la Nuit 21h30, Cohorte de prière jeudi.

## Nouvelles migrations Supabase à appliquer
- `20260601100000_event_whatsapp.sql` — colonne WhatsApp des événements.
- `20260601100100_newsletter_campaigns.sql` — table des campagnes newsletter.

## Restant à finaliser (signalé)
*(Tous traités — voir Lot 5 ci-dessous.)*

---

# Lot 5 — Finalisation (audit admin, vitrine, envoi newsletter)

- **Admin zéro fictif (complété)** :
  - **Statistiques** : déjà 100 % réel (API `/api/admin/stats`).
  - **Analytics** : réécrit sur données réelles (KPIs, géographie, entonnoir, répartition engagement) ; graphiques sans source temps-réel → « Aucune donnée disponible ».
  - **Engagement** : classement/badges/scores fictifs supprimés → KPIs à 0 + états vides honnêtes.
  - **CRM** : contacts et pipeline fictifs supprimés → 0 / « Aucun contact pour le moment ».
- **Formations publiques (vitrine)** : page réécrite sur les **formations réelles publiées** (table `formations`) avec recherche, filtres dérivés du réel, stats réelles et **état vide** ; plus aucun chiffre/vitrine inventé.
- **Newsletter — envoi réel** : la campagne « Envoyer » expédie réellement via **Resend** si `RESEND_API_KEY` (et `NEWSLETTER_FROM`) sont configurés ; sinon la campagne est enregistrée/horodatée sans expédition. Bandeau mis à jour en conséquence.

### Variables d'environnement (optionnelles) pour l'envoi réel
- `RESEND_API_KEY` — clé API du fournisseur Resend.
- `NEWSLETTER_FROM` — expéditeur vérifié, ex. `Citadelle du Royaume <newsletter@chapelleduroyaume.org>`.

---

# Lot 6 — Centre de notifications (cloche)

Vraie cloche cliquable, **données réelles uniquement**, état lu/non-lu (localStorage, léger, sans écriture en base).

- **Composant réutilisable** `NotificationBell` : badge = **non lues uniquement** (9+ au-delà), panneau déroulant, icône/vignette + titre + résumé + date relative + pastille non-lu + **lien cliquable** vers la page concernée, **« Tout marquer comme lu »**, **clic = marquer lu**, **état vide** « Aucune notification pour le moment », fermeture au clic extérieur (n'obstrue jamais).
- **Membre** (`/api/member/notifications`) — dérivé du réel : nouvelles formations, événements, lives/replays, enseignements, témoignages validés, et suivi des demandes de prière du membre. Cloche montée dans la barre de navigation (remplace l'ancien point rouge statique) ; page `/member/dashboard/notifications` rebranchée sur la même source + même état lu/non-lu ; badge fictif « 3 » du menu retiré.
- **Admin** (`/api/admin/notifications`) — alertes réelles : nouvelles demandes de prière, messages de contact, inscriptions événement, témoignages à modérer, nouveaux membres, nouveaux dons (si table dispo). Cloche montée dans l'en-tête de la barre latérale admin.
- **Robustesse** : chaque source est isolée (try/catch) — une table absente ne casse jamais le centre ; lecture via service-role (admin) / session membre.
- **Table** : la table `chapelle.notifications` existante n'est pas requise (approche dérivée). Aucune migration ajoutée pour ce lot.

---

# Lot 7 — Audit complet « zéro donnée fictive » (toute la plateforme)

Balayage exhaustif. Règle : **donnée réelle → afficher ; sinon → « Aucune donnée disponible » / état vide / 0**.

### Accueil (`src/components/sections/`)
- **ImpactSection** : grille de 6 stats inventées (127 000 membres, 120 nations, 15 000 étudiants, 89 000 vies…) + compteur animé **supprimés** → titre/vision qualitatifs.
- **HeroSection** : stats « 127K membres · 120 nations · 500+ cultes » et bandeau « ★ 127 000+ membres » **supprimés**.
- **LiveSection** : faux « 2 847 en ligne », faux chrono live, « 120+ nations » **supprimés**.
- **FormationsSection** : barre stats (50+, 15K+, 3K+, 4.9★) + `inscrits`/`note` par formation **supprimés**.
- **PrayerSection** : 6 fausses demandes nommées + stats 50K **supprimées** → état vide « Aucune demande de prière ».
- **TestimonialsSection** : 6 faux témoignages nommés **supprimés** → état vide.
- **PodcastSection** : fausses écoutes/dates + auteurs fictifs **supprimés**.
- `HeroSection.legacy.tsx` (code mort, non rendu) **supprimé**.

### Pages publiques (`src/app/(public)/`)
- **plateformes** (liste + détail) : compteurs membres/pays inventés et faux témoignages **supprimés** → offre réelle + état vide.
- **podcast / temoignages** : listes mock **vidées** → état vide propre (« Aucun épisode / témoignage »).
- **rejoindre / communaute / servir / partenaires / benevolat** : « 50 000 membres », « 120+ nations », fausses places, faux témoins **supprimés** → formulations qualitatives.
- **dons** : compteurs de collecte fictifs (67 450 €…) **supprimés** → causes sans faux tracker.
- **notre-histoire** : déjà corrigé (faits réels) ; métadonnées SEO « 28 ans / Kinshasa / 120+ » **corrigées**.

### Admin (`src/app/(admin)/`)
- **communications, live, ressources, contenu** : campagnes/templates/lives/clés/ressources fictifs **vidés** + stats à 0 + états vides.
- **crm** : note pastorale fictive + chiffres résiduels **supprimés**.
- **parametres** : emails/domaine `cier.org` **corrigés** ; compteurs plateformes → 0 ; fausses sessions **supprimées**.
- **Couche données** `admin-live.ts` : repli mock (`getDashboardStats`, `getFormSubmissions`, `MEMBRES`) **remplacé** par 0 / `[]` → les API admin ne servent plus jamais de données fictives.

### Emails / domaine / adresses
- Domaine canonique partout : `cier.org` / `cier-chapelle.org` → **`chapelleduroyaume.org`** (constants, layout SEO/JSON-LD, sitemap, robots, og, RouteError, pages légales, paramètres, démo).
- Email officiel : **info@chapelleduroyaume.org** ; DPO/legal/support : `…@chapelleduroyaume.org`.
- Adresse légale fictive (Paris, SIRET 123 456…) **remplacée** par le siège réel **Abidjan — Cocody Angré, Rue M123**.

### Formations publiques
- `/formations` (liste) et `/formations/[slug]` (détail) **rebranchés sur la table réelle `formations`** (publiées) ; instructeur/bio/modules/inscrits inventés **supprimés** → données réelles ou « introuvable » / « programme bientôt disponible ». Sitemap & JSON-LD ne référencent plus le mock.

### Vérification
- `npx tsc --noEmit` ✅ · `npm run build` ✅ (102 pages). Balayage final : **aucun chiffre/email/adresse fictif** dans le code rendu. Les fichiers `lib/mock/*` subsistent uniquement comme **types** (jamais rendus).
