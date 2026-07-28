# WM3-CLOSURE — Remédiation PII

- **Date** : 2026-07-28
- **Mode** : correction ciblée d'une PII exposée dans un fichier versionné.

## Scan exhaustif (fichiers versionnés `docs-migration-wp/`)

`git grep -nIE '[A-Za-z0-9._%+-]+@…'` sur tout l'arbre suivi.

**1 seule occurrence d'email en clair** dans tout `docs-migration-wp/` versionné.

| Fichier:ligne | Valeur d'origine | Contexte |
|---------------|------------------|----------|
| `WM-2/audit-20260720-231559/evidence/t11-seo-options.tsv:5` | un email `@gmail.com` (valeur **non reproduite** ici) | valeur PHP sérialisée `s:5:"email";s:17:"…";` de l'option `rank_math_connect_data` |

## Correction appliquée

- l'email en clair → **`[EMAIL_REDACTED]`** (`s:5:"email";s:17:"[EMAIL_REDACTED]";`). Valeur d'origine non reproduite dans ce document.
- Format TSV conservé (3 colonnes, tabulations intactes).
- Aucune autre donnée modifiée.

## Vérification post-correction

- `git grep` email sur `docs-migration-wp/` versionné → **0 email en clair restant**.
- Ligne 5 : contient bien `[EMAIL_REDACTED]`.

## Manifestes affectés

**Aucun.** Le manifeste WM-2 (`AUDIT-MANIFEST.json`) ne hashe aucun fichier `evidence/` (0 sha256, liste seulement les `reports/`). Aucun `SHA256SUMS*` ne couvre WM-2. **Rien à régénérer côté WM-2.**

## Résidu documenté (non modifié, transparence)

La même ligne du fichier de données contient un **username** de service RankMath Connect (`s:7:"…"`), de sensibilité **moindre** (identifiant de service, non contact). Conformément à la consigne « ne modifier aucune autre donnée », il **n'a pas été masqué** dans le fichier de données de ce lot ; il est signalé ici (valeur non reproduite) pour arbitrage ultérieur éventuel. L'`api_key` de la ligne était déjà masqué (`*********`).

## Note d'intégrité (chaîne PHP sérialisée)

La valeur redacted (`[EMAIL_REDACTED]`, 16 caractères) ne correspond plus au préfixe de longueur `s:17:`. Sans incidence : `t11-seo-options.tsv` est un **artefact d'audit en lecture** (snapshot d'options WordPress), non destiné à être dé-sérialisé par l'application. La priorité de confidentialité prime sur la validité sérialisée de ce snapshot.

## Conclusion

R-04 **levée** : unique email en clair du dossier migration masqué, aucun checksum à régénérer, 0 email restant.
