# WM-3.1 — Verdict final

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.1 — Fermeture des quatre gaps de WM-3` |
| Branche | `stabilisation-p0-recette-citadelle` |
| Baseline documentaire | `8906b4c — docs(migration): integrate WM-2 and WM-3 evidence` |
| Base | `docs-migration-wp/WM-3.1/` |
| Contrôles automatisés | **42 / 42 PASS**, 0 FAIL, 1 INFO — `evidence/wm31-controls.json` |
| Manifeste | `manifests/WM31-MANIFEST.json` · `manifests/SHA256SUMS.txt` (19 fichiers) |
| Verdict | **`WM31_OK_WITH_RESERVATIONS`** |
| Marqueur d'approbation | **non émis** |

---

## 1. État des quatre gaps

| Gap | Objet | Livrable | État |
|-----|-------|----------|------|
| **G1** | 35 identités comparées par empreinte normalisée | `WM31-IDENTITIES-REPORT.md` + `WM31-IDENTITIES-MATRIX.csv` | **FERMÉ** |
| **G2** | 27 leçons sans vidéo qualifiées individuellement | `WM31-LESSONS-WITHOUT-VIDEO-REPORT.md` + matrice | **FERMÉ** |
| **G3** | 383 fichiers physiques classés | `WM31-PHYSICAL-FILES-REPORT.md` + inventaire | **FERMÉ** |
| **G4** | Contrat technique de WM-4 défini intégralement | `WM31-WM4-EXPORT-CONTRACT.md` | **FERMÉ** |

Les quatre gaps ouverts par `WM3-ADDENDUM-FINAL.md` sont fermés, chacun adossé à une matrice
exhaustive et à une réconciliation arithmétique vérifiée mécaniquement.

---

## 2. Chiffres de fermeture

### Gap 1 — 35/35

| Classe | N |
|--------|---|
| `ALREADY_PRESENT` | 4 |
| `ABSENT` | 30 |
| `AMBIGUOUS` | 0 |
| `INVALID_EMAIL` | 0 |
| `DUPLICATE_SOURCE` | 0 |
| `PRIVILEGED_ACCOUNT` | 1 |
| **Total** | **35** |

### Gap 2 — 27/27

| Classe | N | | Décision | N |
|--------|---|---|----------|---|
| `TEXT_VALID` | 8 | | Migrable | 8 |
| `INCOMPLETE` | 19 | | Migrable avec réserve | 19 |
| `DOCUMENT_VALID` | 0 | | Quarantaine | 0 |
| `TEXT_AND_DOCUMENT_VALID` | 0 | | Décision humaine | 19 |
| `EMPTY` | 0 | | | |
| `VIDEO_REFERENCE_FOUND_ELSEWHERE` | 0 | | | |
| `TO_REVIEW` | 0 | | | |
| **Total** | **27** | | | |

### Gap 3 — 383/383

| Classe | N |
|--------|---|
| `THUMBNAIL` | 281 |
| `ORIGINAL_USED` | 60 |
| `ORIGINAL_UNUSED` | 9 |
| `EXACT_DUPLICATE` | 23 |
| `GENERATED_VARIANT` | 8 |
| `ORPHAN` | 1 |
| `CORRUPT` | 1 |
| `PROBABLE_DUPLICATE` | 0 |
| `REFERENCED_MISSING_CONTEXT` | 0 |
| `UNCLASSIFIED_REVIEW_REQUIRED` | 0 |
| **Total** | **383** |

### Gap 4 — 18/18 éléments contractuels

Fichiers · formats · encodage · schémas · colonnes · types · valeurs nulles · sources · cibles ·
transformations · rejets · quarantaines · checksums · manifestes · contrôles pré-export ·
contrôles post-export · réconciliation · formule obligatoire.

---

## 3. Réconciliation `SOURCE_TOTAL = EXPORTABLE + REJECTED + QUARANTINED`

| Domaine | Source | Exportable | Rejeté | Quarantaine | Delta |
|---------|--------|------------|--------|-------------|-------|
| identity | 35 | 34 | 1 | 0 | **0** |
| lms · cours | 7 | 5 | 2 | 0 | **0** |
| lms · leçons | 38 | 38 | 0 | 0 | **0** |
| lms · inscriptions | 33 | 33 | 0 | 0 | **0** |
| media | 383 | 69 | 313 | 1 | **0** |
| content · pages | 56 | 56 | 0 | 0 | **0** |
| forms | 7 | 7 | 0 | 0 | **0** |
| crm | 33 | 33 | 0 | 0 | **0** |

Huit domaines, huit deltas nuls.

---

## 4. Contrôles obligatoires avant verdict

| Contrôle exigé | Résultat |
|----------------|----------|
| `35/35` identités classées | ✅ |
| `27/27` leçons classées | ✅ |
| `383/383` fichiers classés | ✅ |
| Aucune donnée privée suivie par Git | ✅ 0 email, 0 téléphone, 0 hash, 0 `private/`, 0 SQL, 0 archive |
| Aucune donnée source ou cible modifiée | ✅ 0 écriture WordPress / Supabase / Citadelle |
| Aucun export WM-4 produit | ✅ `docs-migration-wp/WM-4/` inexistant |
| Tous les totaux réconciliés | ✅ 8/8 domaines, delta 0 |
| Toutes les conclusions reliées à une preuve | ✅ |
| Contrat WM-4 complet | ✅ 18/18 |

Détail machine : `evidence/wm31-controls.json` — **42 contrôles bloquants, 42 PASS, 0 FAIL**,
plus 1 contrôle informatif (`C6-06`).

### Observation `C6-06` — dérive de l'arbre de travail hors périmètre

Pendant l'exécution de ce lot, un chantier tiers « mode hors ligne » a modifié l'arbre de travail
en dehors du périmètre WM-3.1 :

```
 M src/app/(member)/member/dashboard/ressources/page.tsx
 M src/components/features/member/MemberSidebar.tsx
