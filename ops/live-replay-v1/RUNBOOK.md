# Citadelle Live & Replay V1 : préactivation, activation et retour arrière (N0C)

| | |
|---|---|
| Build actif | `mOo2-hqdQzEOxdJn1siQz` |
| Build préparé | `w-q27AfjfpNh_tCWsSKH9` |
| Commit source | `d1492c290552cf256be41ce2731023b86f774343` |
| Staging | `/home/frprszbd/citadelle-staging/run10-d1492c2/prepared-fixed` |
| Production | `/home/frprszbd/citadelle` (**dossier réel, pas un lien symbolique**) |
| Sauvegardes | `/home/frprszbd/releases/backups` |

Chaque étape qui écrit sur le serveur exige une phrase GO **exacte**, puis sa re-saisie.
Sans phrase GO, les scripts tournent en **simulation** : ils font tous leurs contrôles et n'écrivent rien.

| Étape | Écrit sur le serveur ? | Phrase GO |
|---|---|---|
| Préflight | non (lecture seule) | aucune (`-Go` refusé) |
| Sauvegarde | `~/releases/backups` uniquement | `GO-BACKUP-mOo2-hqdQzEOxdJn1siQz` |
| Activation | prod + staging + redémarrage Passenger | `GO-ACTIVATE-w-q27AfjfpNh_tCWsSKH9` |
| Retour arrière | prod + redémarrage Passenger | `GO-ROLLBACK-mOo2-hqdQzEOxdJn1siQz` |

Le cron reste inactif : aucun script ne le touche. Le préflight vérifie seulement qu'il est inactif (C13).

## 1. Correctif du préflight (`comm: /dev/fd/...`)

**Cause probable.** Le runner d'origine n'est pas dans le dépôt : il est sur le poste Windows, donc ce diagnostic n'a pas été vérifié sur sa source.
`comm <(liste1) <(liste2)` repose sur la substitution de processus, qui passe par `/dev/fd/N`.
Ces descripteurs peuvent manquer dans une session SSH N0C (CageFS, shell non interactif, stdin non TTY).
Le runner ci-dessous **remplace** l'ancien : il n'est pas un correctif ligne à ligne.

**Correctif** (`remote/preflight-runner.sh`) :
- aucune substitution `<( )`, aucun `comm`, aucune dépendance à `/dev/fd` ;
- les listes vont dans des fichiers d'un dossier `mktemp -d` privé, supprimé à la fin ;
- la différence d'ensembles est calculée avec `awk`, qui n'exige pas d'entrées triées ;
- le code retour de chaque `tar`, `find`, `awk` et `grep` est vérifié : une erreur donne FAIL ;
- côté Windows, le verdict n'est PASS que si les 14 contrôles sont présents **et** à PASS, le marqueur `RUNNER_END` est reçu et le code SSH vaut 0. Un contrôle absent, une sortie tronquée ou une erreur SSH donnent FAIL ;
- le script bash est envoyé encodé en base64 dans l'argument SSH : pas de stdin PowerShell, pas de CRLF, pas d'altération d'encodage par PowerShell 5.1.

Contrôles C01 à C14 :

| ID | Contrôle |
|---|---|
| C01 | outils présents (sha256sum, tar, gzip, awk…) et espace temporaire |
| C02 | la production est un dossier réel (un lien symbolique donne FAIL : procédure à revoir) |
| C03 | BUILD_ID de la production = `mOo2-hqdQzEOxdJn1siQz` |
| C04 | structure du staging : app.js, server.js, package.json, .next, node_modules (pas un lien), public |
| C05 | BUILD_ID du staging = `w-q27AfjfpNh_tCWsSKH9` |
| C06 | SHA-256 du paquet = valeur attendue, et le fichier `.sha256` voisin est cohérent |
| C07 | BUILD_ID **lu dans le paquet** = build préparé |
| C08 | commit `d1492c2…` attesté par un manifeste (sinon FAIL ; un autre commit dans le même manifeste donne aussi FAIL) |
| C09 | liste des fichiers du paquet = liste du staging. Écarts autorisés : `.env*`, `.htaccess`, `tmp/`, `logs/` |
| C10 | contenu identique au paquet (`tar --compare`, sans extraction). Un écart de date ou de droits est seulement compté |
| C11 | `LOCALHOST_LEAK=0`, `PLACEHOLDER_SUPABASE=0`, référence `nvyuyffywnuollaxguen` présente |
| C12 | bascule possible : prod et staging sur le même système de fichiers, dossiers parents inscriptibles |
| C13 | aucune ligne cron active liée à Citadelle ou à la synchronisation |
| C14 | `app.js` et `.env` présents en prod. Seules la présence et l'égalité sont vérifiées, jamais les valeurs |

