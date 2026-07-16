-- ============================================================================
-- 20260716180000_citadelle_erp_lot5_organization_units.sql
-- Lot 5 — Hiérarchie mondiale interne (OrganizationUnit)
-- FAIL-FAST, single-shot. NE PAS rejouer. Appliquer manuellement (pas db push).
-- Organization reste le tenant unique (slug chapelle-du-royaume).
-- Aucun COMMIT partiel : une seule transaction.
--
-- SSOT : colonnes opérationnelles (timezone, locale, currency, contact, address)
-- uniquement dans organization_unit_settings — jamais dans organization_units.
-- Parcours pastoral : import exclusif depuis newcomer_journey_steps (aucun fallback).
-- Intégrité cross-org : FK composites (organization_id, organization_unit_id).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Gardes préalables (structure + référentiel pastoral fail-fast)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  org_count integer;
  step_count integer;
  empty_key_count integer;
  dup_key_count integer;
  dup_order_count integer;
BEGIN
  IF to_regclass('public.organizations') IS NULL THEN
    RAISE EXCEPTION 'Lot5 stop: public.organizations is missing';
  END IF;
  IF to_regclass('public.organization_members') IS NULL THEN
    RAISE EXCEPTION 'Lot5 stop: public.organization_members is missing';
  END IF;
  IF to_regclass('public.newcomer_intakes') IS NULL THEN
    RAISE EXCEPTION 'Lot5 stop: public.newcomer_intakes is missing';
  END IF;
  IF to_regclass('public.organization_units') IS NOT NULL THEN
    RAISE EXCEPTION 'Lot5 stop: organization_units already exists';
  END IF;

  -- Référentiel pastoral obligatoire (aucune clé inventée / aucun fallback codé)
  IF to_regclass('public.newcomer_journey_steps') IS NULL THEN
    RAISE EXCEPTION 'Lot5 stop: public.newcomer_journey_steps is missing (référentiel pastoral requis)';
  END IF;

  SELECT count(*) INTO step_count
  FROM public.newcomer_journey_steps s
  WHERE s.step_key IS NOT NULL AND length(btrim(s.step_key)) > 0;

  IF step_count < 1 THEN
    RAISE EXCEPTION 'Lot5 stop: newcomer_journey_steps has no valid step (at least one required)';
  END IF;

  SELECT count(*) INTO empty_key_count
  FROM public.newcomer_journey_steps s
  WHERE s.step_key IS NULL OR length(btrim(s.step_key)) = 0;

  IF empty_key_count > 0 THEN
    RAISE EXCEPTION 'Lot5 stop: newcomer_journey_steps contains empty step_key (count=%)', empty_key_count;
  END IF;

  SELECT count(*) INTO dup_key_count
  FROM (
    SELECT s.step_key
    FROM public.newcomer_journey_steps s
    GROUP BY s.step_key
    HAVING count(*) > 1
  ) d;

  IF dup_key_count > 0 THEN
    RAISE EXCEPTION 'Lot5 stop: newcomer_journey_steps has incompatible duplicate step_key (groups=%)', dup_key_count;
  END IF;

  SELECT count(*) INTO dup_order_count
  FROM (
    SELECT s.sort_order
    FROM public.newcomer_journey_steps s
    GROUP BY s.sort_order
    HAVING count(*) > 1
  ) d;

  IF dup_order_count > 0 THEN
    RAISE EXCEPTION 'Lot5 stop: newcomer_journey_steps has incompatible duplicate sort_order (groups=%)', dup_order_count;
  END IF;

  SELECT count(*) INTO org_count
  FROM public.organizations
  WHERE slug = 'chapelle-du-royaume';

  IF org_count <> 1 THEN
    RAISE EXCEPTION
      'Lot5 stop: organisation canonique count=% (attendu 1)', org_count;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) organization_units (structurelle uniquement — pas de timezone/locale/contact)
