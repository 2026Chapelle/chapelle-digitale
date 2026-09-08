# CITADELLE LIVE 4B — Shared Real-Time Reactions Design

Date : 2026-09-08. Statut : proposition architecturale issue de l'audit Phase 0 ; aucune implémentation autorisée par ce document.

## 1. Goal

« YouTube transporte le culte. Citadelle porte l'expérience d'Église. »

Permettre aux membres et visiteurs d'envoyer cinq réactions pendant le direct canonique, de voir les réactions réellement acceptées d'autres navigateurs et de retrouver les compteurs uniques définitifs sur le replay. PostgreSQL conserve les faits ; Realtime transporte des animations dispensables. Le lecteur ne dépend jamais des réactions.

Base auditée : branche `feat/home-contextual-v1`, HEAD `45384fea73e8a70c7a06c60c791d1b0f206d62b5`. Gate branche/HEAD/fichiers suivis/staging passé. Le répertoire non suivi `release-out/` préexistait et reste hors périmètre. Référence `main` observée depuis ce worktree : `2e6cc5be1d50c1d9c818b0656ffb5065ddeb9bbd`. Build `ii1LUltflpCZJlHwbJSKg` et validation YouTube LIVE 4A sont les acquis fournis par le demandeur, pas des vérifications de production répétées ici.

Cet audit lit le code, les migrations et les tests. Il ne certifie pas le schéma distant, les quotas Realtime ou les performances actuelles. Aucun test applicatif, build, accès DB ou déploiement n'est nécessaire à cette phase documentaire.

## 2. Non-goals

Pas de chat, messages, profils publics, avatars, liste nominative, score d'ambiance, présence implicite, réaction sur replay, synchronisation des animations à la seconde du sermon, migration de données LIVE 4A ou refonte canonical/auth. Aucun compteur simulé et aucun seed exploité comme donnée réelle. Ni Redis, ni serveur WebSocket séparé, ni nouveau fournisseur de transport.

La phase actuelle crée seulement cette spécification. Tous les fichiers, tables, RPC, endpoints et composants nouveaux décrits ci-dessous sont des contrats futurs, pas des éléments déjà présents. Une autorisation ultérieure distincte est nécessaire pour implémenter ; un GO explicite reste nécessaire pour les mutations Supabase et le déploiement.

## 3. Existing LIVE 4A foundation

| Domaine | Preuve dans le dépôt | Conséquence LIVE 4B |
|---|---|---|
| Canonical | `src/lib/live/canonical-server.ts`, `src/lib/home/youtube-live.ts`, `src/lib/home/contextual.ts`, `src/app/api/live/canonical/route.ts` | Réutiliser `getCanonicalLiveState` et `liveKeyFromState`. Aucune vérité concurrente. |
| Identité serveur | `src/lib/live/live-participation-server.ts`, `src/lib/member-auth.ts` | UUID guest normalisé puis SHA-256 ; membre issu de `auth.getUser()` et du profil vérifié. |
| Identité navigateur | `src/lib/live/live-presence-client.ts` | Réutiliser `getOrCreateGuestSessionId`, stockage `citadelle_live_guest_session_id_v1`. |
| Présence | `src/components/live/LivePresenceControls.tsx`, les trois routes `src/app/api/live/presence/` | Join explicite, heartbeat 30 s, TTL 90 s, polling 15 s. Ne rien appeler depuis une réaction. |
| Persistance | migrations `20260907220000_live_real_presence_foundation.sql` et `20260907224000_live_presence_runtime_functions.sql` | Tables privées `live_presence_sessions`, `live_share_actions` ; RPC `live_presence_join`, `live_presence_heartbeat`, `live_presence_counts`. |
| Partage | `src/lib/live/live-share-server.ts`, `live-share-client.ts`, `src/app/api/live/share/route.ts` | Réutilise déjà les helpers guest sans join ; précédent utile pour séparer actions et présence. |
| Supervision | `src/lib/live/live-admin-supervision-server.ts`, route admin, `src/components/admin/live/LiveAdminSupervision.tsx` | Contrat agrégé avec `available:false` distinct d'un zéro. |

Les tables LIVE 4A activent RLS, révoquent les privilèges navigateur et accordent le CRUD au `service_role`. Les RPC sont `SECURITY DEFINER`, avec `search_path` fixé, exécution révoquée à `PUBLIC`, `anon`, `authenticated`, puis accordée au `service_role`. Les migrations sont transactionnelles. Les commentaires historiques « NON appliquée » décrivent leur lot de création ; ils ne remettent pas en cause le déploiement confirmé par le demandeur.

La présence fusionne un guest vers le membre lors du join/heartbeat et peut supprimer l'ancienne ligne guest. Les partages ne fusionnent pas leurs actions. Cette différence est réelle et ne doit pas être masquée en prétendant qu'un résolveur d'identité universel existe déjà.

Les deux pages live utilisent canonical avec polling 15 s et retour au premier plan. Le public conserve aussi un fallback initial CMS ; le membre un fallback CMS si l'API échoue. Le composant social doit donc obtenir sa propre confirmation serveur même si un ancien lecteur est encore affiché. `LivePresenceControls` est monté dans la page publique ; il n'est pas importé par la page membre auditée. Ne pas ajouter de présence membre dans ce lot pour combler cette différence.

## 4. Product decisions

- `reaction != presence` : aucun join, heartbeat, consentement local, compteur de présents ou analytics de présence ne découle d'une réaction.
- Mode hybride : animations périphériques légères et cinq compteurs fixes dans Famille Royale.
- Le compteur public par type mesure les identités uniques ayant réagi à ce type dans ce live ; les actions répétées restent comptées séparément pour le serveur/admin.
- Maximum trois actions acceptées dans toute fenêtre glissante de dix secondes, toutes réactions confondues, par identité. La fenêtre n'est pas réinitialisée par un changement de live.
- Toutes les actions acceptées modifient la vérité durable ; leur représentation visuelle peut être échantillonnée.
- Replay sans boutons d'envoi ni abonnement aux animations ; statistiques finales issues du direct seulement.
- Indisponible, chargement et zéro réel sont trois états différents.

## 5. Reaction taxonomy

Ordre identique dans les contrats, les interfaces et l'admin :

| Clé stable | Symbole | Libellé accessible |
|---|---|---|
| `prayer` | 🙏 | Prière |
| `fire` | 🔥 | Feu |
| `heart` | ❤️ | Amour |
| `praise` | 🙌 | Louange |
| `kingdom` | 👑 | Royaume |

Les payloads contiennent la clé, jamais un emoji libre. Un module pur `src/lib/live/live-reactions.ts` définit cette liste et la validation. SQL utilise un CHECK sur ces cinq valeurs. Les anciennes listes publiques de huit symboles et membre de six symboles seront remplacées dans le futur lot UI ; notamment Sparkles ne devient pas une réaction autorisée. Les icônes décoratives d'autres fonctions restent hors périmètre.

## 6. Identity model

Le moteur utilise `getVerifiedRouteProfile()` ; si un profil est vérifié, l'acteur est `member:<uid>`. Le body ne peut fournir ni `user_id`, ni hash, ni type d'acteur. Sans membre vérifié, un UUID guest valide devient `guest:<sha256(uuid_normalise)>`. Le préfixe empêche toute collision de domaine. Les clés d'acteur restent privées dans PostgreSQL et dans les appels serveur, jamais dans JSON public, événements ou journaux.

Réutiliser directement `normalizeGuestSessionId` et `hashGuestSessionId` exportés du moteur présence, comme le partage le fait déjà. Ne pas extraire/refactorer LIVE 4A uniquement pour obtenir un fichier plus élégant. Le client réutilise le helper UUID et sa clé existante, sans appeler `hasJoinedLive` ou `markLiveJoined`. Il relit le stockage avant l'envoi, garde un UUID en mémoire si le stockage échoue et écoute `storage` pour adopter un UUID établi dans un autre onglet. L'accès à `window.localStorage` lui-même doit être protégé. Un membre peut réagir sans UUID guest.

