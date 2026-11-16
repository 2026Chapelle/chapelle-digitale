#!/usr/bin/env bash
# Citadelle Live & Replay V1 - SAUVEGARDE DE LA PRODUCTION (apres GO distinct).
#
# - Lit la production, ne la modifie jamais (tar en lecture seule, aucun rm, aucun mv dans APP).
# - Conserve permissions (mode stocke par tar), fichiers caches, liens symboliques (non suivis).
# - Verifie : gzip -t, presence et valeur de .next/BUILD_ID, nombre d'entrees,
#   nombre de liens symboliques et de fichiers caches, SHA-256 (sha256sum -c).
# - Ecrit uniquement dans BACKUPS (~/releases/backups), sous un nom horodate unique.
# - Ne supprime JAMAIS une sauvegarde : ce script ne contient aucune commande rm.
#   L'inventaire de BACKUPS avant/apres est compare (aucun fichier disparu).
#
# Sans CONFIRM=GO-BACKUP-<BUILD_ID> : mode simulation (verifications, aucune ecriture).

set -u
set -o pipefail
export LC_ALL=C
umask 077

: "${HOME_USER:=/home/frprszbd}"
: "${APP:=${HOME_USER}/citadelle}"
: "${BACKUPS:=${HOME_USER}/releases/backups}"
: "${EXPECTED_ACTIVE_BUILD_ID:=mOo2-hqdQzEOxdJn1siQz}"
: "${CONFIRM:=}"
STAMP="${STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"

say() { printf '%s\n' "$*"; }
die() { say "RESULT|FAIL|$*"; say "BACKUP_END|FAIL"; exit 1; }

say "INFO|SCRIPT|backup-prod.sh 2026-11-16.1"
say "INFO|DATE_UTC|$(date -u +%Y-%m-%dT%H:%M:%SZ)"
say "INFO|APP|${APP}"
say "INFO|BACKUPS|${BACKUPS}"

# 1. Prerequis
[ -L "$APP" ] && die "${APP} est un lien symbolique (non prevu)"
[ -d "$APP" ] || die "${APP} introuvable"
[ -f "$APP/.next/BUILD_ID" ] || die "BUILD_ID production absent"
pb="$(tr -d '\r\n\t ' < "$APP/.next/BUILD_ID")"
[ "$pb" = "$EXPECTED_ACTIVE_BUILD_ID" ] || die "BUILD_ID production ${pb} != ${EXPECTED_ACTIVE_BUILD_ID}"
say "CHECK|PROD_BUILD_ID|PASS|${pb}"
for t in tar gzip sha256sum awk find df du stat; do command -v "$t" >/dev/null 2>&1 || die "outil manquant: $t"; done

PARENT="$(dirname "$APP")"; NAME="$(basename "$APP")"
SRC_ENTRIES=$(cd "$PARENT" && find "$NAME" | wc -l | tr -d ' ')
SRC_LINKS=$(cd "$PARENT" && find "$NAME" -type l | wc -l | tr -d ' ')
SRC_HIDDEN=$(cd "$PARENT" && find "$NAME" | awk -F/ '{ for (i=2; i<=NF; i++) if ($i ~ /^\./) { c++; break } } END { print c+0 }')
SRC_KB=$(du -sk "$APP" | awk '{print $1}')
say "INFO|SOURCE_ENTRIES|${SRC_ENTRIES}"
say "INFO|SOURCE_SYMLINKS|${SRC_LINKS}"
say "INFO|SOURCE_HIDDEN|${SRC_HIDDEN}"
say "INFO|SOURCE_SIZE_KB|${SRC_KB}"

BASE="citadelle-prod-${EXPECTED_ACTIVE_BUILD_ID}-${STAMP}"
ARCHIVE="${BACKUPS}/${BASE}.tar.gz"
PARTIAL="${ARCHIVE}.partial"
say "INFO|ARCHIVE|${ARCHIVE}"

if [ "$CONFIRM" != "GO-BACKUP-${EXPECTED_ACTIVE_BUILD_ID}" ]; then
  if [ -d "$BACKUPS" ]; then
    FREE_KB=$(df -Pk "$BACKUPS" | awk 'NR==2{print $4}')
    say "INFO|BACKUPS_EXISTING|$(find "$BACKUPS" -maxdepth 1 -type f | wc -l | tr -d ' ') fichier(s)"
  else
    FREE_KB=$(df -Pk "$HOME_USER" | awk 'NR==2{print $4}')
    say "INFO|BACKUPS_EXISTING|dossier absent (sera cree)"
  fi
  say "INFO|FREE_KB|${FREE_KB}"
  [ "$FREE_KB" -gt "$SRC_KB" ] && say "CHECK|DISK_SPACE|PASS|libre ${FREE_KB} KB > source ${SRC_KB} KB" \
                               || say "CHECK|DISK_SPACE|FAIL|libre ${FREE_KB} KB <= source ${SRC_KB} KB"
  say "RESULT|DRY_RUN|aucune ecriture. Pour executer : CONFIRM=GO-BACKUP-${EXPECTED_ACTIVE_BUILD_ID}"
  say "BACKUP_END|DRY_RUN"
  exit 0
