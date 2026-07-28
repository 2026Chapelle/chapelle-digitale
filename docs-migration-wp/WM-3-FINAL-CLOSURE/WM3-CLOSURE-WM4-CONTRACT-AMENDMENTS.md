# WM3-CLOSURE — Amendements du contrat WM-4 (ratifiés)

- **Date** : 2026-07-28
- **Fichier contractuel amendé** : `docs-migration-wp/WM-3.1/WM31-WM4-EXPORT-CONTRACT.md` (nouvelle **§12**).
- **Principe** : extension (règle des acquis), le texte d'origine des §4.1/§5.1/§6 est conservé ; la §12 ratifie et précise.

## Amendements ratifiés

### A1 — §5.1 : `QU-MED-MISSING-REFERENCE` N=5 → **N=3**
Seules les 3 vidéos obligatoires restent en quarantaine : `34548` (leçon 864), `34555` (865), `34577` (866). `quarantine.csv` = **3 lignes** (`WM-3.13/WM313-WM4-QUARANTINE-ROWS.csv`).
- Preuve du besoin : contrat `:203` (N=5) vs 3 lignes produites ; POST-10 `:296`.

### A2 — §4.1 : ajout de `RJ-MED-MISSING-REFERENCE` **N=2**
Nouveau code de rejet média pour `34549`, `34553` (pièces jointes facultatives → `ABANDON_REFERENCE`). `rejects.csv` = **2 lignes** (`WM-3.13/WM313-WM4-REJECT-ROWS.csv`).
- Preuve du besoin : §4.1 `:170-173` (code absent) ; contrainte `:154`.

### A2-bis — cloisonnement volumétrique (POST-05 / §6)
Les 2 lignes `RJ-MED-MISSING-REFERENCE` sont **hors des 383 fichiers physiques** et **hors du sous-total « 313 »**. Elles ne s'additionnent **pas** au terme `REJECTED = 313` du §6. Comptabilisées **uniquement** au titre de POST-05 (rejets `domain=media` hors des 383).

## Vérifications

| Contrôle | Résultat |
|----------|----------|
| Équation §6 média `383 = 69 + 313 + 1` | **INCHANGÉE** (fondé sur `:248-249`) |
| `quarantine.csv` | **3 lignes** (`WM313-WM4-QUARANTINE-ROWS.csv:2-4`) |
| `rejects.csv` | **2 lignes** (`WM313-WM4-REJECT-ROWS.csv:2-3`) |
| Contradiction WM-3.1 ↔ WM-3.13 | **AUCUNE** |
| POST-10 après ratification | attend QU=3 et RJ=2 |
| POST-05 après ratification | équation §6 inchangée (313) |

## Impact sur les manifestes

L'amendement modifie `WM31-WM4-EXPORT-CONTRACT.md` (17899 → 20315 o, 344 → 395 lignes). Les manifestes WM-3.1 ont été **régénérés** :
- `WM-3.1/manifests/SHA256SUMS.txt` : ligne du contrat mise à jour (`6372b94b…`).
- `WM-3.1/manifests/WM31-MANIFEST.json` : entrée du contrat (bytes/sha256/lines) + `files_bytes` 258648 → 261064.
- `sha256sum -c` WM-3.1 : **OK** après régénération.

## Conclusion

R-02 et R-03 **levées** : les amendements A1/A2/A2-bis sont **ratifiés** dans le contrat (§12), sans contradiction, avec manifestes régénérés. Contrat WM-4 = **COHÉRENT ET RATIFIÉ**.
