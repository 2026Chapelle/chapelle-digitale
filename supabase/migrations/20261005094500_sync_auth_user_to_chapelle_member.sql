-- ============================================================================
-- CITADELLE — Sync auth.users -> public.profiles + chapelle.members
-- Mahanaim prerequisite: every authenticated user must have a canonical member.
-- Supports existing legacy members without auth_user_id.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, chapelle, auth, pg_temp
as $$
declare
  v_member_id uuid;
begin
  insert into public.profiles (
    id,
    email,
    prenom,
    nom,
    role,
    pays,
    ville,
    telephone,
    comment_entendu,
    baptise,
    source_inscription
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    coalesce(new.raw_user_meta_data->>'nom', ''),
    'visiteur',
    nullif(new.raw_user_meta_data->>'pays', ''),
    nullif(new.raw_user_meta_data->>'ville', ''),
    nullif(new.raw_user_meta_data->>'telephone', ''),
    nullif(new.raw_user_meta_data->>'comment', ''),
    coalesce((new.raw_user_meta_data->>'baptise')::boolean, false),
    'web_register'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    prenom = excluded.prenom,
    nom = excluded.nom,
    pays = excluded.pays,
    telephone = excluded.telephone;

  -- 1. Existing canonical member already linked to this Auth user.
  update chapelle.members
  set
    prenom = coalesce(
      nullif(new.raw_user_meta_data->>'prenom', ''),
      chapelle.members.prenom
    ),
    nom = coalesce(
      nullif(new.raw_user_meta_data->>'nom', ''),
      chapelle.members.nom
    ),
    email = coalesce(new.email, chapelle.members.email),
    telephone = coalesce(
      nullif(new.raw_user_meta_data->>'telephone', ''),
      chapelle.members.telephone
    ),
    pays = coalesce(
      nullif(new.raw_user_meta_data->>'pays', ''),
      chapelle.members.pays
    ),
    updated_at = now()
  where auth_user_id = new.id
  returning id into v_member_id;

  -- 2. Legacy member with same email and no Auth link yet.
  if v_member_id is null and new.email is not null then
    update chapelle.members
    set
      auth_user_id = new.id,
      prenom = coalesce(
        nullif(new.raw_user_meta_data->>'prenom', ''),
        chapelle.members.prenom
      ),
      nom = coalesce(
        nullif(new.raw_user_meta_data->>'nom', ''),
        chapelle.members.nom
      ),
      telephone = coalesce(
        nullif(new.raw_user_meta_data->>'telephone', ''),
        chapelle.members.telephone
      ),
      pays = coalesce(
        nullif(new.raw_user_meta_data->>'pays', ''),
        chapelle.members.pays
      ),
      updated_at = now()
    where auth_user_id is null
      and email is not null
      and lower(email) = lower(new.email)
    returning id into v_member_id;
  end if;

  -- 3. Brand-new canonical member.
  if v_member_id is null then
    insert into chapelle.members (
      auth_user_id,
      prenom,
      nom,
      email,
      telephone,
      pays,
      statut,
      tunnel_stage,
      role_global
    )
    values (
      new.id,
      coalesce(
        nullif(new.raw_user_meta_data->>'prenom', ''),
        'Visiteur'
      ),
      nullif(new.raw_user_meta_data->>'nom', ''),
      new.email,
      nullif(new.raw_user_meta_data->>'telephone', ''),
      nullif(new.raw_user_meta_data->>'pays', ''),
      'actif',
      'visiteur',
      'visiteur'
    )
    on conflict (auth_user_id) do update
    set
      prenom = excluded.prenom,
      nom = coalesce(excluded.nom, chapelle.members.nom),
      email = coalesce(excluded.email, chapelle.members.email),
      telephone = coalesce(excluded.telephone, chapelle.members.telephone),
      pays = coalesce(excluded.pays, chapelle.members.pays),
      updated_at = now();
  end if;

  return new;
end;
$$;