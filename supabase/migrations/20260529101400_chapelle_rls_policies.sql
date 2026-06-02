-- =============================================================================
-- CHAPELLE — 15. Row Level Security (RLS) — activation + policies
-- =============================================================================
-- Principe : deny-by-default. Le service_role (clé serveur Supabase) contourne
-- la RLS → les insertions système (notifications, webhooks dons) passent par lui.
-- Les policies ci-dessous couvrent les accès des rôles anon / authenticated.
-- Helpers : current_member_id(), has_global_role(), has_platform_role(), platform_id().
-- =============================================================================
set search_path = chapelle, public;

-- (a) Activer RLS sur TOUTES les tables du schéma chapelle
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'chapelle' loop
    execute format('alter table chapelle.%I enable row level security;', t.tablename);
  end loop;
end $$;

-- =====================  CORE  =================================================

-- platforms : vitrine publique des plateformes actives ; écriture pasteur/admin
create policy platforms_read on chapelle.platforms for select
  using (actif = true or chapelle.has_global_role('pasteur'));
create policy platforms_write on chapelle.platforms for all
  using (chapelle.has_global_role('pasteur')) with check (chapelle.has_global_role('pasteur'));

-- roles : lecture authentifiée ; écriture admin
create policy roles_read on chapelle.roles for select to authenticated using (true);
create policy roles_write on chapelle.roles for all
  using (chapelle.has_global_role('admin')) with check (chapelle.has_global_role('admin'));

-- members : self OR responsable d'une plateforme du membre OR pasteur/admin
create policy members_read on chapelle.members for select using (
  auth_user_id = auth.uid()
  or chapelle.has_global_role('pasteur')
  or exists (
    select 1 from chapelle.memberships mm
    where mm.member_id = members.id
      and chapelle.has_platform_role(mm.platform_id, 'responsable_plateforme')
  )
);
create policy members_update_self on chapelle.members for update
  using (auth_user_id = auth.uid() or chapelle.has_global_role('admin'))
  with check (auth_user_id = auth.uid() or chapelle.has_global_role('admin'));
create policy members_insert on chapelle.members for insert to authenticated
  with check (auth_user_id = auth.uid() or chapelle.has_global_role('pasteur'));

-- memberships : self OR responsable plateforme OR pasteur
create policy memberships_read on chapelle.memberships for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(platform_id, 'responsable_plateforme')
  or chapelle.has_global_role('pasteur')
);
create policy memberships_write on chapelle.memberships for all
  using (chapelle.has_platform_role(platform_id, 'responsable_plateforme'))
  with check (chapelle.has_platform_role(platform_id, 'responsable_plateforme'));

-- events : publiés lisibles par tous ; gestion responsable plateforme
create policy events_read on chapelle.events for select
  using (statut = 'publie' or chapelle.has_platform_role(platform_id, 'serviteur'));
create policy events_write on chapelle.events for all
  using (chapelle.has_platform_role(platform_id, 'responsable_plateforme'))
  with check (chapelle.has_platform_role(platform_id, 'responsable_plateforme'));

-- donations : donateur, responsable plateforme, pasteur
create policy donations_read on chapelle.donations for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_global_role('pasteur')
  or (platform_id is not null and chapelle.has_platform_role(platform_id, 'responsable_plateforme'))
);
create policy donations_insert on chapelle.donations for insert to authenticated
  with check (member_id = chapelle.current_member_id() or chapelle.has_global_role('pasteur'));

-- prayer_requests : auteur, intercesseur assigné, mur public, serviteur, pasteur
create policy prayer_read on chapelle.prayer_requests for select using (
  member_id = chapelle.current_member_id()
  or assigne_a = chapelle.current_member_id()
  or (est_public = true and est_anonyme = false)
  or (platform_id is not null and chapelle.has_platform_role(platform_id, 'serviteur'))
  or chapelle.has_global_role('pasteur')
);
create policy prayer_insert on chapelle.prayer_requests for insert to anon, authenticated
  with check (true); -- capture publique (mur de prière / formulaire)
create policy prayer_update on chapelle.prayer_requests for update using (
  member_id = chapelle.current_member_id()
  or assigne_a = chapelle.current_member_id()
  or (platform_id is not null and chapelle.has_platform_role(platform_id, 'serviteur'))
  or chapelle.has_global_role('pasteur')
);

-- form_submissions : insertion publique ; lecture responsable plateforme / pasteur
create policy forms_insert on chapelle.form_submissions for insert to anon, authenticated
  with check (true);
