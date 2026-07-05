# Roadmap Communautaire — V1 / V2 / V3

> Système communautaire de Citadelle. V1 = indispensable, V2 = recommandé, V3 = avancé.

## 🟢 V1 — Indispensable (socle communautaire) — Chantier 3

Modèle canonique `public.groupes` + `public.membres_groupe` (sur `profiles`).

- **DB** : delta additif — `plateforme_id` obligatoire, `responsable_id` (référence principale), `parent_id`, `niveau` (default 1), `code`, `pays/ville/zone`, `capacite_max` ; `membres_groupe.is_primary`, `statut`, `date_sortie`, `updated_at` ; index + RLS + triggers (`is_primary` unique, `membres_count`).
- **RBAC** : permissions `can_manage_groups` / `can_view_group_members` / `can_supervise_community` + `group-scope.ts` (all/nation/assigned/denied).
- **CRUD groupes** : admin global + responsable national scopé.
- **Adhésion encadrée** : rejoindre (demande) → approbation → `membres_groupe`.
- **Leadership** : `responsable_id` + rôles locaux `membres_groupe.role`.
- **Vues** : annuaire public, « Mes Groupes » (membre, multi-groupes + `is_primary`), dashboard leader (ses membres), section Communauté de la fiche 360°.
- **Notifications** d'adhésion (réutilise le moteur).

### Découpage V1 (4 lots)
1. **Lot 1 — Socle DB + RBAC** : migration + `group-scope` + perms + tests purs.
2. **Lot 2 — APIs** : `/api/admin/groupes` (CRUD + membres) + `/api/member/groupes` + flux approbation + notifications.
3. **Lot 3 — UI** : admin (CRUD + Demandes), membre (branché réel + `is_primary`), annuaire public, vue leader, fiche 360°.
4. **Lot 4 — QA + déploiement** : type-check, tests, build, ZIP standalone, rapport.

## 🟡 V2 — Recommandé

- **Multiplication de cellules** (`parent_id`, `niveau`) : cellule mère → cellules filles.
- **Réunions & présences** → **Chantier 4** (assiduité, alertes d'absence).
- **Messagerie / annonces ciblées par groupe** (extension du Centre de Communication).
- **Statistiques de groupe** (effectif, croissance, rétention) → alimente Gouvernement V2.
- **Transfert** de membre entre cellules ; co‑leaders multiples ; gestion de capacité.
- **Rattachement** d'événements & cohortes de formation aux groupes.

## 🔵 V3 — Avancé

- **Santé des cellules** (scoring) + alertes pastorales (réutilise `pastoral_alerts`).
- **Cartographie** géographique des cellules (`pays/ville/zone` + coordonnées).
- **Pipeline de leadership** : détection de leaders émergents (lié au statut spirituel).
- **Affectation intelligente** : membre orphelin → cellule la plus proche/adaptée.
- **Supervision multi-niveaux** (plateforme → national → global) + tableaux d'escalade.

## Dépendances & ordre strict

```
Chantier 3 (Communauté V1) → Chantier 4 (Présences) → Chantier 5 (Gouvernement V2)
```

Aucun développement V2/V3 avant validation complète de la V1.