?? src/app/(member)/member/dashboard/hors-ligne/
?? src/app/api/member/offline/
?? src/components/features/offline/
?? src/lib/offline/
```

Ces fichiers ne sont **pas** produits par WM-3.1, qui n'a écrit que dans
`docs-migration-wp/WM-3.1/`. Ils n'ont été ni lus pour décider, ni modifiés, ni ajoutés à l'index.
Ils sont signalés ici pour que le `git status` final soit interprété correctement.

Les 7 entrées présentes avant le lot (`.claude/settings.local.json`, les 3 scripts de déploiement,
les 3 artefacts Chapelle Home) sont inchangées — contrôle `C6-05`.

---

## 5. Réserves — pourquoi le marqueur d'approbation n'est pas émis

Le périmètre de WM-3.1 est intégralement couvert. Deux constats **nouveaux**, découverts pendant
la fermeture des gaps, portent sur l'état réel des données et non sur la complétude de ce lot.
Ils sont formalisés comme contrôles pré-export de WM-4, en échec connu.

### R1 — Doublons d'identité côté cible (`PRE-ID-03`, bloquant)

Citadelle héberge **13 `profiles` pour 5 empreintes canoniques** : deux groupes de doublons
(6 comptes et 4 comptes) correspondant chacun à une seule boîte gmail réelle, dédoublée par
variantes ponctuées ou taguées.

Impact : les 4 rapprochements de WM-3.1 restent déterministes (égalité stricte, cible unique).
Mais importer 30 identités supplémentaires dans une table déjà porteuse de doublons aggraverait
le défaut. Décision humaine requise avant WM-4.

Preuve : `WM31-IDENTITIES-REPORT.md` §4 · `evidence/gap1-identities-summary.json`
→ `citadelle_target_duplicate_groups`.

### R2 — Cinq références média sans objet (`PRE-MED-04`, bloquant)

Trois vidéos HTML5 (`34548`, `34555`, `34577`) et deux pièces jointes de leçon (`34549`, `34553`)
sont référencées par les leçons, mais :

- n'existent pas dans `wp_posts` (ID maximal observé : 1481) ;
- n'existent pas dans les 383 fichiers de la sauvegarde (répertoire `2025/06` absent, aucun `.mp4`).

Impact : la règle WM-3 « 3 MP4 → `video_url` » reste applicable en tant que référence d'URL, mais
aucun octet vidéo n'est récupérable depuis la sauvegarde WM-1 si un rapatriement devenait
nécessaire.

Preuve : `WM31-PHYSICAL-FILES-REPORT.md` §6 · `WM31-LESSONS-WITHOUT-VIDEO-REPORT.md` §7.

### R3 — 19 leçons en attente d'arbitrage éditorial (non bloquant)

19 des 27 leçons sans vidéo portent un marqueur d'inachèvement laissé par l'auteur
(`[Insérer vidéo + développement]`). Techniquement exportables, elles ne sont pas publiables en
l'état sans décision éditoriale et pastorale.

Preuve : `WM31-LESSONS-WITHOUT-VIDEO-REPORT.md` §2 et §4.

---

## 6. Rectifications apportées à des chiffres antérieurs

| Chiffre antérieur | Source | Chiffre WM-3.1 | Fondement |
|-------------------|--------|----------------|-----------|
| « ~83 originaux » | WM-3 `WM3-REPORT.md` §7 (repris de WM-2 `t08-dup-size-summary.txt`) | **73 originaux** | `_wp_attached_file` en base, 73/73 présents sur disque |
| `dup_size_groups=4` (échantillon) | WM-2 `t08-dup-size-summary.txt` | **23 groupes** | passe SHA-256 intégrale sur les 383 fichiers |
| « 28 pièces jointes de leçon » | WM-2 `t05-tutor-cpt-meta-keys.tsv` | **2 pièces jointes réelles** | 26 valeurs `a:0:{}` sont des métas vides |

Ces rectifications ne remettent pas en cause les **décisions** de WM-3, qui restent verrouillées ;
elles en corrigent les volumétries.

---

## 7. Verdict

```
WM31_OK_WITH_RESERVATIONS
```

Les quatre gaps sont fermés et prouvés. Le verdict retenu n'est pas `WM31_OK` parce que la
consigne exige la fermeture **intégrale** des gaps *et* la production d'un contrat WM-4 dont les
contrôles bloquants ne soient pas en échec : `PRE-ID-03` et `PRE-MED-04` le sont, sur des défauts
de données réels et documentés.

**Marqueur d'approbation non émis :**

```
CITADELLE_WP_MIGRATION_WM3_MAPPING_APPROVED_OK   ← NON ÉMIS
```

Raison : émettre ce marqueur reviendrait à approuver la couverture du mapping alors que deux
conditions bloquantes d'ouverture de WM-4 sont connues et non levées. Le marqueur pourra être
émis dès que R1 et R2 auront reçu une décision humaine tracée.

Marqueurs antérieurs conservés, non modifiés par ce lot :
`WM3_OK` · `WM3_MAPPING_LOCKED_OK` · `CITADELLE_WP_MIGRATION_WM3_MAPPING_LOCKED_OK` ·
`WM3_ADR_LMS_LOCKED` · `WM3_ROLE_POLICY_LOCKED` · `WM3_OK_WITH_RESERVATIONS`.

---

## 8. Prochaine action unique

Soumettre R1 et R2 à décision humaine. Tant qu'elles ne sont pas tracées, **ne pas ouvrir WM-4**.

Ce lot n'a été ni commité ni poussé.