-- ---------------------------------------------------------------------------
CREATE TABLE public.organization_units (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL
                    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  parent_id         uuid
                    REFERENCES public.organization_units(id) ON DELETE RESTRICT,
  unit_type         text NOT NULL
                    CHECK (unit_type IN (
                      'world_headquarters',
                      'continental_zone',
                      'national_central_church',
                      'local_church'
                    )),
  name              text NOT NULL,
  slug              text NOT NULL,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'archived')),
  continent_code    text,
  country_code      text,
  city              text,
  -- Chemin matérialisé UUID : /{uuid}/.../ généré serveur/SQL uniquement
  materialized_path text NOT NULL,
  depth             smallint NOT NULL DEFAULT 0
                    CHECK (depth >= 0 AND depth <= 3),
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_units_name_nonempty
    CHECK (length(btrim(name)) > 0),
  CONSTRAINT organization_units_slug_nonempty
    CHECK (length(btrim(slug)) > 0),
  CONSTRAINT organization_units_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT organization_units_org_slug_unique
    UNIQUE (organization_id, slug),
  CONSTRAINT organization_units_path_unique
    UNIQUE (organization_id, materialized_path),
  -- Clé candidate pour FK composites cross-organization
  CONSTRAINT organization_units_org_id_unique
    UNIQUE (organization_id, id),
  CONSTRAINT organization_units_parent_rules CHECK (
    (unit_type = 'world_headquarters' AND parent_id IS NULL AND depth = 0)
    OR (unit_type = 'continental_zone' AND parent_id IS NOT NULL AND depth = 1)
    OR (unit_type = 'national_central_church' AND parent_id IS NOT NULL AND depth = 2)
    OR (unit_type = 'local_church' AND parent_id IS NOT NULL AND depth = 3)
  ),
  CONSTRAINT organization_units_no_self_parent
    CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE UNIQUE INDEX organization_units_one_hq_per_org
  ON public.organization_units (organization_id)
  WHERE unit_type = 'world_headquarters';

CREATE INDEX idx_organization_units_org
  ON public.organization_units (organization_id);
CREATE INDEX idx_organization_units_parent
  ON public.organization_units (parent_id);
CREATE INDEX idx_organization_units_type
  ON public.organization_units (unit_type);
CREATE INDEX idx_organization_units_path_prefix
  ON public.organization_units (organization_id, materialized_path text_pattern_ops);
CREATE INDEX idx_organization_units_country
  ON public.organization_units (country_code)
  WHERE country_code IS NOT NULL;

CREATE TRIGGER organization_units_updated_at
  BEFORE UPDATE ON public.organization_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 1b) Trigger hiérarchique AVANT INSERT/UPDATE (anti-cycle, path, org, types)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erp_organization_units_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_rec public.organization_units%ROWTYPE;
  walk_id uuid;
  hq_count integer;
