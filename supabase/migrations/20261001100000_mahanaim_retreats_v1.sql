begin;

-- =============================================================================
-- CITADELLE / CHAPELLE V2
-- MAHANAIM RETREATS V1
--
-- Canonical architecture:
--   chapelle.events
--      -> chapelle.mahanaim_retreats
--         -> digital retreat experience tables
--
-- No parallel public.mahanaim_retreats root.
-- Member identity uses chapelle.members(id).
-- =============================================================================

set search_path = chapelle, public;

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. EXTEND THE EXISTING CANONICAL RETREAT ROOT
-- =============================================================================

alter table chapelle.mahanaim_retreats
    add column if not exists slug text,
    add column if not exists subtitle text,
    add column if not exists scripture_reference text,
    add column if not exists scripture_text text,
    add column if not exists digital_description text,
    add column if not exists hero_image_url text,
    add column if not exists start_date date,
    add column if not exists end_date date,
    add column if not exists closing_date date,
    add column if not exists daily_start_time time not null default '05:30',
    add column if not exists timezone text not null default 'Africa/Abidjan',
    add column if not exists digital_status text not null default 'draft',
    add column if not exists access_type text not null default 'enrolled_members',
    add column if not exists is_featured boolean not null default false;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'mahanaim_retreats_slug_key'
          and conrelid = 'chapelle.mahanaim_retreats'::regclass
    ) then
        alter table chapelle.mahanaim_retreats
            add constraint mahanaim_retreats_slug_key unique (slug);
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'mahanaim_retreats_digital_status_check'
          and conrelid = 'chapelle.mahanaim_retreats'::regclass
    ) then
        alter table chapelle.mahanaim_retreats
            add constraint mahanaim_retreats_digital_status_check
            check (
                digital_status in (
                    'draft',
                    'registration_open',
                    'active',
                    'completed',
                    'archived'
                )
            );
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'mahanaim_retreats_access_type_check'
          and conrelid = 'chapelle.mahanaim_retreats'::regclass
    ) then
        alter table chapelle.mahanaim_retreats
            add constraint mahanaim_retreats_access_type_check
            check (
                access_type in (
                    'members',
                    'enrolled_members'
                )
            );
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'mahanaim_retreats_dates_check'
          and conrelid = 'chapelle.mahanaim_retreats'::regclass
    ) then
        alter table chapelle.mahanaim_retreats
            add constraint mahanaim_retreats_dates_check
            check (
                start_date is null
                or end_date is null
                or end_date >= start_date
            );
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'mahanaim_retreats_closing_date_check'
          and conrelid = 'chapelle.mahanaim_retreats'::regclass
    ) then
        alter table chapelle.mahanaim_retreats
            add constraint mahanaim_retreats_closing_date_check
            check (
                closing_date is null
                or end_date is null
                or closing_date >= end_date
            );
    end if;
end
$$;

-- =============================================================================
-- 2. RETREAT DAYS
-- =============================================================================

