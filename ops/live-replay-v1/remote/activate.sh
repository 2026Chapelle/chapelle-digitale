#!/usr/bin/env bash
# Citadelle Live & Replay V1 - ACTIVATION CONTROLEE (apres GO distinct).
#
# Production = dossier reel (pas un lien symbolique). Bascule par DOUBLE RENOMMAGE
# sur le meme systeme de fichiers (aucune copie par-dessus la prod, aucun rsync --delete) :
#   1. citadelle            -> citadelle.prev-<BUILD_ACTIF>-<STAMP>   (conservee intacte)
#   2. <staging prepare>    -> citadelle
#   3. tmp/restart.txt      -> redemarrage Passenger UNIQUE
# Retour arriere = renommages inverses (secondes), sans extraction.
# .env / .env.local / .env.production / .htaccess / app.js / logs sont recopies
# depuis la prod vers le staging AVANT la bascule (jamais depuis le paquet).
#
# Sans CONFIRM=GO-ACTIVATE-<BUILD_PREPARE> : simulation (controles seulement, aucune ecriture).
# Aucune commande rm : rien n'est supprime (ni prod precedente, ni sauvegarde, ni staging).

set -u
set -o pipefail
export LC_ALL=C

: "${HOME_USER:=/home/frprszbd}"
: "${APP:=${HOME_USER}/citadelle}"
: "${STAGING:=${HOME_USER}/citadelle-staging/run10-d1492c2/prepared-fixed}"
: "${RELEASES:=${HOME_USER}/releases}"
: "${EXPECTED_ACTIVE_BUILD_ID:=mOo2-hqdQzEOxdJn1siQz}"
: "${EXPECTED_PREPARED_BUILD_ID:=w-q27AfjfpNh_tCWsSKH9}"
: "${BACKUP_ARCHIVE:=}"
: "${BACKUP_SHA256:=}"
: "${CONFIRM:=}"
: "${AUTO_ROLLBACK:=1}"
: "${DOMAIN:=https://citadelle.chapelleduroyaume.org}"
: "${PROD_REF:=nvyuyffywnuollaxguen}"
: "${HEALTH_TIMEOUT:=120}"
: "${SMOKE_PATHS:=/ /live /login /register}"
STAMP="${STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"

PARENT="$(dirname "$APP")"
PREV="${PARENT}/$(basename "$APP").prev-${EXPECTED_ACTIVE_BUILD_ID}-${STAMP}"
FAILED="${PARENT}/$(basename "$APP").failed-${EXPECTED_PREPARED_BUILD_ID}-${STAMP}"
STATE="${RELEASES}/activation-${EXPECTED_PREPARED_BUILD_ID}-${STAMP}.state"
LOCK="${RELEASES}/.citadelle-activation.lock"
DRY=1; [ "$CONFIRM" = "GO-ACTIVATE-${EXPECTED_PREPARED_BUILD_ID}" ] && DRY=0
LOCKED=0

say() { printf '%s\n' "$*"; }
release_lock() { [ "$LOCKED" = 1 ] && rmdir "$LOCK" 2>/dev/null; LOCKED=0; }
die() { say "RESULT|FAIL|$*"; release_lock; say "ACTIVATION_END|FAIL"; exit 1; }
bid() { [ -f "$1/.next/BUILD_ID" ] && tr -d '\r\n\t ' < "$1/.next/BUILD_ID"; }
http() { curl -s -o "${2:-/dev/null}" -w '%{http_code}' --max-time 20 "$DOMAIN$1" 2>/dev/null || echo 000; }

say "INFO|SCRIPT|activate.sh 2026-11-16.1"
say "INFO|MODE|$([ $DRY = 1 ] && echo SIMULATION || echo EXECUTION)"
say "INFO|APP|${APP}"; say "INFO|STAGING|${STAGING}"; say "INFO|PREV|${PREV}"

