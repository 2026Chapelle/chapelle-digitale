-- FEATURED PODCAST V1 : mise a jour atomique du seul champ today_podcast_id.
-- Executee par le service_role via la route admin; jamais exposee aux roles publics.
CREATE OR REPLACE FUNCTION public.set_homepage_today_podcast(p_podcast_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_podcast_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cms_podcasts
    WHERE id = p_podcast_id AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'Podcast absent ou non publie' USING ERRCODE = '22023';
  END IF;

  UPDATE public.cms_homepage_blocks
     SET data = jsonb_set(
       COALESCE(data, '{}'::jsonb),
       '{today_podcast_id}',
       CASE WHEN p_podcast_id IS NULL THEN 'null'::jsonb ELSE to_jsonb(p_podcast_id::text) END,
       true
     )
   WHERE block_key = 'podcast';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bloc podcast introuvable' USING ERRCODE = 'P0002';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_homepage_today_podcast(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_homepage_today_podcast(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.set_homepage_today_podcast(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_homepage_today_podcast(uuid) TO service_role;