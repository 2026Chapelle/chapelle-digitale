# WM-2 — Matrice conserver / recréer / archiver / abandonner

Décisions **provisoires** pour alimenter WM-3 (mapping). Non exécutoires.

| Objet | Volume | Conserver | Recréer Citadelle | Archiver | Abandonner | Notes |
|-------|--------|-----------|-------------------|----------|------------|-------|
| Comptes WP | 35 | Identité + email (hash privé) | Rôles/membership | — | passwords, sessions, tokens | Reset mdp obligatoire |
| Profil first/last/whatsapp | 31–34 | Champs profil | Formulaire onboarding | — | — | Masquer PII hors private |
| Rôle UM semence-royale | 34 | Signal membership | Rôle métier Citadelle | — | capabilities sérialisées brutes | |
| Cours publish | 5 | Contenu + structure | Modules Citadelle LMS | 2 private si hors scope | — | |
| Topics + lessons | 10+38 | Hiérarchie | Parcours | — | — | |
| Enrollments | 33 | user↔course 732 | Progression UI | — | enrollments absents autres cours | |
| Quiz/orders Tutor | 0 | — | Si besoin métier | — | tables vides | |
| Pages Elementor | 56 | Contenu à extraire | Design system Citadelle | révisions | 853 revisions | |
| Blog posts | 0 publish | — | Éditorial futur | 1 trash | — | |
| Médias uploads | 383 FS / 73 att. | Fichiers | Storage Citadelle | — | — | |
| FluentCRM subscribers | 33 | Liste + tags + status | CRM Citadelle/Supabase | campagnes hist. | — | Domaines agrégés only |
| Fluent Forms defs | 7 | Schéma champs | Forms Citadelle | drafts unpub | 0 entries | |
| Prayer request row | 1 | Décision pastorale | — | **private** | sinon | PII_PRIVATE |
| Rank Math redirects | 3 | Si URLs critiques | Redirect map | logs | bulk tables | |
| Wordfence/AS/cache | massif | — | — | optionnel | **oui** | |
| Site Kit tokens | 1 admin | — | Re-OAuth | — | **oui** | |
| Code snippets | 41 | Revue | Features recodées | — | snippets dangereux | |
| Menus WP | 0 | — | Nav Citadelle | — | — | Nav Elementor |
| Woo / H5P | 0 | — | — | — | N/A | |

## Règles transverses validées

1. **Aucun mot de passe WordPress exporté pour migration.**  
2. **Aucun email/téléphone en clair dans rapports Git.**  
3. **Mapping définitif = WM-3 uniquement.**