BEGIN
  -- UPDATE : attributs structurels immuables (évite chemins descendants incohérents)
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
       OR NEW.unit_type IS DISTINCT FROM OLD.unit_type
       OR NEW.materialized_path IS DISTINCT FROM OLD.materialized_path
       OR NEW.depth IS DISTINCT FROM OLD.depth
    THEN
      RAISE EXCEPTION
        'Lot5 hierarchy: attributs structurels immuables après création (id, organization_id, parent_id, unit_type, path, depth)';
    END IF;
    RETURN NEW;
  END IF;

  -- INSERT
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Lot5 hierarchy: organization_id requis';
  END IF;

  IF NEW.unit_type = 'world_headquarters' THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Lot5 hierarchy: world_headquarters doit avoir parent_id NULL';
    END IF;

    SELECT count(*) INTO hq_count
    FROM public.organization_units u
    WHERE u.organization_id = NEW.organization_id
      AND u.unit_type = 'world_headquarters';

    IF hq_count > 0 THEN
      RAISE EXCEPTION 'Lot5 hierarchy: une seule world_headquarters par organisation';
    END IF;

    NEW.depth := 0;
    -- path UUID généré serveur (ignore toute valeur client)
    NEW.materialized_path := '/' || NEW.id::text || '/';
    RETURN NEW;
  END IF;

  IF NEW.parent_id IS NULL THEN
    RAISE EXCEPTION 'Lot5 hierarchy: parent_id requis pour unit_type=%', NEW.unit_type;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Lot5 hierarchy: self-parent interdit';
  END IF;

  SELECT * INTO parent_rec
  FROM public.organization_units
  WHERE id = NEW.parent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lot5 hierarchy: parent introuvable';
  END IF;

  IF parent_rec.organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Lot5 hierarchy: parent et enfant doivent partager organization_id (cross-org interdit)';
  END IF;

  IF NEW.unit_type = 'continental_zone' AND parent_rec.unit_type IS DISTINCT FROM 'world_headquarters' THEN
    RAISE EXCEPTION 'Lot5 hierarchy: continental_zone doit être sous world_headquarters';
  END IF;
  IF NEW.unit_type = 'national_central_church' AND parent_rec.unit_type IS DISTINCT FROM 'continental_zone' THEN
    RAISE EXCEPTION 'Lot5 hierarchy: national_central_church doit être sous continental_zone';
  END IF;
  IF NEW.unit_type = 'local_church' AND parent_rec.unit_type IS DISTINCT FROM 'national_central_church' THEN
    RAISE EXCEPTION 'Lot5 hierarchy: local_church doit être sous national_central_church';
  END IF;

  -- Détection de cycle indirect : remonter les ancêtres depuis parent
  walk_id := NEW.parent_id;
  WHILE walk_id IS NOT NULL LOOP
    IF walk_id = NEW.id THEN
      RAISE EXCEPTION 'Lot5 hierarchy: cycle hiérarchique interdit';
    END IF;
    SELECT u.parent_id INTO walk_id
    FROM public.organization_units u
    WHERE u.id = walk_id;
  END LOOP;

  -- depth et path calculés serveur (jamais autoritaires depuis le client)
  NEW.depth := parent_rec.depth + 1;
  NEW.materialized_path := parent_rec.materialized_path || NEW.id::text || '/';

  IF NEW.depth > 3 THEN
    RAISE EXCEPTION 'Lot5 hierarchy: depth max 3 dépassée';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER organization_units_hierarchy_before_write
  BEFORE INSERT OR UPDATE ON public.organization_units
  FOR EACH ROW
  EXECUTE FUNCTION public.erp_organization_units_before_write();

REVOKE ALL ON FUNCTION public.erp_organization_units_before_write() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_organization_units_before_write() TO service_role;

