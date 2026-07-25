# WM-3 — Addendum final minimal (couvertures)

| Champ | Valeur |
|-------|--------|
| Mapping | `mapping-20260720` |
| Base | `docs-migration-wp/WM-3/mapping-20260720/` |
| Sources exclusives | livrables WM-3 listés ci-dessous · **aucune re-analyse runtime** |
| Verdict addendum | **`WM3_OK_WITH_RESERVATIONS`** |
| Marqueur APPROVED | **non émis** |

Chemins relatifs à `mapping-20260720/`.

---

## 1. Identités (35)

| Point | Preuve WM-3 | Comptage prouvé |
|-------|-------------|-----------------|
| 35 comptes couverts (règle mapping) | `reports/WM3-ROLE-POLICY.md` § inventaire · `evidence/field-mapping.csv` `volume_hint=35` · `evidence/domain-decisions.csv` `utilisateurs_valides` · `manifests/MAPPING-MANIFEST.json` `volumes_from_wm2.users=35` | **35/35** (décision) |
| Matches Citadelle (emails déjà en `profiles`/`auth.users`) | — | **GAP_WM3** · N matches non mesuré |
| Absents Citadelle (à créer) | — | **GAP_WM3** · N absents non mesuré |
| Ambigus (doublons / collision) | — | **GAP_WM3** · N ambigus non mesuré |

Règles seules (non comptages runtime) : match key email · RAPPROCHER si présent · IMPORTER si absent — `WM3-ROLE-POLICY.md` § règles.

---

## 2. Membership · rôle minimal · niveau initial

| Point | Preuve | Statut |
|-------|--------|--------|
| UM `semence-royale` 34 = signal, **pas** capabilities | `WM3-ROLE-POLICY.md` | **OK** |
| Admin WP 1 = exclu batch | `WM3-ROLE-POLICY.md` · `domain-decisions.csv` `admin_wp` | **OK** |
| Rôle forcé non-admin : `profiles.role=visiteur` | `WM3-ROLE-POLICY.md` · `field-mapping.csv` `force_visiteur` | **OK** |
| Niveau initial : `membre_statut=visiteur` · `parcours_disciple_etape=0` | idem + `WM3-DECISION-LOCK.md` §4 | **OK** |
| Passwords abandonnés 35 | `field-mapping.csv` · `domain-decisions.csv` | **OK** |

---

## 3. Cours 7/7

Preuve : `evidence/course-slug-map.csv` — **7 lignes données** (IDs 732,734,736,738,867,876,879), chacune avec `citadelle_action`.

| Décision | N |
|----------|---|
| RAPPROCHER_SLUG / RAPPROCHER_SLUG_SEED / RAPPROCHER_SLUG_FILL_MODULES | 3 |
| IMPORTER / IMPORTER_SHELL_OU_RECREER | 2 |
| HORS_CATALOGUE_PUBLIC | 2 |
| **Total** | **7/7** |

---

## 4. Leçons 38/38 · 27 sans vidéo

| Point | Preuve | Statut |
|-------|--------|--------|
| 38 → `formation_modules` (décision bulk) | `field-mapping.csv` `lms,lesson,*,…,38` · `WM3-ADR-LMS.md` · `domain-decisions.csv` `topics_lessons` · manifest `lessons=38` | **38/38 OK** |
| 27 sans vidéo classées | `WM3-ADR-LMS.md` cite agrégat WM-2 « 27 lessons without video » ; **pas** de fichier WM-3 listant 27 IDs ni classe dédiée « SANS_VIDEO » | **GAP_WM3** (classification ID-level) |

Couverture décisionnelle globale leçons : **OK**. Couverture 27/27 classées nommément : **GAP_WM3**.

---

## 5. Vidéos 8 YouTube · 3 MP4

| Point | Preuve | Statut |
|-------|--------|--------|
| 8 YouTube → `youtube_id` RÉFÉRENCER | `field-mapping.csv` `volume_hint=8 unique` · `WM3-ADR-LMS.md` · `domain-decisions.csv` `youtube` | **8/8 OK** (agrégat) |
| 3 MP4/HTML5 → `video_url` | `field-mapping.csv` `volume_hint=3` · ADR · `html5_videos` | **3/3 OK** (agrégat) |
| Liste d’IDs YouTube dans WM-3 | explicitement **non recopiée** (`WM3-REPORT.md` §10 → reste WM-2 private) | IDs hors livrable public WM-3 (volontaire) |

---

## 6. Progression 33/33

| Point | Preuve | Statut |
|-------|--------|--------|
| 33 enrollments archivés | `field-mapping.csv` `tutor_enrolled` ×33 · `domain-decisions.csv` `enrollments` · ADR · manifest `enrollments=33` | **33/33 OK** |
| Sans activation `video_progress` / completion | `NE_PAS_IMPORTER_PROGRESSION` · ADR « jamais video_progress » · lock §6 · manifest `video_progress_from_wp:false` | **OK** |

