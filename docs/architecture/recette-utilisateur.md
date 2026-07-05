# Recette utilisateur — Citadelle (post-déploiement)

> 20 scénarios prioritaires à valider après chaque déploiement. Cocher `Statut` (✅ OK / ❌ KO / ⏳ à faire) et remplir `Notes`.
> Comptes de test recommandés : 1 **membre simple**, 1 **leader** de cellule, 1 **responsable national** (avec `nation_responsables`), 1 **admin/super_admin**.
> Pré-requis données : ≥ 1 groupe par plateforme testée + ≥ 1 réunion avec présences. Score & alertes visibles seulement après 1ʳᵉ exécution du cron.

## 🔐 Accès & sécurité

| # | Acteur | Scénario | Résultat attendu | Statut | Notes |
|---|---|---|---|---|---|
| 1 | Visiteur | Inscription → connexion → `/member/dashboard` | Compte créé, notif de bienvenue, tableau de bord réel (zéro fictif) | ⏳ | |
| 2 | Admin | Connexion back-office (cookie `ADMIN_SESSION_TOKEN`) → `/admin` | Sidebar admin ; sans cookie → redirigé `/admin/login` | ⏳ | |
| 3 | Membre | Cloisonnement RBAC | Pas d'accès aux espaces spécialisés ni `/admin/*` (URL directe refusée) | ⏳ | |
| 4 | Resp. national | Scoping national | Données bornées à son/ses pays ; sélecteur « toutes nations » réservé super_admin | ⏳ | |

## 👥 Communauté (Chantier 3)

| # | Acteur | Scénario | Résultat attendu | Statut | Notes |
|---|---|---|---|---|---|
| 5 | Visiteur anonyme | Annuaire public `/groupes` | Groupes actifs + filtres ; aucune liste de membres, aucun chat, zéro fictif | ⏳ | |
| 6 | Membre | Demande d'adhésion (Découvrir → Rejoindre) | « Demande envoyée » (désactivé) ; `group_join_request` créée | ⏳ | |
| 7 | Admin / Leader | Approbation d'adhésion | Appartenance active créée + notif membre + `membres_count` +1 | ⏳ | |
| 8 | Membre | Groupe principal (is_primary) | Un seul principal ; sortie du principal → bascule auto | ⏳ | |
| 9 | Admin / Resp. national | Création groupe + nomination | Refus si plateforme vide ; `responsable_id` fixé, `leader_id` synchronisé ; national borné | ⏳ | |
| 10 | Leader | Vue Animation (locale) | Voit uniquement ses groupes/membres ; groupe non animé → 403 ; pas de privilège global | ⏳ | |

## 📅 Réunions & Présences (Chantier 4)

| # | Acteur | Scénario | Résultat attendu | Statut | Notes |
|---|---|---|---|---|---|
| 11 | Leader / Admin | Créer une réunion (présentiel/virtuelle/hybride) | Réunion planifiée + notif aux membres actifs | ⏳ | |
| 12 | Leader / Admin | Saisir les présences (présent/absent/excusé) | Seuls les membres actifs enregistrés ; réunion passe « tenue » | ⏳ | |
| 13 | Système → Responsable | Absence répétée (3 consécutives) | Alerte pastorale `absence_repetee` + remontée responsable (anti-doublon) | ⏳ | |
| 14 | Leader / Admin | Stats d'assiduité (par groupe + onglet Gouvernement) | Taux corrects ; agrégats global/plateforme/pays ; aucune donnée nominative | ⏳ | |

## 🩺 Fiche 360° & Pilotage

| # | Acteur | Scénario | Résultat attendu | Statut | Notes |
|---|---|---|---|---|---|
| 15 | Admin | Fiche 360° (`/admin/membres/[id]`) | Sections Communauté + Assiduité réelles + timeline ; zéro fictif | ⏳ | |
| 16 | Admin / Cron | Score d'engagement persisté (P1) | Après cron (`CRON_SECRET`), `score_engagement` réel ≠ 0 + bande inchangée | ⏳ | |
| 17 | Admin | Gouvernement des présences (P2) | Carte Assiduité `/admin/gouvernement` + présence par pays `/admin/nation-dashboard` | ⏳ | |

## 📣 Communication & Notifications

| # | Acteur | Scénario | Résultat attendu | Statut | Notes |
|---|---|---|---|---|---|
| 18 | Admin | Campagne ciblée (rôle/statut/pays/plateforme) | Notif in-app aux ciblés seulement ; `recipients_count` correct ; suivi ouvertures | ⏳ | |
| 19 | Membre ↔ Responsable | Messagerie 1:1 + notif temps réel | Fil 1:1, notif reçue, compteur non-lus correct | ⏳ | |

## 🆘 Assistance

| # | Acteur | Scénario | Résultat attendu | Statut | Notes |
|---|---|---|---|---|---|
| 20 | Admin / Super Admin | Centre d'Aide + bulle « ? » | Recherche OK ; bulle discrète ; « Voir le guide » ancre le bon guide | ⏳ | |

---

## Ordre d'exécution conseillé
1. **Bloquants d'abord** : #1-#4 (accès/sécurité), #6-#8, #11-#13, #15-#16. Si l'auth ou le scoping échoue, le reste est invalide.
2. Préparer les données (groupes + réunions + présences) avant #14, #17.
3. Planifier/déclencher le cron avant #16 (score) et #13 (alertes temporelles).

## Synthèse de campagne
| Indicateur | Valeur |
|---|---|
| Scénarios OK | __ / 20 |
| Scénarios KO | __ |
| Bloquants restants | __ |
| Verdict (GO / NO-GO) | __ |
| Date / Testeur | __ |
