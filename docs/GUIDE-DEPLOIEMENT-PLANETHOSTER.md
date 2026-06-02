# Guide de déploiement — PlanetHoster (N0C / Passenger)

Déploiement de **Citadelle du Royaume** (Next.js 14, build standalone portable).
Aucune compilation côté serveur : on téléverse un bundle déjà construit.

---

## 0. Prérequis (une seule fois)

1. **Un projet Supabase** (https://supabase.com) — gratuit pour démarrer.
2. **Un compte PlanetHoster** avec un hébergement **N0C** (Node.js via Passenger).
3. Le fichier **`deploy-citadelle.zip`** (fourni à la racine du projet).

---

## 1. Configurer Supabase

### 1.1 Récupérer les clés
Dans le dashboard Supabase → **Project Settings → API** :
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

### 1.2 Appliquer la base de données
Deux options :

**Option A — CLI Supabase (recommandé)**
```bash
# Depuis le dossier du projet (en local) :
supabase link --project-ref VOTRE_REF
supabase db push
```
Cela applique toutes les migrations de `supabase/migrations/`, dont :
- le schéma complet (membres, formations, dons, prières, événements…) ;
- les tables CMS (`cms_*`) + giving (`giving_*`) ;
- les **buckets Storage** `media` et `avatars` ;
- la table `cms_articles` ;
- les **rôles** `formateur` et `responsable_integration`.

**Option B — Éditeur SQL Supabase**
Copier-coller le contenu de chaque fichier de `supabase/migrations/` **dans l'ordre
chronologique** (du plus ancien au plus récent), dans *SQL Editor → New query*, puis *Run*.

### 1.3 Activer les fournisseurs d'authentification
Dans **Authentication → Providers** :
- **Email** : activé (par défaut). Configurer *Confirm email* selon votre choix.
- **Google** (optionnel) : renseigner Client ID/Secret, et l'URL de redirection
  `https://VOTRE-DOMAINE/auth/callback`.
- **Facebook** (optionnel) : idem.

### 1.4 Créer le premier administrateur
1. Créer un compte via la page `/register` du site (une fois déployé), **ou**
   directement dans **Authentication → Users → Add user**.
2. Dans **Table Editor → profiles**, passer la colonne `role` de ce compte à
   `admin` (ou `super_admin`).

---

## 2. Configurer les variables d'environnement (PlanetHoster)

Dans le **World Panel N0C → votre application Node → Variables d'environnement**,
ajouter :

```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...        # secret — ne jamais exposer côté client
ADMIN_ACCESS_CODE=choisir-un-code-fort        # accès back-office /admin/login
ADMIN_SESSION_TOKEN=choisir-un-jeton-long     # jeton de session admin (cookie)
NEXT_PUBLIC_APP_URL=https://votre-domaine.org
```

> ⚠️ Sans `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`, le site reste en **mode démo**
> (contenus de secours, aucune écriture). Dès qu'elles sont présentes, tout
> bascule sur les données réelles.

---

## 3. Téléverser l'application

1. Dans le World Panel, créer (ou repérer) l'**application Node.js** :
   - **Dossier racine** : `/home/VOTRE_USER/citadelle`
   - **Fichier de démarrage** : `app.js`
   - **Version Node** : 18 ou 20.
2. **Décompresser `deploy-citadelle.zip`** et téléverser **son contenu** (pas le
   dossier parent) dans `/home/VOTRE_USER/citadelle` via SFTP ou le gestionnaire
   de fichiers. On doit retrouver à la racine :
   ```
   app.js   server.js   package.json   .next/   public/   node_modules/
   ```
3. Dans le World Panel → application Node → **Redémarrer** (Restart).

---

## 4. Vérifications post-déploiement

- `https://votre-domaine.org` → site public s'affiche.
- `https://votre-domaine.org/admin/login` → saisir `ADMIN_ACCESS_CODE` → accès back-office.
- `https://votre-domaine.org/register` → créer un compte → reçu dans Supabase → Users.
- Back-office → **Médias** → *Téléverser* une image → elle apparaît (bucket `media`).
- Back-office → **Articles** → créer/publier → visible sur `/articles`.

---

## 5. Mettre à jour le site plus tard

Le contenu (pages, articles, médias, dons, membres…) se gère **depuis le
back-office, sans redéploiement**.

Un redéploiement n'est nécessaire que pour une **évolution du code** :
```bash
npm run build                      # en local
# reconstruire deploy-citadelle (voir scripts/ ou la procédure du projet)
# re-zipper et re-téléverser le contenu dans /home/VOTRE_USER/citadelle
# Restart de l'application Node
```

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Page blanche / 500 | Variable d'env manquante | Vérifier les 7 variables, Restart |
| Site en « mode démo » | `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` absents | Les ajouter, Restart |
| Upload média échoue | `SUPABASE_SERVICE_ROLE_KEY` absent ou buckets non créés | Vérifier la clé + `supabase db push` |
| `/admin` redirige en boucle | `ADMIN_SESSION_TOKEN` différent entre env et cookie | Re-login `/admin/login` |
| Images externes cassées | domaine non autorisé | Ajouter le domaine dans `next.config.js` (remotePatterns) puis rebuild |
