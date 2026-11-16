#!/usr/bin/env bash
# Banc de tests local des scripts distants (arborescence N0C simulee, aucun acces reseau).
# Usage : bash ops/live-replay-v1/tests/run-tests.sh [dossier_de_travail]
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; R="$HERE/../remote"
W="${1:-$(mktemp -d)}"; mkdir -p "$W"
PASSN=0; FAILN=0
ok() { echo "  OK   $*"; PASSN=$((PASSN+1)); }
ko() { echo "  FAIL $*"; FAILN=$((FAILN+1)); }
expect() { if eval "$2"; then ok "$1"; else ko "$1"; fi; }

ACT=mOo2-hqdQzEOxdJn1siQz; PRE=w-q27AfjfpNh_tCWsSKH9; COMMIT=d1492c290552cf256be41ce2731023b86f774343

mkapp() { # dir build_id
  mkdir -p "$1/.next/static/chunks" "$1/.next/server" "$1/node_modules/next" "$1/public/images"
  echo "$2" > "$1/.next/BUILD_ID"
  echo "require('./server.js')" > "$1/app.js"; echo "// server $2" > "$1/server.js"; echo '{}' > "$1/package.json"
  echo "var u='https://nvyuyffywnuollaxguen.supabase.co';/*$2*/" > "$1/.next/static/chunks/main.js"
  mkdir -p "$1/.next/static/$2"; echo "self.__BUILD_MANIFEST={}" > "$1/.next/static/$2/_buildManifest.js"
  echo "module.exports={}" > "$1/node_modules/next/index.js"; echo png > "$1/public/images/a.png"
  ln -sfn ../next/index.js "$1/node_modules/next/link.js"
}

setup() {
  rm -rf "$W/env"; H="$W/env/home/frprszbd"; mkdir -p "$H/releases/uploads" "$H/releases/backups"
  APP="$H/citadelle"; RUN="$H/citadelle-staging/run10-d1492c2"; STG="$RUN/prepared-fixed"
  mkapp "$APP" "$ACT"; printf 'SECRET=never-printed\n' > "$APP/.env"; chmod 600 "$APP/.env"
  echo "PassengerAppRoot $APP" > "$APP/.htaccess"; mkdir -p "$APP/logs" "$APP/tmp"; echo l1 > "$APP/logs/app.log"
  echo "old backup" > "$H/releases/backups/citadelle-old.tar.gz"
  mkdir -p "$W/env/build"; rm -rf "$W/env/build/pkg"; mkapp "$W/env/build/pkg" "$PRE"
  PKG="$H/releases/uploads/citadelle-linux-production.tar.gz"
  tar -czf "$PKG" -C "$W/env/build/pkg" .
  SHA="$(sha256sum "$PKG" | awk '{print $1}')"; echo "$SHA  citadelle-linux-production.tar.gz" > "$PKG.sha256"
  mkdir -p "$STG"; tar -xzf "$PKG" -C "$STG"; printf 'Commit Git complet : %s\n' "$COMMIT" > "$RUN/RELEASE_MANIFEST.txt"
  export HOME_USER="$H" APP STAGING="$STG" PACKAGE_PATH="$PKG" EXPECTED_PACKAGE_SHA256="$SHA" SKIP_HTTP=1 RELEASES="$H/releases" BACKUPS="$H/releases/backups"
}

# faux curl : "Passenger" sert le BUILD_ID present dans $APP ; FAKE_HTTP_FAIL=1 => 500 apres bascule
mkdir -p "$W/shim"
cat > "$W/shim/curl" <<'SH'
#!/usr/bin/env bash
out=/dev/null; url=""
while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift 2;; -w|--max-time) shift 2;; -*) shift;; *) url="$1"; shift;; esac; done
b="$(tr -d '\n' < "$APP/.next/BUILD_ID" 2>/dev/null)"
code=200
if [ "${FAKE_HTTP_FAIL:-0}" = 1 ] && [ "$b" = "w-q27AfjfpNh_tCWsSKH9" ]; then code=500; fi
case "$url" in */_next/static/*/_buildManifest.js) id="${url%/_buildManifest.js}"; id="${id##*/}"; [ "$id" = "$b" ] || code=404;; esac
[ "$out" != /dev/null ] && printf '<html>/_next/static/%s/ nvyuyffywnuollaxguen</html>' "$b" > "$out"
printf '%s' "$code"
SH
chmod +x "$W/shim/curl"; export PATH="$W/shim:$PATH"
export -f 2>/dev/null

