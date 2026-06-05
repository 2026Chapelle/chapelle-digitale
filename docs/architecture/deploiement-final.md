# Rapport de déploiement final — Citadelle (baseline validée)

## Artefact (ZIP de déploiement final — COMPLET, P1→P4 + Alertes live + Perf)
- **Nom** : `deploy-citadelle.zip`
- **Taille** : 25.9 Mo (**3026 fichiers**, slashs Linux)
- **BUILD_ID** : `pxUFv8kNVnB9Mqc7DhP_3`
- Contenu validé : Communauté V1 (Ch.3) · Réunions & Présences (Ch.4) · **P1**→**P4** · Centre d'Aide · **Alertes sonores live** · optimisations perf/stabilité · **Visioconférence V1.0.1 (lien + plateforme + Rejoindre)**.

## Vérifications finales
- `npm run type-check` → vert
- `npx vitest run` → **293/293** verts
- `npm run build` → `✓ Compiled successfully`

## Compatibilité PlanetHoster / N0C
- `output: 'standalone'` (portable, server.js + node_modules tracé) ; images `unoptimized` (pas de sharp) ; point d'entrée Passenger `app.js` ; ZIP slashs `/` ; routes API runtime `nodejs`.

## Migrations Supabase (SQL Editor) — état
1. `apply-communaute-v1-sql-editor.sql` — **appliquée** ✅ (Lot 1, 33/33).
2. `apply-presences-v1-sql-editor.sql` — **appliquée** ✅ (tables=2, trigger=1, policies=2).

## Procédure de déploiement
1. Téléverser `deploy-citadelle.zip` sur N0C dans le dossier de l'app, extraire (conserver les variables d'environnement).
2. Vérifier `app.js`, `server.js`, `.next/`, `public/`, `node_modules/`.
3. Redémarrer l'application Passenger.
4. **Planifier le cron** `/api/cron/notifications` (quotidien) avec `CRON_SECRET` → alimente alertes pastorales **et** score d'engagement (P1).

## Variables d'environnement requises
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_TOKEN`, `CRON_SECRET` ; optionnel `RESEND_API_KEY`/`NEWSLETTER_FROM`, Chariow.

## Checklist post-déploiement
- [ ] App redémarrée ; accueil OK.
- [ ] Cron planifié (alertes + score d'engagement quotidien).
- [ ] `/admin/aide` accessible (admin/super_admin) ; bulles `?` visibles sur les pages clés.
- [ ] `/admin/groupes` + `/member/dashboard/groupes` : créer/rejoindre/approuver/quitter, is_primary.
- [ ] `/admin/reunions` + `/member/dashboard/reunions` : réunion, présences, stats par groupe.
- [ ] Fiche 360° d'un membre : sections Communauté + (après cron) score réel.
- [ ] Scoping : responsable national borné à son périmètre ; leader à ses groupes.
