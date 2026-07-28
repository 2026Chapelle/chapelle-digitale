# WM-3.5 — DG-1 · Fiche de confirmation du gardien

| Champ | Valeur |
|-------|--------|
| Groupe | DG-1 — boîte canonique `8c12c2c748ecc387` (6 profils) |
| Statut | **HOLD** — gardien non formellement confirmé |
| Source | WM-3.3 (collecte lecture seule) + WM-3.4 (dry-run) — **aucune nouvelle sonde** |
| Action | **aucune** — ni fusion, ni désactivation |

---

## 1. Les 6 profils (anonymisés)

| Pseudonyme | Rôle | Créé | Rattachements | Activité | Compte réellement utilisé ? |
|------------|------|------|---------------|----------|-----------------------------|
| `DG-1-P1` | visiteur | 2026-05-30 | 1 | 2026-06 | **oui** (donnée réelle) |
| `DG-1-P2` | visiteur | 2026-07-04 | **5** | 2026-07 | **oui** (le plus utilisé) |
| `DG-1-P3` | **super_admin** | 2026-07-09 | **0** | 2026-07 | **non** (aucune donnée) |
| `DG-1-P4` | admin | 2026-07-09 | 0 | 2026-07 | non |
| `DG-1-P5` | berger | 2026-07-09 | 0 | 2026-07 | non |
| `DG-1-P6` | membre | 2026-07-09 | 0 | 2026-07 | non |

## 2. Contrôle de cohérence avec « compte de travail admin » (WM-3.3)

**Résultat : INCOHÉRENCE À TRANCHER.**

- Le candidat du plan `DG-1-P3` (super_admin) porte **0 rattachement** → au sens des données, il
  **n'est pas un compte réellement utilisé**.
- Les 4 comptes privilégiés (`P3`, `P4`, `P5`, `P6`) sont créés le **même jour (2026-07-09)** et
  ont **tous 0 donnée** → profil type **comptes de test de rôles**.
- Les seuls comptes réellement utilisés (données) sont les 2 `visiteur` (`P1`, `P2`), plus anciens.

Un « compte de travail admin » devrait cumuler **privilège + activité**. **Aucun** des 6 ne le fait :
soit le privilège (P3–P6, 0 donnée), soit l'activité (P1–P2, rôle visiteur), jamais les deux.

## 3. Confirmation attendue du décideur (bloquante)

- [ ] Les 4 comptes privilégiés du 2026-07-09 (`P3`, `P4`, `P5`, `P6`) sont des **comptes de test** : Oui / Non
- [ ] Le compte de travail réel de l'administrateur est : `DG-1-P__` **ou** hors de cette boîte : `__________`
- [ ] Si le gardien retenu porte 0 donnée, transférer vers lui les rattachements de `P1` + `P2` (2 formations, 2 vidéo, 2 notifs)

## 4. Recommandation finale du gardien (Claude)

Le choix dépend de la confirmation §3 :

| Si… | Gardien recommandé | Traitement |
|-----|--------------------|-----------|
| `P3` est confirmé compte de travail réel (les 3 autres = tests) | **`DG-1-P3`** (conforme au plan WM-3.4) | désactiver P4/P5/P6 (0 donnée) + transférer P1/P2 |
| Les 4 privilégiés sont **tous** des tests | **`DG-1-P2`** (compte réellement utilisé, 5 rattachements) | désactiver P3/P4/P5/P6 + transférer P1 |
| Le compte réel est hors boîte | gardien désigné hors DG-1 | transférer P1/P2, désactiver les 6 |

> **Tant que le §3 n'est pas coché : DG-1 reste HOLD, aucune fusion ni désactivation.**
