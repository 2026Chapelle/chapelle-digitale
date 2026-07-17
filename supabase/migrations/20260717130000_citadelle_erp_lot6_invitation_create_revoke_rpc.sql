-- ============================================================================
-- 20260717130000_citadelle_erp_lot6_invitation_create_revoke_rpc.sql
-- Lot 6 — RPC atomiques invitation create / revoke (service_role only)
-- FAIL-FAST single-shot. NE PAS rejouer. Additive uniquement.
-- Token clair JAMAIS en SQL — uniquement p_token_hash.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Fail-fast : tables + helpers Lot 6 requis
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.organization_unit_invitations') IS NULL THEN
    RAISE EXCEPTION 'Lot6 invite rpc stop: organization_unit_invitations missing';
  END IF;
  IF to_regclass('public.organization_unit_governance_events') IS NULL THEN
    RAISE EXCEPTION 'Lot6 invite rpc stop: organization_unit_governance_events missing';
  END IF;
  IF to_regclass('public.organization_units') IS NULL THEN
    RAISE EXCEPTION 'Lot6 invite rpc stop: organization_units missing';
  END IF;
  IF to_regclass('public.organization_unit_members') IS NULL THEN
    RAISE EXCEPTION 'Lot6 invite rpc stop: organization_unit_members missing';
  END IF;
  IF to_regprocedure('public.erp_actor_can_write_unit(uuid,uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Lot6 invite rpc stop: erp_actor_can_write_unit missing';
  END IF;
  IF to_regprocedure('public.erp_assignable_roles(text)') IS NULL THEN
    RAISE EXCEPTION 'Lot6 invite rpc stop: erp_assignable_roles missing';
  END IF;
  IF to_regprocedure('public.erp_unit_role_fits_type(text,text)') IS NULL THEN
    RAISE EXCEPTION 'Lot6 invite rpc stop: erp_unit_role_fits_type missing';
  END IF;
  IF to_regprocedure('public.erp_actor_highest_role(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Lot6 invite rpc stop: erp_actor_highest_role missing';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) erp_unit_invitation_create
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erp_unit_invitation_create(
  p_org_id uuid,
  p_unit_id uuid,
  p_email text,
  p_role text,
  p_actor_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role text;
  v_unit public.organization_units%ROWTYPE;
  v_email text;
  v_id uuid;
BEGIN
  v_email := lower(btrim(COALESCE(p_email, '')));
  IF length(v_email) < 4 OR position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION 'Lot6: invalid email';
  END IF;

  IF p_token_hash IS NULL OR length(btrim(p_token_hash)) < 16 THEN
    RAISE EXCEPTION 'Lot6: invalid token_hash';
  END IF;

  -- world_super_admin jamais invitable ; rôles hors liste refusés
  IF p_role IS NULL
     OR p_role = 'world_super_admin'
     OR p_role NOT IN (
       'world_admin',
       'zone_admin',
       'national_admin',
       'local_admin',
       'staff',
       'member',
       'viewer'
     ) THEN
    RAISE EXCEPTION 'Lot6: role not invitable';
  END IF;

  IF p_expires_at IS NULL OR p_expires_at <= now() THEN
    RAISE EXCEPTION 'Lot6: invalid expires_at';
  END IF;
  IF p_expires_at > now() + interval '7 days' THEN
    RAISE EXCEPTION 'Lot6: expires_at exceeds max TTL';
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

  SELECT * INTO v_unit
  FROM public.organization_units
  WHERE id = p_unit_id AND organization_id = p_org_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot6: unit not found';
  END IF;

  IF NOT public.erp_unit_role_fits_type(p_role, v_unit.unit_type) THEN
    RAISE EXCEPTION 'Lot6: role incompatible with unit_type';
  END IF;

  INSERT INTO public.organization_unit_invitations (
    organization_id,
    organization_unit_id,
    email,
    proposed_unit_role,
    token_hash,
    status,
    invited_by,
    expires_at
  ) VALUES (
    p_org_id,
    p_unit_id,
    v_email,
    p_role,
    p_token_hash,
    'pending',
    p_actor_id,
    p_expires_at
  )
  RETURNING id INTO v_id;

  INSERT INTO public.organization_unit_governance_events (
    organization_id,
    organization_unit_id,
    actor_user_id,
    action,
    to_role,
    invitation_id,
    metadata
  ) VALUES (
    p_org_id,
    p_unit_id,
    p_actor_id,
    'invite_create',
    p_role,
    v_id,
    jsonb_build_object('email', v_email)
  );

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) erp_unit_invitation_revoke (pending only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erp_unit_invitation_revoke(
  p_org_id uuid,
  p_invitation_id uuid,
  p_actor_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv public.organization_unit_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv
  FROM public.organization_unit_invitations
  WHERE id = p_invitation_id
    AND organization_id = p_org_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot6: invitation not found';
  END IF;

  IF v_inv.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Lot6: invitation not pending';
  END IF;

  IF NOT public.erp_actor_can_write_unit(p_org_id, p_actor_id, v_inv.organization_unit_id) THEN
    RAISE EXCEPTION 'Lot6: actor cannot write unit';
  END IF;

  UPDATE public.organization_unit_invitations SET
    status = 'revoked',
    revoked_at = now(),
    revoked_by = p_actor_id,
    updated_at = now()
  WHERE id = p_invitation_id;

  INSERT INTO public.organization_unit_governance_events (
    organization_id,
    organization_unit_id,
    actor_user_id,
    action,
    invitation_id,
    metadata
  ) VALUES (
    p_org_id,
    v_inv.organization_unit_id,
    p_actor_id,
    'invite_revoke',
    p_invitation_id,
    '{}'::jsonb
  );

  RETURN p_invitation_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Grants — service_role only
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.erp_unit_invitation_create(uuid, uuid, text, text, uuid, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_unit_invitation_revoke(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.erp_unit_invitation_create(uuid, uuid, text, text, uuid, text, timestamptz)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_unit_invitation_revoke(uuid, uuid, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Postchecks présence fonctions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  def_create text;
  def_revoke text;
BEGIN
  IF to_regprocedure(
    'public.erp_unit_invitation_create(uuid,uuid,text,text,uuid,text,timestamptz)'
  ) IS NULL THEN
    RAISE EXCEPTION 'Lot6 invite rpc postcheck: erp_unit_invitation_create missing';
  END IF;
  IF to_regprocedure('public.erp_unit_invitation_revoke(uuid,uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Lot6 invite rpc postcheck: erp_unit_invitation_revoke missing';
  END IF;

  SELECT pg_get_functiondef(
    'public.erp_unit_invitation_create(uuid,uuid,text,text,uuid,text,timestamptz)'::regprocedure
  ) INTO def_create;
  SELECT pg_get_functiondef(
    'public.erp_unit_invitation_revoke(uuid,uuid,uuid)'::regprocedure
  ) INTO def_revoke;

  IF def_create IS NULL
     OR position('invite_create' IN def_create) = 0
     OR position('p_token_hash' IN def_create) = 0
     OR position('erp_actor_can_write_unit' IN def_create) = 0
     OR position('erp_assignable_roles' IN def_create) = 0
     OR position('erp_unit_role_fits_type' IN def_create) = 0 THEN
    RAISE EXCEPTION 'Lot6 invite rpc postcheck: create function incomplete';
  END IF;

  -- pas de paramètre token clair
  IF position('p_token ' IN def_create) > 0
     OR position('p_clear' IN def_create) > 0 THEN
    RAISE EXCEPTION 'Lot6 invite rpc postcheck: clear token param forbidden';
  END IF;

  IF def_revoke IS NULL
     OR position('invite_revoke' IN def_revoke) = 0
     OR position('FOR UPDATE' IN def_revoke) = 0
     OR position('''revoked''' IN def_revoke) = 0
     OR position('erp_actor_can_write_unit' IN def_revoke) = 0 THEN
    RAISE EXCEPTION 'Lot6 invite rpc postcheck: revoke function incomplete';
  END IF;
END $$;

COMMIT;
