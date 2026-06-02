# Architecture de gestion — La Chapelle (CIER)

> Document généré le 2026-05-29 — Architecture de gestion de la Chapelle (CIER).
> 8 plateformes · Supabase · mock aujourd'hui, cible production.
> Conçu par orchestration multi-agents (core → 8 modules → synthèse).


## Sommaire

1. [Schéma canonique partagé (Core)](01-core-schema.md) — tables transverses, membres, plateformes, rôles, tunnel d'intégration.
2. Modules par plateforme :
- [CIER — Corps Principal](modules/cier.md)
- [Chapelle Familiale](modules/chapelle-familiale.md)
- [Jeunesse](modules/jeunesse.md)
- [Cité du Refuge](modules/cite-refuge.md)
- [CFIC — Centre de Formation](modules/cfic.md)
- [Femmes d'Exceptions](modules/femmes-exceptions.md)
- [Familles de la Chapelle](modules/familles-chapelle.md)
- [Mahanaïm — Prière](modules/mahanaim.md)
3. [Synthèse transverse](03-synthese.md) — relations entre plateformes, matrice RBAC, dashboard admin global, KPI, tunnel d'intégration global, workflows & emails, roadmap Supabase.

## Couverture des 10 demandes
| # | Demande | Où |
|---|---------|----|
| 1 | Tables Supabase | Core (§1-6) + chaque module (§1) |
| 2 | Relations entre plateformes | Synthèse §1 |
| 3 | Parcours utilisateurs | Chaque module (§2) |
| 4 | Rôles & permissions | Core §6 + Synthèse §2 (matrice RBAC) |
| 5 | Dashboard administrateur | Synthèse §3 |
| 6 | Statistiques à suivre | Chaque module (§5) + Synthèse §4 |
| 7 | Workflows automatiques | Chaque module (§6) + Synthèse §6 |
| 8 | Déclencheurs emails | Chaque module (§7) + Synthèse §7 |
| 9 | Parcours de progression | Chaque module (§3) |
| 10 | Système d'intégration des membres | Core §5 + chaque module (§8) + Synthèse §5 |
