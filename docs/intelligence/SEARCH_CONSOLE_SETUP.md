# Connecteur Google Search Console — Mise en place (LECTURE SEULE)

Le hub SEO de Citadelle lit les données Search Console via un **compte de service**
Google (server-only). Cet accès est **strictement en lecture** : aucune écriture,
aucune soumission ni suppression de sitemap. Sans credentials, le connecteur reste
dans l'état honnête `NOT_CONFIGURED` (aucune donnée inventée).

## 1. Activer l'API

Dans [Google Cloud Console](https://console.cloud.google.com/) :

1. Sélectionner (ou créer) un projet.
2. **APIs & Services → Library** → activer **Google Search Console API**.

## 2. Créer un compte de service

1. **APIs & Services → Credentials → Create credentials → Service account**.
2. Nommer le compte (ex. `citadelle-seo-readonly`). Aucun rôle IAM projet requis
   (l'accès aux données se donne côté Search Console, étape 4).
3. Sur le compte créé : **Keys → Add key → Create new key → JSON**. Télécharger le
   fichier JSON. Il contient `client_email` et `private_key` — **secret**, ne jamais
   le committer ni l'exposer côté client.

## 3. Récupérer l'adresse du compte de service

C'est le champ `client_email` du JSON, de la forme
`citadelle-seo-readonly@<projet>.iam.gserviceaccount.com`.

## 4. Partager la propriété Search Console avec le compte de service

Dans [Search Console](https://search.google.com/search-console) :

1. Ouvrir la propriété concernée (propriété de **domaine**
   `sc-domain:chapelleduroyaume.org` **ou** propriété d'**URL**
   `https://citadelle.chapelleduroyaume.org/`).
2. **Paramètres → Utilisateurs et autorisations → Ajouter un utilisateur**.
3. Saisir l'adresse `client_email` du compte de service.
4. Autorisation **« Restreint »** (lecture) — suffisante. « Complet » fonctionne
   aussi mais reste inutile puisque l'accès est read-only.

> L'API URL Inspection exige au minimum l'autorisation de lecture sur la propriété
> **exacte** qui possède les URLs inspectées.

## 5. Variables d'environnement (server-only)

Renseigner **côté serveur uniquement** (jamais de préfixe `NEXT_PUBLIC`) :

| Variable | Requis | Rôle |
| --- | --- | --- |
| `GSC_SERVICE_ACCOUNT_JSON` | oui (ou le repli) | Contenu JSON complet du compte de service. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | repli | JSON partagé Search Console **+** GA4 si `GSC_*` absent. |
| `GSC_SITE_URL` | non | Propriété explicite (`sc-domain:chapelleduroyaume.org` ou `https://citadelle.chapelleduroyaume.org/`). Si absent → auto-détection via `sites.list`. |

Notes :

- Le JSON peut contenir la `private_key` avec des `\n` littéraux (échappés) : le
  connecteur les restaure automatiquement avant la signature.
- Convention **partagée avec le connecteur GA4** : les deux préfèrent leur variable
  dédiée (`GSC_SERVICE_ACCOUNT_JSON` / `GA4_SERVICE_ACCOUNT_JSON`) puis retombent sur
  le JSON commun `GOOGLE_SERVICE_ACCOUNT_JSON`. Un même compte de service peut servir
  aux deux (partager la propriété GSC **et** ajouter le compte à GA4).
- Si `GSC_SITE_URL` désigne une propriété de **domaine**, les lignes/pages
  d'analytics sont filtrées à l'hôte Citadelle (`citadelle.chapelleduroyaume.org`).

## 6. Portée (scope) et sécurité

- Scope unique demandé : `https://www.googleapis.com/auth/webmasters.readonly`
  (**lecture seule**).
- Auth : JWT RS256 signé localement (module `crypto` natif) → échange OAuth2. Aucune
  dépendance npm ajoutée.
- Le token d'accès et la clé privée **ne sont jamais journalisés, renvoyés ni
  exposés**. Les modules serveur commencent par `import 'server-only'`.
- En cas d'erreur API, le connecteur renvoie un statut `ERROR` avec une raison **non
  sensible** (ex. `gsc_http_403`) et des données partielles — jamais de valeur
  fabriquée.

## 7. Endpoint applicatif

`GET /api/intelligence/seo/search-console?period=7d|28d|90d` (admin uniquement).
Renvoie le contrat `SearchConsoleData` (statut connecteur + totaux + top requêtes /
pages + indexation des pages piliers + sitemaps). Fraîcheur : **différée (SEO)**,
jamais « temps réel ».
