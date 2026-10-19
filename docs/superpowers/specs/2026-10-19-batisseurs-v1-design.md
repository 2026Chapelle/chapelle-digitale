# Batisseurs V1 - Espace prive des groupes

## Objectif
Donner aux Batisseurs de la Chambre Haute un espace permanent
dans Citadelle pour se reunir, partager des sujets de priere,
recevoir des annonces et consulter des ressources.

## Integration
- Reutiliser le groupe existant, sans creer de doublon.
- Identifier le groupe par son UUID, jamais par son nom seul.
- Creer une page membre /member/dashboard/groupes/[id].
- Ajouter un bouton dans Mes Groupes.
- Ajouter un acces depuis Mahanaim.
- Un visiteur non connecte passe par la connexion.
- Un membre non admis est dirige vers la demande d'adhesion.

## Rencontres
- Reutiliser group_reunions et les services existants.
- Afficher theme, description, date et heure Africa/Abidjan.
- Afficher les rencontres planifiees et un historique.
- Ouvrir le lien Google Meet dans un nouvel onglet.
- Valider le lien avant affichage et refuser les schemas dangereux.
- Le responsable programme les rencontres avec les outils existants.
- Le controle des entrees dans Meet reste assure par l'organisateur.
- Aucun enregistrement ou pointage automatique.
- Salle audio/video integree hors perimetre V1.

## Contenus
Une table de contenus rattaches au groupe conserve :
- Identifiant, groupe, auteur et dates.
- Type : annonce, priere, ressource ou temoignage.
- Titre et texte brut.
- URL facultative pour une ressource.
- Visibilite : groupe ou responsables.
- Etat : en_attente, publie, refuse ou archive.
- Moderateur et date de moderation.

Les annonces et ressources sont publiees par les responsables.
Les prieres et temoignages des membres attendent une validation.
Un temoignage collectif exige un consentement explicite.
Les ressources V1 utilisent des liens ; aucun nouvel upload prive.
Un lien vers un fichier public ne garantit pas sa confidentialite.

## Confidentialite
Une priere confidentielle est visible par son auteur et les
responsables autorises du groupe.
Elle ne peut pas etre convertie en publication collective par
une simple validation.
L'auteur peut retirer sa propre proposition.
Les autres membres ne recoivent ni le texte ni les metadonnees
des demandes confidentielles ou des propositions en attente.

## Autorisations
- Session membre verifiee cote serveur.
- Groupe actif requis.
- Lecture collective reservee aux membres actifs et gestionnaires autorises.
- Gestion : leader actif, co-leader actif ou perimetre administratif autorise.
- Reutiliser les regles existantes apres verification de leurs limites.
- Retrait d'adhesion : acces refuse des la requete suivante.
- Auteur derive de la session, jamais du corps de la requete.
- Groupe, role, consentement et transitions controles cote serveur.
- Aucun cache public des contenus ou reponses authentifiees.
- Table protegee par RLS ; aucune lecture ou ecriture directe
  accordee au navigateur pour contourner les controles serveur.

## Interface
- Prochaine rencontre en tete.
- Rubriques : Rencontres, Sujets de priere, Annonces,
  Ressources et Temoignages.
- Formulaire de proposition pour les membres.
- Choix de confidentialite explicite pour les prieres.
- Vue de moderation pour les responsables.
- Etats chargement, vide, acces refuse et erreur avec message lisible.
- Presentation mobile et navigation clavier.

## Verification
- Non connecte, non-membre, adhesion en attente ou retiree : refus.
- Groupe inactif : refus.
- Membre : lecture des publications et de ses propositions uniquement.
- Responsable : moderation limitee a ses groupes autorises.
- Refus des changements de groupe, auteur ou role injectes.
- Priere confidentielle absente des reponses collectives.
- Temoignage sans consentement non publiable.
- Liens dangereux refuses.
- Tests des autorisations, migration locale, types et build production.

## Livraison
- Developpement dans le worktree BATISSEURS-V1.
- Preserver les deux modifications Sentinelles deja presentes.
- Migration additive preparee et testee localement.
- Aucune mutation Supabase distante sans GO explicite.
- Aucun deploiement production sans GO explicite.
- Pas de db push production et pas de rsync --delete.
- Pas de secret dans les fichiers, sorties ou rapports.