---

## 7. Pages 56/56

| Point | Preuve | Statut |
|-------|--------|--------|
| 56 classées bulk | `field-mapping.csv` `content,page,*,…,56` ×2 (slug + elementor) · `domain-decisions.csv` `pages_elementor=ARCHIVER_SOURCE_TRANSFORMER` · report §7 · manifest `pages=56` | **56/56 OK** (agrégat, pas 56 slugs listés) |

---

## 8. Formulaires 7/7

| Point | Preuve | Statut |
|-------|--------|--------|
| 7 définitions RECRÉER | `field-mapping.csv` `forms,fluentform,form definition,…,7` · `domain-decisions.csv` `fluentforms_defs` | **7/7 OK** (agrégat) |
| Soumissions 0 ABANDONNER | `field-mapping.csv` · `fluentforms_entries` | **OK** |

Pas de table 7 form_id → décision individuelle : agrégat seulement (acceptable si non exigé ID-level).

---

## 9. Médias 73 attachments · 383 fichiers

| Point | Preuve | Statut |
|-------|--------|--------|
| 73 attachments | `field-mapping.csv` `media,attachment,*,…,73` · report §7 · manifest `attachments=73` | **73/73 OK** |
| 383 fichiers FS | **aucune** occurrence de `383` dans les livrables WM-3 ; report ne donne que « ~83 originaux / ~300 thumbs » | **GAP_WM3** (comptage 383 non prouvé dans WM-3) |
| Politique originaux vs thumbs | `domain-decisions.csv` `medias_originaux` / `thumbnails` | politique **OK** · volume 383 **GAP** |

---

## 10. Contrat WM-4

| Élément exigé | Présent dans WM-3 ? | Preuve / gap |
|---------------|---------------------|--------------|
| Fichiers export attendus (liste normalisée) | **Non** dédié | **GAP_WM3** |
| Colonnes cibles | **Partiel** | `field-mapping.csv` (target_table/field) |
| Règles de rejet | **Partiel** | ABANDONNER / NE_PAS_* / HORS_CATALOGUE dans CSV + lock |
| Quarantaines formalisées | **Partiel** | `private/` PII · prayer ARCHIVER_SENSIBLE · admin exclu · private courses ; **pas** de registre quarantaine WM-4 | **GAP_WM3** contrat complet |

---

## 11. Tables LMS retenues / écartées

| Tables **retenues** (chemin import) | Preuve |
|-------------------------------------|--------|
| `formations` | ADR · manifest `lms_target` · field-mapping |
| `formation_modules` | idem |
| `inscriptions_formation` (niveau 0 only) | idem |

| Tables **explicitement écartées** | Preuve |
|-----------------------------------|--------|
| `modules_formation` / `lecons` (legacy) | ADR · `domain-decisions.csv` `legacy_modules_lecons` · manifest `false` |
| `academy_*` | ADR · `academy_star` · manifest `false` |
| `video_progress` / `module_completions` **depuis WP** | ADR · lock §6 · manifest `video_progress_from_wp:false` |
| `wp_tutor_*` quiz/orders (0) | field-mapping ABANDONNER |

**OK** · couverture tables **11/11** exigée ici.

---

## 12. Limites preuve runtime Citadelle

| Limite | Preuve WM-3 |
|--------|-------------|
| Schéma = migrations locales seulement | `WM3-DECISION-LOCK.md` en-tête · `WM3-REPORT.md` §3/§12 |
| Prod Supabase non interrogée | report §11 |
| Match users/formations live non fait | report §12 · **implique GAP §1** |
| Enum `user_role` runtime reporté WM-5 | lock « ambiguïtés reportées » |

**OK** (limites documentées).

---

## Synthèse gaps avant WM-4

| ID | Gap |
|----|-----|
| G1 | Comptages identité vs Citadelle : matches / absents / ambigus |
| G2 | 27 leçons sans vidéo : pas de classification ID-level dans WM-3 |
| G3 | 383 fichiers FS : comptage non porté dans livrables WM-3 |
| G4 | Contrat WM-4 : liste fichiers export + registre rejet/quarantaine formalisé |

---

## Marqueurs

```
WM3_OK_WITH_RESERVATIONS
```

**Non émis :** `CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK`  
(raison : G1–G4 non résolus dans les fichiers WM-3 existants)

Conservés (lots antérieurs) : `WM3_MAPPING_LOCKED_OK` · `WM3_ADR_LMS_LOCKED` · `WM3_ROLE_POLICY_LOCKED` — mapping **signé**, approbation couverture runtime **non**.

## Interdits respectés

Aucun import · aucun export WM-4 · aucune modification code/DB · aucun push.
