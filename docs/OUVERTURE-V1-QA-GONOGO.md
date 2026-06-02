# 🚀 OUVERTURE V1 — QA complète & Go/No-Go — Citadelle

Document unique pour ouvrir la plateforme aux premiers membres réels, dans les meilleures conditions.
Règle : **donnée réelle Supabase ou état vide propre — zéro fictif.**

---

## 1. SEED DE DÉMARRAGE (structure réelle, éditable)
Optionnel mais recommandé pour que l'espace membre ne soit pas vide au lancement.
**N'insère aucun faux membre / chiffre / témoignage / date.**

```bash
# 1) D'abord appliquer la base
supabase db push
# 2) Puis le seed (lit .env.local)
node scripts/seed-starter.mjs
```
Crée : 1 formation « Fondements de la Foi » + 3 modules (Salut, Baptême, Prière) + 1 parcours « Nouveau Converti ». Tout est **éditable/supprimable** depuis le back-office.

---

## 2. CHECKLIST D'OUVERTURE FINALE
*(détail complet dans `CHECKLIST-OUVERTURE-V1.md`)*
- [ ] Supabase : projet + clés + `supabase db push` (toutes migrations) + buckets `media`/`avatars` + Auth Email + redirect `/auth/callback`.
- [ ] PlanetHoster : ZIP déployé, **`.env`** rempli, **Restart**, `/api/admin/health` ✅.
- [ ] 1er admin : compte + `profiles.role='admin'` + login `/admin/login`.
- [ ] Contenu de départ (seed ou manuel) : ≥ 1 parcours, 1 formation+modules, dons Chariow.
- [ ] HTTPS actif.

---

## 3. PARCOURS QA COMPLET (à dérouler sur la prod)

### 3.A Tests ADMINISTRATEUR
| # | Action | Attendu |
|---|---|---|
| A1 | `/admin/login` avec le code | Accès tableau de bord |
| A2 | `/api/admin/health` | env présentes, service role OK, démo OFF |
| A3 | Pages : créer → publier → **Aperçu Desktop/Mobile** → dupliquer → supprimer | OK, modale opaque |
| A4 | Articles : créer + publier | Visible sur `/articles` |
| A5 | Médias : **téléverser** image + PDF | Apparaît, URL publique |
| A6 | Formations : créer → Modules : ajouter (YouTube non répertorié + PDF + accès) | Enregistré |
| A7 | Parcours : créer + relier une formation | Enregistré |
| A8 | Lives : créer (statut live/scheduled/ended) | Visible côté membre |
| A9 | Événements : créer + publier | Visible membre, inscriptions traçées |
| A10 | Prières : voir demandes, **assigner un intercesseur**, changer priorité/statut | KPIs pastoraux à jour |
| A11 | Témoignages exaucés : valider & publier | Apparaît sur `/priere` |
| A12 | Messages / Newsletter / Groupes / Inscriptions | Données réelles visibles |
| A13 | Statistiques | Comptages réels (membres, pays, LMS) |

### 3.B Tests MEMBRE
| # | Action | Attendu |
|---|---|---|
| M1 | `/register` (3 étapes) | Compte créé + profil auto (trigger) |
| M2 | `/login` puis `/member/dashboard` | En-tête au vrai nom, étape réelle |
| M3 | Profil : modifier infos + **changer photo** + mot de passe | Sauvegardé (clé anon + RLS) |
| M4 | Formations : découvrir → **s'inscrire** → suivre module → **Marquer terminé** | Progression % réelle |
| M5 | Atteindre 100 % d'une formation | **Certificat** dans « Mes certificats » |
| M6 | Parcours : voir étape + **prochaine étape + actions recommandées** | Liens cohérents |
| M7 | Prière : déposer une demande | Visible en admin |
| M8 | Événement : s'inscrire / rappel | Visible `/admin/inscriptions` |
| M9 | Groupe : demande d'adhésion | Visible `/admin/groupes` |
| M10 | Déconnexion | Redirection immédiate `/login`, routes privées protégées |
| M11 | Pages vides (lives/notifications si pas de contenu) | « Aucune donnée disponible » (zéro fictif) |

