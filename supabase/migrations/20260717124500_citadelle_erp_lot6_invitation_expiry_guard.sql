-- ============================================================================
-- 20260717124500_citadelle_erp_lot6_invitation_expiry_guard.sql
-- Lot 6 — expiration atomique invitation + garde membership org à la nomination.
-- Additive single-shot. Prérequis : 20260717120000 + 20260717123000 appliquées.
-- NE PAS rejouer. NE PAS modifier les migrations antérieures.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.organization_unit_invitations') IS NULL THEN
    RAISE EXCEPTION 'Lot6 expiry guard stop: organization_unit_invitations missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'erp_unit_invitation_accept'
  ) THEN
    RAISE EXCEPTION 'Lot6 expiry guard stop: erp_unit_invitation_accept missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'erp_unit_membership_nominate'
  ) THEN
    RAISE EXCEPTION 'Lot6 expiry guard stop: erp_unit_membership_nominate missing';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) erp_unit_invitation_accept — expire atomique (RETURN NULL, pas d'exception)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erp_unit_invitation_accept(
  p_token_hash text,
  p_user_id uuid,
  p_email text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv public.organization_unit_invitations%ROWTYPE;
  v_om public.organization_members%ROWTYPE;
  v_um public.organization_unit_members%ROWTYPE;
  v_unit public.organization_units%ROWTYPE;
  v_mem_id uuid;
  v_email text := lower(btrim(p_email));
BEGIN
  -- Profile first (before any invitation mutation)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Lot6: profile required';
  END IF;

  SELECT * INTO v_inv FROM public.organization_unit_invitations
  WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot6: invitation not found';
  END IF;

  -- Pending + expired → persist expire + event, commit-friendly NULL (no RAISE after writes)
  IF v_inv.status = 'pending' AND v_inv.expires_at < now() THEN
    UPDATE public.organization_unit_invitations
    SET status = 'expired', updated_at = now()
    WHERE id = v_inv.id;
    INSERT INTO public.organization_unit_governance_events (
      organization_id, organization_unit_id, actor_user_id, action, invitation_id, metadata
    ) VALUES (
      v_inv.organization_id, v_inv.organization_unit_id, p_user_id, 'invite_expire', v_inv.id, '{}'::jsonb
    );
    RETURN NULL;
  END IF;

  IF v_inv.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Lot6: invitation not pending';
  END IF;

  IF v_inv.email_normalized IS DISTINCT FROM v_email THEN
    RAISE EXCEPTION 'Lot6: email mismatch';
  END IF;

  SELECT * INTO v_om FROM public.organization_members
  WHERE organization_id = v_inv.organization_id AND user_id = p_user_id FOR UPDATE;

  IF FOUND THEN
    IF v_om.status IN ('suspended', 'removed') THEN
      RAISE EXCEPTION 'Lot6: organization membership suspended or removed';
    END IF;
  ELSE
    INSERT INTO public.organization_members (
      organization_id, user_id, membership_role, status, is_default, joined_at
    ) VALUES (
      v_inv.organization_id, p_user_id, 'member', 'active', false, now()
    );
  END IF;

  SELECT * INTO v_unit FROM public.organization_units WHERE id = v_inv.organization_unit_id;
  IF NOT public.erp_unit_role_fits_type(v_inv.proposed_unit_role, v_unit.unit_type) THEN
    RAISE EXCEPTION 'Lot6: role incompatible with unit_type';
  END IF;

  SELECT * INTO v_um FROM public.organization_unit_members
  WHERE organization_unit_id = v_inv.organization_unit_id AND user_id = p_user_id FOR UPDATE;

  IF FOUND THEN
    IF v_um.status = 'suspended' THEN
      RAISE EXCEPTION 'Lot6: unit membership suspended requires admin reactivation';
    END IF;
    IF v_um.status = 'active' AND v_um.unit_role IS DISTINCT FROM v_inv.proposed_unit_role THEN
      RAISE EXCEPTION 'Lot6: active membership role conflict';
    END IF;
    UPDATE public.organization_unit_members SET
      unit_role = v_inv.proposed_unit_role,
      status = 'active',
      nominated_by = v_inv.invited_by,
      nominated_at = now(),
      removed_by = NULL,
      removed_at = NULL,
      updated_at = now()
    WHERE id = v_um.id;
    v_mem_id := v_um.id;
  ELSE
    INSERT INTO public.organization_unit_members (
      organization_id, organization_unit_id, user_id, unit_role, status,
      is_primary, nominated_by, nominated_at
    ) VALUES (
      v_inv.organization_id, v_inv.organization_unit_id, p_user_id,
      v_inv.proposed_unit_role, 'active', false, v_inv.invited_by, now()
    ) RETURNING id INTO v_mem_id;
  END IF;

  UPDATE public.organization_unit_invitations SET
    status = 'consumed',
    accepted_at = now(),
    accepted_user_id = p_user_id,
    updated_at = now()
  WHERE id = v_inv.id;

  INSERT INTO public.organization_unit_governance_events (
    organization_id, organization_unit_id, subject_user_id, actor_user_id,
    action, to_role, to_unit_id, invitation_id, metadata
  ) VALUES (
    v_inv.organization_id, v_inv.organization_unit_id, p_user_id, p_user_id,
    'invite_accept', v_inv.proposed_unit_role, v_inv.organization_unit_id, v_inv.id,
    jsonb_build_object('membership_id', v_mem_id)
  );

  RETURN v_mem_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) erp_unit_membership_nominate — membership org active requise pour le sujet
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erp_unit_membership_nominate(
  p_org_id uuid,
  p_unit_id uuid,
  p_user_id uuid,
  p_role text,
  p_actor_id uuid,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role text;
  v_unit public.organization_units%ROWTYPE;
  v_existing public.organization_unit_members%ROWTYPE;
  v_id uuid;
  v_from_role text;
BEGIN
  IF p_notes IS NOT NULL AND length(p_notes) > 500 THEN
    RAISE EXCEPTION 'Lot6: notes too long';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = p_user_id
      AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Lot6: target active organization membership required';
  END IF;

  v_actor_role := public.erp_actor_highest_role(p_org_id, p_actor_id);
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Lot6: actor has no active unit membership';
  END IF;

  IF NOT public.erp_actor_can_write_unit(p_org_id, p_actor_id, p_unit_id) THEN
    RAISE EXCEPTION 'Lot6: actor cannot write unit';
  END IF;

  IF NOT (p_role = ANY (public.erp_assignable_roles(v_actor_role))) THEN
    RAISE EXCEPTION 'Lot6: role not assignable by actor';
  END IF;

  IF p_user_id = p_actor_id AND public.erp_unit_role_rank(p_role) > public.erp_unit_role_rank(v_actor_role) THEN
    RAISE EXCEPTION 'Lot6: self-promotion forbidden';
  END IF;

  SELECT * INTO v_unit FROM public.organization_units
  WHERE id = p_unit_id AND organization_id = p_org_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot6: unit not found';
  END IF;

  IF NOT public.erp_unit_role_fits_type(p_role, v_unit.unit_type) THEN
    RAISE EXCEPTION 'Lot6: role incompatible with unit_type';
  END IF;

  SELECT * INTO v_existing FROM public.organization_unit_members
  WHERE organization_unit_id = p_unit_id AND user_id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status = 'suspended' THEN
      RAISE EXCEPTION 'Lot6: suspended membership requires admin reactivation';
    END IF;
    IF v_existing.status = 'active'
       AND public.erp_unit_role_rank(v_existing.unit_role) >= public.erp_unit_role_rank(v_actor_role)
       AND v_actor_role IS DISTINCT FROM 'world_super_admin' THEN
      RAISE EXCEPTION 'Lot6: cannot manage peer or superior';
    END IF;
    IF v_existing.unit_role = 'world_super_admin'
       AND p_role IS DISTINCT FROM 'world_super_admin'
       AND public.erp_count_active_super(p_org_id) <= 1
       AND v_existing.status = 'active' THEN
      RAISE EXCEPTION 'Lot6: cannot demote last world_super_admin';
    END IF;
    v_from_role := v_existing.unit_role;
    UPDATE public.organization_unit_members SET
      unit_role = p_role,
      status = 'active',
      nominated_by = p_actor_id,
      nominated_at = now(),
      removed_by = NULL,
      removed_at = NULL,
      suspended_by = NULL,
      suspended_at = NULL,
      notes = p_notes,
      updated_at = now()
    WHERE id = v_existing.id;
    v_id := v_existing.id;
  ELSE
    v_from_role := NULL;
    INSERT INTO public.organization_unit_members (
      organization_id, organization_unit_id, user_id, unit_role, status,
      is_primary, nominated_by, nominated_at, notes
    ) VALUES (
      p_org_id, p_unit_id, p_user_id, p_role, 'active',
      false, p_actor_id, now(), p_notes
    ) RETURNING id INTO v_id;
  END IF;

  INSERT INTO public.organization_unit_governance_events (
    organization_id, organization_unit_id, subject_user_id, actor_user_id,
    action, from_role, to_role, to_unit_id, metadata
  ) VALUES (
    p_org_id, p_unit_id, p_user_id, p_actor_id,
    'nominate', v_from_role, p_role, p_unit_id,
    jsonb_build_object('membership_id', v_id)
  );

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants (service_role only)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.erp_unit_invitation_accept(text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_unit_membership_nominate(uuid, uuid, uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erp_unit_invitation_accept(text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_unit_membership_nominate(uuid, uuid, uuid, text, uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Postchecks
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  def_accept text;
  def_nom text;
BEGIN
  SELECT pg_get_functiondef('public.erp_unit_invitation_accept(text,uuid,text)'::regprocedure)
  INTO def_accept;
  IF def_accept IS NULL
     OR position('RETURN NULL' IN def_accept) = 0
     OR position('invite_expire' IN def_accept) = 0
     OR position('profile required' IN def_accept) = 0 THEN
    RAISE EXCEPTION 'Lot6 expiry guard postcheck: accept function incomplete';
  END IF;
  -- must not RAISE after expire writes (no 'invitation expired' exception path after UPDATE)
  IF position('RAISE EXCEPTION ''Lot6: invitation expired''' IN def_accept) > 0 THEN
    RAISE EXCEPTION 'Lot6 expiry guard postcheck: accept still raises on expire';
  END IF;

  SELECT pg_get_functiondef('public.erp_unit_membership_nominate(uuid,uuid,uuid,text,uuid,text)'::regprocedure)
  INTO def_nom;
  IF def_nom IS NULL
     OR position('target active organization membership required' IN def_nom) = 0 THEN
    RAISE EXCEPTION 'Lot6 expiry guard postcheck: nominate org membership guard missing';
  END IF;
END $$;

COMMIT;
