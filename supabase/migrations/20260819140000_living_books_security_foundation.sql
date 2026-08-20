-- ============================================================================
-- CITADELLE LIVING BOOKS — LB-SEC : SOCLE DE SÉCURITÉ PREMIUM DES DOCUMENTS
-- ----------------------------------------------------------------------------
-- OBJECTIF : rendre un document MEMBER/PREMIUM réellement inaccessible sans
-- autorisation — y compris si quelqu'un connaît son URL ou interroge l'API —
-- via la vraie chaîne : cms_media → contrôle serveur → access_level →
-- entitlement → objet privé → URL signée courte → reader.
--
-- PRINCIPE (règle des acquis) : 100 % ADDITIF. Aucun DROP, aucun rename, aucune
-- colonne legacy retirée, AUCUN backfill de masse, AUCUN déplacement de fichier.
-- Les documents PUBLICS existants continuent de fonctionner à l'identique.
--
-- CE QUE FAIT CETTE MIGRATION :
--   1) Bucket Storage PRIVÉ dédié `documents` (public=false) — les octets ne
--      sont lisibles QUE via une URL signée émise côté serveur après contrôle.
--   2) Entitlement Premium LIVRES : has_books_premium_access(uuid) — pure
--      spécialisation de la primitive canonique has_entitlement (clé
--      'books_premium'). AUCUNE seconde logique premium, AUCUN nouveau RBAC.
--   3) Durcissement des grants de cms_document_links (dette LB-0) : lecture
--      selon policy publiée, aucune écriture cliente.
--
-- CE QU'ELLE NE FAIT PAS (volontairement, périmètre progressif) :
--   - ne modifie PAS la RLS/les grants de cms_media (verrou colonne `url` =
--     LB-SEC-2, à traiter séparément car `url` est partagé par tous les médias
--     image/vidéo/audio et un verrou large casserait le rendu public). Pour un
--     document privé, l'identité de stockage = storage_bucket/storage_path et
--     `cms_media.url` doit rester VIDE (aucune fuite permanente du fichier).
--   - ne déplace AUCUN fichier existant vers le bucket privé (backfill = étape
--     distante ultérieure, sous nouveau GO).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Bucket Storage PRIVÉ `documents`
-- ----------------------------------------------------------------------------
-- public = false → aucune lecture directe : seules les URLs signées (générées
-- par le serveur via service_role après contrôle d'accès) donnent accès aux
-- octets. file_size_limit 500 Mo (aligné sur `media`).
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 524288000)
on conflict (id) do update
  set public = false,
      file_size_limit = 524288000;

-- Aucune policy de lecture pour anon/authenticated sur le bucket `documents` :
-- il reste privé. Les écritures (upload back-office) passent par la service role
-- (bypass RLS), exactement comme le bucket `media`. Fail-closed par défaut.

-- ----------------------------------------------------------------------------
-- 2) Entitlement Premium LIVRES — spécialisation de has_entitlement
-- ----------------------------------------------------------------------------
-- Réutilise STRICTEMENT la primitive canonique public.has_entitlement(uuid,text)
-- (PODCAST-5B). Une seule source de vérité du droit ; clé canonique 'books_premium'.
-- SECURITY DEFINER + search_path fixé (cohérent avec le durcissement 20260817120000).
-- Fail-closed : coalesce(..., false).
create or replace function public.has_books_premium_access(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.has_entitlement(p_user, 'books_premium'), false);
$$;

-- Résolution SERVEUR uniquement (service_role) : un membre ne sonde jamais le
-- statut premium d'autrui. La lecture de SES droits passe déjà par la policy
-- SELECT-own de user_entitlements (PODCAST-5B).
revoke all on function public.has_books_premium_access(uuid) from public;
grant execute on function public.has_books_premium_access(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 3) Durcissement des grants de cms_document_links (dette LB-0)
-- ----------------------------------------------------------------------------
-- La RLS protège déjà les écritures (aucune policy insert/update/delete pour
-- anon/authenticated), mais on retire aussi les GRANTS inutiles au niveau
-- privilèges (défense en profondeur). La lecture reste régie par la policy
-- cms_document_links_read (status='published'). service_role garde tous ses droits
-- (accordés en PDF-2).
revoke insert, update, delete, truncate, references, trigger
  on public.cms_document_links from anon, authenticated;

notify pgrst, 'reload schema';
