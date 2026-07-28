# WM-3.7 — Rapport de blocage volontaire de WM-3.6

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.7` |
| Objet | Acter le blocage WM-3.6 dans le dossier WM-3 |
| Écriture production | **0** (inchangé) |

---

## 1. WM-3.6 a été bloqué volontairement

L'exécution de la fusion R1 a été **arrêtée avant toute écriture**, de façon délibérée et conforme
aux garde-fous. Verdict WM-3.6 : `WM36_EXECUTION_BLOCKED_PRECHECK`.

| Cause | Détail |
|-------|--------|
| **Absence de transaction PostgreSQL directe** | pas de `DATABASE_URL`/`DIRECT_URL`, ni `psql`/`psycopg`/`node-pg` ; seul PostgREST (auto-commit par requête) est disponible |
| **Impossibilité d'assurer l'atomicité** | une fusion multi-tables via PATCH REST auto-commit n'est pas atomique ; un échec intermédiaire laisserait un état partiel sur la donnée pastorale ; la seule alternative (RPC transactionnelle) est une migration de schéma interdite |
| **Aucune écriture production** | `writes_performed = 0` — re-vérification, snapshot, contrôles menés en lecture seule uniquement |

## 2. Découverte connexe (dérive du plan)

Le changement de gardien DG-1 (`DG-1-P3` → `DG-1-P2`) a fait apparaître un **conflit
`inscriptions_formation`** absent du dry-run validé WM-3.4 (pré-check `C4` en échec). Ce constat est
intégré au plan DG-1 mis à jour (`WM37-R1-DG1-UPDATED-DECISION.md`, `WM37-DG1-NEW-DRY-RUN.md`).

## 3. État conservé

- Snapshot pré-fusion WM-3.6 (`WM-3.6/private/backup-premerge-20260726/`) **intact et vérifié**.
- Production **inchangée** : 13 profils actifs, 2 groupes de doublons.
- `PRE-ID-03 = FAIL` · WM-4 = **NO-GO**.

## 4. Interdits respectés

Documentation uniquement · aucune écriture · aucune fusion.
