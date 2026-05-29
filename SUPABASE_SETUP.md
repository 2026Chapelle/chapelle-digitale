# 🔌 Activer Supabase — Rendre l'espace membre vivant

La plateforme tourne en **mode démo** tant que Supabase n'est pas configuré
(données fictives + auth simulée). Aucune de ces étapes n'est nécessaire pour
développer l'UI ; elles servent à passer en **données réelles**.

> Tant que `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont
> absents, `IS_DEMO_MODE = true` : le middleware ne bloque rien, l'auth simule
> un utilisateur, et les pages affichent les mocks. **Rien ne casse.**

---

## 1. Créer le projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → New project.
2. Récupérer dans **Project Settings → API** :
   - `Project URL`
   - `anon public` key
   - `service_role` key (⚠️ secret, serveur uniquement)

## 2. Renseigner `.env.local`

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Appliquer le schéma

### Option A — Supabase CLI (recommandé)

```bash
npm install -g supabase
supabase link --project-ref <ref-du-projet>
supabase db push          # applique migrations/001 puis 002
```

### Option B — SQL Editor (manuel)

Copier-coller dans l'éditeur SQL, dans l'ordre :
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_complete_and_seed.sql`

## 4. Régénérer les types (optionnel mais conseillé)

Remplace le typage manuel par le schéma réel (vues + relations incluses) :

```bash
npm run db:generate   # → src/types/supabase.ts
```

## 5. Configurer l'authentification

Dans **Authentication → URL Configuration** :
- **Site URL** : `http://localhost:3000` (puis l'URL de prod)
- **Redirect URLs** : ajouter `http://localhost:3000/auth/callback`

Pour Google / Facebook : **Authentication → Providers**, activer et coller les
clés OAuth (cf. `.env.example`). La route `/auth/callback` échange déjà le code
contre une session.

## 6. Lancer

```bash
npm run dev
```

Créer un compte via `/register` → un profil est créé automatiquement (trigger
`handle_new_user`). L'utilisateur arrive sur `/member/dashboard`, désormais
alimenté par de vraies données.

---

## Architecture mise en place

| Élément | Fichier | Rôle |
|---|---|---|
| Types DB | `src/types/supabase.ts` | Typage fort des tables/enums |
| Client navigateur (cookies) | `src/lib/supabase-browser.ts` | Auth réelle, session SSR |
| Client localStorage | `src/lib/supabase.ts` | `supabase` + `supabaseAdmin` + `IS_DEMO_MODE` |
| Clients serveur | `src/lib/supabase-server.ts` | Server Components / Route Handlers + `getServerProfile()` |
| Middleware | `src/middleware.ts` | Refresh session + protège `/member` & `/admin` |
| Callback OAuth | `src/app/auth/callback/route.ts` | Échange code → session |
| Accès données | `src/lib/queries.ts` | Lecture dashboard/prières/notifs (repli démo) |

## Sécurité (RLS)

Toutes les tables sont protégées par Row Level Security. La migration 002 a
notamment **comblé une faille** : `dons` et `rendez_vous` avaient la RLS activée
**sans aucune policy** (donc totalement inaccessibles). Le helper `is_staff()`
gère les accès admin/pasteur/berger/leader.

## Prochaine étape — brancher les pages

`src/lib/queries.ts` est prêt. Pour réveiller le dashboard, remplacer
progressivement les imports de `lib/mock` par les fonctions de `queries.ts`
dans les Server Components (ex. `member/dashboard/page.tsx`). À faire page par
page pour garder le contrôle visuel.
