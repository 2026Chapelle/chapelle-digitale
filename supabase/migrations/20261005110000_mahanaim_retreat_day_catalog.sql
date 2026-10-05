-- Mahanaïm retreat day metadata for enrolled members before daily unlock.
-- Full day rows remain protected by the existing mah_retreat_days_read policy.

create or replace function chapelle.member_mahanaim_retreat_day_catalog(
    p_slug text
)
returns table (
    id uuid,
    retreat_id uuid,
    day_number integer,
    day_date date,
    title text,
    scripture_reference text,
    status text,
    is_unlocked boolean
)
language sql
stable
security definer
set search_path = chapelle, public, pg_temp
as $$
    select
        d.id,
        d.retreat_id,
        d.day_number,
        d.day_date,
        d.title,
        d.scripture_reference,
        d.status,
        now() >= (
            (d.day_date + r.daily_start_time)
            at time zone r.timezone
        ) as is_unlocked
    from chapelle.mahanaim_retreats r
    join chapelle.mahanaim_retreat_days d
      on d.retreat_id = r.id
    where r.slug = p_slug
      and auth.uid() is not null
      and exists (
          select 1
          from chapelle.members m
          join chapelle.mahanaim_retreat_enrollments en
            on en.member_id = m.id
          where m.auth_user_id = auth.uid()
            and en.retreat_id = r.id
            and en.status in ('registered', 'active', 'completed')
      )
    order by d.day_number;
$$;

revoke all on function chapelle.member_mahanaim_retreat_day_catalog(text)
from public;

grant execute on function chapelle.member_mahanaim_retreat_day_catalog(text)
to authenticated;
