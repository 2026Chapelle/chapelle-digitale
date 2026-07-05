# Plan d'enrichissement — Gouvernement Pastoral

> Fondé sur `audit-gouvernement-pastoral.md`. **Aucune refonte, aucune recréation — extension des acquis uniquement** (règle [[regle-acquis]]).
> Aucun développement tant que ce plan n'est pas validé. Chaque priorité applique le protocole acquis : acquis concerné → pourquoi → risque de régression → alternative sans modif → validation.

## Principe directeur
On ne crée AUCUN nouveau système. On branche/agrège ce qui existe déjà :
- Calcul d'engagement : `src/lib/pastoral-intelligence.ts` (réel, pur, testé) + RPC `pastoral_member_signals`.
- Présence : `src/lib/community/presences-server.ts` + `attendance.ts:computeAttendanceStats` (pur).
- Croissance temporelle : `src/lib/pastoral/metrics.ts:bucketGrowth` (pur).
- Scope : `nation-stats.ts`, `resolveMyPays`, dimension `plateforme_id` / `plateforme_principale`.
- Cockpits existants : `/admin/gouvernement`, `/admin/nation-dashboard`, `/admin/membres/[id]` (fiche 360°).

---

## PRIORITÉ 1 — Persistance du score d'engagement

**Acquis concerné.** Colonne `profiles.score_engagement` (lue partout : fiche 360° `member-360-server.ts:146`, cockpits, `/api/admin/gouvernance`). Calcul réel `engagementScore(m)` (`pastoral-intelligence.ts`) à partir de `pastoral_member_signals`. Bandes : `engagementBand` (`metrics.ts`, seuils 26/51/76) et `engagementLevel`/`ENGAGEMENT_META` (`pastoral-intelligence.ts`, seuils 15/35/60).

**Pourquoi enrichir.** Le score est affiché mais **jamais écrit** → il reste à 0 pour tout membre réel. Objectif : une seule source de vérité, calculée et persistée, visible fiche 360° + cockpits.

**Extension (sans recréation).**
1. **Réutiliser** le calcul existant `engagementScore()` — ne PAS écrire une nouvelle formule.
2. **Étendre le cron existant** `/api/cron/notifications` (déjà ordonnanceur de 10 tâches) d'une tâche « recalcul engagement » : pour chaque membre, lire `pastoral_member_signals`, appliquer `engagementScore`, **écrire** `profiles.score_engagement`. Aucun nouveau mécanisme d'ordonnancement.
3. Les lecteurs (fiche 360°, cockpits, `/api/admin/gouvernance`) lisent déjà la colonne → affichage réel automatique, **zéro changement de comportement** côté lecture.

**Risque de régression.** Très faible : on écrit une colonne qui valait 0 ; les lecteurs sont inchangés.

**Décision à valider (touche un acquis).** Les **deux jeux de seuils** divergent. Option A (recommandée, sans modif) : persister la valeur numérique 0-100 et **conserver** chaque système de bandes tel quel pour l'instant. Option B (modif d'acquis → validation explicite) : unifier les seuils sur le système 6 paliers de `pastoral-intelligence.ts`, ce qui **changerait l'affichage** des bandes de la fiche 360°. → par défaut Option A.

**Migration.** Aucune (colonne existante). Optionnel additif : `profiles.score_engagement_updated_at` (traçabilité) — à valider.

---

## PRIORITÉ 2 — Gouvernement des présences

**Acquis concerné.** `presences-server.ts:groupAttendanceStats(groupeId)` + `attendance.ts:computeAttendanceStats` (pur, testé). Tables `group_reunions`, `group_attendance`. Dimension `groupes.plateforme_id` / `groupes.pays`.

**Pourquoi enrichir.** La présence n'existe qu'au niveau d'UN groupe. Le cockpit gouvernement ne lit jamais `group_attendance`. Objectif : agrégation groupe → plateforme → nation → global.

