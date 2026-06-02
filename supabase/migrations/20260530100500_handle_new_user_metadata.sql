-- ============================================================================
-- INSCRIPTION — enrichissement du profil créé automatiquement
-- ----------------------------------------------------------------------------
-- À l'inscription (auth.users → profiles), on capture désormais aussi les
-- champs renseignés dans le formulaire /register (pays, ville, téléphone,
-- comment_entendu, baptise). Le RÔLE reste forcé à 'visiteur' côté serveur
-- (sécurité : un utilisateur ne peut pas s'auto-attribuer un rôle privilégié).
-- Remplace la fonction existante de façon idempotente.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, prenom, nom, role, pays, ville, telephone, comment_entendu, baptise, source_inscription)
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
  );
  return new;
end;
$$ language plpgsql security definer;
