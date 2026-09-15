# LIVE 4C — Task 6 : Réactions vivantes du replay

Date de validation : 15 septembre 2026
Statut : conception validée et alignée sur le dépôt
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

Le replay utilise son `cms_live_id` comme identité canonique unique dans tous les espaces d’affichage.

Les réactions locales du direct restent distinctes des réactions persistantes du replay.

## 3. Données

L’implémentation réutilise la table `public.live_replay_reactions` déjà créée par la migration LIVE 4C `20260913160000_live4c_replay_vivant_foundation.sql`.

La migration historique ne sera pas modifiée. Une migration additive et corrective séparée alignera son contrat avec la présente spécification.

### 3.1 `live_replay_reactions`

Champs conservés :

- `cms_live_id`
- `actor_key`
- `user_id`
- `reaction`
- `created_at`
- `updated_at`

`cms_live_id` référence `public.cms_lives(id)` et constitue l’identité canonique du replay.

`actor_key` conserve le format existant :

- `member:<uuid>` pour un membre ;
- `guest:<empreinte-hexadécimale>` pour un visiteur.

`user_id` est renseigné pour un membre et reste nul pour un visiteur.

Réactions autorisées :

- `amen`
- `receive`
- `glory`
- `thanks`

La clé primaire devient `(cms_live_id, actor_key)`. Elle garantit une seule réaction active par personne et par replay.

Le changement de réaction met à jour la ligne existante. Le retrait supprime cette ligne.

Avant toute application de la migration corrective sur une base distante, un préflight vérifie que cette table ne contient aucune réaction. Si des données existent, la migration s’arrête sans suppression automatique et exige une décision explicite. Aucun compteur historique n’est inventé ou converti.

Les tables et fonctions des réactions du direct LIVE 4B ne sont jamais modifiées.

### 3.2 Rattachement territorial de `cms_lives`

`public.cms_lives` reçoit deux colonnes optionnelles :

- `organization_id`
- `organization_unit_id`

Elles sont soit toutes les deux nulles, soit toutes les deux renseignées.

Le couple référence la hiérarchie existante `public.organization_units(organization_id, id)`.

Un replay sans unité est global. Un replay rattaché hérite du périmètre réel de son unité : mondial, continental, national ou local.

Aucune nouvelle table de pays, d’assemblées ou de rôles n’est créée.

### 3.3 `live_replay_reaction_settings`

Champs requis :

- `cms_live_id`
- `enabled`
- `updated_by`
- `updated_at`

`cms_live_id` est la clé primaire et référence `public.cms_lives(id)`.

L’absence de ligne signifie que les réactions sont actives.

La désactivation masque les réactions et bloque les mutations sans supprimer les données existantes.

`updated_by` conserve l’administrateur ayant effectué le dernier changement.

Toutes les tables concernées utilisent RLS. Les rôles `anon` et `authenticated` ne reçoivent aucun droit direct d’écriture. Le serveur utilise exclusivement les accès privilégiés déjà réservés aux routes internes.

## 4. Identité visiteur

Le serveur crée un jeton aléatoire cryptographiquement sûr dans un cookie :

- `HttpOnly`
- `Secure` en production
- `SameSite=Lax`
- persistant

Le jeton brut n’est jamais stocké en base.

Le serveur calcule l’empreinte visiteur avec un secret privé. Aucun fingerprint du navigateur, nom ou courriel n’est collecté.

L’effacement du cookie crée une nouvelle identité visiteur.

## 5. Transfert visiteur vers membre

Après connexion :

- sans réaction membre existante, la réaction visiteur devient celle du membre ;
- avec une réaction membre existante, celle du membre prévaut ;
- la ligne visiteur devenue redondante est supprimée ;
- le transfert est atomique ;
- aucun double comptage temporaire ou permanent n’est autorisé.

## 6. API

Les nouvelles routes utilisent `cmsLiveId`, déjà employé par le lecteur, le Carnet du Culte et la progression du replay.

### 6.1 Lecture

`GET /api/live/replay/reactions?cmsLiveId=...`

La réponse contient :

- `enabled`
- `selectedReaction`
- les quatre compteurs, y compris ceux égaux à zéro.

La lecture peut créer l’identité visiteur ou effectuer le transfert après connexion.

L’ancienne route en lecture seule `/api/live/reactions/replay`, consacrée à la mémoire figée du direct LIVE 4B, reste intacte et séparée.

### 6.2 Ajouter ou remplacer

`PUT /api/live/replay/reactions`

Corps :

- `cmsLiveId`
- `reaction`

L’opération est idempotente. Choisir une autre réaction met à jour la ligne existante.

### 6.3 Retirer

`DELETE /api/live/replay/reactions`

Corps :

- `cmsLiveId`

### 6.4 Administration

`PATCH /api/admin/live/replay/reactions`

Corps :

- `cmsLiveId`
- `enabled`

La route vérifie l’identité réelle de l’administrateur, son rôle ERP et son accès à l’unité du replay.

Codes attendus :

- `400` : données invalides ;
- `401` : identité impossible à établir ;
- `403` : origine, désactivation ou autorisation refusée ;
- `404` : replay inexistant ou situé hors du périmètre visible ;
- `429` : limitation de fréquence ;
- `500` ou `503` : erreur interne ou dépendance indisponible.

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

L’autorisation réutilise exclusivement la hiérarchie ERP existante :

- `organization_units`
- `organization_unit_members`
- `resolveAdminActorProfile()`
- `resolveActorUnitContext()`
- `assertUnitAccess()`

Droits :

- `world_super_admin` : tous les replays ;
- `world_admin` : tous les replays ;
- `zone_admin` : replays de sa zone et de ses descendants ;
- `national_admin` : replays de son unité nationale et de ses descendants ;
- `local_admin` : replays de son église locale uniquement.

Un replay global, dont `organization_id` et `organization_unit_id` sont nuls, est administrable uniquement par `world_super_admin` ou `world_admin`.

Un replay rattaché est administrable uniquement lorsque l’unité appartient au périmètre réel de l’acteur.

Le serveur retourne une réponse `404` uniforme pour un replay situé hors périmètre afin de ne pas révéler son existence.

L’administration peut activer ou désactiver les réactions. Elle ne peut ni modifier les compteurs ni altérer les réactions individuelles.

Le formulaire existant de gestion des lives expose le rattachement d’un replay à une unité autorisée et l’état des réactions. Le contrôle serveur reste l’autorité, même si l’interface est contournée.

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
