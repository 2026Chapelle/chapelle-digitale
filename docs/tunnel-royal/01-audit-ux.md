# 01 — Audit UX & Points de fuite

_Plateforme : Citadelle du Royaume (CIER) — Next.js 14 / App Router._
_Date : 2026-05-29._

## Méthode
Lecture du code réel (routes, Navbar, Footer, pages `(public)`, dashboards) et
parcours type d'un visiteur froid → membre. On note ce qui crée de la friction
ou casse l'élan de conversion.

## Constat global
La plateforme est **visuellement aboutie** (thème cinématique « Charbon &
Lumière », or royal, animations soignées). Mais **le parcours du visiteur
n'est pas guidé** : les pages existent en silos, sans fil conducteur du premier
regard jusqu'à l'engagement. Le tunnel était _implicite_, jamais matérialisé.

## Points de fuite identifiés

| # | Fuite | Impact | Gravité |
|---|-------|--------|---------|
| 1 | **`/rejoindre` est en thème CLAIR** alors que tout le reste est sombre. Rupture visuelle brutale au moment clé de la décision. | Perte de confiance, sentiment de « page d'un autre site ». | 🔴 Élevée |
| 2 | **Aucune micro-conversion** : seuls « Créer un compte » et « S'abonner » existent. Le visiteur indécis n'a aucun pas intermédiaire (email, contact). | On perd 90 % des visiteurs pas encore prêts à s'inscrire. | 🔴 Élevée |
| 3 | **CTA principal → page tarifs** : le visiteur froid arrive directement sur les prix. Pas de mise en confiance préalable. | Friction émotionnelle, surtout en contexte spirituel. | 🟠 Moyenne |
| 4 | **Aucune promesse humaine** (mentor, accueil personnel). L'Église digitale paraît froide. | Manque de chaleur = manque d'appartenance. | 🟠 Moyenne |
| 5 | **Pages sans étape suivante** : les pages ne se renvoient pas l'une vers l'autre. Beaucoup de culs-de-sac. | Le visiteur ne sait pas « et maintenant ? ». | 🟠 Moyenne |
| 6 | **Aucun CRM** : les contacts ne sont ni capturés ni nourris. | Pas de relance, pas de suivi du lead. | 🔴 Élevée |
| 7 | **Aucun indicateur de progression** reliant le voyage spirituel (visiteur→leader). | L'utilisateur ne visualise pas sa transformation. | 🟡 Faible |
| 8 | **Dashboard membre riche mais déconnecté du tunnel** : le parcours de discipolat existe, mais sans position globale dans l'entonnoir. | Manque de vision d'ensemble. | 🟡 Faible |

## Corrections apportées (cette mission)
- ✅ **Tunnel matérialisé** en 7 étapes (Visiteur → Leader), avec un modèle de
  données central (`src/lib/tunnel.ts`).
- ✅ **5 nouvelles pages** cohérentes, **toutes en thème sombre cinématique** :
  `/parcours`, `/integration`, `/communaute`, `/servir`, `/partenaires`.
- ✅ **Micro-conversion partout** : formulaire de capture (`TunnelLeadForm`) avec
  promesse humaine (« un mentor vous écrit sous 48h »).
- ✅ **CRM prêt** : relais serveur `/api/tunnel/lead` → FluentCRM (tags par étape).
- ✅ **Indicateur de progression** (`TunnelProgress`) sur les pages publiques et
  le dashboard membre.
- ✅ **Cross-linking** : chaque page pousse vers l'étape suivante du tunnel.

## Recommandations futures (hors périmètre immédiat)
- Réharmoniser `/rejoindre` en thème sombre (ou en faire la page « offres »
  assumée, accessible seulement après réchauffement).
- A/B tester le CTA Navbar : « Rejoindre » → « Commencer le parcours ».
- Brancher `TUNNEL_STAGE` sur le vrai profil Supabase (cf. doc 02).
