# Release Production — Citadelle du Royaume

> Document de référence pour la **mise en production stable** (avant tout ajout de
> contenu / des 118 modules restants). Consolide : état du dépôt, variables d'env,
> migrations, checklist PlanetHoster, guide pas-à-pas et procédure de rollback.
>
> Guides détaillés complémentaires (déjà au dépôt, non remplacés) :
> `docs/GUIDE-DEPLOIEMENT-PLANETHOSTER.md`, `docs/DEPLOIEMENT-ACADEMY.md`,
> `docs/GUIDE-SUPABASE.md`, `docs/GUIDE-PREMIER-ADMIN.md`,
> `docs/CHECKLIST-DEPLOIEMENT-PLANETHOSTER.md`.

---

## 1. État de la release

| | |
|---|---|
| **Branche finale** | `main` |
| **Dernier commit** | `dfbe476` — *fix(live): programme hebdo reel (6 services) + lecteur Live et replays sans contenu fictif* |
| **Remote** | `github.com/2026Chapelle/chapelle-digitale` — `main` synchronisé (0 commit en attente) |
| **Build** | `next build` (mode production) — **vert, 0 erreur** |
| **Artefact de déploiement** | `deploy-citadelle.zip` (build standalone portable, à la racine du projet) |
| **Plateforme cible** | PlanetHoster N0C (Node.js via Passenger, `app.js` → `server.js`) |
| **Chemin serveur** | `/home/<user>/citadelle/` (ex. `/home/frprszbd/citadelle`) |

**Périmètre de cette release :** homepage premium + CMS, tunnel de conversion,
onboarding, 8 plateformes (images réelles), Live & Cultes (6 services réels),
Académie des Élus (Module 1 réel, intégrée dans « Mes Formations », certificats /
QR / passeport), back-office complet. **Aucun module 2→120 ajouté** (volontaire).

---

## 2. Variables d'environnement requises

À placer dans `/home/<user>/citadelle/.env` (chargé par `app.js` au démarrage).
Modèle complet : `.env.exemple-production` (à renommer `.env` sur le serveur).

### Obligatoires (l'app démarre mais reste dégradée sans elles)

| Variable | Rôle | Sans elle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projet Supabase | Pas de données réelles (mode démo) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (serveur) | Admin / certificats / RPC HS |
| `ADMIN_ACCESS_CODE` | Code d'accès back-office | **`/admin` renvoie 503** (aucun repli en prod) |
| `ADMIN_SESSION_TOKEN` | Jeton de session admin | idem |
| `NEXT_PUBLIC_APP_URL` | URL publique du site | Liens / SEO / redirections faux |
| `NEXT_PUBLIC_SITE_URL` | Domaine canonique (emails, auth) | Défaut = `APP_URL` |
| `NODE_ENV=production` | Mode prod | Cookies non `secure`, repli dev |

### Recommandées (fonctionnalités réelles)

| Variable | Rôle | Sans elle |
|---|---|---|
| `RESEND_API_KEY` | Emails transactionnels (reçus dons, intégration, prière) | Emails *préparés* mais **non envoyés** (pas de faux succès) |
| `EMAIL_FROM` / `NEWSLETTER_FROM` | Expéditeurs | Défauts |
| `ADMIN_NOTIFY_EMAIL` | Destinataire notifs internes | Pas de notif interne |
| `CHARIOW_WEBHOOK_SECRET` | Vérif signature webhook dons | Webhook accepté **sans** vérif (risque) |

### Optionnelles
`FLUENTCRM_*` (tunnel — fonctionne sans, via Resend), `GOOGLE_SITE_VERIFICATION`,
`NEXT_PUBLIC_SHOW_DEMO_BANNER=false`, liens podcast (`NEXT_PUBLIC_SPOTIFY_URL`,
`NEXT_PUBLIC_APPLE_PODCAST_URL`, `NEXT_PUBLIC_DEEZER_URL`, `NEXT_PUBLIC_YOUTUBE_URL`),
`NEXT_PUBLIC_ANALYTICS_ENDPOINT`, `NEXT_PUBLIC_VITALS_ENDPOINT`.

