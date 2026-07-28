# WM-3.13 — Impact LMS sur la progression

- **Lot** : WM-3.13
- **Date** : 2026-07-28
- **Mode** : analyse code, lecture seule.

## 0. Question

Les 3 leçons quarantainées (`draft`) empêchent-elles la complétion du parcours `le-chemin-des-elus` ou faussent-elles la progression ? **Non.**

## 1. Preuves

### Dénominateur de progression = modules publiés uniquement
`recompute` compte `formation_modules … .eq('status','published')` → `total` (`src/app/api/member/formations/progress/route.ts:25-27`), puis `progression = Math.round((done/total)*100)` (`:31`). Un module `draft` **n'entre pas dans `total`** → ne peut jamais empêcher d'atteindre 100 %.

### Exclusion cohérente sur tous les chemins
- Verrou inter-parcours : `parcours-gate-server.ts:63` (`.eq('status','published')`).
- Certificat d'intégration : `integration-progress-server.ts:55` (`.eq('status','published')`).
- Affichage membre : liste filtrée `status='published'` (`api/member/formations/[id]/modules/route.ts:87`).

### Complétion / certificat atteignables
`statut = progression >= 100 ? 'termine' : 'actif'` (`progress/route.ts:32`) ; certificat déclenché à `progression >= 100` (`:110,128-138`). Avec les 3 modules en `draft` hors `total`, le cours peut atteindre 100 %, passer `termine` et certifier sans eux.

### Aucune leçon active vide exposée
Un `draft` est invisible (RLS + filtres API) et non-validable (`progress/route.ts:68-69`). Un module sans vidéo jouable est refusé (`video-validation.ts:96-102`). Aucune « leçon active sans média » n'est donc présentée au membre.

## 2. Contraste avec l'import « en l'état » (non quarantainé)

Sans quarantaine, un module publié pointant vers une vidéo 404 resterait au dénominateur mais jamais validable → parcours **jamais 100 %** (`WM-3.11/WM311-R2-MEDIA-MATRIX.csv:2-4`, `impact = bloque_completion...`). La quarantaine `draft` **neutralise précisément ce risque** (`WM-3.12/WM312-PRE-MED-04-REEVALUATION.md:40`).

## 3. Conclusion

Les 3 leçons en quarantaine `draft` :
- n'apparaissent pas au membre ;
- ne comptent pas dans la progression obligatoire ;
- n'empêchent pas la complétion ni la certification du cours ;
- restent réactivables sans recréation (voir `WM313-VIDEO-QUARANTINE-CONTRACT.md §3`).

Impact net sur la progression : **nul et non bloquant**.
