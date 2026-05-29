# Architecture — La Chapelle Internationale des Élus du Royaume (CIER)

## Vision Technique
Plateforme digitale d'église mondiale, scalable, premium, pensée pour l'Afrique et la diaspora francophone mondiale.

---

## Stack Technique

### Frontend
- **Next.js 14** (App Router) — SSR + SSG + ISR
- **React 18** — UI library
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **Framer Motion** — Animations premium
- **GSAP** — Animations avancées
- **Three.js** — Effets 3D légers

### Backend
- **Supabase** — Auth + PostgreSQL + Storage + Realtime + Edge Functions
- **Next.js API Routes** — Server-side logic
- **Stripe** — Paiements & dons
- **Resend** — Emails transactionnels
- **Pusher** — Notifications temps réel

### Infrastructure
- **Vercel** — Hosting + CDN mondial
- **Cloudflare** — DDoS protection + DNS + Cache
- **Supabase Storage** — Médias
- **Cloudinary** — Image optimization

---

## Structure du Projet

```
cier-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/           # Pages publiques
│   │   │   ├── page.tsx        # Accueil
│   │   │   ├── live/           # Live streaming
│   │   │   ├── plateformes/    # Pages ministères
│   │   │   ├── formations/     # LMS public
│   │   │   ├── evenements/     # Événements
│   │   │   ├── dons/           # Dons & financement
│   │   │   ├── priere/         # Mur de prière
│   │   │   └── contact/        # Contact
│   │   ├── (auth)/             # Authentication
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── (member)/           # Espace membre
│   │   │   ├── dashboard/      # Dashboard
│   │   │   ├── profil/         # Profil spirituel
│   │   │   ├── formations/     # LMS membre
│   │   │   ├── priere/         # Prière privée
│   │   │   ├── groupes/        # Cellules & groupes
│   │   │   └── agenda/         # Agenda personnel
│   │   ├── (admin)/            # Administration
│   │   │   ├── dashboard/      # Analytics dashboard
│   │   │   ├── membres/        # Gestion membres
│   │   │   ├── crm/            # CRM pastoral
│   │   │   ├── finances/       # Comptabilité
│   │   │   ├── formations/     # Gestion formations
│   │   │   ├── live/           # Studio live
│   │   │   └── evenements/     # Gestion événements
│   │   └── api/                # API Routes
│   ├── components/
│   │   ├── ui/                 # Composants UI base
│   │   ├── layout/             # Navbar, Footer
│   │   ├── sections/           # Sections homepage
│   │   ├── features/           # Feature components
│   │   │   ├── member/         # Espace membre
│   │   │   ├── admin/          # Administration
│   │   │   └── live/           # Live streaming
│   │   └── providers/          # Context providers
│   ├── lib/                    # Utilities
│   ├── hooks/                  # Custom React hooks
│   ├── store/                  # Zustand stores
│   └── types/                  # TypeScript types
├── supabase/
│   ├── migrations/             # SQL migrations
│   └── functions/              # Edge functions
└── public/                     # Static assets
```

---

## Architecture Système

```
┌─────────────────────────────────────────┐
│            UTILISATEURS                  │
│  Africa │ Europe │ Americas │ Asia       │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────▼────────┐
         │   Cloudflare CDN  │
         │   DDoS Protection │
         └─────────┬────────┘
                   │
         ┌─────────▼────────┐
         │     Vercel        │
         │   Next.js App     │
         │   Edge Functions  │
         └────┬─────────┬───┘
              │         │
    ┌─────────▼──┐  ┌───▼──────────┐
    │  Supabase   │  │   External   │
    │  PostgreSQL │  │   Services   │
    │  Auth       │  │   Stripe     │
    │  Storage    │  │   YouTube    │
    │  Realtime   │  │   Resend     │
    └────────────┘  └──────────────┘
```

---

## Funnels de Conversion

### Funnel 1 : YouTube → Église
```
Vidéo YouTube → Commentaire avec lien → Landing page → Register → Onboarding → Membre
```

### Funnel 2 : WhatsApp → Intégration
```
Groupe WhatsApp → Lien inscription → Profil → Groupe cellule → Disciple
```

