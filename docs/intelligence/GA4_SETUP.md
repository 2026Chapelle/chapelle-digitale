# Connecteur GA4 organique — Mise en place (SEO Intelligence Hub)

Ce connecteur lit **en lecture seule** la performance du trafic **Organic Search**
depuis Google Analytics 4 (GA4), via la *Google Analytics Data API* (`runReport`).
Il est **server-only** : aucun secret n'est jamais exposé au client, ni journalisé,
ni renvoyé dans une réponse HTTP.

> GA4 et l'analytics **first-party** Citadelle sont **deux sources distinctes**
> (`google_analytics` vs interne). Ne jamais fusionner leurs métriques sans libellé
> de source explicite. La fraîcheur GA4 est **SYNCED** (rapports par lots), jamais
> « temps réel ».

## 1. Activer l'API

1. Dans la console Google Cloud, ouvrir le projet qui héberge (ou hébergera) le
   compte de service.
2. Activer **Google Analytics Data API** (`analyticsdata.googleapis.com`).

## 2. Compte de service (réutilisable avec Search Console)

Le connecteur partage la convention d'authentification avec le connecteur Search
Console. Vous pouvez **réutiliser le même compte de service**.

1. *IAM & Admin → Service Accounts → Create service account*.
2. Aucune permission IAM de projet n'est nécessaire pour la lecture GA4.
3. Créer une **clé JSON** et la conserver côté serveur uniquement (jamais dans le
   dépôt, jamais dans une variable `NEXT_PUBLIC_*`).

## 3. Donner l'accès à la propriété GA4

1. Dans **Google Analytics → Admin → Property Access Management**.
2. Ajouter l'adresse e-mail du compte de service
   (`…@…iam.gserviceaccount.com`).
3. Rôle **Viewer** (Lecteur) — suffisant et conforme à la lecture seule.

## 4. Récupérer l'identifiant de propriété

- *Admin → Property Settings → **Property ID*** : un identifiant **numérique**
  (ex. `123456789`).
- Le connecteur accepte soit `123456789`, soit la forme préfixée
  `properties/123456789` (normalisation automatique).

## 5. Variables d'environnement (server-only)

| Variable | Rôle | Requis |
| --- | --- | --- |
| `GA4_SERVICE_ACCOUNT_JSON` | JSON complet de la clé du compte de service. | Oui (ou repli ci-dessous) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Repli **partagé** avec Search Console si `GA4_SERVICE_ACCOUNT_JSON` est absent. | Repli |
| `GA4_PROPERTY_ID` | Identifiant numérique de la propriété GA4 (`123456789` ou `properties/123456789`). | **Oui** |

Règles :

- **Jamais** de préfixe `NEXT_PUBLIC_` : ces variables sont strictement serveur.
- Les clés PEM avec `\n` littéraux sont supportées (restaurées à la signature).
- Si les credentials **ou** `GA4_PROPERTY_ID` sont absents/invalides → le
  connecteur renvoie l'état honnête **`NOT_CONFIGURED`** (jamais de donnée inventée).

Exemple (fichier d'environnement serveur, non commité) :

```bash
GA4_SERVICE_ACCOUNT_JSON='{"client_email":"…","private_key":"-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n", …}'
GA4_PROPERTY_ID=123456789
```

## 6. Portée (scope) et lecture seule

- Scope OAuth unique : `https://www.googleapis.com/auth/analytics.readonly`.
- Aucune écriture n'est possible : le connecteur n'appelle que `runReport`.

## 7. Ce que lit le connecteur

- **Filtre** : `sessionDefaultChannelGroup` = `Organic Search`.
- **Dimension** : `landingPagePlusQueryString` (page d'atterrissage).
- **Métriques** : `sessions`, `totalUsers`, `engagedSessions`, `engagementRate`
  (normalisé 0..1), et `conversions` en *best-effort* (dégradation propre si la
  métrique est indisponible : le rapport ne échoue pas pour autant).
- **Fenêtres** : période courante + période précédente (via `buildSeoPeriod`) pour
  une comparaison honnête période/période.

## 8. Endpoint

`GET /api/intelligence/seo/ga4?period=7d|28d|90d` — **admin-only**
(`isAdminRequest`). Renvoie un objet `Ga4Data` : `{ status, organic }`.

- `status.state` ∈ `PASS` | `NOT_CONFIGURED` | `ERROR`.
- `status.property` (public, non secret) présent en `PASS`/`ERROR`.
- Jamais de token, de clé privée, ni de PII dans la réponse.

## 9. Diagnostic

| Symptôme | Cause probable | État renvoyé |
| --- | --- | --- |
| `NOT_CONFIGURED`, `configured=false` | `GA4_SERVICE_ACCOUNT_JSON`/`GOOGLE_SERVICE_ACCOUNT_JSON` absent ou malformé. | NOT_CONFIGURED |
| `NOT_CONFIGURED`, `configured=true` | Credentials présents mais `GA4_PROPERTY_ID` absent/non numérique. | NOT_CONFIGURED |
| `ERROR`, `oauth_token_http_401` | Clé de compte de service invalide/révoquée. | ERROR |
| `ERROR`, `ga4_http_403` | Compte de service non ajouté en *Viewer* sur la propriété. | ERROR |
| `ERROR`, `ga4_http_404` | `GA4_PROPERTY_ID` inexistant. | ERROR |
| `ERROR`, `ga4_timeout` | Délai réseau dépassé. | ERROR |
