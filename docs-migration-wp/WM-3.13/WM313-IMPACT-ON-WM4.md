# WM-3.13 — Impact sur WM-4

- **Lot** : WM-3.13
- **Date** : 2026-07-28

## 0. État WM-4

**WM-4 reste NO-GO.** Ce lot ne lance pas WM-4 ; il fournit les éléments de levée de la réserve média.

## 1. Effet de la clôture R2 sur les préalables WM-4

L'ouverture de WM-4 exige (`WM31-WM4-EXPORT-CONTRACT.md:324-332`) : WM-1 intacte, `PRE-ID-03` = PASS, `PRE-MED-04` corrigé **ou levé par décision tracée**.

| Préalable | État |
|-----------|------|
| `PRE-ID-03` | PASS (acquis R1) |
| `PRE-MED-04` | **PASS_WITH_QUARANTINE** (levé par décision tracée — voir `WM313-PRE-MED-04-FINAL-REEVALUATION.md`) |
| Autres préalables WM-4 | Hors périmètre R2 — à évaluer à l'ouverture de WM-4 |

R2 n'est plus un bloqueur média pour WM-4 : la réserve PRE-MED-04 est levée sous quarantaine.

## 2. Éléments à injecter dans WM-4

- **3 lignes `quarantine.csv`** (`WM313-WM4-QUARANTINE-ROWS.csv`) : 34548/34555/34577 → `QU-MED-MISSING-REFERENCE`, import en `draft`.
- **2 lignes `rejects.csv`** (`WM313-WM4-REJECT-ROWS.csv`) : 34549/34553 → `RJ-MED-MISSING-REFERENCE`, abandon définitif.
- **2 amendements de contrat à ratifier** (voir `WM313-PRE-MED-04-FINAL-REEVALUATION.md §3`) :
  1. `QU-MED-MISSING-REFERENCE` N=5 → N=3.
  2. Ajout `RJ-MED-MISSING-REFERENCE` N=2 au §4.1.

## 3. Actions correctives futures (post-WM-4, hors R2)

- Réactivation des 3 leçons après fourniture d'une **vidéo officielle approuvée** (`REPLACE_WITH_APPROVED_MEDIA`) : `draft → published` + `youtube_id`/`video_url` via l'admin, sans recréation (voir `WM313-VIDEO-QUARANTINE-CONTRACT.md §3`).
- Aucun média fictif à aucun stade.

## 4. Note

Le mapping et les préalables non-média de WM-4 ne sont **pas** l'objet de R2 et ne sont pas évalués ici. La clôture R2 se limite à lever la réserve PRE-MED-04 sous quarantaine contrôlée.
