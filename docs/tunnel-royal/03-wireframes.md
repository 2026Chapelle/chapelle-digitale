# 03 — Wireframes (maquettes basse fidélité)

Toutes les pages sont en **thème sombre cinématique**, largeur `container-royal`
(max 1280px), mobile-first.

## /parcours — La carte du voyage
```
┌──────────────────────────────────────────────┐
│  [navbar fixe]                                 │
│                                                │
│        ✶ LE PARCOURS DU ROYAUME ✶              │
│        Du Visiteur au  LEADER (or)             │
│        sous-titre rassurant                    │
│   ┌──────────────────────────────────────┐    │
│   │ ① ─ ② ─ ③ ─ ④ ─ ⑤ ─ ⑥ ─ ⑦  (rail or) │    │  ← TunnelProgress horizontal
│   └──────────────────────────────────────┘    │
│                                                │
│   ┌── carte étape 1 ───────────────────────┐   │
│   │ [icone] Visiteur · rôle   « promesse » │   │  ← 7 cartes empilées
│   │ déclencheur…                 [CTA →]   │   │
│   └────────────────────────────────────────┘   │
│   … (×7)                                        │
│                                                │
│   [ Entrer dans le parcours ]  (CTA or)        │
└──────────────────────────────────────────────┘
```

## /integration — Accueil nouveaux arrivants
```
HERO : « Vous venez d'arriver ? Vous êtes déjà chez vous »
       + barre de progression compacte (étape Intégration)
─────────────────────────────────────────────
3 ÉTAPES  [accueilli] [trouve ta place] [démarre]
─────────────────────────────────────────────
2 colonnes :
  gauche : « ce que vous recevez » (4 puces)
  droite : CARTE OR → TunnelLeadForm (kit bienvenue, +tel, intérêts)
─────────────────────────────────────────────
CTA → /communaute
```

## /communaute — La famille
```
HERO : « Vous n'êtes pas un spectateur, vous êtes de la famille »
─────────────────────────────────────────────
4 PILIERS (cellules / rdv / groupes / 120 nations)
─────────────────────────────────────────────
8 PLATEFORMES (grille de cartes cliquables)
─────────────────────────────────────────────
CTA → /servir
```

## /servir — Équipes de service
```
HERO : « Vous avez reçu. À votre tour de donner »
─────────────────────────────────────────────
8 ÉQUIPES (louange, média, accueil, intercession…)
─────────────────────────────────────────────
3 RAISONS DE SERVIR (01 / 02 / 03 grands chiffres or)
─────────────────────────────────────────────
CARTE OR → TunnelLeadForm (candidature, +tel +message +équipes)
─────────────────────────────────────────────
CTA → /partenaires
```

## /partenaires — Sommet : partenariat & leadership
```
HERO : « Bâtir le Royaume, ensemble »
─────────────────────────────────────────────
BANDEAU IMPACT (120+ / 24-7 / 50+)
─────────────────────────────────────────────
3 NIVEAUX  [Partenaire] [⭐ Partenaire Royal] [Bâtisseur]
           (carte du milieu surélevée + badge)
─────────────────────────────────────────────
#contact-leader : CARTE → TunnelLeadForm (entretien leadership)
```

## Dashboard membre /member/dashboard/parcours (enrichi)
```
[header existant + mentor]
┌──────────────────────────────────────────────┐
│ 👑 Votre place dans le Royaume   Étape: Disciple│  ← AJOUT
│  ① ─ ② ─ ③ ─ ④ ─ ⑤ ─ ⑥ ─ ⑦  (TunnelProgress)  │
└──────────────────────────────────────────────┘
[KPI stats existants]  [parcours XP existant]…
```

## Principes responsive
- Grilles : `1 col` mobile → `2` tablette → `3-4` desktop.
- `TunnelProgress` horizontal : labels masqués < 640px (icônes seules).
- Formulaires : champs empilés mobile, 2 colonnes ≥ 640px.
- CTA sticky mobile conservé sur les pages de décision.