Décision de périmètre : les réactions gardent les identités membre et guest distinctes, comme les actions de partage ; aucune fusion des historiques sur connexion/déconnexion dans LIVE 4B. Cela évite qu'un UUID guest choisi par un navigateur puisse transférer des actions ou changer rétroactivement les comptes d'un membre. La fusion de présence reste intacte et indépendante. Un membre conserve sa déduplication entre appareils ; un guest entre onglets partageant le même UUID. Un changement de compte, de navigateur ou d'UUID représente une nouvelle identité. Une connexion après réaction guest peut donc compter deux identités : l'interface d'aide précise « Une fois par compte ou identité visiteur, pour chaque réaction ». Ne pas promettre une mesure biométrique des personnes physiques.

Le helper de profil actuel renvoie `null` tant en absence de session qu'en cas d'échec. Pour LIVE 4B, si un contexte d'authentification est présenté et que la vérification échoue, refuser l'envoi comme indisponible plutôt que basculer silencieusement en guest. Le nouvel adaptateur réaction peut utiliser `createRouteClient().auth.getUser()` pour distinguer absence normale, session invalide et indisponibilité, puis vérifier le profil existant ; il ne modifie pas le helper LIVE 4A. Session explicitement invalide : `identity_required`, sans fallback guest automatique ; absence normale de session : chemin guest.

L'atomicité est garantie pour une même identité, y compris face à un client hostile. Un visiteur hostile capable de générer plusieurs UUID peut créer plusieurs identités : la règle 3/10 s n'est pas une protection anti-Sybil. Ne pas introduire IP ou fingerprint pour prétendre résoudre cette limite.

## 7. Canonical live binding

`getCanonicalLiveState()` demande d'abord `detectYouTubeLive()`. Celui-ci interroge les broadcasts possédés via OAuth, classe LIVE/UPCOMING/ENDED et garde un cache mémoire : LIVE 30 s, OFFLINE 60 s, UPCOMING 30/180/900 s selon proximité. Une réponse nulle ou un échec laisse le CMS servir de fallback. Le CMS consulte douze lignes publiques, sans cache, puis `resolveLiveState` choisit `status='live'` ou `is_live=true`. Un état LIVE dépourvu d'ID YouTube valide reste inutilisable socialement : `liveKeyFromState` renvoie null. Le schéma CMS auditée ne possède pas de champ `live_key`.

Chaque POST valide la syntaxe puis résout canonical côté serveur avant identité et DB. `liveKeyFromState` impose exactement `youtube:` suivi de onze caractères YouTube. OFFLINE, UPCOMING, ID absent ou invalide donnent `409 not_live` sans appel DB. Une exception non traduite donne `503 unavailable`. Ne jamais enregistrer sous une clé provenant du body.

Le GET fournit la clé canonique comme contexte. Le POST exige `X-Live-Context` contenant cette clé. Ce header est uniquement une précondition : le serveur dérive la clé indépendamment et compare, il ne sélectionne jamais la destination depuis le header. Si le live a changé, `409 live_changed` sans écriture. Cela évite qu'un clic sur l'ancien culte soit attribué au nouveau. Ne pas utiliser un ETag constant pour une représentation dont les compteurs évoluent.

Après vérification de l'identité, résoudre de nouveau canonical avant la RPC si l'opération a dépassé deux secondes. Le moteur fournit une échéance interne de deux secondes après cette dernière résolution ; la RPC contrôle `clock_timestamp()` après acquisition des verrous et refuse une validation expirée. Cette échéance ne contourne pas le cache canonical. Les requêtes acceptées sont linéarisées au point d'admission DB ; celles déjà admises peuvent finir leur commit après le changement externe.

Limite préservée de LIVE 4A : le contrat actuel ne contient ni provenance, ni preuve fraîche de fin, et un CMS resté « live » peut maintenir le fallback. LIVE 4B ne promet pas de connaître l'arrêt physique YouTube à la milliseconde. Le vrai E2E doit prouver la transition canonical automatique avec les métadonnées de production cohérentes ; un échec bloque la livraison LIVE 4B et fait l'objet d'un constat séparé, pas d'une refonte silencieuse LIVE 4A.

## 8. Database model

Comparaison :

| Modèle | Exactitude et concurrence | Coût et limites | Décision |
|---|---|---|---|
| Actions privées append-only, COUNT DISTINCT à chaque lecture | Exact avec verrous d'identité et snapshot SQL | Lecture proportionnelle aux clics ; projection publique supplémentaire indispensable | Non retenu comme source de comptage courante |
| Ligne unique acteur/type/live avec `actions` | PK naturelle, incrément atomique ; lecture bornée à cinq lignes par acteur/live | Ne fournit pas seule un événement distinct à chaque clic ni la fenêtre exacte | Socle retenu |
| Compteur global seul, HLL ou compteur mémoire | Insuffisant pour dédupliquer exactement et vérifier les actions | Petit mais statistiquement ou transactionnellement incorrect | Rejeté |
| Ligne unique + état limiteur + événements anonymes + session archivée | Exactitude durable, diffusion séparée, replay stable | Quatre petites responsabilités et une RPC transactionnelle | Recommandé |

Quatre nouvelles tables `public`, sans altérer celles de LIVE 4A :

1. `live_reaction_runs` : `live_key text PRIMARY KEY` avec CHECK YouTube, `opened_at timestamptz NOT NULL`, `closed_at timestamptz NULL`, `final_stats jsonb NULL`. Le JSON final possède exactement `uniqueActors`, `totalActions`, `uniqueByType`, `actionsByType`, chacun des objets par type ayant les cinq clés et des entiers non négatifs. Fermeture et snapshot sont tous deux nuls ou tous deux renseignés. Première création par un GET confirmé LIVE ou premier envoi admis, jamais pour un replay ancien sans données.
2. `live_reaction_actor_limits` : `actor_key text PRIMARY KEY` validée comme membre UUID ou guest SHA-256, `accepted_at timestamptz[] NOT NULL` de zéro à trois instants ordonnés, `updated_at timestamptz NOT NULL`. Aucune clé live ici : le quota est global à l'identité. Ce n'est ni une présence ni un abonnement.
3. `live_reaction_actor_totals` : `live_key` FK restrictive vers runs, `actor_key`, `reaction` CHECK, `actions bigint NOT NULL CHECK(actions >= 1)`, `first_at`, `last_at` avec ordre temporel vérifié. PK `(live_key, actor_key, reaction)`. Index `(live_key, reaction)` avec `actions` inclus pour lectures par type. L'identité n'est pas une FK vers la présence, ni une FK avec suppression cascade depuis profiles.
4. `live_reaction_events` : `event_id uuid PRIMARY KEY` généré DB, `live_key` FK restrictive, `reaction` CHECK, `accepted_at timestamptz NOT NULL`. Seulement ces quatre champs. Index `(live_key, accepted_at DESC, event_id)`. Un INSERT par action acceptée. Aucun acteur, UUID guest, hash, request body ou compteur public dans cette table.

Les trois premières tables : RLS activée, aucun privilège `PUBLIC/anon/authenticated`, aucune policy navigateur. Accorder SELECT/INSERT/UPDATE au `service_role` sur ces tables et SELECT/INSERT sur les événements. RPC seules exposées au `service_role`, `SECURITY INVOKER` puisque le rôle serveur possède ces droits ; `search_path` fixé et relations qualifiées. Révoquer explicitement EXECUTE à `PUBLIC/anon/authenticated` pour chaque signature, y compris les lectures d'agrégats privés. Aucune permission DELETE/TRUNCATE n'est nécessaire au runtime LIVE 4B.

