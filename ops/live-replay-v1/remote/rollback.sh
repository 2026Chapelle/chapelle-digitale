#!/usr/bin/env bash
# Citadelle Live & Replay V1 - RETOUR ARRIERE MANUEL (apres GO distinct).
#
# Mode A (prefere) : renommages inverses depuis le fichier d'etat de l'activation
#   citadelle -> citadelle.rolledback-<BUILD_PREPARE>-<STAMP> ; citadelle.prev-... -> citadelle
# Mode B (secours, si le dossier prev n'existe plus) : extraction de la sauvegarde
#   dans un dossier NEUF a cote de la prod, verification BUILD_ID, puis meme double renommage.
#   Jamais d'extraction par-dessus la production.
# Rien n'est supprime. Sans CONFIRM=GO-ROLLBACK-<BUILD_ACTIF> : simulation.

set -u
set -o pipefail
export LC_ALL=C

: "${STATE:?STATE=<fichier .state de l activation> requis}"
: "${CONFIRM:=}"
: "${DOMAIN:=https://citadelle.chapelleduroyaume.org}"
: "${HEALTH_TIMEOUT:=120}"
STAMP="${STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"

say() { printf '%s\n' "$*"; }
die() { say "RESULT|FAIL|$*"; say "ROLLBACK_END|FAIL"; exit 1; }
bid() { [ -f "$1/.next/BUILD_ID" ] && tr -d '\r\n\t ' < "$1/.next/BUILD_ID"; }
http() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$DOMAIN$1" 2>/dev/null || echo 000; }
val() { awk -F= -v k="$1" '$1==k { sub(/^[^=]*=/, ""); print; exit }' "$STATE"; }

[ -f "$STATE" ] || die "fichier d'etat introuvable: ${STATE}"
APP="$(val APP)"; PREV="$(val PREV)"; ACTIVE="$(val ACTIVE_BUILD_ID)"; PREPARED="$(val PREPARED_BUILD_ID)"
BACKUP_ARCHIVE="$(val BACKUP_ARCHIVE)"; BACKUP_SHA256="$(val BACKUP_SHA256)"
[ -n "$APP" ] && [ -n "$ACTIVE" ] && [ -n "$PREPARED" ] || die "fichier d'etat incomplet"
PARENT="$(dirname "$APP")"; NAME="$(basename "$APP")"
OUT="${PARENT}/${NAME}.rolledback-${PREPARED}-${STAMP}"
DRY=1; [ "$CONFIRM" = "GO-ROLLBACK-${ACTIVE}" ] && DRY=0

say "INFO|SCRIPT|rollback.sh 2026-11-16.1"
say "INFO|MODE|$([ $DRY = 1 ] && echo SIMULATION || echo EXECUTION)"
say "INFO|APP|${APP} (BUILD_ID actuel: $(bid "$APP"))"
[ -L "$APP" ] && die "${APP} est un lien symbolique : procedure non applicable"
[ -e "$OUT" ] && die "${OUT} existe deja"

if [ "$(bid "$APP")" = "$ACTIVE" ]; then say "RESULT|PASS|la production est deja sur ${ACTIVE} : rien a faire"; say "ROLLBACK_END|NOOP"; exit 0; fi

MODE=""
if [ -n "$PREV" ] && [ -d "$PREV" ] && [ "$(bid "$PREV")" = "$ACTIVE" ]; then
  MODE=A; SRC="$PREV"
  say "CHECK|SOURCE|PASS|mode A : ${PREV} (BUILD_ID ${ACTIVE})"
else
  MODE=B
  [ -f "$BACKUP_ARCHIVE" ] || die "prev absent et sauvegarde introuvable (${BACKUP_ARCHIVE})"
  got="$(sha256sum "$BACKUP_ARCHIVE" | awk '{print $1}')"
  [ "$got" = "$BACKUP_SHA256" ] || die "SHA-256 sauvegarde ${got} != ${BACKUP_SHA256}"
  RESTORE="${PARENT}/${NAME}.restore-${ACTIVE}-${STAMP}"
  [ -e "$RESTORE" ] && die "${RESTORE} existe deja"
  SRC="${RESTORE}/${NAME}"
  say "CHECK|SOURCE|PASS|mode B : sauvegarde ${BACKUP_ARCHIVE} (sha256 OK) -> ${RESTORE}"
