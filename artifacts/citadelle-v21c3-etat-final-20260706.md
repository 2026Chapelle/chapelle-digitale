# CITADELLE — Archive état final V2.1C.3

Date : 2026-07-06
Branche : stabilisation-p0-recette-citadelle
Commit courant : 6c208dd feat(citadelle): prepare pastoral CRM migration
Commit UI V2.1B : 10e2354 feat(citadelle): add newcomer pastoral CRM mock UI

## Résumé

V2.1C.3 a été appliquée en SQL isolé via Supabase Dashboard, hors pipeline Supabase CLI.
Objectif atteint : fondations base de données du CRM pastoral nouveaux venus.
/nouveau-venu n'est pas encore connecté à Supabase.

## Supabase

Projet : Chapelle du Royaume
Project ref : nvyuyffywnuollaxguen
Région : West EU (Paris)
Post-check Dashboard : V21C3_SQL_APPLIED_OK

## Objets validés

Tables créées :
- public.profile_tags
- public.newcomer_pipeline

Colonnes ajoutées :
- public.pastoral_notes.is_private
- public.pastoral_notes.updated_at
- public.pastoral_alerts.due_at
- public.pastoral_alerts.next_action

Fonction : public.tg_citadelle_v21c3_touch_updated_at()
Triggers : trg_newcomer_pipeline_updated_at, trg_pastoral_notes_updated_at
RLS : activé + force RLS sur profile_tags et newcomer_pipeline

## Non fait

NO_SUPABASE_DB_PUSH
NO_CLI_MIGRATION_EXECUTED
NO_DEPLOYMENT
NO_PASSENGER_RESTART
NO_V21D_STARTED
NO_CONNECTION_NOUVEAU_VENU_SUPABASE

## Attention

L'historique Supabase CLI reste désaligné.
Ne pas lancer : supabase db push, supabase migration up, supabase db reset.

## Prochaine étape possible

V2.1D : connecter /nouveau-venu au backend sécurisé via route serveur/service role.
