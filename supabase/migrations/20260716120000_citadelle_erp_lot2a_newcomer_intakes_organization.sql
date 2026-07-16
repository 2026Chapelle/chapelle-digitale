-- ============================================================================
-- 20260716120000_citadelle_erp_lot2a_newcomer_intakes_organization.sql
-- Lot 2-A — Isolation tenant de public.newcomer_intakes UNIQUEMENT
--
-- Objectif :
--   Ajouter organization_id (FK organizations), backfill mono-tenant
--   vers l'organisation canonique slug = chapelle-du-royaume,
--   DEFAULT serveur canonique (compat déploiement), puis NOT NULL.
--
-- COMPATIBILITÉ DÉPLOIEMENT (garde TRANSITOIRE) :
--   DEFAULT organization_id = UUID de chapelle-du-royaume.
--   Permet à l'ancien runtime (qui omet organization_id à l'INSERT) de continuer
--   à créer des intakes dans l'org canonique pendant le bascule applicative.
--   Le nouveau runtime injecte TOUJOURS organization_id explicitement côté serveur.
--   organization_id ne vient JAMAIS du client.
--   Ce DEFAULT est INCOMPATIBLE avec une deuxième organisation réelle :
--   le retirer (DROP DEFAULT) avant tout multi-tenant réel.
--   Un rollback applicatif (revenir à l'ancien code) reste fonctionnel tant que
--   le DEFAULT canonique est en place.
--
-- Hors scope :
--   newcomer_pipeline, tables journey non versionnées, policies authenticated,
--   deuxième organisation, historique supabase_migrations.
--
-- SÉCURITÉ CONSERVÉE :
--   ENABLE + FORCE RLS, REVOKE anon/authenticated, AUCUNE nouvelle policy.
--   Accès applicatif = service role + filtre organization_id côté serveur.
--
-- NE PAS exécuter via supabase db push tant que GO SQL explicite non donné.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Gardes préalables (fail-fast)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  org_count integer;
  col_exists boolean;
  col_nullable text;
BEGIN
  IF to_regclass('public.organizations') IS NULL THEN
    RAISE EXCEPTION
      'Lot2A stop: public.organizations is missing (appliquer Lot 1 avant Lot 2-A)';
  END IF;

  IF to_regclass('public.newcomer_intakes') IS NULL THEN
    RAISE EXCEPTION
      'Lot2A stop: public.newcomer_intakes is missing';
  END IF;

  SELECT count(*) INTO org_count
  FROM public.organizations
  WHERE slug = 'chapelle-du-royaume';

  IF org_count = 0 THEN
    RAISE EXCEPTION
      'Lot2A stop: organisation canonique slug=chapelle-du-royaume absente';
  END IF;

  IF org_count > 1 THEN
    RAISE EXCEPTION
      'Lot2A stop: organisation canonique slug=chapelle-du-royaume dupliquée (count=%)',
      org_count;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'newcomer_intakes'
      AND column_name = 'organization_id'
  ) INTO col_exists;

  IF col_exists THEN
    SELECT is_nullable INTO col_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'newcomer_intakes'
      AND column_name = 'organization_id';

    -- Compatible si la colonne existe déjà NOT NULL + FK (rejeu partiel) : refus
    -- d'un état ambigu (nullable sans backfill garanti par ce script en double).
    IF col_nullable = 'YES' THEN
      RAISE EXCEPTION
        'Lot2A stop: organization_id existe déjà en nullable — état incompatible (intervention manuelle requise)';
    END IF;

    -- Si déjà NOT NULL, on refuse aussi pour rester single-shot strict (pas d'idempotence silencieuse).
    RAISE EXCEPTION
      'Lot2A stop: organization_id existe déjà sur public.newcomer_intakes — migration single-shot non rejouable';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Colonne nullable + FK (sans DEFAULT encore)
-- ---------------------------------------------------------------------------
ALTER TABLE public.newcomer_intakes
  ADD COLUMN organization_id uuid
  REFERENCES public.organizations (id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.newcomer_intakes.organization_id IS
  'Lot 2-A: tenant SaaS. Jamais fourni par le client ; injecté côté serveur (runtime nouveau). '
  'DEFAULT serveur = UUID chapelle-du-royaume : GARDE TRANSITOIRE de compatibilité pour '
  'l''ancien runtime qui omet organization_id à l''INSERT. Incompatible avec une 2e organisation '
  'réelle — DROP DEFAULT avant multi-org. Backfill initial = même org canonique.';

-- ---------------------------------------------------------------------------
-- 3) UUID canonique unique + backfill + DEFAULT serveur (avant NOT NULL)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  canon_id uuid;
  null_count integer;
BEGIN
  -- id UUID unique de chapelle-du-royaume (déjà garanti unique en §1)
  SELECT o.id INTO STRICT canon_id
  FROM public.organizations o
  WHERE o.slug = 'chapelle-du-royaume';

  -- Backfill mono-tenant
  UPDATE public.newcomer_intakes
  SET organization_id = canon_id
  WHERE organization_id IS NULL;

  SELECT count(*) INTO null_count
  FROM public.newcomer_intakes
  WHERE organization_id IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION
      'Lot2A stop: % ligne(s) newcomer_intakes sans organization_id après backfill',
      null_count;
  END IF;

  -- DEFAULT serveur = UUID canonique (garde transitoire déploiement / rollback app)
  -- format %L quote correctement le littéral ; cast ::uuid pour le type colonne.
  EXECUTE format(
    'ALTER TABLE public.newcomer_intakes ALTER COLUMN organization_id SET DEFAULT %L::uuid',
    canon_id::text
  );
END $$;

-- ---------------------------------------------------------------------------
-- 4) NOT NULL (après backfill + DEFAULT)
-- ---------------------------------------------------------------------------
ALTER TABLE public.newcomer_intakes
  ALTER COLUMN organization_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 5) Index listes tenant-scoped (org + created_at desc)
