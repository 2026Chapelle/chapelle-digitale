# Mise à jour — CMS complet & médiathèque avec upload réel

Cette mise à jour rend la Citadelle **pleinement administrable par l'équipe pastorale**,
sans toucher au code ni redéployer de ZIP pour modifier les contenus.

## Ce qui a été ajouté

### 1. Médiathèque avec upload réel de fichiers (Supabase Storage)
Avant, la médiathèque n'acceptait qu'une **URL externe**. Désormais, depuis
`/admin/medias`, l'équipe peut **téléverser directement** un fichier
(image, PDF, vidéo, audio) — bouton « Téléverser » / « Remplacer » dans la modale.
- Stockage dans le bucket public Supabase `media` (lecture publique, écriture
  service-role uniquement via `/api/admin/upload`).
- Suppression / remplacement gérés depuis l'interface.
- Limite : 500 Mo par fichier (permet les vidéos).
- Le même champ « fichier » est réutilisable partout (couverture d'article,
  vignette, etc.) et accepte **aussi** une URL externe collée.

### 2. Module Articles (blog éditorial)
Nouveau module `/admin/articles` : titre, slug, accroche, contenu, image de
couverture (upload), auteur, catégorie, tags, mise en avant, date de publication,
statut brouillon/publié. Stocké dans `public.cms_articles` (lecture publique des
articles publiés via RLS).

### 3. Profil membre réel (espace privé)
La page `/member/dashboard/profil` est désormais **branchée sur Supabase** :
- Chargement des vraies données du profil (`/api/member/profile`).
- Édition + sauvegarde (prénom, nom, téléphone, pays, ville, plateforme).
- **Upload de la photo de profil** (clic sur l'avatar → bucket `avatars`).
- **Changement de mot de passe réel** (`auth.updateUser`).
- Repli automatique sur un profil de démonstration si Supabase n'est pas configuré.

## Migration à appliquer

Une nouvelle migration crée les buckets de stockage et la table des articles :

```
supabase/migrations/20260530100300_storage_and_articles.sql
```

Elle :
- crée les buckets publics `media` (500 Mo) et `avatars` (10 Mo) ;
- ouvre la lecture publique des objets de ces buckets ;
- crée la table `public.cms_articles` (+ RLS lecture publique + trigger updated_at) ;
- insère un article d'exemple.

### Commande

```bash
supabase db push
```

> Les écritures (upload, modification, suppression) passent toujours par la
> **service role** côté serveur (routes `/api/admin/*` et `/api/member/profile`),
> jamais directement depuis le navigateur : la sécurité RLS reste intacte.

## Variables d'environnement requises (production)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # indispensable pour upload + écritures admin
ADMIN_ACCESS_CODE=...                # code d'accès back-office
ADMIN_SESSION_TOKEN=...              # jeton de session admin (cookie)
NEXT_PUBLIC_APP_URL=https://...      # URL publique du site
```

Tant que `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` ne sont pas définis, le site
reste en **mode démo** (contenus de secours, aucun crash). Dès qu'ils sont
renseignés, tout bascule sur les données réelles.

## Récapitulatif : ce que l'équipe peut faire sans code

| Action | Où |
|---|---|
| Ajouter / modifier / supprimer une **image, un PDF, une vidéo** | `/admin/medias` |
| Rédiger et publier des **articles** | `/admin/articles` |
| Gérer **pages, lives, podcasts, enseignements, événements, témoignages** | modules `/admin/*` |
| Gérer le **catalogue de dons Chariow** (liens, boutons, accès payants) | `/admin/dons` |
| Gérer les **membres**, **demandes de prière**, **formulaires** | `/admin/*` |
| Régler les **paramètres globaux** | `/admin/parametres` |
| Modifier son **profil + photo + mot de passe** (membre) | `/member/dashboard/profil` |
