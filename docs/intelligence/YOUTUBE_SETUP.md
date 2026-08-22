# YouTube — Mise en place du connecteur (Intelligence Hub)

Ce guide explique comment autoriser le connecteur YouTube du cockpit
**Intelligence Hub** pour la chaîne canonique **@ChapelleRoyaleTV**
(<https://www.youtube.com/@ChapelleRoyaleTV>).

> **Pourquoi une autorisation du propriétaire est obligatoire.**
> YouTube Analytics (temps de visionnage, abonnés gagnés/perdus, analytics par
> vidéo, sources de trafic) n'est lisible qu'avec le **consentement OAuth 2.0 du
> propriétaire de la chaîne**. Un compte de service Google **ne peut pas** lire
> l'analytics d'une chaîne YouTube. Tant que ce consentement n'est pas provisionné,
> le connecteur reste honnêtement en état **AUTH_REQUIRED** — **aucune donnée n'est
> jamais fabriquée**.

Toutes les variables ci-dessous sont **server-only** (jamais de `NEXT_PUBLIC_`,
jamais journalisées, jamais renvoyées au client). Les **scopes sont en lecture
seule** — le connecteur n'écrit jamais et ne gère aucun contenu.

---

## 1. Créer un client OAuth dans Google Cloud

1. Ouvrez [Google Cloud Console](https://console.cloud.google.com/) et
   sélectionnez (ou créez) un projet dédié.
2. **API & Services → Bibliothèque** : activez les deux API suivantes :
   - **YouTube Data API v3**
   - **YouTube Analytics API**
   *(Le rapport de sources de trafic utilise la même API Analytics ; la
   « YouTube Reporting API » par lots n'est pas requise.)*
3. **API & Services → Écran de consentement OAuth** :
   - Type **Externe** (ou Interne si le compte propriétaire est dans un
     Workspace).
   - Ajoutez les **scopes en lecture seule** :
     - `https://www.googleapis.com/auth/youtube.readonly`
     - `https://www.googleapis.com/auth/yt-analytics.readonly`
   - Ajoutez le **compte propriétaire de @ChapelleRoyaleTV** comme utilisateur de
     test (tant que l'app n'est pas publiée).
4. **API & Services → Identifiants → Créer des identifiants → ID client OAuth** :
   - Type **Application de bureau** (le plus simple pour obtenir un refresh token)
     ou **Application Web** (ajoutez alors une URI de redirection autorisée, par
     ex. `https://developers.google.com/oauthplayground` si vous utilisez le
     Playground).
   - Notez le **Client ID** et le **Client Secret** (secrets — ne jamais commiter).

---

## 2. Obtenir un refresh token (compte propriétaire)

Le refresh token doit être généré **en étant connecté au compte Google qui
possède @ChapelleRoyaleTV**.

**Option A — OAuth 2.0 Playground (rapide) :**

1. Ouvrez <https://developers.google.com/oauthplayground/>.
2. Roue crantée (⚙) → cochez **Use your own OAuth credentials** → collez le
   Client ID / Client Secret.
3. Dans « Step 1 », sélectionnez / saisissez les deux scopes read-only ci-dessus.
4. **Authorize APIs** → connectez-vous **avec le compte propriétaire** → acceptez.
5. « Step 2 » → **Exchange authorization code for tokens** → copiez le
   **Refresh token**.

**Option B — flux « application de bureau » (script local) :** échangez le code
d'autorisation contre un refresh token via `https://oauth2.googleapis.com/token`
(`grant_type=authorization_code`). Conservez uniquement le `refresh_token`.

> Assurez-vous d'avoir demandé **`access_type=offline`** (et au besoin
> `prompt=consent`) pour recevoir un `refresh_token`.

---

## 3. (Optionnel) Fixer l'identifiant de chaîne

Par défaut, le connecteur résout la chaîne via le **handle canonique**
`@ChapelleRoyaleTV` (Data API `channels.list?forHandle=…`) et **vérifie** que le
handle correspond bien — il refuse tout autre actif.

Vous pouvez fixer explicitement l'identifiant `UC…` via `YOUTUBE_CHANNEL_ID`
(onglet « À propos » de la chaîne, ou `channels.list?mine=true`). Même dans ce cas,
si le handle réel diverge de `@ChapelleRoyaleTV`, le connecteur refuse la connexion
(**PERMISSION_REQUIRED**) plutôt que de servir la mauvaise chaîne.

---

## 4. Variables d'environnement (server-only)

Renseignez ces variables côté serveur (jamais `NEXT_PUBLIC_`) :

| Variable | Requis | Rôle |
| --- | --- | --- |
| `YOUTUBE_OAUTH_CLIENT_ID` | ✅ | ID client OAuth |
| `YOUTUBE_OAUTH_CLIENT_SECRET` | ✅ | Secret client OAuth |
| `YOUTUBE_OAUTH_REFRESH_TOKEN` | ✅ | Refresh token du propriétaire (read-only) |
| `YOUTUBE_CHANNEL_ID` | ⬜ | Identifiant `UC…` (sinon résolu depuis le handle) |

> **Ne mettez aucun secret dans ce document ni dans le dépôt.** Utilisez le
> gestionnaire de secrets de l'hébergeur (variables d'environnement du serveur).

---

## 5. Vérification

- Sans variables : l'onglet **YouTube** affiche « Connexion YouTube non autorisée »
  et l'API `GET /api/intelligence/youtube` renvoie un statut `AUTH_REQUIRED`
  (`setupRequired: true`). C'est l'état d'atterrissage **attendu**.
- Avec des variables valides : l'état passe à `CONNECTED`, `property` vaut
  `@chapelleroyaletv`, et les sections Vue d'ensemble / Top contenus / Audience /
  Acquisition / Tendances se remplissent. La fraîcheur affichée est
  **Différé (SEO)** — jamais « temps réel ».
- Refresh token révoqué/expiré → `AUTH_REQUIRED` (le propriétaire doit
  re-consentir). Erreur API transitoire → `ERROR` (raison technique non sensible,
  jamais de secret).

---

## Rappels de sécurité

- **Lecture seule** : aucun scope d'écriture ni de gestion de contenu.
- **Aucun secret exposé** : les tokens ne sont ni journalisés, ni renvoyés, ni
  inlinés côté client. Seul le **handle public** apparaît dans les statuts.
- **Jamais de donnée inventée** : un connecteur non autorisé reste `AUTH_REQUIRED`
  / `PERMISSION_REQUIRED` ; les chiffres ne sont jamais estimés.
