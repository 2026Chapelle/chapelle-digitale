-- ============================================================================
-- PODCAST-SEC — Sécurité réelle des médias premium (contrôle d'accès SERVEUR)
-- ----------------------------------------------------------------------------
-- Constat (audit) : la policy `cms_podcasts_read` renvoie la LIGNE ENTIÈRE
-- (audio_url compris) aux rôles `anon`/`authenticated` pour tout épisode publié.
-- Le verrou premium/membre était donc purement UX côté client : un visiteur
-- récupérait l'URL média via un simple GET REST. `access_level` n'était qu'un
-- label éditorial (cf. 20260812153000).
--
-- Ce lot transforme le contrôle ÉDITORIAL en contrôle RÉEL côté serveur :
--   1) `has_audio` : signal booléen sûr (l'UI sait s'il existe un média SANS
--      recevoir l'URL) — maintenu par trigger, jamais éditable côté client.
--   2) Verrou colonne : `anon`/`authenticated` ne peuvent PLUS lire `audio_url`
--      ni `youtube_url`. La résolution de lecture passe par un endpoint serveur
--      (/api/podcast/[id]/play) qui authentifie, vérifie l'accès réel, puis rend
--      une URL de lecture (signée si Storage privé — voir note limites).
--
-- Additif et idempotent. RLS de lecture (filtrage LIGNES) INCHANGÉE : le
-- catalogue (titre, cover, description, série, durée, badge accès) reste visible.
-- Aucune donnée détruite ; aucune migration antérieure modifiée.
-- ============================================================================

-- 1) Signal `has_audio` (sûr) ------------------------------------------------
alter table public.cms_podcasts
  add column if not exists has_audio boolean not null default false;

comment on column public.cms_podcasts.has_audio is
  'PODCAST-SEC : vrai si un média (audio_url ou youtube_url) est présent. '
  'Signal lisible par anon/authenticated pour piloter l''UI SANS exposer l''URL réelle. '
  'Maintenu par trigger trg_cms_podcasts_has_audio ; ne jamais définir à la main.';

-- Backfill (ne touche pas audio_url/youtube_url → ne déclenche pas le trigger OF).
update public.cms_podcasts
set has_audio = (
      coalesce(nullif(btrim(audio_url), ''), '') <> ''
   or coalesce(nullif(btrim(youtube_url), ''), '') <> ''
)
where has_audio is distinct from (
      coalesce(nullif(btrim(audio_url), ''), '') <> ''
   or coalesce(nullif(btrim(youtube_url), ''), '') <> ''
);

create or replace function public.cms_podcasts_sync_has_audio()
returns trigger
language plpgsql
as $$
begin
  new.has_audio := (
        coalesce(nullif(btrim(new.audio_url), ''), '') <> ''
     or coalesce(nullif(btrim(new.youtube_url), ''), '') <> ''
  );
  return new;
end;
$$;

drop trigger if exists trg_cms_podcasts_has_audio on public.cms_podcasts;
create trigger trg_cms_podcasts_has_audio
  before insert or update of audio_url, youtube_url on public.cms_podcasts
  for each row execute function public.cms_podcasts_sync_has_audio();

-- 2) Verrou colonne : audio_url / youtube_url ne sont plus lisibles par les
--    rôles publics. Seul service_role (BYPASS, côté serveur) y accède, via le
--    résolveur de lecture qui décide de l'autorisation.
--
--    NB Postgres : un GRANT SELECT au niveau TABLE masque un REVOKE au niveau
--    colonne. On révoque donc le SELECT table, puis on ré-accorde le SELECT sur
--    toutes les colonnes SAUF les deux colonnes média (liste construite
--    dynamiquement → robuste à l'ordre des colonnes). Les colonnes ajoutées
--    ultérieurement devront être ré-accordées par une migration dédiée.
do $$
declare
  safe_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into safe_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name  = 'cms_podcasts'
    and column_name not in ('audio_url', 'youtube_url');

  execute 'revoke select on public.cms_podcasts from anon, authenticated';
  execute format('grant select (%s) on public.cms_podcasts to anon, authenticated', safe_cols);
end;
$$;

-- Le RÉSOLVEUR de lecture s'exécute côté serveur avec service_role : il DOIT
-- pouvoir lire audio_url/youtube_url pour décider et signer. On garantit son
-- accès total (indépendant du socle de rôles managé/local). service_role est
-- réservé au serveur (jamais exposé au navigateur).
grant select on public.cms_podcasts to service_role;

-- INSERT/UPDATE/DELETE restent régis par les policies existantes (écriture
-- réservée à service_role via l'admin). La lecture LIGNE (status='published')
-- est inchangée ; seule la VISIBILITÉ des colonnes média change.
