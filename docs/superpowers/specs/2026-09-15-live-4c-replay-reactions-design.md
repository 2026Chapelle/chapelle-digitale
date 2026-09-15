# LIVE 4C — Task 6 : Réactions vivantes du replay

Date de validation : 15 septembre 2026
Statut : conception validée
Base Git : `577a4e52e05c071ccb1cf8f115e46741c06db1cf`

## 1. Objectif

Créer une mémoire communautaire persistante pour les replays Citadelle.

Chaque membre ou visiteur peut exprimer une seule réaction active par replay, la remplacer ou la retirer. Les réactions sont partagées entre `/live` et `/member/dashboard/lives`.

Réactions officielles :

- `amen` — Amen
- `receive` — Je reçois
- `glory` — Gloire à Dieu
- `thanks` — Merci Seigneur

Les compteurs commencent à zéro. Aucune réaction locale, simulée ou historique non vérifiable n’est importée.

## 2. Architecture

Le sous-système comprend :

1. un composant partagé `LiveReplayReactions` ;
2. une API serveur de lecture ;
3. une API serveur de mutation ;
4. un résolveur d’identité membre ou visiteur ;
5. une persistance Supabase ;
6. un réglage administratif hiérarchisé.

L’API Next.js est l’autorité. Le navigateur n’écrit jamais directement dans les tables Supabase.

Le replay utilise une clé canonique unique dans tous les espaces d’affichage.

Les réactions locales du direct restent distinctes des réactions persistantes du replay.

## 3. Données

### 3.1 `live_replay_reactions`

Champs requis :

- `id`
- `replay_key`
- `reaction_key`
- `actor_kind`
- `member_id`
- `guest_hash`
- `created_at`
- `updated_at`

Contraintes :

- `reaction_key` appartient à la liste fermée des quatre réactions ;
- `actor_kind` vaut `member` ou `guest` ;
- une ligne appartient soit à un membre, soit à un visiteur ;
- unicité partielle sur `replay_key + member_id` ;
- unicité partielle sur `replay_key + guest_hash`.

Il ne peut donc exister qu’une seule réaction active par personne et par replay.

### 3.2 `live_replay_reaction_settings`

Champs requis :

- `replay_key`
- `enabled`
- `updated_by`
- `updated_at`

L’absence de ligne signifie que les réactions sont actives.

La désactivation masque les réactions et bloque les mutations sans supprimer les données existantes.

Les tables utilisent RLS. Les droits directs publics d’écriture ne sont pas accordés.

## 4. Identité visiteur

Le serveur crée un jeton aléatoire cryptographiquement sûr dans un cookie :

- `HttpOnly`
- `Secure` en production
- `SameSite=Lax`
- persistant

Le jeton brut n’est jamais stocké en base.

Le serveur calcule `guest_hash` avec un secret privé. Aucun fingerprint du navigateur, nom ou courriel n’est collecté.

L’effacement du cookie crée une nouvelle identité visiteur.

## 5. Transfert visiteur vers membre

Après connexion :

- sans réaction membre existante, la réaction visiteur devient celle du membre ;
- avec une réaction membre existante, celle du membre prévaut ;
- la ligne visiteur devenue redondante est supprimée ;
- le transfert est atomique ;
- aucun double comptage temporaire ou permanent n’est autorisé.

## 6. API

### 6.1 Lecture

`GET /api/live/replay/reactions?replayKey=...`

La réponse contient :

- `enabled`
- `selectedReaction`
- les quatre compteurs, y compris ceux égaux à zéro.

La lecture peut créer l’identité visiteur ou effectuer le transfert après connexion.

### 6.2 Ajouter ou remplacer

`PUT /api/live/replay/reactions`

Corps :

- `replayKey`
- `reaction`

L’opération est idempotente. Choisir une autre réaction remplace la précédente.

### 6.3 Retirer

`DELETE /api/live/replay/reactions`

Corps :

- `replayKey`

### 6.4 Administration

