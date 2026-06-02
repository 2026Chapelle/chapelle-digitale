-- =============================================================================
-- CHAPELLE — 12. Triggers automatiques
-- =============================================================================
set search_path = chapelle, public;

-- ----------------------------------------------------------------------------
-- (a) updated_at : attache set_updated_at() à toute table chapelle.* qui
--     possède une colonne updated_at (saute les tables append-only).
-- ----------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'chapelle'
      and c.column_name = 'updated_at'
    group by c.table_name
  loop
    execute format(
      'drop trigger if exists trg_set_updated_at on chapelle.%I;', t.table_name
    );
    execute format(
      'create trigger trg_set_updated_at before update on chapelle.%I
         for each row execute function chapelle.set_updated_at();', t.table_name
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- (b) Tunnel : niveau ordinal d'une étape (pour ne jamais régresser)
-- ----------------------------------------------------------------------------
create or replace function chapelle.tunnel_level(s chapelle.tunnel_stage)
returns integer language sql immutable as $$
  select case s
    when 'visiteur' then 0 when 'contact' then 1 when 'integration' then 2
    when 'disciple' then 3 when 'membre' then 4 when 'serviteur' then 5
    when 'leader' then 6 else 0 end;
$$;

-- ----------------------------------------------------------------------------
-- (c) integration_journeys : horodatage auto des jalons + calcul stage_courant
-- ----------------------------------------------------------------------------
create or replace function chapelle.journey_stamp_and_stage()
returns trigger
language plpgsql
as $$
begin
  -- Horodate chaque jalon au passage à true (si pas déjà renseigné)
  if new.a_rempli_formulaire and new.a_rempli_formulaire_at is null then
    new.a_rempli_formulaire_at := now();
  end if;
  if new.a_rejoint_whatsapp and new.a_rejoint_whatsapp_at is null then
    new.a_rejoint_whatsapp_at := now();
  end if;
  if new.a_suivi_parcours and new.a_suivi_parcours_at is null then
    new.a_suivi_parcours_at := now();
  end if;
  if new.a_participe_programme and new.a_participe_programme_at is null then
    new.a_participe_programme_at := now();
  end if;
  if new.est_devenu_membre and new.est_devenu_membre_at is null then
    new.est_devenu_membre_at := now();
  end if;

  -- Recalcule l'étape courante à partir des jalons (du plus avancé au moins)
  new.stage_courant := case
    when new.est_devenu_membre     then 'membre'::chapelle.tunnel_stage
    when new.a_participe_programme then 'disciple'::chapelle.tunnel_stage
    when new.a_suivi_parcours      then 'integration'::chapelle.tunnel_stage
    when new.a_rejoint_whatsapp    then 'integration'::chapelle.tunnel_stage
    when new.a_rempli_formulaire   then 'contact'::chapelle.tunnel_stage
    else 'visiteur'::chapelle.tunnel_stage
  end;
  return new;
end;
$$;

drop trigger if exists trg_journey_stamp on chapelle.integration_journeys;
create trigger trg_journey_stamp
  before insert or update on chapelle.integration_journeys
  for each row execute function chapelle.journey_stamp_and_stage();

-- Après écriture : élève members.tunnel_stage au max global (jamais de régression)
create or replace function chapelle.journey_sync_member_stage()
returns trigger
language plpgsql
security definer
set search_path = chapelle, public, pg_temp
as $$
begin
  update chapelle.members m
     set tunnel_stage = new.stage_courant
   where m.id = new.member_id
     and chapelle.tunnel_level(new.stage_courant) > chapelle.tunnel_level(m.tunnel_stage);
  return null;
end;
$$;

drop trigger if exists trg_journey_sync_member on chapelle.integration_journeys;
create trigger trg_journey_sync_member
  after insert or update of stage_courant on chapelle.integration_journeys
  for each row execute function chapelle.journey_sync_member_stage();
