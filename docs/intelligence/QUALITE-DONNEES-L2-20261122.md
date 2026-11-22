# Citadelle — Intelligence : qualité des données (lot préparatoire, 22 novembre 2026)

## Périmètre et sécurité

- Base exacte : commit de production `0fc720f37fd960d1b8c410563f1242ace43d2ed3`.
- Branche isolée : `audit/intelligence-qualite-donnees-20261122`.
- **Aucun déploiement, aucune migration SQL, aucune modification de comptes, aucune écriture en base.**
- Le flag N0C déjà activé `INTEL_CANONICAL_DASHBOARD=1` reste inchangé.
- Les corrections de code ci-dessous ne seront effectives qu'après revue, tests et GO distinct pour la publication.

## Données vérifiées, en lecture seule

Audit Supabase du 22/11/2026 ~23:07 UTC :

| Observation | Valeur | Sens |
| --- | ---: | --- |
| Sessions actives 7 jours (`last_seen`) | 63 | Pas égal aux sessions ayant un pageview sur une fenêtre glissante |
| Sessions avec un pays | 0/63 | 0 pays sur 883 sessions historiques également |
| Sessions avec un `utm_campaign` | 0/63 | Impossible de juger l'efficacité des campagnes à ce stade |
| Sessions avec `source` | 63/63 | 49 direct, 10 Telegram, 2 Facebook, 1 Google, 1 referral |
| Événements `click` | 41 | Événements distincts des inscriptions |
| Événements de conversion serveur | 2 | 1 `signup_complete` lié à un profil et 1 `lead_created` |
| Dossiers nouveaux venus `converted` | 2 | 2 sans `converted_profile_id` |
| Dossiers sans responsable assigné | 3 | Cas de suivi pastoral, pas nécessairement défaut technique |

**Attention :** événements `conversion`, inscriptions de profils et dossiers pastoraux « convertis » représentent des opérations différentes. Ne pas les sommer ni en déduire un taux de conversion sans définition métier commune.

## Corrections réalisées sur la branche (code uniquement)

1. Le widget « Clics boutons principaux » lit les événements `type=click` de `public.analytics_events`, au même titre que les visiteurs canoniques. Seules les actions avec `category` et `label` sont comptées, sur la période sélectionnée. Les vues et événements `srv:` ne comptent pas. La lecture des clics échouant n'interrompt pas la lecture visiteurs ; la requête des clics est plafonnée à 5 000 événements.
2. Le tracker interdit les pageviews, heartbeats et clics quand le chemin courant est `/admin` ou `/preview` (et sous-routes), y compris pour les appels directs `trackEvent`.
3. Tests de non-régression ajoutés : classement des clics, exclusion des événements serveur/anciens, disponibilité dégradée des clics, exclusion des chemins admin et preview.

**Limite connue** : les chiffres de clics représentent des événements d'actions, pas des visiteurs uniques ; si plus de 5 000 clics sont présents dans la fenêtre, le classement reflète les plus récents. Ne pas présenter « clics » comme « conversions ».

## Géolocalisation : enquête préalable, pas de remplissage artificiel

`src/lib/analytics-server.ts` extrait `pays` des en-têtes de géolocalisation CDN/proxy (`cf-ipcountry`, `x-vercel-ip-country`, `x-geoip-country`, `x-country-code`). Le N0C actuel n'a fourni aucun pays enregistré dans les 883 sessions.

**À vérifier avant d'implémenter** :

- Présence effective et fiabilité des en-têtes géographiques **injectés par l'infrastructure de confiance** sur N0C (ne pas faire confiance à un pays arbitrairement fourni par le navigateur ou un client).
- Possibilité de configuration PlanetHoster ou CDN ; exiger une origine sûre pour l'en-tête.
- Choisir seulement ensuite une solution respectueuse du consentement applicable et de la minimisation des données : pas de stockage d'IP, pas d'inférence du pays à partir du profil membre pour un visiteur anonyme.
- Tant que la preuve manque, `Inconnu` est une donnée honnête et doit le rester.

**Verdict :** P1 bloqué par diagnostic d'hébergement ; aucun country-fallback supposé.

## UTM : instrumenter les liens diffusés sans réécrire l'ingestion

Le code utilise déjà `AnalyticsTracker.tsx`, `normalizeUtmBundle` et `buildCampaignUrl`. La source UTM est conservée à la création de la session (first touch). L'absence de campagne sur les 63 sessions ne justifie pas de modifier les règles d'attribution.

Exemples de **liens de recette**, à utiliser en tests et non comme campagnes officielles :

- `https://citadelle.chapelleduroyaume.org/?utm_source=whatsapp&utm_medium=social&utm_campaign=qa_intelligence_l2`
- `https://citadelle.chapelleduroyaume.org/?utm_source=facebook&utm_medium=social&utm_campaign=qa_intelligence_l2`

**Recette en environnement isolé** : ouverture dans une nouvelle session, vérifier `source`, `utm_medium`, `utm_campaign` normalisés sur `public.analytics_sessions`, puis navigation sans UTM et contrôle de l'immuabilité des champs first-touch. Ne pas générer de faux trafic en production pour obtenir un chiffre.

## Conversion pastorale : aucune liaison automatique

Les deux lignes `newcomer_intakes.status=converted` ont `converted_profile_id IS NULL`. Un lien ne peut être établi que si l'équipe pastorale confirme **l'identité exacte** et l'état du dossier : un même nom, téléphone ou email seul peut être ambigu. La branche ne modifie pas ces dossiers et ne fabrique aucun lien.

Avant automatisation, définir l'événement métier « converti », son rapport avec `profiles` et les contrôles d'autorisation multi-tenant.

## Vérifications à exécuter sur le vrai dépôt (non exécutées par cette préparation GitHub)

```powershell
# À exécuter dans un worktree isolé depuis la branche proposée :
npm run type-check
npx vitest run src/lib/analytics-path.test.ts src/lib/chapelle/canonical-traffic.test.ts src/app/api/analytics/track/route.test.ts
git diff --check
```

Critères avant toute promotion :
- Le widget affiche seulement les clics d'actions réels, jamais des inscriptions déguisées ;
- Le tracker ne collecte rien sur `/admin` ou `/preview` ;
- Une erreur de la requête des clics ne remet pas les visiteurs à zéro ;
- Les dates `today`, `7d`, `30d` restent identiques au produit actuellement en production ;
- Aucun secret, aucune donnée personnelle, aucune table ou migration modifiée ;
- Relecture du diff et **GO de déploiement distinct**.

## Non-objectifs de ce lot

- Ne pas modifier `newcomer_intakes` ni attribuer de profils sans confirmation pastorale.
- Ne pas prétendre géolocaliser les visiteurs sans preuve d'en-têtes CDN ou service autorisé.
- Ne pas transformer un clic, un lead ou une conversion de dossier en inscription réussie.
- Ne pas remplacer automatiquement tous les KPI historiques sans définition de leurs dénominateurs.
