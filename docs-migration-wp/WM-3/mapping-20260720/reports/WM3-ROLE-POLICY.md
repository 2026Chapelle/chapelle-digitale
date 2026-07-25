# WM-3 — Politique rôles & identité (verrouillée)

| Champ | Valeur |
|-------|--------|
| ID | POL-WM3-ROLE-001 |
| Source | WM-2 users aggregates · schéma `profiles` / RBAC Citadelle |
| Statut | **VERROUILLÉ** |

## Inventaire source (agrégé, sans PII)

| Signal WP | Volume | Preuve |
|-----------|--------|--------|
| Comptes | 35 | WM2-COUNTS |
| Emails uniques valides | 35 | WM2-COUNTS |
| `administrator` + tutor instructor | 1 | roles guess |
| `um_n1-semence-royale` (UM) | 34 | roles guess |
| Password hashes WP bcrypt | 35 | **ABANDONNER** |

## Règles d’identité

1. **Clé de rapprochement** : email normalisé (lowercase, trim) uniquement.
2. Si email existe déjà dans `auth.users` / `profiles` → **RAPPROCHER** sans écraser : prenom/nom/telephone seulement si cible vide.
3. Si email absent → **IMPORTER** via flux Auth Supabase (création compte) **sans** password WP.
4. **Reset password obligatoire** avant première connexion utile (WM-7).
5. `source_inscription` = `wordpress_wm_import`.
6. `date_inscription` = `wp_users.user_registered` si parseable.
7. **Ne jamais** importer : `user_pass`, sessions, tokens Site Kit, capabilities sérialisées brutes, IP.

## Mapping profil (champ à champ)

| Source WP | Cible Citadelle | Décision | Notes |
|-----------|-----------------|----------|-------|
| `wp_users.ID` | meta archive `wp_user_id` (export WM-4) | ARCHIVER clé | Pas de PK Citadelle = ID WP |
| `user_email` | `profiles.email` + `auth.users.email` | IMPORTER/RAPPROCHER | Clé |
| `user_login` | — / archive | ARCHIVER | Non affiché |
| `display_name` | fallback `prenom` si meta vide | FACULTATIF | |
| `user_registered` | `profiles.date_inscription` | IMPORTER | |
| `user_pass` | — | **ABANDONNER** | |
| usermeta `first_name` | `profiles.prenom` | IMPORTER | 34/35 |
| usermeta `last_name` | `profiles.nom` | IMPORTER | 31/35 |
| usermeta WhatsApp/phone | `profiles.telephone` | IMPORTER | 33/35 · PII coffre |
| usermeta city | `profiles.ville` | FACULTATIF | sparse (3) |
| usermeta country | `profiles.pays` | FACULTATIF | sparse |
| spiritual / consent meta | — | **NE PAS IMPORTER auto** | Décision pastorale WM-4 gated |
| avatar WP | `profiles.avatar_url` | RÉFÉRENCER si URL publique upload migrée | sinon vide |
| `um_n1-semence-royale` | signal membership | **NE PAS** copier capabilities | voir rôles |
| administrator | — | **NE PAS** → super_admin | revue manuelle hors import batch |

## Rôles Citadelle à l’import (tous abonnés non-admin)

| Champ | Valeur forcée |
|-------|----------------|
| `profiles.role` | `visiteur` (ou valeur enum minimale non privilégiée du code) |
| `profiles.membre_statut` | **niveau initial** = `visiteur` |
| `profiles.parcours_disciple_etape` | `0` |
| `profiles.statut` | `actif` |
| `newsletter` | `true` seulement si preuve FluentCRM `subscribed` sur même email ; sinon `false` si unknown |
| Admin WP (1 compte) | **exclusion batch** · création manuelle post-import sous GO sécurité |

## FluentCRM

| Source | Cible | Décision |
|--------|-------|----------|
| subscriber status `subscribed` (33) | `newsletter_subscribers` + flag profile | IMPORTER/RAPPROCHER par email |
| tags / lists | `crm_contacts.tags` (agrégé) ou archive | IMPORTER tags non sensibles seulement |
| campaigns / emails hist. | archive WM-4 | ARCHIVER |
| unsubscribes | règle absolue | **PRESERVER** : si status unsub → `newsletter_subscribers.statut='desabonne'` et ne pas re-opt-in |
| contacts CRM sans wp_user | `newsletter_subscribers` only | IMPORTER email+status |

## Interdits sécurité

- Aucun import de `user_role` admin/éditeur WP vers rôles élevés Citadelle.
- Aucun import de capabilities PHP sérialisées.
- Aucune élévation automatique instructor Tutor → formateur Citadelle (1 compte : revue manuelle).

## Marqueur

`WM3_ROLE_POLICY_LOCKED`
