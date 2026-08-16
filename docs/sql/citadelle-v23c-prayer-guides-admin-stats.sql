-- CITADELLE V2.3-C — Prières & Guides (CMS admin + analytics)
-- ⚠️ FICHIER MANUEL — À exécuter dans le Supabase Dashboard (SQL editor).
--    NE PAS exécuter via CLI / supabase db push. Idempotent (IF NOT EXISTS).
--
-- Crée :
--   - public.prayer_guides        (contenu éditorial, remplace le fallback statique)
--   - public.prayer_guide_events  (analytics : vues / lectures / téléchargements)
-- RLS activé + force RLS ; aucun accès direct anon/authenticated : tout passe par
-- les routes serveur (service role). Réutilise le trigger updated_at existant si présent.

begin;

-- 1) Table prayer_guides -----------------------------------------------------
create table if not exists public.prayer_guides (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null,
  excerpt text not null,
  content text not null,
  duration_minutes integer,
  level text,
  intention text,
  recommended_moment text,
  guide_steps jsonb not null default '[]'::jsonb,
  takeaway text,
  image_url text,
  image_alt text,
  overlay_tone text,
  pdf_url text,
  status text not null default 'published',
  access_level text not null default 'member',
  display_order integer not null default 0,
  published_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_guides_status_check check (status in ('draft', 'published', 'archived')),
  constraint prayer_guides_access_check check (access_level in ('public_preview', 'member', 'premium'))
);

-- 2) Table prayer_guide_events ----------------------------------------------
create table if not exists public.prayer_guide_events (
  id uuid primary key default gen_random_uuid(),
  prayer_guide_id uuid references public.prayer_guides(id) on delete cascade,
  event_type text not null,
  user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint prayer_guide_events_type_check
    check (event_type in ('public_view', 'member_open', 'member_read', 'download'))
);

-- 3) Index -------------------------------------------------------------------
create index if not exists prayer_guides_status_idx on public.prayer_guides (status);
create index if not exists prayer_guides_category_idx on public.prayer_guides (category);
create index if not exists prayer_guides_slug_idx on public.prayer_guides (slug);
create index if not exists prayer_guides_display_order_idx on public.prayer_guides (display_order);
create index if not exists prayer_guide_events_guide_idx on public.prayer_guide_events (prayer_guide_id);
create index if not exists prayer_guide_events_type_idx on public.prayer_guide_events (event_type);
create index if not exists prayer_guide_events_created_idx on public.prayer_guide_events (created_at);
create index if not exists prayer_guide_events_user_idx on public.prayer_guide_events (user_id);

-- 4) Trigger updated_at (réutilise la fonction existante du projet si présente) ----
do $$
begin
  if to_regprocedure('public.tg_citadelle_v21c3_touch_updated_at()') is not null then
    if not exists (select 1 from pg_trigger where tgname = 'trg_prayer_guides_updated_at' and not tgisinternal) then
      create trigger trg_prayer_guides_updated_at
        before update on public.prayer_guides
        for each row execute function public.tg_citadelle_v21c3_touch_updated_at();
    end if;
  else
    -- Repli : fonction locale minimale si le projet n'a pas de fonction updated_at.
    create or replace function public.tg_prayer_guides_touch_updated_at()
    returns trigger language plpgsql as $fn$
    begin new.updated_at = now(); return new; end;
    $fn$;
    if not exists (select 1 from pg_trigger where tgname = 'trg_prayer_guides_updated_at' and not tgisinternal) then
      create trigger trg_prayer_guides_updated_at
        before update on public.prayer_guides
        for each row execute function public.tg_prayer_guides_touch_updated_at();
    end if;
  end if;
end $$;

-- 5) RLS : restrictif. Aucun accès direct anon/authenticated ; service role only. --
alter table public.prayer_guides enable row level security;
alter table public.prayer_guides force row level security;
alter table public.prayer_guide_events enable row level security;
alter table public.prayer_guide_events force row level security;

