-- MAHANAIM P0.3 - SECURITY HARDENING DRAFT
-- VERSIONED MIGRATION - NOT YET APPLIED
-- Do not edit historical migrations.

BEGIN;

-- Prevent authenticated clients from updating enrollment fields.
-- Keep existing SELECT and INSERT grants.
REVOKE UPDATE ON TABLE
  chapelle.mahanaim_retreat_enrollments
FROM PUBLIC, anon, authenticated;

-- Preserve function signature, owner and SECURITY DEFINER.
CREATE OR REPLACE FUNCTION chapelle.member_mahanaim_retreat_day_catalog(
  p_slug text
)
RETURNS TABLE(
  id uuid,
  retreat_id uuid,
  day_number integer,
  day_date date,
  title text,
  scripture_reference text,
  status text,
  is_unlocked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'chapelle', 'public', 'pg_temp'
AS $function$
  SELECT
    d.id,
    d.retreat_id,
    d.day_number,
    d.day_date,
    d.title,
    d.scripture_reference,
    d.status,
    (
      d.day_number = 1
      OR now() >= (
        ((d.day_date - 1) + TIME '18:00')
        AT TIME ZONE r.timezone
      )
    ) AS is_unlocked
  FROM chapelle.mahanaim_retreats r
  JOIN chapelle.mahanaim_retreat_days d
    ON d.retreat_id = r.id
  WHERE r.slug = p_slug
    AND r.digital_status IN (
      'registration_open', 'active', 'completed'
    )
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM chapelle.members m
      JOIN chapelle.mahanaim_retreat_enrollments en
        ON en.member_id = m.id
      WHERE m.auth_user_id = auth.uid()
        AND en.retreat_id = r.id
        AND en.status IN (
          'registered', 'active', 'completed'
        )
    )
  ORDER BY d.day_number;
$function$;

-- Make the final catalog execution ACL explicit after replacing the function.
REVOKE ALL ON FUNCTION
  chapelle.member_mahanaim_retreat_day_catalog(text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  chapelle.member_mahanaim_retreat_day_catalog(text)
TO authenticated;

-- Align direct member reading with the P0.3 unlock rule.
-- Preserve the original staff exception and enrollment rules.
ALTER POLICY mah_retreat_days_read
ON chapelle.mahanaim_retreat_days
USING (
  chapelle.has_platform_role(
    chapelle.platform_id('mahanaim'),
    'serviteur'::chapelle.role_key
  )
  OR EXISTS (
    SELECT 1
    FROM chapelle.mahanaim_retreats r
    WHERE r.id = mahanaim_retreat_days.retreat_id
      AND r.digital_status IN (
        'registration_open', 'active', 'completed'
      )
      AND (
        mahanaim_retreat_days.day_number = 1
        OR now() >= (
          (
            (mahanaim_retreat_days.day_date - 1)
            + TIME '18:00'
          ) AT TIME ZONE r.timezone
        )
      )
      AND (
EXISTS (
          SELECT 1
          FROM chapelle.mahanaim_retreat_enrollments en
          WHERE en.retreat_id = r.id
            AND en.member_id = chapelle.current_member_id()
            AND en.status IN (
              'registered', 'active', 'completed'
            )
        )
      )
  )
);
COMMIT;
