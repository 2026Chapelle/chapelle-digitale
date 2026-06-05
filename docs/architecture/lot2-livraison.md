# Livraison — Chantier 3 · LOT 2 (APIs Communauté V1)

> Statut : **VALIDÉ**. APIs uniquement (aucune UI). ZIP regroupé avec le Lot 3.

## Organisation multi-agents
Code écrit de façon centralisée (service unique `groups-server`, zéro doublon) ; 5 agents QA spécialisés lancés en parallèle (lecture seule) : Architecture, Backend/API, Supabase-RBAC-Sécurité, Tests/QA, Documentation.

Verdicts : Sécurité **GO** (aucune faille exploitable) ; autres GO avec réserves — toutes traitées avant livraison.

## Réserves traitées
| Réserve | Correction |
|---|---|
| Faux `{ok:true}` sur cible inexistante (remove_member/set_role) | détection 0-ligne → `Error('Appartenance introuvable.')` |
| « leader ne change pas pays/capacité » non testé | helper pur `pickAllowedInfos` + test |
| Calcul `is_primary` de `addMember` non testé | helper pur `decidePrimaryOnAdd` + 4 tests |
| Adhésion perdue si groupe non résolu | `console.warn` de traçabilité |
| `assigned` sans `uid` non verrouillé | test ajouté |
| Bornes niveau/capacité | 6 tests ajoutés |
| Écart doc `responsable_integration` | précision dans `rbac-communaute-v1.md` |

## Endpoints

### `/api/admin/groupes` (cookie super_admin, portée `all`)
- `GET` `?members=<id>` · `?requests=1` · `?plateforme_id&type&statut`
- `POST {action}` : create · update · archive · add_member · remove_member · set_role · set_primary · approve_request · reject_request

### `/api/member/groupes` (session, scope `resolveGroupScope`)
- `GET` défaut → `{ mes_groupes, annuaire, demandes, scope }` · `?manage=1` · `?manage=1&members=<id>`
- `POST` self : join · leave · set_primary
- `POST` gestion (`can_manage_groups` + périmètre) : create · update · archive · add_member · remove_member · set_role
- `POST` animation locale (périmètre **ou** leader) : approve_request · reject_request · update_infos

### `/api/admin/submissions/[resource]` — hook
- adhésion `accepte` → `onJoinRequestAccepted` (matérialise l'appartenance, idempotent).

## Décisions techniques
- Service unique `groups-server.ts` (zéro doublon) ; routes = auth + scoping + délégation.
- Séparation pur/impur : `group-scope`, `groups-access`, `membership` (purs, testés) ; I/O en service role.
- `is_primary` : source de vérité = trigger SQL ; helpers TS purs pour cohérence (premier groupe → principal ; bascule à la sortie).
- `responsable_id` canonique ; `leader_id` synchronisé par trigger.
- Double barrière membre : self/leader avant `can_manage_groups` (animation locale).
- `resolveGroupId` multi-format (uuid → code → nom).

## Sécurité (GO)
Élévation bloquée (double garde) · IDOR national/intégration fermé (`getGroup`+`canScopeManageGroup` avant écriture) · approbation leader bornée au groupe de la demande · self-service sur `sp.uid` · RLS minimale, écriture service role · 2 axes RBAC non mélangés.

## Vérifications
- type-check vert · `vitest` 232/232 verts · build « Compiled successfully » (2 routes présentes).
- Aucun test d'intégration runtime Supabase (pas d'accès DB) — I/O validée par revue + build.

## Périmètre respecté
Pas d'UI / dashboard / fiche 360° / annuaire public (la fonction `directory()` est interne). `parent_id`/`niveau` posés mais non exploités (V2).

## Réserves résiduelles (mineures)
- Codes HTTP POST : 400 systématique (vs 404/500 plus fins).
- `createJoinRequest` n'accepte que l'UUID (l'app l'envoie toujours).
- Double-notification possible si une adhésion est traitée par deux chemins (sans doublon d'appartenance).
