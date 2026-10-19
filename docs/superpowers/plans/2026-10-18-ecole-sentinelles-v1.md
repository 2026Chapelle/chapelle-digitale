# École des Sentinelles V1 — Implementation Plan

**Goal:** Ajouter une formation Mahanaïm gratuite à six modules, multi-supports, avec progression déclarative et engagement final.

**Architecture:** Les règles propres à Sentinelles sont isolées par son slug. Les tables LMS, les comptes et le back-office existants sont réemployés ; seule la colonne additive `audio_url` est ajoutée à `formation_modules`.

**Global constraints:** aucune mutation distante ; aucune migration appliquée ; les formations existantes conservent leur validation vidéo à 90 % et leur verrouillage PDF.

## Modules validés

Lors de la création administrée, rattacher à `ecole-des-sentinelles` exactement ces six modules publiés, dans cet ordre. Les contenus et URLs restent à renseigner ultérieurement avec les sources validées.

1. L’appel de la Sentinelle.
2. Les fondements de l’intercession.
3. Bâtir son autel personnel.
4. Se tenir à la brèche.
5. Les mystères de la Chambre Haute.
6. Devenir un Bâtisseur.

## Tasks

- [ ] Ajouter et tester le contrat pur de la formation Sentinelles.
- [ ] Ajouter la colonne audio et l'administration multi-supports.
- [ ] Adapter les routes LMS avec une exception strictement limitée au slug Sentinelles.
- [ ] Afficher les supports et la progression déclarative dans l'espace membre.
- [ ] Ajouter l'entrée Mahanaïm, le rattachement plateforme et le filtre public canonique.
- [ ] Ajouter et tester l'engagement final, sans tunnel, CRM, rôle ou notification.
- [ ] Exécuter les tests ciblés, le contrôle de types et une revue locale du diff.
