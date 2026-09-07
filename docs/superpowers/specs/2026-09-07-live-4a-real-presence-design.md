# CITADELLE — LIVE 4A — Présence réelle

Date : 2026-09-07
Statut : design validé en conversation, spécification écrite à relire avant implémentation.

## 1. Vision

YouTube transporte le culte. Citadelle porte l'expérience d'Église et accompagne la personne.

LIVE 4A introduit la première présence humaine réellement mesurée dans Citadelle Live.

L'objectif n'est pas de créer un réseau social ni un chat. L'objectif est qu'une personne qui regarde le culte puisse rejoindre l'assemblée numérique et que Citadelle puisse dire honnêtement combien de personnes sont réellement présentes.

## 2. Contrat fonctionnel

Pendant un vrai direct :

- un membre connecté peut cliquer « Je suis là » ;
- un visiteur non connecté peut également cliquer « Je suis là » ;
- une même personne technique n'est comptée qu'une fois par Live ;
- la présence reste active uniquement tant que le navigateur continue d'envoyer un heartbeat ;
- une présence expirée sort automatiquement du compteur ;
- aucun chiffre fictif n'est généré ;
- aucune identité individuelle n'est exposée publiquement ;
- l'admin et le super admin voient uniquement des agrégats dans LIVE 4A ;
- le Live Citadelle peut être partagé depuis /live ;
- le lien partagé est celui de Citadelle, jamais le lien YouTube direct.

Hors Live, l'expérience LIVE 3 actuelle reste inchangée.

## 3. Source de vérité Live

/api/live/canonical reste la seule source de vérité pour déterminer si le culte est réellement en cours.

Les opérations de présence et de partage ne font jamais confiance à un live_key fourni par le navigateur.

Chaque route serveur résout elle-même le Live canonical actif.

Une opération d'écriture est autorisée uniquement si :

status = LIVE

Le Live doit également posséder un identifiant YouTube stable.

Le serveur normalise alors :

live_key = youtube:<video-id>

Si le canonical est OFFLINE, UPCOMING, indisponible ou ne contient pas d'identifiant Live stable, les écritures de présence sont refusées proprement.

## 4. Identité membre

Pour un membre authentifié :

- le serveur lit l'utilisateur depuis la session Supabase ;
- aucun user_id provenant du navigateur n'est accepté comme autorité ;
- la présence est associée au user_id réel ;
- un même user_id ne peut avoir qu'une présence par live_key.

Deux onglets ouverts par le même membre ne doivent donc pas créer deux personnes.

## 5. Identité visiteur anonyme

Pour un visiteur :

- le navigateur génère un UUID aléatoire ;
- cet UUID est conservé dans localStorage ;
- aucune IP n'est utilisée comme identité ;
- aucun fingerprint navigateur n'est créé ;
- aucun nom ni email n'est demandé ;
- le UUID brut n'est pas conservé dans la base.

Le serveur calcule :

SHA-256(guest_session_id)

et conserve uniquement le hash.

Une même session anonyme ne peut avoir qu'une présence par live_key.

Deux appareils anonymes distincts restent volontairement deux présences. LIVE 4A ne tente pas d'identifier une même personne physique entre plusieurs appareils.

## 6. Modèle de données — présence

Table proposée :

live_presence_sessions

Colonnes minimales :

- id uuid primary key
- live_key text not null
- participant_kind text not null
- user_id uuid nullable
- guest_session_hash text nullable
- joined_at timestamptz not null
- last_seen_at timestamptz not null
- created_at timestamptz not null

participant_kind accepte uniquement :

- member
- guest

Contraintes :

- member => user_id obligatoire et guest_session_hash null ;
- guest => guest_session_hash obligatoire et user_id null ;
- unicité partielle sur live_key + user_id pour les membres ;
- unicité partielle sur live_key + guest_session_hash pour les visiteurs.

