# Guide d'administration — Équipe pastorale

Ce guide explique comment **gérer la Citadelle au quotidien**, sans toucher au
code ni redéployer. Tout se fait depuis le **back-office**.

---

## 1. Se connecter au back-office

1. Aller sur `https://votre-domaine.org/admin/login`.
2. Saisir le **code d'accès** (fourni par l'administrateur technique).
3. Vous arrivez sur le **Tableau de bord**.

> Pour se déconnecter : bouton **Déconnexion** en bas du menu latéral.

---

## 2. Les modules disponibles

Menu latéral (à gauche) :

| Module | À quoi ça sert |
|---|---|
| **Tableau de bord** | Vue d'ensemble : membres, dons, trafic, prières… |
| **Membres** | Liste des membres, statuts, recherche |
| **Pages** | Pages éditoriales du site |
| **Articles** | Blog : rédiger et publier des articles |
| **Médias** | Médiathèque : **téléverser** images, PDF, vidéos, audio |
| **Lives & Cultes** | Programmer les directs (YouTube / vidéo) |
| **Podcasts** | Épisodes audio |
| **Enseignements** | Enseignements (vidéo/audio/texte) |
| **Événements** | Agenda des événements |
| **Témoignages** | Modérer et publier les témoignages reçus |
| **Dons & Offrandes** | Catalogue des liens de paiement (boutons, accès) |
| **Prières** | Demandes de prière reçues |
| **Formulaires** | Soumissions de formulaires |
| **Analytics** | Statistiques de fréquentation |
| **Paramètres** | Réglages globaux du site |

---

## 3. Gérer les contenus (recette générale)

Chaque module de contenu fonctionne pareil :

1. Cliquer **« Nouveau »** (en haut à droite).
2. Remplir les champs dans la fenêtre.
3. Cliquer **Enregistrer**.
4. Pour rendre visible sur le site : basculer le statut sur **Publié** (icône œil).
5. Pour modifier : icône **crayon**. Pour supprimer : icône **corbeille**.
6. Réordonner : flèches **▲ ▼** à gauche de chaque ligne.

> **Brouillon** = non visible du public. **Publié** = visible sur le site.

---

## 4. Médiathèque — ajouter / remplacer / supprimer un fichier

1. Aller dans **Médias → Nouveau**.
2. Donner un **Titre** et choisir le **Type** (image, vidéo, audio, PDF…).
3. Sur le champ **Fichier** : cliquer **« Téléverser »**, choisir le fichier sur
   votre ordinateur. Il se charge et s'affiche en aperçu.
   - Pour **remplacer** : rouvrir l'élément, cliquer **« Remplacer »**.
   - Pour **retirer** : icône corbeille à côté de l'aperçu.
   - On peut aussi **coller une URL externe** (YouTube, lien existant).
4. **Enregistrer** puis **Publier**.

> Limite : 500 Mo par fichier (les vidéos passent). Les médias publiés
> alimentent automatiquement l'espace **Ressources** des membres.

---

## 5. Articles (blog)

1. **Articles → Nouveau**.
2. Renseigner : Titre, *Slug* (l'adresse, ex. `mon-article`), Accroche, Contenu,
   **Image de couverture** (téléversée), Auteur, Catégorie, Tags.
3. Choisir la **Date de publication** et passer le statut à **Publié**.
4. L'article apparaît sur `https://votre-domaine.org/articles`.

---

## 6. Dons & paiements (Chariow)

Le site utilise **Chariow** comme moyen de paiement (jamais affiché tel quel aux
visiteurs : on parle de « Don volontaire », « Offrande », « Partenariat »,
« Accès au parcours »).

Pour ajouter un bouton de don / un accès payant :
1. **Dons & Offrandes → Nouveau produit**.
2. Renseigner :
   - **Titre public** (ce que voit le visiteur, ex. « Soutenir l'œuvre »).
   - **Type** (don, offrande, partenariat, accès…).
   - **Product ID Chariow** *et/ou* **Lien direct Chariow** (depuis votre tableau de bord Chariow).
   - **Texte** et **couleur** du bouton.
   - **Page associée** (où afficher le bouton : dons, offrandes, partenariat…).
3. Cocher **Actif** puis **Enregistrer**.

Le bouton apparaît immédiatement sur la page choisie. Désactiver = le retirer du site.

---

## 7. Modérer les témoignages et les prières

- **Témoignages** : les soumissions arrivent en statut *soumis*. Les relire,
  puis **Approuver/Publier** pour les afficher, ou supprimer.
- **Prières** : consulter les demandes reçues, marquer comme traitées/archivées.

---

## 8. Les rôles et les espaces réservés

Chaque compte a un **rôle** (modifiable dans Supabase → table `profiles`,
colonne `role`) :

| Rôle | Accès |
|---|---|
| `admin` / `super_admin` / `pasteur` | Tout le back-office + tous les espaces |
| `formateur` | **Espace Formateur** (suivi des formations et apprenants) |
| `responsable_integration` | **Espace Intégration** (suivi des nouveaux membres) |
| `membre`, `disciple`, … | Espace membre standard |

Les espaces spécialisés apparaissent automatiquement dans le menu du membre
selon son rôle (`/member/dashboard/formateur`, `/member/dashboard/integration`).

---

## 9. L'espace membre (côté fidèle)

Un membre connecté dispose de :
- **Profil** : modifier ses infos, **changer sa photo**, changer son mot de passe.
- **Parcours** : sa progression de disciple.
- **Formations** : ses cours et leur avancement.
- **Ressources** : téléchargements (alimentés par la médiathèque).
- **Dons** : son historique de soutien.
- **Prières, Événements, Groupes, Notifications…**

---

## 10. Bonnes pratiques

- Toujours **Publier** après création pour rendre visible.
- Optimiser les images avant upload (poids raisonnable) pour la rapidité.
- Garder le **code d'accès admin** confidentiel.
- En cas de doute, un contenu en **Brouillon** ne casse rien : il reste invisible.
