# WM-3.8 — Conception de la RPC transactionnelle

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.8` |
| Objet | SQL de la fonction de fusion atomique (à revoir + déployer par un humain) |
| État | **spécification** — non déployée, non exécutée |

> Le SQL ci-dessous est **proposé pour revue humaine**. WM-3.8 ne le déploie pas. Sa création se
> fait dans l'éditeur SQL Supabase par le décideur, puis suppression après usage.

---

## 1. Signature

```
public.wm3_merge_duplicate_group(
  p_keeper              uuid,       -- gardien
  p_secondaries         uuid[],     -- profils secondaires à fusionner puis désactiver
  p_dedupe_formation_ids uuid[],    -- formation_id en conflit (fusion progression, retrait doublon)
  p_expected_after      jsonb,      -- comptes attendus par table (garde anti-dérive)
  p_dry_run             boolean     -- true = calcule et ANNULE (aucune persistance)
) returns jsonb
```

## 2. Comportement

- **Atomique** : tout le corps s'exécute dans la transaction implicite de la fonction. Toute
  `RAISE` annule l'intégralité.
- **`dry_run` transactionnel** : les mutations sont appliquées dans un bloc `BEGIN…EXCEPTION`, les
  comptes « après » sont capturés dans des variables (non transactionnelles), puis une exception
  interne **annule les mutations** ; le handler retourne les comptes. → test réel sans persistance.
- **Gardes** : gardien actif, secondaires actifs et distincts, comptes « après » = `p_expected_after`.
- **Aucun compte supprimé** : désactivation par `archived_at` uniquement.
- **Dédup non destructive** : la progression est fusionnée (`GREATEST`) sur la ligne du gardien ;
  la ligne de rattachement **redondante** (doublon strict d'inscription) est retirée **après** fusion
  de sa valeur — voir §4 (point d'autorisation).

## 3. SQL proposé (pour revue)

```sql
create or replace function public.wm3_merge_duplicate_group(
  p_keeper uuid,
  p_secondaries uuid[],
  p_dedupe_formation_ids uuid[] default '{}',
  p_expected_after jsonb default '{}'::jsonb,
  p_dry_run boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_after jsonb;
  v_dry constant text := 'WM3DRYRUN';
begin
  -- 0. Gardes d'entrée
  if p_keeper = any(p_secondaries) then
    raise exception 'keeper ne peut pas etre secondaire';
  end if;
  if (select archived_at from profiles where id = p_keeper) is not null then
    raise exception 'gardien inactif ou inexistant';
  end if;
  if exists (select 1 from profiles where id = any(p_secondaries) and archived_at is not null) then
    raise exception 'un secondaire est deja desactive';
  end if;

  begin  -- bloc transactionnel interne (savepoint implicite)
    -- 1. Dédup non destructive des inscriptions en conflit
    update inscriptions_formation k
       set progression = greatest(k.progression, coalesce(s.max_prog, k.progression)),
           termine     = k.termine or coalesce(s.any_termine, false)
      from (
        select formation_id, max(progression) max_prog, bool_or(termine) any_termine
          from inscriptions_formation
         where user_id = any(p_secondaries) and formation_id = any(p_dedupe_formation_ids)
         group by formation_id
      ) s
     where k.user_id = p_keeper and k.formation_id = s.formation_id;

    -- retrait des lignes de rattachement REDONDANTES (doublon strict, valeur deja fusionnee)
    delete from inscriptions_formation
     where user_id = any(p_secondaries) and formation_id = any(p_dedupe_formation_ids);

    -- 2. Re-point des rattachements non conflictuels vers le gardien
    update inscriptions_formation set user_id = p_keeper
      where user_id = any(p_secondaries);
    update video_progress set user_id = p_keeper
      where user_id = any(p_secondaries)
        and module_id not in (select module_id from video_progress where user_id = p_keeper);
    update pastoral_actions_log set member_id = p_keeper where member_id = any(p_secondaries);
    update app_notifications set user_id = p_keeper where user_id = any(p_secondaries);
    update group_attendance set user_id = p_keeper
      where user_id = any(p_secondaries)
        and reunion_id not in (select reunion_id from group_attendance where user_id = p_keeper);
    update newcomer_intakes set converted_profile_id = p_keeper
      where converted_profile_id = any(p_secondaries);

    -- 3. Désactivation des secondaires (jamais de DELETE de compte)
    update profiles set archived_at = now() where id = any(p_secondaries);

    -- 4. Comptes "après" (capturés en variables, non transactionnels)
    v_after := jsonb_build_object(
      'inscriptions_formation', (select count(*) from inscriptions_formation where user_id = p_keeper),
      'video_progress',        (select count(*) from video_progress where user_id = p_keeper),
      'pastoral_actions_log',  (select count(*) from pastoral_actions_log where member_id = p_keeper),
      'app_notifications',     (select count(*) from app_notifications where user_id = p_keeper),
      'active_in_box',         (select count(*) from profiles
                                  where id in (p_keeper) and archived_at is null),
      'secondaries_active',    (select count(*) from profiles
                                  where id = any(p_secondaries) and archived_at is null),
      'dangling_to_secondary', (
         select (select count(*) from inscriptions_formation where user_id = any(p_secondaries))
              + (select count(*) from video_progress where user_id = any(p_secondaries))
              + (select count(*) from pastoral_actions_log where member_id = any(p_secondaries))
              + (select count(*) from app_notifications where user_id = any(p_secondaries)))
    );

    -- 5. Garde anti-dérive : comparer aux comptes attendus
    if p_expected_after <> '{}'::jsonb
       and (v_after - 'secondaries_active' - 'dangling_to_secondary') <> p_expected_after then
      raise exception 'ecart comptes attendus: %', v_after;
    end if;
    if (v_after->>'secondaries_active')::int <> 0
       or (v_after->>'dangling_to_secondary')::int <> 0 then
      raise exception 'invariants post non tenus: %', v_after;
    end if;

    -- 6. dry_run : annuler toutes les mutations
    if p_dry_run then
      raise exception using errcode = 'WM3DR', message = v_dry;
    end if;

  exception when others then
    if sqlerrm = v_dry then
      return jsonb_build_object('dry_run', true, 'would_result', v_after);
    end if;
    raise;  -- toute autre erreur : rollback total + propagation
  end;

  return jsonb_build_object('dry_run', false, 'result', v_after);
end;
$$;
```

## 4. Point d'autorisation — retrait des inscriptions redondantes

La contrainte `POST-M-03` exige **0 rattachement pointant un UUID désactivé**. La ligne d'inscription
**redondante** (même `formation_id` que le gardien, non re-pointable car `UNIQUE(user_id,formation_id)`)
ne peut être ni re-pointée ni laissée. Sa **valeur (progression) est d'abord fusionnée** sur le
gardien (`GREATEST`), puis la ligne redondante est **retirée**.

- Ce `DELETE` porte **exclusivement** sur des **lignes de rattachement dédupliquées** dont
  l'information est déjà conservée sur le gardien.
- Il ne concerne **jamais** un compte (`profiles`/`auth.users`), ni une donnée non dupliquée.
- Concerné : DG-1 (1 ligne), DG-2 (1 ligne).

> **Décision requise** : autoriser ce retrait ciblé de lignes de rattachement redondantes, seule
> voie non destructive-de-l'information satisfaisant `POST-M-03`. Alternative : conserver ces 2
> lignes et **assouplir `POST-M-03`** (tolérer 1 rattachement inerte par groupe vers un compte
> archivé). **Recommandation : autoriser le retrait ciblé** (état final propre).

## 5. Interdits respectés

Spécification SQL uniquement · fonction non créée · aucune écriture · aucune donnée modifiée.
