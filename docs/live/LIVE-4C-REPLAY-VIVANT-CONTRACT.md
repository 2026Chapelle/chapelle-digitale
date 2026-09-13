# CITADELLE — LIVE 4C
## LE REPLAY VIVANT
### UX + Editorial Contract

Status: FROZEN FOR IMPLEMENTATION

---

# 1. VISION

Un live Citadelle n'est pas une vidéo qui disparaît lorsque le direct se termine.

Il devient un espace persistant de croissance, de mémoire spirituelle,
de communauté et d'accompagnement pastoral.

Le replay doit permettre à une personne de revenir plusieurs fois sans
perdre son parcours personnel et sans fausser les statistiques ou les
interactions communautaires.

---

# 2. LES SIX COUCHES DE MÉMOIRE

## 0 — Mémoire éditoriale

Elle décrit l'identité du contenu :

- programme
- plateforme / ministère
- série
- saison
- épisode / session
- intervenant
- date
- ordre
- catégorie

Le replay hérite automatiquement de cette identité depuis le live.

## 1 — Mémoire du culte

Elle conserve ce qui s'est réellement produit pendant le direct.

Exemple :

- réactions du direct
- informations du culte
- vidéo / archive exacte

Cette mémoire devient immuable après la fin du direct.

## 2 — Mémoire communautaire du replay

Elle évolue après le direct :

- réactions au replay
- commentaires publiés
- témoignages éventuels

Cette mémoire ne doit jamais modifier les statistiques historiques du live.

## 3 — Mémoire du spectateur

Elle permet de reconnaître le retour d'une même personne :

- spectateur unique
- sessions de visionnage
- re-visionnages
- progression
- dernière position
- reprise de lecture
- historique d'interaction

Une nouvelle session ne doit pas créer artificiellement une nouvelle personne.

## 4 — Mémoire spirituelle personnelle

Espace privé du spectateur :

- carnet du culte
- notes
- timestamps
- passages bibliques
- moments marqués
- décisions personnelles

Cette mémoire est privée par défaut.

## 5 — Mémoire pastorale

Elle relie volontairement l'expérience du culte aux systèmes pastoraux :

- demande de prière
- demande d'accompagnement
- conversation pastorale
- décisions spirituelles nécessitant un suivi

Le contenu privé n'est jamais transmis à l'équipe pastorale sans action
explicite de la personne.

---

# 3. RETOUR SUR UN REPLAY

Un même spectateur peut revenir plusieurs fois.

Exemple :

1 spectateur unique
3 sessions de visionnage
2 re-visionnages

Le système doit proposer :

- Reprendre là où je me suis arrêté
- Recommencer depuis le début

Pour un membre connecté, la progression doit à terme être synchronisée
avec son compte.

Pour un visiteur non connecté, une persistance locale est acceptable
dans la première version.

---

# 4. RÉACTIONS

Deux domaines sont obligatoirement séparés.

## Réactions du direct

- figées
- historiques
- lecture seule après la fin du live

## Réactions du replay

- vivantes
- distinctes
- associées au replay et au spectateur

Règle cible :

une personne ne peut compter qu'une fois par type de réaction
pour un même replay.

Les nouveaux visionnages ne doivent pas multiplier artificiellement
ses réactions.

---

# 5. COMMENTAIRES

Les commentaires du replay sont persistants et modérés.

Le modèle de sécurité doit reprendre les principes du système
de commentaires des enseignements :

- écriture via serveur
- membre authentifié
- rate limiting
- statut pending
- statut published
- statut rejected
- lecture publique uniquement des commentaires published

Les commentaires replay constituent un domaine distinct des
commentaires d'enseignements.

---

# 6. MON CARNET DU CULTE

Le carnet est disponible pendant le LIVE et dans le REPLAY.

Fonctions cibles :

- écrire une note
- enregistrer automatiquement ou manuellement le timestamp vidéo
- marquer un moment
- retrouver ses notes au retour
- cliquer une note pour revenir au moment correspondant
- identifier un passage biblique
- enregistrer une décision personnelle

Le carnet est privé par défaut.

Une note peut volontairement être transformée en :

- demande de prière
- message pastoral

Elle n'est jamais transmise automatiquement.

---

# 7. DÉCISIONS SPIRITUELLES

Décisions possibles notamment :

- Je donne ma vie à Christ
- Je veux revenir à Dieu
- Je veux me faire baptiser
- Je souhaite être accompagné

Ces décisions ne sont pas des commentaires publics.

Elles doivent déboucher sur un prochain pas pastoral contrôlé.

---

# 8. PRIÈRE

LIVE 4C ne crée pas un second système de prière.

Il réutilise le système Citadelle existant.

Le replay peut fournir le contexte de provenance :

- source = replay
- cms_live_id
- titre du culte

Le contenu confidentiel reste soumis aux règles de confidentialité
du Centre de prière.

---

# 9. PASTORAL

LIVE 4C ne crée pas une seconde messagerie pastorale.

Il réutilise les messages, responsables et workflows pastoraux existants.

Depuis un replay, l'utilisateur peut :

- écrire au pasteur / à l'équipe pastorale
- consulter une conversation déjà commencée
- envoyer volontairement une note de son carnet
- suivre une demande existante

