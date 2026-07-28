# WM-3.4 — Plan de rollback

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.4` |
| Objet | Rétablir l'état antérieur en cas d'échec ou de décision d'annulation |
| Statut | **spécification** — aucune exécution |

---

## 1. Deux niveaux de rollback

### Niveau A — pendant la transaction (avant `COMMIT`)

La fusion s'exécute dans **une transaction unique** par groupe. Tant que `COMMIT` n'est pas émis :

```
ROLLBACK;
```

→ retour instantané et intégral à l'état d'avant `BEGIN`. Aucune trace. **C'est le chemin nominal**
si un contrôle intermédiaire (`WM34-PRE-POST-CONTROLS.md`) échoue.

### Niveau B — après `COMMIT` (fusion validée puis à annuler)

Restauration depuis le snapshot pré-fusion (`WM34-PRE-MERGE-BACKUP-CONTRACT.md`) :

1. `BEGIN;`
2. **Ré-attribuer** les rattachements re-pointés à leur UUID d'origine (depuis le snapshot) :
   - `inscriptions_formation`, `video_progress`, `pastoral_actions_log`, `app_notifications`,
     `group_attendance`, `newcomer_intakes` → `user_id`/`member_id`/`converted_profile_id` d'origine.
3. **Ré-activer** les comptes désactivés : `UPDATE profiles SET archived_at = :snapshot_value WHERE id IN (...)` + réactivation `auth.users`.
4. **Restaurer** la ligne d'inscription dédupliquée (DG-2) et les valeurs `progression`/`termine` d'origine du gardien.
5. Contrôles post-rollback : comptes = snapshot (§3).
6. `COMMIT;`

---

## 2. Pourquoi le rollback B est possible

| Garantie | Effet |
|----------|-------|
| Aucune suppression de ligne (`DELETE`) dans la fusion | tout est re-pointable |
| Désactivation par `archived_at` (jamais `DELETE profiles`) | réactivation triviale |
| `auth.users` bannis, non supprimés | réactivation triviale |
| Snapshot complet des lignes impactées avant `BEGIN` | source de vérité pour restaurer les FK |
| Dédup DG-2 : la ligne en doublon est snapshotée avant d'être écartée | ré-insérable |

**Le seul point non trivial** : la valeur `progression`/`termine` du gardien modifiée par le
`GREATEST(...)` (DG-2). Elle est snapshotée avant modification → restaurable à l'identique.

---

## 3. Contrôles post-rollback

- [ ] Chaque boîte canonique retrouve son nombre de profils **actifs** initial (DG-1 = 6, DG-2 = 4).
- [ ] Comptes de rattachement par UUID = snapshot pré-fusion (tables du §1).
- [ ] `progression`/`termine` du gardien DG-2 = valeurs snapshot.
- [ ] `PRE-ID-03` revient à son état initial (**FAIL**, 2 groupes) — cohérent avec l'annulation.

---

## 4. Déclencheurs de rollback

| Déclencheur | Niveau |
|-------------|--------|
| Contrôle intermédiaire en échec (comptes ≠ dry-run) | A (`ROLLBACK`) |
| Conflit unique imprévu détecté à l'exécution | A |
| Décision humaine d'annulation après `COMMIT` | B (restauration snapshot) |
| Anomalie fonctionnelle constatée post-fusion | B |

---

## 5. Interdits respectés

Spécification uniquement · aucun `ROLLBACK`/`UPDATE` réel émis · aucune donnée modifiée.