revoke all on table public.prayer_guides from anon;
revoke all on table public.prayer_guides from authenticated;
revoke all on table public.prayer_guide_events from anon;
revoke all on table public.prayer_guide_events from authenticated;
-- NB : le service role bypasse la RLS. Toutes les lectures/écritures passent par les
-- routes serveur (/api/prayers, /api/member/prayers*, /api/admin/prayer-guides*).
-- Aucune policy permissive n'est créée volontairement (posture restrictive).

-- 6) Seed des 6 prières existantes (idempotent via slug) ---------------------
insert into public.prayer_guides
  (slug, title, category, excerpt, content, duration_minutes, level, intention, recommended_moment, guide_steps, takeaway, image_url, image_alt, overlay_tone, status, access_level, display_order, published_at)
values
  ('priere-travail', 'Prière pour le travail', 'Travail',
   'Seigneur, affermis l''ouvrage de mes mains et ouvre devant moi les portes que toi seul peux ouvrir.',
   'Père céleste, je remets entre tes mains mon travail et mes projets. Affermis l''ouvrage de mes mains (Psaume 90.17). Donne-moi la sagesse pour bien décider, la fidélité pour bien servir, et l''intégrité en toute chose. Ouvre devant moi les portes que toi seul peux ouvrir. Que je travaille de tout mon cœur comme pour le Seigneur (Colossiens 3.23). Au nom de Jésus. Amen.',
   4, 'Doux', 'Confier son activité, ses projets et ses mains au Seigneur.', 'Le matin, avant de commencer sa journée.',
   '["Remets ta journée et tes tâches au Seigneur, sans rien retenir.","Nomme un projet précis et demande sa direction.","Termine en le remerciant par avance pour sa fidélité."]'::jsonb,
   'Travaille comme pour le Seigneur : c''est lui qui affermit l''ouvrage de tes mains (Psaume 90.17).',
   null, null, 'gold', 'published', 'member', 1, now()),

  ('priere-delivrance', 'Prière de délivrance', 'Délivrance',
   'Seigneur, tu es mon refuge ; là où le Fils affranchit, on est réellement libre.',
   'Seigneur Jésus, je me place sous ta seigneurie. « Si le Fils vous affranchit, vous serez réellement libres » (Jean 8.36). Je renonce à toute œuvre des ténèbres et je m''attache à toi. Couvre-moi de ta protection (Philippiens 4.7) et revêts-moi des armes de Dieu (Éphésiens 6.11). Aucune arme forgée contre moi ne prospérera (Ésaïe 54.17). Au nom de Jésus. Amen.',
   5, 'Intense', 'Se placer sous la protection et la liberté de Christ.', 'Dans le combat, l''angoisse ou la tentation.',
   '["Place-toi consciemment sous la seigneurie de Jésus.","Renonce à voix haute à toute œuvre des ténèbres.","Reçois sa paix et revêts l''armure de Dieu (Éphésiens 6.11)."]'::jsonb,
   'Si le Fils t''affranchit, tu es réellement libre (Jean 8.36).',
   null, null, 'dark', 'published', 'member', 2, now()),

  ('priere-famille', 'Prière pour la famille', 'Famille',
   'Seigneur, bénis ma maison ; que nous te servions, moi et ma famille.',
   'Père, je te confie ma famille et mon foyer. « Moi et ma maison, nous servirons l''Éternel » (Josué 24.15). Répands ta paix entre nous ; apporte la réconciliation là où il y a des tensions. Garde nos enfants sous ton aile. Apprends-nous à nous aimer, nous supporter et nous pardonner (Colossiens 3.13). Au nom de Jésus. Amen.',
   4, 'Doux', 'Intercéder pour l''unité, la paix et la foi du foyer.', 'En soirée, en famille ou pour les siens.',
   '["Confie chaque membre de ta famille au Seigneur, par son nom.","Demande la réconciliation là où il y a une tension.","Bénis ta maison et scelle-la dans la paix de Christ."]'::jsonb,
   'Décide, comme Josué : « moi et ma maison, nous servirons l''Éternel » (Josué 24.15).',
   null, null, 'gold', 'published', 'member', 3, now()),

  ('priere-sante', 'Prière pour la santé', 'Santé',
   'Seigneur, tu es celui qui guérit ; je remets mon corps et mes forces entre tes mains.',
   'Seigneur, tu es l''Éternel qui guérit (Exode 15.26). Je remets entre tes mains mon corps, mes forces et ma santé. Restaure ce qui est affaibli selon ta volonté. Béni sois-tu, toi qui pardonnes mes fautes et guéris mes maux (Psaume 103.2-3). Que ta grâce me suffise (2 Corinthiens 12.9). Au nom de Jésus. Amen.',
   4, 'Fervent', 'Remettre son corps et sa guérison au Dieu qui restaure.', 'Avant un examen, un soin, ou dans la maladie.',
   '["Remets ton corps et tes forces entre les mains du Seigneur.","Demande sagesse et paix pour ceux qui te soignent.","Repose ta foi sur sa grâce suffisante (2 Corinthiens 12.9)."]'::jsonb,
   'Béni soit l''Éternel qui pardonne tes fautes et guérit tous tes maux (Psaume 103.2-3).',
   null, null, 'dark', 'published', 'member', 4, now()),

  ('priere-finances', 'Prière pour les finances', 'Finances',
   'Seigneur, tu pourvois à tous mes besoins selon ta richesse ; enseigne-moi la sagesse.',
   'Père, tu es le Dieu qui pourvoit. « Mon Dieu pourvoira à tous vos besoins selon sa richesse, en Jésus-Christ » (Philippiens 4.19). Donne-moi la sagesse pour administrer avec droiture, et la discipline pour ne pas m''endetter. Délivre-moi de l''amour de l''argent (1 Timothée 6.6-10). Rends-moi généreux (Actes 20.35). Au nom de Jésus. Amen.',
   4, 'Doux', 'Chercher la provision, la sagesse et la générosité de Dieu.', 'En début de mois ou face à une charge.',
   '["Confie tes charges et tes projets au Seigneur, avec honnêteté.","Demande la sagesse pour administrer avec droiture.","Choisis un geste de générosité concret cette semaine."]'::jsonb,
   'Ton Dieu pourvoira à tous tes besoins selon sa richesse, en Jésus-Christ (Philippiens 4.19).',
   null, null, 'gold', 'published', 'member', 5, now()),

  ('priere-consecration', 'Prière de consécration spirituelle', 'Spirituel',
   'Seigneur, je m''offre à toi comme un sacrifice vivant ; renouvelle mon cœur.',
   'Seigneur, je m''offre à toi comme un sacrifice vivant, saint et agréable (Romains 12.1). Renouvelle mon intelligence et crée en moi un cœur pur (Psaume 51.12). Que ta Parole soit une lampe à mes pieds (Psaume 119.105). Remplis-moi de ton Esprit ; que je demeure en toi tout le jour, car sans toi je ne peux rien faire (Jean 15.5). Au nom de Jésus. Amen.',
   5, 'Fervent', 'S''offrir à Dieu et rechercher sa présence chaque jour.', 'Au réveil, pour consacrer sa journée.',
   '["Offre-toi à Dieu comme un sacrifice vivant (Romains 12.1).","Demande un cœur pur et un esprit renouvelé (Psaume 51.12).","Laisse sa Parole éclairer et guider ta journée (Psaume 119.105)."]'::jsonb,
   'Demeure en lui : sans lui nous ne pouvons rien faire (Jean 15.5).',
   null, null, 'gold', 'published', 'member', 6, now())
on conflict (slug) do nothing;

commit;