### 3.C Tests SÉCURITÉ
| # | Contrôle | Attendu |
|---|---|---|
| S1 | Accès `/admin/*` sans cookie | Redirigé vers `/admin/login` |
| S2 | Accès `/member/*` sans session | Redirigé vers `/login` |
| S3 | Bundle client (`.next/static`) | **Aucune** `service_role` / `SUPABASE_DB_URL` *(vérifié au build ✅)* |
| S4 | Un membre modifie le profil d'un autre | Refusé (RLS `auth.uid() = id`) |
| S5 | Lecture de contenus non publiés (anon) | Refusée (RLS statut publié) |
| S6 | Upload média sans cookie admin | 401 |
| S7 | `POST /api/member/*` sans session | 401 |
| S8 | Boutons sociaux Google/Facebook | Masqués (pas d'erreur provider) |
| S9 | HTTPS + cookie `cier_admin` httpOnly+secure | OK |

---

## 4. RAPPORT GO / NO-GO (modèle à cocher)
- [ ] **Build** `exit 0` + ZIP 0 antislash *(✅ vérifié)*
- [ ] **Sécurité** : aucun secret côté client *(✅ vérifié au build)*
- [ ] **Infra** : `db push` fait, `.env` posé, `/api/admin/health` vert
- [ ] **QA Admin** A1→A13 sans erreur
- [ ] **QA Membre** M1→M11 sans erreur
- [ ] **QA Sécurité** S1→S9 sans erreur
- [ ] **Contenu de départ** présent (seed ou manuel)

**Décision :**
- ✅ **GO** si toutes les cases sont cochées → ouverture aux premiers membres.
- ⛔ **NO-GO** si un test A/M/S échoue → corriger avant ouverture (consigner le test échoué).

---

## 5. POINTS BLOQUANTS CONNUS
- **Aucun point bloquant logiciel.** Les seules conditions sont opérationnelles : `db push`, `.env`, contenu de départ, QA runtime.
- Reportés post‑V1 (non bloquants) : publication programmée, historique de versions, notifications temps réel, accompagnement pastoral, dashboards de pilotage avancés, multi‑antennes/i18n UI.

---

## 5bis. LIVRET D'ACCUEIL (intégré V1 — infra existante)
Le parcours d'intégration (`/member/dashboard/parcours`) affiche une étape **Bienvenue → Vision → Livret d'Accueil → Étape suivante**. Le bouton de téléchargement apparaît dès que le livret est configuré (sinon « bientôt disponible » — zéro fictif).

**Configurer le livret (3 min, sans code) :**
1. Back-office → **Médias** → téléverser le PDF « Livret d'Accueil Citadelle » → copier l'URL publique.
2. Back-office → **Paramètres** (cms_settings) → ajouter la clé `livret_accueil_url` = l'URL du PDF.
3. Le bouton « Télécharger le Livret d'Accueil » s'active automatiquement dans le parcours membre.

## ROADMAP V1.x / V2 (à NE PAS développer maintenant)
- **Email de bienvenue automatique** : à l'inscription, envoyer message de bienvenue + vision + parcours d'intégration + liens essentiels + prochaines étapes + **lien du Livret d'Accueil**. (Réutilisera `/api/notify/*` + Resend ; déclencheur sur signup.)
- **Dashboard de Gouvernement Pastoral** : fondations techniques uniquement en V1 (tables prière/LMS déjà structurées) ; UI de pilotage en V2.
- Publication programmée, historique de versions, notifications temps réel, accompagnement pastoral, multi-antennes / i18n UI.

---

## 6. APRÈS L'OUVERTURE — exploitation
- Suivre `/admin/statistiques` (membres, pays, LMS, prière).
- Modérer témoignages + prières quotidiennement.
- Ajouter formations/parcours/événements au fil de l'eau (back-office, sans redéploiement).
- Sauvegardes Supabase activées (Point-in-Time si plan le permet).
