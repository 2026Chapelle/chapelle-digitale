# WM-3.8 — Procédure d'exécution contrôlée

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.8` |
| Objet | Enchaînement humain + automatique pour exécuter R1 via la RPC |
| État | **spécification** — non exécutée |

---

## 1. Conditions d'autorisation d'exécution (toutes requises)

- [ ] Décideur autorise la **création temporaire** de `wm3_merge_duplicate_group` (dérogation limitée, non versionnée)
- [ ] Décideur autorise le **retrait ciblé des inscriptions redondantes** (§4 de `WM38-RPC-DESIGN.md`) **ou** l'assouplissement de `POST-M-03`
- [ ] DG-1 : gardien `DG-1-P2` + comptes de test confirmés (WM-3.7)
- [ ] DG-2 : double validation conservée (WM-3.5)
- [ ] Snapshot pré-fusion rafraîchi et vérifié (SHA-256)

## 2. Étapes

### Phase 0 — Déploiement (humain, éditeur SQL Supabase)
1. Revoir le SQL (`WM38-RPC-DESIGN.md`).
2. `CREATE FUNCTION` + `REVOKE/GRANT` (`WM38-SECURITY-CONTROLS.md` §1).

### Phase 1 — Snapshot obligatoire (lecture seule)
3. Capturer les lignes impactées + `SHA256SUMS` (contrat `WM-3.4/WM34-PRE-MERGE-BACKUP-CONTRACT.md`).
4. Vérifier l'intégrité.

### Phase 2 — Contrôles avant (par groupe)
5. Recomputer le dry-run lecture seule → identifier `p_dedupe_formation_ids` et `p_expected_after`.
6. Vérifier `C1..C5` (identités, comptes, snapshot, conflit connu, périmètre 10 profils).

### Phase 3 — Dry-run transactionnel via RPC
7. `POST /rest/v1/rpc/wm3_merge_duplicate_group` avec `p_dry_run = true` (DG-1 puis DG-2).
8. Vérifier `would_result` = comptes attendus. **Aucune persistance** (la fonction annule).

### Phase 4 — Exécution réelle (par groupe, atomique)
9. DG-1 : appel `p_dry_run = false`. La fonction applique **atomiquement** dédup + re-point + archivage.
10. Contrôles après DG-1 : `POST-M-01/02` (1 actif pour `8c12c2c…`, 0 dangling).
11. (option) `revoke execute` entre les deux groupes.
12. DG-2 : appel `p_dry_run = false`. Contrôles après DG-2.

### Phase 5 — Désactivation `auth.users` (optionnelle, hors transaction SQL)
13. Bannir les comptes `auth.users` secondaires via l'API admin (`PUT /auth/v1/admin/users/{id}`
    `ban_duration`) — réversible. Non requis pour `PRE-ID-03` (basé sur `profiles`).

### Phase 6 — Contrôle global `PRE-ID-03`
14. Re-sonde lecture seule : 0 groupe de doublons canoniques **actifs** → `PRE-ID-03 = PASS`.

### Phase 7 — Suppression du mécanisme
15. `DROP FUNCTION` (`WM38-SECURITY-CONTROLS.md` §5). Vérifier l'absence de la fonction.

## 3. Règle d'arrêt

Tout écart (dry-run ≠ attendu, contrôle après en échec) → **ne pas passer en réel** / `ROLLBACK`
via la fonction (atomique) + rollback niveau B si déjà commité (`WM38-ROLLBACK-PROCEDURE.md`).

## 4. Interdits respectés

Spécification uniquement · aucune RPC appelée · aucune écriture.