create policy forms_read on chapelle.form_submissions for select using (
  chapelle.has_global_role('pasteur')
  or (platform_id is not null and chapelle.has_platform_role(platform_id, 'responsable_plateforme'))
);
create policy forms_update on chapelle.form_submissions for update using (
  chapelle.has_global_role('pasteur')
  or (platform_id is not null and chapelle.has_platform_role(platform_id, 'responsable_plateforme'))
);

-- notifications : destinataire uniquement (insertion via service role)
create policy notif_read on chapelle.notifications for select
  using (member_id = chapelle.current_member_id() or chapelle.has_global_role('admin'));
create policy notif_update on chapelle.notifications for update
  using (member_id = chapelle.current_member_id());

-- analytics_events : insertion publique (tracking) ; lecture responsable/admin
create policy analytics_insert on chapelle.analytics_events for insert to anon, authenticated
  with check (true);
create policy analytics_read on chapelle.analytics_events for select using (
  chapelle.has_global_role('pasteur')
  or (platform_id is not null and chapelle.has_platform_role(platform_id, 'responsable_plateforme'))
);

-- integration_journeys : membre concerné, serviteur de la plateforme, pasteur
create policy journeys_read on chapelle.integration_journeys for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(platform_id, 'serviteur')
  or chapelle.has_global_role('pasteur')
);
create policy journeys_write on chapelle.integration_journeys for all
  using (chapelle.has_platform_role(platform_id, 'serviteur') or chapelle.has_global_role('pasteur'))
  with check (chapelle.has_platform_role(platform_id, 'serviteur') or chapelle.has_global_role('pasteur'));

-- =====================  MODULE CIER  =========================================
create policy cier_cultes_read on chapelle.cier_cultes for select using (
  exists (select 1 from chapelle.events e where e.id = event_id and e.statut = 'publie')
  or chapelle.has_platform_role(chapelle.platform_id('cier'), 'serviteur'));
create policy cier_cultes_write on chapelle.cier_cultes for all
  using (chapelle.has_platform_role(chapelle.platform_id('cier'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('cier'), 'responsable_plateforme'));

create policy cier_presence_read on chapelle.cier_presences_culte for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('cier'), 'serviteur'));
create policy cier_presence_write on chapelle.cier_presences_culte for all
  using (chapelle.has_platform_role(chapelle.platform_id('cier'), 'serviteur'))
  with check (chapelle.has_platform_role(chapelle.platform_id('cier'), 'serviteur'));

create policy cier_vision_read on chapelle.cier_vision_axes for select
  using (est_public = true or chapelle.has_global_role('pasteur'));
create policy cier_vision_write on chapelle.cier_vision_axes for all
  using (chapelle.has_global_role('pasteur')) with check (chapelle.has_global_role('pasteur'));

create policy cier_annuaire_read on chapelle.cier_annuaire_plateformes for select using (true);
create policy cier_annuaire_write on chapelle.cier_annuaire_plateformes for all
  using (chapelle.has_platform_role(chapelle.platform_id('cier'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('cier'), 'responsable_plateforme'));

create policy cier_promesses_read on chapelle.cier_promesses_dons for select using (
  member_id = chapelle.current_member_id() or chapelle.has_global_role('pasteur'));
create policy cier_promesses_write on chapelle.cier_promesses_dons for all
  using (member_id = chapelle.current_member_id() or chapelle.has_global_role('pasteur'))
  with check (member_id = chapelle.current_member_id() or chapelle.has_global_role('pasteur'));

create policy cier_audit_read on chapelle.cier_admin_audit for select
  using (chapelle.has_global_role('pasteur'));

-- =====================  MODULE CHAPELLE FAMILIALE  ===========================
create policy fam_foyers_read on chapelle.familiale_foyers for select using (
  chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur')
  or exists (select 1 from chapelle.familiale_foyer_membres fm
             where fm.foyer_id = familiale_foyers.id and fm.member_id = chapelle.current_member_id()));
create policy fam_foyers_write on chapelle.familiale_foyers for all
  using (chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur'))
  with check (chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur'));

create policy fam_fm_read on chapelle.familiale_foyer_membres for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur'));
create policy fam_fm_write on chapelle.familiale_foyer_membres for all
  using (chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur'))
  with check (chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur'));

create policy fam_sessions_read on chapelle.familiale_sessions for select using (
  chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'membre'));
create policy fam_sessions_write on chapelle.familiale_sessions for all
  using (chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'responsable_plateforme'));

create policy fam_si_read on chapelle.familiale_session_inscriptions for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur'));
create policy fam_si_write on chapelle.familiale_session_inscriptions for all
  using (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur'))
  with check (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur'));

create policy fam_prog_read on chapelle.familiale_parcours_progression for select using (
  chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur')
  or exists (select 1 from chapelle.familiale_foyer_membres fm
             where fm.foyer_id = familiale_parcours_progression.foyer_id and fm.member_id = chapelle.current_member_id()));
create policy fam_prog_write on chapelle.familiale_parcours_progression for all
  using (chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur'))
  with check (chapelle.has_platform_role(chapelle.platform_id('chapelle-familiale'), 'serviteur'));

-- =====================  MODULE JEUNESSE  =====================================
create policy jeu_profils_read on chapelle.jeunesse_profils for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'serviteur'));
create policy jeu_profils_write on chapelle.jeunesse_profils for all
  using (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'responsable_plateforme'))
  with check (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'responsable_plateforme'));

create policy jeu_leaders_read on chapelle.jeunesse_leaders for select
  using (chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'serviteur'));
create policy jeu_leaders_write on chapelle.jeunesse_leaders for all
  using (chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'responsable_plateforme'));

