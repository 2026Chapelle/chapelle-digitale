# Audit technique — Visioconférence Citadelle (Zoom vs Google Meet)

> Document de référence. Aucun code, aucun nouveau moteur. Réutilise les acquis :
> `group_reunions` (`type`, `lien_visio`, `statut`), `group_attendance`, le moteur de
> notifications, et `presences-server`/`attendance` (Chantier 4 + P2).

## Constat de départ (ce qui existe DÉJÀ)
- `group_reunions.type ∈ {physique, virtuelle, hybride}` et **`group_reunions.lien_visio`** (text) — un lien visio par réunion est **déjà stockable**.
- L'UI réunions affiche déjà un bouton **« Rejoindre »** pour les réunions `virtuelle`/`hybride` (ouvre `lien_visio`).
- **`group_attendance`** (présent/absent/excusé, `recorded_by`) gère déjà le suivi de présence (saisi par le leader), et les stats d'assiduité (`presences-server`, P2).
- Notifications : `createReunion` notifie déjà les membres ; le cron émet des alertes (réutilisable pour « le live commence »).

➡️ **La visioconférence par LIEN est déjà supportée à 95 % par l'existant.** Le seul vrai choix est : se contenter du lien (V1) ou intégrer un SDK pour la présence automatique (V2).

---

## 1. Lien simple Zoom/Meet dans `group_reunions`
- **Faisabilité : immédiate, zéro dev.** Coller l'URL Zoom ou Meet dans `lien_visio` à la création de la réunion (`type='virtuelle'` ou `hybride`).
- Provider‑agnostique : Zoom **ou** Meet **ou** Jitsi — c'est juste une URL. Aucune dépendance à un fournisseur.
- ✅ Recommandé en V1.

## 2. Bouton « Rejoindre »
- **Déjà présent** dans l'UI réunions (membre + admin) : rend `lien_visio` en bouton, `target="_blank"`.
- Renforcements V1 (CSS/UX only, sans logique) : n'afficher le bouton que si `lien_visio` présent ; libellé « Rejoindre (Zoom) / (Meet) » dérivé de l'URL ; actif uniquement quand `statut` ∈ {planifiee, tenue}.

## 3. Suivi présence dans Citadelle
- **Déjà couvert** par `group_attendance` : le leader marque présent/absent/excusé → stats d'assiduité (P2), alertes d'absence répétée, fiche 360°.
- **Manuel** (déclaratif) avec un simple lien — c'est le mode V1, identique pour Zoom et Meet.
- **Automatique** (qui a réellement rejoint) = nécessite SDK/API + webhooks → **V2** (cf. §4/§5).

## 4. Zoom Meeting SDK intégré
- **Ce que ça apporte** : visio **embarquée dans la page** + présence **automatique** via webhooks (`meeting.participant_joined/left`) écrits dans `group_attendance` (réutilise l'acquis, pas de nouveau moteur).
- **Coût technique** : compte Zoom payant (Pro+), app **Meeting SDK** (SDK Key/Secret), **génération de signature côté serveur** (endpoint Node — OK sur N0C), gestion CSP/cross‑origin, endpoint **webhook public** (validation de signature).
- **Limites** : bundle lourd, certains navigateurs mobiles redirigent vers l'app Zoom, permissions caméra/micro, maintenance des credentials.
- ➡️ **V2** (optionnel, si la présence auto devient prioritaire).

## 5. Google Meet API
- **Pas d'embed in‑page** équivalent au SDK Zoom : Meet reste **basé sur le lien** (ouvre Meet dans le navigateur/app).
- **Meet REST API** (création de « spaces », lecture des `conferenceRecords`/`participants`) exige **Google Workspace** + projet **Google Cloud** + **OAuth2**, et la **participation détaillée** n'est exposée que sur les **tiers Workspace élevés** (Enterprise).
- **Présence auto** : possible via `conferenceRecords.participants` (post‑réunion, Workspace) — plus lourd et moins temps‑réel que les webhooks Zoom.
- ➡️ Pour Citadelle, Meet est excellent en **lien V1** ; son API n'apporte de la présence auto qu'en V2 et seulement sous Workspace.

## 6. Limites navigateur / mobile
- **Lien (V1)** : universel. Le mobile ouvre l'app Zoom/Meet ou le navigateur. Aucune contrainte côté Citadelle (la visio tourne sur l'infra Zoom/Google, pas sur N0C).
- **SDK Zoom (V2)** : embed contraint par CSP, autoplay, permissions ; sur mobile, expérience souvent dégradée (redirection app). 
- **Meet** : pas d'embed → toujours hors‑app, mobile fluide.

