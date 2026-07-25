# WM-3 — Decision Lock (mapping signé)

| Champ | Valeur |
|-------|--------|
| Mapping ID | `mapping-20260720` |
| Audit source | `audit-20260720-231559` / DB `wm1r_restore_isolated` |
| Cible schéma | migrations locales `cier-platform` (non prouvées en prod runtime) |
| Mode | Lecture seule · **aucun import exécuté** |

## Décisions verrouillées (exécutoires pour WM-4+)

1. **LMS cible** = `formations` + `formation_modules` (+ youtube/hybrid). Marker ADR : `WM3_ADR_LMS_LOCKED`.
2. **Legacy** `modules_formation`/`lecons` et **`academy_*`** = hors chemin d’import WP.
3. **Passwords WP** = abandon · reset WM-7.
4. **Rôles WP/UM** = non importés · tous non-admin → `visiteur` / `membre_statut=visiteur` / `parcours_disciple_etape=0`.
5. **Admin WP** = exclu du batch automatique.
6. **Progression Tutor** = archive only · inscriptions Citadelle niveau 0 uniquement · **interdit** `video_progress` depuis WP.
7. **YouTube** = `youtube_id` référence seule.
8. **Design / Elementor / Chapelle Next** = hors mapping d’import UI.
9. **PII** = hors git public · coffre `private/` + exports WM-4 chiffrés/contrôlés.
10. **Désabonnements CRM** = jamais perdus / jamais re-opt-in silencieux.

## Ambiguïtés résolues

| Ambiguïté | Résolution |
|-----------|------------|
| Triple modèle LMS | Univers `formation_modules` unique pour import |
| Topics sans table cible | Préfixe + ordre par blocs |
| Enroll status `completed` | Non interprété comme complétion Citadelle |
| Cours seedés vs WP | RAPPROCHER par slug (732/734/736) |
| Private courses | Hors catalogue public sans GO |
| Terms WP | Pas de clone 1:1 |
| Prayer row | Archive sensible only |

## Ambiguïtés reportées (non bloquantes mapping)

| Item | Report |
|------|--------|
| Attachments leçons ↔ fichiers | WM-4 croisement binaire |
| Enum exact `user_role` runtime prod | WM-5 lecture schéma live staging |
| Contenu seed vs leçons WP pour P3 | WM-4 diff quantitatif modules |
| Redirects Rank Math | WM-8 |

## Fichiers constitutifs du lock

- `reports/WM3-ADR-LMS.md`
- `reports/WM3-ROLE-POLICY.md`
- `reports/WM3-REPORT.md`
- `evidence/field-mapping.csv`
- `evidence/course-slug-map.csv`
- `evidence/domain-decisions.csv`
- `manifests/MAPPING-MANIFEST.json`

## Non-réalisé (volontaire)

- Aucun export normalisé (WM-4)
- Aucun script d’import (WM-5)
- Aucune écriture Supabase / WP / sandbox
- Aucun push / commit forcé

## Marqueurs

```
WM3_MAPPING_LOCKED_OK
CITADELLE_WP_MIGRATION_WM3_MAPPING_LOCKED_OK
```