fi

if [ $DRY = 1 ]; then
  [ "$MODE" = B ] && say "PLAN|0|tar --numeric-owner -xpzf ${BACKUP_ARCHIVE} -C ${RESTORE} ; verifier BUILD_ID ${ACTIVE}"
  say "PLAN|1|copier .env* .htaccess app.js de ${APP} vers la source si plus recents (cp -p -u) et logs/ (cp -a -u)"
  say "PLAN|2|mv -T ${APP} ${OUT}"
  say "PLAN|3|mv -T ${SRC} ${APP}"
  say "PLAN|4|touch ${APP}/tmp/restart.txt ; controle HTTP + manifest ${ACTIVE}"
  say "RESULT|DRY_RUN|aucune ecriture. Pour executer : CONFIRM=GO-ROLLBACK-${ACTIVE}"
  say "ROLLBACK_END|DRY_RUN"; exit 0
fi

if [ "$MODE" = B ]; then
  mkdir "$RESTORE" || die "creation ${RESTORE} impossible"
  tar --numeric-owner -xpzf "$BACKUP_ARCHIVE" -C "$RESTORE" || die "extraction en echec (prod intacte)"
  [ "$(bid "$SRC")" = "$ACTIVE" ] || die "BUILD_ID extrait $(bid "$SRC") != ${ACTIVE} (prod intacte)"
  say "CHECK|RESTORE_EXTRACT|PASS|${SRC}"
fi
[ "$(stat -c %d "$PARENT")" = "$(stat -c %d "$SRC")" ] || die "source sur un autre FS"

# Secrets modifies pendant la periode active : on garde la version la plus recente.
for f in .env .env.local .env.production .htaccess; do
  [ -f "$APP/$f" ] && cp -p -u "$APP/$f" "$SRC/$f"
done
[ -d "$APP/logs" ] && mkdir -p "$SRC/logs" && cp -a -u "$APP/logs/." "$SRC/logs/"

mv -T "$APP" "$OUT" || die "mv prod -> rolledback impossible (prod inchangee)"
if ! mv -T "$SRC" "$APP"; then
  mv -T "$OUT" "$APP"; die "mv source -> prod impossible ; release remise en place"
fi
mkdir -p "$APP/tmp" && touch "$APP/tmp/restart.txt"
echo "ROLLBACK=${STAMP} MODE=${MODE} OUT=${OUT}" >> "$STATE"

code=000; waited=0
while [ $waited -lt "$HEALTH_TIMEOUT" ]; do code="$(http /)"; [ "$code" = 200 ] && break; sleep 3; waited=$((waited+3)); done
mc="$(http "/_next/static/${ACTIVE}/_buildManifest.js")"
say "CHECK|BUILD_ID|$([ "$(bid "$APP")" = "$ACTIVE" ] && echo PASS || echo FAIL)|$(bid "$APP")"
say "CHECK|HTTP_HOME|$([ "$code" = 200 ] && echo PASS || echo FAIL)|${code} apres ${waited}s"
say "CHECK|SERVED_BUILD|$([ "$mc" = 200 ] && echo PASS || echo FAIL)|manifest ${ACTIVE} -> ${mc}"
if [ "$(bid "$APP")" = "$ACTIVE" ] && [ "$code" = 200 ] && [ "$mc" = 200 ]; then
  say "RESULT|PASS|production restauree sur ${ACTIVE} ; release retiree conservee dans ${OUT}"; say "ROLLBACK_END|PASS"; exit 0
fi
say "RESULT|FAIL|production basculee sur ${ACTIVE} mais controles HTTP en echec : verifier Passenger (Setup Node.js App -> Restart)"
say "ROLLBACK_END|FAIL"; exit 1
