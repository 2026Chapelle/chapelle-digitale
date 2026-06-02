-- ============================================================================
-- STORAGE RLS — avatars gérables côté client (clé anon + session)
-- ----------------------------------------------------------------------------
-- Permet à un membre authentifié de téléverser / remplacer / supprimer SA
-- propre photo de profil directement depuis le navigateur (clé anon), sans
-- passer par le service_role. Le dossier de l'objet doit être l'id du membre
-- (chemin = "<uid>/avatar.ext"), ce qui empêche d'écrire chez un autre.
--
-- NOUVELLE migration (ne modifie aucune migration déjà validée).
-- La lecture publique est déjà couverte par la policy `media_public_read`
-- (buckets media + avatars) de 20260530100300_storage_and_articles.sql.
-- ============================================================================

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