fi

# 2. Dossier de sauvegarde + inventaire avant
mkdir -p "$BACKUPS" || die "creation ${BACKUPS} impossible"
chmod 700 "$BACKUPS" 2>/dev/null || true
FREE_KB=$(df -Pk "$BACKUPS" | awk 'NR==2{print $4}')
[ "$FREE_KB" -gt "$SRC_KB" ] || die "espace insuffisant: libre ${FREE_KB} KB, source ${SRC_KB} KB"
[ -e "$ARCHIVE" ] && die "${ARCHIVE} existe deja (aucun ecrasement)"
[ -e "$PARTIAL" ] && die "${PARTIAL} existe deja (aucun ecrasement)"
INV_BEFORE="${BACKUPS}/.inventory-${STAMP}.before"
( cd "$BACKUPS" && find . -maxdepth 1 -type f ! -name ".inventory-${STAMP}.*" | sort ) > "$INV_BEFORE" || die "inventaire avant impossible"
say "INFO|BACKUPS_BEFORE|$(wc -l < "$INV_BEFORE" | tr -d ' ') fichier(s)"

# 3. Archive (lecture seule de la prod). Liens non suivis, modes stockes, dotfiles inclus.
set -o noclobber
TAR_ERR="${ARCHIVE}.tar-stderr.txt"
tar --numeric-owner -C "$PARENT" -czf "$PARTIAL" "$NAME" 2> "$TAR_ERR"; trc=$?
set +o noclobber
if [ $trc -eq 1 ]; then
  # Code 1 = fichier modifie pendant la lecture. Acceptable seulement dans logs/ ou tmp/.
  if grep -vE "^tar: ${NAME}/(logs|tmp)/.*(file changed as we read it|File shrank)" "$TAR_ERR" | grep -q .; then
    die "tar code 1 hors logs/tmp (voir ${TAR_ERR})"
  fi
  say "CHECK|TAR|WARN|fichiers de logs/tmp modifies pendant la lecture (voir ${TAR_ERR})"
elif [ $trc -ne 0 ]; then
  die "tar en erreur (code ${trc}, voir ${TAR_ERR})"
else
  say "CHECK|TAR|PASS|archive creee"
fi
mv -n "$PARTIAL" "$ARCHIVE" || die "renommage final impossible"
[ -f "$ARCHIVE" ] && [ ! -e "$PARTIAL" ] || die "renommage final non confirme"
chmod 600 "$ARCHIVE" 2>/dev/null || true

# 4. Verifications de l'archive
gzip -t "$ARCHIVE" || die "gzip -t en echec"
say "CHECK|GZIP_INTEGRITY|PASS|gzip -t OK"
LIST="${ARCHIVE}.list.txt"          # tar -tv (types et modes)
NAMES="${ARCHIVE}.names.txt"        # tar -t  (noms exacts)
tar -tvzf "$ARCHIVE" > "$LIST" || die "listage (tv) de l'archive impossible"
tar -tzf "$ARCHIVE" | sed 's:/$::' > "$NAMES" || die "listage (t) de l'archive impossible"
A_ENTRIES=$(wc -l < "$NAMES" | tr -d ' ')
A_LINKS=$(grep -c '^l' "$LIST")
A_HIDDEN=$(awk -F/ '{ for (i=2; i<=NF; i++) if ($i ~ /^\./) { c++; break } } END { print c+0 }' "$NAMES")
say "INFO|ARCHIVE_ENTRIES|${A_ENTRIES}"
say "INFO|ARCHIVE_SYMLINKS|${A_LINKS}"
# Les liens symboliques sont stockes comme liens ("l..."), jamais suivis.
[ "$A_LINKS" -eq "$SRC_LINKS" ] && say "CHECK|SYMLINKS|PASS|${A_LINKS} lien(s) conserve(s)" \
                                || die "liens symboliques: archive ${A_LINKS} != source ${SRC_LINKS}"
