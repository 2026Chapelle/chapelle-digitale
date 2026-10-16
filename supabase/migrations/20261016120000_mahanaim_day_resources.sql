-- MAHANAÏM P0.3 — canonical resources for a retreat day.
-- This migration is additive and is intentionally not applied by this repository.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS chapelle.mahanaim_day_resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id uuid NOT NULL
        REFERENCES chapelle.mahanaim_retreat_days(id)
        ON DELETE CASCADE,
    resource_type text NOT NULL,
    session_type text,
    title text NOT NULL,
    resource_url text,
    storage_path text,
    scheduled_time time,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Fail closed if an unversioned instance of the table exists with incompatible
-- data: constraints below are validated by PostgreSQL rather than silently
-- accepting an unsafe shape.
ALTER TABLE chapelle.mahanaim_day_resources
    ADD COLUMN IF NOT EXISTS session_type text,
    ADD COLUMN IF NOT EXISTS resource_url text,
    ADD COLUMN IF NOT EXISTS storage_path text,
    ADD COLUMN IF NOT EXISTS scheduled_time time,
    ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'mahanaim_day_resources_type_check'
          AND conrelid = 'chapelle.mahanaim_day_resources'::regclass
    ) THEN
        ALTER TABLE chapelle.mahanaim_day_resources
            ADD CONSTRAINT mahanaim_day_resources_type_check
            CHECK (resource_type IN ('video', 'pdf'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'mahanaim_day_resources_session_check'
          AND conrelid = 'chapelle.mahanaim_day_resources'::regclass
    ) THEN
        ALTER TABLE chapelle.mahanaim_day_resources
            ADD CONSTRAINT mahanaim_day_resources_session_check
            CHECK (
                (resource_type = 'video'
                    AND session_type IN ('morning', 'evening')
                    AND resource_url IS NOT NULL
                    AND storage_path IS NULL)
                OR
                (resource_type = 'pdf'
                    AND session_type IS NULL
                    AND resource_url IS NULL
                    AND storage_path IS NOT NULL)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'mahanaim_day_resources_title_check'
          AND conrelid = 'chapelle.mahanaim_day_resources'::regclass
    ) THEN
        ALTER TABLE chapelle.mahanaim_day_resources
            ADD CONSTRAINT mahanaim_day_resources_title_check
            CHECK (char_length(btrim(title)) BETWEEN 1 AND 240);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'mahanaim_day_resources_position_check'
          AND conrelid = 'chapelle.mahanaim_day_resources'::regclass
    ) THEN
        ALTER TABLE chapelle.mahanaim_day_resources
            ADD CONSTRAINT mahanaim_day_resources_position_check
            CHECK (position >= 0);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_mahanaim_day_resources_day_position
    ON chapelle.mahanaim_day_resources(day_id, position);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mahanaim_day_resources_video_session
    ON chapelle.mahanaim_day_resources(day_id, session_type)
    WHERE resource_type = 'video';

CREATE UNIQUE INDEX IF NOT EXISTS uq_mahanaim_day_resources_pdf
    ON chapelle.mahanaim_day_resources(day_id)
    WHERE resource_type = 'pdf';

DROP TRIGGER IF EXISTS mahanaim_day_resources_updated_at
    ON chapelle.mahanaim_day_resources;

CREATE TRIGGER mahanaim_day_resources_updated_at
BEFORE UPDATE ON chapelle.mahanaim_day_resources
FOR EACH ROW EXECUTE FUNCTION chapelle.mahanaim_retreat_v1_set_updated_at();

ALTER TABLE chapelle.mahanaim_day_resources ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE chapelle.mahanaim_day_resources
    FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE chapelle.mahanaim_day_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE chapelle.mahanaim_day_resources TO service_role;

DROP POLICY IF EXISTS mah_day_resources_read ON chapelle.mahanaim_day_resources;

CREATE POLICY mah_day_resources_read
ON chapelle.mahanaim_day_resources
FOR SELECT
TO authenticated
USING (
    chapelle.has_platform_role(
        chapelle.platform_id('mahanaim'),
        'serviteur'::chapelle.role_key
    )
    OR EXISTS (
        SELECT 1
        FROM chapelle.mahanaim_retreat_days d
        JOIN chapelle.mahanaim_retreats r ON r.id = d.retreat_id
        JOIN chapelle.mahanaim_retreat_enrollments en ON en.retreat_id = d.retreat_id
        WHERE d.id = mahanaim_day_resources.day_id
          AND r.digital_status IN ('registration_open', 'active', 'completed')
          AND en.member_id = chapelle.current_member_id()
          AND en.status IN ('registered', 'active', 'completed')
          AND (
              d.day_number = 1
              OR now() >= (((d.day_date - 1) + TIME '18:00') AT TIME ZONE r.timezone)
          )
    )
);

COMMIT;
