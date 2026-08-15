-- ============================================================================
-- 20260717120000_citadelle_erp_lot6_unit_governance.sql
-- Lot 6 — Gouvernance unitaires : nominations, invitations, audit append-only
-- FAIL-FAST single-shot. NE PAS rejouer. Appliquer manuellement (pas db push).
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.organization_units') IS NULL THEN
    RAISE EXCEPTION 'Lot6 stop: organization_units missing';
  END IF;
  IF to_regclass('public.organization_unit_members') IS NULL THEN
    RAISE EXCEPTION 'Lot6 stop: organization_unit_members missing';
  END IF;
  IF to_regclass('public.organization_unit_invitations') IS NOT NULL THEN
    RAISE EXCEPTION 'Lot6 stop: organization_unit_invitations already exists';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Extend organization_unit_members
-- ---------------------------------------------------------------------------
ALTER TABLE public.organization_unit_members
  ADD COLUMN IF NOT EXISTS nominated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nominated_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organization_unit_members_notes_len'
  ) THEN
    ALTER TABLE public.organization_unit_members
      ADD CONSTRAINT organization_unit_members_notes_len
      CHECK (notes IS NULL OR length(notes) <= 500);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) organization_unit_invitations
-- ---------------------------------------------------------------------------
CREATE TABLE public.organization_unit_invitations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL
                       REFERENCES public.organizations(id) ON DELETE RESTRICT,
  organization_unit_id uuid NOT NULL,
  email                text NOT NULL
                       CHECK (length(btrim(email)) > 3),
  email_normalized     text NOT NULL
                       GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  proposed_unit_role   text NOT NULL
                       CHECK (proposed_unit_role IN (
                         'world_admin',
                         'zone_admin',
                         'national_admin',
                         'local_admin',
                         'staff',
                         'member',
                         'viewer'
                       )),
  token_hash           text NOT NULL,
  status               text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'expired', 'revoked', 'consumed')),
  invited_by           uuid NOT NULL
                       REFERENCES public.profiles(id) ON DELETE RESTRICT,
  expires_at           timestamptz NOT NULL,
  accepted_at          timestamptz,
  accepted_user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at           timestamptz,
  revoked_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_unit_invitations_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT organization_unit_invitations_expires_after_create
    CHECK (
      expires_at > created_at
      AND expires_at <= created_at + interval '7 days'
    ),
  CONSTRAINT organization_unit_invitations_unit_org_fk
    FOREIGN KEY (organization_id, organization_unit_id)
    REFERENCES public.organization_units (organization_id, id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX organization_unit_invitations_pending_email_unit
  ON public.organization_unit_invitations (organization_unit_id, email_normalized)
  WHERE status = 'pending';

CREATE INDEX idx_oui_org ON public.organization_unit_invitations (organization_id);
CREATE INDEX idx_oui_unit_status ON public.organization_unit_invitations (organization_unit_id, status);
CREATE INDEX idx_oui_expires
  ON public.organization_unit_invitations (expires_at)
  WHERE status = 'pending';

CREATE TRIGGER organization_unit_invitations_updated_at
  BEFORE UPDATE ON public.organization_unit_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 3) organization_unit_governance_events (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE public.organization_unit_governance_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL
                       REFERENCES public.organizations(id) ON DELETE RESTRICT,
  organization_unit_id uuid,
  subject_user_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_user_id        uuid NOT NULL
                       REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action               text NOT NULL
                       CHECK (action IN (
                         'nominate',
                         'invite_create',
                         'invite_accept',
                         'invite_revoke',
                         'invite_expire',
                         'transfer',
                         'role_change',
                         'suspend',
                         'reactivate',
                         'remove'
                       )),
  from_role            text,
  to_role              text,
  from_unit_id         uuid,
  to_unit_id           uuid,
  invitation_id        uuid,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_unit_governance_events_unit_org_fk
    FOREIGN KEY (organization_id, organization_unit_id)
    REFERENCES public.organization_units (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT organization_unit_governance_events_from_unit_org_fk
    FOREIGN KEY (organization_id, from_unit_id)
    REFERENCES public.organization_units (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT organization_unit_governance_events_to_unit_org_fk
    FOREIGN KEY (organization_id, to_unit_id)
    REFERENCES public.organization_units (organization_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT organization_unit_governance_events_invitation_fk
    FOREIGN KEY (invitation_id)
    REFERENCES public.organization_unit_invitations (id)
    ON DELETE RESTRICT
);

CREATE INDEX idx_ouge_org_created
  ON public.organization_unit_governance_events (organization_id, created_at DESC);
CREATE INDEX idx_ouge_unit_created
  ON public.organization_unit_governance_events (organization_unit_id, created_at DESC)
  WHERE organization_unit_id IS NOT NULL;
CREATE INDEX idx_ouge_subject
  ON public.organization_unit_governance_events (subject_user_id, created_at DESC)
  WHERE subject_user_id IS NOT NULL;
CREATE INDEX idx_ouge_actor
  ON public.organization_unit_governance_events (actor_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.erp_governance_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'organization_unit_governance_events is append-only';
END;
$$;

CREATE TRIGGER organization_unit_governance_events_no_update
  BEFORE UPDATE ON public.organization_unit_governance_events
  FOR EACH ROW EXECUTE FUNCTION public.erp_governance_events_immutable();

CREATE TRIGGER organization_unit_governance_events_no_delete
  BEFORE DELETE ON public.organization_unit_governance_events
  FOR EACH ROW EXECUTE FUNCTION public.erp_governance_events_immutable();

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.organization_unit_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_unit_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_unit_governance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_unit_governance_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organization_unit_invitations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.organization_unit_governance_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.organization_unit_invitations TO service_role;
GRANT ALL ON TABLE public.organization_unit_governance_events TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Helpers SQL
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erp_unit_role_rank(p_role text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'viewer' THEN 1
    WHEN 'member' THEN 2
    WHEN 'staff' THEN 3
    WHEN 'local_admin' THEN 4
    WHEN 'national_admin' THEN 5
    WHEN 'zone_admin' THEN 6
    WHEN 'world_admin' THEN 7
    WHEN 'world_super_admin' THEN 8
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.erp_unit_role_fits_type(p_role text, p_unit_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_role IN ('world_super_admin', 'world_admin') THEN p_unit_type = 'world_headquarters'
    WHEN p_role = 'zone_admin' THEN p_unit_type = 'continental_zone'
    WHEN p_role = 'national_admin' THEN p_unit_type = 'national_central_church'
    WHEN p_role = 'local_admin' THEN p_unit_type = 'local_church'
    WHEN p_role IN ('staff', 'member', 'viewer') THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.erp_actor_highest_role(
  p_org_id uuid,
  p_user_id uuid
) RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.unit_role
  FROM public.organization_unit_members m
  WHERE m.organization_id = p_org_id
    AND m.user_id = p_user_id
    AND m.status = 'active'
  ORDER BY public.erp_unit_role_rank(m.unit_role) DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.erp_actor_can_write_unit(
  p_org_id uuid,
  p_actor_id uuid,
  p_unit_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target public.organization_units%ROWTYPE;
  m RECORD;
BEGIN
  SELECT * INTO target FROM public.organization_units
  WHERE id = p_unit_id AND organization_id = p_org_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  FOR m IN
    SELECT um.unit_role, u.materialized_path
    FROM public.organization_unit_members um
    JOIN public.organization_units u ON u.id = um.organization_unit_id
    WHERE um.organization_id = p_org_id
      AND um.user_id = p_actor_id
      AND um.status = 'active'
      AND um.unit_role IN (
        'world_super_admin', 'world_admin', 'zone_admin', 'national_admin', 'local_admin'
      )
  LOOP
    IF m.unit_role IN ('world_super_admin', 'world_admin') THEN
      RETURN true;
    END IF;
    IF m.unit_role IN ('zone_admin', 'national_admin') THEN
      IF target.materialized_path = m.materialized_path
         OR target.materialized_path LIKE m.materialized_path || '%' THEN
        RETURN true;
      END IF;
    END IF;
    IF m.unit_role = 'local_admin' AND target.id = (
      SELECT organization_unit_id FROM public.organization_unit_members
      WHERE organization_id = p_org_id AND user_id = p_actor_id AND status = 'active'
        AND unit_role = 'local_admin' AND organization_unit_id = p_unit_id
      LIMIT 1
    ) THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_assignable_roles(p_highest text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_highest
    WHEN 'world_super_admin' THEN ARRAY[
      'world_admin','zone_admin','national_admin','local_admin','staff','member','viewer'
    ]
    WHEN 'world_admin' THEN ARRAY[
      'zone_admin','national_admin','local_admin','staff','member','viewer'
    ]
    WHEN 'zone_admin' THEN ARRAY[
      'national_admin','local_admin','staff','member','viewer'
    ]
    WHEN 'national_admin' THEN ARRAY[
      'local_admin','staff','member','viewer'
    ]
    WHEN 'local_admin' THEN ARRAY['staff','member','viewer']
    ELSE ARRAY[]::text[]
  END;
$$;

CREATE OR REPLACE FUNCTION public.erp_count_active_super(p_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer
  FROM public.organization_unit_members
  WHERE organization_id = p_org_id
    AND unit_role = 'world_super_admin'
    AND status = 'active';
$$;

-- ---------------------------------------------------------------------------
-- 6) RPC: nominate
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
    -- is_primary NEVER moved by nominate
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
-- 7) RPC: set_status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erp_unit_membership_set_status(
  p_membership_id uuid,
  p_status text,
  p_actor_id uuid,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_m public.organization_unit_members%ROWTYPE;
  v_actor_role text;
  v_action text;
BEGIN
  IF p_status NOT IN ('active', 'suspended', 'removed') THEN
    RAISE EXCEPTION 'Lot6: invalid status';
  END IF;

  SELECT * INTO v_m FROM public.organization_unit_members WHERE id = p_membership_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot6: membership not found';
  END IF;

  v_actor_role := public.erp_actor_highest_role(v_m.organization_id, p_actor_id);
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Lot6: actor has no active unit membership';
  END IF;
  IF NOT public.erp_actor_can_write_unit(v_m.organization_id, p_actor_id, v_m.organization_unit_id) THEN
    RAISE EXCEPTION 'Lot6: actor cannot write unit';
  END IF;

  IF p_actor_id = v_m.user_id AND p_status IN ('removed', 'suspended') THEN
    IF public.erp_unit_role_rank(v_m.unit_role) >= 4 THEN
      RAISE EXCEPTION 'Lot6: self-sensitive demotion forbidden';
    END IF;
  END IF;

  IF public.erp_unit_role_rank(v_m.unit_role) > public.erp_unit_role_rank(v_actor_role) THEN
    RAISE EXCEPTION 'Lot6: cannot manage superior';
  END IF;
  IF public.erp_unit_role_rank(v_m.unit_role) = public.erp_unit_role_rank(v_actor_role)
     AND v_actor_role IS DISTINCT FROM 'world_super_admin' THEN
    RAISE EXCEPTION 'Lot6: peer management forbidden';
  END IF;

  IF v_m.unit_role = 'world_super_admin' AND v_m.status = 'active'
     AND p_status IN ('suspended', 'removed')
     AND public.erp_count_active_super(v_m.organization_id) <= 1 THEN
    RAISE EXCEPTION 'Lot6: cannot suspend/remove last world_super_admin';
  END IF;

  IF p_status = 'suspended' THEN
    v_action := 'suspend';
    UPDATE public.organization_unit_members SET
      status = 'suspended',
      suspended_by = p_actor_id,
      suspended_at = now(),
      is_primary = false,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE id = p_membership_id;
  ELSIF p_status = 'removed' THEN
    v_action := 'remove';
    UPDATE public.organization_unit_members SET
      status = 'removed',
      removed_by = p_actor_id,
      removed_at = now(),
      is_primary = false,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE id = p_membership_id;
  ELSE
    v_action := 'reactivate';
    UPDATE public.organization_unit_members SET
      status = 'active',
      suspended_by = NULL,
      suspended_at = NULL,
      removed_by = NULL,
      removed_at = NULL,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE id = p_membership_id;
  END IF;

  INSERT INTO public.organization_unit_governance_events (
    organization_id, organization_unit_id, subject_user_id, actor_user_id,
    action, from_role, to_role, metadata
  ) VALUES (
    v_m.organization_id, v_m.organization_unit_id, v_m.user_id, p_actor_id,
    v_action, v_m.unit_role, v_m.unit_role,
    jsonb_build_object('membership_id', p_membership_id, 'to_status', p_status)
  );

  RETURN p_membership_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) RPC: change_role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erp_unit_membership_change_role(
  p_membership_id uuid,
  p_new_role text,
  p_actor_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_m public.organization_unit_members%ROWTYPE;
  v_unit public.organization_units%ROWTYPE;
  v_actor_role text;
BEGIN
  SELECT * INTO v_m FROM public.organization_unit_members WHERE id = p_membership_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot6: membership not found';
  END IF;
  IF v_m.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Lot6: membership not active';
  END IF;

  v_actor_role := public.erp_actor_highest_role(v_m.organization_id, p_actor_id);
  IF v_actor_role IS NULL OR NOT public.erp_actor_can_write_unit(v_m.organization_id, p_actor_id, v_m.organization_unit_id) THEN
    RAISE EXCEPTION 'Lot6: actor unauthorized';
  END IF;
  IF NOT (p_new_role = ANY (public.erp_assignable_roles(v_actor_role))) THEN
    RAISE EXCEPTION 'Lot6: role not assignable';
  END IF;
  IF p_actor_id = v_m.user_id AND public.erp_unit_role_rank(p_new_role) > public.erp_unit_role_rank(v_m.unit_role) THEN
    RAISE EXCEPTION 'Lot6: self-promotion forbidden';
  END IF;
  IF p_actor_id = v_m.user_id
     AND public.erp_unit_role_rank(v_m.unit_role) >= 4
     AND public.erp_unit_role_rank(p_new_role) < 4 THEN
    RAISE EXCEPTION 'Lot6: self-sensitive demotion forbidden';
  END IF;
  IF public.erp_unit_role_rank(v_m.unit_role) > public.erp_unit_role_rank(v_actor_role) THEN
    RAISE EXCEPTION 'Lot6: cannot manage superior';
  END IF;
  IF public.erp_unit_role_rank(v_m.unit_role) = public.erp_unit_role_rank(v_actor_role)
     AND v_actor_role IS DISTINCT FROM 'world_super_admin' THEN
    RAISE EXCEPTION 'Lot6: peer management forbidden';
  END IF;
  IF v_m.unit_role = 'world_super_admin'
     AND p_new_role IS DISTINCT FROM 'world_super_admin'
     AND public.erp_count_active_super(v_m.organization_id) <= 1 THEN
    RAISE EXCEPTION 'Lot6: cannot demote last world_super_admin';
  END IF;

  SELECT * INTO v_unit FROM public.organization_units WHERE id = v_m.organization_unit_id;
  IF NOT public.erp_unit_role_fits_type(p_new_role, v_unit.unit_type) THEN
    RAISE EXCEPTION 'Lot6: role incompatible with unit_type';
  END IF;

  UPDATE public.organization_unit_members SET
    unit_role = p_new_role,
    nominated_by = p_actor_id,
    nominated_at = now(),
    updated_at = now()
  WHERE id = p_membership_id;

  INSERT INTO public.organization_unit_governance_events (
    organization_id, organization_unit_id, subject_user_id, actor_user_id,
    action, from_role, to_role, metadata
  ) VALUES (
    v_m.organization_id, v_m.organization_unit_id, v_m.user_id, p_actor_id,
    'role_change', v_m.unit_role, p_new_role,
    jsonb_build_object('membership_id', p_membership_id)
  );

  RETURN p_membership_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9) RPC: transfer (only path that may move is_primary)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erp_unit_membership_transfer(
  p_membership_id uuid,
  p_to_unit_id uuid,
  p_actor_id uuid,
  p_role text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_m public.organization_unit_members%ROWTYPE;
  v_to public.organization_units%ROWTYPE;
  v_actor_role text;
  v_role text;
  v_was_primary boolean;
  v_new_id uuid;
  v_existing public.organization_unit_members%ROWTYPE;
BEGIN
  SELECT * INTO v_m FROM public.organization_unit_members WHERE id = p_membership_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot6: membership not found';
  END IF;
  IF v_m.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Lot6: only active membership can transfer';
  END IF;

  v_actor_role := public.erp_actor_highest_role(v_m.organization_id, p_actor_id);
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Lot6: actor unauthorized';
  END IF;
  IF NOT public.erp_actor_can_write_unit(v_m.organization_id, p_actor_id, v_m.organization_unit_id) THEN
    RAISE EXCEPTION 'Lot6: actor cannot write source unit';
  END IF;
  IF NOT public.erp_actor_can_write_unit(v_m.organization_id, p_actor_id, p_to_unit_id) THEN
    RAISE EXCEPTION 'Lot6: actor cannot write target unit';
  END IF;

  IF public.erp_unit_role_rank(v_m.unit_role) >= public.erp_unit_role_rank(v_actor_role)
     AND v_actor_role IS DISTINCT FROM 'world_super_admin' THEN
    RAISE EXCEPTION 'Lot6: cannot transfer peer or superior';
  END IF;

  IF v_m.unit_role = 'world_super_admin' AND public.erp_count_active_super(v_m.organization_id) <= 1 THEN
    RAISE EXCEPTION 'Lot6: cannot transfer last world_super_admin off HQ without replacement';
  END IF;

  SELECT * INTO v_to FROM public.organization_units
  WHERE id = p_to_unit_id AND organization_id = v_m.organization_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot6: target unit not found';
  END IF;

  v_role := COALESCE(p_role, v_m.unit_role);
  IF NOT (v_role = ANY (public.erp_assignable_roles(v_actor_role))) THEN
    RAISE EXCEPTION 'Lot6: role not assignable';
  END IF;
  IF NOT public.erp_unit_role_fits_type(v_role, v_to.unit_type) THEN
    RAISE EXCEPTION 'Lot6: role incompatible with target unit_type';
  END IF;

  v_was_primary := v_m.is_primary;

  UPDATE public.organization_unit_members SET
    status = 'removed',
    is_primary = false,
    removed_by = p_actor_id,
    removed_at = now(),
    updated_at = now()
  WHERE id = p_membership_id;

  SELECT * INTO v_existing FROM public.organization_unit_members
  WHERE organization_unit_id = p_to_unit_id AND user_id = v_m.user_id FOR UPDATE;

  IF FOUND THEN
    UPDATE public.organization_unit_members SET
      unit_role = v_role,
      status = 'active',
      is_primary = v_was_primary,
      nominated_by = p_actor_id,
      nominated_at = now(),
      removed_by = NULL,
      removed_at = NULL,
      suspended_by = NULL,
      suspended_at = NULL,
      updated_at = now()
    WHERE id = v_existing.id;
    v_new_id := v_existing.id;
  ELSE
    INSERT INTO public.organization_unit_members (
      organization_id, organization_unit_id, user_id, unit_role, status,
      is_primary, nominated_by, nominated_at
    ) VALUES (
      v_m.organization_id, p_to_unit_id, v_m.user_id, v_role, 'active',
      v_was_primary, p_actor_id, now()
    ) RETURNING id INTO v_new_id;
  END IF;

  IF v_was_primary THEN
    UPDATE public.organization_unit_members SET is_primary = false
    WHERE organization_id = v_m.organization_id
      AND user_id = v_m.user_id
      AND id IS DISTINCT FROM v_new_id
      AND is_primary = true;
  END IF;

  INSERT INTO public.organization_unit_governance_events (
    organization_id, organization_unit_id, subject_user_id, actor_user_id,
    action, from_role, to_role, from_unit_id, to_unit_id, metadata
  ) VALUES (
    v_m.organization_id, p_to_unit_id, v_m.user_id, p_actor_id,
    'transfer', v_m.unit_role, v_role, v_m.organization_unit_id, p_to_unit_id,
    jsonb_build_object(
      'from_membership_id', p_membership_id,
      'to_membership_id', v_new_id,
      'moved_primary', v_was_primary
    )
  );

  RETURN v_new_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10) RPC: invitation accept
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
  SELECT * INTO v_inv FROM public.organization_unit_invitations
  WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot6: invitation not found';
  END IF;

  IF v_inv.status = 'pending' AND v_inv.expires_at < now() THEN
    UPDATE public.organization_unit_invitations SET status = 'expired', updated_at = now()
    WHERE id = v_inv.id;
    INSERT INTO public.organization_unit_governance_events (
      organization_id, organization_unit_id, actor_user_id, action, invitation_id, metadata
    ) VALUES (
      v_inv.organization_id, v_inv.organization_unit_id, p_user_id, 'invite_expire', v_inv.id, '{}'::jsonb
    );
    RAISE EXCEPTION 'Lot6: invitation expired';
  END IF;

  IF v_inv.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Lot6: invitation not pending';
  END IF;

  IF v_inv.email_normalized IS DISTINCT FROM v_email THEN
    RAISE EXCEPTION 'Lot6: email mismatch';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Lot6: profile required';
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
    -- is_primary not moved
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
-- Grants RPC
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.erp_unit_membership_nominate(uuid, uuid, uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_unit_membership_set_status(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_unit_membership_change_role(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_unit_membership_transfer(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_unit_invitation_accept(text, uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.erp_unit_membership_nominate(uuid, uuid, uuid, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_unit_membership_set_status(uuid, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_unit_membership_change_role(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_unit_membership_transfer(uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_unit_invitation_accept(text, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.erp_governance_events_immutable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erp_governance_events_immutable() TO service_role;

-- ---------------------------------------------------------------------------
-- Postchecks
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c integer;
BEGIN
  IF to_regclass('public.organization_unit_invitations') IS NULL THEN
    RAISE EXCEPTION 'Lot6 postcheck: invitations missing';
  END IF;
  IF to_regclass('public.organization_unit_governance_events') IS NULL THEN
    RAISE EXCEPTION 'Lot6 postcheck: events missing';
  END IF;
  SELECT count(*) INTO c FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'organization_unit_members'
    AND column_name IN ('nominated_by','nominated_at','suspended_by','suspended_at','removed_by','removed_at','notes');
  IF c < 7 THEN
    RAISE EXCEPTION 'Lot6 postcheck: membership columns incomplete count=%', c;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'organization_unit_governance_events_no_update'
  ) THEN
    RAISE EXCEPTION 'Lot6 postcheck: immutable update trigger missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'erp_unit_membership_nominate'
  ) THEN
    RAISE EXCEPTION 'Lot6 postcheck: nominate RPC missing';
  END IF;
END $$;

COMMIT;