## 7. Sécurité
- **Lien (V1)** : risque = lien partagé (toute personne avec l'URL peut entrer). Mitigations **côté fournisseur** : salle d'attente, code d'accès, « seuls les inscrits ». Côté Citadelle : `lien_visio` est protégé par la **RLS existante** (`reunions_member_read` → seuls les membres **actifs** du groupe lisent la réunion). ✅ Déjà sûr.
- **SDK/API (V2)** : secrets (SDK Secret / OAuth) **jamais exposés au client** → signature/échange **côté serveur** uniquement ; webhooks **signés et vérifiés**. Complexité de gestion des secrets.

## 8. Coûts / complexité
| Option | Coût | Dev | Maintenance |
|---|---|---|---|
| **Lien Zoom/Meet (V1)** | Gratuit (Zoom 40 min / Meet 60 min) ou licence existante | **~0** (acquis) | Quasi nulle |
| **Zoom Meeting SDK (V2)** | Zoom payant | Élevé (signature serveur, webhooks, embed, CSP) | Moyenne/élevée (credentials, versions SDK) |
| **Google Meet API (V2)** | Google Workspace | Élevé (OAuth, Cloud, API) | Moyenne |

## 9. Plan V1 / V2
- **V1 (maintenant, zéro nouveau moteur)** : lien `lien_visio` (Zoom **ou** Meet, au choix du responsable) + bouton « Rejoindre » + **présence manuelle** (`group_attendance`) + notifications existantes (réunion créée / « ça commence »).
- **V2 (optionnel, à valider séparément)** : présence **automatique** via **Zoom Meeting SDK + webhooks** (meilleur rapport présence‑auto/effort que Meet API) écrivant dans `group_attendance` — **sans** remplacer le mode manuel (fallback conservé).

---

## ✅ Recommandation claire

### Ce qu'on fait en V1 (recommandé)
1. **Lien visio générique** dans `group_reunions.lien_visio` — **provider‑agnostique** (Zoom, Meet, Jitsi). Le responsable colle l'URL qu'il a.
2. **Bouton « Rejoindre »** (déjà là) — affiné UX seulement (présence du lien, libellé dérivé du fournisseur).
3. **Présence manuelle** via `group_attendance` (déjà là) + stats/alertes existantes.
4. **Notifications** existantes (création + « en direct ») réutilisées.
→ **0 nouvelle table, 0 RPC, 0 secret, 0 impact N0C, 0 coût imposé.**

### Ce qu'on garde pour V2
- **Présence automatique** (qui a réellement rejoint) via **Zoom Meeting SDK + webhooks** → écrit dans `group_attendance` (réutilise l'acquis). Préférer Zoom à Meet pour l'auto‑présence (webhooks temps réel vs records post‑réunion Workspace).
- **Visio embarquée** in‑app (seulement si réellement souhaitée ; sinon le lien suffit et reste plus robuste sur mobile).

### Risques
- **V1** : lien partageable → s'appuyer sur salle d'attente/code côté Zoom/Meet (la RLS Citadelle limite déjà la lecture du lien aux membres actifs). Lien périmé/incorrect saisi par le responsable (validation d'URL légère possible, sans bloquer).
- **V2** : gestion des secrets (fuite = risque majeur), webhooks publics à sécuriser (signature), dépendance fournisseur + coûts, dette de maintenance (versions SDK), expérience mobile dégradée pour l'embed.

### Variables d'environnement nécessaires
- **V1** : **AUCUNE** (le lien vit dans la donnée `lien_visio`, par réunion).
- **V2 — Zoom SDK** : `ZOOM_SDK_KEY`, `ZOOM_SDK_SECRET`, `ZOOM_WEBHOOK_SECRET_TOKEN` (jamais exposés au client ; signature + vérification côté serveur).
- **V2 — Google Meet API** : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_WORKSPACE_*` + scopes OAuth (Workspace requis).

### Impact PlanetHoster / N0C
- **V1 : nul.** La visio s'exécute sur l'infra Zoom/Google ; N0C ne sert qu'à stocker/afficher le lien. Aucun flux média ne transite par N0C (pas de streaming interne — conforme aux interdictions).
- **V2** : N0C peut héberger (Node/Passenger) **l'endpoint de signature Zoom** et **l'endpoint webhook** (HTTPS public). À prévoir : ajustement **CSP/headers** pour l'embed SDK, et que le webhook soit joignable depuis l'extérieur (OK sur N0C). Toujours **aucun streaming média** sur N0C (Zoom/Google portent la charge).

---

## Verdict
**V1 = lien `lien_visio` + bouton Rejoindre + présence manuelle, provider‑agnostique (Zoom ou Meet).** C'est **déjà à portée de main** avec les acquis, sans coût ni secret ni impact N0C, et conforme aux interdictions (« pas de streaming interne, pas de SDK Zoom/Meet maintenant »). **La présence automatique (Zoom SDK + webhooks) est l'unique vraie raison de passer en V2**, à décider plus tard selon le besoin réel.
