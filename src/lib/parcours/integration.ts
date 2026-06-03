/**
 * PARCOURS D'INTÉGRATION — 7 jours (programme CFIC).
 *
 * Le premier parcours de transformation : il accueille le nouvel inscrit,
 * lui révèle la vision, fonde son identité, le rattache à une famille et
 * lui confie sa première mission. Déblocage « Jour 1 → Jour 7 » dans le temps.
 *
 * Contenu RÉEL (aucun faux module). Les vidéos/médias seront branchés via le
 * CMS quand disponibles ; les blocs ci-dessous sont autonomes (Parole + texte).
 */
import type { Programme, ParcoursStep } from './types'

function jour(
  ordre: number,
  step: Omit<ParcoursStep, 'ordre' | 'unlock' | 'status'>,
): ParcoursStep {
  return {
    ordre,
    status: 'published',
    // Jour 1 immédiat ; chaque jour suivant se débloque 1 jour après le précédent.
    unlock: { mode: 'time', dayOffset: ordre - 1 },
    ...step,
  }
}

const STEPS: ParcoursStep[] = [
  jour(1, {
    id: 'integ-j1',
    titre: 'Bienvenue dans la maison',
    sousTitre: 'Jour 1 · Tu as une famille',
    resume: "Tu n'es pas un numéro : tu es attendu. Découvre l'accueil de la Chapelle et ce que signifie appartenir.",
    dureeMin: 12,
    xp: 50,
    badgeId: 'premier_pas',
    contenu: [
      { type: 'scripture', ref: 'Éphésiens 2:19', texte: "Ainsi donc, vous n'êtes plus des étrangers, ni des gens du dehors ; mais vous êtes concitoyens des saints, gens de la maison de Dieu." },
      { type: 'teaching', markdown: "Bienvenue. Ici commence bien plus qu'une inscription : une appartenance. La Chapelle est une famille spirituelle, ouverte au monde, où chacun trouve sa place. Pendant 7 jours, nous marcherons ensemble — un pas par jour — pour t'enraciner." },
      { type: 'declaration', texte: "Aujourd'hui, je choisis d'appartenir. Je ne suis plus seul : j'ai une maison dans le Royaume." },
    ],
    mission: { id: 'm-j1', titre: 'Présente-toi', description: 'Complète ton profil (prénom, pays) pour que la famille puisse t’accueillir personnellement.', type: 'action', verification: 'auto' },
    journal: [{ id: 'jr-j1', prompt: "Qu'est-ce qui t'a conduit jusqu'ici aujourd'hui ?" }],
  }),
  jour(2, {
    id: 'integ-j2',
    titre: 'La vision de la Chapelle',
    sousTitre: 'Jour 2 · Une Église ouverte au monde',
    resume: "Comprends qui nous sommes : une famille de ministères complémentaires, une seule vision pour les nations.",
    dureeMin: 14,
    xp: 60,
    contenu: [
      { type: 'scripture', ref: 'Matthieu 28:19', texte: 'Allez, faites de toutes les nations des disciples.' },
      { type: 'teaching', markdown: "La Chapelle Internationale des Élus du Royaume est une église digitale mondiale : huit plateformes ministérielles, une seule vision. Aucune n'est supérieure aux autres — ensemble, elles forment un corps. Notre appel : faire des disciples transformés, sur tous les continents." },
      { type: 'callout', ton: 'or', markdown: "**Nos Ministères — 8 Plateformes, Une Seule Vision.** CFIC, Mahanaïm, CIER, Chapelle Familiale, Familles de la Chapelle, Femmes d’Exceptions, Jeunesse de la Chapelle, Cité du Refuge." },
    ],
    quiz: {
      seuilReussite: 70,
      questions: [
        { id: 'q-j2-1', question: 'Quelle est la vision de la Chapelle ?', options: ['Diffuser des vidéos', 'Faire des disciples de toutes les nations', 'Rassembler une seule communauté locale'], correct: 1, explication: 'Matthieu 28:19 — faire des disciples de toutes les nations.' },
        { id: 'q-j2-2', question: 'Comment sont organisées les plateformes ?', options: ['Une principale et des sous-sections', 'Autonomes et complémentaires, aucune supérieure', 'Par ordre d’ancienneté'], correct: 1 },
      ],
    },
    mission: { id: 'm-j2', titre: 'Explore une plateforme', description: 'Visite la page « Nos Ministères » et lis la mission d’au moins une plateforme.', type: 'lecture', verification: 'declarative' },
    journal: [{ id: 'jr-j2', prompt: 'Quelle plateforme résonne le plus avec ton appel aujourd’hui, et pourquoi ?' }],
  }),
  jour(3, {
    id: 'integ-j3',
    titre: 'Ton identité dans le Royaume',
    sousTitre: 'Jour 3 · Qui tu es en Christ',
    resume: 'Avant de faire, il faut savoir qui tu es. Découvre ton identité d’enfant et d’élu du Royaume.',
    dureeMin: 15,
    xp: 70,
    contenu: [
      { type: 'scripture', ref: '1 Pierre 2:9', texte: 'Vous êtes une race élue, un sacerdoce royal, une nation sainte, un peuple acquis.' },
      { type: 'teaching', markdown: "Ton identité ne se gagne pas, elle se reçoit. Tu es élu, royal, saint, racheté. C'est le fondement de toute transformation : on ne devient pas quelqu'un d'autre, on apprend à vivre depuis qui Dieu dit que l'on est déjà." },
      { type: 'declaration', texte: 'Je suis une race élue, un sacerdoce royal. Je vis depuis mon identité, non pour la mériter.' },
    ],
    quiz: {
      seuilReussite: 70,
      questions: [
        { id: 'q-j3-1', question: 'Selon 1 Pierre 2:9, qui es-tu ?', options: ['Un serviteur sans valeur', 'Une race élue, un sacerdoce royal', 'Un simple spectateur'], correct: 1 },
      ],
    },
    mission: { id: 'm-j3', titre: 'Proclame ton identité', description: 'Relis à voix haute la déclaration du jour, puis note ce qu’elle change pour toi.', type: 'priere', verification: 'declarative' },
    journal: [{ id: 'jr-j3', prompt: 'Quelle part de ton identité en Christ as-tu du mal à croire — et pourquoi ?' }],
  }),
  jour(4, {
    id: 'integ-j4',
    titre: 'Les fondations : la Parole & la prière',
    sousTitre: 'Jour 4 · S’enraciner',
    resume: 'Une vie transformée se bâtit sur deux piliers quotidiens : écouter Dieu (la Parole) et lui parler (la prière).',
    dureeMin: 16,
    xp: 70,
    contenu: [
      { type: 'scripture', ref: 'Josué 1:8', texte: 'Que ce livre de la loi ne s’éloigne point de ta bouche ; médite-le jour et nuit.' },
      { type: 'teaching', markdown: "La transformation n'est pas un événement, c'est une habitude. Quelques minutes par jour dans la Parole et la prière creusent des racines profondes. Commence petit, mais commence aujourd'hui." },
    ],
    mission: { id: 'm-j4', titre: 'Premier temps avec Dieu', description: 'Prends 5 minutes : lis un psaume et dépose une prière sur le mur de prière.', type: 'priere', verification: 'auto' },
    journal: [{ id: 'jr-j4', prompt: 'Quel moment de ta journée peux-tu consacrer à ce rendez-vous avec Dieu ?' }],
  }),
  jour(5, {
    id: 'integ-j5',
    titre: 'Ta famille spirituelle',
    sousTitre: 'Jour 5 · Ne plus marcher seul',
    resume: 'On ne grandit pas isolé. Rejoins une Famille de la Chapelle — un petit groupe pour être connu, soutenu et encouragé.',
    dureeMin: 12,
    xp: 70,
    contenu: [
      { type: 'scripture', ref: 'Hébreux 10:24-25', texte: 'Veillons les uns sur les autres… n’abandonnons pas notre assemblée.' },
      { type: 'teaching', markdown: "Les Familles de la Chapelle sont le cœur relationnel de l'œuvre : des cellules où l'on prie, partage et grandit ensemble. C'est là que la foi devient concrète, portée par d'autres." },
    ],
    mission: { id: 'm-j5', titre: 'Rejoins une Famille', description: 'Choisis et rejoins une Famille de la Chapelle (groupe) qui correspond à ta saison.', type: 'relation', verification: 'auto' },
    journal: [{ id: 'jr-j5', prompt: 'Qu’attends-tu d’une famille spirituelle ?' }],
  }),
  jour(6, {
    id: 'integ-j6',
    titre: 'Ta première mission',
    sousTitre: 'Jour 6 · La foi qui agit',
    resume: 'Un disciple n’est pas un consommateur. Reçois une première mission simple : bénir quelqu’un autour de toi.',
    dureeMin: 12,
    xp: 80,
    contenu: [
      { type: 'scripture', ref: 'Jacques 1:22', texte: 'Mettez en pratique la parole, et ne vous bornez pas à l’écouter.' },
      { type: 'teaching', markdown: "La transformation se prouve dans l'action. Aujourd'hui, fais le premier pas du service : un message d'encouragement, une prière pour un proche, une invitation. Petit geste, grande semence." },
    ],
    mission: { id: 'm-j6', titre: 'Bénis une personne', description: 'Cette semaine, encourage ou prie concrètement pour une personne, puis partage l’expérience.', type: 'partage', verification: 'declarative' },
    journal: [{ id: 'jr-j6', prompt: 'Qui Dieu met-il sur ton cœur en ce moment ?' }],
  }),
  jour(7, {
    id: 'integ-j7',
    titre: 'Envoyé pour grandir',
    sousTitre: 'Jour 7 · La suite du chemin',
    resume: 'Tu es intégré ! Découvre ta prochaine étape : l’Académie des Élus et les parcours qui t’attendent.',
    dureeMin: 10,
    xp: 100,
    badgeId: 'integration_accomplie',
    contenu: [
      { type: 'scripture', ref: 'Philippiens 1:6', texte: 'Celui qui a commencé en vous cette bonne œuvre la rendra parfaite.' },
      { type: 'teaching', markdown: "Sept jours, sept pas. Tu n'es plus un visiteur : tu fais partie de la famille. La croissance continue — l'**Académie des Élus** (Identité, Culture, Puissance, Service, Prophétie, Gouvernement du Royaume) t'attend pour aller plus loin." },
      { type: 'declaration', texte: "J'ai commencé, et je choisis de continuer. Je suis un disciple en marche." },
    ],
    mission: { id: 'm-j7', titre: 'Choisis ta prochaine étape', description: 'Découvre l’Académie des Élus et marque ton intention de poursuivre.', type: 'action', verification: 'declarative' },
    journal: [{ id: 'jr-j7', prompt: "Qu'est-ce que ces 7 jours ont changé en toi ?" }],
  }),
]

export const PARCOURS_INTEGRATION: Programme = {
  slug: 'integration',
  titre: "Parcours d'Intégration",
  sousTitre: '7 jours pour trouver ta place',
  description: "Sept jours d'accompagnement pour passer de visiteur à membre enraciné : accueil, vision, identité, fondations, famille, mission, envoi.",
  type: 'integration',
  plateforme: 'cfic',
  parent: 'cfic',
  couleur: '#D4AF37',
  icone: '🕊️',
  delivreCertificat: true,
  badgeFinal: 'integration_accomplie',
  status: 'published',
  niveaux: [
    {
      id: 'integ-niv-1',
      ordre: 1,
      titre: 'Intégration',
      theme: 'Entrer · S’enraciner · Être envoyé',
      description: 'Le chemin des 7 premiers jours dans la famille de la Chapelle.',
      couleur: '#D4AF37',
      steps: STEPS,
      validation: { toutesEtapes: true, scoreMinMoyen: 70 },
      certificatId: 'cert-integration',
    },
  ],
}
