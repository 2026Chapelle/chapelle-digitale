-- ============================================================================
-- 20260715120000_citadelle_erp_lot1_organizations.sql
-- MIGRATION VERSIONNÉE FAIL-FAST — Lot 1 Organizations SaaS
-- Aligné src/core/erp Organization / OrganizationMembership (design V2.1)
--
-- Structure : CREATE strict (échoue si objet déjà présent). Une seule application.
-- Seed : INSERT ... ON CONFLICT DO NOTHING uniquement (idempotent insert-only).
-- NE PAS confondre idempotence du seed avec rejouabilité de la migration.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) GARDE OWNER (avant toute création)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  profiles_total      integer;
  active_super_admins integer;
BEGIN
  SELECT count(*) INTO profiles_total FROM public.profiles;
  SELECT count(*) INTO active_super_admins
  FROM public.profiles
  WHERE role = 'super_admin' AND statut = 'actif';

  IF profiles_total > 0 AND active_super_admins = 0 THEN
    RAISE EXCEPTION
      'Lot1 ERP: % profil(s) existent mais aucun super_admin actif — refus (aucune auto-promotion)',
      profiles_total;
  END IF;
  -- profiles_total = 0 : environnement neuf → organisation sans membership autorisée
END $$;

-- ---------------------------------------------------------------------------
-- 2) TABLES (CREATE strict)
-- ---------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  slug             text NOT NULL,
  status           text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'suspended', 'archived')),
  country          text,
  timezone         text NOT NULL DEFAULT 'Africa/Abidjan',
  default_locale   text NOT NULL DEFAULT 'fr',
  default_currency text NOT NULL DEFAULT 'XOF',
  logo_url         text,
  created_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_name_nonempty
    CHECK (length(btrim(name)) > 0),
  CONSTRAINT organizations_slug_nonempty
    CHECK (length(btrim(slug)) > 0),
  CONSTRAINT organizations_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT organizations_locale_nonempty
    CHECK (length(btrim(default_locale)) > 0),
  CONSTRAINT organizations_currency_nonempty
    CHECK (length(btrim(default_currency)) > 0),
  CONSTRAINT organizations_timezone_nonempty
    CHECK (length(btrim(timezone)) > 0),
  CONSTRAINT organizations_slug_unique UNIQUE (slug)
);

CREATE TABLE public.organization_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL
                   REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id          uuid NOT NULL
                   REFERENCES public.profiles(id) ON DELETE CASCADE,
  membership_role  text NOT NULL
                   CHECK (membership_role IN ('owner', 'admin', 'staff', 'member')),
  status           text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  is_default       boolean NOT NULL DEFAULT false,
  joined_at        timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_org_user_unique
    UNIQUE (organization_id, user_id),
  CONSTRAINT organization_members_default_requires_active
    CHECK (is_default = false OR status = 'active')
);

-- ---------------------------------------------------------------------------
-- 3) INDEXES (CREATE strict)
-- ---------------------------------------------------------------------------
CREATE INDEX idx_organizations_status
  ON public.organizations (status);

CREATE UNIQUE INDEX idx_org_members_one_default_per_user
  ON public.organization_members (user_id)
  WHERE is_default = true;

CREATE INDEX idx_org_members_org
  ON public.organization_members (organization_id);
CREATE INDEX idx_org_members_user
  ON public.organization_members (user_id);
CREATE INDEX idx_org_members_status
  ON public.organization_members (status);

-- ---------------------------------------------------------------------------
-- 4) TRIGGERS (réutilise public.update_updated_at — migration 001)
-- ---------------------------------------------------------------------------
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 5) SEED ORGANISATION (insert-only)
-- ---------------------------------------------------------------------------
INSERT INTO public.organizations (
  name, slug, status, country, timezone, default_locale, default_currency, created_by
) VALUES (
  'La Chapelle Internationale des Élus du Royaume',
  'chapelle-du-royaume',
  'active',
  'CI',
  'Africa/Abidjan',
  'fr',
  'XOF',
  null
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6) CONTRÔLE DRIFT (slug existant = valeurs canoniques exactes)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r public.organizations%ROWTYPE;
BEGIN
  SELECT * INTO STRICT r
  FROM public.organizations
  WHERE slug = 'chapelle-du-royaume';

  IF r.name IS DISTINCT FROM 'La Chapelle Internationale des Élus du Royaume'
     OR r.status IS DISTINCT FROM 'active'
     OR r.country IS DISTINCT FROM 'CI'
     OR r.timezone IS DISTINCT FROM 'Africa/Abidjan'
     OR r.default_locale IS DISTINCT FROM 'fr'
     OR r.default_currency IS DISTINCT FROM 'XOF'
  THEN
    RAISE EXCEPTION
      'Lot1 ERP: organization slug chapelle-du-royaume existe avec valeurs non canoniques (drift) — refus sans écrasement';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7) SEED MEMBERSHIPS (insert-only — ne réécrit pas un membership existant)
