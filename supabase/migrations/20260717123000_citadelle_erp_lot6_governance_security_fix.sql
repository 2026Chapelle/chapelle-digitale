-- ============================================================================
-- 20260717123000_citadelle_erp_lot6_governance_security_fix.sql
-- Lot 6 — correctif sécurité post-SQL (additif, single-shot).
-- Prérequis : migration 20260717120000 déjà appliquée.
-- NE PAS rejouer. Appliquer manuellement (pas db push).
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.organization_unit_invitations') IS NULL THEN
    RAISE EXCEPTION 'Lot6 security fix stop: organization_unit_invitations missing';
  END IF;
  IF to_regclass('public.organization_unit_governance_events') IS NULL THEN
    RAISE EXCEPTION 'Lot6 security fix stop: organization_unit_governance_events missing';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) UNIQUE (organization_id, id) — source pour FK composite invitation
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_unit_invitations_org_id_uidx'
  ) THEN
    ALTER TABLE public.organization_unit_invitations
      ADD CONSTRAINT organization_unit_invitations_org_id_uidx
      UNIQUE (organization_id, id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) FK invitation composite (organization_id, invitation_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.organization_unit_governance_events
  DROP CONSTRAINT IF EXISTS organization_unit_governance_events_invitation_fk;

ALTER TABLE public.organization_unit_governance_events
  ADD CONSTRAINT organization_unit_governance_events_invitation_fk
  FOREIGN KEY (organization_id, invitation_id)
  REFERENCES public.organization_unit_invitations (organization_id, id)
  ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 3) Frontière materialized_path (preuve Lot 5)
--    Lot5 : HQ = '/' || id || '/' ; enfant = parent.path || id || '/'
--    Toujours terminé par '/'. Boundary : rtrim + '/%' (pas de préfixe nu).
-- ---------------------------------------------------------------------------
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
         OR target.materialized_path LIKE rtrim(m.materialized_path, '/') || '/%' THEN
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

-- ---------------------------------------------------------------------------
-- 4) Helpers Lot 6 : REVOKE PUBLIC/anon/authenticated, GRANT service_role
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.erp_unit_role_rank(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_unit_role_fits_type(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_actor_highest_role(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_actor_can_write_unit(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_assignable_roles(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_count_active_super(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.erp_unit_role_rank(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_unit_role_fits_type(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_actor_highest_role(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_actor_can_write_unit(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_assignable_roles(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_count_active_super(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 5) Cinq RPC mutation : confirmer service_role only
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
  def text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_unit_invitations_org_id_uidx'
  ) THEN
    RAISE EXCEPTION 'Lot6 security fix postcheck: UNIQUE (organization_id, id) missing';
  END IF;

  SELECT count(*) INTO c
  FROM pg_constraint
  WHERE conname = 'organization_unit_governance_events_invitation_fk'
    AND contype = 'f';
  IF c <> 1 THEN
    RAISE EXCEPTION 'Lot6 security fix postcheck: invitation FK missing';
  END IF;

  -- FK must reference composite (organization_id, id) on invitations
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'organization_unit_governance_events'
      AND con.conname = 'organization_unit_governance_events_invitation_fk'
      AND con.confdeltype = 'r' -- RESTRICT
      AND array_length(con.conkey, 1) = 2
  ) THEN
    RAISE EXCEPTION 'Lot6 security fix postcheck: invitation FK not composite RESTRICT';
  END IF;

  SELECT pg_get_functiondef('public.erp_actor_can_write_unit(uuid,uuid,uuid)'::regprocedure)
  INTO def;
  IF def IS NULL OR position('rtrim(m.materialized_path, ''/'') || ''/%''' IN def) = 0 THEN
    -- tolerate alternate quoting in pg_get_functiondef
    IF def IS NULL OR position('rtrim' IN def) = 0 OR position('/%' IN def) = 0 THEN
      RAISE EXCEPTION 'Lot6 security fix postcheck: path boundary missing in erp_actor_can_write_unit';
    END IF;
  END IF;
END $$;

COMMIT;
