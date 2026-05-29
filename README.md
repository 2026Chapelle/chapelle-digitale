# La Chapelle Internationale des Élus du Royaume
## « Une Église Ouverte au Monde »

> Plateforme digitale d'église mondiale — La plus grande expérience d'église chrétienne francophone en ligne.

---

## Démarrage rapide

### 1. Installation des dépendances

```bash
npm install
# ou
yarn install
# ou
pnpm install
```

### 2. Variables d'environnement

```bash
cp .env.example .env.local
# Remplir toutes les variables dans .env.local
```

### 3. Base de données

```bash
# Installer Supabase CLI
npm install -g supabase

# Démarrer Supabase local
supabase start

# Appliquer les migrations
supabase db push
```

### 4. Lancer le serveur de développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Structure des Pages

| Route | Description |
|-------|-------------|
| `/` | Accueil immersive |
| `/live` | Live streaming & replays |
| `/plateformes` | Toutes les plateformes |
| `/formations` | Centre de formation LMS |
| `/priere` | Mur de prière mondial |
| `/evenements` | Événements & agenda |
| `/dons` | Dons & partenariat |
| `/login` | Connexion |
| `/register` | Inscription |
| `/dashboard` | Espace membre |
| `/admin/dashboard` | Administration |

---

## Variables d'environnement requises

```env
NEXT_PUBLIC_SUPABASE_URL=         # URL Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Clé publique Supabase
SUPABASE_SERVICE_ROLE_KEY=        # Clé admin Supabase
STRIPE_SECRET_KEY=                # Stripe (dons)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=                   # Emails
```

---

## Technologies

- **Next.js 14** — Framework React
- **Tailwind CSS** — Styles
- **Framer Motion** — Animations
- **Supabase** — Backend as a Service
- **Stripe** — Paiements
- **TypeScript** — Types

---

## Déploiement Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Variables d'environnement
vercel env add NEXT_PUBLIC_SUPABASE_URL
# (répéter pour chaque variable)
```

---

## Architecture

Voir [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) pour l'architecture détaillée.

---

## Contribution

Pour contribuer au projet, merci de :
1. Créer une branche feature
2. Respecter les conventions de code
3. Ajouter des tests si nécessaire
4. Ouvrir une Pull Request

---

## Licence

© 2026 La Chapelle Internationale des Élus du Royaume. Tous droits réservés.

---

*« Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance. » — Jérémie 29:11*
