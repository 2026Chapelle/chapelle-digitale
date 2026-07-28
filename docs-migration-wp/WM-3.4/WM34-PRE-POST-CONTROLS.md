# WM-3.4 — Contrôles pré et post fusion

| Champ | Valeur |
|-------|--------|
| Lot | `WM-3.4` |
| Objet | Portes de contrôle encadrant l'exécution humaine de la fusion R1 |
| Statut | **spécification** — aucun contrôle exécuté sur écriture (aucune fusion) |

---

## 1. Contrôles PRÉ-fusion (avant `BEGIN`) — tous BLOQUANTS

| ID | Contrôle | Attendu |
|----|----------|---------|
| `PRE-M-01` | Confirmation DG-1 « comptes de test 2026-07-09 » documentée | présente |
| `PRE-M-02` | Double validation DG-2 obtenue | présente |
| `PRE-M-03` | Snapshot pré-fusion réalisé + `SHA256SUMS` (contrat de sauvegarde) | vérifié |
| `PRE-M-04` | Comptes de rattachement live = dry-run (`WM34-DEPENDENCY-TRANSFER-MATRIX.csv`) | égalité stricte |
| `PRE-M-05` | Gardien confirmé actif, secondaires identifiés par UUID | 1 gardien + N secondaires par groupe |
| `PRE-M-06` | Aucune connexion en écriture ouverte hors transaction de fusion | vrai |
| `PRE-M-07` | Fenêtre d'exécution : fusion en transaction unique par groupe | vrai |

## 2. Contrôles INTRA-transaction (avant `COMMIT`) — BLOQUANTS

| ID | Contrôle | Attendu |
|----|----------|---------|
| `IN-M-01` | Après re-point, `count` par table sur le gardien = colonne « après » du dry-run | DG-1 : 2/2/2/0/0/0 · DG-2 : 1/3/3/10/0/0 |
| `IN-M-02` | Conflit unique DG-2 `inscriptions_formation` résolu par dédup (progression = GREATEST) | 1 ligne gardien, meilleure valeur |
| `IN-M-03` | Aucune violation de contrainte unique levée par le SGBD | 0 erreur |
| `IN-M-04` | Somme des rattachements (gardien + désactivés) = somme pré-fusion | conservation stricte |
| `IN-M-05` | Échec d'un contrôle → `ROLLBACK` immédiat | appliqué |

## 3. Contrôles POST-fusion (après `COMMIT`) — BLOQUANTS

| ID | Contrôle | Attendu |
|----|----------|---------|
| `POST-M-01` | Profils **actifs** par empreinte canonique N2 | 1 pour `8c12c2c…` et `62a52607…` |
| `POST-M-02` | Groupes de doublons canoniques (actifs) = 0 | **`PRE-ID-03 = PASS`** |
| `POST-M-03` | Aucune ligne de rattachement ne pointe un UUID désactivé | 0 |
| `POST-M-04` | Total rattachements après = total avant (aucune perte) | égalité stricte |
| `POST-M-05` | Gardien conserve son rôle ; aucun cumul de privilège | rôle inchangé |
| `POST-M-06` | 3 actions pastorales (DG-2) présentes sur le gardien | 3 |
| `POST-M-07` | Comptes secondaires = `archived_at NOT NULL` (désactivés, non supprimés) | vrai |
| `POST-M-08` | Re-sonde lecture seule reproductible (2 lectures identiques) | vrai |

## 4. Enchaînement

```
PRE-M-01..07 (tous PASS)
   └─> BEGIN
         └─> transferts + dédup
               └─> IN-M-01..05 (tous PASS, sinon ROLLBACK)
                     └─> désactivation secondaires
                           └─> POST-M-01..08 (tous PASS)
                                 └─> COMMIT
                                       └─> re-sonde : PRE-ID-03 = PASS
```

Un seul contrôle BLOQUANT en échec → **pas de `COMMIT`**, `ROLLBACK`, retour à l'état initial.

---

## 5. Interdits respectés

Spécification uniquement · aucun contrôle exécuté sur donnée modifiée · aucune écriture.