-- ---------------------------------------------------------------------------
CREATE INDEX newcomer_intakes_organization_created_at_desc_idx
  ON public.newcomer_intakes (organization_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6) Conserver RLS / REVOKE (aucune policy authenticated ajoutée)
-- ---------------------------------------------------------------------------
ALTER TABLE public.newcomer_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newcomer_intakes FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.newcomer_intakes FROM anon;
REVOKE ALL ON TABLE public.newcomer_intakes FROM authenticated;

-- ---------------------------------------------------------------------------
-- 7) Post-check applicatif (dans la transaction)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  col_udt text;
  col_nullable text;
  col_default text;
  def_expr text;
  fk_ok boolean;
  idx_ok boolean;
  null_count integer;
  foreign_count integer;
  canon_id uuid;
BEGIN
  SELECT c.udt_name, c.is_nullable, c.column_default
  INTO col_udt, col_nullable, col_default
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'newcomer_intakes'
    AND c.column_name = 'organization_id';

  IF col_udt IS DISTINCT FROM 'uuid' OR col_nullable IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION
      'Lot2A postcheck failed: organization_id type/nullable incorrect (udt=%, nullable=%)',
      col_udt, col_nullable;
  END IF;

  IF col_default IS NULL OR btrim(col_default) = '' THEN
    RAISE EXCEPTION
      'Lot2A postcheck failed: column_default organization_id est NULL (DEFAULT canonique requis pour compat déploiement)';
  END IF;

  SELECT o.id INTO STRICT canon_id
  FROM public.organizations o
  WHERE o.slug = 'chapelle-du-royaume';

  -- Expression DEFAULT via pg_catalog (source d'autorité) + filet information_schema
  SELECT pg_get_expr(ad.adbin, ad.adrelid) INTO def_expr
  FROM pg_attrdef ad
  JOIN pg_attribute at
    ON at.attrelid = ad.adrelid
   AND at.attnum = ad.adnum
   AND NOT at.attisdropped
  JOIN pg_class rel ON rel.oid = ad.adrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'newcomer_intakes'
    AND at.attname = 'organization_id';

  IF def_expr IS NULL OR btrim(def_expr) = '' THEN
    RAISE EXCEPTION
      'Lot2A postcheck failed: DEFAULT organization_id absent (pg_attrdef)';
  END IF;

  IF position(canon_id::text IN def_expr) = 0
     AND position(canon_id::text IN coalesce(col_default, '')) = 0 THEN
    RAISE EXCEPTION
      'Lot2A postcheck failed: DEFAULT organization_id (%) ne correspond pas à l''org canonique %',
      def_expr, canon_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'newcomer_intakes'
      AND con.contype = 'f'
      AND pg_get_constraintdef(con.oid) ILIKE '%organization_id%REFERENCES%organizations%'
  ) INTO fk_ok;

  IF NOT fk_ok THEN
    RAISE EXCEPTION 'Lot2A postcheck failed: FK organization_id → organizations absente';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'i'
      AND c.relname = 'newcomer_intakes_organization_created_at_desc_idx'
  ) INTO idx_ok;

  IF NOT idx_ok THEN
    RAISE EXCEPTION 'Lot2A postcheck failed: index newcomer_intakes_organization_created_at_desc_idx manquant';
  END IF;

  SELECT count(*) INTO null_count
  FROM public.newcomer_intakes
  WHERE organization_id IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'Lot2A postcheck failed: % ligne(s) sans organization_id', null_count;
  END IF;

  SELECT count(*) INTO foreign_count
  FROM public.newcomer_intakes
  WHERE organization_id IS DISTINCT FROM canon_id;

  IF foreign_count > 0 THEN
    RAISE EXCEPTION
      'Lot2A postcheck failed: % ligne(s) non rattachées à chapelle-du-royaume (interdit avant 2e org)',
      foreign_count;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- CONTRÔLES POST-APPLICATION (lecture seule — NE PAS exécuter automatiquement)
