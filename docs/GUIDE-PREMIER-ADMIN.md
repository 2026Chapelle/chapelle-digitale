# Guide — Créer le premier administrateur

Il n'existe aucun administrateur par défaut (sécurité). Voici comment créer le vôtre.

---

## Comprendre les deux niveaux de protection

La Citadelle protège l'administration par **deux mécanismes complémentaires** :

1. **Porte du back-office** : la page `/admin/login` demande un **code d'accès**
   (`ADMIN_ACCESS_CODE`). En cas de succès, un cookie `cier_admin` est posé et
   ouvre tout `/admin/*`. → contrôle d'entrée commun à l'équipe d'administration.
2. **Rôle du compte** : la colonne `role` du profil (`admin`, `formateur`, …)
   pilote les **espaces et droits** côté membre/dashboards.

> Pour gérer les contenus dans `/admin/*`, le **code d'accès** suffit.
> Le **rôle** sert aux espaces personnalisés (`/member/dashboard/formateur`, etc.).

---

## Étape 1 — Définir le code d'accès (une fois)
Dans les variables d'environnement de l'hébergeur :
```
ADMIN_ACCESS_CODE=un-code-fort-et-secret
ADMIN_SESSION_TOKEN=un-jeton-long-aleatoire
```
Redémarrer l'application après modification.

## Étape 2 — Créer le compte utilisateur
Deux possibilités :
- **Via le site** : aller sur `https://VOTRE-DOMAINE/register`, créer le compte.
- **Via Supabase** : *Authentication → Users → Add user* (email + mot de passe).

Dans les deux cas, le trigger crée automatiquement la ligne dans `profiles`
(rôle initial `visiteur`).

## Étape 3 — Promouvoir le compte en administrateur
1. Supabase → **Table Editor → `profiles`**.
2. Repérer la ligne par son **email**.
3. Mettre la colonne **`role`** à `admin` (ou `super_admin`).
4. **Save**.

## Étape 4 — Se connecter au back-office
1. Aller sur `https://VOTRE-DOMAINE/admin/login`.
2. Saisir le **`ADMIN_ACCESS_CODE`**.
3. Accès au tableau de bord et à tous les modules.

## Étape 5 — Attribuer les rôles spécialisés (optionnel)
Pour les autres responsables, mettre `role` dans `profiles` à :
- `formateur` → débloque **Espace Formateur** (`/member/dashboard/formateur`).
- `responsable_integration` → débloque **Espace Intégration** (`/member/dashboard/integration`).
- `pasteur`, `berger`, `leader`, `disciple`, `membre` selon le profil.

---

## Sécurité — rappels
- Le rôle n'est **jamais** auto-attribuable à l'inscription (forcé `visiteur`).
- Garder `ADMIN_ACCESS_CODE` et `ADMIN_SESSION_TOKEN` confidentiels.
- En cas de fuite du code : changer les deux variables et redémarrer (déconnecte tout le monde du back-office).