> ⚠️ **Ne jamais** laisser les valeurs d'exemple de `ADMIN_ACCESS_CODE` /
> `ADMIN_SESSION_TOKEN`. Générer des secrets uniques et longs.

---

## 3. Migrations à exécuter (Supabase)

**56 migrations** dans `supabase/migrations/` (du schéma initial à l'Académie).
Appliquer **dans l'ordre chronologique** (les noms sont déjà ordonnés).

```bash
# En local, projet relié :
supabase link --project-ref <REF>
supabase db push        # applique TOUTES les migrations manquantes
```

Points d'attention pour cette release :

- **`20260603400000_academy.sql`** (Académie) — *nouvelle, non encore poussée*.
  12 tables `academy_*`, RPC sécurisés, RLS durcie, seed 6 niveaux + Module 1/2.
  Idempotente. Détails + vérifs : `docs/DEPLOIEMENT-ACADEMY.md`.
- **`20260602230000_analytics_interne.sql`** — analytics temps réel (à pousser si
  pas déjà fait).
- Tant que `academy` n'est pas poussée, l'Académie tourne en **localStorage**
  (Module 1 jouable, progression locale) — comportement attendu, non bloquant.

Vérifs post-migration Académie (extrait) :
```sql
select table_name from information_schema.tables
 where table_schema='public' and table_name like 'academy_%';     -- 12 tables
select ordre, titre, status from public.academy_levels order by ordre;  -- 6 niveaux
```
(Vérifs complètes + contrôles de sécurité : `docs/DEPLOIEMENT-ACADEMY.md` §3.)

---

## 4. Checklist PlanetHoster (go / no-go)

**Avant**
- [ ] Projet Supabase créé, clés récupérées (API → URL / anon / service_role).
- [ ] `supabase db push` exécuté (56 migrations) — sans erreur.
- [ ] Buckets Storage `media` et `avatars` créés (via migrations).
- [ ] Auth Email activée ; (Google/Facebook optionnels) URL redirection `https://DOMAINE/auth/callback`.
- [ ] Premier admin créé : `profiles.role = 'admin'` (ou `super_admin`).
- [ ] `deploy-citadelle.zip` régénéré depuis le dernier build vert.

**Déploiement**
- [ ] ZIP téléversé et décompressé dans `/home/<user>/citadelle/`.
- [ ] `.env` créé à la racine (depuis `.env.exemple-production`) et **rempli**.
- [ ] Secrets admin uniques (pas les valeurs d'exemple).
- [ ] Application Node.js (N0C) : *Application root* = `citadelle`, *Startup file* = `app.js`.
- [ ] Restart de l'application Passenger.

**Après**
- [ ] Page d'accueil 200 + images des plateformes visibles.
- [ ] `/live` s'affiche (placeholder « Pas de Live » si aucun `cms_lives`).
- [ ] `/admin` : connexion avec `ADMIN_ACCESS_CODE` → tableau de bord.
- [ ] `/register` → `/login` → `/member/dashboard` OK.
- [ ] Un don test → reçu (si `RESEND_API_KEY` configuré).
- [ ] HTTPS forcé, domaine canonique correct.

---

## 5. Guide de déploiement pas-à-pas (PlanetHoster N0C)

> Aucune compilation côté serveur : on téléverse un bundle déjà construit.

### Étape 1 — (Local) Régénérer le ZIP
```powershell
npm run build                      # build standalone (doit être VERT)
powershell -File scripts\build-deploy.ps1   # assemble deploy-citadelle/ + ZIP
```
Produit `deploy-citadelle.zip` à la racine (slashs Linux, compatible PlanetHoster).

### Étape 2 — Supabase
1. Créer le projet, récupérer URL / anon / service_role.
2. `supabase link --project-ref <REF>` puis `supabase db push`.
3. Activer Auth Email. Créer le 1er admin (`profiles.role='admin'`).

### Étape 3 — Téléverser
1. cPanel N0C → *Gestionnaire de fichiers* → dossier `citadelle` (créer si absent).
2. Téléverser `deploy-citadelle.zip`, puis **Extraire** sur place.
3. Vérifier la présence de `app.js`, `server.js`, `.next/`, `public/`, `node_modules/`.

### Étape 4 — Variables d'environnement
1. Créer `/home/<user>/citadelle/.env` (copier `.env.exemple-production`).
2. Remplir toutes les variables **Obligatoires** (§2) + secrets admin uniques.

### Étape 5 — Application Node.js (Passenger)
1. cPanel → *Setup Node.js App* (ou N0C → Node.js).
2. *Application root* = `citadelle` · *Startup file* = `app.js` · Node ≥ 18.
3. Créer / Enregistrer, puis **Restart**.

### Étape 6 — Vérifications
Dérouler la section **Après** de la checklist (§4).

*(Procédure détaillée avec captures : `docs/GUIDE-DEPLOIEMENT-PLANETHOSTER.md`.)*

---

## 6. Rollback (retour arrière)

### A. Rollback applicatif (le plus fréquent)
Le déploiement est un bundle statique : revenir = redéployer le bundle précédent.

1. **Conserver** l'ancien dossier avant chaque déploiement :
   `mv citadelle citadelle_backup_AAAAMMJJ` (ou copie du ZIP précédent).
2. En cas de problème : supprimer le nouveau `citadelle/`, restaurer le backup,
   **Restart** l'application Passenger.
3. Reconstruire un bundle depuis un commit antérieur si besoin :
   ```powershell
   git checkout <commit_precedent>
   npm ci && npm run build
   powershell -File scripts\build-deploy.ps1
   ```
   Puis re-téléverser `deploy-citadelle.zip`.

> Le `.env` n'est **pas** dans le ZIP : il reste sur le serveur, le rollback
> applicatif ne le touche pas.

### B. Rollback Git (source de vérité)
```bash
# Annuler le dernier commit sur main SANS perdre l'historique (recommandé) :
git revert <commit>            # crée un commit inverse
git push origin main
# (la branche feat/academie-des-elus conserve tout l'historique d'origine)
```

### C. Rollback base de données
- **Sauvegarder AVANT toute migration** : `supabase db dump -f backup_AAAAMMJJ.sql`.
- Annuler **uniquement** l'Académie (sans toucher au reste) : script de la section 5
  de `docs/DEPLOIEMENT-ACADEMY.md` (drop des tables `academy_*` + RPC).
- Restauration complète : `psql "$DATABASE_URL" -f backup_AAAAMMJJ.sql`.
- Les autres migrations sont idempotentes et **ne suppriment rien** d'existant.

---

## 7. Préparation aux tests humains

**Comptes / accès à fournir aux testeurs**
- **Back-office** : URL `/admin` + `ADMIN_ACCESS_CODE` (cookie httpOnly 8 h,
  rate-limit 8 essais / 10 min / IP).
- **Membre** : créer un compte via `/register` (ou Supabase → Users), puis
  `/login` → `/member/dashboard`.

**Scénarios de test prioritaires**
1. Accueil → navigation menu (tous les liens, 8 plateformes).
2. `/live` : horaires des 6 services + lecteur (selon `cms_lives`).
3. Tunnel : `/rejoindre` → onboarding `/bienvenue` → `/member/dashboard`.
4. Académie : « Mes Formations » → Module 1 (verrouillé tant qu'intégration non finie).
5. Don test → reçu email (si Resend) + apparition back-office.
6. Back-office : parcourir les modules d'admin, créer/éditer un contenu CMS.

**Bannière démo** : `NEXT_PUBLIC_SHOW_DEMO_BANNER=true` pour signaler aux testeurs
qu'il s'agit d'un environnement de validation (mettre `false` en prod réelle).

**Limites connues attendues (non-bugs)**
- Académie en localStorage tant que `db:push academy` non fait.
- `/live` et replays vides sans entrées `cms_lives`.
- Emails non envoyés si `RESEND_API_KEY` absente.
</content>