-- À lancer manuellement en SQL live APRÈS application volontaire de la migration.
-- ============================================================================
--
-- -- Colonne, type, NOT NULL, column_default
-- SELECT column_name, data_type, udt_name, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'newcomer_intakes'
--   AND column_name = 'organization_id';
-- -- Attendu : udt_name=uuid, is_nullable=NO, column_default IS NOT NULL
--
-- -- DEFAULT = UUID exact de l'organisation canonique
-- SELECT
--   pg_get_expr(ad.adbin, ad.adrelid) AS default_expr,
--   o.id AS canonical_org_id,
--   position(o.id::text IN pg_get_expr(ad.adbin, ad.adrelid)) > 0 AS default_matches_canonical
-- FROM pg_attrdef ad
-- JOIN pg_attribute at
--   ON at.attrelid = ad.adrelid AND at.attnum = ad.adnum AND NOT at.attisdropped
-- JOIN pg_class rel ON rel.oid = ad.adrelid
-- JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
-- CROSS JOIN LATERAL (
--   SELECT id FROM public.organizations WHERE slug = 'chapelle-du-royaume' LIMIT 1
-- ) o
-- WHERE nsp.nspname = 'public'
--   AND rel.relname = 'newcomer_intakes'
--   AND at.attname = 'organization_id';
-- -- Attendu : default_matches_canonical = true
-- -- NOTE : ce DEFAULT est une GARDE TRANSITOIRE — incompatible avec une 2e org réelle.
--
-- -- FK
-- SELECT con.conname, pg_get_constraintdef(con.oid)
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
-- WHERE nsp.nspname = 'public'
--   AND rel.relname = 'newcomer_intakes'
--   AND con.contype = 'f'
--   AND pg_get_constraintdef(con.oid) ILIKE '%organization_id%';
--
-- -- Index
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'newcomer_intakes'
--   AND indexname = 'newcomer_intakes_organization_created_at_desc_idx';
--
-- -- Zéro ligne sans organisation
-- SELECT count(*) AS null_org_rows
-- FROM public.newcomer_intakes
-- WHERE organization_id IS NULL;
-- -- Attendu : 0
--
-- -- Toutes les lignes rattachées à l'organisation canonique (avant toute 2e org)
-- SELECT
--   count(*) AS total_intakes,
--   count(*) FILTER (
--     WHERE organization_id = (
--       SELECT id FROM public.organizations WHERE slug = 'chapelle-du-royaume' LIMIT 1
--     )
--   ) AS canonical_intakes
-- FROM public.newcomer_intakes;
-- -- Attendu : total_intakes = canonical_intakes
--
-- -- RLS / FORCE toujours actifs
-- SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relname = 'newcomer_intakes';
-- -- Attendu : relrowsecurity=true, relforcerowsecurity=true
-- ============================================================================
