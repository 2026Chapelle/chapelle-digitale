# WM-3.4 — Contrat de sauvegarde pré-fusion

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.4` |
| Objet | Garantir la réversibilité **avant** toute écriture de fusion |
| Statut | **spécification** — aucune sauvegarde exécutée par WM-3.4 |

> Aucune étape de fusion ne peut débuter tant que ce contrat n'est pas satisfait et vérifié.

---

## 1. Périmètre à sauvegarder (avant `BEGIN`)

Pour **chaque** groupe, capturer l'état **exact** des lignes impactées, identifiées par UUID (les
10 profils + leurs rattachements). Snapshot dans `private/` (jamais commité).

| Objet | Portée | Clé de restauration |
|-------|--------|---------------------|
| `profiles` (10 lignes) | `id, role, membre_statut, archived_at, derniere_connexion, score_engagement` | `id` |
| `auth.users` (10) | état actif/banni | `id` |
| `inscriptions_formation` | toutes lignes des 10 UUID | `id` (ou `user_id+formation_id`) |
| `video_progress` | idem | `user_id+module_id` |
| `pastoral_actions_log` | lignes `member_id ∈ 10 UUID` | `id` |
| `app_notifications` | lignes `user_id ∈ 10 UUID` | `id` |
| `group_attendance` | lignes `user_id ∈ 10 UUID` | `reunion_id+user_id` |
| `newcomer_intakes` | lignes `converted_profile_id ∈ 10 UUID` | `id` |

## 2. Format et intégrité

| Propriété | Exigence |
|-----------|----------|
| Format | JSON lignes brutes **+** `SHA256SUMS` du snapshot |
| Emplacement | `docs-migration-wp/WM-3.4/private/backup-premerge-<UTC>/` (gitignored) |
| Horodatage | UTC ISO 8601 |
| Vérification | recompter les lignes = comptes du dry-run (`WM34-DEPENDENCY-TRANSFER-MATRIX.csv`) |
| Immuabilité | snapshot en **lecture seule** une fois écrit |

## 3. Conditions de validité (gate avant fusion)

- [ ] Snapshot des 8 tables réalisé et vérifié (comptes = dry-run).
- [ ] `SHA256SUMS` du snapshot généré.
- [ ] Copie du snapshot conservée hors session (poste décideur).
- [ ] Confirmation DG-1 « comptes de test » documentée.
- [ ] Double validation DG-2 obtenue.

Tant qu'une case n'est pas cochée : **fusion interdite**.

## 4. Lien rollback

Le snapshot est la **source de vérité** du rollback (`WM34-ROLLBACK-PLAN.md`). Sans snapshot
vérifié, aucune fusion ne doit être lancée : un rollback sans sauvegarde serait impossible.