### Funnel 3 : Visiteur → Membre
```
Accueil → Live/Formation gratuite → Email capture → Série d'emails → Register → Dashboard
```

### Funnel 4 : Membre → Disciple
```
Dashboard → Parcours disciple → Formations → Groupe cellule → Berger → Disciple officiel
```

### Funnel 5 : Disciple → Leader
```
Formation leadership → Cellule test → Validation pasteur → Leader certifié
```

### Funnel 6 : Live → Don
```
Live stream → Appel aux dons → Bannière in-stream → Page dons → Stripe → Reçu
```

---

## Rôles Utilisateurs

| Rôle | Accès | Description |
|------|-------|-------------|
| visiteur | Public | Peut voir le site, pas de compte |
| membre | Membre area | Compte créé, accès basique |
| disciple | Membre ++ | En formation active |
| leader | Membre +++ | Leader de cellule |
| berger | Avancé | Responsable de familles |
| pasteur | Très avancé | Corps pastoral |
| admin | Admin panel | Administration complète |
| super_admin | Tout | Accès total système |

---

## CRM Pipeline Pastoral

```
Nouveau visiteur (0)
    ↓
Prospect chaud (score > 30)
    ↓
En intégration (registered)
    ↓
Nouveau membre actif
    ↓
Disciple en formation
    ↓
Leader émergent
    ↓
Partenaire du Royaume
```

---

## Scoring d'Engagement

| Action | Points |
|--------|--------|
| Connexion quotidienne | +2 (max 20) |
| Formation complétée | +10 (max 30) |
| Événement assisté | +5 (max 20) |
| Prière soumise | +3 (max 15) |
| Don effectué | +5 (max 25) |
| Live regardé | +2 (max 20) |

**Total maximum : 100 points**

---

## Sécurité

- Authentification JWT via Supabase Auth
- Row Level Security (RLS) sur toutes les tables
- Rate limiting sur les API routes
- Input validation avec Zod
- Protection CSRF sur les formulaires
- Sanitisation HTML contre XSS
- Headers de sécurité (CSP, X-Frame-Options, etc.)
- Backup automatique quotidien Supabase
- Monitoring Sentry en production

---

## Performance

Objectifs Lighthouse :
- **Performance** : 95+
- **Accessibility** : 95+
- **Best Practices** : 100
- **SEO** : 100

Optimisations :
- Images WebP/AVIF avec lazy loading
- Code splitting automatique Next.js
- Static generation des pages publiques
- ISR pour le contenu dynamique
- CDN Cloudflare pour les assets
- Compression Brotli/Gzip
- Service Worker pour le mode offline
- Polices préchargées via next/font

---

## Roadmap Technique

### Phase 1 — MVP (Mois 1-2)
- [x] Architecture complète
- [x] Design system & composants UI
- [x] Homepage immersive
- [x] Authentification (email + Google + Facebook)
- [x] Espace membre basique
- [x] Dashboard admin
- [x] Mur de prière
- [x] Page dons (Stripe)
- [x] Page live
- [ ] Base de données production
- [ ] Déploiement Vercel

### Phase 2 — LMS (Mois 2-3)
- [ ] Système de formations complet
- [ ] Lecteur vidéo premium
- [ ] Quiz et certifications
- [ ] Progression et badges
- [ ] Journal spirituel

### Phase 3 — Communauté (Mois 3-4)
- [ ] Système de groupes/cellules
- [ ] Messagerie interne
- [ ] Forums communautaires
- [ ] Notifications temps réel (Pusher)
- [ ] Système de rendez-vous pastoraux

### Phase 4 — Live Premium (Mois 4-5)
- [ ] Studio streaming intégré
- [ ] Chat en direct avancé
- [ ] Modération IA
- [ ] Clips automatiques
- [ ] Multi-langues sous-titres

### Phase 5 — IA & Analytics (Mois 5-6)
- [ ] Assistant spirituel IA
- [ ] Analytics avancés
- [ ] CRM complet
- [ ] Automations email/WhatsApp
- [ ] Prédictions engagement

### Phase 6 — Mobile & Scale (Mois 6+)
- [ ] PWA complète
- [ ] Mode offline
- [ ] Notifications push
- [ ] Optimisation Afrique (2G/3G)
- [ ] Architecture microservices si nécessaire
