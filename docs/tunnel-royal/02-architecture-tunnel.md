# 02 — Architecture du Tunnel Royal

## Les 7 étapes de transformation

```
 1. VISITEUR ──► 2. CONTACT ──► 3. INTÉGRATION ──► 4. DISCIPLE ──► 5. MEMBRE ──► 6. SERVITEUR ──► 7. LEADER
   découvre        lève la main     trouve sa place    grandit         appartient     donne            élève
```

| # | Étape | Rôle | Promesse | Déclencheur plateforme | Page | Tag CRM |
|---|-------|------|----------|------------------------|------|---------|
| 1 | **Visiteur** | Celui qui découvre | Être touché dès le 1er regard | Live, ressources gratuites | `/` | `tunnel:visiteur` |
| 2 | **Contact** | Celui qui lève la main | Être accueilli personnellement | Formulaire 1er contact | `/rejoindre` | `tunnel:contact` |
| 3 | **Intégration** | Le nouvel arrivant | Trouver sa place | Parcours nouveau arrivant + mentor | `/integration` | `tunnel:integration` |
| 4 | **Disciple** | Celui qui grandit | Être affermi par la Parole | Formations + suivi progression | `/parcours` | `tunnel:disciple` |
| 5 | **Membre** | Celui qui appartient | Faire partie de la famille | Cellules, événements, groupes | `/communaute` | `tunnel:membre` |
| 6 | **Serviteur** | Celui qui donne | Mettre ses dons au service | Équipes de service, bénévolat | `/servir` | `tunnel:serviteur` |
| 7 | **Leader** | Celui qui élève | Conduire et reproduire | Mentorat, partenariat | `/partenaires` | `tunnel:leader` |

Source de vérité : **`src/lib/tunnel.ts`** (`TUNNEL_STAGES`). Tout (pages, indicateurs,
tags CRM) en dérive — un seul endroit à modifier.

## Flux de données (lead → CRM)

```
Composant React (TunnelLeadForm)
        │  submitTunnelLead()
        ▼
POST /api/tunnel/lead        ← runtime nodejs, garde les secrets serveur
        │  Basic Auth (Application Password WP)
        ▼
FluentCRM REST  /wp-json/fluent-crm/v2/subscribers
        │  crée/maj l'abonné + applique le tag de l'étape
        ▼
Automations FluentCRM (séquences email par tag)
```

**Mode démo** : sans variables d'env FluentCRM, l'API accepte le lead sans
relayer (UX intacte, aucun crash).

### Variables d'environnement
```
FLUENTCRM_BASE_URL=https://chapelleduroyaume.org
FLUENTCRM_USERNAME=...
FLUENTCRM_PASSWORD=...            # Application Password WordPress
FLUENTCRM_LIST_ID=2              # optionnel
NEXT_PUBLIC_FLUENTFORM_BASE=...  # optionnel, si embed Fluent Forms natif
```

## Deux stratégies de formulaires (au choix de l'équipe)
1. **`TunnelLeadForm`** (recommandé) — formulaire React natif, design 100 %
   cohérent → `/api/tunnel/lead` → FluentCRM.
2. **`FluentEmbed`** — iframe vers un Fluent Form hébergé sur WordPress
   (`[fluentform id="X"]`) si l'équipe veut gérer les champs côté WP.

## Mapping FluentCRM ↔ Supabase (évolution)
Aujourd'hui `TUNNEL_STAGE` (dashboard) est un mock. Cible :
- Colonne `membre.tunnel_stage` (enum) sur Supabase, synchronisée par webhook
  FluentCRM → `/api/tunnel/sync` (à créer), ou lue à la connexion.
- `tunnelProgress(stage)` calcule déjà le % global pour les indicateurs.

## Composants livrés
| Fichier | Rôle |
|---------|------|
| `src/lib/tunnel.ts` | Modèle des 7 étapes + helpers (`nextStage`, `tunnelProgress`) |
| `src/lib/fluent.ts` | Types + `submitTunnelLead()` côté client |
| `src/app/api/tunnel/lead/route.ts` | Relais serveur → FluentCRM |
| `src/components/features/tunnel/TunnelProgress.tsx` | Indicateur (horizontal/vertical/compact) |
| `src/components/features/tunnel/TunnelLeadForm.tsx` | Formulaire de capture |
| `src/components/features/tunnel/FluentEmbed.tsx` | Embed Fluent Form natif |