La table événements est l'unique exception publique : RLS activée, SELECT accordé à `anon` et `authenticated`, policy SELECT limitée aux événements de moins de 60 secondes ; aucun INSERT/UPDATE/DELETE/TRUNCATE accordé aux navigateurs. Le `service_role` écrit. Pas de cascade depuis un acteur : aucun lien identifiant n'existe dans cette projection. Seule cette table rejoint `supabase_realtime` ; aucun payload de lignes privées ne doit être répliqué vers le navigateur.

La RPC d'envoi écrit limiteur, total acteur et événement dans la même transaction. Une erreur d'INSERT événement entraîne rollback de cette action entière, pas un succès partiel. Une panne WebSocket après commit n'affecte aucune de ces écritures. La projection est une trace durable d'actions acceptées, pas un appel réseau au transport dans la transaction.

Pas de purge automatique ni d'effacement d'historique dans LIVE 4B. La policy temporelle limite la lecture publique, pas la conservation DB. Les snapshots finaux sont conservés. La croissance mesurée est documentée au lot performance ; toute rétention future est une opération distincte autorisée. Aucun worker de nettoyage requis pour la correction du quota : le tableau temporel reste borné à trois.

## 9. Exact uniqueness semantics

Pour un live et un type : nombre de lignes de `live_reaction_actor_totals` correspondantes. La PK empêche deux lignes pour la même identité/type/live, même sous concurrence. Le public ne reçoit que `uniqueByType`.

Pour l'admin, `uniqueActors = COUNT(DISTINCT actor_key)` sur ce live. Ne pas sommer les uniques par type : une personne peut avoir utilisé plusieurs types. L'exactitude est définie sur les identités de la section 6. Un simple visionnage, une présence ou un partage ne produit aucune ligne de réactions.

Une identité peut augmenter chacun des cinq compteurs au plus une fois pour ce live. Rechargement, multi-onglets, répétition de la même réaction et reconnexion au transport ne modifient pas cette règle. Un nouveau YouTube ID constitue un autre live et de nouveaux compteurs.

## 10. Total action semantics

Chaque POST accepté représente une action explicite. L'UPSERT fait `actions = actions + 1`, jamais read/modify/write dans TypeScript. `actionsByType` est SUM(actions) par type ; `totalActions` leur somme. L'événement UUID renvoyé représente cette même action committée.

Pas d'envoi automatique, de file offline ni de retry automatique des POST. Un double clic volontaire peut donc produire deux actions acceptées dans la limite 3/10 s. Si la réponse est perdue après commit, afficher un état incertain, resynchroniser les comptes et laisser l'utilisateur décider d'un nouveau clic ; ne pas réémettre silencieusement. Une nouvelle requête explicite constitue une nouvelle action, pas une reprise idempotente implicite. Cette décision évite une infrastructure de reçus et conserve la distinction clics/uniques.

Tout rejet de syntaxe, identité, quota, contexte, fermeture ou disponibilité ajoute zéro action et zéro événement. L'égalité `SUM(actor_totals.actions) = COUNT(events)` doit pouvoir être contrôlée pour chaque live et chaque type, sans aucun purge dans ce lot. Ce rapprochement vérifie aussi que les animations n'ont pas créé de statistiques.

## 11. Atomic rate limiting

Fenêtre précise : au temps DB `t`, conserver les admissions `s` satisfaisant `t - 10 secondes < s <= t`. Une admission exactement à `t - 10 secondes` est expirée. Trois admissions conservées interdisent la suivante. Un bucket fixe ou un token bucket autorisant un burst à la frontière ne satisfait pas cette règle.

La future RPC `live_reaction_record` reçoit uniquement du serveur la clé live, la clé d'acteur dérivée, le type et l'échéance de validation. Elle procède ainsi :

1. Valider les domaines ; créer la ligne run absente avec ON CONFLICT DO NOTHING. Acquérir `FOR SHARE` sur cette ligne, puis vérifier qu'elle n'est pas close. Tous les envois prennent les verrous dans l'ordre run puis acteur.
2. Créer la ligne limiteur absente avec ON CONFLICT DO NOTHING, puis SELECT FOR UPDATE sur `actor_key`. Un concurrent attend même si la ligne vient d'être créée. Aucun verrou global à tous les acteurs.
3. Après l'attente, lire `clock_timestamp()`, contrôler l'échéance et filtrer le tableau des instants acceptés. `now()` de début de transaction ne doit pas servir de temps d'admission après une attente.
4. Si trois instants restent, retourner `rate_limited` et `retryAfterMs = ceil((plus_ancien + 10s - t) en millisecondes)`, minimum 1. Ne modifier ni total, ni événement, ni instants acceptés. Les rejets ne prolongent pas le quota.
5. Sinon, ajouter `t` au tableau, incrémenter/créer la ligne acteur/type/live, insérer l'événement et retourner son identifiant/instant ainsi que le nombre de places restant. Le commit de la RPC décide du succès.

La ligne run ne change pas à chaque clic ; le verrou partagé permet les acteurs concurrents et interdit une fermeture pendant leurs écritures. La fermeture utilise `FOR UPDATE` et attend les admissions en cours. Fixer localement `lock_timeout` à une seconde pour l'envoi ; timeout/deadlock SQL donne `unavailable` avec rollback. Côté moteur, borner l'attente réseau RPC à deux secondes : une interruption HTTP n'est pas une preuve de rollback, elle produit l'état incertain décrit section 10. Ne pas prétendre qu'un `statement_timeout` changé à l'intérieur d'une fonction interrompt nécessairement la commande déjà commencée. Les délais et le contrôle d'échéance après verrou sont vérifiés dans les tests PostgreSQL.

L'UPSERT et les verrous existent dans la même transaction PostgreSQL, pas dans plusieurs appels REST. Multi-processus, multi-onglets et requêtes concurrentes d'une même identité partagent ainsi la même fenêtre. Le quota reste commun aux cinq types et survit aux redémarrages applicatifs. Le limiteur `src/lib/rate-limit.ts`, qui utilise une Map et un reset par bucket, n'est pas une implémentation acceptable de cette règle.

## 12. Server reaction engine

Nouveau module `src/lib/live/live-reactions-server.ts`, marqué `server-only`, avec fonctions séparées : `recordLiveReaction`, `getLiveReactionSnapshot`, `getReplayReactionSnapshot`, `getLiveReactionAdminAggregate`. Le transport et l'UI ne sont jamais importés ici. Les routes parsèment et traduisent HTTP ; le moteur possède canonical, identité et appels DB.

`recordLiveReaction` : validation, canonical, précondition, identité vérifiée, RPC atomique, validation stricte du résultat. Aucun appel présence/partage. Une erreur PostgreSQL ou un payload RPC incomplet devient `unavailable`, sans exposer les messages SQL. Un entier négatif, non fini ou hors plage sûre JS ne devient jamais zéro : il rend l'agrégat indisponible. Les types DB restent bigint, les JSON utilisent des nombres uniquement après vérification `Number.isSafeInteger`.

`getLiveReactionSnapshot` : canonical d'abord ; si LIVE valide, une RPC assure une ligne run réelle et calcule les cinq uniques dans une seule instruction SQL avec snapshot cohérent. Cinq zéros sont légitimes seulement si cette lecture a réussi. Aucune identité n'est créée par ce GET. La réponse capture aussi l'heure DB pour le calcul de fraîcheur des événements. Un run déjà clos avec canonical encore LIVE refuse l'envoi et signale `closed` ; aucune réouverture automatique de la même clé.

Contrats RPC : `live_reaction_record(p_live_key text, p_actor_key text, p_reaction text, p_validation_expires_at timestamptz)` renvoie le résultat d'admission ; `live_reaction_snapshot(p_live_key text)` assure le run LIVE et renvoie les agrégats/heure DB ; `live_reaction_admin_counts(p_live_key text)` lit seulement les agrégats ; `live_reaction_finalize(p_live_key text)` renvoie le snapshot final ou l'absence de run. Les dernières ne reçoivent aucune identité navigateur. La finalisation est appelée seulement après les contrôles CMS/canonical du moteur. Lectures de snapshot et de finalisation utilisent READ COMMITTED : après l'attente du verrou de clôture, une instruction d'agrégation distincte voit les écritures committées qui l'ont précédée.

