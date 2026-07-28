# WM-3.12 — Contrôle de signature média

- **Lot** : WM-3.12
- **Date** : 2026-07-28
- **Mode** : inspection non intrusive (GET Range ≤ 1024 o), aucune sauvegarde de fichier.

## 0. Objet

Pour chaque réponse réseau, déterminer si le contenu servi est réellement une vidéo MP4 ou une page d'erreur, via le `content-type` et la signature binaire des premiers octets.

## 1. Rappel — signature MP4 attendue

Un fichier MP4 valide commence par une box `ftyp` : octets 4 à 7 = ASCII `ftyp` (hex `66 74 79 70`), précédés de 4 octets de taille. Exemple attendu : `.... ftypisom` / `ftypmp42`.

## 2. Observation

Les 3 réponses finales (après 301 → 404) présentent :

| Contrôle | 34548 | 34555 | 34577 |
|----------|-------|-------|-------|
| `content-type` | text/html; charset=UTF-8 | text/html; charset=UTF-8 | text/html; charset=UTF-8 |
| 16 premiers octets (hex) | `3c21 444f 4354 5950 4520 6874 6d6c 3e0a` | idem | idem |
| 16 premiers octets (ASCII) | `<!DOCTYPE html>\n` | `<!DOCTYPE html>\n` | `<!DOCTYPE html>\n` |
| `ftyp` à l'offset 4 | **ABSENT** | **ABSENT** | **ABSENT** |
| Marqueurs HTML/404 | présents | présents | présents |

## 3. Classification par référence

| media_id | Classification |
|----------|----------------|
| 34548 | `MEDIA_NOT_FOUND` — content-type HTML, corps `<!DOCTYPE html>`, HTTP 404 |
| 34555 | `MEDIA_NOT_FOUND` — idem |
| 34577 | `MEDIA_NOT_FOUND` — idem |

Aucune réponse ne relève de `MEDIA_LIVE_VALID` ni `MEDIA_LIVE_SUSPICIOUS` : le `content-type` n'est pas vidéo et la signature MP4 est absente. Il ne s'agit pas non plus de `MEDIA_ACCESS_BLOCKED` (pas de 401/403) ni de `MEDIA_SERVER_ERROR` (pas de 5xx) : c'est un **404 franc** avec page d'erreur.

## 4. Conclusion

Le contrôle de signature **confirme** le rapport de liveness : les 3 URLs ne servent pas de vidéo mais une page d'erreur HTML. Il n'existe donc aucun octet MP4 exploitable à l'URL d'origine. Aucun média n'a été enregistré sur disque.
