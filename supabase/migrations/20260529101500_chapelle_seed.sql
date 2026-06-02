-- =============================================================================
-- CHAPELLE — 16. Seed (référentiels : rôles + 8 plateformes)
-- Idempotent (on conflict do nothing).
-- =============================================================================
set search_path = chapelle, public;

-- Rôles (hiérarchie RBAC — cf. role_level())
insert into chapelle.roles (key, label, niveau, est_global_only) values
  ('visiteur',               'Visiteur',                   0,   false),
  ('membre',                 'Membre',                     10,  false),
  ('serviteur',              'Serviteur',                  20,  false),
  ('leader_cellule',         'Leader de cellule',          30,  false),
  ('responsable_plateforme', 'Responsable de plateforme',  40,  false),
  ('pasteur',                'Pasteur',                    90,  true),
  ('admin',                  'Administrateur',             100, true)
on conflict (key) do nothing;

-- Plateforme racine : CIER
insert into chapelle.platforms (slug, nom, type, couleur, parent_id) values
  ('cier', 'CIER — Corps Principal', 'racine', '#D4AF37', null)
on conflict (slug) do nothing;

-- Plateformes filles (parent = cier)
insert into chapelle.platforms (slug, nom, type, couleur, parent_id)
select v.slug, v.nom, v.type::chapelle.platform_type, v.couleur, chapelle.platform_id('cier')
from (values
  ('chapelle-familiale', 'La Chapelle Familiale', 'culte',     '#22C55E'),
  ('jeunesse',           'Jeunesse',              'ministere', '#9333EA'),
  ('cite-refuge',        'Cité du Refuge',        'ministere', '#14B8A6'),
  ('cfic',               'CFIC — Centre de Formation', 'formation', '#8B5CF6'),
  ('femmes-exceptions',  'Femmes d''Exceptions',  'ministere', '#EC4899'),
  ('familles-chapelle',  'Familles de la Chapelle','ministere','#F5E6A7'),
  ('mahanaim',           'Mahanaïm — Prière',     'cellule',   '#A855F7')
) as v(slug, nom, type, couleur)
on conflict (slug) do nothing;