Les agrégats sont calculés sur les lignes par acteur/type, au maximum cinq par identité/live, pas sur tous les événements. Pas de compteur global incrémenté qui sérialiserait chaque participant. Les appels ont des délais bornés et des catch locaux. Les imports de ces fonctions ne remontent jamais dans le moteur canonical.

## 13. Public API contracts

Tous les nouveaux handlers sont `runtime='nodejs'`, `dynamic='force-dynamic'`, avec `Cache-Control: no-store` sur succès et erreurs. Credentials same-origin. POST JSON seulement, body borné à 1 024 octets avec lecture bornée, clés inconnues rejetées. Vérifier Origin contre l'origine Citadelle configurée et rejeter les requêtes navigateur cross-site ; ce contrôle ne remplace pas l'identité et le quota. Aucun endpoint n'accepte de HTML, texte libre ou URL à contacter.

**GET `/api/live/reactions`**, sans paramètre de sélection de live :

- 200 LIVE : `{ok:true, live:true, liveKey, state:'open', uniqueByType, serverTime}`. `liveKey` est repris dans le header de contexte du POST ; les réponses restent no-store.
- 200 hors LIVE : `{ok:true, live:false, state:'not_live'}`. Aucun compteur à zéro prétendant décrire le dernier live.
- 200 run clos : `{ok:true, live:false, state:'closed'}` ; le client arrête les envois.
- 503 : `{ok:false, reason:'unavailable'}` ; pas de chiffres substitués.

**POST `/api/live/reactions`** : body `{reaction, guestSessionId?}`, header `X-Live-Context` requis. Aucune clé live ou identité membre dans le body. Un contexte malformé ou multiple est rejeté comme `invalid_request` ; un contexte valide mais différent de canonical donne `live_changed`.

| HTTP | Réponse | Effet |
|---|---|---|
| 200 | `{ok:true, liveKey, event:{eventId,reaction,acceptedAt}, remaining}` | Une action committée ; `remaining` concerne le quota de cette identité à cet instant |
| 400 | `{ok:false, reason:'invalid_request'}` ou `identity_required` | Aucun ajout |
| 403 | `{ok:false, reason:'forbidden_origin'}` | Aucun ajout |
| 409 | `{ok:false, reason:'not_live'}` / `live_changed` / `closed` | Aucun ajout ; resynchroniser le contexte |
| 413 | `{ok:false, reason:'body_too_large'}` | Lecture interrompue, aucun ajout |
| 415 | `{ok:false, reason:'unsupported_media_type'}` | Aucun ajout |
| 428 | `{ok:false, reason:'context_required'}` | Faire GET avant l'envoi |
| 429 | `{ok:false, reason:'rate_limited', retryAfterMs}` | Header `Retry-After = ceil(retryAfterMs/1000)`, aucun ajout |
| 503 | `{ok:false, reason:'unavailable'}` | Commit inconnu si réponse réseau perdue ; pas de retry automatique |

**GET `/api/live/reactions/replay?cmsLiveId=<UUID>`** : sélection read-only d'une ligne CMS existante, jamais destination d'envoi. Succès `{ok:true,state:'final',liveKey,uniqueByType}` ; état normal sans stats `{ok:true,state:'not_recorded'}` ; encore en cours `{ok:true,state:'not_final'}`. Identifiant mal formé : 400 ; ligne absente/non publique/non replay : 404 ; erreur DB : 503. Le moteur ne confond pas erreur CMS et absence de ligne, donc n'utilise pas directement `cmsList`, qui transforme les erreurs en null.

Les clients n'obtiennent pas `actor_key`, actions par acteur, hash guest ou ID membre dans aucun de ces endpoints. Le total d'actions reste dans le contrat admin, pas dans le compteur public.

## 14. Realtime architecture

Décision : **Supabase Postgres Changes sur `live_reaction_events`, INSERT uniquement**. Le navigateur reçoit, il ne publie pas. La chaîne est API Citadelle → validation → transaction PostgreSQL → commit → publication Realtime → abonnés. Pas d'appel `channel.send`, `track`, Broadcast ou de write Supabase dans le client réactions.

Le dépôt utilise déjà `.channel().on('postgres_changes', ...).subscribe()` avec polling de secours dans `src/components/features/notifications/NotificationBell.tsx`. La migration `20260602260000_realtime_notifications.sql` ajoute explicitement `app_notifications` à la publication. D'autres migrations y ajoutent des tables d'intercession/messages, mais il n'existe aucun canal de réactions ni politique Broadcast dédiée. Aucun `supabase/config.toml` suivi n'a été trouvé. `package.json` déclare supabase-js `^2.44.4` ; le lockfile fixe supabase-js et realtime-js à `2.105.3`. Aucune mise à jour de dépendance n'est requise pour cette primitive.

| Option | Avantage | Coût/risque | Choix |
|---|---|---|---|
| Postgres Changes, projection anonyme | Modèle déjà employé, commit avant propagation, guest read-only sans nouveau compte Auth | Coût de fan-out et autorisation par abonné ; projection publique à contrôler | Retenu pour LIVE 4B |
| Broadcast privé depuis serveur/DB | Adapté à un fan-out plus important | Gestion de réception guest/JWT, policies `realtime.messages`, reprise/outbox ; pas de pattern local vérifié | Alternative si mesures bloquantes, nécessite révision ciblée avant implémentation |
| Broadcast public brut | Simple à connecter | Un client pourrait envoyer un événement apparent arbitraire | Rejeté |
| Polling seul / SSE Citadelle | Snapshot robuste / contrôle serveur | Polling peu immédiat ; SSE introduit durée des connexions et reprise côté Passenger | Polling seulement comme secours des compteurs |

Abonnement filtré par `live_key=eq.<clé confirmée>`, table exacte, événement INSERT exact. Le handler valide schema/table/type, UUID événement, réaction et clé active. Le nom du canal n'est pas une autorisation. Un client hostile envoyant Broadcast sur le même nom n'entre jamais dans ce handler Postgres Changes.

