-- ============================================================================
-- PR58 — FORMATIONS CANONICAL ORDER
-- Ajoute un ordre explicite aux formations sans supprimer ni renommer de contenu.
--
-- GARANTIES :
--   - migration additive
--   - aucune suppression
--   - aucune formation renommée
--   - aucune progression membre touchée
-- ============================================================================

begin;

alter table public.formations
  add column if not exists ordre integer;

-- Séquence pédagogique canonique Citadelle.
update public.formations as f
set ordre = canonical.ordre
from (
  values
    ('nouveau-croyant', 1),
    ('parcours-du-salut', 2),
    ('je-decouvre-la-maison', 3),
    ('je-stabilise-ma-foi', 4),
    ('je-deviens-disciple-actif', 5)
) as canonical(slug, ordre)
where f.slug = canonical.slug;

-- Toute autre formation existante est préservée et placée
-- après la séquence canonique.
with remaining as (
  select
    id,
    (
      row_number() over (
        order by created_at asc, id asc
      ) + 5
    )::integer as ordre
  from public.formations
  where ordre is null
)
update public.formations as f
set ordre = remaining.ordre
from remaining
where f.id = remaining.id;

create index if not exists idx_formations_ordre
  on public.formations (ordre);

comment on column public.formations.ordre is
  'Ordre canonique d''affichage des formations dans Citadelle.';

commit;