Les lignes expirées ne sont pas supprimées immédiatement afin de conserver le nombre réel de personnes ayant rejoint le culte.

## 7. Présence active

Heartbeat client :

30 secondes environ.

Expiration :

90 secondes après le dernier heartbeat valide.

Une présence est considérée active lorsque :

last_seen_at >= now() - 90 secondes

Le compteur « présents maintenant » ne dépend donc pas d'un événement de fermeture de navigateur.

LIVE 4A ne rend pas un événement leave obligatoire, car la fermeture d'un onglet n'est pas fiable et plusieurs onglets peuvent appartenir à la même présence.

Le heartbeat est l'autorité.

Lorsque la page redevient visible, un heartbeat immédiat est envoyé.

## 8. Sémantique des compteurs

Citadelle distingue impérativement :

### Présents maintenant

Nombre de présences dont last_seen_at est encore valide.

### Ont rejoint le culte

Nombre de présences uniques créées pour le live_key depuis le début du Live.

Ces deux nombres ne doivent jamais être confondus.

Exemple :

50 personnes ont rejoint le culte.
27 personnes sont encore présentes maintenant.

## 9. Interface publique — avant participation

Uniquement pendant status = LIVE :

FAMILLE ROYALE
CULTE EN COURS

Je rejoins l'assemblée.

[ Je suis là ]

La Famille Royale est rassemblée en ce moment.

[ Partager le direct ]

Le compteur peut être masqué tant qu'il vaut zéro.

Aucun faux chiffre de démarrage n'est autorisé.

## 10. Interface publique — après participation

Après confirmation serveur :

TU ES AVEC NOUS

[compteur réel] personnes sont présentes

Tu fais partie de l'assemblée rassemblée en ce moment.

[ Partager le direct ]

Le texte « présence enregistrée » est évité dans l'interface principale afin de conserver une expérience humaine et pastorale.

## 11. Défaillance de présence

Si join échoue :

- ne pas considérer localement la personne comme présente ;
- ne pas incrémenter artificiellement le compteur ;
- afficher une erreur discrète avec possibilité de réessayer.

Si le compteur ne peut plus être récupéré :

- conserver le culte ;
- masquer temporairement le chiffre ;
- ne jamais inventer une valeur de secours.

La vidéo et le culte doivent continuer à fonctionner même si le service de présence est momentanément indisponible.

## 12. API de présence

Contrat proposé :

POST /api/live/presence/join

Responsabilités :

- résoudre le canonical ;
- exiger status LIVE ;
- dériver live_key côté serveur ;
- résoudre membre ou visiteur ;
- créer ou réactiver la présence ;
- retourner joined=true et les agrégats publics.

POST /api/live/presence/heartbeat

Responsabilités :

- résoudre le canonical ;
- retrouver la présence ;
- mettre à jour last_seen_at ;
- ne jamais créer une deuxième présence pour le même participant.

GET /api/live/presence

Responsabilités :

- résoudre le Live courant ;
- retourner uniquement les données publiques agrégées ;
- ne retourner aucun nom, email, user_id ou guest hash.

LIVE 4A n'exige pas de route leave comme source d'autorité.

## 13. Polling public

Le compteur public est actualisé périodiquement.

Cible :

15 secondes environ.

Le polling peut être suspendu lorsque la page n'est pas visible et repris immédiatement au retour.

Supabase Realtime n'est pas obligatoire pour LIVE 4A.

Realtime sera réservé aux fonctions où sa valeur est forte :

- réactions ;
- chat ;
- événements communautaires instantanés.

Cette décision réduit la complexité du premier socle de présence.

## 14. Partage du Live

Le bouton partage toujours :

https://citadelle.chapelleduroyaume.org/live

Sur navigateur compatible :

navigator.share()

Sinon :

copie du lien dans le presse-papiers.

Message proposé :

« Nous sommes en direct sur Citadelle. Rejoins-nous maintenant pour vivre le culte avec la Famille Royale. »