create policy jeu_projets_read on chapelle.jeunesse_projets for select using (
  porteur_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'serviteur'));
create policy jeu_projets_write on chapelle.jeunesse_projets for all
  using (porteur_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'responsable_plateforme'))
  with check (porteur_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'responsable_plateforme'));

create policy jeu_conf_read on chapelle.jeunesse_conferences for select using (
  exists (select 1 from chapelle.events e where e.id = event_id and e.statut = 'publie')
  or chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'serviteur'));
create policy jeu_conf_write on chapelle.jeunesse_conferences for all
  using (chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'responsable_plateforme'));

create policy jeu_insc_insert on chapelle.jeunesse_inscriptions for insert to anon, authenticated
  with check (true);
create policy jeu_insc_read on chapelle.jeunesse_inscriptions for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'serviteur'));
create policy jeu_insc_update on chapelle.jeunesse_inscriptions for update
  using (chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'serviteur'));

create policy jeu_modules_read on chapelle.jeunesse_parcours_modules for select to authenticated using (true);
create policy jeu_modules_write on chapelle.jeunesse_parcours_modules for all
  using (chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'responsable_plateforme'));

create policy jeu_certif_read on chapelle.jeunesse_certifications for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'serviteur'));
create policy jeu_certif_write on chapelle.jeunesse_certifications for all
  using (chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'serviteur'))
  with check (chapelle.has_platform_role(chapelle.platform_id('jeunesse'), 'serviteur'));

-- =====================  MODULE CITÉ DU REFUGE (confidentialité maximale)  =====
-- Accès limité aux personnes affectées + pasteur/admin. (Vue méta dédiée pour les responsables.)
create policy refuge_cases_read on chapelle.cite_refuge_cases for select using (
  member_id = chapelle.current_member_id()
  or chapelle.refuge_is_assigned(id)
  or chapelle.has_global_role('pasteur'));
create policy refuge_cases_write on chapelle.cite_refuge_cases for all
  using (chapelle.refuge_is_assigned(id) or chapelle.has_global_role('pasteur'))
  with check (chapelle.refuge_is_assigned(id) or chapelle.has_global_role('pasteur'));

