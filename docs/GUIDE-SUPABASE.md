# Guide de configuration Supabase — Citadelle du Royaume

Objectif : préparer la base de données, le stockage et l'authentification.

---

## 1. Créer le projet
1. Aller sur https://supabase.com → **New project**.
2. Choisir un nom, un mot de passe de base de données (à conserver), une région
   proche de vos utilisateurs (ex. *Europe (Paris)*).
3. Attendre la fin du provisionnement (~2 min).

## 2. Récupérer les clés (Settings → API)
| Donnée Supabase | Variable d'environnement |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Project API keys → `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Project API keys → `service_role` (secret) | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ La clé `service_role` est **secrète** : jamais côté navigateur, jamais en `NEXT_PUBLIC_*`.

## 3. Appliquer les migrations (24 fichiers)

**Option A — CLI (recommandé)** depuis le dossier du projet en local :
```bash
npm i -g supabase            # si nécessaire
supabase link --project-ref VOTRE_REF
supabase db push
```

**Option B — SQL Editor** : ouvrir chaque fichier de `supabase/migrations/`
**dans l'ordre chronologique** (nom croissant) et l'exécuter (*Run*).

Ces migrations créent :
- le schéma applicatif `public` (profils, formations, dons, prières, événements…) ;
- le schéma avancé `chapelle` (modules CIER, CFIC, cellules, jeunesse, femmes, refuge, mahanaïm…) ;
- les tables CMS `cms_*` et dons `giving_*` ;
- la table `cms_articles` ;
- les **buckets Storage** `media` (500 Mo) et `avatars` (10 Mo) ;
- les **rôles** `formateur` et `responsable_integration` ;
- le **trigger d'inscription** (`on_auth_user_created`) qui crée le profil.

## 4. Vérifier le stockage (Storage)
Dans **Storage**, confirmer la présence des buckets `media` et `avatars`
(publics). Sinon, relancer la migration `20260530100300_storage_and_articles.sql`.

## 5. Configurer l'authentification (Authentication → Providers)
- **Email** : activé. Choisir *Confirm email* (recommandé) ou non.
- **Google** (optionnel) : renseigner Client ID / Secret obtenus sur Google Cloud
  Console, et l'URL de redirection autorisée :
  `https://VOTRE-DOMAINE/auth/callback`.
- **Facebook** (optionnel) : idem depuis Meta for Developers.

Dans **Authentication → URL Configuration** :
- *Site URL* : `https://VOTRE-DOMAINE`
- *Redirect URLs* : ajouter `https://VOTRE-DOMAINE/auth/callback`.

## 6. (Optionnel) Personnaliser les emails
**Authentication → Email Templates** : adapter les messages de confirmation et de
réinitialisation de mot de passe au nom de la Citadelle.

## 7. Test rapide
- Créer un utilisateur (via `/register` une fois le site en ligne, ou *Users → Add user*).
- Vérifier qu'une ligne apparaît automatiquement dans **Table Editor → `profiles`**.

✅ Supabase est prêt. Passez au **guide du premier administrateur**.