# ---------- Controles prealables (identiques en simulation) ----------
for t in curl sha256sum tar stat cmp mv cp touch; do command -v "$t" >/dev/null 2>&1 || die "outil manquant: $t"; done
[ -L "$APP" ] && die "${APP} est un lien symbolique : procedure non applicable"
[ -d "$APP" ] || die "${APP} introuvable"
[ "$(bid "$APP")" = "$EXPECTED_ACTIVE_BUILD_ID" ] || die "BUILD_ID prod $(bid "$APP") != ${EXPECTED_ACTIVE_BUILD_ID}"
say "CHECK|PROD_BUILD_ID|PASS|${EXPECTED_ACTIVE_BUILD_ID}"
[ -L "$APP/node_modules" ] && die "prod node_modules est un lien symbolique (selecteur CloudLinux) : revue manuelle requise"
[ -d "$STAGING" ] && [ ! -L "$STAGING" ] || die "staging introuvable ou lien symbolique"
[ "$(bid "$STAGING")" = "$EXPECTED_PREPARED_BUILD_ID" ] || die "BUILD_ID staging $(bid "$STAGING") != ${EXPECTED_PREPARED_BUILD_ID}"
for f in app.js server.js package.json; do [ -f "$STAGING/$f" ] || die "staging: $f absent"; done
for d in .next/static .next/server node_modules public; do [ -d "$STAGING/$d" ] || die "staging: $d absent"; done
say "CHECK|STAGING|PASS|${EXPECTED_PREPARED_BUILD_ID}, structure complete"
[ "$(stat -c %d "$PARENT")" = "$(stat -c %d "$STAGING")" ] || die "staging et prod sur des FS differents"
[ -w "$PARENT" ] && [ -w "$(dirname "$STAGING")" ] || die "repertoire parent non inscriptible"
[ -e "$PREV" ] && die "${PREV} existe deja"
[ -e "$FAILED" ] && die "${FAILED} existe deja"
say "CHECK|SWAP_FEASIBLE|PASS|meme FS, parents inscriptibles"
[ -n "$BACKUP_ARCHIVE" ] && [ -n "$BACKUP_SHA256" ] || die "BACKUP_ARCHIVE et BACKUP_SHA256 obligatoires (sauvegarde GO prealable)"
[ -f "$BACKUP_ARCHIVE" ] || die "sauvegarde introuvable: ${BACKUP_ARCHIVE}"
bs="$(sha256sum "$BACKUP_ARCHIVE" | awk '{print $1}')"
[ "$bs" = "$(printf '%s' "$BACKUP_SHA256" | tr 'A-F' 'a-f')" ] || die "SHA-256 sauvegarde ${bs} != attendu"
ab="$(tar -xzOf "$BACKUP_ARCHIVE" "$(basename "$APP")/.next/BUILD_ID" 2>/dev/null | tr -d '\r\n\t ')"
[ "$ab" = "$EXPECTED_ACTIVE_BUILD_ID" ] || die "BUILD_ID dans la sauvegarde: '${ab}'"
say "CHECK|BACKUP|PASS|${BACKUP_ARCHIVE} sha256 OK, BUILD_ID ${ab}"
code="$(http /)"
[ "$code" = 200 ] || die "HTTP / depuis le serveur = ${code} avant bascule : controles post-activation impossibles"
say "CHECK|HTTP_HOME_BEFORE|PASS|${code}"

if [ $DRY = 1 ]; then
  say "PLAN|1|copier .env* .htaccess app.js logs/ de ${APP} vers ${STAGING} (cp -p, sans suppression)"
  say "PLAN|2|mv -T ${APP} ${PREV}"
  say "PLAN|3|mv -T ${STAGING} ${APP}"
  say "PLAN|4|touch ${APP}/tmp/restart.txt (redemarrage Passenger unique)"
  say "PLAN|5|controles HTTP (200 sur /, manifest du build ${EXPECTED_PREPARED_BUILD_ID}, routes, fuites env)"
  say "PLAN|6|si echec et AUTO_ROLLBACK=1 : mv ${APP} ${FAILED} ; mv ${PREV} ${APP} ; restart"
  say "RESULT|DRY_RUN|aucune ecriture. Pour executer : CONFIRM=GO-ACTIVATE-${EXPECTED_PREPARED_BUILD_ID}"
  say "ACTIVATION_END|DRY_RUN"; exit 0
