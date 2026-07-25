# WM-3 — Mapping champ par champ & modèle LMS cible

## 1. Verdict

**WM3_OK** — mapping signé, ADR LMS verrouillé, politique rôles verrouillée, matrices écrites.  
**Aucun import exécuté.** Preuves exclusivement issues de WM-2 + migrations locales Citadelle.

## 2. Identifiant

| Champ | Valeur |
|-------|--------|
| Mapping ID | `mapping-20260720` |
| Audit source | `audit-20260720-231559` |
| Base audit | `wm1r_restore_isolated` (sandbox) |
| Dépôt cible schéma | `C:\Users\Révérend Doxa\Desktop\cier-platform` |
| Active pointer | `docs-migration-wp\WM-3\_ACTIVE_MAPPING.txt` → `mapping-20260720` |

## 3. Portes d’entrée

| Porte | État |
|-------|------|
| WM-0 gouvernance | OK (historique lots) |
| WM-1 backup/restore | OK `backup-20260720-111659` / restore isolée |
| WM-2 audit | OK `CITADELLE_WP_MIGRATION_WM2_AUDIT_COMPLETE_OK` |
| Schéma Citadelle local | Lu (migrations) — **prod runtime non requise pour mapping** |
| Import / prod write | **Non ouvert** (interdit WM-3) |

## 4. ADR LMS

Voir `WM3-ADR-LMS.md`.

**Décision :** import WP → `formations` + `formation_modules` uniquement.  
Legacy `modules_formation`/`lecons` et `academy_*` exclus du chemin WP.

Marker : `WM3_ADR_LMS_LOCKED`

## 5. Mapping utilisateurs & rôles

Voir `WM3-ROLE-POLICY.md` + lignes `identity/*` dans `evidence/field-mapping.csv`.

- 35 comptes · match email · passwords abandonnés · niveau initial forcé  
- 1 admin exclu batch  
- FluentCRM 33 subscribed → newsletter / CRM avec règle unsub absolue  

Marker : `WM3_ROLE_POLICY_LOCKED`

## 6. Mapping LMS (Tutor → Citadelle)

| WP | Citadelle | Décision |
|----|-----------|----------|
| courses | formations | IMPORTER / RAPPROCHER slug |
| topics | (dérivé ordre/titre) | TRANSFORMER |
| lesson | formation_modules | IMPORTER |
| youtube | youtube_id | RÉFÉRENCER |
| html5 | video_url | IMPORTER/RÉFÉRENCER |
| tutor_enrolled | archive + inscriptions progression 0 | ARCHIVER puis niveau initial |
| quiz/orders | — | ABANDONNER (0) |

Détail cours : `evidence/course-slug-map.csv`.

## 7. Mapping contenus & médias

| Domaine | Décision |
|---------|----------|
| 56 pages Elementor | ARCHIVER source · transformer hors design Next |
| 853 révisions | ABANDONNER |
| 0 posts blog publish | N/A |
| 73 attachments / ~83 originaux FS | IMPORTER originaux |
| ~300 thumbs | abandon après validation régénération |
| 0 menus WP | RECRÉER nav Citadelle/Next |

## 8. CRM / Forms / Sensible

| Domaine | Décision |
|---------|----------|
| FC subscribers | IMPORTER/RAPPROCHER |
| FC campaigns | ARCHIVER (private) |
| FF definitions | RECRÉER |
| FF entries | ABANDONNER (0) |
| Prayer 1 row | ARCHIVER_SENSIBLE_PRIVATE |
| Rank Math redirects | WM-8 |

## 9. Domaines & champs

- Décisions domaine : `evidence/domain-decisions.csv`
- Champ à champ : `evidence/field-mapping.csv` (70+ lignes)

## 10. Protection PII

- Aucun email/téléphone/nom en clair dans ce lot.
- `private/PII_PRIVATE_DO_NOT_COMMIT` présent.
- YouTube unlisted IDs restent dans audit WM-2 `private/` (non recopiés ici).

## 11. Contrôles de non-impact

| Cible | Action WM-3 |
|-------|-------------|
| Sandbox MariaDB | Non interrogée (réutilisation preuves WM-2) |
| Production WP | Non touchée |
| Supabase | Aucune requête |
| Citadelle code | Lecture migrations seule |
| Chapelle Next | Non touché |
| Git push/commit | Non effectués par ce lot |

## 12. Réserves non bloquantes

1. Colonnes exactes runtime prod Supabase non requises pour figer le mapping logique ; validation staging en WM-5/6.  
2. Diff quantitatif seed Citadelle vs 26 leçons P3 à mesurer à l’export WM-4.  
3. 28 attachments leçons : mapping fichier exact en WM-4.

## 13. Livrables

```
docs-migration-wp/WM-3/
  _ACTIVE_MAPPING.txt
  mapping-20260720/
    reports/WM3-REPORT.md
    reports/WM3-ADR-LMS.md
    reports/WM3-ROLE-POLICY.md
    reports/WM3-DECISION-LOCK.md
    evidence/field-mapping.csv
    evidence/course-slug-map.csv
    evidence/domain-decisions.csv
    manifests/MAPPING-MANIFEST.json
    private/PII_PRIVATE_DO_NOT_COMMIT
```

## 14. Prochaine action unique

**Ouvrir WM-4 — Exports normalisés + nettoyage** strictement conformes à ce mapping.  
Interdit : import prod · cutover · suppression sandbox · migration passwords.

## 15. Marqueurs finaux

```
WM3_OK
WM3_MAPPING_LOCKED_OK
CITADELLE_WP_MIGRATION_WM3_MAPPING_LOCKED_OK
```