Le partage ne redirige jamais directement vers YouTube.

## 15. Mesure du partage

Citadelle ne prétend pas savoir qu'une autre personne a effectivement reçu ou ouvert le partage.

L'admin voit uniquement :

actions de partage

Une action est enregistrée lorsque :

- navigator.share se termine avec succès selon le navigateur ;
- ou la copie du lien réussit.

Le terme « personnes ayant partagé » n'est pas utilisé.

## 16. Modèle de données — partage

Table proposée :

live_share_actions

Colonnes minimales :

- id uuid primary key
- live_key text not null
- participant_kind text not null
- user_id uuid nullable
- guest_session_hash text nullable
- action_kind text not null
- created_at timestamptz not null

action_kind accepte :

- native_share
- copy_link

Le même modèle d'identité membre/visiteur que la présence est réutilisé.

Plusieurs actions d'un même participant sont autorisées, car il s'agit d'actions et non d'un compteur de personnes.

## 17. API de partage

POST /api/live/share

Responsabilités :

- résoudre le canonical ;
- accepter uniquement un vrai LIVE ;
- dériver live_key côté serveur ;
- résoudre le participant ;
- accepter uniquement native_share ou copy_link ;
- enregistrer une action uniquement après succès côté navigateur ;
- ne retourner aucune identité publique.

## 18. Admin LIVE 4A

/admin/live devient le premier tableau de supervision de l'assemblée numérique.

Pendant un Live, l'admin peut voir :

- statut canonical ;
- présents maintenant ;
- membres présents maintenant ;
- visiteurs présents maintenant ;
- personnes uniques ayant rejoint le culte ;
- actions de partage.

Exemple :

ASSEMBLÉE EN LIGNE

31 présents maintenant
22 membres
9 visiteurs

38 ont rejoint depuis le début
7 actions de partage

## 19. Super admin

LIVE 4A ne crée pas encore une nouvelle matrice complète de réglages.

Le super admin dispose au minimum de la même vue agrégée que l'admin.

Les permissions existantes du projet sont réutilisées.

Aucun nouveau système de rôles parallèle ne doit être créé dans LIVE 4A.

Les contrôles globaux pour réactions, chat et modération appartiendront aux lots suivants.

## 20. Confidentialité

LIVE 4A interdit explicitement :

- liste publique des présents ;
- prénom public automatique ;
- avatar public automatique ;
- IP comme identifiant ;
- fingerprint navigateur ;
- faux pays ;
- fausse localisation ;
- faux compteur ;
- faux participant ;
- faux partage.

L'admin de LIVE 4A reçoit uniquement des agrégats.

Les identités nominatives éventuelles feront l'objet d'un contrat de permission séparé dans un lot ultérieur.

## 21. Accès base de données

Le navigateur ne reçoit pas de droit direct permettant de lire toutes les lignes de présence.

Les mutations passent par les routes serveur Citadelle.

Les routes utilisent le mécanisme serveur Supabase déjà adopté par le dépôt.

La migration doit appliquer les politiques de sécurité cohérentes avec cette architecture.

Aucune clé privilégiée ne doit être exposée au navigateur.

## 22. Transition membre / visiteur

Le guest_session_id peut être envoyé même lorsqu'une session membre existe.

L'identité membre reste prioritaire.

Si une personne devient membre authentifié au milieu d'un Live, l'implémentation doit éviter de maintenir simultanément une présence guest active et une présence member active pour le même navigateur.

Le plan d'implémentation devra traiter ce cas dans la logique serveur et dans les tests.

## 23. Hors Live

Quand canonical retourne OFFLINE :

- aucun bouton Je suis là ;
- aucun heartbeat ;
- aucun compteur de présence Live ;
- aucun enregistrement de partage Live ;
- l'expérience LIVE 3 reste intacte.

Quand canonical retourne UPCOMING :

- pas encore de présence active LIVE 4A ;
- l'expérience de préparation peut rester celle existante.