Une réouverture du replay ne doit pas créer automatiquement
une nouvelle demande pastorale.

---

# 10. OFFRANDE

LIVE 4C réutilise LiveOffering et l'infrastructure Giving / Chariow.

Une personne peut faire plusieurs offrandes au fil de plusieurs visites.

Chaque transaction reste indépendante.

Le contexte du replay peut être transmis pour attribution analytique,
sans modifier le moteur de paiement.

---

# 11. PROCHAIN PAS

La fin d'un live ou d'un replay ne doit pas être un écran mort.

Le système peut proposer selon le contexte :

- demander une prière
- parler à l'équipe pastorale
- commenter
- faire une offrande
- partager
- revoir un moment marqué
- poursuivre une formation
- entrer dans un parcours lié au message

---

# 12. ORGANISATION AUTOMATIQUE DES REPLAYS

Principe :

LE PROGRAMME EST L'IDENTITÉ.
LE JOUR EST LE CALENDRIER.

Un replay hérite automatiquement du live :

- programme
- plateforme
- série
- saison
- épisode / session
- ordre
- intervenant
- métadonnées éditoriales

Le responsable ne doit pas devoir reclasser manuellement chaque replay
après le direct.

Priorité de résolution :

1. programme explicitement affecté au live
2. programme régulier correspondant
3. série / saison du programme
4. métadonnées ou règles de secours
5. À classer si aucun résultat fiable

Aucune intelligence ne doit inventer silencieusement une catégorie.

---

# 13. FAMILLES ÉDITORIALES INITIALES

## Culte de célébration

Programme principal des cultes de célébration.

## École du Royaume

Peut contenir plusieurs saisons.

Exemple :
Grandir pour gouverner.

## Matinales de prière

Rendez-vous réguliers pouvant être organisés par jour ou saison.

## Vendredis de Puissance

Programme autonome.

Le vendredi est son rythme et non son identité.

## La Chambre Haute — Mahanaïm

Programme autonome rattaché à Mahanaïm.

Le jeudi est son rythme régulier et non son identité.

## Veillées et grands temps de prière

## Formations et programmes spéciaux

## Conférences et événements spéciaux

## À classer

Fallback administratif uniquement.

---

# 14. BIBLIOTHÈQUE REPLAYS

La bibliothèque ne doit pas être une simple grille chronologique.

Navigation cible :

- Tous
- Cultes
- École du Royaume
- Matinales
- Vendredis de Puissance
- La Chambre Haute
- Formations
- Événements

À l'intérieur d'un programme :

- dernier replay
- saisons
- séries
- épisodes / sessions
- archives

Le système pourra afficher :

- épisode précédent
- épisode suivant
- progression dans une saison
- reprendre un replay
- continuer une série

---

# 15. CONFIDENTIALITÉ

COMMUNAUTAIRE :

- réactions
- commentaires approuvés
- témoignages approuvés

PRIVÉ :

- carnet du culte
- décisions personnelles
- progression détaillée personnelle
- demandes confidentielles de prière
- échanges pastoraux

Une donnée privée ne devient jamais communautaire par défaut.

---

# 16. CONVERGENCE TECHNIQUE

À réutiliser :

- cms_lives
- live_programs
- LiveReplayReactionCounts
- infrastructure LIVE 4B
- identité membre / invité existante
- modèle TeachingComments
- système de prière existant
- système de messages pastoraux existant
- LiveOffering
- Giving / Chariow
- infrastructure de partage

À créer uniquement lorsqu'aucun domaine existant ne convient :

- réactions vivantes propres au replay
- commentaires propres au replay
- mémoire de visionnage
- carnet du culte
- métadonnées éditoriales supplémentaires réellement nécessaires

---

# 17. NON-OBJECTIFS

LIVE 4C ne doit pas :

- dupliquer le Centre de prière
- dupliquer la messagerie pastorale
- dupliquer le moteur d'offrande
- modifier les réactions figées du direct
- créer de faux compteurs
- multiplier un spectateur unique à chaque retour
- exposer les notes privées
- auto-classer avec une confiance insuffisante
- casser le moteur canonical YouTube
- remplacer LIVE 4B

---

# 18. ORDRE D'IMPLEMENTATION

Task 2 — Contrat UX + éditorial
Task 3 — Modèle de données minimal
Task 4 — Mémoire spectateur + reprise
Task 5 — Carnet du culte
Task 6 — Réactions replay vivantes
Task 7 — Commentaires replay
Task 8 — Pont prière + pastoral
Task 9 — Offrande + partage + prochain pas
Task 10 — Classement automatique et bibliothèque
Task 11 — Convergence public / membre
Task 12 — Administration / modération
Task 13 — Résilience + sécurité + confidentialité
Task 14 — Production DB
Task 15 — Release application
Task 16 — Acceptance humaine LIVE + REPLAY

---

# 19. RÈGLE FINALE

Une information doit être saisie une seule fois au bon niveau.

Le replay hérite automatiquement du live et du programme.

Une personne qui revient retrouve son parcours.

Citadelle ne doit pas seulement se souvenir de la vidéo.

Citadelle doit se souvenir du chemin parcouru autour de cette vidéo.