-- ---------------------------------------------------------------------------
INSERT INTO public.organization_members (
  organization_id, user_id, membership_role, status, is_default, joined_at
)
SELECT
  o.id,
  p.id,
  CASE p.role::text
    WHEN 'super_admin' THEN 'owner'
    WHEN 'admin' THEN 'admin'
    WHEN 'formateur' THEN 'staff'
    WHEN 'responsable_integration' THEN 'staff'
    WHEN 'responsable_national' THEN 'staff'
    WHEN 'pasteur_national' THEN 'staff'
    WHEN 'pasteur' THEN 'staff'
    WHEN 'nation_pastor' THEN 'staff'
    WHEN 'platform_admin' THEN 'staff'
    WHEN 'responsable_antenne' THEN 'staff'
    WHEN 'coordinateur' THEN 'staff'
    WHEN 'responsable_mahanaim' THEN 'staff'
    WHEN 'intercesseur' THEN 'staff'
    WHEN 'berger' THEN 'staff'
    WHEN 'leader' THEN 'staff'
    WHEN 'mentor' THEN 'staff'
    WHEN 'missionnaire' THEN 'staff'
    WHEN 'crisis_lead' THEN 'staff'
    ELSE 'member'
  END,
  CASE p.statut::text
    WHEN 'actif' THEN 'active'
    WHEN 'en_attente' THEN 'invited'
    WHEN 'inactif' THEN 'suspended'
    WHEN 'suspendu' THEN 'suspended'
    ELSE 'suspended'
  END,
  (p.statut::text = 'actif'),
  now()
FROM public.profiles p
CROSS JOIN public.organizations o
WHERE o.slug = 'chapelle-du-royaume'
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8) HELPERS SECURITY DEFINER
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.erp_org_has_active_membership(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

CREATE FUNCTION public.erp_org_is_owner_or_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.membership_role IN ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- 9) RLS (ENABLE only — pas de FORCE) + 3 policies SELECT
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_select_member
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (public.erp_org_has_active_membership(id));

CREATE POLICY organization_members_select_own
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY organization_members_select_org_admins
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (public.erp_org_is_owner_or_admin(organization_id));

-- Aucune policy INSERT / UPDATE / DELETE

-- ---------------------------------------------------------------------------
-- 10) PRIVILÈGES
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.organizations FROM PUBLIC;
REVOKE ALL ON TABLE public.organizations FROM anon;
REVOKE ALL ON TABLE public.organizations FROM authenticated;

REVOKE ALL ON TABLE public.organization_members FROM PUBLIC;
REVOKE ALL ON TABLE public.organization_members FROM anon;
REVOKE ALL ON TABLE public.organization_members FROM authenticated;

GRANT SELECT ON TABLE public.organizations TO authenticated;
GRANT SELECT ON TABLE public.organization_members TO authenticated;

GRANT ALL ON TABLE public.organizations TO service_role;
GRANT ALL ON TABLE public.organization_members TO service_role;

REVOKE ALL ON FUNCTION public.erp_org_has_active_membership(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.erp_org_has_active_membership(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.erp_org_has_active_membership(uuid) FROM authenticated;

REVOKE ALL ON FUNCTION public.erp_org_is_owner_or_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.erp_org_is_owner_or_admin(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.erp_org_is_owner_or_admin(uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.erp_org_has_active_membership(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_org_is_owner_or_admin(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11) POSTCHECKS
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  org_count   integer;
  owner_count integer;
  prof_count  integer;
BEGIN
  SELECT count(*) INTO org_count FROM public.organizations;
  IF org_count <> 1 THEN
    RAISE EXCEPTION 'Lot1 ERP postcheck: expected exactly 1 organization, got %', org_count;
  END IF;

  SELECT count(*) INTO prof_count FROM public.profiles;
  SELECT count(*) INTO owner_count
  FROM public.organization_members m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE o.slug = 'chapelle-du-royaume'
    AND m.membership_role = 'owner'
    AND m.status = 'active';

  IF prof_count > 0 AND owner_count < 1 THEN
    RAISE EXCEPTION
      'Lot1 ERP postcheck: profiles existent mais aucun owner membership actif';
  END IF;
END $$;

COMMIT;
