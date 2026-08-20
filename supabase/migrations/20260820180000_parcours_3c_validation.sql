-- ============================================================================
-- PARCOURS DU ROYAUME — VALIDATION PASTORALE ATOMIQUE (Phase 3C-1 + 3C-2)
-- ----------------------------------------------------------------------------
-- Ouvre la SEULE mutation pastorale runtime du modèle canonique : la validation
-- humaine d'un axe (growth_level | community_status). 100 % ADDITIF sur le socle
-- 3B (20260820170000) : aucune table modifiée, aucune valeur legacy touchée, aucun
-- backfill. La mutation vit dans UNE FONCTION SECURITY DEFINER ATOMIQUE qui, dans la
-- même transaction :
--   (1) upsert la ligne courante member_canonical_axes (valeur d'axe + review_state='confirmed')
--   (2) insère la ligne d'audit NOMINATIVE member_canonical_axis_changes
--       (provenance='pastoral_validation' → acteur + justification EXIGÉS par le CHECK 3B).
-- Soit les deux écritures réussissent, soit aucune (jamais d'axe confirmé sans trace).
--
-- AUTORISATION (3C-2) défense en profondeur, fail-closed :
--   - anti-usurpation : si un rôle authentifié appelle, p_actor_id DOIT = auth.uid().
--     (service_role → auth.uid() null → l'app fournit l'acteur nominatif déjà gardé par le RBAC.)
--   - portée pastorale : acteur = superviseur transverse (admin/super_admin/pasteur*)
--     OU berger DIRECT du membre (profiles.berger_id). Un berger ne valide QUE son troupeau.
--   - la permission applicative dédiée can_validate_journey_change est vérifiée EN AMONT
--     dans la route (src/lib/permissions.ts) ; la fonction re-vérifie la portée en DB.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Alignement du helper d'autorité pastorale (MINOR-1) — ADDITIF, comportement
--    identique pour les rôles existants ; ajoute SEULEMENT `pasteur_national` à la
--    liste des superviseurs transverses, pour que la portée RLS (lectures sous session
--    authenticated) coïncide EXACTEMENT avec la portée de la RPC de validation ci-dessous
--    (qui reconnaît admin/super_admin/pasteur/pasteur_national). Sans cela, un
--    pasteur_national pourrait valider un axe mais ne pas lire les tables de base sous sa
--    propre session. 100 % additif : `create or replace`, aucun droit retiré.
-- ----------------------------------------------------------------------------
create or replace function public.is_pastoral_responsable_of(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (select 1 from public.profiles t where t.id = p_member and t.berger_id = auth.uid())
    or exists (select 1 from public.profiles a where a.id = auth.uid()
               and a.role in ('admin','super_admin','pasteur','pasteur_national'));
$$;
revoke all on function public.is_pastoral_responsable_of(uuid) from public, anon;
grant execute on function public.is_pastoral_responsable_of(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- validate_member_canonical_axis — mutation pastorale ATOMIQUE
-- ----------------------------------------------------------------------------
create or replace function public.validate_member_canonical_axis(
  p_profile_id    uuid,
  p_axis          text,
  p_new_value     text,
  p_actor_id      uuid,
  p_actor_label   text,
  p_justification text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_role text;
  v_is_supervisor boolean;
  v_is_direct_shepherd boolean;
  v_old_value text;
  v_growth text;
  v_growth_state text;
  v_community text;
  v_community_state text;
  v_justif text := btrim(coalesce(p_justification, ''));
begin
  -- 0) Anti-usurpation : un appelant authentifié (auth.uid() non null) ne peut agir
  --    QUE sous sa propre identité. service_role (auth.uid() null) => l'acteur est
  --    fourni par l'application, déjà gardée par le RBAC applicatif.
  if auth.uid() is not null and auth.uid() <> p_actor_id then
    raise exception 'NOT_AUTHORIZED: actor mismatch' using errcode = '42501';
  end if;

  -- 1) Validation des entrées (fail-closed, vocabulaire fermé par axe)
  if p_profile_id is null then
    raise exception 'INVALID_INPUT: profile_id requis' using errcode = '22023';
  end if;
  if p_actor_id is null then
    raise exception 'INVALID_INPUT: acteur nominatif requis' using errcode = '22023';
  end if;
  if v_justif = '' then
    raise exception 'INVALID_INPUT: justification requise' using errcode = '22023';
  end if;

  if p_axis = 'growth_level' then
    if p_new_value is null or p_new_value not in
        ('visitor','new_believer','disciple','servant','leader','worker','responsible','shepherd') then
      raise exception 'INVALID_INPUT: growth_level invalide (%)', p_new_value using errcode = '22023';
    end if;
  elsif p_axis = 'community_status' then
    if p_new_value is null or p_new_value not in
        ('visitor','contact','integrating','member') then
      raise exception 'INVALID_INPUT: community_status invalide (%)', p_new_value using errcode = '22023';
    end if;
  else
    raise exception 'INVALID_INPUT: axe non supporté (%)', p_axis using errcode = '22023';
  end if;

  -- 2) Existence de l'acteur + portée pastorale (défense en profondeur)
  select role into v_actor_role from public.profiles where id = p_actor_id;
  if v_actor_role is null and not exists (select 1 from public.profiles where id = p_actor_id) then
    raise exception 'NOT_AUTHORIZED: acteur inconnu' using errcode = '42501';
  end if;

  v_is_supervisor := coalesce(v_actor_role in ('admin','super_admin','pasteur','pasteur_national'), false);
  v_is_direct_shepherd := exists (
    select 1 from public.profiles t where t.id = p_profile_id and t.berger_id = p_actor_id
  );
  if not (v_is_supervisor or v_is_direct_shepherd) then
    raise exception 'NOT_AUTHORIZED: acteur non responsable du membre' using errcode = '42501';
  end if;

  -- 3) Cible existe (membre réel)
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'INVALID_INPUT: membre inconnu' using errcode = '22023';
  end if;

  -- 4) Upsert de la ligne courante + capture de l'ancienne valeur (par axe)
  insert into public.member_canonical_axes (profile_id)
    values (p_profile_id)
  on conflict (profile_id) do nothing;

  if p_axis = 'growth_level' then
    select growth_level into v_old_value from public.member_canonical_axes where profile_id = p_profile_id;
    update public.member_canonical_axes
      set growth_level = p_new_value, growth_review_state = 'confirmed', updated_at = now()
      where profile_id = p_profile_id;
  else
    select community_status into v_old_value from public.member_canonical_axes where profile_id = p_profile_id;
    update public.member_canonical_axes
      set community_status = p_new_value, community_review_state = 'confirmed', updated_at = now()
      where profile_id = p_profile_id;
  end if;

  -- 5) Audit NOMINATIF append-only (le CHECK 3B garantit acteur + justification non vides)
  insert into public.member_canonical_axis_changes
    (profile_id, axis, old_value, new_value, actor_id, actor_label, justification, provenance)
  values
    (p_profile_id, p_axis, v_old_value, p_new_value, p_actor_id,
     nullif(btrim(coalesce(p_actor_label, '')), ''), v_justif, 'pastoral_validation');

  -- 6) État courant complet (projection admin)
  select growth_level, growth_review_state, community_status, community_review_state
    into v_growth, v_growth_state, v_community, v_community_state
    from public.member_canonical_axes where profile_id = p_profile_id;

  return jsonb_build_object(
    'ok', true,
    'profile_id', p_profile_id,
    'axis', p_axis,
    'old_value', v_old_value,
    'new_value', p_new_value,
    'growth_level', v_growth,
    'growth_review_state', v_growth_state,
    'community_status', v_community,
    'community_review_state', v_community_state
  );