create policy refuge_acc_read on chapelle.cite_refuge_accompagnants for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('cite-refuge'), 'responsable_plateforme'));
create policy refuge_acc_write on chapelle.cite_refuge_accompagnants for all
  using (chapelle.has_platform_role(chapelle.platform_id('cite-refuge'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('cite-refuge'), 'responsable_plateforme'));

create policy refuge_assign_read on chapelle.cite_refuge_assignments for select using (
  chapelle.refuge_is_assigned(case_id) or chapelle.has_global_role('pasteur'));
create policy refuge_assign_write on chapelle.cite_refuge_assignments for all
  using (chapelle.has_platform_role(chapelle.platform_id('cite-refuge'), 'responsable_plateforme') or chapelle.has_global_role('pasteur'))
  with check (chapelle.has_platform_role(chapelle.platform_id('cite-refuge'), 'responsable_plateforme') or chapelle.has_global_role('pasteur'));

create policy refuge_sess_read on chapelle.cite_refuge_sessions for select using (
  chapelle.refuge_is_assigned(case_id) or chapelle.has_global_role('pasteur'));
create policy refuge_sess_write on chapelle.cite_refuge_sessions for all
  using (chapelle.refuge_is_assigned(case_id) or chapelle.has_global_role('pasteur'))
  with check (chapelle.refuge_is_assigned(case_id) or chapelle.has_global_role('pasteur'));

create policy refuge_mil_read on chapelle.cite_refuge_milestones for select using (
  chapelle.refuge_is_assigned(case_id) or chapelle.has_global_role('pasteur'));
create policy refuge_mil_write on chapelle.cite_refuge_milestones for all
  using (chapelle.refuge_is_assigned(case_id) or chapelle.has_global_role('pasteur'))
  with check (chapelle.refuge_is_assigned(case_id) or chapelle.has_global_role('pasteur'));

create policy refuge_orient_read on chapelle.cite_refuge_orientations for select using (
  chapelle.refuge_is_assigned(case_id) or chapelle.has_global_role('pasteur'));
create policy refuge_orient_write on chapelle.cite_refuge_orientations for all
  using (chapelle.refuge_is_assigned(case_id) or chapelle.has_global_role('pasteur'))
  with check (chapelle.refuge_is_assigned(case_id) or chapelle.has_global_role('pasteur'));

-- =====================  MODULE CFIC  =========================================
create policy cfic_cursus_read on chapelle.cfic_cursus for select
  using (actif = true or chapelle.has_platform_role(chapelle.platform_id('cfic'), 'serviteur'));
create policy cfic_cursus_write on chapelle.cfic_cursus for all
  using (chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'));

create policy cfic_modules_read on chapelle.cfic_modules for select to authenticated using (true);
create policy cfic_modules_write on chapelle.cfic_modules for all
  using (chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'));

create policy cfic_lecons_read on chapelle.cfic_lecons for select to authenticated using (true);
create policy cfic_lecons_write on chapelle.cfic_lecons for all
  using (chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'));

create policy cfic_insc_read on chapelle.cfic_inscriptions for select using (
  member_id = chapelle.current_member_id()
  or formateur_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'));
create policy cfic_insc_write on chapelle.cfic_inscriptions for all
  using (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('cfic'), 'serviteur'))
  with check (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('cfic'), 'serviteur'));

create policy cfic_prog_read on chapelle.cfic_progressions for select using (
  exists (select 1 from chapelle.cfic_inscriptions i where i.id = inscription_id
          and (i.member_id = chapelle.current_member_id() or i.formateur_id = chapelle.current_member_id()))
  or chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'));
create policy cfic_prog_write on chapelle.cfic_progressions for all
  using (exists (select 1 from chapelle.cfic_inscriptions i where i.id = inscription_id
          and (i.member_id = chapelle.current_member_id() or i.formateur_id = chapelle.current_member_id()))
    or chapelle.has_platform_role(chapelle.platform_id('cfic'), 'serviteur'))
  with check (true);

create policy cfic_eval_read on chapelle.cfic_evaluations for select using (
  exists (select 1 from chapelle.cfic_inscriptions i where i.id = inscription_id
          and (i.member_id = chapelle.current_member_id() or i.formateur_id = chapelle.current_member_id()))
  or chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'));
create policy cfic_eval_write on chapelle.cfic_evaluations for all
  using (chapelle.has_platform_role(chapelle.platform_id('cfic'), 'serviteur'))
  with check (chapelle.has_platform_role(chapelle.platform_id('cfic'), 'serviteur'));

create policy cfic_certif_read on chapelle.cfic_certifications for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('cfic'), 'serviteur'));
create policy cfic_certif_write on chapelle.cfic_certifications for all
  using (chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('cfic'), 'responsable_plateforme'));

-- =====================  MODULE FEMMES D'EXCEPTIONS  ==========================
create policy femmes_profils_read on chapelle.femmes_profils for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'serviteur'));
create policy femmes_profils_write on chapelle.femmes_profils for all
  using (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'responsable_plateforme'))
  with check (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'responsable_plateforme'));

create policy femmes_cercles_read on chapelle.femmes_cercles for select
  using (chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'membre'));
create policy femmes_cercles_write on chapelle.femmes_cercles for all
  using (chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'leader_cellule'))
  with check (chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'leader_cellule'));

create policy femmes_cm_read on chapelle.femmes_cercle_membres for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'leader_cellule'));
create policy femmes_cm_write on chapelle.femmes_cercle_membres for all
  using (chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'leader_cellule'))
  with check (chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'leader_cellule'));

create policy femmes_evtmeta_read on chapelle.femmes_evenement_meta for select using (
  exists (select 1 from chapelle.events e where e.id = event_id and e.statut = 'publie')
  or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'serviteur'));
