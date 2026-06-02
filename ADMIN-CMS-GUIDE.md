# Guide du back-office CMS — Citadelle du Royaume

Ce guide explique comment administrer les contenus du site **sans toucher au code**
et **sans régénérer un ZIP** à chaque modification, une fois Supabase connecté.

---

## 1. Principe général : « Supabase-ready, repli statique »

Le site fonctionne dans deux modes, sans aucune rupture :

| Mode | Condition | Comportement |
|------|-----------|--------------|
| **Réel** | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` définis | Les contenus proviennent des tables `cms_*` / `giving_*`. Le back-office écrit en base. **Aucun redéploiement nécessaire.** |
| **Démo / repli** | Supabase non configuré | Le site affiche les contenus statiques de secours. Le back-office indique « connectez Supabase ». |

> Le repli garantit que le site public n'est **jamais** cassé, même sans base.

---

## 2. Connexion au back-office

- URL : **`/admin/login`** (page séparée, jamais redirigée vers `/login` membre).
- Saisir le **code d'accès administrateur** (variable `ADMIN_ACCESS_CODE`).
- Après code correct → redirection vers **`/admin/dashboard`**.
- Déconnexion via le bouton dans la barre latérale.

`/admin/*` est protégé par un cookie de session admin (`cier_admin`).
`/login` et `/member/*` restent réservés aux membres (auth Supabase email/mot de passe + Google + récupération de mot de passe via `/forgot-password`).

---

## 3. Variables d'environnement (PlanetHoster / `.env.local`)

```bash
# Supabase (active le mode réel)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # côté serveur uniquement

# Back-office
ADMIN_ACCESS_CODE=choisir-un-code-fort
ADMIN_SESSION_TOKEN=choisir-un-jeton-long
```

---

## 4. Appliquer les migrations Supabase

Les migrations sont dans `supabase/migrations/` :

- `20260530100000_cms_core.sql` → tables CMS (pages, sections, blocs d'accueil,
  navigation, médias, événements, lives, podcasts, enseignements, témoignages,
  contenu plateformes, paramètres) + RLS + seed.
- `20260530100100_giving_chariow.sql` → tables Dons/Offrandes (Chariow) +
  RLS + seed des 3 produits + réglages widget.

Application :

```bash
# via Supabase CLI
supabase db push

# ou : copier/coller le contenu des fichiers dans l'éditeur SQL Supabase
```

> **Important** : le schéma `public` est exposé par défaut à l'API REST.
> Les contenus **publiés** sont lisibles publiquement (clé anon) ; les écritures
> passent uniquement par le back-office (service role).

---

## 5. Modules d'administration

Accessibles depuis la barre latérale `/admin` :

| Module | Route | Table | Ce qu'on gère |
|--------|-------|-------|----------------|
| Dashboard | `/admin/dashboard` | RPC `admin_dashboard` | KPIs temps réel |
| Membres | `/admin/membres` | `members` | Annuaire des membres |
| **Pages** | `/admin/pages` | `cms_pages` | Pages éditoriales + SEO |
| **Médias** | `/admin/medias` | `cms_media` | Images, vidéos, audio, PDF, YouTube |
| **Lives & Cultes** | `/admin/lives` | `cms_lives` | Diffusions en direct |
| **Podcasts** | `/admin/podcasts` | `cms_podcasts` | Épisodes audio |
| **Enseignements** | `/admin/enseignements` | `cms_teachings` | Prédications |
| **Événements** | `/admin/evenements` | `cms_events` | Agenda |
| **Témoignages** | `/admin/temoignages` | `cms_testimonies` | Modération |
| **Dons & Offrandes** | `/admin/dons` | `giving_products` | Catalogue Chariow |
| Prières | `/admin/prieres` | `prayer_requests` | Demandes de prière |
| Formulaires | `/admin/formulaires` | `form_submissions` | Leads |
| Paramètres | `/admin/parametres` | `cms_settings` | Réglages globaux |

### Fonctionnalités CMS disponibles

1. ✅ Modifier les **textes** (titre, sous-titre, corps, description).
2. ✅ Modifier les **images** (URL de média / couverture).
3. ✅ Ajouter une **vidéo YouTube** (champ lien YouTube sur Lives/Enseignements/Médias).
4. ✅ Ajouter un **événement**.
5. ✅ Ajouter un **live**.
6. ✅ Ajouter un **podcast**.
7. ✅ Ajouter un **enseignement**.
8. ✅ **Activer / désactiver** une section (bouton statut « Publié / Masqué »).
9. ✅ **Changer l'ordre** (flèches ↑ ↓, champ « Ordre »).
10. ✅ **Prévisualiser** : ouvrir la page publique correspondante dans un onglet.
11. ✅ **Publier / dépublier** (basculer le statut).
12. ✅ **Sauvegarder dans Supabase** (chaque action écrit en base).

Chaque module propose : liste, création (modale), édition, publication/activation,
réordonnancement et suppression.

---

## 6. Dons & Offrandes (Chariow)

> Le moyen de paiement est **Chariow**, pas Stripe. Aucune logique de checkout,
> aucune donnée bancaire n'est stockée sur ce site. Le paiement réel se déroule
> chez Chariow (widget ou lien direct).

### Branding visiteur

Côté public, **le nom « Chariow » n'apparaît pas**. On utilise :
« Don volontaire », « Offrande », « Soutenir l'œuvre », « Partenariat »,
« Accès au parcours ». Le nom « Chariow » n'est visible que dans le back-office.

### Gérer un produit (`/admin/dons`)

Pour chaque produit on règle : titre public, description, **type**
(don / offrande / inscription / accès / partenariat), **product_id Chariow**
(`prd_xxxxxx`), **lien direct**, texte & couleur du bouton, statut actif/inactif,
position d'affichage, **page associée**.

→ Ajouter/modifier un produit **ne nécessite aucun redéploiement**.

### Produits livrés (seed)

| Produit | Type | Product ID | Page |
|---------|------|------------|------|
| Don volontaire | don | `prd_b0vay9` | `dons` |
| Accès au parcours (Destinée) | accès | `prd_ymoyd3` | `destinee-acces` |
| Partenariat — Couronne d'or | partenariat | `prd_w9h86o` | `partenariat` |

Domaine boutique : `zrqcqzjz.mychariow.shop`.

### Pages publiques concernées

`/dons`, `/offrandes`, `/destinee-acces`, `/partenariat`, sections CTA d'accueil,
pages de formation si paiement requis. Chacune affiche les produits actifs via un
**bouton/lien direct fiable** (`GivingButton`) ; un widget officiel
(`ChariowEmbed`) peut être monté, avec **repli en lien direct** si le widget ne
se charge pas.

### Tables

- `giving_products` — catalogue administrable (`provider = 'chariow'`).
- `giving_widget_settings` — réglages globaux du widget (domaine, script, couleurs).
- `giving_transactions_log` — journal analytique (vues/clics/redirections).
  **Aucune donnée bancaire.**

---

## 7. API back-office

| Endpoint | Méthodes | Rôle |
|----------|----------|------|
| `/api/admin/cms/<resource>` | GET/POST/PATCH/DELETE | CRUD des tables `cms_*` |
| `/api/admin/giving/products` | GET/POST/PATCH/DELETE | CRUD produits Chariow |
| `/api/admin/giving/settings` | GET/PATCH | Réglages widget |
| `/api/admin/giving/log` | GET | Journal analytique |
| `/api/giving/products` | GET (public) | Catalogue actif + réglages (repli statique) |
| `/api/giving/log` | POST (public) | Log de clic (sans donnée bancaire) |

Toutes les routes `/api/admin/*` exigent le cookie de session admin.

---

## 8. Build & déploiement

```bash
npm run build           # build standalone (type-check actif)
```

Le projet est packagé en **standalone portable** pour PlanetHoster (Passenger
`app.js`). Voir `deploy-citadelle/DEPLOIEMENT-PLANETHOSTER.md`.

> Une fois Supabase configuré en production, **les modifications de contenu sont
> immédiates** : plus besoin de rebuild ni de ré-upload du ZIP. Le ZIP n'est à
> régénérer que pour une mise à jour du **code** (pas du contenu).

---

## 9. Stripe → Chariow (migration effectuée)

- Le SDK Stripe et ses dépendances (`stripe`, `@stripe/*`) ont été retirés.
- L'ancienne route `/api/dons` (Payment Intents + webhook Stripe) a été remplacée
  par une route Chariow (lien + journal, sans checkout).
- Les mentions « Stripe » côté visiteur ont été remplacées par « prestataire de
  paiement sécurisé ».
- La CSP autorise désormais `js.chariowcdn.com` et `*.mychariow.shop`.
