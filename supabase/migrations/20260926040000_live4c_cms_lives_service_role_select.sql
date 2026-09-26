-- LIVE 4C replay reactions
-- The server validates replay eligibility by reading public.cms_lives.
-- Grant only the table privilege required by the service_role backend.

begin;

grant select on table public.cms_lives
  to service_role;

commit;