**Extension (sans recréation).**
1. **Réutiliser** `computeAttendanceStats` (pur) — ne pas réécrire.
2. **Ajouter** dans `presences-server.ts` des agrégateurs de périmètre : `attendanceStatsForGroups(groupeIds)`, puis sélection des groupes par `plateforme_id` / `pays` / tous → agrégat. Même fonction pure de calcul.
3. **Brancher** un bloc « assiduité » dans les cockpits **existants** : `/api/admin/gouvernement` (national/global) et le Dashboard Plateforme (Priorité 3).
4. **Compléter la fiche 360°** : ajouter une section présences (réutiliser `memberReunions`/historique d'assiduité du membre) — comble le manque identifié à l'audit.

**Risque de régression.** Faible (lectures additives ; aucune écriture, aucun schéma touché).

**Décision à valider.** Pour l'échelle, l'agrégation peut rester en JS (réutilise le pur) en V1, ou passer par une **RPC SET-based** dédiée (`group_attendance_agg`) en phase scale. → V1 = JS réutilisant l'existant ; RPC = enrichissement ultérieur.

**Migration.** Aucune en V1 (lecture des tables Chantier 4 existantes).

---

## PRIORITÉ 3 — Dashboard Plateforme (seul élément manquant)

**Acquis concerné.** Patron de cockpit (`/admin/gouvernement`, command-center), dimension `plateforme_id` (groupes) / `plateforme_principale` (profiles), enum des 8 plateformes, métriques déjà calculées (croissance, engagement, présence, formation), scope serveur.

**Pourquoi enrichir.** Seul élément réellement absent. Chaque plateforme doit avoir son cockpit : **Académie des Élus, Mahanaïm, Femmes d'Exceptions, Jeunesse, Familles de la Chapelle, CIER, Cité du Refuge, CFIC**.

**Extension (sans recréation — on assemble l'existant par plateforme).**
1. **Ajouter un axe de scope `plateforme`** À CÔTÉ des axes pays/antenne existants (ne pas créer un nouveau RBAC) : filtrer `profiles` par `plateforme_principale` et `groupes` par `plateforme_id`.
2. **Réutiliser les mêmes métriques** que le national : croissance (P4), engagement persisté (P1), présence agrégée (P2), formation/intégration (acquis). Le cockpit plateforme = même calculs, dimension `plateforme_id`.
3. Une page `/admin/plateforme` avec sélecteur des 8 plateformes (ou `/admin/plateforme/[id]`), réutilisant les composants de cockpit existants.

**Risque de régression.** Faible (cockpit en lecture seule, nouvelle route).

**Décision à valider.**
- **Confirmer le mapping des 8 valeurs `plateforme_id`** (enum) avec les 8 libellés ci-dessus (cohérence Académie/CFIC à trancher).
- Étendre éventuellement `pastoral_member_signals` d'un paramètre optionnel `p_plateforme` (modif d'une RPC acquise → validation), OU filtrer en JS par `plateforme_principale` sans toucher la RPC (option par défaut, sans modif d'acquis).

**Migration.** Aucune (la dimension plateforme existe déjà).

---

## PRIORITÉ 4 — Exploitation de `membre_statut_history`

**Acquis concerné.** Table `membre_statut_history` (écrite par `api/admin/membres/[id]/action` et `api/member/formations/progress`, mais **jamais agrégée**). `bucketGrowth` (`metrics.ts`, time-series pur). `conversionStage` (`pastoral-intelligence.ts`).

**Pourquoi enrichir.** Les transitions de statut sont tracées mais non exploitées : pas de conversions dans le temps, ni progression spirituelle, ni rétention.

**Extension (sans recréation).**
1. **Réutiliser** `bucketGrowth` (pur) — ajouter une lecture agrégée de `membre_statut_history` groupée par `nouveau_statut` et par période → courbe de **conversions de statut**.
2. **Ajouter** des indicateurs dérivés : taux de conversion entre statuts, **rétention** (membres encore actifs après N jours), progression Visiteur→…→Berger dans le temps.
3. **Brancher** ces blocs dans les cockpits existants (gouvernement / national / plateforme) — pas de nouvelle page nécessaire.

**Risque de régression.** Faible (lectures additives sur une table déjà alimentée).

**Décision à valider.** Agrégation JS (réutilise `bucketGrowth`) en V1 vs RPC SET-based pour l'échelle.

**Migration.** Aucune (table existante).

---

## Séquence proposée & dépendances
1. **P1 (score persisté)** — fondation « une source de vérité » ; débloque l'affichage réel partout.
2. **P2 (présences agrégées)** + **P4 (conversions/rétention)** — primitives d'agrégation transverses (réutilisent purs existants).
3. **P3 (Dashboard Plateforme)** — **assemble** P1+P2+P4 par `plateforme_id` ; livré une fois les primitives prêtes.

## Conformité à la règle des acquis
- Aucun nouveau RBAC, système de groupes, notifications, présence ou communication n'est créé.
- Tout est **lecture/agrégation additive** ou **persistance d'un calcul déjà existant**.
- Les 3 seuls points touchant un acquis (unification des seuils d'engagement, paramètre `p_plateforme` sur la RPC, colonne `score_engagement_updated_at`) sont **explicitement signalés** et conditionnés à validation ; des alternatives sans modification sont proposées par défaut.

## Décisions en attente de validation
1. Score : Option A (persister, conserver les bandes) vs Option B (unifier les seuils — change l'affichage 360°).
2. Présence/Conversions : agrégation JS (V1) vs RPC SET-based (scale).
3. Plateforme : confirmer les 8 valeurs `plateforme_id` ↔ libellés ; filtrage JS vs paramètre RPC `p_plateforme`.
4. Colonnes additives optionnelles (`score_engagement_updated_at`) : oui/non.
