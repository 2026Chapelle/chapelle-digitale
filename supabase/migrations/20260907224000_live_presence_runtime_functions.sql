-- =============================================================================
-- CITADELLE — LIVE 4A.2
-- Fonctions runtime de présence réelle.
--
-- IMPORTANT :
--   cette migration est créée et versionnée mais NON appliquée dans LIVE 4A.2.
--
-- Objectifs :
--   - join idempotent ;
--   - fusion guest -> membre atomique ;
--   - heartbeat non créateur ;
--   - comptage actif sur cutoff serveur ;
--   - service_role uniquement.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- JOIN
-- -----------------------------------------------------------------------------

create or replace function public.live_presence_join(
  p_live_key text,
  p_user_id uuid default null,
  p_guest_session_hash text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_guest_joined_at timestamptz;
begin
  if p_live_key is null
     or p_live_key !~ '^youtube:[A-Za-z0-9_-]{11}$'
  then
    raise exception 'invalid_live_key';
  end if;

  if p_guest_session_hash is not null
     and p_guest_session_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'invalid_guest_session_hash';
  end if;

  if p_user_id is null
     and p_guest_session_hash is null
  then
    raise exception 'identity_required';
  end if;

  -- Membre authentifié.
  if p_user_id is not null then

    -- Si la même personne avait déjà rejoint anonymement,
    -- verrouiller la ligne guest afin de préserver son joined_at.
    if p_guest_session_hash is not null then
      select joined_at
        into v_guest_joined_at
        from public.live_presence_sessions
       where live_key = p_live_key
         and participant_kind = 'guest'
         and guest_session_hash = p_guest_session_hash
       for update;
    end if;

    insert into public.live_presence_sessions (
      live_key,
      participant_kind,
      user_id,
      guest_session_hash,
      joined_at,
      last_seen_at
    )
    values (
      p_live_key,
      'member',
      p_user_id,
      null,
      coalesce(v_guest_joined_at, v_now),
      v_now
    )
    on conflict (live_key, user_id)
      where participant_kind = 'member'
        and user_id is not null
    do update
       set last_seen_at = excluded.last_seen_at,
           joined_at = least(
             live_presence_sessions.joined_at,
             excluded.joined_at
           );

    -- Suppression dans la même transaction PostgreSQL :
    -- aucun état final ne contient le guest et le membre simultanément.
    if p_guest_session_hash is not null then
      delete from public.live_presence_sessions
       where live_key = p_live_key
         and participant_kind = 'guest'
         and guest_session_hash = p_guest_session_hash;
    end if;

    return 'member';
  end if;

  -- Visiteur anonyme.
  insert into public.live_presence_sessions (
    live_key,
    participant_kind,
    user_id,
    guest_session_hash,
    joined_at,
    last_seen_at
  )
  values (
    p_live_key,
    'guest',
    null,
    p_guest_session_hash,
    v_now,
    v_now
  )
  on conflict (live_key, guest_session_hash)
    where participant_kind = 'guest'
      and guest_session_hash is not null
  do update
     set last_seen_at = excluded.last_seen_at;

  return 'guest';
end;
$$;

-- -----------------------------------------------------------------------------
-- HEARTBEAT
-- -----------------------------------------------------------------------------

create or replace function public.live_presence_heartbeat(
  p_live_key text,
  p_user_id uuid default null,
  p_guest_session_hash text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_guest_joined_at timestamptz;
begin
  if p_live_key is null
     or p_live_key !~ '^youtube:[A-Za-z0-9_-]{11}$'
  then
    return false;
  end if;

  if p_guest_session_hash is not null
     and p_guest_session_hash !~ '^[0-9a-f]{64}$'
  then
    return false;
  end if;

  -- Membre déjà présent.
  if p_user_id is not null then
    update public.live_presence_sessions
       set last_seen_at = v_now
     where live_key = p_live_key
       and participant_kind = 'member'
       and user_id = p_user_id;

    if found then
      -- Nettoyage éventuel d'une ancienne présence guest
      -- appartenant à la même session navigateur.
      if p_guest_session_hash is not null then
        delete from public.live_presence_sessions
         where live_key = p_live_key
           and participant_kind = 'guest'
           and guest_session_hash = p_guest_session_hash;
      end if;

      return true;
    end if;

    -- Le heartbeat ne crée pas une présence depuis rien.
    -- Exception légitime : promotion d'un guest qui avait
    -- explicitement effectué "Je suis là" avant sa connexion.
    if p_guest_session_hash is not null then
      select joined_at
        into v_guest_joined_at
        from public.live_presence_sessions
       where live_key = p_live_key
         and participant_kind = 'guest'
         and guest_session_hash = p_guest_session_hash
       for update;

      if found then
        insert into public.live_presence_sessions (
          live_key,
          participant_kind,
          user_id,
          guest_session_hash,
          joined_at,
          last_seen_at
        )
        values (
          p_live_key,
          'member',
          p_user_id,
          null,
          v_guest_joined_at,
          v_now
        )
        on conflict (live_key, user_id)
          where participant_kind = 'member'
            and user_id is not null
        do update
           set last_seen_at = excluded.last_seen_at,
               joined_at = least(
                 live_presence_sessions.joined_at,
                 excluded.joined_at
               );

        delete from public.live_presence_sessions
         where live_key = p_live_key
           and participant_kind = 'guest'
           and guest_session_hash = p_guest_session_hash;

        return true;
      end if;
    end if;

    return false;
  end if;

  -- Guest : mise à jour UNIQUEMENT si le join existe déjà.
  if p_guest_session_hash is null then
    return false;
  end if;

  update public.live_presence_sessions
     set last_seen_at = v_now
   where live_key = p_live_key
     and participant_kind = 'guest'
     and guest_session_hash = p_guest_session_hash;

  return found;
end;
$$;

-- -----------------------------------------------------------------------------
-- COUNTS
-- -----------------------------------------------------------------------------

create or replace function public.live_presence_counts(
  p_live_key text,
  p_active_since timestamptz
)
returns table (
  active_total bigint,
  active_members bigint,
  active_guests bigint,
  joined_total bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    count(*) filter (
      where last_seen_at >= p_active_since
    )::bigint as active_total,

    count(*) filter (
      where last_seen_at >= p_active_since
        and participant_kind = 'member'
    )::bigint as active_members,

    count(*) filter (
      where last_seen_at >= p_active_since
        and participant_kind = 'guest'
    )::bigint as active_guests,

    count(*)::bigint as joined_total

  from public.live_presence_sessions
  where live_key = p_live_key;
$$;

-- -----------------------------------------------------------------------------
-- PRIVILÈGES
-- -----------------------------------------------------------------------------

revoke all on function
  public.live_presence_join(text, uuid, text)
  from public, anon, authenticated;

revoke all on function
  public.live_presence_heartbeat(text, uuid, text)
  from public, anon, authenticated;

revoke all on function
  public.live_presence_counts(text, timestamptz)
  from public, anon, authenticated;

grant execute on function
  public.live_presence_join(text, uuid, text)
  to service_role;

grant execute on function
  public.live_presence_heartbeat(text, uuid, text)
  to service_role;

grant execute on function
  public.live_presence_counts(text, timestamptz)
  to service_role;

commit;

-- =============================================================================
-- ROLLBACK DE RÉFÉRENCE — NE PAS EXÉCUTER AUTOMATIQUEMENT
--
-- drop function if exists
--   public.live_presence_counts(text, timestamptz);
--
-- drop function if exists
--   public.live_presence_heartbeat(text, uuid, text);
--
-- drop function if exists
--   public.live_presence_join(text, uuid, text);
-- =============================================================================