end;
$$;

-- 'public' OBLIGATOIRE dans le revoke (sinon EXECUTE accordé par défaut à anon/authenticated).
revoke all on function public.validate_member_canonical_axis(uuid, text, text, uuid, text, text) from public, anon;
-- authenticated autorisé MAIS borné par l'anti-usurpation (auth.uid()=p_actor_id) + portée pastorale
-- interne : une session pastorale réelle ne peut valider que son propre troupeau, sous sa propre identité.
grant execute on function public.validate_member_canonical_axis(uuid, text, text, uuid, text, text)
  to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Vue de FILE DE REVUE — membres avec au moins un axe à valider.
-- security_invoker=true (PG15+) : les policies RLS de member_canonical_axes
-- s'appliquent avec les droits de l'APPELANT (jamais du propriétaire de la vue) —
-- évite le contournement RLS classique des vues. Lecture réservée au service_role :
-- la file d'attente est un écran ADMIN (lu via supabaseAdmin) ; le membre ne la lit jamais.
-- ----------------------------------------------------------------------------
create or replace view public.member_canonical_review_queue
  with (security_invoker = true)
  as
  select
    a.profile_id,
    a.growth_level,
    a.growth_review_state,
    a.community_status,
    a.community_review_state,
    a.updated_at,
    (a.growth_review_state = 'requires_review')    as growth_needs_review,
    (a.community_review_state = 'requires_review') as community_needs_review
  from public.member_canonical_axes a
  where a.growth_review_state = 'requires_review'
     or a.community_review_state = 'requires_review';

revoke all on public.member_canonical_review_queue from anon, authenticated;
grant select on public.member_canonical_review_queue to service_role;

notify pgrst, 'reload schema';
