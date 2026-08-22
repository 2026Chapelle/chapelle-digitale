# Attribution WhatsApp — first-party (ACTIVE, sans API externe)

Intelligence Hub · HUB-4 · L'attribution WhatsApp est **first-party** et **opérationnelle
immédiatement** : elle ne dépend d'**aucune API externe** ni d'aucun secret.

> **WHATSAPP_ATTRIBUTION_STATUS = ACTIVE.** L'onglet WhatsApp n'affiche jamais « Non
> connecté » à tort : dès que la collecte first-party fonctionne (elle fonctionne déjà),
> l'attribution est active. « Aucune donnée » (0 réel) est affiché comme tel — ce n'est
> **pas** « indisponible ».

## 1. Comment fonctionne l'attribution first-party

À l'ingestion analytics, `detectSource()` (`src/lib/analytics-server.ts`) classe chaque
session en `source='whatsapp'` quand :
- le **referrer** contient `whatsapp` — donc les clics venant du **canal de diffusion**
  `whatsapp.com/channel/…` ; ou
- l'**UTM** le déclare : `utm_source=whatsapp` (ou `wa`).

Cette source `whatsapp` est figée en first-touch dans `analytics_sessions`. Le read-layer
HUB-4 (`buildWhatsAppAttribution`, pur) réutilise la surface d'attribution sanctionnée
(`normalizeAcquisitionSource`, `resolve`) pour agréger, **par période** :
- **visites** attribuées à WhatsApp (réel) ;
- **inscriptions / écoutes / progressions** attribuées à une session first-touch WhatsApp ;
- une **ventilation par campagne UTM** (`utm_campaign`).

Aucune PII n'est exposée : la sortie est agrégée (source × campagne), jamais de
`user_id`, `session_key`, referrer ni URL brute.

## 2. Asset canonique

- **Canal WhatsApp (diffusion)** : https://whatsapp.com/channel/0029VbCGBmkH5JLuUSYkax3B
  rôle `community_distribution`.
- ⚠️ C'est un **canal de diffusion**, **pas** un lien `wa.me` de conversation.
  L'attribution passe donc par le **referrer / UTM** des clics sortants de ce canal,
  et non par une API de messagerie.

### Conseil : taguer les liens sortants du canal
Pour une attribution fine par campagne, publier dans le canal des liens Citadelle tagués :
`https://citadelle.chapelleduroyaume.org/…?utm_source=whatsapp&utm_medium=channel&utm_campaign=culte_20260830`
Le referrer `whatsapp.com` suffit déjà à classer la source `whatsapp` ; l'UTM ajoute la
granularité **par campagne**.

## 3. Endpoint

`GET /api/intelligence/whatsapp?period=7d|28d|90d` — **admin-only** (`isAdminRequest`),
`force-dynamic`. Renvoie `{ generatedAt, period, status, cloud, attribution }` :
- `status.state = ACTIVE` (first-party) ;
- `attribution` : `{ active, hasData, totals, campaigns[], channelUrl }` ;
  `hasData=false` avec `demoMode=false` = **0 réel** (pas « indisponible ») ;
- fail-safe : si la lecture DB échoue (ex. migration UTM non appliquée), on renvoie une
  démo marquée — jamais de faux réel.

Aucune variable d'environnement, aucun secret n'est requis pour cette attribution.

## 4. WhatsApp Cloud API (WABA) — OPTIONNEL, non bloquant

L'extension **WhatsApp Cloud API** (métriques de messages/templates via un WABA) est
**optionnelle** et n'est **pas** nécessaire à l'attribution first-party.

> `WHATSAPP_CLOUD_API = OPTIONAL / NOT_CONFIGURED`.

Aucun credential WABA n'est disponible ici, et ce n'est **pas** un blocage : le livrable
est l'attribution first-party, déjà ACTIVE. Si, plus tard, un WABA est fourni, on pourra
ajouter (toujours READ-ONLY) des métriques de diffusion — sans rien changer à
l'attribution first-party existante. Variables futures (non requises aujourd'hui) :
`WHATSAPP_WABA_ID`, `WHATSAPP_CLOUD_TOKEN` (server-only) — à documenter le moment venu.
