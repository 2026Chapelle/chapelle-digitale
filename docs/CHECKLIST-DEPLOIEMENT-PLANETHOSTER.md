# ✅ Checklist finale de déploiement — PlanetHoster

À cocher dans l'ordre. Aucune étape ne nécessite de modifier le code.

## A. Supabase (base de données)
- [ ] Projet Supabase créé ; région choisie.
- [ ] Clés récupérées : `URL`, `anon`, `service_role`.
- [ ] Migrations appliquées (`supabase db push` **ou** SQL Editor, 24 fichiers).
- [ ] Buckets `media` et `avatars` présents dans **Storage**.
- [ ] **Authentication** : Email activé ; (option) Google/Facebook.
- [ ] **URL Configuration** : Site URL + Redirect `…/auth/callback` renseignés.

## B. Variables d'environnement (PlanetHoster → app Node)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ADMIN_ACCESS_CODE`
- [ ] `ADMIN_SESSION_TOKEN`
- [ ] `NEXT_PUBLIC_APP_URL=https://VOTRE-DOMAINE`
- [ ] `NODE_ENV=production`

## C. Application Node (N0C / Passenger)
- [ ] App Node créée : dossier `/home/<user>/citadelle`, démarrage `app.js`, Node 18/20.
- [ ] `deploy-citadelle.zip` décompressé ; **son contenu** téléversé dans le dossier.
- [ ] Racine contient : `app.js`, `server.js`, `package.json`, `.next/`, `public/`, `node_modules/`.
- [ ] Application **redémarrée** (Restart).

## D. Premier administrateur
- [ ] Compte créé (`/register` ou Supabase Users).
- [ ] `profiles.role` passé à `admin` pour ce compte.
- [ ] Connexion réussie sur `/admin/login` avec `ADMIN_ACCESS_CODE`.

## E. Chariow (paiements)
- [ ] Boutique Chariow prête ; Product IDs / liens connus.
- [ ] Produits créés dans `/admin/dons` (titre public, type, lien/Product ID, page).
- [ ] Boutons de don visibles et fonctionnels sur les pages publiques.

## F. Tests de recette (QA)
- [ ] Page d'accueil OK.
- [ ] Inscription → email reçu / utilisateur créé dans Supabase.
- [ ] Connexion + déconnexion.
- [ ] Mot de passe oublié (`/forgot-password`).
- [ ] Profil membre : modification + **upload photo** + changement mot de passe.
- [ ] Back-office : création **page**, **article**, **upload média**.
- [ ] Article publié visible sur `/articles`.
- [ ] Témoignage / demande de prière.
- [ ] Bouton de don Chariow (parcours complet).
- [ ] Rôles : un `formateur` voit l'Espace Formateur ; un `responsable_integration` voit l'Espace Intégration.

## G. Finitions (optionnel)
- [ ] Emails Auth personnalisés (Supabase).
- [ ] OAuth Google/Facebook testés.
- [ ] Nom de domaine + HTTPS actifs.

> Quand A→F sont cochés, **la plateforme est en production**.