Inspection Passenger, informative et en lecture seule :
- droits des dossiers parents ;
- `node_modules` de la prod : dossier ou lien CloudLinux ;
- `tmp/restart.txt` et `~/nodevenv` ;
- directives `Passenger*` des `.htaccess` : nom et chemin seulement, jamais les lignes `SetEnv` ;
- processus `node` et Passenger : pid, exécutable et dossier courant. La ligne de commande n'est jamais affichée ;
- code HTTP de `/` et du `_buildManifest.js` du build actif.

## 2. Mécanisme existant analysé, et ce qui change

`scripts/deploy-intelligence-5b.sh` (déploiement protégé actuel) :
- quand la prod n'est pas un lien symbolique, il copie le nouveau build avec `rsync -a` sans `--delete` **par-dessus** la prod ;
- son retour arrière extrait l'archive **par-dessus** la prod (`tar -xzf … -C citadelle`).

Défauts de cette approche :
1. la bascule n'est pas atomique : pendant le `rsync`, la prod mélange l'ancien et le nouveau build ;
2. le retour arrière laisse en place les fichiers propres au nouveau build ;
3. une extraction interrompue laisse la prod incohérente.

Nouvelle procédure (`remote/activate.sh`) : **double renommage** sur le même système de fichiers.

```
citadelle                      -> citadelle.prev-mOo2-hqdQzEOxdJn1siQz-<STAMP>   (conservé intact)
citadelle-staging/.../prepared-fixed -> citadelle
touch citadelle/tmp/restart.txt  (redémarrage Passenger unique)
```