Une route séparée modifie `enabled` après vérification du rôle et du périmètre administratif.

Codes attendus :

- `400` : données invalides ;
- `401` : identité impossible à établir ;
- `403` : origine, désactivation ou périmètre refusé ;
- `404` : replay inexistant ;
- `429` : limitation de fréquence ;
- `500` : erreur interne.

## 7. Sécurité

Chaque mutation applique :

- validation de l’origine publique ;
- validation stricte du replay ;
- liste fermée des réactions ;
- vérification de l’état activé ;
- unicité garantie par la base ;
- limitation par identité et réseau ;
- absence de secret privilégié dans le navigateur ;
- journalisation sans jeton visiteur brut.

Les autorisations ne reposent jamais uniquement sur l’interface.

## 8. Expérience utilisateur

Le composant apparaît juste sous le lecteur.

Invitation :

> Ce message t’a touché ? Réagis avec la communauté.

Disposition :

- quatre colonnes sur écran large ;
- grille de deux colonnes sur mobile ;
- compteur sous chaque réaction ;
- aucun total général.

Comportement :

- mise à jour optimiste immédiate ;
- clic sur la réaction active : retrait ;
- clic sur une autre : remplacement ;
- seule la dernière intention compte lors de clics rapides ;
- échec : retour au dernier état confirmé ;
- message : « Ta réaction n’a pas pu être enregistrée. Réessaie. »

Le composant utilise `aria-pressed` et reste utilisable au clavier.

Une panne du sous-système ne bloque jamais la vidéo, les notes ou la progression.

## 9. Synchronisation

Les compteurs sont resynchronisés toutes les 15 secondes lorsque l’onglet est visible.

La synchronisation :

- s’arrête lorsque l’onglet est masqué ;
- reprend immédiatement au retour ;
- s’arrête lorsque le composant est démonté.

Cette version n’utilise pas Supabase Realtime.

## 10. Administration hiérarchisée

Droits :

- super-admin : tous les replays ;
- administration internationale : tous les replays ;
- administration nationale : replays de son pays ;
- administration locale : replays de son assemblée ou périmètre.

Un replay global ou sans rattachement territorial est administrable uniquement aux niveaux international et super-admin.

L’administration peut activer ou désactiver les réactions. Elle ne peut ni modifier les compteurs ni altérer les réactions individuelles.

## 11. Tests obligatoires

Les tests couvrent :

- première réaction ;
- remplacement ;
- retrait ;
- idempotence ;
- réactions inconnues ;
- unicité membre ;
- unicité visiteur ;
- transfert sans doublon ;
- priorité à la réaction membre ;
- compteurs complets avec zéros ;
- origine interdite ;
- replay inexistant ;
- réactions désactivées ;
- périmètres administratifs ;
- limitation de fréquence ;
- mise à jour optimiste ;
- retour arrière sur échec ;
- dernière intention lors de clics rapides ;
- synchronisation conditionnée par la visibilité ;
- partage entre pages publique et membre ;
- accessibilité ;
- absence d’impact sur les autres fonctions LIVE.

## 12. Déploiement progressif

Ordre obligatoire :

1. implémentation et migration locales ;
2. tests automatisés, TypeScript, lint et build ;
3. commit contrôlé ;
4. aucune base distante sans autorisation séparée ;
5. migration sur une base contrôlée autorisée ;
6. test visiteur ;
7. test du transfert après connexion ;
8. test membre ;
9. test des périmètres administratifs ;
10. préparation distincte de la production.

## 13. Critères d’acceptation

La Task 6 est acceptable lorsque :

- les quatre compteurs commencent à zéro ;
- une personne possède au maximum une réaction par replay ;
- elle peut la remplacer ou la retirer ;
- les visiteurs et membres sont pris en charge ;
- le transfert ne crée aucun doublon ;
- les deux espaces partagent la même mémoire ;
- l’administration respecte les périmètres validés ;
- les erreurs restent discrètes et isolées ;
- aucune panne ne casse l’expérience LIVE.