/**
 * CENTRE D'AIDE ADMIN — contenu CENTRAL des guides (source unique, PUR).
 *
 * Couche d'assistance additive : ne touche AUCUNE logique métier. Les guides
 * sont consommés par la page /admin/aide (recherche + panneaux) et par les
 * bulles contextuelles (AdminHelpBubble) via `guideForPath`.
 * Pour enrichir l'aide : ajouter un objet ici — rien à dupliquer ailleurs.
 */

export type HelpCategory =
  | 'Tableau de bord' | 'Membres' | 'Fiche 360°' | 'Communication'
  | 'Groupes / Cellules' | 'Présences / Réunions' | 'Alertes pastorales'
  | 'Gouvernement pastoral' | 'Plateformes' | 'Paramètres' | 'Déploiement / Maintenance'

export const HELP_CATEGORIES: HelpCategory[] = [
  'Tableau de bord', 'Membres', 'Fiche 360°', 'Communication', 'Groupes / Cellules',
  'Présences / Réunions', 'Alertes pastorales', 'Gouvernement pastoral', 'Plateformes',
  'Paramètres', 'Déploiement / Maintenance',
]

export interface Guide {
  id: string
  category: HelpCategory
  title: string
  objectif: string
  quand: string
  etapes: string[]
  erreurs: string[]
  href: string            // page concernée
  tip: string             // texte court de la bulle contextuelle
  paths?: string[]        // chemins admin où la bulle s'affiche ('/x' exact, '/x/*' préfixe)
}

