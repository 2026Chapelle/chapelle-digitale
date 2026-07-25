# WM-2 — Dictionnaire de données (126 tables)

Source : `wm1r_restore_isolated` · comptages **exact_rows** (COUNT(*))  
Fichier brut : `evidence/02-exact-counts.tsv`

## Légende utilité migratoire

- **M1** = critique métier migration  
- **M2** = utile support / historique  
- **M3** = technique / abandonnable  
- **PII** = contient ou peut contenir des données personnelles  

## Inventaire par table

| Table | Lignes | Famille | Utilité | PII | Confiance attribution |
|-------|-------:|---------|---------|-----|----------------------|
| noc_autologin | 1 | N0C / hébergeur | M3 | possible | nom table |
| wp_abj404_* (7) | 0–2434 | Plugin 404 | M3 / redirections M2 | non | plugin + nom |
| wp_actionscheduler_* (4) | 0–7909 | Action Scheduler | M3 | non | plugin cœur Woo/Fluent/etc. |
| wp_commentmeta | 0 | WP cœur | M3 | — | standard |
| wp_comments | 0 | WP cœur | M3 | — | standard |
| wp_cr_event_signups | 0 | CR custom | M3 | possible | préfixe cr_ + plugins CR |
| wp_cr_forum_posts | 2 | CR forum | M2 | possible | plugin forum |
| wp_cr_live_* (5) | 2–41 | CR live | M2 analytics | possible | plugin live |
| wp_cr_pdf_downloads | 1 | CR tracking | M3 | possible | préfixe |
| wp_cr_prayer_requests | 1 | CR prière | **M2 privé** | **oui** | plugin prière |
| wp_e_* (6) | 0 | Elementor Pro | M3 vide | — | préfixe e_ |
| wp_fc_* (18) | 0–132 | FluentCRM | **M1** abonnés | **oui** | préfixe fc_ + plugin |
| wp_ff_scheduled_actions | 0 | Fluent Forms | M3 | — | préfixe |
| wp_fluentform_* (10) | 0–57 | Fluent Forms | **M1** définitions | forms oui / entries vides | plugin |
| wp_fsmpt_email_logs | 0 | FluentSMTP | M3 | possible | plugin |
| wp_links | 0 | WP cœur legacy | M3 | non | standard |
| wp_litespeed_* (2) | 0 | LiteSpeed | M3 | non | plugin |
| wp_options | 689 | WP cœur | **M1** filtré | secrets | standard |
| wp_postmeta | 7485 | WP cœur | **M1** | variable | standard |
| wp_posts | 1087 | WP cœur | **M1** | contenu | standard |
| wp_rank_math_* (10) | 0–2129 | Rank Math | M2 | non | préfixe |
| wp_snippets | 41 | Code Snippets | M2 revue | code | plugin |
| wp_termmeta | 0 | WP cœur | M3 | — | standard |
| wp_terms | 3 | WP cœur | M2 faible | non | standard |
| wp_term_relationships | 2 | WP cœur | M2 faible | non | standard |
| wp_term_taxonomy | 3 | WP cœur | M2 faible | non | standard |
| wp_tutor_* (17) | **0** | Tutor LMS | schéma M2 / data M3 | — | préfixe + plugin |
| wp_um_metadata | 0 | Ultimate Member | M3 | — | plugin |
| wp_usermeta | 773 | WP cœur | **M1** | **oui** | standard |
| wp_users | 35 | WP cœur | **M1** | **oui** | standard |
| wp_wf* (Wordfence, ~25) | 0–21181 | Sécurité | M3 | IP logs possibles | préfixe wf |

## CPT WordPress (contenu hors tables tutor_*)

Voir `evidence/42-all-post-types.tsv` : courses, topics, lesson, tutor_enrolled, page, attachment, revision, um_form, elementor_*, etc.