fi

# ---------- Execution ----------
mkdir -p "$RELEASES" || die "creation ${RELEASES} impossible"
mkdir "$LOCK" 2>/dev/null || die "verrou present (${LOCK}) : une activation est deja en cours ?"
LOCKED=1

# 1. Fichiers proteges : prod -> staging (jamais depuis le paquet)
for f in .env .env.local .env.production .htaccess app.js; do
  if [ -f "$APP/$f" ]; then
    if [ -f "$STAGING/$f" ] && ! cmp -s "$APP/$f" "$STAGING/$f"; then say "INFO|PROTECTED_DIFF|${f} (version prod conservee)"; fi
    cp -p "$APP/$f" "$STAGING/$f" || die "copie ${f} impossible"
    cmp -s "$APP/$f" "$STAGING/$f" || die "copie ${f} non conforme"
    say "CHECK|PRESERVED|PASS|${f}"
  fi
done
if [ -d "$APP/logs" ]; then
  mkdir -p "$STAGING/logs" && cp -a "$APP/logs/." "$STAGING/logs/" || die "copie logs impossible"
  say "CHECK|PRESERVED|PASS|logs/"
fi
mkdir -p "$STAGING/tmp" || die "creation tmp/ impossible"

{ echo "STAMP=${STAMP}"; echo "APP=${APP}"; echo "PREV=${PREV}"; echo "FAILED=${FAILED}"
  echo "STAGING_ORIGINAL=${STAGING}"; echo "ACTIVE_BUILD_ID=${EXPECTED_ACTIVE_BUILD_ID}"
  echo "PREPARED_BUILD_ID=${EXPECTED_PREPARED_BUILD_ID}"; echo "BACKUP_ARCHIVE=${BACKUP_ARCHIVE}"
  echo "BACKUP_SHA256=${BACKUP_SHA256}"; } > "$STATE" || die "ecriture etat impossible"
say "INFO|STATE|${STATE}"

# 2-3. Double renommage
mv -T "$APP" "$PREV" || die "mv prod -> prev impossible (prod intacte)"
if ! mv -T "$STAGING" "$APP"; then
  mv -T "$PREV" "$APP" && touch "$APP/tmp/restart.txt" 2>/dev/null
  die "mv staging -> prod impossible ; prod precedente remise en place"
fi
echo "SWITCHED=1" >> "$STATE"
[ "$(bid "$APP")" = "$EXPECTED_PREPARED_BUILD_ID" ] && say "CHECK|SWITCH|PASS|${APP} = ${EXPECTED_PREPARED_BUILD_ID}" \
  || say "CHECK|SWITCH|FAIL|BUILD_ID inattendu apres bascule"

# 4. Redemarrage Passenger unique
mkdir -p "$APP/tmp" && touch "$APP/tmp/restart.txt"
say "INFO|RESTART|touch ${APP}/tmp/restart.txt"

# 5. Controles
OK=1
[ "$(bid "$APP")" = "$EXPECTED_PREPARED_BUILD_ID" ] || OK=0
code=000; waited=0
while [ $waited -lt "$HEALTH_TIMEOUT" ]; do
  code="$(http /)"; [ "$code" = 200 ] && break
  sleep 3; waited=$((waited+3))
