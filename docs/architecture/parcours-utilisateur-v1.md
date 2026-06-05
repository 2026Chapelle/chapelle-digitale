# Parcours Utilisateur Communautaire — V1

> Alignés sur la progression spirituelle : Visiteur → Nouveau croyant → Disciple → Serviteur → Leader → Ouvrier → Responsable → Berger.

## 1. Parcours d'appartenance (membre)

```
Visiteur → s'inscrit → Nouveau croyant
   → (Intégration) affecté à une CELLULE d'accueil (groupe is_primary → groupe_cellule_id) + un berger (berger_id)
   → Disciple : participe aux activités de sa cellule + cohorte de formation
   → Serviteur : rejoint une ÉQUIPE de service (type equipe_service)
   → Leader : nommé leader/co-leader d'une cellule (membres_groupe.role)
   → Ouvrier : sert sur plusieurs équipes / mission
   → Responsable : supervise plusieurs cellules (resp. national / plateforme)
   → Berger : accompagne, multiplie des cellules (parent_id — V2)
```

## 2. Écrans & flux V1

### Membre — `/member/dashboard/groupes`
- **Mes Groupes** : liste réelle de ses appartenances (`membres_groupe`), avec **badge « Principal »** sur le groupe `is_primary` et bouton « Définir comme principal ».
- **Découvrir** : annuaire des groupes actifs → bouton **Rejoindre** (crée une `group_join_request`).
- Bouton **Message** → messagerie 1:1 existante (le fil de groupe est V2). Le chat factice est retiré.

### Membre — rejoindre un groupe
1. Le membre clique **Rejoindre** dans l'annuaire.
2. Une `group_join_request` (`statut='en_attente'`) est créée.
3. Le responsable/leader **approuve** → une ligne `membres_groupe` (`statut='actif'`) est créée.
4. Le membre reçoit une **notification** (moteur Notifications). Premier groupe ⇒ `is_primary=true`.

### Leader — vue « Mon groupe »
- Liste de ses membres (scopée serveur), via l'espace membre quand `membres_groupe.role ∈ {leader, co-leader}`.
- Approuve les demandes d'adhésion de son groupe ; nouvelle adhésion ⇒ notification au leader.

### Responsable national — `/admin/groupes`
1. Crée une cellule **dans son pays** (`plateforme_id` obligatoire, `pays` scopé).
2. Nomme un **responsable** (`responsable_id`) et des leaders locaux (`membres_groupe.role`).
3. Suit l'effectif (`membres_count`) ; valide la multiplication (V2).

### Admin / Super Admin — `/admin/groupes`
- CRUD global toutes plateformes + onglet **Demandes** (existant conservé).

### Intégration — cellule d'accueil
- Le responsable d'intégration affecte le nouveau croyant à une **cellule d'accueil** (scoping `responsable_id` / `pays`, déjà livré).
- L'affectation devient le groupe **principal** (`is_primary`) → `profiles.groupe_cellule_id` + `berger_id`.

## 3. Fiche 360° — section Communauté
- Groupe principal (`is_primary`), appartenances, rôle local, responsable.
- Remplace l'affichage `group_join_requests` par `membres_groupe`.

## 4. Public — `/groupes`
- Annuaire des groupes actifs par plateforme (lecture seule, SEO conservé).
