BEGIN;

CREATE TABLE public.group_space_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    groupe_id uuid NOT NULL REFERENCES public.groupes(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    kind text NOT NULL CHECK (
        kind IN ('annonce', 'priere', 'ressource', 'temoignage')
    ),
    title text NOT NULL CHECK (
        char_length(btrim(title)) BETWEEN 1 AND 160
    ),
    body text NOT NULL CHECK (
        char_length(btrim(body)) BETWEEN 1 AND 10000
    ),
    resource_url text,
    visibility text NOT NULL DEFAULT 'groupe' CHECK (
        visibility IN ('groupe', 'responsables')
    ),
    state text NOT NULL DEFAULT 'en_attente' CHECK (
        state IN ('en_attente', 'publie', 'refuse', 'archive')
    ),
    consent boolean NOT NULL DEFAULT false,
    moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    moderated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT group_space_confidential_prayer
        CHECK (visibility = 'groupe' OR kind = 'priere'),

    CONSTRAINT group_space_testimony_consent
        CHECK (kind <> 'temoignage' OR consent = true),

    CONSTRAINT group_space_resource_url
        CHECK (
            resource_url IS NULL OR (
                kind = 'ressource'
                AND char_length(resource_url) <= 2048
                AND resource_url ~* '^https://[^/@[:space:]]+([/?#]|$)'
            )
        )
);

CREATE INDEX group_space_posts_group_state_date_idx
    ON public.group_space_posts (groupe_id, state, created_at DESC);

CREATE INDEX group_space_posts_group_author_date_idx
    ON public.group_space_posts (groupe_id, author_id, created_at DESC);

ALTER TABLE public.group_space_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_space_posts FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.group_space_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.group_space_posts TO service_role;

-- No browser policies: reads and writes pass through the authenticated API.

CREATE FUNCTION public.guard_group_space_post_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.groupe_id IS DISTINCT FROM OLD.groupe_id
       OR NEW.author_id IS DISTINCT FROM OLD.author_id
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.visibility IS DISTINCT FROM OLD.visibility
       OR NEW.consent IS DISTINCT FROM OLD.consent
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.resource_url IS DISTINCT FROM OLD.resource_url
    THEN
        RAISE EXCEPTION 'Group post content and confidentiality are immutable';
    END IF;

    IF NEW.state IS DISTINCT FROM OLD.state AND NOT (
        (OLD.state = 'en_attente' AND NEW.state IN ('publie', 'refuse', 'archive'))
        OR (OLD.state IN ('publie', 'refuse') AND NEW.state = 'archive')
    ) THEN
        RAISE EXCEPTION 'Invalid group post state transition';
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER group_space_posts_guard_update
BEFORE UPDATE ON public.group_space_posts
FOR EACH ROW EXECUTE FUNCTION public.guard_group_space_post_update();

REVOKE ALL ON FUNCTION public.guard_group_space_post_update()
    FROM PUBLIC, anon, authenticated;

COMMIT;