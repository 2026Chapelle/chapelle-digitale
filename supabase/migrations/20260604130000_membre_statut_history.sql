-- ============================================================================
-- HISTORIQUE DES CHANGEMENTS DE STATUT MEMBRE
-- ----------------------------------------------------------------------------
-- Trace chaque migration automatique de `profiles.membre_statut` (ex. à la
-- complétion d'un parcours d'intégration). Additif, RLS. N'altère AUCUNE table
-- existante. Écritures via service role (back-office / routes serveur).
-- ============================================================================

create table if not exists public.membre_statut_history (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  ancien_statut  text,
  nouveau_statut text        not null,
  source         text,        -- ex. 'parcours:je-stabilise-ma-foi'
  created_at     timestamptz  not null default now()
);
create index if not exists idx_msh_user on public.membre_statut_history (user_id, created_at desc);

alter table public.membre_statut_history enable row level security;

-- Lecture : le membre voit son propre historique.
drop policy if exists msh_select_own on public.membre_statut_history;
create policy msh_select_own on public.membre_statut_history for select
  to authenticated using (user_id = auth.uid());
-- Écriture via service role uniquement (routes serveur) — pas de policy insert.

notify pgrst, 'reload schema';