## 24. Non-objectifs de LIVE 4A

Ne font pas partie de ce lot :

- chat Famille Royale ;
- réactions Amen / Je reçois / Je prie ;
- affichage des noms ;
- avatars ;
- liste des participants ;
- modération de messages ;
- demandes de prière temps réel ;
- liturgie numérique « Maintenant dans le culte » ;
- géolocalisation ;
- cartographie ;
- notifications push ;
- remplacement du moteur canonical ;
- remplacement du moteur YouTube.

## 25. Compatibilité avec LIVE 3

Les invariants suivants doivent rester intacts :

- /api/live/canonical ;
- moteur YouTube existant ;
- BFCache fix ;
- état OFFLINE actuel ;
- agenda /evenements ;
- Famille Royale hors direct ;
- alignement container-royal ;
- page membre Live existante sauf évolution explicitement planifiée ultérieurement.

## 26. Audit obligatoire avant migration

LIVE 4A.0 doit confirmer dans le dépôt :

1. le champ exact contenant l'identifiant YouTube stable dans le canonical ;
2. le helper Supabase serveur utilisé par les routes API ;
3. le mécanisme d'authentification membre côté serveur ;
4. le mécanisme actuel de contrôle admin et super admin ;
5. la structure actuelle de /admin/live ;
6. les conventions de migrations Supabase du dépôt ;
7. les tests existants pertinents ;
8. l'absence d'un ancien système de présence qui ferait doublon.

Si une de ces hypothèses diffère du dépôt réel, le plan doit s'adapter au mécanisme existant sans affaiblir les invariants de cette spécification.

## 27. Découpage

LIVE 4A.0 — Audit technique

LIVE 4A.1 — Migration et modèle de présence

LIVE 4A.2 — API join / heartbeat / count

LIVE 4A.3 — Famille Royale « Je suis là »

LIVE 4A.4 — Partage du Live

LIVE 4A.5 — Supervision /admin/live

LIVE 4A.6 — Recette locale et sécurité

LIVE 4A.7 — Déploiement et preuve réelle YouTube

## 28. Tests indispensables

Les tests doivent couvrir au minimum :

- canonical OFFLINE refuse join ;
- canonical UPCOMING refuse join ;
- canonical LIVE autorise join ;
- visiteur anonyme rejoint ;
- membre connecté rejoint ;
- double clic ne double pas la présence ;
- deux onglets du même membre ne comptent pas deux personnes ;
- deux onglets avec le même guest ID ne comptent pas deux personnes ;
- heartbeat met à jour last_seen_at ;
- expiration retire la présence du compteur actif ;
- ligne expirée reste dans le total « ont rejoint » ;
- aucun user_id n'est accepté comme autorité depuis le client ;
- aucune identité n'est retournée dans l'API publique ;
- compteur public = données réelles ;
- admin agrège membres et visiteurs ;
- route admin refuse un utilisateur non autorisé ;
- native_share enregistré uniquement après succès ;
- copy_link enregistré uniquement après succès ;
- aucun partage enregistré OFFLINE ;
- aucune régression LIVE 3.

## 29. Preuve production finale

LIVE 4A n'est accepté en production qu'après une preuve avec un vrai direct YouTube Chapelle Royale TV :

YouTube OFFLINE
→ canonical OFFLINE
→ Citadelle OFFLINE

Démarrage réel YouTube
→ canonical LIVE
→ lecteur Live
→ bouton Je suis là
→ présence réelle
→ compteur réel
→ présence visible dans admin
→ partage Citadelle

Arrêt YouTube
→ canonical OFFLINE
→ arrêt heartbeat
→ disparition de l'expérience de présence
→ retour à la continuité LIVE 3.

## 30. Principe final

Le fidèle participe librement.

L'admin supervise l'expérience.

Le super admin gouverne les règles.

Citadelle ne simule jamais une assemblée : elle mesure uniquement les personnes réellement présentes.