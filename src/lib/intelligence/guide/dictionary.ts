/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * DICTIONNAIRE canonique des métriques (guide d'interprétation). PUR, typé.
 *
 * Pour CHAQUE métrique affichée dans le hub : définition HONNÊTE (source réelle),
 * fraîcheur, comment la lire, ce qu'un bon/mauvais signal veut dire, quoi faire, et
 * ses LIMITES. Objectif : qu'un non-technicien comprenne exactement ce qu'il voit,
 * sans jamais confondre un proxy avec une vérité.
 *
 * Règle : les définitions ne survendent JAMAIS la donnée. « Visites » = pages vues
 * (événements), pas personnes uniques, parce que c'est la vraie source.
 */

import type { Freshness } from '../types/freshness'

/** Regroupement logique dans le guide. */
export type MetricGroup =
  | 'Vue générale (first-party)'
  | 'SEO — Google (différé)'
  | 'Chaînes externes'
  | 'Conversions'
  | 'Tunnel & attribution'

/** Une entrée canonique du dictionnaire des métriques. */
export interface MetricDictionaryEntry {
  key: string
  name: string
  group: MetricGroup
  definition: string
  source: string
  freshness: Freshness
  howToRead: string
  whatGoodMeans: string
  whatBadMeans: string
  whatToDo: string
  limitations: string
}

export const METRIC_DICTIONARY: ReadonlyArray<MetricDictionaryEntry> = [
  /* ------------------------- Vue générale (first-party) ------------------------- */
  {
    key: 'page_views',
    name: 'Visites',
    group: 'Vue générale (first-party)',
    definition:
      'Nombre de pages vues aujourd’hui (événements « pageview » de analytics_events). C’est un volume de pages affichées, PAS un nombre de personnes uniques.',
    source: 'first-party — analytics_events (type = pageview)',
    freshness: 'NEAR_REALTIME',
    howToRead:
      'Une même personne qui ouvre 5 pages compte pour 5 visites. À lire comme un volume de consultation, pas comme une audience.',
    whatGoodMeans: 'Un volume en hausse régulière indique plus de contenu consommé et une meilleure visibilité.',
    whatBadMeans: 'Une chute brutale peut signaler une panne, un problème de tracking ou une baisse de trafic entrant.',
    whatToDo:
      'Croiser avec « Sessions actives » et l’onglet Acquisition pour distinguer une baisse d’audience d’un simple artefact de mesure.',
    limitations:
      'Ne mesure ni les visiteurs uniques, ni le temps passé. Le blocage des scripts d’analyse sous-compte le réel.',
  },
  {
    key: 'active_sessions',
    name: 'Sessions actives',
    group: 'Vue générale (first-party)',
    definition:
      'Nombre de sessions vues au cours des 90 dernières secondes (3 × heartbeat de 30 s). Ce sont des SESSIONS (analytics_sessions), pas des utilisateurs distincts.',
    source: 'first-party — analytics_sessions (last_seen)',
    freshness: 'REALTIME',
    howToRead:
      'Compte l’anonyme et le multi-onglets : une personne avec 3 onglets ouverts = 3 sessions. Indicateur d’activité « en ce moment ».',
    whatGoodMeans: 'Une valeur élevée pendant un live/événement confirme une audience présente en temps réel.',
    whatBadMeans: 'Zéro en pleine journée peut trahir un souci de heartbeat plutôt qu’une absence réelle de public.',
    whatToDo: 'Utiliser comme pouls temps réel pendant les moments forts (live, publication) ; ne pas cumuler dans le temps.',
    limitations: 'Ne déduplique pas les personnes. N’est pas un compteur d’utilisateurs connectés.',
  },
  {
    key: 'logins',
    name: 'Connexions',
    group: 'Vue générale (first-party)',
    definition:
      'Nombre de connexions réussies. INDISPONIBLE : aucun événement de connexion fiable n’est instrumenté.',
    source: 'indisponible — aucune source prouvée',
    freshness: 'NEAR_REALTIME',
    howToRead: 'Affichée « Indisponible », jamais 0 : l’absence de source ne veut pas dire zéro connexion.',
    whatGoodMeans: 's/o tant que la métrique n’est pas instrumentée.',
    whatBadMeans: 's/o tant que la métrique n’est pas instrumentée.',
    whatToDo:
      'Pour l’activer, émettre un événement serveur de connexion RÉUSSIE (pas la simple tentative « sign_in_started », réétiquetée « custom » et non probante).',
    limitations: 'L’événement de tentative existant ne prouve pas le succès ⇒ non affiché pour ne pas induire en erreur.',
  },
  {
    key: 'signups',
    name: 'Inscriptions',
    group: 'Vue générale (first-party)',
    definition: 'Nombre de comptes (profils) créés aujourd’hui. Une inscription = une personne nouvellement enregistrée.',
    source: 'first-party — profiles.created_at (trigger handle_new_user)',
    freshness: 'SYNCED',
    howToRead: 'Compteur de personnes réelles (pas d’événements). C’est la première vraie conversion d’acquisition.',
    whatGoodMeans: 'Une progression régulière indique un tunnel d’acquisition sain.',
    whatBadMeans: 'Zéro sur plusieurs jours malgré du trafic signale un frein dans le parcours d’inscription.',
    whatToDo: 'Rapprocher de « Visites » et de l’Acquisition par source pour voir quels canaux convertissent.',
    limitations: 'Ne distingue pas les comptes actifs des comptes dormants créés puis abandonnés.',
  },
  {
    key: 'podcast_starts',
    name: 'Écoutes podcast',
    group: 'Vue générale (first-party)',
    definition:
      'Nombre de démarrages/reprises d’écoute aujourd’hui (play_start + play_resume). C’est un volume d’ÉCOUTES (plays), pas d’auditeurs uniques.',
    source: 'first-party — audio_listening_events (occurred_at)',
    freshness: 'NEAR_REALTIME',
    howToRead: 'Une personne qui met en pause puis reprend génère plusieurs plays. À lire comme un volume d’écoute.',
    whatGoodMeans: 'Un volume élevé confirme l’attractivité des épisodes publiés.',
    whatBadMeans: 'Une baisse après une publication peut indiquer un problème de mise en avant ou de lecteur.',
    whatToDo: 'Croiser avec l’analytics audio dédié (épisodes populaires) pour prioriser les contenus.',
    limitations: 'Ne mesure ni l’écoute complète, ni les auditeurs uniques ; play_resume gonfle le total.',
  },
  {
    key: 'video_starts',
    name: 'Lectures vidéo',
    group: 'Vue générale (first-party)',
    definition: 'Nombre de lectures vidéo. INDISPONIBLE : aucun événement de lecture fiable.',
    source: 'indisponible — aucune source prouvée',
    freshness: 'SYNCED',
    howToRead: 'Affichée « Indisponible », jamais 0.',
    whatGoodMeans: 's/o tant que la métrique n’est pas instrumentée.',
    whatBadMeans: 's/o tant que la métrique n’est pas instrumentée.',
    whatToDo: 'Instrumenter un événement de démarrage vidéo distinct des checkpoints de progression.',
    limitations:
      'Le proxy type=video surcompte : les checkpoints de progression émettent plusieurs lignes par lecture ⇒ non affiché.',
  },
  {
    key: 'lesson_completions',
    name: 'Progressions parcours',
    group: 'Vue générale (first-party)',
    definition:
      'Nombre de modules terminés aujourd’hui (module_completions, sur completed_at immuable, dédupliqué par personne+module).',
    source: 'first-party — module_completions.completed_at',
    freshness: 'SYNCED',
    howToRead: 'Compte des complétions de MODULE, pas de parcours entiers. Un re-visionnage ne recompte pas.',
    whatGoodMeans: 'Une hausse signale un discipulat actif et des membres qui avancent.',
    whatBadMeans: 'Peu de complétions malgré des inscrits indique un décrochage en cours de parcours.',
    whatToDo: 'Analyser à quel module les gens s’arrêtent pour lever les obstacles pédagogiques.',
    limitations: 'Ne mesure pas l’achèvement d’un parcours COMPLET (voir « Complétions » du tunnel, indisponible).',
  },

  /* ------------------------------- SEO — Google -------------------------------- */
  {
    key: 'gsc_impressions',
    name: 'Impressions (Search Console)',
    group: 'SEO — Google (différé)',
    definition: 'Nombre de fois où une page du site est apparue dans les résultats de recherche Google.',
    source: 'Google Search Console (si connecté)',
    freshness: 'SEO_DELAYED',
    howToRead: 'Une impression = une apparition dans les résultats, même sans clic. Mesure la visibilité, pas le trafic.',
    whatGoodMeans: 'Des impressions en hausse montrent que Google indexe et propose davantage vos pages.',
    whatBadMeans: 'Une chute peut indiquer une désindexation, une pénalité ou une perte de positions.',
    whatToDo: 'Repérer les pages à fortes impressions mais faible CTR pour retravailler titres et descriptions.',
    limitations: 'Donnée différée (J-2/J-3). Indisponible tant que Search Console n’est pas connecté (jamais estimée).',
  },
  {
    key: 'gsc_clicks',
    name: 'Clics (Search Console)',
    group: 'SEO — Google (différé)',
    definition: 'Nombre de clics depuis les résultats de recherche Google vers le site.',
    source: 'Google Search Console (si connecté)',
    freshness: 'SEO_DELAYED',
    howToRead: 'Le vrai trafic organique gagné depuis Google, à distinguer des simples impressions.',
    whatGoodMeans: 'Des clics en hausse = un SEO qui rapporte des visiteurs réels.',
    whatBadMeans: 'Beaucoup d’impressions mais peu de clics = un problème d’attractivité des extraits.',
    whatToDo: 'Optimiser les balises title/description des pages à fort potentiel.',
    limitations: 'Différé (J-2/J-3). Ne couvre que la recherche Google, pas les autres moteurs.',
  },
  {
    key: 'gsc_ctr',
    name: 'CTR (Search Console)',
    group: 'SEO — Google (différé)',
    definition: 'Taux de clic = clics ÷ impressions (0..100 %). Part des apparitions qui aboutissent à un clic.',
    source: 'Google Search Console (si connecté)',
    freshness: 'SEO_DELAYED',
    howToRead: 'Un CTR de 5 % signifie 5 clics pour 100 apparitions. Dépend fortement de la position moyenne.',
    whatGoodMeans: 'Un CTR élevé pour la position occupée = titres et descriptions convaincants.',
    whatBadMeans: 'Un CTR faible malgré de bonnes positions = extraits peu incitatifs.',
    whatToDo: 'Réécrire les titres/descriptions des pages à fort volume et faible CTR.',
    limitations: 'Différé. Un CTR sur très peu d’impressions est statistiquement peu fiable.',
  },
  {
    key: 'gsc_position',
    name: 'Position moyenne (Search Console)',
    group: 'SEO — Google (différé)',
    definition: 'Position moyenne des pages/requêtes dans les résultats Google. PLUS BAS = MEILLEUR (1 = tout en haut).',
    source: 'Google Search Console (si connecté)',
    freshness: 'SEO_DELAYED',
    howToRead: 'Attention au sens : une position qui BAISSE (ex. 8 → 3) est une AMÉLIORATION.',
    whatGoodMeans: 'Une position qui se rapproche de 1 = meilleure visibilité et plus de clics potentiels.',
    whatBadMeans: 'Une position qui augmente = perte de classement à surveiller.',
    whatToDo: 'Prioriser les requêtes en position 4 à 15 : un petit gain y débloque beaucoup de clics.',
    limitations: 'Moyenne pondérée pouvant masquer de grands écarts. Différée (J-2/J-3).',
  },
  {
    key: 'ga4_organic_sessions',
    name: 'Sessions organiques (GA4)',
    group: 'SEO — Google (différé)',
    definition: 'Sessions issues de la recherche organique, mesurées par Google Analytics 4.',
    source: 'Google Analytics 4 (si connecté)',
    freshness: 'SEO_DELAYED',
    howToRead: 'Une session = une visite continue. Complète la vue Search Console côté comportement sur le site.',
    whatGoodMeans: 'Des sessions organiques en hausse confirment un SEO qui amène du trafic qualifié.',
    whatBadMeans: 'Une baisse signale une perte de trafic naturel à investiguer.',
    whatToDo: 'Croiser avec les pages d’atterrissage GA4 pour voir quel contenu attire l’organique.',
    limitations: 'Indisponible sans connexion GA4. Peut différer des chiffres first-party (définitions de session distinctes).',
  },

  /* ------------------------------ Chaînes externes ----------------------------- */
  {
    key: 'youtube_views',
    name: 'Vues YouTube',
    group: 'Chaînes externes',
    definition: 'Nombre de vues des vidéos de la chaîne YouTube.',
    source: 'YouTube Data API (si connectée)',
    freshness: 'SEO_DELAYED',
    howToRead: 'Volume de visionnages côté YouTube, distinct des lectures sur le site Citadelle.',
    whatGoodMeans: 'Des vues en hausse traduisent une portée grandissante de la chaîne.',
    whatBadMeans: 'Une stagnation peut indiquer un essoufflement éditorial ou de diffusion.',
    whatToDo: 'Repérer les formats les plus vus pour orienter la production.',
    limitations: 'Différée (stats YouTube). Indisponible tant que le connecteur YouTube n’est pas configuré.',
  },
  {
    key: 'youtube_watch_time',
    name: 'Temps de visionnage YouTube',
    group: 'Chaînes externes',
    definition: 'Durée totale de visionnage cumulée sur la chaîne YouTube.',
    source: 'YouTube Data API (si connectée)',
    freshness: 'SEO_DELAYED',
    howToRead: 'Indicateur de profondeur d’engagement, plus fiable que le seul nombre de vues.',
    whatGoodMeans: 'Un temps de visionnage élevé favorise la recommandation par YouTube.',
    whatBadMeans: 'Un temps faible malgré des vues = accroches qui ne retiennent pas.',
    whatToDo: 'Soigner les 30 premières secondes et le rythme des vidéos.',
    limitations: 'Différée. Indisponible sans connecteur YouTube configuré.',
  },
  {
    key: 'meta_reach',
    name: 'Portée (Meta / Facebook)',
    group: 'Chaînes externes',
    definition: 'Nombre de personnes ayant vu un contenu sur Facebook/Instagram.',
    source: 'Meta Graph API (si connectée)',
    freshness: 'SEO_DELAYED',
    howToRead: 'La portée = personnes atteintes (dédupliquées), à distinguer des impressions.',
    whatGoodMeans: 'Une portée en hausse élargit l’audience potentielle.',
    whatBadMeans: 'Une chute peut refléter une baisse de diffusion organique de la plateforme.',
    whatToDo: 'Tester formats et horaires de publication ; envisager la mise en avant ciblée.',
    limitations: 'Différée. Indisponible tant que le connecteur Meta n’est pas configuré.',
  },
  {
    key: 'meta_interactions',
    name: 'Interactions (Meta / Facebook)',
    group: 'Chaînes externes',
    definition: 'Réactions, commentaires et partages sur les contenus Facebook/Instagram.',
    source: 'Meta Graph API (si connectée)',
    freshness: 'SEO_DELAYED',
    howToRead: 'Mesure l’engagement actif de la communauté, au-delà de la simple exposition.',
    whatGoodMeans: 'Beaucoup d’interactions = contenu qui résonne et se diffuse.',
    whatBadMeans: 'Portée élevée mais peu d’interactions = contenu vu mais peu engageant.',
    whatToDo: 'Encourager l’échange (questions, appels à l’action) et répondre aux commentaires.',
    limitations: 'Différée. Indisponible sans connecteur Meta configuré.',
  },
  {
    key: 'whatsapp_attribution',
    name: 'Attribution WhatsApp',
    group: 'Chaînes externes',
    definition:
      'Trafic et conversions attribués à WhatsApp, détectés via les liens de partage (source/UTM) à l’arrivée sur le site.',
    source: 'first-party — attribution de session (detectSource)',
    freshness: 'SYNCED',
    howToRead: 'Il s’agit d’une attribution first-party à l’ARRIVÉE, pas de statistiques internes à WhatsApp.',
    whatGoodMeans: 'Une part WhatsApp élevée confirme la force du bouche-à-oreille et des groupes.',
    whatBadMeans: 'Une part faible malgré des campagnes WhatsApp = liens non tagués ou mal partagés.',
    whatToDo: 'Toujours partager des liens balisés (UTM) pour fiabiliser l’attribution.',
    limitations:
      'WhatsApp n’expose pas de statistiques d’audience ; seule l’arrivée sur le site est mesurable, jamais l’ouverture des messages.',
  },

  /* -------------------------------- Conversions -------------------------------- */
  {
    key: 'conv_acquisition',
    name: 'Acquisition — inscription Citadelle',
    group: 'Conversions',
    definition: 'Nombre de nouvelles inscriptions (comptes créés) sur la période.',
    source: 'first-party — profiles.created_at',
    freshness: 'SYNCED',
    howToRead: 'Première conversion du parcours : la personne entre dans la Citadelle.',
    whatGoodMeans: 'Une hausse alimente tout le reste du tunnel.',
    whatBadMeans: 'Une stagnation limite mécaniquement les conversions profondes en aval.',
    whatToDo: 'Optimiser les pages d’entrée et les appels à s’inscrire.',
    limitations: 'Un compte créé ne garantit pas un engagement ultérieur.',
  },
  {
    key: 'conv_engagement',
    name: 'Engagement — écoute podcast',
    group: 'Conversions',
    definition: 'Volume d’écoutes de podcast (plays) sur la période — signal d’engagement avec le contenu.',
    source: 'first-party — audio_listening_events',
    freshness: 'NEAR_REALTIME',
    howToRead: 'Volume d’écoutes, pas d’auditeurs uniques : un signal d’intérêt, pas un décompte de personnes.',
    whatGoodMeans: 'Un engagement fort prépare le passage au discipulat.',
    whatBadMeans: 'Peu d’écoutes malgré des inscrits = contenu mal découvert.',
    whatToDo: 'Mettre en avant les épisodes et guider les nouveaux inscrits vers l’écoute.',
    limitations: 'play_resume gonfle le total ; ne mesure pas l’écoute complète.',
  },
  {
    key: 'conv_discipulat',
    name: 'Discipulat — complétion de module',
    group: 'Conversions',
    definition: 'Nombre de modules de formation terminés sur la période.',
    source: 'first-party — module_completions.completed_at',
    freshness: 'SYNCED',
    howToRead: 'Progression concrète dans un parcours : le membre se forme réellement.',
    whatGoodMeans: 'Une hausse traduit un discipulat vivant.',
    whatBadMeans: 'Décrochage en cours de parcours si les complétions chutent après les débuts.',
    whatToDo: 'Identifier les modules bloquants et accompagner les membres qui stagnent.',
    limitations: 'Compte des modules, pas des parcours complets.',
  },
  {
    key: 'conv_accomplissement',
    name: 'Accomplissement — formation/parcours terminé',
    group: 'Conversions',
    definition: 'Nombre de parcours/formations COMPLETS terminés. INDISPONIBLE : aucune source fiable.',
    source: 'indisponible — aucun événement fiable de fin de parcours complet',
    freshness: 'SYNCED',
    howToRead: 'Affichée « Indisponible », jamais 0 : l’absence de mesure ne signifie pas zéro accomplissement.',
    whatGoodMeans: 's/o tant que la métrique n’est pas instrumentée.',
    whatBadMeans: 's/o tant que la métrique n’est pas instrumentée.',
    whatToDo:
      'Instrumenter un marqueur fiable d’achèvement de parcours (ex. tous les modules d’une formation terminés, ou délivrance d’attestation garantie en production).',
    limitations:
      'module_completions compte des modules, pas l’achèvement global ; les tables academy_results ne sont pas garanties déployées ⇒ non affiché pour rester honnête.',
  },
  {
    key: 'conv_communaute',
    name: 'Communauté — inscription événement',
    group: 'Conversions',
    definition: 'Nombre d’inscriptions/participations à des événements sur la période (les simples rappels sont exclus).',
    source: "first-party — event_registrations (type in inscription/participation)",
    freshness: 'SYNCED',
    howToRead: 'Marque un pas vers la communauté réelle : la personne s’engage à participer.',
    whatGoodMeans: 'Une hausse annonce une communauté qui se rassemble.',
    whatBadMeans: 'Peu d’inscriptions malgré des événements = promotion insuffisante.',
    whatToDo: 'Relancer et faciliter l’inscription depuis les canaux les plus actifs.',
    limitations: 'Une inscription n’est pas une présence effective. Le type « rappel » est volontairement exclu.',
  },
  {
    key: 'conv_contact',
    name: 'Contact — demande de prière',
    group: 'Conversions',
    definition: 'Nombre de demandes de prière déposées sur la période.',
    source: 'first-party — priere_demandes.created_at',
    freshness: 'SYNCED',
    howToRead: 'Signal de contact pastoral : la personne ouvre une relation d’accompagnement.',
    whatGoodMeans: 'Des demandes régulières témoignent d’une confiance et d’un besoin exprimé.',
    whatBadMeans: 'Une absence prolongée peut indiquer un canal de contact peu visible.',
    whatToDo: 'Assurer un suivi pastoral rapide et rendre le formulaire facilement accessible.',
    limitations: 'Ne mesure pas la qualité ni l’aboutissement du suivi ; certaines demandes sont anonymes.',
  },
  {
    key: 'conv_generosite',
    name: 'Générosité — don confirmé',
    group: 'Conversions',
    definition:
      'Nombre de dons CONFIRMÉS sur la période (paiement effectivement complété). Ne compte ni les clics, ni les intentions.',
    source: "first-party — dons (statut='complete', webhook Chariow strict)",
    freshness: 'SYNCED',
    howToRead:
      'Uniquement les dons réellement finalisés (event=successful.sale ET sale.status=completed). C’est la conversion la plus profonde.',
    whatGoodMeans: 'Une hausse traduit une générosité engagée et une confiance forte.',
    whatBadMeans: 'Beaucoup de clics « donner » mais peu de dons confirmés = friction dans le paiement.',
    whatToDo: 'Simplifier le parcours de don et remercier/relancer avec tact.',
    limitations:
      'Compte le NOMBRE de dons, pas les montants ici. Dépend de la bonne réception des webhooks Chariow.',
  },

  /* ---------------------------- Tunnel & attribution --------------------------- */
  {
    key: 'funnel_visites',
    name: 'Tunnel — Visites',
    group: 'Tunnel & attribution',
    definition: 'Première étape du tunnel : pages vues (événements), pas visiteurs uniques.',
    source: "first-party — analytics_events (type='pageview')",
    freshness: 'NEAR_REALTIME',
    howToRead: 'Sommet du tunnel. Cohorte = pages vues, donc non comparable directement aux étapes en personnes.',
    whatGoodMeans: 'Un large sommet alimente le reste du tunnel.',
    whatBadMeans: 'Un sommet étroit limite tout l’aval.',
    whatToDo: 'Travailler l’acquisition (SEO, partages) pour élargir le haut du tunnel.',
    limitations: 'Cohorte « pages vues » : aucun taux fiable vers l’étape suivante (personnes) n’est calculable.',
  },
  {
    key: 'funnel_inscriptions',
    name: 'Tunnel — Inscriptions',
    group: 'Tunnel & attribution',
    definition: 'Personnes nouvellement inscrites sur la période.',
    source: 'first-party — profiles.created_at',
    freshness: 'SYNCED',
    howToRead: 'Cohorte = personnes. Ne se divise pas honnêtement par des « pages vues ».',
    whatGoodMeans: 'Un bon report visites → inscriptions serait idéal, mais reste non mesurable ici (cohortes différentes).',
    whatBadMeans: 'Peu d’inscriptions malgré un large sommet = friction à l’entrée.',
    whatToDo: 'Optimiser les pages d’inscription ; suivre l’acquisition par source.',
    limitations: 'Taux vis-à-vis des visites INDISPONIBLE (cohortes incompatibles : pages vues vs personnes).',
  },
  {
    key: 'funnel_engagement',
    name: 'Tunnel — Engagement',
    group: 'Tunnel & attribution',
    definition: 'Écoutes de podcast (plays) sur la période — étape d’engagement du tunnel.',
    source: 'first-party — audio_listening_events',
    freshness: 'NEAR_REALTIME',
    howToRead: 'Cohorte = écoutes (plays), incluant anonymes et membres existants.',
    whatGoodMeans: 'Un engagement fort prépare le passage au parcours.',
    whatBadMeans: 'Engagement faible = contenu peu découvert par les inscrits.',
    whatToDo: 'Guider les nouveaux inscrits vers le contenu ; mesurer les épisodes populaires.',
    limitations: 'Taux vis-à-vis des inscriptions INDISPONIBLE (écoutes ≠ personnes inscrites).',
  },
  {
    key: 'funnel_parcours',
    name: 'Tunnel — Parcours',
    group: 'Tunnel & attribution',
    definition: 'Progressions de parcours = complétions de module sur la période.',
    source: 'first-party — module_completions.completed_at',
    freshness: 'SYNCED',
    howToRead: 'Cohorte = complétions de module (événements immuables).',
    whatGoodMeans: 'Beaucoup de progressions = discipulat actif.',
    whatBadMeans: 'Peu de progressions malgré de l’engagement = passage à l’action difficile.',
    whatToDo: 'Baliser un premier module simple pour amorcer la progression.',
    limitations: 'Taux vis-à-vis de l’engagement INDISPONIBLE (complétions ≠ écoutes).',
  },
  {
    key: 'funnel_completions',
    name: 'Tunnel — Complétions',
    group: 'Tunnel & attribution',
    definition: 'Parcours/formations COMPLETS terminés. INDISPONIBLE : aucune source fiable.',
    source: 'indisponible — aucun événement fiable de fin de parcours complet',
    freshness: 'SYNCED',
    howToRead: 'Affichée « Indisponible », jamais 0.',
    whatGoodMeans: 's/o tant que la métrique n’est pas instrumentée.',
    whatBadMeans: 's/o tant que la métrique n’est pas instrumentée.',
    whatToDo: 'Instrumenter un marqueur fiable d’achèvement de parcours complet.',
    limitations: 'Voir la catégorie « Accomplissement » : module_completions ne prouve pas l’achèvement global.',
  },
  {
    key: 'funnel_conversions',
    name: 'Tunnel — Conversions',
    group: 'Tunnel & attribution',
    definition:
      'Étape finale (conversions profondes). Non affichée en un seul nombre : elle regroupe des cohortes hétérogènes non sommables.',
    source: 'composite — voir le détail par catégorie',
    freshness: 'SYNCED',
    howToRead: 'À lire via le détail par catégorie (dons, prières, événements), jamais comme un total unique.',
    whatGoodMeans: 'Des conversions profondes en hausse = un parcours spirituel qui porte du fruit.',
    whatBadMeans: 'Un tunnel large mais sans conversions profondes = engagement superficiel.',
    whatToDo: 'Piloter chaque catégorie de conversion séparément.',
    limitations: 'Somme d’unités différentes (dons, prières, événements) impossible ⇒ pas de nombre agrégé honnête.',
  },
  {
    key: 'source_attribution',
    name: 'Attribution par source',
    group: 'Tunnel & attribution',
    definition:
      'Répartition Visites / Inscriptions / Progressions par canal d’acquisition (first-touch de la session).',
    source: 'first-party — analytics_sessions + detectSource',
    freshness: 'SYNCED',
    howToRead: 'La source est celle du PREMIER contact de la session. La nav interne est exclue.',
    whatGoodMeans: 'Voir quels canaux amènent le plus de visites et d’inscriptions oriente les efforts.',
    whatBadMeans: 'Beaucoup de « Direct/Inconnu » = liens non balisés (UTM) à corriger.',
    whatToDo: 'Baliser systématiquement les liens partagés (UTM) pour une attribution fiable.',
    limitations:
      'La colonne « Conversion » par source est indisponible : la conversion first-touch peut pointer une session hors fenêtre (cohortes différentes).',
  },
  {
    key: 'conversion_rate',
    name: 'Taux de conversion',
    group: 'Tunnel & attribution',
    definition:
      'Rapport entre deux étapes. N’est calculé QUE si les deux étapes partagent la même cohorte attribuable ; sinon INDISPONIBLE.',
    source: 'dérivé — calcul pur entre deux étapes comparables',
    freshness: 'SYNCED',
    howToRead: 'Un taux affiché est fiable ; un taux « Indisponible » indique des cohortes non comparables (raison fournie).',
    whatGoodMeans: 'Un taux calculable et élevé signale un bon passage d’une étape à la suivante.',
    whatBadMeans: 'Un taux calculable et faible pointe une fuite à corriger sur cette transition.',
    whatToDo: 'Se concentrer sur les transitions RÉELLEMENT mesurables ; instrumenter les autres pour les rendre comparables.',
    limitations:
      'La plupart des transitions du tunnel mêlent des cohortes différentes (pages vues, personnes, écoutes, complétions) ⇒ taux volontairement non affiché.',
  },
]

/** Index par clé (Map figée) pour une recherche O(1). */
const BY_KEY: ReadonlyMap<string, MetricDictionaryEntry> = new Map(
  METRIC_DICTIONARY.map((m) => [m.key, m]),
)

/** Recherche une entrée par clé. Retourne undefined si inconnue (jamais d'erreur). */
export function getMetric(key: string): MetricDictionaryEntry | undefined {
  return BY_KEY.get(key)
}

/** Ordre canonique des groupes pour le rendu du guide. */
export const METRIC_GROUP_ORDER: ReadonlyArray<MetricGroup> = [
  'Vue générale (first-party)',
  'SEO — Google (différé)',
  'Chaînes externes',
  'Conversions',
  'Tunnel & attribution',
]

/** Regroupe le dictionnaire par groupe, dans l'ordre canonique. PURE. */
export function metricsByGroup(): Array<{ group: MetricGroup; entries: MetricDictionaryEntry[] }> {
  return METRIC_GROUP_ORDER.map((group) => ({
    group,
    entries: METRIC_DICTIONARY.filter((m) => m.group === group),
  }))
}