-- ---------------------------------------------------------------------------
-- 2) organization_unit_members (FK composite same-org)
-- ---------------------------------------------------------------------------
CREATE TABLE public.organization_unit_members (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL
                       REFERENCES public.organizations(id) ON DELETE RESTRICT,
  organization_unit_id uuid NOT NULL,
  user_id              uuid NOT NULL
                       REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_role            text NOT NULL
                       CHECK (unit_role IN (
                         'world_super_admin',
                         'world_admin',
                         'zone_admin',
                         'national_admin',
                         'local_admin',
                         'staff',
                         'member',
                         'viewer'
                       )),
  status               text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  is_primary           boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_unit_members_unique
    UNIQUE (organization_unit_id, user_id),
  CONSTRAINT organization_unit_members_primary_active
    CHECK (is_primary = false OR status = 'active'),
  CONSTRAINT organization_unit_members_unit_org_fk
    FOREIGN KEY (organization_id, organization_unit_id)
    REFERENCES public.organization_units (organization_id, id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX organization_unit_members_one_primary_per_user
  ON public.organization_unit_members (organization_id, user_id)
  WHERE is_primary = true;

CREATE INDEX idx_oum_user ON public.organization_unit_members (user_id);
CREATE INDEX idx_oum_unit ON public.organization_unit_members (organization_unit_id);
CREATE INDEX idx_oum_org ON public.organization_unit_members (organization_id);
CREATE INDEX idx_oum_role ON public.organization_unit_members (unit_role);

CREATE TRIGGER organization_unit_members_updated_at
  BEFORE UPDATE ON public.organization_unit_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 3) organization_settings (mondial)
-- ---------------------------------------------------------------------------
CREATE TABLE public.organization_settings (
  organization_id      uuid PRIMARY KEY
                       REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name         text NOT NULL,
  short_name           text,
  slogan               text,
  logo_url             text,
  logo_light_url       text,
  logo_dark_url        text,
  primary_color        text,
  secondary_color      text,
  official_email       text,
  official_phone       text,
  official_website     text,
  headquarters_address text,
  branding_locked      boolean NOT NULL DEFAULT true,
  pastoral_locked      boolean NOT NULL DEFAULT true,
  notifications_locked boolean NOT NULL DEFAULT false,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT organization_settings_display_name_nonempty
    CHECK (length(btrim(display_name)) > 0)
);

CREATE TRIGGER organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 4) organization_unit_settings (SSOT opérationnel + FK composite same-org)
-- ---------------------------------------------------------------------------
CREATE TABLE public.organization_unit_settings (
  organization_unit_id   uuid PRIMARY KEY,
  organization_id        uuid NOT NULL
                         REFERENCES public.organizations(id) ON DELETE RESTRICT,
  local_display_name     text,
  contact_email          text,
  contact_phone          text,
  address                text,
  timezone               text,
  default_locale         text,
  default_currency       text,
  notif_email_enabled    boolean NOT NULL DEFAULT true,
  notif_push_enabled     boolean NOT NULL DEFAULT false,
  notif_digest_enabled   boolean NOT NULL DEFAULT true,
  notif_newcomer_alert   boolean NOT NULL DEFAULT true,
  notif_followup_alert   boolean NOT NULL DEFAULT true,
  notif_new_member_alert boolean NOT NULL DEFAULT true,
  notif_escalate_national boolean NOT NULL DEFAULT true,
  notif_escalate_zone    boolean NOT NULL DEFAULT false,
  notif_recipients_json  jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at             timestamptz NOT NULL DEFAULT now(),
  updated_by             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT organization_unit_settings_unit_org_fk
    FOREIGN KEY (organization_id, organization_unit_id)
    REFERENCES public.organization_units (organization_id, id)
    ON DELETE CASCADE
);

CREATE INDEX idx_ous_org ON public.organization_unit_settings (organization_id);

CREATE TRIGGER organization_unit_settings_updated_at
  BEFORE UPDATE ON public.organization_unit_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 5) Template pastoral mondial (import exclusif depuis référentiel)
-- ---------------------------------------------------------------------------
CREATE TABLE public.pastoral_journey_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL
                  REFERENCES public.organizations(id) ON DELETE CASCADE,
  key             text NOT NULL DEFAULT 'default',
  name            text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  locked          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key),
  CONSTRAINT pastoral_journey_templates_name_nonempty
    CHECK (length(btrim(name)) > 0)
);

CREATE TABLE public.pastoral_journey_template_steps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     uuid NOT NULL
                  REFERENCES public.pastoral_journey_templates(id) ON DELETE CASCADE,
  step_key        text NOT NULL,
  label           text NOT NULL,
  position        integer NOT NULL CHECK (position >= 0),
  is_enabled      boolean NOT NULL DEFAULT true,
  follow_up_hours integer CHECK (follow_up_hours IS NULL OR follow_up_hours >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, step_key),
  UNIQUE (template_id, position),
  CONSTRAINT pastoral_steps_key_nonempty CHECK (length(btrim(step_key)) > 0),
  CONSTRAINT pastoral_steps_label_nonempty CHECK (length(btrim(label)) > 0)
);

CREATE TRIGGER pastoral_journey_templates_updated_at
  BEFORE UPDATE ON public.pastoral_journey_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 6) organization_unit_id sur newcomer_intakes (FK composite same-org)
-- ---------------------------------------------------------------------------
ALTER TABLE public.newcomer_intakes
  ADD COLUMN organization_unit_id uuid;

ALTER TABLE public.newcomer_intakes
  ADD CONSTRAINT newcomer_intakes_unit_org_fk
  FOREIGN KEY (organization_id, organization_unit_id)
  REFERENCES public.organization_units (organization_id, id)
  ON DELETE RESTRICT;

