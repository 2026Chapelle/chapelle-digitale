# Rapport de déploiement — Communauté V1 + Présences

## Artefact
- **ZIP** : `deploy-citadelle.zip` (~25.8 Mo, 3007 entrées, slashs Linux).
- **BUILD_ID** : `ncEPD470VOvBrrEmiOoV8`.
- Build : `✓ Compiled successfully`. Type-check vert. Tests **249/249** verts.

## Compatibilité PlanetHoster / N0C (Passenger)
- `next.config` : `output: 'standalone'` → build portable auto-suffisant (server.js + node_modules minimal tracé).
- Images `unoptimized: true` → aucun binaire natif `sharp` (portable Windows → Linux).
- Point d'entrée Passenger : `app.js` (présent dans `deploy-citadelle/`).
- ZIP en slashs `/` (évite le bug Compress-Archive PowerShell 5.1).
- Node : N0C compatible (runtime `nodejs` sur les routes API).

## Migrations Supabase à exécuter (SQL Editor) — OBLIGATOIRE avant usage
1. `apply-communaute-v1-sql-editor.sql` — **déjà appliquée** (Lot 1, vérifiée 33/33 ✅).
2. `apply-presences-v1-sql-editor.sql` — **À EXÉCUTER** (Chantier 4 : group_reunions + group_attendance + RLS).
   Additive, idempotente, sans perte. Attendu : `Success. No rows returned`.

## Procédure de déploiement
1. Exécuter `apply-presences-v1-sql-editor.sql` dans Supabase → SQL Editor → Run.
2. Téléverser `deploy-citadelle.zip` sur N0C dans le dossier de l'app (`/home/<user>/citadelle`).
3. Extraire (écraser l'app existante en conservant `.env`/variables).
4. Vérifier la présence de `app.js`, `server.js`, `.next/`, `public/`, `node_modules/`.
5. Redémarrer l'application Passenger (restart).

## Variables d'environnement requises
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SESSION_TOKEN` (back-office ; sans lui, l'admin est refusé en prod — comportement voulu)
- Optionnel : `RESEND_API_KEY` / `NEWSLETTER_FROM` (emails), variables Chariow.

## Checklist de validation post-déploiement
- [ ] `apply-presences-v1-sql-editor.sql` exécutée (tables `group_reunions`, `group_attendance` présentes).
- [ ] App redémarrée ; page d'accueil OK.
- [ ] `/groupes` (annuaire public) : groupes actifs affichés, aucune liste de membres.
- [ ] `/admin/groupes` : créer un groupe (plateforme obligatoire), approuver une demande → appartenance créée.
- [ ] `/member/dashboard/groupes` : rejoindre, définir principal (badge), quitter.
- [ ] `/member/dashboard/reunions` + `/admin/reunions` : créer une réunion, saisir des présences, voir les stats.
- [ ] Fiche 360° d'un membre : section Communauté lit les vraies appartenances.
- [ ] Vérifier le scoping : un responsable national ne voit que son périmètre ; un leader que ses groupes.

## Routes ajoutées (build vérifié)
`/api/groupes` · `/api/admin/groupes` · `/api/member/groupes` · `/api/admin/reunions` · `/api/member/reunions` · pages `/groupes`, `/admin/groupes`, `/admin/reunions`, `/member/dashboard/groupes`, `/member/dashboard/reunions`.