export const GUIDES: Guide[] = [
  {
    id: 'tableau-de-bord',
    category: 'Tableau de bord',
    title: 'Lire le tableau de bord',
    objectif: "Avoir une vue d'ensemble de l'activité de la Citadelle (membres, engagement, activité récente).",
    quand: "À chaque connexion, pour prendre le pouls général avant d'agir.",
    etapes: [
      'Ouvrez /admin/dashboard.',
      'Lisez les indicateurs clés (membres, nouveaux, activité).',
      'Repérez les variations inhabituelles puis ouvrez le module concerné (Membres, Gouvernement…).',
    ],
    erreurs: [
      'Confondre une donnée instantanée avec une tendance : pour l\'évolution, voir le Gouvernement pastoral.',
      "Agir sur un chiffre sans vérifier sa source dans le module dédié.",
    ],
    href: '/admin/dashboard',
    tip: "Vue d'ensemble de la Citadelle. Commencez ici.",
    paths: ['/admin/dashboard'],
  },
  {
    id: 'membres',
    category: 'Membres',
    title: 'Gérer les membres',
    objectif: 'Rechercher, filtrer et administrer les comptes membres.',
    quand: "Pour retrouver un membre, vérifier un statut, changer un rôle ou archiver un compte.",
    etapes: [
      'Ouvrez /admin/membres.',
      'Recherchez/filtrez (nom, pays, statut, rôle).',
      'Cliquez un membre pour ouvrir sa fiche 360°.',
    ],
    erreurs: [
      'Changer un rôle fonctionnel sans en mesurer l\'impact RBAC (accès aux espaces).',
      'Supprimer au lieu d\'archiver : préférez l\'archivage (réversible).',
    ],
    href: '/admin/membres',
    tip: 'Annuaire des membres : recherche, filtres, accès à la fiche 360°.',
    paths: ['/admin/membres'],
  },
  {
    id: 'fiche-360',
    category: 'Fiche 360°',
    title: 'Comprendre la fiche 360°',
    objectif: "Voir tout le parcours d'un membre : profil, statut, communauté, formation, générosité, alertes, timeline.",
    quand: "Avant un accompagnement pastoral, pour décider d'une action ciblée.",
    etapes: [
      "Depuis /admin/membres, ouvrez un membre.",
      'Parcourez les sections (Statut, Communauté, Activité, Alertes…).',
      'Utilisez les actions (statut, responsable, note, message) selon le besoin.',
    ],
    erreurs: [
      "Lire le score d'engagement sans contexte : croisez-le avec la récence d'activité.",
      'Oublier de tracer une décision : ajoutez une note pastorale.',
    ],
    href: '/admin/membres',
    tip: 'Vue 360° du membre : tout son parcours et les actions pastorales.',
    paths: ['/admin/membres/*'],
  },
  {
    id: 'communication',
    category: 'Communication',
    title: 'Communiquer avec les membres',
    objectif: 'Envoyer campagnes ciblées, annonces officielles et messages, et suivre leur portée.',
    quand: "Pour informer un public précis (rôle, statut, pays, plateforme) ou répondre à un membre.",
    etapes: [
      'Ouvrez /admin/communication.',
      'Choisissez Campagne, Annonce ou Message.',
      'Ciblez l\'audience, rédigez, prévisualisez puis envoyez.',
      'Suivez les ouvertures dans le journal.',
    ],
    erreurs: [
      'Cibler « tous » par défaut au lieu de restreindre l\'audience.',
      'Oublier de vérifier le canal (in-app vs email) et les préférences des membres.',
    ],
    href: '/admin/communication',
    tip: 'Campagnes, annonces et messages ciblés + suivi des ouvertures.',
    paths: ['/admin/communication'],
  },
  {
    id: 'groupes',
    category: 'Groupes / Cellules',
    title: 'Administrer les groupes & cellules',
    objectif: 'Créer/organiser les groupes, gérer les membres, nommer les leaders, traiter les demandes.',
    quand: "Pour structurer la communauté (cellules, équipes) et déléguer l'animation.",
    etapes: [
      'Ouvrez /admin/groupes.',
      "Créez un groupe (plateforme obligatoire) ou ouvrez-en un.",
      'Gérez les membres, nommez un leader/co-leader, définissez le groupe principal.',
      'Onglet Demandes : approuvez/refusez les adhésions.',
    ],
    erreurs: [
      'Oublier la plateforme à la création (champ obligatoire).',
      'Multiplier les groupes principaux : un seul par membre (géré automatiquement).',
    ],
    href: '/admin/groupes',
    tip: 'Groupes, cellules, leaders et demandes d\'adhésion.',
    paths: ['/admin/groupes'],
  },
  {
    id: 'presences',
    category: 'Présences / Réunions',
    title: 'Réunions & présences',
    objectif: "Planifier des réunions, saisir les présences et suivre l'assiduité.",
    quand: "Pour organiser la vie des groupes et détecter les absences répétées.",
    etapes: [
      'Ouvrez /admin/reunions.',
      'Créez une réunion (présentiel / en ligne / hybride) pour un groupe.',
      'Saisissez la feuille de présence (présent / absent / excusé).',
      "Consultez les statistiques d'assiduité par groupe.",
    ],
    erreurs: [
      'Saisir une présence pour un non-membre du groupe (ignoré).',
      "Oublier de marquer la réunion « tenue » : c'est automatique dès qu'une présence est saisie.",
    ],
    href: '/admin/reunions',
    tip: 'Planifiez les réunions et saisissez les présences/assiduité.',
    paths: ['/admin/reunions'],
  },
  {
    id: 'alertes-pastorales',
    category: 'Alertes pastorales',
    title: 'Traiter les alertes pastorales',
    objectif: 'Repérer et prendre en charge les membres à risque (inactivité, prière non traitée, absences…).',
    quand: "Quotidiennement, pour un suivi pastoral réactif.",
    etapes: [
      'Ouvrez le Centre Pastoral (/admin/pastoral) ou la fiche d\'un membre.',
      'Lisez les alertes (niveau, type, ancienneté).',
      'Prenez en charge puis résolvez ; ajoutez une note de suivi.',
    ],
    erreurs: [
      "Laisser une alerte « nouvelle » : au-delà de 7 jours, elle est escaladée automatiquement.",
      'Résoudre sans action réelle : tracez l\'accompagnement.',
    ],
    href: '/admin/pastoral',
    tip: 'Alertes de suivi : prise en charge, résolution, escalade.',
    paths: ['/admin/pastoral'],
  },
  {
    id: 'gouvernement-pastoral',
    category: 'Gouvernement pastoral',
    title: 'Piloter le gouvernement pastoral',
    objectif: 'Suivre croissance, engagement, intégration et formation au niveau global et national.',
    quand: "Pour le pilotage stratégique (tendances, santé spirituelle, conversions).",
    etapes: [
      'Ouvrez /admin/gouvernement.',
      'Filtrez par pays si besoin.',
      'Analysez les modules (croissance, engagement, intégration, formation).',
    ],
    erreurs: [
      "Interpréter un score d'engagement isolément : il se lit avec la récence et la conversion.",
      'Confondre présence en ligne (sessions) et assiduité aux réunions.',
    ],
    href: '/admin/gouvernement',
    tip: 'Pilotage pastoral : croissance, engagement, intégration, formation.',
    paths: ['/admin/gouvernement'],
  },
  {
    id: 'dashboard-national',
    category: 'Gouvernement pastoral',
    title: 'Dashboard national',
    objectif: "Suivre une nation précise : membres, responsables, prières, dons, formations.",
    quand: "Pour accompagner un responsable national ou comparer les nations.",
    etapes: [
      'Ouvrez /admin/nation-dashboard.',
      'Sélectionnez une nation (ou « toutes »).',
      'Lisez les KPIs et croisez avec l\'International pour le classement.',
    ],
    erreurs: [
      'Comparer des nations sans tenir compte des effectifs.',
      'Oublier que les données sensibles (cure d\'âme) sont agrégées, jamais nominatives.',
    ],
    href: '/admin/nation-dashboard',
    tip: 'Pilotage par nation : KPIs et accompagnement des responsables.',
    paths: ['/admin/nation-dashboard'],
  },
  {
    id: 'commandement-global',
    category: 'Gouvernement pastoral',
    title: 'Commandement global',
    objectif: 'Vue mondiale : santé spirituelle, alertes, mission, finances par territoire.',
    quand: "Pour la supervision apostolique transverse (monde / antennes).",
    etapes: [
      'Ouvrez /admin/global-command.',
      'Lisez le pouls mondial et les alertes consolidées.',
      'Descendez par territoire / antenne pour investiguer.',
    ],
    erreurs: [
      'Réagir à une alerte sans l\'ouvrir dans le module source.',
      'Négliger la journalisation des accès sensibles (déjà automatique).',
    ],
    href: '/admin/global-command',
    tip: 'Vue mondiale consolidée : santé, alertes, mission, finances.',
    paths: ['/admin/global-command'],
  },
  {
    id: 'plateformes',
    category: 'Plateformes',
    title: 'Plateformes & International',
    objectif: "Comprendre les 8 plateformes officielles et le pilotage international.",
    quand: "Pour situer un groupe/membre dans sa plateforme et suivre l'expansion par pays.",
    etapes: [
      'Les 8 plateformes : Académie des Élus, Mahanaïm, Familles de la Chapelle, Femmes d\'Exceptions, Jeunesse de la Chapelle, CIER, Cité du Refuge, CFIC.',
      'Ouvrez /admin/international pour la carte et le classement des nations.',
      'Filtrez les groupes par plateforme dans /admin/groupes.',
    ],
    erreurs: [
      'Confondre plateforme (branche ministérielle) et nation (pays).',
      'Attendre un cockpit par plateforme : il est prévu en enrichissement (non encore livré).',
    ],
    href: '/admin/international',
    tip: 'Les 8 plateformes officielles + pilotage international.',
    paths: ['/admin/international'],
  },
  {
    id: 'parametres',
    category: 'Paramètres',
    title: 'Paramètres de la plateforme',
    objectif: 'Configurer les réglages généraux du back-office.',
    quand: "Pour ajuster la configuration globale (rarement, avec prudence).",
    etapes: [
      'Ouvrez /admin/parametres.',
      'Modifiez un réglage à la fois et vérifiez son effet.',
    ],
    erreurs: [
      'Changer plusieurs réglages en même temps sans vérifier.',
      'Modifier un paramètre sensible sans sauvegarde préalable.',
    ],
    href: '/admin/parametres',
    tip: 'Réglages généraux du back-office.',
    paths: ['/admin/parametres'],
  },
  {
    id: 'deploiement-maintenance',
    category: 'Déploiement / Maintenance',
    title: 'Déployer & maintenir Citadelle',
    objectif: "Comprendre le cycle migrations Supabase + déploiement standalone (PlanetHoster/N0C).",
    quand: "Lors d'une mise à jour : nouvelle fonctionnalité ou correctif.",
    etapes: [
      'Exécuter les migrations « apply-*-sql-editor.sql » en attente dans Supabase → SQL Editor.',
      'Téléverser le ZIP standalone (deploy-citadelle.zip) sur N0C, extraire en conservant les variables d\'environnement.',
      'Redémarrer l\'application Passenger.',
      'Vérifier que le cron (CRON_SECRET) est planifié (alertes + score d\'engagement quotidien).',
    ],
    erreurs: [
      'Déployer le ZIP sans exécuter les migrations correspondantes (fonctions invisibles ou en erreur).',
      'Oublier de planifier le cron : les alertes et le score d\'engagement ne se mettent pas à jour.',
    ],
    href: '/admin/sante-spirituelle',
    tip: 'Migrations + ZIP standalone + redémarrage + cron.',
    paths: [],
  },
]

/** Recherche plein-texte simple (PUR) sur titre/objectif/catégorie/étapes/erreurs. */
export function searchGuides(query: string, guides: Guide[] = GUIDES): Guide[] {
  const q = query.trim().toLowerCase()
  if (!q) return guides
  const terms = q.split(/\s+/)
  return guides.filter((g) => {
    const hay = [g.title, g.objectif, g.quand, g.category, ...g.etapes, ...g.erreurs].join(' ').toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}

/** Guide associé à un chemin admin (PUR) : exact prioritaire, puis préfixe '/x/*'. */
export function guideForPath(pathname: string, guides: Guide[] = GUIDES): Guide | null {
  for (const g of guides) if (g.paths?.some((p) => !p.endsWith('/*') && p === pathname)) return g
  for (const g of guides) if (g.paths?.some((p) => p.endsWith('/*') && pathname.startsWith(p.slice(0, -1)))) return g
  return null
}
