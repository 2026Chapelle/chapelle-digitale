# Déploiement de la base `academy` — Académie des Élus

Guide pour pousser la migration `supabase/migrations/20260603400000_academy.sql`
(12 tables `academy_*`, RPC sécurisés, RLS durcie, seed des 6 niveaux + Module 1/2).

> Tant que la migration n'est pas poussée, l'Académie fonctionne en **localStorage**
> (Module 1 jouable, progression locale). Après `db:push`, la progression devient
> **multi-appareil** et les certificats/diplômes sont **émis et vérifiés en base**.

---

## 1. Prérequis
- Projet Supabase relié (`supabase link --project-ref <ref>`), CLI installé.
- Les variables d'environnement déjà utilisées par Citadelle :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (indispensable : l'émission des certificats/diplômes
    et l'admin passent par le service role ; l'étudiant ne peut pas s'auto-valider).
- Auth Supabase activée (les tables référencent `auth.users(id)` via `auth.uid()`).
- **Sauvegarde recommandée** avant toute migration : `supabase db dump -f backup_avant_academy.sql`.

## 2. Pousser la migration
```bash
# Depuis la racine du projet
npm run db:push          # = supabase db push
# (ou)  supabase db push
```
La migration est **idempotente** (`create table if not exists`, `do $$ … $$`,
`on conflict`) : la rejouer est sans danger. Elle **ne touche pas** aux schémas
existants (`public.profiles`, `chapelle.*`).

## 3. Vérifications post-migration
```sql
-- a) Les 12 tables existent
select table_name from information_schema.tables
where table_schema='public' and table_name like 'academy_%' order by 1;

-- b) RLS activée partout
select relname, relrowsecurity from pg_class
where relname like 'academy_%' and relkind='r';   -- relrowsecurity doit être true

-- c) Seed : 6 niveaux + Module 1 publié + Module 2 verrouillé + badge
select ordre, titre, status from public.academy_levels order by ordre;          -- 6 lignes
select ordre, slug, status, unlock_mode from public.academy_modules
  where level_id = (select id from public.academy_levels where ordre=1) order by ordre;  -- M1 published/open, M2 planned/sequential
select slug from public.academy_badges;                                          -- ne-du-royaume

-- d) RPC présents (sécurité)
select proname from pg_proc where proname like 'academy_%' order by 1;
-- attendu : academy_complete_module, academy_next_numero, academy_submit_quiz,
--           academy_verify_credential, academy_set_updated_at

-- e) Vérification publique fonctionne sans exposer les tables (anon)
select public.academy_verify_credential('AER-2026-000001');   -- renvoie statut sans données perso
```
**Contrôles de sécurité** (doivent ÉCHOUER si tentés en tant qu'étudiant authentifié) :
- lire `academy_quizzes.questions` (réponses) → refusé / colonne masquée ;
- écrire `academy_progress.completed=true` directement → refusé (passe par RPC `academy_complete_module`) ;
- insérer un `academy_certificates`/`academy_enrollments.matricule` arbitraire → refusé (service role only).

## 4. Côté application
- Le `SUPABASE_SERVICE_ROLE_KEY` doit être présent au runtime (Passenger : dans le
  `.env` à côté de `app.js`, cf. `docs/GUIDE-DEPLOIEMENT-PLANETHOSTER.md`).
- Brancher ensuite les endpoints `/api/admin/academie/*` + faire pointer
  `useAcademyProgress` vers les RPC (le seam est déjà prévu : l'UI ne change pas).

## 5. Rollback
La migration ne supprime rien d'existant ; pour annuler **uniquement** l'Académie :
```sql
-- ⚠️ Détruit toutes les données academy_* (progression, certificats…). Sauvegarder avant.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public' and tablename like 'academy_%'
  loop execute format('drop table if exists public.%I cascade;', t); end loop;
end $$;

drop function if exists public.academy_complete_module cascade;
drop function if exists public.academy_submit_quiz cascade;
drop function if exists public.academy_verify_credential cascade;
drop function if exists public.academy_next_numero cascade;
drop function if exists public.academy_set_updated_at cascade;
drop sequence if exists public.academy_credential_seq;
drop type if exists public.academy_unlock_mode, public.academy_publish_status,
  public.academy_lesson_type, public.academy_progress_status, public.academy_diploma_mention;
```
Restauration depuis sauvegarde : `psql "$DATABASE_URL" -f backup_avant_academy.sql`.

## 6. Après le push — checklist de mise en service
- [ ] Tables + RLS + seed vérifiés (section 3).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` présent au runtime.
- [ ] Déposer le **quiz officiel** du Module 1 (questions + réponses) → `academy_quizzes`.
- [ ] Renseigner l'**URL vidéo YouTube** du Module 1 (admin module).
- [ ] Tester le parcours : Module 1 → validation (quiz) → badge → déblocage Module 2.
- [ ] Valider un niveau complet (20/20) → certificat AER vérifiable sur `/academie/verifier`.