[ "$A_HIDDEN" -eq "$SRC_HIDDEN" ] && say "CHECK|HIDDEN_FILES|PASS|${A_HIDDEN} entree(s) cachee(s) (source ${SRC_HIDDEN})" \
                                  || die "fichiers caches: archive ${A_HIDDEN} != source ${SRC_HIDDEN}"
# Ecart d'entrees toleres seulement si tar a signale logs/tmp en mouvement.
if [ "$A_ENTRIES" -eq "$SRC_ENTRIES" ]; then say "CHECK|ENTRY_COUNT|PASS|${A_ENTRIES}"
elif [ $trc -eq 1 ]; then say "CHECK|ENTRY_COUNT|WARN|archive ${A_ENTRIES} / source ${SRC_ENTRIES} (logs/tmp actifs)"
else die "nombre d'entrees: archive ${A_ENTRIES} != source ${SRC_ENTRIES}"; fi
for req in "${NAME}/.next/BUILD_ID" "${NAME}/app.js" "${NAME}/server.js" "${NAME}/.env"; do
  grep -qxF "$req" "$NAMES" || die "${req} absent de l'archive"
done
say "CHECK|REQUIRED_FILES|PASS|.next/BUILD_ID app.js server.js .env presents (valeurs non lues)"
ab="$(tar -xzOf "$ARCHIVE" "${NAME}/.next/BUILD_ID" | tr -d '\r\n\t ')"
[ "$ab" = "$EXPECTED_ACTIVE_BUILD_ID" ] || die "BUILD_ID dans l'archive: ${ab}"
say "CHECK|ARCHIVE_BUILD_ID|PASS|${ab}"
# Permissions : comparaison du mode de quelques fichiers cles source vs archive.
for f in app.js server.js .env .next/BUILD_ID; do
  src_mode="$(stat -c %A "$APP/$f")"
  arc_mode="$(awk -v p="${NAME}/$f" '$NF==p {print $1}' "$LIST")"
  [ "$src_mode" = "$arc_mode" ] || die "mode different pour $f: source ${src_mode} archive ${arc_mode}"
done
say "CHECK|PERMISSIONS|PASS|modes identiques (app.js server.js .env BUILD_ID)"

# 5. SHA-256
( cd "$BACKUPS" && sha256sum "${BASE}.tar.gz" > "${BASE}.tar.gz.sha256" ) || die "calcul sha256 impossible"
( cd "$BACKUPS" && sha256sum -c "${BASE}.tar.gz.sha256" >/dev/null ) || die "sha256sum -c en echec"
SHA="$(awk '{print $1}' "${ARCHIVE}.sha256")"
say "CHECK|SHA256|PASS|${SHA}"
BYTES=$(stat -c %s "$ARCHIVE")

# 6. Production inchangee (BUILD_ID relu)
pb2="$(tr -d '\r\n\t ' < "$APP/.next/BUILD_ID")"
[ "$pb2" = "$EXPECTED_ACTIVE_BUILD_ID" ] || die "BUILD_ID production a change pendant la sauvegarde"
say "CHECK|PROD_UNCHANGED|PASS|BUILD_ID production toujours ${pb2}"

# 7. Aucune sauvegarde supprimee
INV_AFTER="${BACKUPS}/.inventory-${STAMP}.after"
( cd "$BACKUPS" && find . -maxdepth 1 -type f ! -name ".inventory-${STAMP}.*" | sort ) > "$INV_AFTER" || die "inventaire apres impossible"
LOST=$(awk 'NR==FNR { a[$0]=1; next } !($0 in a)' "$INV_AFTER" "$INV_BEFORE" | wc -l | tr -d ' ')
[ "$LOST" -eq 0 ] || die "${LOST} fichier(s) de sauvegarde disparu(s) !"
say "CHECK|NO_BACKUP_DELETED|PASS|avant $(wc -l < "$INV_BEFORE" | tr -d ' ') / apres $(wc -l < "$INV_AFTER" | tr -d ' ')"

# 8. Manifeste
{
  echo "archive=${ARCHIVE}"; echo "sha256=${SHA}"; echo "bytes=${BYTES}"
  echo "build_id=${ab}"; echo "source=${APP}"; echo "stamp=${STAMP}"
  echo "entries=${A_ENTRIES}"; echo "symlinks=${A_LINKS}"
  echo "restore_hint=tar --numeric-owner -xpzf ${ARCHIVE} -C <dossier_vide>"
} > "${ARCHIVE}.manifest.txt"
say "INFO|MANIFEST|${ARCHIVE}.manifest.txt"
say "BACKUP_PATH=${ARCHIVE}"
say "BACKUP_SHA256=${SHA}"
say "BACKUP_BYTES=${BYTES}"
say "BACKUP_END|PASS"