CREATE INDEX idx_newcomer_intakes_unit
  ON public.newcomer_intakes (organization_unit_id)
  WHERE organization_unit_id IS NOT NULL;

COMMENT ON COLUMN public.newcomer_intakes.organization_unit_id IS
  'Lot 5: unité hiérarchique (église locale / nationale…). Jamais fournie par le client ; injectée serveur.';

-- ---------------------------------------------------------------------------
-- 7) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erp_unit_is_descendant(
  p_ancestor_path text,
  p_candidate_path text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_candidate_path = p_ancestor_path
      OR (p_ancestor_path IS NOT NULL AND p_candidate_path LIKE p_ancestor_path || '%');
$$;

CREATE OR REPLACE FUNCTION public.erp_actor_unit_role(
  p_org_id uuid,
  p_unit_id uuid,
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
    AND m.organization_unit_id = p_unit_id
    AND m.user_id = p_user_id
    AND m.status = 'active'
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 8) RLS FERMÉE — Fast Lock : aucun accès direct client
-- Accès applicatif exclusivement via routes serveur + service_role.
-- Aucune policy SELECT pour authenticated / anon.
-- ---------------------------------------------------------------------------
ALTER TABLE public.organization_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_units FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_unit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_unit_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_unit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_unit_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_journey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_journey_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_journey_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_journey_template_steps FORCE ROW LEVEL SECURITY;

-- Aucune CREATE POLICY SELECT pour authenticated :
-- un simple membre du tenant ne peut pas lire l'arborescence ni les paramètres.

REVOKE ALL ON TABLE public.organization_units FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.organization_unit_members FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.organization_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.organization_unit_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.pastoral_journey_templates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.pastoral_journey_template_steps FROM PUBLIC, anon, authenticated;

-- Explicitement : pas de GRANT SELECT à authenticated (service_role only)
GRANT ALL ON TABLE public.organization_units TO service_role;
GRANT ALL ON TABLE public.organization_unit_members TO service_role;
GRANT ALL ON TABLE public.organization_settings TO service_role;
GRANT ALL ON TABLE public.organization_unit_settings TO service_role;
GRANT ALL ON TABLE public.pastoral_journey_templates TO service_role;
GRANT ALL ON TABLE public.pastoral_journey_template_steps TO service_role;

REVOKE ALL ON FUNCTION public.erp_unit_is_descendant(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_actor_unit_role(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erp_unit_is_descendant(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.erp_actor_unit_role(uuid, uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 9) Seed HQ + Zone Afrique + Église centrale CI + settings + pastoral + backfill
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_org uuid;
  v_hq uuid := gen_random_uuid();
  v_af uuid := gen_random_uuid();
  v_ci uuid := gen_random_uuid();
  v_tpl uuid;
  v_path_hq text;
  v_path_af text;
  v_path_ci text;
  v_member_count integer;
  v_intake_count integer;
  v_unit_count integer;
  v_step_imported integer;
BEGIN
  SELECT id INTO STRICT v_org
  FROM public.organizations
  WHERE slug = 'chapelle-du-royaume';

  v_path_hq := '/' || v_hq::text || '/';
  v_path_af := v_path_hq || v_af::text || '/';
  v_path_ci := v_path_af || v_ci::text || '/';

  INSERT INTO public.organization_units (
    id, organization_id, parent_id, unit_type, name, slug, status,
    continent_code, country_code, city,
    materialized_path, depth
  ) VALUES (
    v_hq, v_org, NULL, 'world_headquarters',
    'Siège mondial — La Chapelle Internationale des Élus du Royaume',
    'world-hq', 'active',
    NULL, NULL, NULL,
    v_path_hq, 0
  );

  INSERT INTO public.organization_units (
    id, organization_id, parent_id, unit_type, name, slug, status,
    continent_code, country_code, city,
    materialized_path, depth
  ) VALUES (
    v_af, v_org, v_hq, 'continental_zone',
    'Zone Afrique', 'zone-afrique', 'active',
    'AF', NULL, NULL,
    v_path_af, 1
  );

  INSERT INTO public.organization_units (
    id, organization_id, parent_id, unit_type, name, slug, status,
    continent_code, country_code, city,
    materialized_path, depth
  ) VALUES (
    v_ci, v_org, v_af, 'national_central_church',
    'Église centrale nationale — Côte d''Ivoire', 'eglise-centrale-ci', 'active',
    'AF', 'CI', NULL,
    v_path_ci, 2
  );

  -- Aucune église locale fictive.

  INSERT INTO public.organization_settings (
    organization_id, display_name, short_name, branding_locked, pastoral_locked, notifications_locked
  )
  SELECT v_org, o.name, 'CIER', true, true, false
  FROM public.organizations o
  WHERE o.id = v_org;

  -- SSOT : paramètres initiaux insérés directement (jamais copiés depuis organization_units)
  INSERT INTO public.organization_unit_settings (
    organization_unit_id, organization_id, timezone, default_locale, default_currency
  ) VALUES
    (v_hq, v_org, 'Africa/Abidjan', 'fr', 'XOF'),
    (v_af, v_org, 'Africa/Abidjan', 'fr', 'XOF'),
    (v_ci, v_org, 'Africa/Abidjan', 'fr', 'XOF');

  INSERT INTO public.pastoral_journey_templates (
    organization_id, key, name, is_active, locked
  ) VALUES (
    v_org, 'default', 'Parcours Nouveau Venu mondial', true, true
  )
  RETURNING id INTO v_tpl;

  -- Import exclusif : copie exacte step_key, label, sort_order (aucune clé inventée)
  INSERT INTO public.pastoral_journey_template_steps (
    template_id, step_key, label, position, is_enabled, follow_up_hours
  )
  SELECT
    v_tpl,
    s.step_key,
    s.label,
    s.sort_order,
    true,
    NULL
  FROM public.newcomer_journey_steps s
  ORDER BY s.sort_order, s.step_key;

  GET DIAGNOSTICS v_step_imported = ROW_COUNT;

  IF v_step_imported < 1 THEN
    RAISE EXCEPTION 'Lot5 postcheck fail: pastoral template import empty (référentiel source)';
  END IF;

  -- Backfill intakes → église centrale CI
  UPDATE public.newcomer_intakes
  SET organization_unit_id = v_ci
  WHERE organization_id = v_org
    AND organization_unit_id IS NULL;

  GET DIAGNOSTICS v_intake_count = ROW_COUNT;

  -- Backfill memberships unit pour owner/admin org → HQ
  INSERT INTO public.organization_unit_members (
    organization_id, organization_unit_id, user_id, unit_role, status, is_primary
  )
  SELECT
    v_org,
    v_hq,
    om.user_id,
    CASE
      WHEN om.membership_role = 'owner' THEN 'world_super_admin'
      ELSE 'world_admin'
    END,
    'active',
    true
  FROM public.organization_members om
  WHERE om.organization_id = v_org
    AND om.status = 'active'
    AND om.membership_role IN ('owner', 'admin')
  ON CONFLICT (organization_unit_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_member_count = ROW_COUNT;

  -- Rattacher les autres memberships actives org (staff/member) à l'église centrale CI
  INSERT INTO public.organization_unit_members (
    organization_id, organization_unit_id, user_id, unit_role, status, is_primary
  )
  SELECT
    v_org,
    v_ci,
    om.user_id,
    CASE
      WHEN om.membership_role = 'staff' THEN 'staff'
      ELSE 'member'
    END,
    'active',
    false
  FROM public.organization_members om
  WHERE om.organization_id = v_org
    AND om.status = 'active'
    AND om.membership_role IN ('staff', 'member')
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_unit_members x
      WHERE x.user_id = om.user_id AND x.organization_id = v_org AND x.status = 'active'
    )
  ON CONFLICT (organization_unit_id, user_id) DO NOTHING;

  SELECT count(*) INTO v_unit_count
  FROM public.organization_units
  WHERE organization_id = v_org;

  IF v_unit_count <> 3 THEN
    RAISE EXCEPTION 'Lot5 postcheck fail: unit_count=% (attendu 3)', v_unit_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_units
    WHERE id = v_hq AND unit_type = 'world_headquarters' AND parent_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Lot5 postcheck fail: HQ invalid';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_units u
    WHERE u.organization_id = v_org
      AND u.unit_type = 'local_church'
  ) THEN
    RAISE EXCEPTION 'Lot5 postcheck fail: local church fictive détectée';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_unit_settings
    WHERE organization_unit_id = v_hq AND organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'Lot5 postcheck fail: unit settings HQ missing';
  END IF;

  RAISE NOTICE 'Lot5 seed OK org=% hq=% af=% ci=% intakes_backfilled=% admins_hq=% steps=%',
    v_org, v_hq, v_af, v_ci, v_intake_count, v_member_count, v_step_imported;
END $$;

-- ---------------------------------------------------------------------------
-- 10) Postchecks structurels finaux (cycles réels + paths exacts)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c integer;
BEGIN
  SELECT count(*) INTO c FROM public.organization_units;
  IF c < 3 THEN
    RAISE EXCEPTION 'Lot5 final postcheck: organization_units count=%', c;
  END IF;

  SELECT count(*) INTO c FROM public.organization_settings;
  IF c < 1 THEN
    RAISE EXCEPTION 'Lot5 final postcheck: organization_settings empty';
  END IF;

  SELECT count(*) INTO c FROM public.organization_unit_settings;
  IF c < 3 THEN
    RAISE EXCEPTION 'Lot5 final postcheck: organization_unit_settings count=% (attendu >= 3)', c;
  END IF;

  SELECT count(*) INTO c FROM public.pastoral_journey_template_steps;
  IF c < 1 THEN
    RAISE EXCEPTION 'Lot5 final postcheck: pastoral steps empty';
  END IF;

  -- Cycles : parcourt toute la chaîne des ancêtres ; cycle si UUID déjà dans le chemin
  IF EXISTS (
    WITH RECURSIVE anc AS (
      SELECT
        u.id AS unit_id,
        u.parent_id AS walk_id,
        ARRAY[u.id]::uuid[] AS path,
        false AS is_cycle
      FROM public.organization_units u
      UNION ALL
      SELECT
        a.unit_id,
        p.parent_id,
        a.path || a.walk_id,
        (a.walk_id = ANY (a.path)) AS is_cycle
      FROM anc a
      JOIN public.organization_units p ON p.id = a.walk_id
      WHERE a.walk_id IS NOT NULL
        AND NOT a.is_cycle
    )
    SELECT 1 FROM anc WHERE is_cycle LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Lot5 final postcheck: cycle hiérarchique détecté (chaîne d''ancêtres)';
  END IF;

  -- materialized_path exact : HQ = /{id}/ ; enfant = parent.path || {id}/
  IF EXISTS (
    SELECT 1
    FROM public.organization_units u
    WHERE u.parent_id IS NULL
      AND u.materialized_path IS DISTINCT FROM ('/' || u.id::text || '/')
  ) THEN
    RAISE EXCEPTION 'Lot5 final postcheck: materialized_path HQ incohérent (attendu /{id}/)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organization_units child
    JOIN public.organization_units parent ON parent.id = child.parent_id
    WHERE child.materialized_path IS DISTINCT FROM (
      parent.materialized_path || child.id::text || '/'
    )
  ) THEN
    RAISE EXCEPTION 'Lot5 final postcheck: materialized_path enfant incohérent (parent.path || id/)';
  END IF;

  -- SSOT city : structurelle sur organization_units uniquement
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_units' AND column_name = 'city'
  ) THEN
    RAISE EXCEPTION 'Lot5 final postcheck: city manquante sur organization_units (structurelle)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_unit_settings' AND column_name = 'city'
  ) THEN
    RAISE EXCEPTION 'Lot5 final postcheck: city interdite sur organization_unit_settings (SSOT structurelle)';
  END IF;
END $$;

COMMIT;
