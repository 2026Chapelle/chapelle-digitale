# WM-3.13 — Contrat d'abandon des pièces jointes

- **Lot** : WM-3.13
- **Date** : 2026-07-28
- **Décision** : `MIGRATE_WITHOUT_MEDIA` + `ABANDON_REFERENCE` pour 34549 et 34553.

## 0. Caractérisation

Documents annexes issus de la méta Tutor LMS `_tutor_attachments`, rattachés à des leçons **déjà pourvues de leur vidéo**. Nom et type MIME inconnus (objets absents de `wp_posts`, ID max 1481). Caractère **FACULTATIF** établi en WM-3.2 (`WM32-R2-MISSING-MEDIA-MATRIX.csv:5-6` ; `WM32-R2-MISSING-MEDIA-DECISION.md:54`).

## 1. Clauses du contrat

- **Ne pas créer de remplacement** : aucun média, aucune URL, aucun fichier vide généré.
- **Ne pas bloquer** : les leçons parentes et le cours restent complets (via leur vidéo). Une pièce jointe annexe absente est sans impact critique (`WM311-R2-ATTACHMENT-ABANDON-EVIDENCE.md:40-42`).
- **Tracer l'abandon** dans `rejects.csv` (voir `WM313-WM4-REJECT-ROWS.csv`), `evidence_ref = WM-3.1 Gap 3 §6`.
- **Conserver la référence historique** dans les preuves documentaires (WM-3.2 / WM-3.3 / WM-3.11 / WM-3.13).
- **Irréversibilité** : `reversible = false` — restauration jugée « peu probable, nom et type inconnus » (`WM311-R2-ATTACHMENT-ABANDON-EVIDENCE.md:51`).

## 2. Preuve de décision

- Enregistrée : `WM-3.3/WM33-R2-HUMAN-DECISIONS-RECORDED.md:20-21` ; confirmée `WM-3.4/WM34-HUMAN-DECISIONS-CONFIRMED.md:40`.
- Traçage prescrit dans `rejects/` avec `evidence_ref = WM-3.1 Gap 3 §6` (`WM33-R2-HUMAN-DECISIONS-RECORDED.md:48`).

## 3. Portée

Décision **définitive**. Aucune action LMS bloquante ; l'exécution (import sans l'annexe + écriture `rejects.csv`) relève de WM-4.