echo "== Analyse statique"
code_only() { for f in "$@"; do grep -v '^[[:space:]]*#' "$f" | sed 's/[[:space:]]#.*$//'; done; }
expect "aucune substitution de processus <( ) dans remote/ (code)" "! code_only $R/*.sh | grep -q '<('"
expect "aucun appel a comm dans remote/ (code)" "! code_only $R/*.sh | grep -qw 'comm'"
expect "aucun rm dans backup/activate/rollback (code)" "! code_only $R/backup-prod.sh $R/activate.sh $R/rollback.sh | grep -qE '(^|[;&|(]|[[:space:]])rm[[:space:]]'"
expect "aucun rsync dans remote/ (code)" "! code_only $R/*.sh | grep -q 'rsync'"
for f in "$R"/*.sh; do expect "bash -n $(basename "$f")" "bash -n '$f'"; done
expect "pilote PS ASCII pur" "! LC_ALL=C grep -nP '[^\x00-\x7F]' $HERE/../Citadelle-LiveReplayV1.ps1"

echo "== Preflight nominal"
setup
out="$(bash "$R/preflight-runner.sh" 2>&1)"; rc=$?
echo "$out" > "$W/preflight-nominal.txt"
expect "code retour 0" "[ $rc -eq 0 ]"
expect "14 checks PASS" "[ \$(grep -c '^CHECK|C[0-9]*_[A-Z0-9_]*|PASS|' <<<\"\$out\") -eq 14 ]"
expect "RUNNER_END|14|0|0" "grep -q '^RUNNER_END|14|0|0' <<<\"\$out\""
expect "aucune valeur .env affichee" "! grep -q 'never-printed' <<<\"\$out\""

echo "== Preflight : erreur de comparaison => FAIL (jamais PASS)"
mkdir -p "$W/shim-tarfail"; cat > "$W/shim-tarfail/tar" <<'SH'
#!/usr/bin/env bash
for a in "$@"; do [ "$a" = "-tzf" ] && { echo "tar: simulated read error" >&2; exit 2; }; done
exec /usr/bin/tar "$@"
SH
chmod +x "$W/shim-tarfail/tar"
out="$(PATH="$W/shim-tarfail:$PATH" bash "$R/preflight-runner.sh" 2>&1)"; rc=$?
expect "C09 FAIL si tar -t echoue" "grep -q '^CHECK|C09_PACKAGE_FILELIST|FAIL' <<<\"\$out\""
expect "code retour != 0" "[ $rc -ne 0 ]"
# /dev/fd indisponible : le runner ne doit pas en dependre
out="$(bash -c 'exec 0</dev/null; bash "$1"' _ "$R/preflight-runner.sh" 2>&1)"
expect "fonctionne sans stdin (ssh -n)" "grep -q '^RUNNER_END|14|0|0' <<<\"\$out\""

echo "== Preflight : divergences"
echo "tampered" >> "$STAGING/server.js"
out="$(bash "$R/preflight-runner.sh" 2>&1)"
expect "contenu modifie => C10 FAIL" "grep -q '^CHECK|C10_PACKAGE_CONTENT|FAIL' <<<\"\$out\""
setup; echo x > "$STAGING/stray.txt"
out="$(bash "$R/preflight-runner.sh" 2>&1)"
expect "fichier en trop => C09 FAIL" "grep -q '^CHECK|C09_PACKAGE_FILELIST|FAIL' <<<\"\$out\""
setup; cp -p "$APP/.env" "$STAGING/.env"; mkdir -p "$STAGING/tmp"
out="$(bash "$R/preflight-runner.sh" 2>&1)"
expect ".env + tmp/ dans le staging autorises => PASS" "grep -q '^RUNNER_END|14|0|0' <<<\"\$out\""
setup; rm "$STAGING/node_modules/next/index.js"
out="$(bash "$R/preflight-runner.sh" 2>&1)"
expect "fichier manquant => C09 FAIL" "grep -q '^CHECK|C09_PACKAGE_FILELIST|FAIL' <<<\"\$out\""
setup; out="$(EXPECTED_PACKAGE_SHA256=deadbeef bash "$R/preflight-runner.sh" 2>&1)"
expect "mauvais sha => C06 FAIL" "grep -q '^CHECK|C06_PACKAGE_SHA256|FAIL' <<<\"\$out\""
setup; echo bad > "$PACKAGE_PATH.sha256"; out="$(bash "$R/preflight-runner.sh" 2>&1)"
expect "sidecar incoherent => C06 FAIL" "grep -q '^CHECK|C06_PACKAGE_SHA256|FAIL' <<<\"\$out\""
setup; out="$(EXPECTED_COMMIT=1111111111111111111111111111111111111111 bash "$R/preflight-runner.sh" 2>&1)"
expect "commit absent => C08 FAIL" "grep -q '^CHECK|C08_COMMIT|FAIL' <<<\"\$out\""
setup; echo OTHER > "$APP/.next/BUILD_ID"; out="$(bash "$R/preflight-runner.sh" 2>&1)"
expect "BUILD_ID prod different => C03 FAIL" "grep -q '^CHECK|C03_PROD_BUILD_ID|FAIL' <<<\"\$out\""
setup; echo "x='http://127.0.0.1:54321'" >> "$STAGING/.next/static/chunks/main.js"
out="$(bash "$R/preflight-runner.sh" 2>&1)"
expect "fuite localhost => C11 FAIL" "grep -q '^CHECK|C11_BUNDLE_GUARD|FAIL' <<<\"\$out\""
setup; mv "$APP" "$APP.real"; ln -s "$APP.real" "$APP"; out="$(bash "$R/preflight-runner.sh" 2>&1)"
expect "prod lien symbolique => C02 FAIL" "grep -q '^CHECK|C02_PROD_REAL_DIR|FAIL' <<<\"\$out\""
setup; out="$(PACKAGE_PATH= bash "$R/preflight-runner.sh" 2>&1)"
expect "paquet non fourni => C06..C10 FAIL" "[ \$(grep -cE '^CHECK\|C(06|07|09|10)_[A-Z0-9_]*\|FAIL' <<<\"\$out\") -eq 4 ]"

echo "== Sauvegarde"
setup
snap() { (cd "$APP" && find . -printf '%p %m %y %s %l\n' | sort | sha256sum); }
S0="$(snap)"
out="$(bash "$R/backup-prod.sh" 2>&1)"
expect "sans GO : DRY_RUN" "grep -q '^BACKUP_END|DRY_RUN' <<<\"\$out\""
expect "sans GO : rien ecrit" "[ \$(ls '$BACKUPS' | wc -l) -eq 1 ]"
out="$(CONFIRM=GO-BACKUP-$ACT STAMP=T1 bash "$R/backup-prod.sh" 2>&1)"; rc=$?
echo "$out" > "$W/backup-go.txt"
expect "GO : BACKUP_END|PASS" "grep -q '^BACKUP_END|PASS' <<<\"\$out\" && [ $rc -eq 0 ]"
A="$BACKUPS/citadelle-prod-$ACT-T1.tar.gz"
expect "archive + .sha256 presents" "[ -f '$A' ] && [ -f '$A.sha256' ]"
expect "sha256sum -c OK" "(cd '$BACKUPS' && sha256sum -c \"\$(basename '$A').sha256\" >/dev/null)"
expect "archive en 600" "[ \$(stat -c %a '$A') = 600 ]"
expect "ancienne sauvegarde conservee" "[ -f '$BACKUPS/citadelle-old.tar.gz' ]"
expect "production inchangee (arbre, modes, liens)" "[ \"\$(snap)\" = '$S0' ]"
mkdir -p "$W/restore"; rm -rf "$W/restore/"*; tar --numeric-owner -xpzf "$A" -C "$W/restore"
expect "restauration identique (diff -r)" "diff -r --no-dereference '$APP' '$W/restore/citadelle' >/dev/null"
expect "restauration : modes identiques" "[ \"\$(cd '$APP' && find . -printf '%p %m %y %l\n' | sort)\" = \"\$(cd '$W/restore/citadelle' && find . -printf '%p %m %y %l\n' | sort)\" ]"
expect "restauration : lien symbolique conserve" "[ -L '$W/restore/citadelle/node_modules/next/link.js' ]"
expect "aucun secret affiche" "! grep -q 'never-printed' <<<\"\$out\""
out="$(CONFIRM=GO-BACKUP-$ACT STAMP=T1 bash "$R/backup-prod.sh" 2>&1)"
expect "meme nom : refus d'ecraser" "grep -q 'existe deja' <<<\"\$out\" && grep -q '^BACKUP_END|FAIL' <<<\"\$out\""
echo OTHER > "$APP/.next/BUILD_ID"; out="$(CONFIRM=GO-BACKUP-$ACT STAMP=T2 bash "$R/backup-prod.sh" 2>&1)"
expect "BUILD_ID prod inattendu => FAIL" "grep -q '^BACKUP_END|FAIL' <<<\"\$out\""
out="$(CONFIRM=GO-BACKUP-WRONG STAMP=T3 bash "$R/backup-prod.sh" 2>&1)"
expect "mauvaise phrase GO => pas d'execution" "! grep -q '^BACKUP_END|PASS' <<<\"\$out\""

echo "== Activation"
setup; CONFIRM=GO-BACKUP-$ACT STAMP=T1 bash "$R/backup-prod.sh" >/dev/null 2>&1
A="$BACKUPS/citadelle-prod-$ACT-T1.tar.gz"; AS="$(awk '{print $1}' "$A.sha256")"
export BACKUP_ARCHIVE="$A" BACKUP_SHA256="$AS" HEALTH_TIMEOUT=3
out="$(bash "$R/activate.sh" 2>&1)"
expect "sans GO : DRY_RUN et prod inchangee" "grep -q '^ACTIVATION_END|DRY_RUN' <<<\"\$out\" && [ \"\$(cat '$APP/.next/BUILD_ID')\" = '$ACT' ]"
out="$(BACKUP_SHA256=0000 bash "$R/activate.sh" 2>&1)"
expect "sha sauvegarde faux => FAIL avant bascule" "grep -q '^ACTIVATION_END|FAIL' <<<\"\$out\" && [ \"\$(cat '$APP/.next/BUILD_ID')\" = '$ACT' ]"
out="$(CONFIRM=GO-ACTIVATE-$PRE STAMP=T5 bash "$R/activate.sh" 2>&1)"; rc=$?
echo "$out" > "$W/activate-go.txt"
expect "GO : ACTIVATION_END|PASS" "grep -q '^ACTIVATION_END|PASS' <<<\"\$out\" && [ $rc -eq 0 ]"
expect "prod = build prepare" "[ \"\$(cat '$APP/.next/BUILD_ID')\" = '$PRE' ]"
expect "prod reste un dossier reel" "[ -d '$APP' ] && [ ! -L '$APP' ]"
expect ".env/.htaccess/app.js preserves" "cmp -s '$APP/.env' '$H/citadelle.prev-$ACT-T5/.env' && cmp -s '$APP/.htaccess' '$H/citadelle.prev-$ACT-T5/.htaccess' && cmp -s '$APP/app.js' '$H/citadelle.prev-$ACT-T5/app.js'"
expect "logs preserves" "[ -f '$APP/logs/app.log' ]"
expect "restart.txt touche" "[ -f '$APP/tmp/restart.txt' ]"
expect "prod precedente conservee" "[ \"\$(cat '$H/citadelle.prev-$ACT-T5/.next/BUILD_ID')\" = '$ACT' ]"
expect "verrou libere" "[ ! -e '$H/releases/.citadelle-activation.lock' ]"
STATE="$H/releases/activation-$PRE-T5.state"
out="$(STATE="$STATE" bash "$R/rollback.sh" 2>&1)"
expect "rollback sans GO : DRY_RUN" "grep -q '^ROLLBACK_END|DRY_RUN' <<<\"\$out\" && [ \"\$(cat '$APP/.next/BUILD_ID')\" = '$PRE' ]"
out="$(STATE="$STATE" CONFIRM=GO-ROLLBACK-$ACT STAMP=T6 bash "$R/rollback.sh" 2>&1)"; rc=$?
echo "$out" > "$W/rollback-a.txt"
expect "rollback mode A : PASS" "grep -q '^ROLLBACK_END|PASS' <<<\"\$out\" && [ $rc -eq 0 ]"
expect "prod = build actif" "[ \"\$(cat '$APP/.next/BUILD_ID')\" = '$ACT' ]"
expect "release retiree conservee" "[ -d '$H/citadelle.rolledback-$PRE-T6' ]"

echo "== Activation en echec => retour arriere automatique"
setup; CONFIRM=GO-BACKUP-$ACT STAMP=T1 bash "$R/backup-prod.sh" >/dev/null 2>&1
export BACKUP_ARCHIVE="$BACKUPS/citadelle-prod-$ACT-T1.tar.gz" BACKUP_SHA256="$(awk '{print $1}' "$BACKUPS/citadelle-prod-$ACT-T1.tar.gz.sha256")"
out="$(FAKE_HTTP_FAIL=1 CONFIRM=GO-ACTIVATE-$PRE STAMP=T7 bash "$R/activate.sh" 2>&1)"; rc=$?
echo "$out" > "$W/activate-fail.txt"
expect "ACTIVATION_END|ROLLED_BACK" "grep -q '^ACTIVATION_END|ROLLED_BACK' <<<\"\$out\" && [ $rc -ne 0 ]"
expect "prod restauree = build actif" "[ \"\$(cat '$APP/.next/BUILD_ID')\" = '$ACT' ]"
expect "release echouee conservee" "[ \"\$(cat '$H/citadelle.failed-$PRE-T7/.next/BUILD_ID')\" = '$PRE' ]"

echo "== Retour arriere mode B (depuis la sauvegarde)"
setup; CONFIRM=GO-BACKUP-$ACT STAMP=T1 bash "$R/backup-prod.sh" >/dev/null 2>&1
export BACKUP_ARCHIVE="$BACKUPS/citadelle-prod-$ACT-T1.tar.gz" BACKUP_SHA256="$(awk '{print $1}' "$BACKUPS/citadelle-prod-$ACT-T1.tar.gz.sha256")"
CONFIRM=GO-ACTIVATE-$PRE STAMP=T8 bash "$R/activate.sh" >/dev/null 2>&1
mv "$H/citadelle.prev-$ACT-T8" "$W/env/prev-moved-away"   # simule la perte du dossier prev
out="$(STATE="$H/releases/activation-$PRE-T8.state" CONFIRM=GO-ROLLBACK-$ACT STAMP=T9 bash "$R/rollback.sh" 2>&1)"; rc=$?
echo "$out" > "$W/rollback-b.txt"
expect "rollback mode B : PASS" "grep -q 'mode B' <<<\"\$out\" && grep -q '^ROLLBACK_END|PASS' <<<\"\$out\" && [ $rc -eq 0 ]"
expect "prod restauree depuis l'archive" "[ \"\$(cat '$APP/.next/BUILD_ID')\" = '$ACT' ] && [ -f '$APP/.env' ] && [ -L '$APP/node_modules/next/link.js' ]"

echo
echo "TESTS_PASS=$PASSN TESTS_FAIL=$FAILN"
[ "$FAILN" -eq 0 ]