done
say "CHECK|HTTP_HOME|$([ "$code" = 200 ] && echo PASS || echo FAIL)|${code} apres ${waited}s"
[ "$code" = 200 ] || OK=0
mc="$(http "/_next/static/${EXPECTED_PREPARED_BUILD_ID}/_buildManifest.js")"
say "CHECK|SERVED_BUILD|$([ "$mc" = 200 ] && echo PASS || echo FAIL)|manifest ${EXPECTED_PREPARED_BUILD_ID} -> ${mc}"
[ "$mc" = 200 ] || OK=0
for p in $SMOKE_PATHS; do
  c="$(http "$p")"
  case "$c" in 5*|000) say "CHECK|SMOKE|FAIL|${c} ${p}"; OK=0;; *) say "CHECK|SMOKE|PASS|${c} ${p}";; esac
done
HTML="${STATE%.state}.home.html"
http / "$HTML" >/dev/null
lo=$(grep -cE '(localhost|127\.0\.0\.1):5432[0-9]|sb-(localhost|127\.0\.0\.1)-auth-token' "$HTML" 2>/dev/null); lo=${lo:-0}
ph=$(grep -c 'placeholder\.supabase\.co' "$HTML" 2>/dev/null); ph=${ph:-0}
say "INFO|LOCALHOST_LEAK|${lo}"; say "INFO|PLACEHOLDER_SUPABASE|${ph}"
grep -q "$PROD_REF" "$HTML" 2>/dev/null && say "INFO|PROD_REF|present" || say "INFO|PROD_REF|absent du HTML (info)"
if [ "$lo" != 0 ] || [ "$ph" != 0 ]; then say "CHECK|ENV_LEAK|FAIL|fuite detectee"; OK=0; else say "CHECK|ENV_LEAK|PASS|aucune fuite"; fi

if [ $OK = 1 ]; then
  [ -d "$PREV/logs" ] && cp -a -u "$PREV/logs/." "$APP/logs/" 2>/dev/null
  echo "RESULT=ACTIVATED" >> "$STATE"
  release_lock
  say "ROLLBACK_READY|STATE=${STATE}"
  say "RESULT|PASS|production = ${EXPECTED_PREPARED_BUILD_ID} ; precedente conservee dans ${PREV}"
  say "ACTIVATION_END|PASS"; exit 0
fi

# 6. Echec
if [ "$AUTO_ROLLBACK" != 1 ]; then
  echo "RESULT=FAILED_NO_AUTO_ROLLBACK" >> "$STATE"; release_lock
  say "RESULT|FAIL|controles en echec ; AUTO_ROLLBACK=0 -> lancer rollback.sh avec STATE=${STATE}"
  say "ACTIVATION_END|FAIL"; exit 1
fi
say "INFO|AUTO_ROLLBACK|demarrage"
mv -T "$APP" "$FAILED" || die "ROLLBACK: mv prod -> failed impossible (intervention manuelle : ${STATE})"
mv -T "$PREV" "$APP" || die "ROLLBACK: mv prev -> prod impossible (URGENT : ${PREV} -> ${APP})"
mkdir -p "$APP/tmp" && touch "$APP/tmp/restart.txt"
echo "RESULT=AUTO_ROLLED_BACK FAILED_KEPT=${FAILED}" >> "$STATE"
code=000; waited=0
while [ $waited -lt "$HEALTH_TIMEOUT" ]; do code="$(http /)"; [ "$code" = 200 ] && break; sleep 3; waited=$((waited+3)); done
say "CHECK|ROLLBACK_BUILD_ID|$([ "$(bid "$APP")" = "$EXPECTED_ACTIVE_BUILD_ID" ] && echo PASS || echo FAIL)|$(bid "$APP")"
say "CHECK|ROLLBACK_HTTP_HOME|$([ "$code" = 200 ] && echo PASS || echo FAIL)|${code}"
release_lock
say "RESULT|FAIL|activation annulee, production restauree (${EXPECTED_ACTIVE_BUILD_ID}) ; release echouee conservee dans ${FAILED}"
say "ACTIVATION_END|ROLLED_BACK"; exit 1
