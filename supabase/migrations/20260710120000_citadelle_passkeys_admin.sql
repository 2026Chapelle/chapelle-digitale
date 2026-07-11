-- CITADELLE — PASSKEYS / WebAuthn ADMIN (phase 1) — MIGRATION ADDITIVE
--
-- Objectif :
--   Stocker les credentials WebAuthn (passkeys) des ADMINISTRATEURS nominatifs
--   (comptes Supabase réels), leurs challenges éphémères et un journal de sécurité.
--
-- Principe absolu :
--   Citadelle ne stocke JAMAIS de données biométriques. On ne conserve que des
--   données cryptographiques : clé PUBLIQUE COSE, credential_id, signCount, et le
--   HASH du challenge (jamais le challenge en clair).
--
-- Sécurité :
--   - liaison STRICTE au véritable identifiant utilisateur : user_id -> public.profiles(id)
--     (= auth.users.id) ; ON DELETE CASCADE.
--   - unicité des credential_id.
--   - RLS activé + FORCE RLS, AUCUNE policy anon/authenticated : accès EXCLUSIVEMENT
--     via supabaseAdmin (service role) depuis les routes serveur /api/admin/passkeys/*.
--   - révocation LOGIQUE (revoked_at), jamais de suppression dure.
--   - index justifiés uniquement.
--
-- ⚠️ NE PAS EXÉCUTER automatiquement : migration additive à appliquer manuellement
--    (l'historique CLI supabase reste désaligné, comme les migrations V2.1D).
--    Aucune donnée fictive. Aucune suppression d'objet existant.

begin;

-- 1) Credentials (passkeys) ------------------------------------------------
create table if not exists public.admin_webauthn_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  credential_id text not null unique,                 -- base64url (identifiant PUBLIC)
  public_key    text not null,                        -- clé PUBLIQUE COSE (base64url) — jamais privée
  sign_count    bigint not null default 0,
  transports    text[],
  device_type   text,                                 -- 'singleDevice' | 'multiDevice'
  backed_up     boolean not null default false,       -- passkey synchronisée ?
  friendly_name text,                                 -- nom d'appareil, renommable
  aaguid        text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

comment on table public.admin_webauthn_credentials is
  'Passkeys WebAuthn des administrateurs nominatifs. Données cryptographiques uniquement, aucune biométrie.';

-- Lister rapidement les passkeys ACTIVES d'un admin.
create index if not exists idx_admin_webauthn_creds_user_active
  on public.admin_webauthn_credentials (user_id)
  where revoked_at is null;

-- 2) Challenges éphémères (anti-rejeu) -------------------------------------
create table if not exists public.admin_webauthn_challenges (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade, -- null pour l'auth découvrable
  ceremony       text not null check (ceremony in ('registration','authentication')),
  challenge_hash text not null,                        -- SHA-256 du challenge (jamais le clair)
  expires_at     timestamptz not null,                 -- TTL court (≤ 2 min appliqué côté app)
  consumed_at    timestamptz,                          -- usage unique (consommation atomique)
  created_at     timestamptz not null default now()
);

comment on table public.admin_webauthn_challenges is
  'Challenges WebAuthn éphémères (hash uniquement), usage unique et TTL court. Purge best-effort.';

create index if not exists idx_admin_webauthn_challenges_expires
  on public.admin_webauthn_challenges (expires_at);

-- 3) Journal de sécurité ---------------------------------------------------
create table if not exists public.admin_security_log (
  id            uuid primary key default gen_random_uuid(),
  event         text not null,
  user_id       uuid,
  credential_id text,                                  -- identifiant PUBLIC uniquement
  ip            text,
  user_agent    text,
  result        text,
  created_at    timestamptz not null default now()
);

comment on table public.admin_security_log is
  'Journal sécurité passkeys. JAMAIS de secret, challenge en clair, cookie, token, clé ni biométrie.';

create index if not exists idx_admin_security_log_created on public.admin_security_log (created_at);
create index if not exists idx_admin_security_log_user on public.admin_security_log (user_id, created_at);

-- 4) RLS deny-by-default + FORCE (service role uniquement, aucune policy) ---
alter table public.admin_webauthn_credentials enable row level security;
alter table public.admin_webauthn_credentials force row level security;
alter table public.admin_webauthn_challenges  enable row level security;
alter table public.admin_webauthn_challenges  force row level security;
alter table public.admin_security_log         enable row level security;
alter table public.admin_security_log         force row level security;

-- 5) Rechargement du cache PostgREST
notify pgrst, 'reload schema';

-- 6) Postcheck (échoue si un objet attendu manque / RLS non forcée) ---------
do $$
begin
  if to_regclass('public.admin_webauthn_credentials') is null
     or to_regclass('public.admin_webauthn_challenges') is null
     or to_regclass('public.admin_security_log') is null then
    raise exception 'Passkeys postcheck failed: table manquante';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('admin_webauthn_credentials','admin_webauthn_challenges','admin_security_log')
      and c.relrowsecurity = true
      and c.relforcerowsecurity = true
    having count(*) = 3
  ) then
    raise exception 'Passkeys postcheck failed: RLS/force RLS manquante';
  end if;
end $$;

commit;
