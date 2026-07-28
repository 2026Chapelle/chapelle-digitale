# WM-3.6 — Rapport de snapshot pré-fusion

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.6` |
| Objet | Snapshot lecture seule des lignes impactées (contrat `WM34-PRE-MERGE-BACKUP-CONTRACT.md`) |
| Emplacement | `private/backup-premerge-20260726/` (**non commité**, `**/private/`) |
| Intégrité | **vérifiée** — SHA-256 recomputés = `SHA256SUMS.txt` |
| Écriture production | **aucune** (capture GET seulement) |

---

## 1. Contenu capturé (10 profils + rattachements)

| Fichier snapshot | Lignes | Portée |
|------------------|--------|--------|
| `profiles.json` | 10 | les 10 profils DG-1 (6) + DG-2 (4) — colonnes complètes |
| `inscriptions_formation.json` | 4 | inscriptions des 10 UUID |
| `video_progress.json` | 5 | progression des 10 UUID |
| `group_attendance.json` | 0 | (aucune) |
| `pastoral_actions_log.json` | 3 | 3 actions pastorales (DG-2) |
| `app_notifications.json` | 12 | notifications des 10 UUID |
| `newcomer_intakes.json` | 0 | (aucune) |

## 2. Intégrité

- `SHA256SUMS.txt` généré (7 entrées).
- Recalcul des empreintes = valeurs stockées → **intégrité confirmée**.
- Snapshot en lecture seule, immuable, cloisonné hors Git.

## 3. Rôle

Ce snapshot est la **source de vérité du rollback** (`WM36-ROLLBACK-STATUS.md`). Il a été produit
**avant** toute tentative d'écriture. L'exécution ayant été **bloquée en pré-check (0 écriture)**, le
snapshot reste disponible tel quel pour une exécution ultérieure — aucun rollback n'a été nécessaire.

## 4. Interdits respectés

Capture lecture seule · aucune écriture · aucune PII hors `private/` · snapshot ignoré par Git.