create policy femmes_evtmeta_write on chapelle.femmes_evenement_meta for all
  using (chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'responsable_plateforme'));

create policy femmes_insc_insert on chapelle.femmes_inscriptions for insert to anon, authenticated with check (true);
create policy femmes_insc_read on chapelle.femmes_inscriptions for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'serviteur'));
create policy femmes_insc_update on chapelle.femmes_inscriptions for update
  using (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'serviteur'));

create policy femmes_mentorat_read on chapelle.femmes_mentorat for select using (
  mentore_id = chapelle.current_member_id() or mentoree_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'responsable_plateforme'));
create policy femmes_mentorat_write on chapelle.femmes_mentorat for all
  using (chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'responsable_plateforme'));

create policy femmes_temoign_read on chapelle.femmes_temoignages for select using (
  member_id = chapelle.current_member_id()
  or (est_public = true and statut_moderation = 'approuve')
  or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'serviteur'));
create policy femmes_temoign_write on chapelle.femmes_temoignages for all
  using (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'serviteur'))
  with check (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('femmes-exceptions'), 'serviteur'));

-- =====================  MODULE FAMILLES DE LA CHAPELLE (cellules)  ===========
create policy cel_cellules_read on chapelle.cellules_cellules for select using (
  statut in ('active','multiplication')
  or chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'serviteur'));
create policy cel_cellules_write on chapelle.cellules_cellules for all
  using (leader_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'responsable_plateforme'))
  with check (leader_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'responsable_plateforme'));

create policy cel_mc_read on chapelle.cellules_membres_cellule for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'leader_cellule'));
create policy cel_mc_write on chapelle.cellules_membres_cellule for all
  using (chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'leader_cellule'))
  with check (chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'leader_cellule'));

create policy cel_reunions_read on chapelle.cellules_reunions for select
  using (chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'serviteur'));
create policy cel_reunions_write on chapelle.cellules_reunions for all
  using (chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'leader_cellule'))
  with check (chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'leader_cellule'));

create policy cel_pres_read on chapelle.cellules_presences for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'leader_cellule'));
create policy cel_pres_write on chapelle.cellules_presences for all
  using (chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'leader_cellule'))
  with check (chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'leader_cellule'));

create policy cel_fl_read on chapelle.cellules_formations_leader for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'serviteur'));
create policy cel_fl_write on chapelle.cellules_formations_leader for all
  using (chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'responsable_plateforme'))
  with check (chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'responsable_plateforme'));

create policy cel_aff_insert on chapelle.cellules_affectations for insert to anon, authenticated with check (true);
create policy cel_aff_read on chapelle.cellules_affectations for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'leader_cellule'));
create policy cel_aff_write on chapelle.cellules_affectations for update
  using (chapelle.has_platform_role(chapelle.platform_id('familles-chapelle'), 'leader_cellule'));

-- =====================  MODULE MAHANAÏM  =====================================
create policy mah_int_read on chapelle.mahanaim_intercessors for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'));
create policy mah_int_write on chapelle.mahanaim_intercessors for all
  using (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'responsable_plateforme'))
  with check (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'responsable_plateforme'));

create policy mah_retreats_read on chapelle.mahanaim_retreats for select using (
  exists (select 1 from chapelle.events e where e.id = event_id and e.statut = 'publie')
  or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'serviteur'));
create policy mah_retreats_write on chapelle.mahanaim_retreats for all
  using (chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'))
  with check (chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'));

create policy mah_slots_read on chapelle.mahanaim_watch_slots for select
  using (chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'membre'));
create policy mah_slots_write on chapelle.mahanaim_watch_slots for all
  using (chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'))
  with check (chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'));

create policy mah_assign_read on chapelle.mahanaim_watch_assignments for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'));
create policy mah_assign_write on chapelle.mahanaim_watch_assignments for all
  using (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'))
  with check (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'));

create policy mah_pa_read on chapelle.mahanaim_prayer_assignments for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'));
create policy mah_pa_write on chapelle.mahanaim_prayer_assignments for all
  using (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'))
  with check (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'));

create policy mah_log_read on chapelle.mahanaim_prayer_log for select using (
  member_id = chapelle.current_member_id()
  or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'));
create policy mah_log_insert on chapelle.mahanaim_prayer_log for insert to authenticated
  with check (member_id = chapelle.current_member_id()
    or chapelle.has_platform_role(chapelle.platform_id('mahanaim'), 'leader_cellule'));
