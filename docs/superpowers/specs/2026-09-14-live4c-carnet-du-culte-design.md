# LIVE 4C — Mon Carnet du Culte

Date : 2026-09-14
Statut : DESIGN VALIDÉ
Projet : CITADELLE — LIVE 4C / Replay Vivant

## 1. Objectif

Mon Carnet du Culte est l’espace spirituel privé associé à un direct ou à un replay Citadelle.

Il permet de conserver ce qu’une personne reçoit pendant l’écoute sans transformer automatiquement ses écrits en contenu communautaire, en demande de prière ou en message pastoral.

Le Carnet appartient à son auteur.

## 2. Invariants de confidentialité

- privé par défaut ;
- aucune publication automatique ;
- aucune transmission automatique à un pasteur ;
- aucune transformation automatique en demande de prière ;
- aucun accès administratif générique aux carnets privés ;
- toute future transmission pastorale exige une action explicite de l’utilisateur ;
- aucune nouvelle table parallèle.

CARNET_PRIVATE_BY_DEFAULT = YES
ADMIN_AUTO_ACCESS = NO
PASTOR_AUTO_ACCESS = NO
PRAYER_AUTO_SHARE = NO
PUBLIC_AUTO_SHARE = NO
NEW_PARALLEL_NOTE_TABLE = NO

## 3. Périmètre V1

La V1 permet :
1. écrire une note privée ;
2. capturer automatiquement la position courante du replay ;
3. ajouter facultativement un type et une référence biblique ;
4. retrouver les notes liées au replay ;
5. cliquer sur un timestamp pour revenir à cet instant ;
6. modifier sa propre note ;
7. supprimer sa propre note.

Hors périmètre V1 :
- partage public ;
- lecture admin/pastorale ;
- conversion automatique vers prière ou messagerie ;
- IA sur les notes ;
- export PDF ;
- recherche globale multi-carnets ;
- import automatique guest vers membre.

## 4. Fondation de données

Table canonique existante : `public.live_cult_notes`

Colonnes :
- `id`
- `cms_live_id`
- `user_id`
- `kind`
- `body`
- `position_seconds`
- `scripture_reference`
- `created_at`
- `updated_at`

La migration LIVE 4C n’est pas encore appliquée au runtime.

Confidentialité DB :
- RLS activée ;
- accès direct anon/authenticated révoqué ;
- persistance serveur via service role après identité/propriété établies.

## 5. Types de note

La contrainte actuelle doit être harmonisée avant première application.

Valeurs V1 :
- `note` → Note
- `received_word` → Parole reçue
- `scripture` → Verset
- `decision` → Décision
- `meditation` → À méditer

## 6. Modèle visiteur

Stockage localStorage uniquement.
Aucune écriture serveur.
Aucune synchronisation multi-appareil.
Message UI : « Enregistré uniquement sur cet appareil. »

Namespace conceptuel : `guest:<cmsLiveId>`

## 7. Modèle membre

- écriture locale immédiate ;
- synchronisation serveur asynchrone ;
- identité dérivée côté serveur ;
- le client ne choisit jamais `user_id` ;
- synchronisation uniquement vers `live_cult_notes`.

Namespace local conceptuel : `member:<memberId>:<cmsLiveId>`

Aucune migration silencieuse guest → membre en V1.

## 8. Contrat de note

Champs conceptuels :
- id
- cmsLiveId
- ownerScope
- kind
- body
- positionSeconds
- scriptureReference
- createdAt
- updatedAt

Contraintes :
- body obligatoire, trim, 1 à 10 000 caractères ;
- position facultative, jamais négative ;
- scriptureReference facultative, maximum 200 caractères ;
- ordre V1 : `created_at ASC`.

## 9. Contrat avec LiveReplayPlayer

Le Carnet ne crée jamais un second lecteur.

`LiveReplayPlayer` expose :
`getCurrentPosition()`
`seekTo(seconds)`

Réutilisation :
- YouTube : `playerRef`, `getCurrentTime()`, `seekTo()` et `positionRef` ;
- HTML5 : `videoRef.current.currentTime` et `positionRef`.

## 10. Capture et retour timestamp

La position courante est capturée sans interrompre la lecture.
Le timestamp est cliquable et appelle `seekTo(position_seconds)`.

## 11. Interface

Action : `Mon Carnet`

Desktop : panneau latéral.
Mobile : tiroir / bottom sheet.

Formulaire :
- type ;
- corps ;
- référence biblique facultative ;
- timestamp capturé ;
- Enregistrer.

## 12. API privée membre

Endpoint : `/api/live/replay/notes`

Méthodes :
- GET
- POST
- PATCH
- DELETE

Sécurité :
- identité serveur ;
- UUID strict ;
- champs autorisés stricts ;
- contrôle de propriété ;
- same-origin mutations ;
- Content-Type JSON ;
- aucun `user_id` accepté du navigateur ;
- aucune fuite de données privées.

## 13. Résilience

Visiteur : local-first autonome.

Membre :
- note locale jamais effacée par une indisponibilité serveur ;
- échec de synchronisation discret ;
- le lecteur ne casse jamais à cause du Carnet ;
- retry simple sans duplication.

## 14. Convergence

Le Carnet ne remplace pas :
- `live_replay_progress` ;
- `live_replay_reactions` ;
- `live_replay_comments` ;
- les demandes de prière ;
- la messagerie pastorale.

Toute future action pastorale reste explicite.

## 15. Tests requis

TDD obligatoire.

Couvrir :
- domaine ;
- local-first ;
- isolation guest/member ;
- API propriétaire ;
- interdictions sur note tierce ;
- capture timestamp YouTube/HTML5 ;
- seek YouTube/HTML5 ;
- UI création/modification/suppression ;
- erreur sync non destructive.

## 16. QA

QA visiteur sans DB :
créer, fermer/réouvrir, retrouver, seek, modifier, supprimer.

QA membre serveur :
différée jusqu’au gate DB explicite et à un environnement serveur contrôlé.

## 17. Ordre d’implémentation

Task 5C — domaine + local-first
Task 5D — API privée membre + serveur
Task 5E — pont timestamp LiveReplayPlayer
Task 5F — interface Carnet
Task 5G — QA visiteur local-first
Task 5H — QA membre serveur après gate DB

La contrainte `kind` doit être corrigée avant toute première application de la migration LIVE 4C.

## 18. Critères de sortie

Pas de PASS global avant validation runtime de la synchronisation membre.

TASK5_LOCAL_IMPLEMENTATION = COMPLETE
TASK5_GUEST_HUMAN_QA = PASS
TASK5_MEMBER_SERVER_SYNC = DEFERRED
