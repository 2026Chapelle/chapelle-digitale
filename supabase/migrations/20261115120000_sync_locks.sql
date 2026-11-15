-- LIVE & REPLAY V1 : verrou d'exclusion mutuelle ATOMIQUE entre processus (Passenger, cron, relance admin).
-- Un SELECT suivi d'un INSERT n'est pas un verrou : deux processus peuvent lire « libre » puis écrire
-- tous les deux. Ici, l'acquisition est UNE seule instruction INSERT ... ON CONFLICT DO UPDATE ... WHERE :
-- PostgreSQL verrouille la ligne du nom demandé et évalue la condition sous ce verrou, donc au plus un
-- appelant obtient `true` tant que le bail n'a pas expiré. Executee par le service_role uniquement.

create table if not exists public.sync_locks (
  name         text        primary key,
  owner        text        not null,
  locked_until timestamptz not null,
  acquired_at  timestamptz not null default now(),
  released_at  timestamptz
);

comment on table public.sync_locks is
  'Baux d''exclusion mutuelle des synchronisations serveur (ex. youtube-live-sync). Service role uniquement.';

alter table public.sync_locks enable row level security;
-- Aucune policy : invisible et inaccessible aux rôles anon/authenticated. Le service_role contourne la RLS.
revoke all on table public.sync_locks from public;
revoke all on table public.sync_locks from anon;
revoke all on table public.sync_locks from authenticated;

-- Acquisition atomique : true si le bail est obtenu (libre, expiré, ou déjà détenu par le même owner).
create or replace function public.acquire_sync_lock(p_name text, p_owner text, p_ttl_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_ttl integer := least(greatest(coalesce(p_ttl_seconds, 300), 5), 3600);
begin
  if p_name is null or btrim(p_name) = '' or p_owner is null or btrim(p_owner) = '' then
    raise exception 'sync lock name and owner are required' using errcode = '22023';
  end if;

  insert into public.sync_locks as l (name, owner, locked_until, acquired_at, released_at)
  values (p_name, p_owner, clock_timestamp() + make_interval(secs => v_ttl), clock_timestamp(), null)
  on conflict (name) do update
    set owner        = excluded.owner,
        locked_until = excluded.locked_until,
        acquired_at  = excluded.acquired_at,
        released_at  = null
    where l.locked_until <= clock_timestamp()
       or l.owner = excluded.owner;

  return found;
end;
$function$;

-- Libération : uniquement par le détenteur. true si le bail a été libéré.
create or replace function public.release_sync_lock(p_name text, p_owner text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.sync_locks
     set locked_until = clock_timestamp(),
         released_at  = clock_timestamp()
   where name = p_name
     and owner = p_owner
     and locked_until > clock_timestamp();
  return found;
end;
$function$;

revoke all on function public.acquire_sync_lock(text, text, integer) from public;
revoke all on function public.acquire_sync_lock(text, text, integer) from anon;
revoke all on function public.acquire_sync_lock(text, text, integer) from authenticated;
grant execute on function public.acquire_sync_lock(text, text, integer) to service_role;

revoke all on function public.release_sync_lock(text, text) from public;
revoke all on function public.release_sync_lock(text, text) from anon;
revoke all on function public.release_sync_lock(text, text) from authenticated;
grant execute on function public.release_sync_lock(text, text) to service_role;
