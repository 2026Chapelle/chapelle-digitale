# CITADELLE — LIVE 4C
## LE REPLAY VIVANT — Minimal Data Model

Status: FROZEN FOR IMPLEMENTATION

## 1. Principe

LIVE 4C étend l'existant sans créer de systèmes parallèles.
Le direct figé et la vie du replay restent deux domaines distincts.

## 2. Architecture éditoriale existante

live_programs reste la définition permanente d'un programme.
cms_lives reste l'occurrence réelle : programmé, live, terminé puis replay.
cms_lives.program_id reste la relation canonique vers live_programs.
Aucune table replay_programs et aucune table replays ne seront créées.

## 3. Extensions de live_programs

- program_kind : celebration | teaching | prayer | formation | event | other
- platform_slug : nullable, par exemple mahanaim

Le programme reste l'identité éditoriale.
Le jour et l'heure restent des informations de calendrier.

## 4. Nouvelle table live_program_seasons

But : organiser un programme en saisons.

Champs cibles :
- id
- program_id
- season_number
- slug
- title
- description
- image_url
- status
- sort_order
- created_at
- updated_at

Contrainte principale : unique(program_id, season_number).

## 5. Extensions de cms_lives

- season_id : nullable
- episode_number : nullable

Une occurrence sans saison ou numéro reste valide.

## 6. Nouvelle table live_replay_progress

Une ligne par cms_live_id + actor_key.

Elle porte :
- progression de lecture
- dernière position
- durée
- pourcentage
- nombre de visionnages qualifiés
- première lecture
- dernière lecture
- statut de complétion

Un même spectateur peut avoir plusieurs sessions sans devenir plusieurs personnes.

actor_key est résolu côté serveur :
- member:<user-id>
- guest:<hash-persistant>

Le client ne fournit jamais arbitrairement actor_key.

## 7. Nouvelle table live_replay_reactions

Les réactions replay ne modifient jamais les réactions figées du direct.

Clé logique :
cms_live_id + actor_key + reaction

Réactions cibles :
- prayer
- fire
- heart
- praise
- kingdom

Une personne compte au maximum une fois par type de réaction et par replay.

## 8. Nouvelle table live_replay_comments

Les commentaires replay sont distincts de teaching_comments.

Ils reprennent toutefois son modèle de sécurité :
- membre authentifié
- API serveur
- rate limiting
- pending
- published
- rejected
- modération
- lecture publique uniquement si published

## 9. Nouvelle table live_cult_notes

Cette table porte Mon Carnet du Culte.

Champs cibles :
- id
- cms_live_id
- user_id
- kind
- body
- position_seconds
- scripture_reference
- created_at
- updated_at

Les notes sont privées.
L'invité conserve ses notes localement dans la première version.

## 10. Décisions spirituelles

Les décisions spirituelles sont des données pastorales sensibles.
Aucune nouvelle table live_spiritual_decisions n'est autorisée dans ce modèle minimal.
Le pont exact sera défini avec les systèmes pastoraux existants.

## 11. Systèmes réutilisés

Prière : réutiliser priere_demandes.
Pastoral : réutiliser messages.
Offrande : réutiliser LiveOffering, GivingButton, dons et Chariow.
Partage : réutiliser /api/live/share.

Aucune table live_prayers, replay_prayers, replay_messages ou replay_giving.

## 12. Mémoire du direct

Les structures LIVE 4B restent immuables après finalisation.
Les réactions post-replay ne sont jamais écrites dans les statistiques du direct.

## 13. Tables nouvelles autorisées

LIVE 4C V1 autorise exactement cinq nouvelles tables :

1. live_program_seasons
2. live_replay_progress
3. live_replay_reactions
4. live_replay_comments
5. live_cult_notes

Toute table supplémentaire exige une nouvelle décision architecturale.

## 14. Extensions autorisées

live_programs :
- program_kind
- platform_slug

cms_lives :
- season_id
- episode_number

Toutes les extensions sont additives et backward-compatible.

## 15. Exemple Mahanaïm

Programme : La Chambre Haute — Mahanaïm
program_kind : prayer
platform_slug : mahanaim

Le jeudi est son rythme régulier et non son identité.
Une diffusion exceptionnelle un mardi reste classée dans La Chambre Haute — Mahanaïm.

## 16. Exemple École du Royaume

Programme : École du Royaume
Saison : Grandir pour gouverner
Occurrences : Session 1, Session 2, Session 3...

La bibliothèque peut proposer épisode précédent, épisode suivant et progression de saison.

## 17. Règle finale

La donnée appartient au domaine qui la comprend.
Le programme comprend l'identité éditoriale.
Le replay comprend la progression.
Le replay vivant comprend ses nouvelles réactions.
Le commentaire comprend sa modération.
Le carnet appartient à la personne.
La prière appartient au Centre de prière.
Le message pastoral appartient à la messagerie pastorale.
L'offrande appartient au système Giving.

Aucune duplication n'est autorisée.