- `PassengerAppRoot` pointe toujours vers `/home/frprszbd/citadelle` : le chemin ne change pas.
- Le processus Node en cours garde son dossier courant (inode de `prev`) jusqu'au redémarrage. Seule une requête qui démarrerait un processus entre les deux `mv` (quelques microsecondes) pourrait échouer.
- `.env`, `.env.local`, `.env.production`, `.htaccess`, `app.js` et `logs/` sont recopiés **depuis la prod** vers le staging avant la bascule, jamais depuis le paquet.
- Aucun `rm`, aucun `rsync`. Une sauvegarde vérifiée (chemin + SHA-256 + BUILD_ID) est obligatoire.
- Un verrou empêche deux activations simultanées.
- Contrôles après redémarrage :
  - `/` répond 200 (attente jusqu'à 120 s) ;
  - `/_next/static/w-q27AfjfpNh_tCWsSKH9/_buildManifest.js` répond 200, ce qui prouve que **le nouveau serveur** répond ;
  - `/ /live /login /register` ne répondent ni en 5xx ni en 000 ;
  - le HTML ne contient ni fuite localhost ni placeholder Supabase.
- En cas d'échec, retour arrière automatique par renommages inverses. La release en échec est conservée dans `citadelle.failed-…`.

Retour arrière manuel (`remote/rollback.sh`) :
- **mode A** : renommages inverses à partir du fichier `.state`, en quelques secondes ;
- **mode B** : si `prev` a disparu, extraction de la sauvegarde dans un dossier **neuf** voisin, vérification du BUILD_ID, puis même double renommage. Jamais d'extraction par-dessus la prod.

## 3. Sauvegarde (`remote/backup-prod.sh`)

- La production est lue avec `tar --numeric-owner -C /home/frprszbd -czf … citadelle`. Sont conservés : les modes, les fichiers cachés (`.env`, `.next`, `.htaccess`) et les liens symboliques, stockés comme liens et jamais suivis.
- Les fichiers sont écrits sous `~/releases/backups/citadelle-prod-mOo2-hqdQzEOxdJn1siQz-<STAMP>.tar.gz` :
  - l'archive est d'abord écrite en `.partial`, puis renommée avec `mv -n` ;
  - mode `600`, car l'archive contient `.env` ;
  - à côté : `.sha256`, `.manifest.txt`, `.list.txt` et `.names.txt`.
- Vérifications : `gzip -t`, `sha256sum -c`, BUILD_ID lu **dans** l'archive, nombre d'entrées, de liens et de fichiers cachés comparé à la source, modes des fichiers clés, BUILD_ID de la prod relu à la fin.
- Aucune sauvegarde supprimée : le script ne contient aucun `rm`, refuse d'écraser un nom existant et compare l'inventaire de `backups/` avant et après.
- Un `tar` qui signale « file changed as we read it » donne un **WARN** seulement si le fichier est dans `logs/` ou `tmp/`. Partout ailleurs, c'est un FAIL.

## 4. Commandes Windows (PowerShell 5.1)

Préparation, une seule fois : extraire `citadelle-live-replay-v1-ops.zip` dans le dossier de travail, puis :

```powershell
cd "$env:USERPROFILE\Desktop\CITADELLE\work\LIVE-REPLAY-V1-PREACTIVATION\ops"
```

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force; Get-ChildItem -Recurse | Unblock-File
```

```powershell
$env:CITADELLE_SSH = 'citadelle-n0c'   # alias ~/.ssh/config, ou 'frprszbd@<hôte>' ; ajouter -SshPort si besoin
```

Chaque commande écrit son rapport dans `...\work\LIVE-REPLAY-V1-PREACTIVATION\reports\` et **le copie dans le presse-papiers**.

**a. Auto-test local** (sans SSH) :
```powershell
.\Citadelle-LiveReplayV1.ps1 -Action SelfTest
```

**b. Préflight**, en lecture seule, à lancer maintenant :
```powershell
.\Citadelle-LiveReplayV1.ps1 -Action Preflight -PackagePath '/home/frprszbd/releases/uploads/<PAQUET>.tar.gz' -ExpectedPackageSha256 '<SHA256_DU_PAQUET>'
```
Ajouter `-ManifestPath '<chemin du manifeste>'` si le commit est noté ailleurs que dans `<paquet>.manifest.txt` ou que dans les fichiers du dossier `run10-d1492c2`.

**c. Sauvegarde**, d'abord en simulation :
```powershell
.\Citadelle-LiveReplayV1.ps1 -Action Backup
```
Après le GO sauvegarde :
```powershell
.\Citadelle-LiveReplayV1.ps1 -Action Backup -Go GO-BACKUP-mOo2-hqdQzEOxdJn1siQz
```
Relever `BACKUP_PATH=` et `BACKUP_SHA256=` dans le rapport.

**d. Activation**, d'abord en simulation :
```powershell
.\Citadelle-LiveReplayV1.ps1 -Action Activate -BackupArchive '<BACKUP_PATH>' -BackupSha256 '<BACKUP_SHA256>'
```
Après le GO activation, qui couvre aussi le redémarrage Passenger :
```powershell
.\Citadelle-LiveReplayV1.ps1 -Action Activate -BackupArchive '<BACKUP_PATH>' -BackupSha256 '<BACKUP_SHA256>' -Go GO-ACTIVATE-w-q27AfjfpNh_tCWsSKH9
```
Relever `ROLLBACK_READY|STATE=` dans le rapport.

**e. Retour arrière manuel**, d'abord en simulation :
```powershell
.\Citadelle-LiveReplayV1.ps1 -Action Rollback -StateFile '<STATE>'
```
Après le GO retour arrière :
```powershell
.\Citadelle-LiveReplayV1.ps1 -Action Rollback -StateFile '<STATE>' -Go GO-ROLLBACK-mOo2-hqdQzEOxdJn1siQz
```

Secours sans PowerShell, depuis une session SSH déjà ouverte : `CONFIRM=<phrase> bash rollback.sh` avec `STATE=<fichier>`.
Autre secours : *Setup Node.js App*, puis **Restart**.

## 5. Ce qui reste à confirmer sur le serveur (preuves non encore produites)

- Le préflight réel C01 à C14. Les tests locaux portent sur une arborescence simulée.
- Le comportement réel de Passenger :
  - `PassengerAppRoot` et la ligne `PROCESS … cwd=` ;
  - `node_modules` de la prod : dossier ou lien CloudLinux. Un lien bloque l'activation, qui exige alors une revue manuelle ;
  - le code HTTP depuis le serveur. L'activation exige que `/` réponde 200 **avant** la bascule, sinon elle s'arrête.
- L'emplacement exact du paquet, son SHA-256 attendu et son manifeste de commit.
- L'espace disque : prod + archive + dossier `prev` coexistent. Voir `DISK_FREE_KB` et `SOURCE_SIZE_KB`.
