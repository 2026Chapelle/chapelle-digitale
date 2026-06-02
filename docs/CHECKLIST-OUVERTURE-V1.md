# ✅ Checklist d'ouverture V1 — Citadelle (premiers membres réels)

## A. Infrastructure (1 fois)
- [ ] Projet Supabase créé ; clés `URL` / `anon` (`sb_publishable_…`) / `service_role` (`sb_secret_…`).
- [ ] `supabase db push` — applique TOUTES les migrations, dont :
      `100500, 100600, 100700, 100800, 20260531100000, 20260531100200, 20260531100300`.
- [ ] Buckets Storage présents : `media`, `avatars`.
- [ ] Auth : Email activé ; Site URL + Redirect `…/auth/callback` configurés.

## B. Déploiement PlanetHoster
- [ ] Décompresser `deploy-citadelle.zip`, téléverser le **contenu** dans `/home/<user>/citadelle`.
- [ ] Créer le fichier **`.env`** (modèle `.env.exemple-production`) avec les 7 variables.
- [ ] App Node : démarrage `app.js`, Node 18/20. **Restart**.
- [ ] Vérifier `/api/admin/health` → ✅ service role opérationnelle, mode démo OFF.

## C. Premier administrateur
- [ ] Compte créé (`/register` ou Supabase Users).
- [ ] `profiles.role = 'admin'` (Table Editor).
- [ ] Connexion `/admin/login` avec `ADMIN_ACCESS_CODE`.

## D. Contenu de départ (via back-office, zéro SQL)
- [ ] 1 page d'accueil / quelques pages publiées.
- [ ] 2–3 **articles** publiés.
- [ ] 1 **formation** + ses **modules** (YouTube non répertorié + PDF) + 1 **parcours**.
- [ ] 1–2 **événements** publiés.
- [ ] 1 **live/replay** (cms_lives) si disponible.
- [ ] **Dons Chariow** : Product IDs / liens renseignés dans `/admin/dons`.
- [ ] Catégories de prière vérifiées (seedées) ; rôles `intercesseur`/`responsable_mahanaim` attribués si besoin.

## E. Tests des parcours réels (QA)
- [ ] Inscription → email/compte créé → profil rempli + **photo**.
- [ ] Connexion / déconnexion (redirection immédiate).
- [ ] **Formation** : découvrir → s'inscrire → suivre un module → progression % → certificat à 100 %.
- [ ] **Prière** : déposer une demande → admin voit + priorité + **assigne un intercesseur** → témoignage → validation → mur public.
- [ ] **Événement** : s'inscrire / rappel → visible dans `/admin/inscriptions`.
- [ ] **Groupe** : demande d'adhésion → admin accepte/refuse.
- [ ] **Contact / Newsletter** : message + abonnement → visibles en admin.
- [ ] **Don** : bouton Chariow s'ouvre.
- [ ] **Parcours de croissance** : étape réelle + prochaine étape affichées.

## F. Sécurité
- [ ] `service_role` jamais exposée côté client (vérifié au build : absente du bundle).
- [ ] `ADMIN_ACCESS_CODE` / `ADMIN_SESSION_TOKEN` forts et confidentiels.
- [ ] RLS active sur toutes les tables (lecture publique limitée aux contenus publiés).
- [ ] HTTPS actif sur le domaine.

## G. Go / No-Go
- [ ] Aucune donnée fictive visible (états vides propres si vide).
- [ ] Build `exit 0` ; `/api/admin/health` vert.
- [ ] Au moins : 1 parcours, 1 formation, 1 événement, dons configurés.
→ **Si A→G cochés : ouverture aux premiers membres.**

## Post-V1 (après ouverture)
- UX back-office : aperçu mobile/desktop, publication programmée, historique des versions.
- Notifications (prière/événements), dashboards de pilotage avancés, accompagnement pastoral, multi-antennes/i18n UI.
