-- =============================================================================
-- P0 MIGRATION-HEALTH — Référentiel pastoral `newcomer_journey_steps`
-- =============================================================================
-- RECONSTRUCTION de la DDL V2.7-A. Cette table EXISTE en production (modèle
-- pastoral « Parcours Nouveau Venu », cf. src/lib/pastoral/newcomer-journey-model.ts
-- en-tête) mais sa migration V2.7-A n'a JAMAIS été committée dans supabase/migrations/.
-- Résultat : le Lot5 (20260716180000) qui IMPORTE ce référentiel échoue à un rebuild
-- à neuf (garde `RAISE EXCEPTION 'newcomer_journey_steps is missing'`).
--
-- Ce fichier rend le dépôt AUTO-SUFFISANT (rebuildable localement) SANS toucher Lot5.
-- 100 % ADDITIF + IDEMPOTENT : `create table if not exists` + `on conflict do nothing`
-- → NO-OP en production (la table + ses données y existent déjà). Aucune divergence
-- de comportement : Lot5 lit exactement step_key / label / sort_order.
--
-- COLONNES : ensemble strictement consommé (vérifié) = {step_key, label, sort_order}
--   - Lot5 gardes + import : 20260716180000:45-82,621-629
--   - GET /api/admin/newcomer-intakes/route.ts:88-89 (select step_key,label,sort_order)
--   - buildStepCatalog : newcomer-journey-model.ts:143-145
-- Pas d'`organization_id` (route.ts:83 : « pas d'organization_id inventé sur journey_steps »).
-- `sort_order NOT NULL UNIQUE` matérialise l'invariant contrôlé par Lot5 (pas de doublon).
--
-- SEED = référentiel applicatif canonique STEP_LABELS_FR (newcomer-journey-model.ts:107-116),
-- source de vérité des mutations (JOURNEY_STEP_KEYS). Le seed reste DANS CE FICHIER et
-- JAMAIS dans Lot5 (le test lot5-migration-security.test.ts:153 exige que Lot5 ne
-- contienne pas ces libellés — import « copie exacte », aucune clé inventée).
--
-- NB parité prod : reconstruction fonctionnellement suffisante (3 colonnes réellement
-- lues). La DDL prod exacte peut porter des colonnes en plus (id/created_at…) sans effet
-- fonctionnel (aucun code ne les référence). À aligner sur un dump prod si un jour requis.
-- =============================================================================

create table if not exists public.newcomer_journey_steps (
  step_key   text    primary key,
  label      text    not null,
  sort_order integer not null unique
);

insert into public.newcomer_journey_steps (step_key, label, sort_order) values
  ('received',            'Fiche reçue',                1),
  ('needs_contact',       'À contacter',                2),
  ('first_contact_done',  'Premier contact effectué',   3),
  ('pastoral_orientation','Orientation pastorale',      4),
  ('integration_invited', 'Invitation intégration',     5),
  ('integration_started', 'Intégration commencée',      6),
  ('discipleship_followup','Suivi discipulat',          7),
  ('completed',           'Parcours terminé',           8)
on conflict (step_key) do nothing;
