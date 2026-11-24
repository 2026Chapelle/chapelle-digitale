-- MAHANAIM P1: ressources associées aux journées.
-- Aucun contenu existant n'est modifié.

create table if not exists chapelle.mahanaim_day_resources (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references chapelle.mahanaim_retreat_days(id) on delete cascade,
  resource_type text not null check (resource_type in ('video', 'pdf')),
  session_type text check (session_type in ('morning', 'evening')),
  title text not null,
  resource_url text,
  storage_path text,
  scheduled_time time,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mahanaim_resource_source_check check (coalesce((
    (
      resource_type = 'video'
      and session_type in ('morning', 'evening')
      and storage_path is null
    )
    or
    (
      resource_type = 'pdf'
      and session_type is null
      and (
        (resource_url is not null and storage_path is null)
        or
        (resource_url is null and storage_path is not null)
      )
    )
  ), false)),
  constraint mahanaim_resource_title_check
    check (length(btrim(title)) between 1 and 240),
  constraint mahanaim_resource_url_check
    check (resource_url is null or length(btrim(resource_url)) between 1 and 2048),
  constraint mahanaim_resource_storage_path_check
    check (storage_path is null or length(btrim(storage_path)) between 1 and 1024)
);

create unique index if not exists mahanaim_day_video_session_unique
  on chapelle.mahanaim_day_resources(day_id, session_type)
  where resource_type = 'video';

create index if not exists mahanaim_day_resources_day_idx
  on chapelle.mahanaim_day_resources(day_id, position);

alter table chapelle.mahanaim_day_resources enable row level security;

-- Aucun accès anonyme ou membre direct.
-- Lecture et distribution uniquement par les routes serveur contrôlées.
revoke all on chapelle.mahanaim_day_resources from anon, authenticated;

grant usage on schema chapelle to service_role;
grant select, insert, update, delete on chapelle.mahanaim_day_resources to service_role;