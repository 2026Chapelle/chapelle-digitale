# Plan d'exécution — PRIORITÉ 1 : Persistance du score d'engagement

> Extension d'acquis (règle [[regle-acquis]]). **Option A validée** : persister le score, **conserver les bandes actuelles**. Aucune nouvelle colonne, aucune nouvelle RPC, aucun nouveau moteur. Aucun développement tant que ce plan n'est pas validé.

## 1. Objectif
Le calcul d'engagement existe et est juste, mais **n'est jamais écrit** → `profiles.score_engagement` reste à 0. On le **persiste** pour qu'il devienne la **source unique** affichée fiche 360° + cockpits, sans changer aucune formule ni aucun affichage.

## 2. Acquis réutilisés (rien de recréé)
| Acquis | Rôle | Réutilisation |
|---|---|---|
| `profiles.score_engagement` (colonne 0-100) | stockage | **cible d'écriture** (existe déjà) |
| `engagementScore(m)` — `src/lib/pastoral-intelligence.ts:67` | formule pure testée | **source unique de la formule** (appelée telle quelle) |
| RPC `pastoral_member_signals(p_pays default null)` | signaux/membre | appelée avec `p_pays = null` → **tous les membres** |
| Dérivation `active_days_30` — `api/admin/gouvernement/route.ts:80-86` | jours actifs (30 j) depuis `analytics_sessions` | **même logique** (à mutualiser) |
| Cron `/api/cron/notifications` | ordonnanceur (secret + journalisation) | **hôte** d'une tâche supplémentaire |
| `engagementBand` — `src/lib/pastoral/metrics.ts:14` | bandes fiche 360° | **inchangé** (Option A) |

## 3. Inputs exacts de la formule
`engagementScore` n'utilise QUE : `active_days_30`, `prieres`, `formations`, `lives`, `downloads`, `events`, `dons` (cf. `pastoral-intelligence.ts:67-79`). Donc pour **persister la valeur numérique**, ni `last_seen` ni `created_at` ne sont nécessaires (ils ne servent qu'aux niveaux/alertes, hors scope P1).
- Signaux (prieres…dons) → RPC `pastoral_member_signals(null)`.
- `active_days_30` → comptage des jours distincts de `analytics_sessions.last_seen` sur 30 j (logique identique à la route).

## 4. Architecture de l'extension
```
LIB (mutualisation, source unique du merge) :
  src/lib/pastoral/engagement-server.ts  ← NOUVEAU helper serveur (service role)
     computeEngagementScores() : RPC signals + active_days_30 (sessions) → Map<user_id, score>
     en appelant la formule PURE engagementScore() (aucune nouvelle formule)

CRON (hôte existant) :
  /api/cron/notifications  ← + 1 tâche « recalcul engagement »
     appelle computeEngagementScores() → écrit profiles.score_engagement (par lots)

LECTEURS (inchangés) :
  member-360-server.ts:146 + engagementBand  → affiche la vraie valeur automatiquement
  /api/admin/gouvernance (<20) ; cockpits     → reflètent le réel
```

## 5. Étapes (lots)
**Lot 1 — Helper serveur mutualisé `engagement-server.ts`**
- `computeEngagementScores({ pays? })` : appelle la RPC (p_pays=null par défaut), dérive `active_days_30` depuis `analytics_sessions`, construit l'objet minimal par membre, applique `engagementScore()` (pur), renvoie `Map<user_id, number>`.
- Repli JS strict si la RPC est absente (réutilise le même repli que la route — chiffres identiques). Aucune écriture ici (calcul pur côté données).

**Lot 2 — Tâche cron de persistance**
- Ajouter une tâche dans `/api/cron/notifications` (réutilise son **secret** + sa **journalisation**), qui : appelle `computeEngagementScores()`, puis **écrit** `profiles.score_engagement` par **lots** (`.update({score_engagement}).eq('id', uid)` groupés, ex. 200-500/batch — conservateur, n'écrit que cette colonne).
- Idempotent (recalcule et écrase à chaque passage) ; fréquence : quotidienne (passage cron existant).

**Lot 3 — (optionnel, à valider) Mutualisation route gouvernement**
- Faire lire au `/api/admin/gouvernement` le même helper pour le merge signals+active_days (zéro doublon). **Touche un acquis** → optimisation **préservant le comportement** (mêmes chiffres). Par défaut **non inclus** en P1 si tu préfères ne pas toucher la route ; le helper duplique alors temporairement le merge (formule, elle, jamais dupliquée).

**Vérification**
- Après un passage cron : un membre actif a un `score_engagement` > 0 cohérent avec la formule ; la fiche 360° affiche la vraie bande ; `/api/admin/gouvernance` ne lève plus l'alerte <20 à tort.

## 6. Écriture (sans nouvelle colonne, sans RPC)
- Mise à jour **par membre, en lots** de la seule colonne `score_engagement` (service role). Pas d'`updated_at` (refusé). Pas d'upsert risqué sur `profiles`.
- Scale (note) : pour de très gros volumes, un `UPDATE ... FROM` SET-based serait plus rapide — **différé** (l'utilisateur a écarté toute nouvelle RPC pour l'instant). V1 = lots applicatifs.

## 7. Tests
- La formule `engagementScore` est **déjà testée** (`pastoral-intelligence.test.ts`) — inchangée.
- Ajouter des tests **purs** sur toute logique pure extraite dans le helper (ex. comptage `active_days_30` à partir d'une liste de sessions → fonction pure testable ; mapping signals→score). Aucune écriture testée (I/O).
- `engagementBand` inchangé (Option A) — pas de nouveau test de bande.

## 8. Risque de régression
- **Très faible.** On écrit une colonne qui valait 0 ; aucun lecteur n'est modifié ; aucune formule, aucune bande, aucun schéma touché.
- Effet attendu (voulu) : les écrans qui affichaient 0 afficheront désormais la vraie valeur — c'est l'objectif, pas une régression.
- Mitigation : tâche cron **best-effort journalisée** (un échec n'affecte pas les autres tâches) ; repli JS si RPC absente.

## 9. Conformité règle des acquis
- Aucune refonte, aucun nouveau moteur : la **formule** (`engagementScore`) et les **bandes** (`engagementBand`) restent les sources uniques inchangées.
- Le seul point touchant un acquis (Lot 3, mutualisation de la route) est **optionnel, préservant le comportement**, et **soumis à validation**. Par défaut on ne touche pas la route.

## 10. Hors-scope P1 (verrouillé)
- ❌ Nouvelle colonne (`score_engagement_updated_at` refusé).
- ❌ Nouvelle RPC.
- ❌ Unification des seuils / changement des bandes (Option B écartée).
- ❌ Réécriture des lecteurs (fiche 360°, cockpits) — ils consomment déjà la colonne.

## 11. Migration
**Aucune.** La colonne `profiles.score_engagement` existe déjà.

## Décisions à confirmer avant exécution
1. **Lot 3** (mutualiser la route gouvernement, behavior-preserving) : inclure maintenant, ou laisser la route intacte et accepter un merge dédié au cron ? *(défaut : route intacte)*
2. **Fréquence** du recalcul : quotidienne via le cron existant ? *(défaut : oui)*
3. **Taille de lot** d'écriture (ex. 200-500) : valeur par défaut acceptée ?
