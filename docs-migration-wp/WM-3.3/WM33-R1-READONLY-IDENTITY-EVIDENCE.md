# WM-3.3 — R1 · Preuve d'identité collectée en lecture seule

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.3` |
| Objet | Collecte lecture seule des rattachements des 2 groupes de doublons cible (DG-1, DG-2) |
| Décision humaine amont | R1 : `MANUAL_IDENTITY_REVIEW` (DG-1 **et** DG-2) ; DG-2 = double validation |
| Sonde | **lecture seule** · `GET /rest/v1/profiles` · `GET /auth/v1/admin/users` · `HEAD count` sur tables de rattachement · hôte `nvyuyffywnuollaxguen.supabase.co` |
| Écriture | **aucune** (ni fusion, ni désactivation, ni correction) |
| PII | UUID / e-mail / prénom **non publiés** — cloisonnés dans `private/` (couvert par `docs-migration-wp/.gitignore`) |
| Matrice anonymisée | `WM33-R1-PROFILE-DEPENDENCIES-MATRIX.csv` — 10 lignes (6 + 4) |

> Les profils sont désignés par un pseudonyme stable (`DG-x-Py`) et une empreinte
> `profile_fp = sha256("WM33|"+uuid)[:12]`. Aucun UUID, e-mail ou nom ne figure dans les livrables
> commités. La correspondance pseudonyme ↔ compte réel n'existe que dans `private/WM33-R1-RAW.json`.

---

## 1. Confirmation du socle (concordant WM-3.1)

| Mesure | WM-3.1 | WM-3.3 (live) | État |
|--------|--------|---------------|------|
| `profiles` | 13 | 13 | concordant |
| `auth.users` | 13 | 13 | concordant |
| Groupe DG-1 (`8c12c2c748ecc387`) | 6 | **6** | concordant |
| Groupe DG-2 (`62a52607eec94560`) | 4 | **4** | concordant |
| Correspondance `profiles.id` ↔ `auth.users.id` | — | **10/10 = oui** | chaque profil a son `auth.users` |

Les 10 profils portent chacun un `auth.users` de même `id` : la table `auth` est doublonnée à
l'identique de `profiles` (aucun profil orphelin, aucun `auth` orphelin dans les 2 groupes).

---

## 2. Attributs collectés par profil

| Attribut demandé | Colonne matrice | Source lecture seule |
|------------------|-----------------|----------------------|
| UUID des profils | `profile_fp` (pseudonyme) + brut en `private/` | `profiles.id` |
| Correspondance `auth.users` | `auth_users_id_match` | `auth.users` (par `id` et par e-mail normalisé) |
| Rôle | `role` | `profiles.role` |
| Statut membre | `membre_statut` | `profiles.membre_statut` |
| Données rattachées | `attached_data_domains`, `total_attached_rows` | `HEAD count` sur 12 tables |
| Activité récente | `last_activity_bucket` | `profiles.derniere_connexion` \| `auth.last_sign_in_at` |
| Dépendances fonctionnelles | `attached_data_domains` (par domaine) | idem |
| Compte à conserver | `keep_candidate` | dérivé (privilège → données → ancienneté) |
| Données à fusionner | `data_to_merge_into_keeper` | dérivé |
| Risque de perte | `loss_risk` | dérivé |

### Couverture des sondes de rattachement (honnêteté méthodologique)

| Domaine | Table · colonne FK | État sonde |
|---------|--------------------|-----------|
| Formations inscrites | `inscriptions_formation.user_id` | ✅ mesuré |
| Progression vidéo | `video_progress.user_id` | ✅ mesuré |
| Notes pastorales | `pastoral_notes.member_id` | ✅ mesuré |
| Actions pastorales | `pastoral_actions_log.member_id` | ✅ mesuré |
| Présences | `group_attendance.user_id` | ✅ mesuré |
| Lien nouveau venu | `newcomer_intakes.converted_profile_id` | ✅ mesuré |
| Notifications | `app_notifications.user_id` | ✅ mesuré |
| Progression audio | `audio_progress` | ⚠️ table absente en prod (non applicable) |
| Playlists | `user_playlists` | ⚠️ table absente en prod (non applicable) |
| Appartenance groupe | `group_members` | ⚠️ nom de table non résolu (présences couvertes par ailleurs) |
| Prières | `prieres` | ⚠️ table absente en prod (non applicable) |
| Achats / accès | `product_purchases` | ⚠️ table absente en prod (non applicable) |

Les tables « absentes » ne signifient **pas** zéro donnée en général — elles signifient que la
table n'existe pas sous ce nom en production (fonctionnalité non déployée). Le total rattaché est
donc mesuré sur **7 domaines réellement présents**. Ce périmètre suffit à la décision de fusion :
les domaines porteurs de données (formations, vidéo, pastoral, notifications) sont couverts.

---

## 3. Constat déterminant — invisible à WM-3.1

WM-3.1 ne connaissait que le rôle du profil **strict-matché** (visiteur pour DG-1, admin/pasteur
pour DG-2). La lecture live révèle une **hétérogénéité de rôles au sein d'une même boîte e-mail** :

### DG-1 — boîte `8c12c2c748ecc387` (6 profils)

| Profil | Rôle | Statut | Créé | Données rattachées | Activité |
|--------|------|--------|------|--------------------|----------|
| DG-1-P1 | `visiteur` | visiteur | 2026-05-30 | formations=1 | 2026-06 |
| DG-1-P2 | `visiteur` | visiteur | 2026-07-04 | formations=1 ; vidéo=2 ; notifs=2 | 2026-07 |
| DG-1-P3 | **`super_admin`** | visiteur | 2026-07-09 | **aucune** | 2026-07 |
| DG-1-P4 | **`admin`** | visiteur | 2026-07-09 | aucune | 2026-07 |
| DG-1-P5 | **`berger`** | visiteur | 2026-07-09 | aucune | 2026-07 |
| DG-1-P6 | **`membre`** | visiteur | 2026-07-09 | aucune | 2026-07 |

**Signal `privilege_data_split = oui`** : le privilège (super_admin/admin/berger) est porté par des
comptes **sans aucune donnée**, tous créés le **même jour (2026-07-09)**, tandis que la donnée
réelle est sur les 2 comptes `visiteur` plus anciens. Lecture la plus probable : les 4 comptes
privilégiés du 2026-07-09 sont des **comptes de test de rôles** créés par l'administrateur sur sa
propre boîte gmail via variantes (`+tag` / points). À **confirmer** par le décideur.

### DG-2 — boîte `62a52607eec94560` (4 profils)

| Profil | Rôle | Statut | Créé | Données rattachées | Activité |
|--------|------|--------|------|--------------------|----------|
| DG-2-P1 | **`admin`** | **pasteur** | 2026-05-30 | formations=1 ; vidéo=3 ; notifs=4 (**total 8**) | 2026-07 |
| DG-2-P2 | `visiteur` | visiteur | 2026-06-05 | formations=1 ; notifs=1 | 2026-06 |
| DG-2-P3 | `formateur` | membre_actif | 2026-06-05 | **actions_pastorales=3** ; notifs=3 | 2026-06 |
| DG-2-P4 | `visiteur` | visiteur | 2026-06-28 | notifs=2 | 2026-06 |

**Signal `privilege_data_split = non`** : le compte le plus privilégié (admin/pasteur, DG-2-P1) est
aussi le plus doté en données (8) et le plus ancien — gardien naturel. Mais **DG-2-P3** (formateur)
porte **3 actions pastorales** : une donnée sensible à re-rattacher, pas à perdre.

---

## 4. Interdits respectés

Aucune écriture · aucune fusion · aucune désactivation · aucune correction · aucun UUID/e-mail/nom
publié hors `private/` · service-role utilisé en **lecture seule** (GET/HEAD uniquement) · aucune
donnée source ou cible modifiée · aucun média · sonde live non mutante.
