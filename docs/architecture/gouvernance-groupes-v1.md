# Gouvernance des Groupes — V1

> Qui crée, modifie, supervise, voit quoi. Citadelle est structurée : la structuration est descendante, l'animation est locale, l'adhésion est encadrée.

## 1. Principes

1. **Structuration descendante** — la création et la fermeture de groupes sont réservées aux **responsables nationaux** (dans leur pays) et aux **admins** (global). Un membre ne crée jamais de groupe en V1.
2. **Animation locale** — le **leader** (et co‑leader) anime son groupe, approuve les adhésions, mais ne crée ni ne ferme.
3. **Adhésion encadrée** — un membre **demande** à rejoindre ; un responsable/leader **approuve**.
4. **Plateforme obligatoire** — chaque groupe est rattaché à **une** des 8 plateformes officielles (`plateforme_id` NOT NULL).
5. **Responsable unique** — chaque groupe a un `responsable_id` (référence canonique). Les rôles locaux multiples se gèrent via `membres_groupe.role`.

## 2. Matrice de gouvernance

| Action | Membre | Leader / Co‑leader | Resp. national | Admin / Super Admin |
|---|:--:|:--:|:--:|:--:|
| Créer un groupe | ❌ | ❌ | ✅ (son pays) | ✅ (global) |
| Modifier infos/horaires | ❌ | ✅ (le sien) | ✅ (son pays) | ✅ |
| Archiver / fermer | ❌ | ❌ | ✅ | ✅ |
| Définir le `responsable_id` | ❌ | ❌ | ✅ | ✅ |
| Nommer leader / co‑leader local | ❌ | ❌ | ✅ | ✅ |
| Approuver une adhésion | ❌ | ✅ (son groupe) | ✅ | ✅ |
| Rejoindre / quitter | ✅ | — | — | ✅ |
| Voir les membres | ❌ | ✅ (les siens) | ✅ (son pays) | ✅ (global) |
| Multiplier une cellule (V2) | ❌ | proposer | ✅ | ✅ |

## 3. Périmètres (scoping serveur)

| Rôle | Périmètre | Mécanisme |
|---|---|---|
| Admin / Super Admin | global | `resolveGroupScope → 'all'` |
| Responsable / pasteur national | son/ses pays | `resolveGroupScope → 'nation'` + `nation_responsables` |
| Responsable intégration | ses cellules d'accueil | `resolveGroupScope → 'assigned'` (`responsable_id = lui`) |
| Leader / Co‑leader | son groupe uniquement | `membres_groupe.role` |
| Membre | annuaire public + ses groupes | `getSessionProfile` |

## 4. Cycle de vie d'un groupe

```
créé (responsable national/admin) → actif → [modifié par leader/responsable]
   → multiplication (V2) → archivé/fermé (responsable national/admin)
```

## 5. Cycle de vie d'une appartenance

```
demande (group_join_request, en_attente)
   → approbation → membres_groupe (statut=actif)  [premier groupe ⇒ is_primary]
   → changement de groupe principal (is_primary bascule)
   → sortie (statut=sorti, date_sortie)  [bascule auto du is_primary]
```

## 6. Garde-fous

- Écriture des groupes : **service role** uniquement (API scopée), jamais le client.
- Lecture annuaire : `authenticated`, groupes `statut='actif'` seulement.
- Aucune régression sur le scoping intégration (même patron, mêmes tables `nation_responsables`).