Sources officielles consultées pour la faisabilité : [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) documente publication, SELECT/RLS et coût d'autorisation par abonné ; [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) distingue les permissions de réception et d'envoi Broadcast ; [Broadcast](https://supabase.com/docs/guides/realtime/broadcast) décrit publication DB et canaux privés. Ces capacités documentées ne prouvent pas leur activation sur le projet de production. Le [changelog](https://supabase.com/changelog) a été consulté ; son index Markdown n'était pas lisible par l'outil de navigation. La présence et les paramètres exacts de la publication seront un gate de déploiement, pas une supposition de Phase 0.

## 15. Reconnection and resynchronization

Le snapshot HTTP est l'autorité pour les chiffres. Ne jamais ajouter 1 à un compteur unique parce qu'un événement est arrivé. Un événement peut provenir d'une identité déjà comptée.

Montage : GET snapshot, vérifier la concordance avec la vidéo affichée, puis abonnement. À `SUBSCRIBED`, refaire un GET : cela couvre les compteurs des actions survenues pendant la connexion. Les animations ratées ne sont pas rejouées. Chaque événement reçu, y compris la confirmation POST locale, marque le snapshot sale ; rafraîchir au plus une fois toutes les deux secondes, sans requêtes concurrentes. Le GET périodique visible toutes les quinze secondes couvre les événements perdus et la panne Realtime.

Sur erreur/timeout/fermeture de canal, conserver le dernier snapshot avec indicateur de fraîcheur, continuer le polling et laisser le SDK reprendre la connexion. Ne pas empiler des canaux ou recréer un canal à chaque événement. Un retour `SUBSCRIBED` déclenche resync et vide les anciennes animations. À l'arrêt ou changement de live, annuler requêtes, timers, canal et file, puis repartir avec une nouvelle génération de contexte.

Un compteur ancien ne doit pas écraser un compteur récent : un seul GET en vol, génération de contexte vérifiée au retour, pas de statistiques dans les réponses POST. Pour un même run ouvert sans fusion d'identités, les uniques sont monotones. Si une réponse non finale régresse, l'ignorer et signaler une anomalie de resync ; ne pas inventer de correction numérique.

Pas de curseur durable d'animations ni de promesse exactly-once du transport. Les UUID servent à dédupliquer le POST local et la réception distante : ensemble en mémoire de 512 UUID maximum, rétention 60 s. Au-delà du TTL, les événements sont ignorés même si l'ensemble ne les contient plus.

## 16. Client state model

Nouveaux modules purs `live-reactions-client.ts` et `live-reaction-animation.ts`, contrôleur `LiveReactionsProvider`, composants `LiveReactionControls`, `LiveReactionAnimationLayer`, `LiveReplayReactionCounts`. Un provider par live affiché ; la barre, les compteurs et l'animation partagent ce contrôleur, sans double abonnement.

Trois dimensions séparées : contexte `loading/open/not_live/closed/unavailable` ; envoi `idle/pending/rate_limited/uncertain` ; transport `connecting/subscribed/degraded`. `uniqueByType` vaut null avant lecture réussie, jamais un objet de zéros par défaut présenté comme réel. Une panne Realtime ne désactive pas les envois lorsque l'API fonctionne. Une erreur DB n'est pas un état OFFLINE du player.

Animation locale non optimiste : après 200 committé, injecter l'événement dans la même file validée que le transport. Si Realtime l'a déjà livré, l'UUID empêche le doublon. Le bouton peut montrer immédiatement un état pressé/en cours mais aucune particule ni compteur n'anticipe une acceptation. Un nouvel envoi UI est suspendu pendant le POST ; ce confort n'est pas le rate limit serveur.

429 : afficher « Un instant, tu pourras réagir à nouveau dans N s », timer monotone basé sur `retryAfterMs`, puis réactiver. `remaining` est indicatif, jamais une autorisation côté serveur. 409 : stopper les animations, resynchroniser. Réseau ambigu : « Réaction non confirmée », aucun retry. Si l'UUID ne peut être créé et qu'il n'y a pas de membre vérifié, lecture/visionnage restent disponibles.

## 17. Adaptive animation algorithm

Algorithme pur piloté par horloge injectée, sans hasard :

- Deux rails périphériques ; quatre animations simultanées maximum, durée 1 600 ms. Position choisie par hash stable de `eventId` modulo deux. À faible largeur, rail inférieur réservé hors du rectangle vidéo, jamais au-dessus des contrôles YouTube.
- File FIFO de douze événements au maximum ; date de réception monotone et date serveur associées. TTL de démarrage : quatre secondes depuis l'acceptation serveur. Estimer l'offset par `serverTime - milieu(heure_client_départ, heure_client_arrivée)` d'un GET dont l'aller-retour est inférieur à deux secondes, puis avancer avec l'horloge monotone ; invalider l'offset après 60 s sans snapshot frais. Rejeter un instant futur supérieur à deux secondes ; sans offset fiable, resynchroniser avant de montrer une particule.
- Charge : compteur saturé à 41 réceptions validées et dédupliquées dans dix buckets d'une seconde. Somme 0–10 : faible ; 11–40 : moyenne ; au-delà : forte. Les buckets expirent déterministiquement.
- Faible : un démarrage au plus toutes les 400 ms, FIFO. Moyenne : un démarrage toutes les 800 ms, FIFO. Forte : un démarrage toutes les 1 200 ms, choisir le plus récent événement réel encore valide et vider les plus anciens. Chaque tick démarre au maximum un événement si un emplacement est libre.
- Si la file est pleine, abandonner l'événement le plus ancien avant d'ajouter le nouveau. Expirer les événements trop vieux avant chaque démarrage. Aucune particule multipliée, aucun événement synthétique, aucun « xN » non adossé à des faits.
- Onglet masqué, replay actif ou changement de clé : vider file et animations, suspendre scheduler et polling social, retirer l'abonnement. Retour visible : snapshot, nouvel abonnement, uniquement événements frais ; ne jamais déverser une rafale de rattrapage.
- `prefers-reduced-motion: reduce` : aucune animation mobile, file vide ; conserver boutons, accusé de réception discret et compteurs. Changement de préférence pris en compte sans rechargement.

La comptabilité DB intervient avant toute règle d'animation. Deux navigateurs peuvent représenter des sous-ensembles différents pendant une rafale ; leurs snapshots finissent identiques. Aux faibles volumes du vrai E2E, chaque action confirmée et reçue à temps doit pouvoir être visible. Pas de sons, vibrations, flashs ou nouvelles dépendances particules.

## 18. Public /live UX

Dans `src/app/(public)/live/page.tsx`, remplacer uniquement la zone actuelle « Exprime ta réaction sur ton écran », sa liste locale et son compteur de particules. Monter les cinq boutons et cinq compteurs fixes dans Famille Royale, après la présence existante. Texte « Réagir ensemble » et aide sur les uniques. Un zéro ne s'affiche qu'après lecture réussie ; en cas d'échec, « Réactions momentanément indisponibles ».

Les animations apparaissent dans des rails réservés immédiatement autour du player. Ces rails n'occupent jamais le rectangle de l'iframe : cela garantit de ne pas masquer un prédicateur placé sur le bord, les sous-titres ou les contrôles. Conserver la géométrie vidéo 16:9, le titre, le partage, les parcours et le composant d'offrande. Couche `pointer-events:none`, `aria-hidden=true`. Les clics clavier/souris et le plein écran YouTube restent natifs ; en plein écran iframe, aucune animation Citadelle n'est exigée.

Boutons accessibles de 44 px minimum, grille de cinq, noms français, focus visible. L'aide dit que le nombre représente des personnes distinctes selon l'identité décrite en section 6, pas des clics. Les annonces aria-live sont limitées aux retours d'envoi/quota ; ne pas lire chaque événement à haute voix. Le lecteur reste monté quand compteurs ou canal changent.

## 19. Member live UX

Dans `src/app/(member)/member/dashboard/lives/page.tsx`, remplacer `REACTIONS_LIVE`, `sendReaction` et les particules locales par les mêmes modules que le public. Monter une zone Famille Royale compacte avec cinq compteurs, reliée au contexte canonical confirmé, sans ajouter présence ni chat. Aucune identité membre provenant des props ou du client n'est transmise à la DB.

Même quota entre pages, onglets et appareils pour le même compte. Ouvrir la modale de replay ou une playlist suspend les animations LIVE de cette vue. Les programmes, rappels ICS, partage et lecture intégrée existants restent leurs fonctions actuelles. Les statistiques replay sont affichées pour la vidéo CMS sélectionnée seulement ; une playlist n'a pas de compteur de réactions LIVE attribué par approximation.

## 20. Replay behavior

Preuves : `cms_lives`, créé par `20260530100000_cms_core.sql`, possède `id`, `title`, `youtube_url`, `video_url`, `status`, `is_live`, `scheduled_at`, `created_at`, `updated_at`. Aucun `youtube_video_id`, `live_key`, `ended_at` ni FK réactions. La page publique sélectionne aujourd'hui sans `id`, filtre `ended/published` et fabrique `titre-index` ; ses cartes ouvrent l'URL. La page membre possède `id`, ouvre un player YouTube intégré et alimente `youtube_url` depuis `youtube_url || video_url`. Aucune création automatique de replay à la fin du détecteur YouTube n'est présente dans ce flux.

Le futur lot replay ajoute `id` à la projection CMS publique et au type Replay ; aucun changement de schéma CMS. L'endpoint charge cette ligne côté serveur, exige `status` ended/published et `is_live=false`, extrait l'ID strictement depuis une URL YouTube autorisée ou un ID brut de onze caractères : priorité `youtube_url`, sinon `video_url` uniquement si c'est aussi YouTube. Hôtes autorisés `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, chemins watch/embed/live/shorts ; pas de regex acceptant un domaine suffixé hostile. Vidéo hébergée non YouTube, playlist seule ou ID différent : `not_recorded`, pas d'association par titre, date ou position de liste.

La clé `youtube:<ID>` cherche exactement un run enregistré pendant LIVE 4B. Plusieurs lignes CMS portant le même ID montrent le même snapshot. Un replay de LIVE 4A sans run LIVE 4B affiche « Réactions non enregistrées pour ce culte », pas cinq zéros présentés comme historique connu. Aucun backfill ni seed. Si YouTube a créé un live sans ligne CMS, ses données restent conservées par clé ; elles deviennent visibles quand le flux éditorial existant publie une vraie ligne replay du même ID. LIVE 4B ne crée pas cette ligne automatiquement. La recette inclut cette publication éditoriale autorisée.

Fermeture paresseuse et irréversible : le GET replay vérifie la ligne éditoriale et canonical. Si la même clé est encore LIVE, `not_final`. Si canonical ne désigne plus cette clé et que la ligne est réellement publiée comme replay avec `is_live=false`, appeler `live_reaction_finalize` : verrou FOR UPDATE du run, attendre les envois déjà admis, calculer tous les agrégats dans la transaction, poser `closed_at` et `final_stats` atomiquement. Relecture ultérieure renvoie le même JSON sans recalcul. Un appel répété est idempotent. Aucun run n'est créé pour produire artificiellement des zéros d'archives.

Ce GET peut matérialiser le snapshot interne, mais n'enregistre aucune réaction et n'ajoute aucune action. Un simple OFFLINE ou échec canonical, sans ligne éditoriale replay, ne ferme pas définitivement un run : les animations s'arrêtent et les envois sont déjà refusés par le gate canonical. La publication d'un replay est l'affirmation éditoriale de fin ; l'absence de provenance dans canonical impose de vérifier cette cohérence en recette. Si fermeture DB échoue, afficher indisponible/non final, jamais annoncer des comptes figés. Le run clos refuse ensuite toute nouvelle écriture même en cas de CMS redevenu live. Une réutilisation du même ID YouTube après clôture n'est pas prise en charge ; programmer un nouvel ID.

Les stats finales contiennent exactement les actions admises avant la fermeture, toutes issues du chemin LIVE canonical. La transition réelle reste bornée par la fraîcheur canonical de LIVE 4A ; elle n'est pas une horloge physique YouTube indépendante. Pour un live connu sans aucune réaction, le run créé par le GET LIVE permet un snapshot final de cinq zéros légitimes.

## 21. Admin supervision

Étendre additivement `LiveAdminSupervisionData` avec `reactions` : `null` si hors LIVE ; `{available:false}` si lecture DB impossible ; sinon `{available:true, uniqueActors, uniqueByType, totalActions, actionsByType}`. Les champs présence et partage existants gardent leur contrat. Passer la clé déjà résolue au lecteur interne d'agrégats réactions pour éviter une deuxième sélection divergent vers un autre live.

Les agrégats d'une réaction défaillante n'invalident pas le reste de la supervision : catch par sous-système. Lorsqu'un snapshot réaction est refusé ou malformé, ne pas fabriquer des zéros. L'UI conserve l'ordre des cinq types et affiche uniques et actions en colonnes distinctes, plus les deux totaux globaux ; aucune ligne par acteur.

La route existante commence par `isAdminRequest`, puis contrôle `isAdminCapable` lorsqu'un profil vérifié existe. Elle possède son fallback d'authentification admin historique ; LIVE 4B le préserve sans prétendre qu'elle exige actuellement toujours un profil Supabase. Ajouter les tests de non-divulgation aux chemins 401/403 existants. Le polling admin reste 15 s et no-store. OFFLINE reste « Aucun direct en cours », pas les stats du dernier culte présentées comme actuelles ; les compteurs finals publics se trouvent sur replay.

## 22. Offline behavior

Canonical non LIVE : pas de POST accepté, aucun canal actif ni animation affichée. L'absence de connexion réseau ne stocke pas des clics pour les envoyer plus tard. Les états accueillants, replays, programmes et liens de prière existants restent fonctionnels selon leurs propres disponibilités.

Si la page conserve un ancien lecteur lors d'une erreur canonical, le contrôleur social suspend les envois après un échec de confirmation et conserve éventuellement les anciens chiffres explicitement marqués non actualisés. Une connexion Realtime encore ouverte ne suffit jamais à considérer le live actif. Un événement en vol d'un ancien contexte est jeté.

## 23. Failure isolation

Le player, son titre et le polling canonical ne se trouvent pas sous un provider qui attend les réactions pour rendre ses enfants. Utiliser un boundary React uniquement autour des contrôles/rails sociaux et un contrôleur sans branche de rendu supprimant le player. Une erreur du contrôleur a un état local terminal récupérable, pas un throw vers la page. Les modules DB et Realtime sont chargés uniquement dans leurs couches respectives ; la connexion Realtime est initialisée dans un effet après montage.

Pas de Promise.all joignant chargement vidéo et succès social. Timeouts d'API, refus DB, JSON invalide, échec abonnement, défaut localStorage, timers expirés et exceptions d'animation ont chacun une sortie locale. En cas de panne réactions, conserver exactement l'élément iframe existant, son src et sa lecture ; aucun reload/remount/key basé sur un compteur ou un état de transport.

La défaillance d'une table événement peut refuser de nouvelles réactions, mais ne modifie jamais canonical. Le redémarrage de Realtime ne touche ni stats ni présence. La finalisation replay n'est jamais attendue pour ouvrir sa vidéo. Ces invariants nécessitent un test navigateur avec interception des pannes, en plus des tests de source.

## 24. Security and privacy

Frontière de confiance : seul le serveur vérifie la session, dérive l'identité et canonical, puis appelle les RPC privilégiées. SQL revalide les domaines et le quota, sans prétendre connaître directement l'état YouTube. La clé service_role n'entre jamais dans le bundle client. Aucune lecture de `.env` ou de secrets n'est nécessaire à cet audit.

La projection Realtime est volontairement publique pendant 60 s : un spectateur peut observer des types/instants et donc estimer un volume de clics, mais pas retrouver les acteurs. Le fait que l'UI publique montre des uniques ne rend pas le volume événementiel secret. Ne pas conserver dans le payload de métadonnées corrélables, d'identifiant de session ou d'identité. Les logs techniques se limitent aux classes d'erreur, durées, clé live et compteur de rejets agrégé, sans corps de requête.

Ne pas utiliser le compteur Realtime Presence, les connexions WS ou l'IP comme présence ou identité. Aucun grant sur les tables LIVE 4A pour rendre les réactions possibles. Tests négatifs exécutés avec les vrais rôles SQL et avec le client Supabase public : write aux quatre tables, exécution RPC, lecture des trois tables privées et faux Broadcast doivent échouer ou être ignorés selon le chemin. Les politiques générales existantes de la publication sont à inspecter avant activation ; un nom de canal seul n'est jamais une barrière.

## 25. Performance expectations

Cibles à mesurer, pas résultats de cet audit : POST p95 sous 800 ms et p99 sous 2 s hors attente de réseau externe ; réception d'une animation distante sous 2 s p95 à faible charge ; convergence des comptes sous 3 s avec transport et sous 17 s avec polling seul, hors panne de l'API. La transition canonical utilise sa cadence existante, distincte de ces cibles sociales.

Scénarios de mesure en environnement de test autorisé : 100 spectateurs et 5 actions/s pendant 10 minutes ; 500 spectateurs et 30 actions/s pendant 10 minutes ; rafale de 100 actions/s pendant 30 secondes avec assez d'identités indépendantes pour respecter 3/10 s. Aucune charge synthétique envoyée en production. Mesurer latences, erreurs de lock, exactitude des agrégats, retard WS, CPU navigateur et nombre de nœuds d'animation.

La partie DB écrit une petite ligne limiteur, une ligne total et un événement par acceptation. Les agrégats parcourent au plus 5U lignes par live pour U identités. Le débit réseau Realtime croît avec actions × abonnés ; la réduction d'animations côté client ne réduit pas ce fan-out. Le polling compteurs représente N/15 requêtes/s au repos et au plus N/2 sous événements continus. Ces coûts doivent être observés avec les quotas réels, sans promettre 100 000 spectateurs sur la base d'un commentaire existant.

Si les cibles de charge ne passent pas, ne pas augmenter silencieusement les limites ni perdre des statistiques. La livraison est bloquée pour ajustement du transport ou coalescence serveur des notifications, en conservant les transactions exactes. Broadcast privé devient alors une révision architecturale explicite, pas un fallback public non validé. Les verrous PostgreSQL et leur portée transactionnelle sont documentés dans [Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html).

## 26. Test strategy

Patterns vérifiés : Vitest 2 en environnement node, alias `@`, stubs `server-only/client-only` dans `vitest.config.ts`, tests co-localisés `src/**/*.{test,spec}.{ts,tsx}`. Le moteur présence emploie `vi.hoisted`, `vi.mock` et RPC simulées ; routes testées via `NextRequest` ; client via fetch/crypto/storage injectés. Les tests migrations lisent le SQL et normalisent les espaces. Les tests UI/architecture lisent le code source : utiles pour les frontières, insuffisants pour prouver animation, RLS ou concurrence. Playwright est une dépendance, mais aucune configuration Playwright suivie n'a été trouvée dans la recherche ciblée.

Cycle obligatoire de chaque lot : écrire le test du contrat absent ou incorrect, exécuter et conserver le RED attendu ; implémenter le minimum ; obtenir GREEN ; vérifier les non-régressions concernées. Un échec d'environnement n'est pas un RED fonctionnel. Les valeurs synthétiques vivent uniquement dans les fixtures isolées de tests et ne sont jamais migrées/seedées en production.

| Couverture | RED à établir | GREEN exigé |
|---|---|---|
| Migration contract | Tables/PK/CHECK/RLS/ACL/publication absents | Quatre tables seulement, cinq types exacts, projection sans acteur, signatures RPC fermées, aucun changement LIVE 4A |
| SQL réel | Écritures directes et RPC publiques interdites, invariants encore absents | Tests PostgreSQL d'intégration sur DB jetable autorisée, rôle anon/authenticated/service_role réel ; pas seulement regex SQL |
| Moteur | Canonical/identité/erreurs non traités | Bons arguments RPC, aucune identité client privilégiée, absence de présence/partage, erreurs distinctes de zéro |
| Concurrence | Plusieurs requêtes simultanées dépassent le quota sans verrou | Vingt connexions simultanées pour un acteur : exactement trois admissions, une ligne unique par type et trois événements ; autres acteurs indépendants |
| Fenêtre temporelle | Bucket fixe ou horloge de transaction accepte trop | Bornes à 9 999 ms/10 000 ms, double clic, cinq types mélangés, attente de verrou, refus sans prolongation, quota conservé entre lives |
| API behavior | Entrées libres et headers manquants acceptés | Tous statuts section 13, body trop gros, clés inconnues, Origin, X-Live-Context, no-store sur chaque sortie |
| API architecture | Route accède directement aux tables privées | Route → moteur server-only → RPC ; ni `user_id` du body, ni `clientIp` comme identité/quota produit |
| Realtime architecture | Faux client peut produire une particule distante | Écriture publique refusée ; seuls INSERT de projection validée traités ; Broadcast arbitraire ignoré ; pas de publication des tables privées |
| Client | Compteurs optimistes ou double animation | Confirmation serveur, dédup POST/WS, pas de retry POST, génération live, abort, JSON invalide, 429, stockage indisponible |
| Scheduler | File/DOM non bornés sous rafale | Horloge simulée : 12 en file, 4 visibles, TTL, trois régimes, background/foreground et reduced-motion |
| UI integration | Listes locales historiques encore montées | Exactement cinq boutons communs, compteurs uniques séparés présence, lecteurs stables, focus/rails/mobile validés dans navigateur |
| Replay | Association par titre ou comptes modifiables | Bon CMS ID → bon YouTube ID → bon run ; ancien live non enregistré, vidéo hébergée, plusieurs replays, live A replay pendant live B, snapshot figé |
| Finalisation | Fermeture concurrence perd une action | Envoi admis avant verrou final inclus ; nouvel envoi après close rejeté ; deux finalisations identiques ; erreur n'écrit pas de demi-snapshot |
| Admin | Champs manquants ou erreur devient zéro | uniqueActors distinct de somme par type, actions distinctes d'uniques, 401/403 préservés, OFFLINE null, panne réactions isolée |
| OFFLINE | Canal ou POST survive sans LIVE | UPCOMING/OFFLINE/ID invalide/clé changée : zéro mutation d'action, queue vidée, aucun envoi différé |
| Failure isolation | Panne sociale remonte à iframe/canonical | Injection échec DB/API/Realtime/rendu : iframe même nœud/src, lecture continue, canonical continue |

Régression LIVE 4A : conserver les tests `canonical-server`, `youtube-live`, `live-participation-server`, migrations présence, routes présence/partage, clients présence/partage et supervision. Les assertions historiques de `page.presence.test.ts` sur le libellé local seront remplacées uniquement dans le lot UI par des assertions nouvelles de réaction partagée ; garder leurs assertions sur présence explicite et partage. Ne pas supprimer une suite pour obtenir GREEN.

Les tests SQL concurrentiels ont besoin de sessions PostgreSQL indépendantes ; une Promise.all de mocks ne constitue pas une preuve. Sans environnement DB de test explicitement autorisé, ce gate reste non validé et le lot n'est pas déclaré terminé. Rapports et artefacts vont sous `work/<LOT>/reports`, temporaires sous `work/<LOT>/tmp`, jamais dans `release-out/` ou sur Desktop. Phase 0 ne crée aucun de ces artefacts.

## 27. Proposed implementation lots

Conserver dix lots, en avançant le contrat de fermeture/replay dans la fondation pour ne pas redessiner la DB après le client :

| Lot | Frontière et dépendances | Sortie vérifiable |
|---|---|---|
| 4B.1 Fondation DB | Quatre tables, contrats ACL/index/CHECK ; prévoir le snapshot final dès maintenant | Migration versionnée non appliquée sans GO ; RED/GREEN migration et SQL autorisé |
| 4B.2 Moteur transactionnel | RPC record/snapshot/finalize, identité et quota ; dépend de 4B.1 | Tests de concurrence, bornes temporelles, rollback et fermeture avant exposition HTTP |
| 4B.3 API | Contrats HTTP publics, contexte, origin, erreurs ; dépend de 4B.2 | Routes testées, aucun accès navigateur privilégié |
| 4B.4 Transport partagé | Publication projection, récepteur, resync ; dépend de 4B.1–3 | Deux clients reçoivent une action validée ; faux Broadcast ignoré |
| 4B.5 UI commune | Public et membre dans le même lot pour éviter deux taxonomies ; dépend de 4B.3–4 | Cinq boutons, compteurs uniques et player isolé ; animation simple déjà bornée |
| 4B.6 Adaptation visuelle | Scheduler déterministe, a11y, rafales ; dépend de 4B.5 | Horloge simulée et validation mobile/reduced-motion |
| 4B.7 Replay | Résolution CMS ID/YouTube, matérialisation finale, UI lecture seule ; repose sur finalisation déjà testée en 4B.2 | Aucun vote replay, liaison exacte et snapshot durable |
| 4B.8 Admin | Ajout agrégats aux contrats existants ; dépend de 4B.2–3 | Deux métriques distinctes, erreurs locales, droits préservés |
| 4B.9 Résilience/performance | Durcir par mesures l'ensemble, sans attendre ce lot pour les tests de concurrence | Tous gates techniques, absence données inventées et charges cibles mesurées |
| 4B.10 Release/E2E | GO DB et GO production distincts, puis vrai live multi-navigateurs | Preuves des critères section 29, bilan final et version exacte |

Ce document n'est pas le plan d'exécution. Chaque futur lot déclarera sa liste précise de fichiers et utilisera un worktree isolé selon la constitution. Pas de parallélisme dans un arbre partagé. Les frontières testables priment sur la multiplication de sous-lots.

## 28. Migration / deployment strategy

Phase 0 : aucune migration, mutation source, installation, push, SSH ou déploiement. Après revue de cette spécification, produire un plan séparé seulement sur demande. Le commit documentaire ne vaut pas GO DB ou GO production.

Future séquence : migration additive examinée et tests DB isolés autorisés ; validation des ACL et de l'existence de `supabase_realtime` ; application distante seulement après GO explicite ; vérification du schéma et droits appliqués ; release applicative compatible avec une DB indisponible ; vrai E2E. Si la publication est absente, ne pas recopier le silence `exception when undefined_object` de l'ancienne migration comme preuve de succès Realtime : l'activation doit échouer clairement au gate de release. Préserver les tables déjà publiées.

Rollback applicatif : revenir à l'artefact précédent sans supprimer les données réactions. Les tables additives peuvent rester inertes. Retirer une publication ou supprimer des tables nécessite une opération distincte revue et autorisée ; aucune purge automatique. Préserver `app.js`, `.env`, `.htaccess`, `logs`, et ne jamais utiliser `rsync --delete`.

Build de release futur : exécuter les gardes existantes, établir `LOCALHOST_LEAK=0`, `PLACEHOLDER_SUPABASE=0`, ref production `nvyuyffywnuollaxguen`, sans imprimer les secrets. Tracer commit, build ID, migrations et artefact. Ne pas présenter le build LIVE 4A fourni comme un build LIVE 4B.

## 29. Real production E2E acceptance criteria

Après GO production et avec un vrai nouveau YouTube Live, utiliser navigateur A connecté comme membre, navigateur B visiteur sur un stockage neuf et vue admin distincte. Au moins une vue utilise `/live` et une autre `/member/dashboard/lives` lorsque son authentification le permet. Aucun script de seed ni charge artificielle de compteurs. Cadencer les actions pour ne pas confondre le test d'unicité et celui du quota.

1. Démarrer le vrai live : canonical devient LIVE automatiquement ; conserver temps observé et ID vidéo réel.
2. Les deux navigateurs affichent la même vidéo et le même contexte canonique ; aucun clic de présence préalable n'est requis.
3. A envoie `fire` et reçoit une confirmation serveur.
4. B reçoit l'événement et voit l'animation réelle en faible activité.
5. Le compteur public unique fire converge à 1.
6. A renvoie fire dans une fenêtre autorisée.
7. B peut voir une nouvelle animation avec un autre événement.
8. Le compteur public unique fire reste 1.
9. La supervision indique fire uniques 1 et actions 2.
10. B guest envoie `prayer` sans cliquer « Je suis là ».
11. Vérifier par preuve agrégée et contrôle DB autorisé que cette action n'a créé aucune présence guest ; pas seulement une absence d'animation du bouton.
12. Le compteur public prayer unique devient 1.
13. Après retour à une fenêtre vide, envoyer quatre demandes en moins de dix secondes pour une identité : trois au maximum acceptées, quatrième 429. Faire aussi la variante multi-onglets. Les rejets ne produisent aucun événement.
14. Après `retryAfterMs`, une nouvelle réaction est acceptée ; comparer actions et événements réellement committés.
15. Arrêter YouTube réellement, sans simuler canonical dans le navigateur.
16. Canonical quitte LIVE automatiquement ; tracer son délai en regard des caches existants.
17. Toute nouvelle tentative LIVE reçoit not_live et ajoute zéro action ; aucun événement tardif n'est animé après changement de contexte.
18. Publier le replay via le flux CMS existant autorisé, avec le même ID YouTube, statut replay et `is_live=false`. Les compteurs finaux reproduisent exactement les derniers agrégats réconciliés du live.
19. Replay sans possibilité d'ajouter une réaction ; tentative forcée via API refusée ; reload et autre navigateur conservent les mêmes chiffres.
20. Vérifier qu'aucun participant, compteur, message, profil ou pourcentage fictif n'est affiché. Rapprocher totaux acteur et événements DB.
21. Couper Realtime puis simuler une panne API réactions dans un navigateur pendant la lecture : le player et canonical continuent ; les statistiques restent durables et reprennent par resync. Pour une panne DB réelle, utiliser l'environnement de test autorisé, pas une modification destructive de production.

Compléments de recette : les cinq types exacts sont visibles sur les deux surfaces, clavier/mobile/reduced-motion validés ; vrais rôles guest/member ne peuvent écrire directement ; annuler un POST réseau ne provoque pas de retry ; replay A pendant live B ne reçoit jamais les chiffres de B. Toute mesure non exécutée est notée non validée, jamais transformée en PASS. LIVE 4B n'est terminé qu'après cette preuve en production.

## 30. Risks and mitigations

| Risque constaté ou inféré | Traitement décidé |
|---|---|
| Canonical cache et CMS fallback ne constituent pas une preuve instantanée de fin YouTube | Respecter le moteur existant, bornes d'admission courtes et fermeture explicite du run ; vrai E2E obligatoire, limite exposée section 7 |
| Guest UUID renouvelable et passage guest → membre | Déduplication sur identité définie, aide transparente, pas de fusion/fingerprint/IP ; ne pas prétendre empêcher les identités multiples |
| Échec auth assimilé à absence par le helper existant | Adaptateur réaction fail-closed lorsqu'une session est présentée, sans modifier LIVE 4A |
| PUBLIC EXECUTE implicite ou nouvelle policy trop large | Revokes explicites par signature, ACL et attaques avec rôles réels avant activation |
| Diffusion brute révèle les clés d'acteur | Projection de quatre champs non identifiants uniquement, aucune table privée publiée |
| Realtime coûteux sous forte audience | Charge chiffrée, budget de polling explicite, gate mesuré ; pas de promesse que le sampling client réduit le réseau |
| Réponse POST perdue après commit | État incertain, GET resync, aucun retry automatique ni compte optimiste |
| Replay absent, titre changé, URL différente | CMS ID serveur puis ID YouTube exact ; absence de stats affichée clairement ; pas de rapprochement approximatif |
| Fermeture prématurée après une simple panne | Pas de clôture sur OFFLINE seul ; exiger la publication éditoriale replay et la sortie de cette clé de canonical |
| Courses fermeture/envoi ou acteurs concurrents | Verrous run partagé/exclusif puis acteur, temps DB après lock, tests multi-connexions |
| Croissance des traces | Quota borné par identité, projection sans identité et visibilité 60 s ; mesure stockage, pas de purge ni de rétention implicite |
| Tests source trop rassurants | Compléter Vitest par SQL/RLS/concurrence réels et tests navigateur ; aucun PASS sans exécution |
| Régression du culte due à la couche sociale | Boundary local, aucun lien d'attente avec iframe/canonical, injection de pannes et contrôle du nœud player |

Le plan futur doit conserver ces invariants : cinq types seulement, réaction distincte de présence, uniques publics distincts des actions, quota PostgreSQL 3/10 s, transport sans autorité statistique, replay sans nouvelles réactions et lecteur indépendant.
