# Connecteur Meta (Facebook + Instagram) — Configuration READ-ONLY

Intelligence Hub · HUB-4 · Facebook Graph API **en lecture seule** (insights de Page +
insights de compte Instagram). Aucun secret n'est journalisé ni renvoyé au client.

> État actuel dans cet environnement : **NOT_CONFIGURED_BUT_IMPLEMENTED**.
> Le connecteur est entièrement codé et testé, mais aucun token Meta n'est présent en
> environnement serveur. La création de l'app Meta + le consentement Business sont une
> **action du propriétaire** (interactive), hors périmètre de l'agent. Tant que les
> variables manquent, l'état affiché reste honnêtement « Non configuré » — jamais un
> faux réel.

## 1. Assets canoniques (source de vérité — confirmés le 2026-08-22)

Il existe **deux pages Facebook officielles**, gardées **séparées** (identité + rôle) ;
ne jamais en sélectionner une autre automatiquement.

| Asset | Rôle | Identifiant / URL |
|---|---|---|
| Facebook **CHAPELLE** | `institutional` | https://www.facebook.com/Chapelleduroyaume/ |
| Facebook **CITADELLE** | `digital_acquisition` | PAGE_ID `61592932298568` — https://www.facebook.com/profile.php?id=61592932298568 |
| Instagram **media** | `digital_media_acquisition` | `@chapelleduroyaume.media` — https://www.instagram.com/chapelleduroyaume.media/ |

L'agrégat « Meta » n'est qu'un **2ᵉ niveau** : il additionne des métriques sans jamais
perdre l'identité par page.

## 2. Créer l'app Meta et obtenir les tokens (propriétaire Business)

1. **Meta for Developers** → créer une app de type *Business*.
2. Ajouter les produits *Facebook Login for Business* et *Instagram Graph API*.
3. Demander les permissions **en lecture seule** :
   - `pages_read_engagement`
   - `read_insights`
   - `instagram_basic`
   - `instagram_manage_insights`
   - (`pages_show_list` pour lister/résoudre les pages)
4. Générer un **Page Access Token long-lived** pour **chaque** page (Citadelle et
   Chapelle). Recommandé : convertir le token court en long-lived (≈ 60 j) puis, à partir
   d'un token *utilisateur* long-lived, obtenir des **Page tokens qui n'expirent pas**.
5. Récupérer l'**IG User id** (compte Instagram *professionnel* relié à une Page) :
   `GET /{page-id}?fields=instagram_business_account`.
6. Le compte Instagram doit être **Professionnel / Créateur** et relié à une Page pour
   exposer les insights.

Aucune permission d'écriture, de publication, de messagerie ou de gestion de
publicités n'est demandée : **lecture seule**.

## 3. Variables d'environnement (SERVER-ONLY — jamais `NEXT_PUBLIC`)

| Variable | Rôle | Obligatoire |
|---|---|---|
| `META_APP_ID` | App id (public, gardé côté serveur) | recommandé |
| `META_APP_SECRET` | Secret d'app — sert au calcul `appsecret_proof` (jamais renvoyé) | recommandé |
| `META_PAGE_TOKEN_CITADELLE` | Page access token long-lived, page **Citadelle** (61592932298568) | pour Facebook Citadelle |
| `META_PAGE_TOKEN_CHAPELLE` | Page access token long-lived, page **Chapelle** | pour Facebook Chapelle |
| `META_PAGE_ID_CHAPELLE` | Id de la page Chapelle (à figer une fois résolu) | pour Facebook Chapelle |
| `META_IG_USER_ID` | IG User id (compte `@chapelleduroyaume.media`) | pour Instagram |
| `META_IG_TOKEN` | Token portant `instagram_basic` / `instagram_manage_insights` (à défaut, repli sur un Page token relié à l'IG) | pour Instagram |

- La page **Citadelle** a son PAGE_ID figé dans le code (`61592932298568`).
- La page **Chapelle** exige `META_PAGE_ID_CHAPELLE` (id résolu depuis son token) ;
  sans lui, la page reste « Non configuré » (token présent mais id à figer).
- `META_APP_SECRET` est facultatif ; s'il est présent, chaque appel Graph joint un
  `appsecret_proof = HMAC-SHA256(access_token, app_secret)` (recommandé par Meta).

### Sécurité
- Tous les modules du connecteur déclarent `import 'server-only'` → jamais bundlés côté
  client.
- Le token est passé au Graph API en query (obligatoire) mais **n'apparaît dans aucune
  réponse, aucun message d'erreur, aucun log**. Un garde-fou masque en plus tout
  `access_token=…` d'un éventuel message d'erreur.
- L'endpoint public `/api/intelligence/meta` n'expose que des **identités publiques**
  (page id / rôle / nom), des **métriques agrégées** et des **états** — jamais un secret.

## 4. Données servies (une fois configuré)

- **Facebook (par page, séparément)** : portée (`page_impressions_unique`),
  impressions/vues (`page_impressions`), interactions (`page_post_engagements`),
  clics (`page_consumptions`), abonnés (`followers_count`/`fan_count`), meilleurs posts.
- **Instagram** : reach, impressions/vues, interactions (`accounts_engaged` /
  `total_interactions`), activité de profil (`profile_views`), abonnés, meilleurs reels/posts.
- Fraîcheur : `SYNCED`.

## 5. Attribution Meta → Citadelle (first-party)

Le connecteur sépare strictement deux mondes :
- **Métriques plateforme** (Meta) : reach / likes / impressions.
- **Métriques attribuées Citadelle** (first-party) : visites, inscriptions, écoutes,
  progressions réellement attribuées à `facebook` / `instagram` (via `detectSource` + UTM),
  avec ventilation **Facebook Citadelle vs Chapelle** lorsque l'UTM (campagne/contenu)
  porte un marqueur explicite (`citadelle` / `chapelle`) ; sinon « indéterminée ».

> Le « meilleur canal » se juge sur **visites / inscriptions / progressions**, jamais sur
> le reach ou les likes.

### Conseil UTM pour distinguer les deux pages Facebook
Taguer les liens sortants de chaque page, p. ex. :
`?utm_source=facebook&utm_medium=social&utm_campaign=culte_citadelle` (page Citadelle) et
`…&utm_campaign=annonce_chapelle` (page Chapelle). Sans marqueur, l'attribution reste
honnêtement « indéterminée ».

## 6. Endpoint

`GET /api/intelligence/meta?period=7d|28d|90d` — **admin-only** (`isAdminRequest`),
`force-dynamic`. Renvoie `{ generatedAt, period, platform, attribution }`. En l'absence
de config, `platform` est `NOT_CONFIGURED` ; l'attribution first-party reste servie
(ou démo marquée si la lecture DB échoue) — jamais de faux réel.