create table if not exists chapelle.mahanaim_retreat_days (
    id uuid primary key default gen_random_uuid(),

    retreat_id uuid not null
        references chapelle.mahanaim_retreats(id)
        on delete cascade,

    day_number integer not null,
    day_date date not null,

    title text not null,
    scripture_reference text,
    scripture_text text,

    meditation text,
    objective text,

    prayers jsonb not null default '[]'::jsonb,
    declarations jsonb not null default '[]'::jsonb,

    action text,

    status text not null default 'scheduled'
        check (
            status in (
                'draft',
                'scheduled',
                'available',
                'completed'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (retreat_id, day_number),
    unique (retreat_id, day_date),
    unique (id, retreat_id),

    check (day_number > 0)
);

-- =============================================================================
-- 3. ENROLLMENTS
-- =============================================================================

create table if not exists chapelle.mahanaim_retreat_enrollments (
    id uuid primary key default gen_random_uuid(),

    retreat_id uuid not null
        references chapelle.mahanaim_retreats(id)
        on delete cascade,

    member_id uuid not null
        references chapelle.members(id)
        on delete cascade,

    status text not null default 'registered'
        check (
            status in (
                'registered',
                'active',
                'completed',
                'withdrawn'
            )
        ),

    last_opened_day integer,
    enrolled_at timestamptz not null default now(),
    completed_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (retreat_id, member_id),
    unique (id, retreat_id),

    check (
        last_opened_day is null
        or last_opened_day > 0
    )
);

-- =============================================================================
-- 4. PROGRESS
-- =============================================================================

create table if not exists chapelle.mahanaim_retreat_progress (
    id uuid primary key default gen_random_uuid(),

    retreat_id uuid not null
        references chapelle.mahanaim_retreats(id)
        on delete cascade,

    enrollment_id uuid not null,

    retreat_day_id uuid not null,

    opened boolean not null default false,
    meditation_completed boolean not null default false,
    prayer_completed boolean not null default false,
    action_completed boolean not null default false,

    replay_seconds integer not null default 0
        check (replay_seconds >= 0),

    completed_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (enrollment_id, retreat_day_id),

    constraint mahanaim_progress_enrollment_retreat_fk
        foreign key (enrollment_id, retreat_id)
        references chapelle.mahanaim_retreat_enrollments(id, retreat_id)
        on delete cascade,

    constraint mahanaim_progress_day_retreat_fk
        foreign key (retreat_day_id, retreat_id)
        references chapelle.mahanaim_retreat_days(id, retreat_id)
        on delete cascade
);

-- =============================================================================
-- 5. PRIVATE MEMBER NOTES
-- =============================================================================

create table if not exists chapelle.mahanaim_retreat_notes (
    id uuid primary key default gen_random_uuid(),

    retreat_id uuid not null
        references chapelle.mahanaim_retreats(id)
        on delete cascade,

    retreat_day_id uuid not null,

    member_id uuid not null
        references chapelle.members(id)
        on delete cascade,

    content text not null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint mahanaim_notes_day_retreat_fk
        foreign key (retreat_day_id, retreat_id)
        references chapelle.mahanaim_retreat_days(id, retreat_id)
        on delete cascade
);

-- =============================================================================
-- 6. LIVE SESSIONS
-- =============================================================================

create table if not exists chapelle.mahanaim_retreat_live_sessions (
    id uuid primary key default gen_random_uuid(),

    retreat_day_id uuid not null unique
        references chapelle.mahanaim_retreat_days(id)
        on delete cascade,

    provider text not null default 'external'
        check (
            provider in (
                'youtube',
                'hls',
                'external',
                'mediamtx'
            )
        ),

    watch_url text,
    playback_url text,
    replay_url text,

    scheduled_at timestamptz,

    status text not null default 'scheduled'
        check (
            status in (
                'scheduled',
                'live',
                'ended',
                'replay'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- =============================================================================
-- 7. RESOURCES
-- =============================================================================

create table if not exists chapelle.mahanaim_retreat_resources (
    id uuid primary key default gen_random_uuid(),

    retreat_day_id uuid not null
        references chapelle.mahanaim_retreat_days(id)
        on delete cascade,

    resource_type text not null
        check (
            resource_type in (
                'pdf',
                'audio',
                'video',
                'link',
                'text'
            )
        ),

    title text not null,
    url text,
    content text,
    position integer not null default 0,

    created_at timestamptz not null default now(),

    check (position >= 0)
);

-- =============================================================================
-- 8. INDEXES
-- =============================================================================

create index if not exists idx_mahanaim_retreats_slug
    on chapelle.mahanaim_retreats(slug);

create index if not exists idx_mahanaim_retreat_days_retreat
    on chapelle.mahanaim_retreat_days(retreat_id, day_number);

create index if not exists idx_mahanaim_retreat_enrollments_member
    on chapelle.mahanaim_retreat_enrollments(member_id);

create index if not exists idx_mahanaim_retreat_enrollments_retreat
    on chapelle.mahanaim_retreat_enrollments(retreat_id);

create index if not exists idx_mahanaim_retreat_progress_enrollment
    on chapelle.mahanaim_retreat_progress(enrollment_id);

create index if not exists idx_mahanaim_retreat_notes_member
    on chapelle.mahanaim_retreat_notes(member_id);

create index if not exists idx_mahanaim_retreat_resources_day
    on chapelle.mahanaim_retreat_resources(retreat_day_id, position);

-- =============================================================================
-- 9. UPDATED_AT
-- =============================================================================

create or replace function chapelle.mahanaim_retreat_v1_set_updated_at()
returns trigger
language plpgsql
set search_path = chapelle, public, pg_temp
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


revoke all on function chapelle.mahanaim_retreat_v1_set_updated_at()
from public, anon, authenticated;
drop trigger if exists mahanaim_retreat_days_updated_at
    on chapelle.mahanaim_retreat_days;

create trigger mahanaim_retreat_days_updated_at
before update on chapelle.mahanaim_retreat_days
for each row execute function chapelle.mahanaim_retreat_v1_set_updated_at();

drop trigger if exists mahanaim_retreat_enrollments_updated_at
    on chapelle.mahanaim_retreat_enrollments;

create trigger mahanaim_retreat_enrollments_updated_at
before update on chapelle.mahanaim_retreat_enrollments
for each row execute function chapelle.mahanaim_retreat_v1_set_updated_at();

drop trigger if exists mahanaim_retreat_progress_updated_at
    on chapelle.mahanaim_retreat_progress;

create trigger mahanaim_retreat_progress_updated_at
before update on chapelle.mahanaim_retreat_progress
for each row execute function chapelle.mahanaim_retreat_v1_set_updated_at();

drop trigger if exists mahanaim_retreat_notes_updated_at
    on chapelle.mahanaim_retreat_notes;

create trigger mahanaim_retreat_notes_updated_at
before update on chapelle.mahanaim_retreat_notes
for each row execute function chapelle.mahanaim_retreat_v1_set_updated_at();

drop trigger if exists mahanaim_retreat_live_sessions_updated_at
    on chapelle.mahanaim_retreat_live_sessions;

create trigger mahanaim_retreat_live_sessions_updated_at
before update on chapelle.mahanaim_retreat_live_sessions
for each row execute function chapelle.mahanaim_retreat_v1_set_updated_at();

-- =============================================================================
-- 10. ROW LEVEL SECURITY
-- =============================================================================

alter table chapelle.mahanaim_retreat_days
    enable row level security;

alter table chapelle.mahanaim_retreat_enrollments
    enable row level security;

alter table chapelle.mahanaim_retreat_progress
    enable row level security;

alter table chapelle.mahanaim_retreat_notes
    enable row level security;

alter table chapelle.mahanaim_retreat_live_sessions
    enable row level security;

alter table chapelle.mahanaim_retreat_resources
    enable row level security;

-- Days:
-- member must either have Mahanaim membership access or be enrolled,
-- while leaders/responsables retain operational visibility.

drop policy if exists mah_retreat_days_read
    on chapelle.mahanaim_retreat_days;

create policy mah_retreat_days_read
on chapelle.mahanaim_retreat_days
for select
to authenticated
using (
    chapelle.has_platform_role(
        chapelle.platform_id('mahanaim'),
        'serviteur'
    )
    or exists (
        select 1
        from chapelle.mahanaim_retreats r
        where r.id = retreat_id
          and r.digital_status in (
              'registration_open',
              'active',
              'completed'
          )
          and now() >= (
              (mahanaim_retreat_days.day_date + r.daily_start_time)
              at time zone r.timezone
          )
          and (
              r.access_type = 'members'
              or exists (
                  select 1
                  from chapelle.mahanaim_retreat_enrollments en
                  where en.retreat_id = r.id
                    and en.member_id = chapelle.current_member_id()
                    and en.status in (
                        'registered',
                        'active',
                        'completed'
                    )
              )
          )
    )
);

-- Enrollments

drop policy if exists mah_retreat_enrollments_read
    on chapelle.mahanaim_retreat_enrollments;

create policy mah_retreat_enrollments_read
on chapelle.mahanaim_retreat_enrollments
for select
to authenticated
using (
    member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(
        chapelle.platform_id('mahanaim'),
        'serviteur'
    )
);

drop policy if exists mah_retreat_enrollments_insert
    on chapelle.mahanaim_retreat_enrollments;

create policy mah_retreat_enrollments_insert
on chapelle.mahanaim_retreat_enrollments
for insert
to authenticated
with check (
    member_id = chapelle.current_member_id()
    and exists (
        select 1
        from chapelle.mahanaim_retreats r
        where r.id = retreat_id
          and r.digital_status in (
              'registration_open',
              'active'
          )
    )
);

drop policy if exists mah_retreat_enrollments_update
    on chapelle.mahanaim_retreat_enrollments;

create policy mah_retreat_enrollments_update
on chapelle.mahanaim_retreat_enrollments
for update
to authenticated
using (
    member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(
        chapelle.platform_id('mahanaim'),
        'serviteur'
    )
)
with check (
    member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(
        chapelle.platform_id('mahanaim'),
        'serviteur'
    )
);

-- Progress

drop policy if exists mah_retreat_progress_read
    on chapelle.mahanaim_retreat_progress;

create policy mah_retreat_progress_read
on chapelle.mahanaim_retreat_progress
for select
to authenticated
using (
    exists (
        select 1
        from chapelle.mahanaim_retreat_enrollments en
        where en.id = enrollment_id
          and en.member_id = chapelle.current_member_id()
    )
    or chapelle.has_platform_role(
        chapelle.platform_id('mahanaim'),
        'serviteur'
    )
);

drop policy if exists mah_retreat_progress_insert
    on chapelle.mahanaim_retreat_progress;

create policy mah_retreat_progress_insert
on chapelle.mahanaim_retreat_progress
for insert
to authenticated
with check (
    exists (
        select 1
        from chapelle.mahanaim_retreat_enrollments en
        join chapelle.mahanaim_retreat_days d
          on d.id = mahanaim_retreat_progress.retreat_day_id
         and d.retreat_id = mahanaim_retreat_progress.retreat_id
        join chapelle.mahanaim_retreats r
          on r.id = d.retreat_id
        where en.id = mahanaim_retreat_progress.enrollment_id
          and en.retreat_id = mahanaim_retreat_progress.retreat_id
          and en.member_id = chapelle.current_member_id()
          and en.status in (
              'registered',
              'active',
              'completed'
          )
          and now() >= (
              (d.day_date + r.daily_start_time)
              at time zone r.timezone
          )
    )
);
drop policy if exists mah_retreat_progress_update
    on chapelle.mahanaim_retreat_progress;

create policy mah_retreat_progress_update
on chapelle.mahanaim_retreat_progress
for update
to authenticated
using (
    exists (
        select 1
        from chapelle.mahanaim_retreat_enrollments en
        join chapelle.mahanaim_retreat_days d
          on d.id = mahanaim_retreat_progress.retreat_day_id
         and d.retreat_id = mahanaim_retreat_progress.retreat_id
        join chapelle.mahanaim_retreats r
          on r.id = d.retreat_id
        where en.id = mahanaim_retreat_progress.enrollment_id
          and en.retreat_id = mahanaim_retreat_progress.retreat_id
          and en.member_id = chapelle.current_member_id()
          and en.status in (
              'registered',
              'active',
              'completed'
          )
          and now() >= (
              (d.day_date + r.daily_start_time)
              at time zone r.timezone
          )
    )
)
with check (
    exists (
        select 1
        from chapelle.mahanaim_retreat_enrollments en
        join chapelle.mahanaim_retreat_days d
          on d.id = mahanaim_retreat_progress.retreat_day_id
         and d.retreat_id = mahanaim_retreat_progress.retreat_id
        join chapelle.mahanaim_retreats r
          on r.id = d.retreat_id
        where en.id = mahanaim_retreat_progress.enrollment_id
          and en.retreat_id = mahanaim_retreat_progress.retreat_id
          and en.member_id = chapelle.current_member_id()
          and en.status in (
              'registered',
              'active',
              'completed'
          )
          and now() >= (
              (d.day_date + r.daily_start_time)
              at time zone r.timezone
          )
    )
);
-- Private notes

drop policy if exists mah_retreat_notes_read
    on chapelle.mahanaim_retreat_notes;

create policy mah_retreat_notes_read
on chapelle.mahanaim_retreat_notes
for select
to authenticated
using (
    member_id = chapelle.current_member_id()
);

drop policy if exists mah_retreat_notes_insert
    on chapelle.mahanaim_retreat_notes;

create policy mah_retreat_notes_insert
on chapelle.mahanaim_retreat_notes
for insert
to authenticated
with check (
    member_id = chapelle.current_member_id()
    and exists (
        select 1
        from chapelle.mahanaim_retreat_enrollments en
        join chapelle.mahanaim_retreat_days d
          on d.id = mahanaim_retreat_notes.retreat_day_id
         and d.retreat_id = mahanaim_retreat_notes.retreat_id
        join chapelle.mahanaim_retreats r
          on r.id = d.retreat_id
        where en.retreat_id = mahanaim_retreat_notes.retreat_id
          and en.member_id = chapelle.current_member_id()
          and en.status in (
              'registered',
              'active',
              'completed'
          )
          and now() >= (
              (d.day_date + r.daily_start_time)
              at time zone r.timezone
          )
    )
);
drop policy if exists mah_retreat_notes_update
    on chapelle.mahanaim_retreat_notes;

create policy mah_retreat_notes_update
on chapelle.mahanaim_retreat_notes
for update
to authenticated
using (
    member_id = chapelle.current_member_id()
    and exists (
        select 1
        from chapelle.mahanaim_retreat_enrollments en
        join chapelle.mahanaim_retreat_days d
          on d.id = mahanaim_retreat_notes.retreat_day_id
         and d.retreat_id = mahanaim_retreat_notes.retreat_id
        join chapelle.mahanaim_retreats r
          on r.id = d.retreat_id
        where en.retreat_id = mahanaim_retreat_notes.retreat_id
          and en.member_id = chapelle.current_member_id()
          and en.status in (
              'registered',
              'active',
              'completed'
          )
          and now() >= (
              (d.day_date + r.daily_start_time)
              at time zone r.timezone
          )
    )
)
with check (
    member_id = chapelle.current_member_id()
    and exists (
        select 1
        from chapelle.mahanaim_retreat_enrollments en
        join chapelle.mahanaim_retreat_days d
          on d.id = mahanaim_retreat_notes.retreat_day_id
         and d.retreat_id = mahanaim_retreat_notes.retreat_id
        join chapelle.mahanaim_retreats r
          on r.id = d.retreat_id
        where en.retreat_id = mahanaim_retreat_notes.retreat_id
          and en.member_id = chapelle.current_member_id()
          and en.status in (
              'registered',
              'active',
              'completed'
          )
          and now() >= (
              (d.day_date + r.daily_start_time)
              at time zone r.timezone
          )
    )
);
drop policy if exists mah_retreat_notes_delete
    on chapelle.mahanaim_retreat_notes;

create policy mah_retreat_notes_delete
on chapelle.mahanaim_retreat_notes
for delete
to authenticated
using (
    member_id = chapelle.current_member_id()
);

-- Live sessions

drop policy if exists mah_retreat_live_read
    on chapelle.mahanaim_retreat_live_sessions;

create policy mah_retreat_live_read
on chapelle.mahanaim_retreat_live_sessions
for select
to authenticated
using (
    chapelle.has_platform_role(
        chapelle.platform_id('mahanaim'),
        'serviteur'
    )
    or exists (
        select 1
        from chapelle.mahanaim_retreat_days d
        join chapelle.mahanaim_retreats r
          on r.id = d.retreat_id
        join chapelle.mahanaim_retreat_enrollments en
          on en.retreat_id = d.retreat_id
        where d.id = retreat_day_id
          and now() >= (
              (d.day_date + r.daily_start_time)
              at time zone r.timezone
          )
          and en.member_id = chapelle.current_member_id()
          and en.status in (
              'registered',
              'active',
              'completed'
          )
    )
);

-- Resources

drop policy if exists mah_retreat_resources_read
    on chapelle.mahanaim_retreat_resources;

create policy mah_retreat_resources_read
on chapelle.mahanaim_retreat_resources
for select
to authenticated
using (
    chapelle.has_platform_role(
        chapelle.platform_id('mahanaim'),
        'serviteur'
    )
    or exists (
        select 1
        from chapelle.mahanaim_retreat_days d
        join chapelle.mahanaim_retreats r
          on r.id = d.retreat_id
        join chapelle.mahanaim_retreat_enrollments en
          on en.retreat_id = d.retreat_id
        where d.id = retreat_day_id
          and now() >= (
              (d.day_date + r.daily_start_time)
              at time zone r.timezone
          )
          and en.member_id = chapelle.current_member_id()
          and en.status in (
              'registered',
              'active',
              'completed'
          )
    )
);

-- =============================================================================
-- 11. PRIVILEGES
-- =============================================================================

revoke all on table chapelle.mahanaim_retreat_days
    from public, anon, authenticated;

revoke all on table chapelle.mahanaim_retreat_enrollments
    from public, anon, authenticated;

revoke all on table chapelle.mahanaim_retreat_progress
    from public, anon, authenticated;

revoke all on table chapelle.mahanaim_retreat_notes
    from public, anon, authenticated;

revoke all on table chapelle.mahanaim_retreat_live_sessions
    from public, anon, authenticated;

revoke all on table chapelle.mahanaim_retreat_resources
    from public, anon, authenticated;

grant select
on table chapelle.mahanaim_retreat_days
to authenticated;

grant select, insert, update
on table chapelle.mahanaim_retreat_enrollments
to authenticated;

grant select, insert, update
on table chapelle.mahanaim_retreat_progress
to authenticated;

grant select, insert, update, delete
on table chapelle.mahanaim_retreat_notes
to authenticated;

grant select
on table chapelle.mahanaim_retreat_live_sessions
to authenticated;

grant select
on table chapelle.mahanaim_retreat_resources
to authenticated;
-- =============================================================================
-- MAHANAIM V1 TARGETED API ACL
--
-- anon:
--   no direct chapelle access
--
-- authenticated:
--   direct member access only to the retreat surface protected by RLS
--
-- service_role:
--   explicit server/admin access required by Supabase server clients
-- =============================================================================

grant usage on schema chapelle
to authenticated, service_role;

grant select
on table chapelle.events
to authenticated;

grant select
on table chapelle.mahanaim_retreats
to authenticated;

grant select, insert, update, delete
on table chapelle.events
to service_role;

grant select, insert, update, delete
on table chapelle.mahanaim_retreats
to service_role;

grant select, insert, update, delete
on table chapelle.mahanaim_retreat_days
to service_role;

grant select, insert, update, delete
on table chapelle.mahanaim_retreat_enrollments
to service_role;

grant select, insert, update, delete
on table chapelle.mahanaim_retreat_progress
to service_role;

grant select, insert, update, delete
on table chapelle.mahanaim_retreat_notes
to service_role;

grant select, insert, update, delete
on table chapelle.mahanaim_retreat_live_sessions
to service_role;

grant select, insert, update, delete
on table chapelle.mahanaim_retreat_resources
to service_role;

-- Existing chapelle.events + chapelle.mahanaim_retreats RLS remain canonical.

-- =============================================================================
-- 12. SEED: 10 JOURS DANS LA CHAMBRE HAUTE
-- =============================================================================

do $$
declare
    v_platform_id uuid;
    v_event_id uuid;
    v_retreat_id uuid;
begin
    select chapelle.platform_id('mahanaim')
    into v_platform_id;

    if v_platform_id is null then
        raise exception 'MAHANAIM_PLATFORM_NOT_FOUND';
    end if;

    select r.id, r.event_id
    into v_retreat_id, v_event_id
    from chapelle.mahanaim_retreats r
    where r.slug = 'chambre-haute-2026'
    limit 1;

    if v_retreat_id is null then

        insert into chapelle.events (
            platform_id,
            titre,
            description,
            lieu,
            est_en_ligne,
            date_debut,
            date_fin,
            statut
        )
        values (
            v_platform_id,
            '10 Jours dans la Chambre Haute',
            'Retraite de jeûne, de prière, de consécration et d''effusion',
            'En ligne — Citadelle',
            true,
            '2026-10-10 05:30:00+00',
            '2026-10-20 07:00:00+00',
            'publie'
        )
        returning id into v_event_id;

        insert into chapelle.mahanaim_retreats (
            event_id,
            type_retraite,
            theme,
            intention_principale,
            est_chaine_continue,
            slug,
            subtitle,
            scripture_reference,
            scripture_text,
            digital_description,
            start_date,
            end_date,
            closing_date,
            daily_start_time,
            timezone,
            digital_status,
            access_type,
            is_featured
        )
        values (
            v_event_id,
            'retraite',
            'Revêtus de Puissance',
            'Nous montons pour attendre. Nous attendons pour recevoir. Nous recevons pour être revêtus. Nous sommes revêtus pour être envoyés.',
            false,
            'chambre-haute-2026',
            'Retraite de jeûne, de prière, de consécration et d''effusion',
            'Luc 24:49',
            'Jusqu''à ce que vous soyez revêtus de puissance',
            'Une retraite numérique Mahanaïm de dix jours consacrée à l''attente, la consécration, la communion avec le Saint-Esprit, l''effusion et l''envoi.',
            '2026-10-10',
            '2026-10-19',
            '2026-10-20',
            '05:30',
            'Africa/Abidjan',
            'registration_open',
            'enrolled_members',
            true
        )
        returning id into v_retreat_id;

    end if;

    insert into chapelle.mahanaim_retreat_days (
        retreat_id,
        day_number,
        day_date,
        title,
        scripture_reference,
        objective,
        status
    )
    values
        (
            v_retreat_id,
            1,
            '2026-10-10',
            'Montez dans la Chambre Haute',
            'Actes 1:13-14',
            'Entrer volontairement dans une saison de retrait, de consécration et d''attente devant Dieu.',
            'scheduled'
        ),
        (
            v_retreat_id,
            2,
            '2026-10-11',
            'Purifiez l''autel',
            'Psaume 51:12',
            'Préparer le cœur par la repentance, la purification et la restauration de la communion avec Dieu.',
            'scheduled'
        ),
        (
            v_retreat_id,
            3,
            '2026-10-12',
            'Demeurez jusqu''à…',
            'Luc 24:49',
            'Apprendre à attendre Dieu avec persévérance au lieu de quitter prématurément la Chambre Haute.',
            'scheduled'
        ),
        (
            v_retreat_id,
            4,
            '2026-10-13',
            'Un seul cœur, une seule âme',
            'Actes 1:14',
            'Travailler l''unité, le pardon et la restauration des relations.',
            'scheduled'
        ),
        (
            v_retreat_id,
            5,
            '2026-10-14',
            'Attendez la Promesse du Père',
            'Actes 1:4-5',
            'Développer une foi qui sait attendre l''accomplissement de ce que Dieu a promis.',
            'scheduled'
        ),
        (
            v_retreat_id,
            6,
            '2026-10-15',
            'Le Saint-Esprit viendra sur vous',
            'Actes 1:8',
            'Approfondir la communion avec le Saint-Esprit et se disposer à son action.',
            'scheduled'
        ),
        (
            v_retreat_id,
            7,
            '2026-10-16',
            'Revêtus de puissance',
            'Luc 24:49',
            'Recevoir la capacité spirituelle nécessaire pour servir, témoigner et accomplir sa mission.',
            'scheduled'
        ),
        (
            v_retreat_id,
            8,
            '2026-10-17',
            'Que le feu demeure',
            '2 Timothée 1:6',
            'Passer d''une expérience ponctuelle à une vie spirituelle entretenue.',
            'scheduled'
        ),
        (
            v_retreat_id,
            9,
            '2026-10-18',
            'Vous serez mes témoins',
            'Actes 1:8',
            'Comprendre que la puissance reçue conduit à la mission et au témoignage.',
            'scheduled'
        ),
        (
            v_retreat_id,
            10,
            '2026-10-19',
            'Sortez de la Chambre Haute',
            'Actes 2:1-4',
            'Passer de l''attente à l''envoi et de la réception à l''action.',
            'scheduled'
        )
    on conflict (retreat_id, day_number)
    do update set
        day_date = excluded.day_date,
        title = excluded.title,
        scripture_reference = excluded.scripture_reference,
        objective = excluded.objective,
        status = excluded.status;

end
$$;

-- =============================================================================
-- END
-- =============================================================================

commit;
