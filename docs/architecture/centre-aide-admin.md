# Centre d'Aide Administrateur

> Couche d'assistance **additive** : aucun module métier touché, aucun RBAC/groupes/présences/communication/notifications modifié. Règle des acquis respectée.

## Objectif
Aider admin & super_admin à comprendre et piloter Citadelle via des guides intégrés + des bulles contextuelles discrètes.

## Architecture (source unique, zéro duplication)
```
CONTENU  src/lib/help/guides.ts        ← GUIDES[] (13 guides / 11 catégories) + searchGuides + guideForPath (PURS)
COMPOS.  src/components/features/help/  ← HelpTooltip · HelpPanel · HelpSearch · AdminHelpBubble
PAGE     src/app/(admin)/admin/aide/page.tsx  ← recherche + catégories + panneaux (ancrage #guide-<id>)
BULLE    src/app/(admin)/layout.tsx     ← <AdminHelpBubble/> monté UNE fois (usePathname → guideForPath)
NAV      AdminSidebar                   ← lien « Centre d'aide » (/admin/aide)
```

## Accès
`/admin/aide` est sous le layout `(admin)` déjà protégé par le cookie back-office → **admin / super_admin uniquement**, sans nouveau RBAC.

## Bulles contextuelles
Montées une seule fois dans le layout : la bulle (icône `?` dorée flottante, texte court, lien « Voir le guide ») s'affiche uniquement sur les pages ayant un guide via `paths`. Pages couvertes : `/admin/dashboard`, `/admin/membres`, `/admin/membres/[id]`, `/admin/communication`, `/admin/groupes`, `/admin/reunions`, `/admin/gouvernement`, `/admin/nation-dashboard`, `/admin/global-command`. **Aucune page métier éditée.**

## Catégories (11)
Tableau de bord · Membres · Fiche 360° · Communication · Groupes/Cellules · Présences/Réunions · Alertes pastorales · Gouvernement pastoral · Plateformes · Paramètres · Déploiement/Maintenance.

## Chaque guide
titre · objectif · quand l'utiliser · étapes · erreurs fréquentes · lien vers la page concernée · `tip` (bulle) · `paths` (où la bulle s'affiche).

## Évolutivité
Enrichir l'aide = **ajouter un objet dans `GUIDES`** (rien d'autre à toucher). Toute nouvelle page devient « aidable » en lui associant un guide + `paths`.

## Vérifications
type-check ✅ · tests 266/266 (+11 `help-guides.test.ts`) ✅ · build ✅ (`/admin/aide` générée).
