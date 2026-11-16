#!/usr/bin/env bash
# Citadelle Live & Replay V1 - PREFLIGHT distant (LECTURE SEULE).
#
# Ne modifie rien : ni production, ni staging, ni cron, ni Passenger.
# Seule ecriture : un dossier temporaire prive (mktemp) supprime a la fin.
#
# Correctif "comm: /dev/fd/...": AUCUNE substitution de processus <(...),
# aucune dependance a /dev/fd. Les listes sont ecrites dans des fichiers
# temporaires et comparees avec awk (difference d'ensembles, sans exigence
# de tri). Chaque commande de comparaison est verifiee : une erreur => FAIL.
#
# Sortie : lignes "CHECK|<ID>|PASS|FAIL|<detail>" et "INFO|<cle>|<valeur>".
# Derniere ligne attendue : "RUNNER_END|<pass>|<fail>|<warn>".
# Aucune valeur secrete n'est jamais affichee (.env : presence/egalite seulement).

set -u
set -o pipefail
export LC_ALL=C

: "${HOME_USER:=/home/frprszbd}"
: "${APP:=${HOME_USER}/citadelle}"
: "${STAGING:=${HOME_USER}/citadelle-staging/run10-d1492c2/prepared-fixed}"
: "${EXPECTED_ACTIVE_BUILD_ID:=mOo2-hqdQzEOxdJn1siQz}"
: "${EXPECTED_PREPARED_BUILD_ID:=w-q27AfjfpNh_tCWsSKH9}"
: "${EXPECTED_COMMIT:=d1492c290552cf256be41ce2731023b86f774343}"
: "${PACKAGE_PATH:=}"
: "${EXPECTED_PACKAGE_SHA256:=}"
: "${MANIFEST_PATH:=}"
: "${PROD_REF:=nvyuyffywnuollaxguen}"
: "${DOMAIN:=https://citadelle.chapelleduroyaume.org}"
: "${SKIP_HTTP:=0}"

PASS=0; FAIL=0; WARN=0
check() { # id status detail
  printf 'CHECK|%s|%s|%s\n' "$1" "$2" "$3"
  case "$2" in PASS) PASS=$((PASS+1));; FAIL) FAIL=$((FAIL+1));; WARN) WARN=$((WARN+1));; esac
}
info() { printf 'INFO|%s|%s\n' "$1" "$2"; }
trim_id() { tr -d '\r\n\t ' < "$1"; }

TMPROOT="${TMPDIR:-/tmp}"
[ -d "$TMPROOT" ] && [ -w "$TMPROOT" ] || TMPROOT="${HOME_USER}"
WORK="$(mktemp -d "${TMPROOT}/citadelle-preflight.XXXXXX" 2>/dev/null)" || WORK=""
cleanup() { [ -n "$WORK" ] && [ -d "$WORK" ] && rm -rf -- "$WORK"; }
trap cleanup EXIT

info RUNNER_VERSION "2026-11-16.1"
info WHOAMI "$(whoami 2>/dev/null || echo '?')"
info HOSTNAME "$(hostname 2>/dev/null || echo '?')"
info DATE_UTC "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ---- C01 outils + espace de travail --------------------------------------
missing=""
for t in sha256sum tar gzip awk sort find stat df wc; do
  command -v "$t" >/dev/null 2>&1 || missing="${missing} ${t}"
done
if [ -n "$missing" ]; then check C01_TOOLS FAIL "outils manquants:${missing}"
elif [ -z "$WORK" ]; then check C01_TOOLS FAIL "mktemp impossible (TMPDIR/HOME non inscriptible)"
else check C01_TOOLS PASS "outils OK, tmp prive ${WORK}"; fi

# ---- C02 production = dossier reel ---------------------------------------
if [ -L "$APP" ]; then
  check C02_PROD_REAL_DIR FAIL "${APP} est un lien symbolique -> $(readlink "$APP"); procedure d'activation a revoir"
elif [ -d "$APP" ]; then
  check C02_PROD_REAL_DIR PASS "${APP} est un dossier reel (pas un lien symbolique)"
else
  check C02_PROD_REAL_DIR FAIL "${APP} introuvable"
fi

# ---- C03 BUILD_ID production ---------------------------------------------
if [ -f "$APP/.next/BUILD_ID" ]; then
  pb="$(trim_id "$APP/.next/BUILD_ID")"
  if [ "$pb" = "$EXPECTED_ACTIVE_BUILD_ID" ]; then check C03_PROD_BUILD_ID PASS "$pb"
  else check C03_PROD_BUILD_ID FAIL "attendu ${EXPECTED_ACTIVE_BUILD_ID}, trouve ${pb}"; fi
else check C03_PROD_BUILD_ID FAIL "$APP/.next/BUILD_ID absent"; fi

# ---- C04 structure staging -----------------------------------------------
if [ -L "$STAGING" ]; then check C04_STAGING_STRUCTURE FAIL "staging est un lien symbolique"
elif [ ! -d "$STAGING" ]; then check C04_STAGING_STRUCTURE FAIL "${STAGING} introuvable"
else
  miss=""
  for f in app.js server.js package.json .next/BUILD_ID; do [ -f "$STAGING/$f" ] || miss="$miss $f"; done
  for d in .next/static .next/server node_modules public; do [ -d "$STAGING/$d" ] || miss="$miss $d/"; done
  [ -L "$STAGING/node_modules" ] && miss="$miss node_modules(lien-symbolique)"
  if [ -n "$miss" ]; then check C04_STAGING_STRUCTURE FAIL "manquant:${miss}"
  else check C04_STAGING_STRUCTURE PASS "app.js server.js .next node_modules public presents"; fi
fi

# ---- C05 BUILD_ID staging ------------------------------------------------
if [ -f "$STAGING/.next/BUILD_ID" ]; then
  sb="$(trim_id "$STAGING/.next/BUILD_ID")"
  if [ "$sb" = "$EXPECTED_PREPARED_BUILD_ID" ]; then check C05_STAGING_BUILD_ID PASS "$sb"
  else check C05_STAGING_BUILD_ID FAIL "attendu ${EXPECTED_PREPARED_BUILD_ID}, trouve ${sb}"; fi
else check C05_STAGING_BUILD_ID FAIL "BUILD_ID staging absent"; fi

# ---- C06 checksum du paquet ----------------------------------------------
PKG_OK=0; PKG_SHA=""
if [ -z "$PACKAGE_PATH" ] || [ -z "$EXPECTED_PACKAGE_SHA256" ]; then
  check C06_PACKAGE_SHA256 FAIL "PACKAGE_PATH et EXPECTED_PACKAGE_SHA256 obligatoires"
elif [ ! -f "$PACKAGE_PATH" ]; then
  check C06_PACKAGE_SHA256 FAIL "paquet introuvable: ${PACKAGE_PATH}"
else
  got="$(sha256sum "$PACKAGE_PATH" | awk '{print $1}')"; rc=$?
  exp="$(printf '%s' "$EXPECTED_PACKAGE_SHA256" | tr 'A-F' 'a-f')"
  side="$PACKAGE_PATH.sha256"; sidemsg="sidecar absent"
  side_bad=0
  if [ -f "$side" ]; then
    sv="$(awk 'NR==1{print $1}' "$side" | tr 'A-F' 'a-f')"
    if [ "$sv" = "$exp" ]; then sidemsg="sidecar coherent"; else sidemsg="sidecar INCOHERENT (${sv})"; side_bad=1; fi
  fi
  if [ $rc -ne 0 ] || [ -z "$got" ]; then check C06_PACKAGE_SHA256 FAIL "sha256sum en erreur"
  elif [ "$got" != "$exp" ]; then check C06_PACKAGE_SHA256 FAIL "attendu ${exp}, calcule ${got}"
  elif [ $side_bad -eq 1 ]; then check C06_PACKAGE_SHA256 FAIL "calcule OK mais ${sidemsg}"
  else check C06_PACKAGE_SHA256 PASS "${got} (${sidemsg})"; PKG_OK=1; PKG_SHA="$got"; fi
  info PACKAGE_BYTES "$(stat -c %s "$PACKAGE_PATH" 2>/dev/null || echo '?')"
fi

# ---- C07 BUILD_ID a l'interieur du paquet --------------------------------
if [ $PKG_OK -ne 1 ]; then check C07_PACKAGE_BUILD_ID FAIL "paquet non verifie (C06)"
else
  pkb=""
  for m in ./.next/BUILD_ID .next/BUILD_ID; do
    pkb="$(tar -xzOf "$PACKAGE_PATH" "$m" 2>/dev/null | tr -d '\r\n\t ')" && [ -n "$pkb" ] && break
    pkb=""
  done
  if [ -z "$pkb" ]; then check C07_PACKAGE_BUILD_ID FAIL ".next/BUILD_ID illisible dans le paquet"
  elif [ "$pkb" = "$EXPECTED_PREPARED_BUILD_ID" ]; then check C07_PACKAGE_BUILD_ID PASS "$pkb"
  else check C07_PACKAGE_BUILD_ID FAIL "attendu ${EXPECTED_PREPARED_BUILD_ID}, paquet ${pkb}"; fi
fi

# ---- C08 attestation commit <-> build <-> paquet ---------------------------
# Fichier d'attestation unique : MANIFEST_PATH, sinon <paquet>.manifest.txt.
# Format "CLE=valeur" ; chaque cle obligatoire presente UNE seule fois :
#   FORMAT=citadelle-attestation-v1
#   COMMIT=<sha complet attendu>
#   BUILD_ID=<BUILD_ID prepare attendu>
#   PACKAGE_SHA256=<doit egaler le SHA-256 RECALCULE en C06>
#   GITHUB_RUN_ID=<identifiant numerique du run>
# Toute absence, duplication ou divergence => FAIL.
ATTEST="${MANIFEST_PATH:-}"
[ -z "$ATTEST" ] && [ -n "$PACKAGE_PATH" ] && ATTEST="$PACKAGE_PATH.manifest.txt"
if [ $PKG_OK -ne 1 ] || [ -z "$PKG_SHA" ]; then
  check C08_COMMIT FAIL "paquet non verifie (C06) : attestation non evaluable"
elif [ -z "$WORK" ]; then
  check C08_COMMIT FAIL "pas d'espace temporaire"
elif [ -z "$ATTEST" ] || [ ! -f "$ATTEST" ]; then
  check C08_COMMIT FAIL "attestation introuvable: ${ATTEST:-<non fournie>}"
else
  info ATTESTATION "$ATTEST"
  tr -d '\r' < "$ATTEST" > "$WORK/attest.txt" 2>/dev/null || : > "$WORK/attest.txt"
  acount() { grep -c "^$1=" "$WORK/attest.txt"; }      # nombre d'occurrences de la cle
  aval() { awk -v k="$1" 'index($0, k "=") == 1 { print substr($0, length(k) + 2); exit }' "$WORK/attest.txt" | tr -d ' \t'; }
  errs=""
  for k in FORMAT COMMIT BUILD_ID PACKAGE_SHA256 GITHUB_RUN_ID; do
    v="$(aval "$k")"; ACOUNT="$(acount "$k")"
    if [ "$ACOUNT" -eq 0 ]; then errs="$errs $k:absent"; continue; fi
    if [ "$ACOUNT" -gt 1 ]; then errs="$errs $k:duplique"; continue; fi
    case "$k" in
      FORMAT)         [ "$v" = "citadelle-attestation-v1" ] || errs="$errs FORMAT:inconnu" ;;
      COMMIT)         [ "$v" = "$EXPECTED_COMMIT" ] || errs="$errs COMMIT:${v:-vide}" ;;
      BUILD_ID)       [ "$v" = "$EXPECTED_PREPARED_BUILD_ID" ] || errs="$errs BUILD_ID:${v:-vide}" ;;
      PACKAGE_SHA256) [ "$(printf '%s' "$v" | tr 'A-F' 'a-f')" = "$PKG_SHA" ] || errs="$errs PACKAGE_SHA256:different_du_recalcul" ;;
      GITHUB_RUN_ID)  printf '%s' "$v" | grep -qE '^[0-9]+$' || errs="$errs GITHUB_RUN_ID:invalide" ;;
    esac
  done
  if [ -n "$errs" ]; then
    check C08_COMMIT FAIL "attestation non conforme:${errs}"
  else
    check C08_COMMIT PASS "commit ${EXPECTED_COMMIT} + BUILD_ID ${EXPECTED_PREPARED_BUILD_ID} + sha ${PKG_SHA} (run $(aval GITHUB_RUN_ID))"
  fi
fi

# ---- C09 / C10 contenu du paquet vs staging ------------------------------
# Liste normalisee : chemins relatifs sans "./" ni "/" final, "." exclu.
# Ecarts autorises dans le staging (fichiers proteges recopies depuis la prod) :
ALLOW_RE='^(\.env|\.env\.local|\.env\.production|\.htaccess|tmp|tmp/.*|logs|logs/.*)$'
if [ $PKG_OK -ne 1 ] || [ -z "$WORK" ] || [ ! -d "$STAGING" ]; then
  check C09_PACKAGE_FILELIST FAIL "prerequis absents (paquet/staging/tmp)"
  check C10_PACKAGE_CONTENT FAIL "prerequis absents (paquet/staging/tmp)"
else
  norm='{ sub(/^\.\//,""); sub(/\/$/,""); if ($0 != "" && $0 != ".") print }'
  tar -tzf "$PACKAGE_PATH" > "$WORK/pkg.raw" 2> "$WORK/pkg.err"; r1=$?
  ( cd "$STAGING" && find . -mindepth 1 ) > "$WORK/stg.raw" 2> "$WORK/stg.err"; r2=$?
  awk "$norm" "$WORK/pkg.raw" > "$WORK/pkg.lst"; r3=$?
  awk "$norm" "$WORK/stg.raw" > "$WORK/stg.lst"; r4=$?
  if [ $r1 -ne 0 ] || [ $r2 -ne 0 ] || [ $r3 -ne 0 ] || [ $r4 -ne 0 ] || [ ! -s "$WORK/pkg.lst" ] || [ ! -s "$WORK/stg.lst" ]; then
    check C09_PACKAGE_FILELIST FAIL "erreur de listage (tar=$r1 find=$r2 awk=$r3/$r4)"
  else
    # dans le paquet mais pas dans le staging
    awk 'NR==FNR { s[$0]=1; next } !($0 in s)' "$WORK/stg.lst" "$WORK/pkg.lst" > "$WORK/missing.lst"; a1=$?
    # dans le staging mais pas dans le paquet (hors liste autorisee)
    awk 'NR==FNR { p[$0]=1; next } !($0 in p)' "$WORK/pkg.lst" "$WORK/stg.lst" > "$WORK/extra.all"; a2=$?
    grep -Ev "$ALLOW_RE" "$WORK/extra.all" > "$WORK/extra.lst"; g=$?   # 0=lignes, 1=aucune, 2=erreur
    if [ $a1 -ne 0 ] || [ $a2 -ne 0 ] || [ $g -gt 1 ]; then
      check C09_PACKAGE_FILELIST FAIL "erreur de comparaison (awk=$a1/$a2 grep=$g)"
    else
      nm=$(wc -l < "$WORK/missing.lst" | tr -d ' '); nx=$(wc -l < "$WORK/extra.lst" | tr -d ' ')
      na=$(( $(wc -l < "$WORK/extra.all" | tr -d ' ') - nx ))
      info PACKAGE_ENTRIES "$(wc -l < "$WORK/pkg.lst" | tr -d ' ')"
      info STAGING_ENTRIES "$(wc -l < "$WORK/stg.lst" | tr -d ' ')"
      if [ "$nm" -eq 0 ] && [ "$nx" -eq 0 ]; then
        check C09_PACKAGE_FILELIST PASS "listes identiques (ecarts autorises: ${na})"
      else
        check C09_PACKAGE_FILELIST FAIL "manquants=${nm} en_trop=${nx}"
        head -20 "$WORK/missing.lst" | sed 's/^/INFO|MISSING_IN_STAGING|/'
        head -20 "$WORK/extra.lst" | sed 's/^/INFO|EXTRA_IN_STAGING|/'
      fi
    fi
    # C10 : comparaison de contenu (GNU tar --compare) sans extraction.
    tar -dzf "$PACKAGE_PATH" -C "$STAGING" > "$WORK/diff.out" 2>&1; td=$?
    # 0 = identique, 1 = differences, 2 = erreur fatale
    grep -E 'Contents differ|Size differs|No such file|Not a regular file|File type differs|Symlink differs|Cannot ' "$WORK/diff.out" \
      | grep -Ev '^(tar: )?(\./)?(\.env|\.env\.local|\.env\.production|\.htaccess|app\.js): ' > "$WORK/diff.hard"; g2=$?
    nmeta=$(grep -cE 'Mod time differs|Mode differs|Uid differs|Gid differs' "$WORK/diff.out")
    if [ $td -gt 1 ] && [ ! -s "$WORK/diff.hard" ]; then
      check C10_PACKAGE_CONTENT FAIL "tar --compare en erreur (code ${td})"; head -5 "$WORK/diff.out" | sed 's/^/INFO|TAR_COMPARE|/'
    elif [ $g2 -gt 1 ]; then
      check C10_PACKAGE_CONTENT FAIL "erreur d'analyse du rapport tar"
    elif [ -s "$WORK/diff.hard" ]; then
      check C10_PACKAGE_CONTENT FAIL "$(wc -l < "$WORK/diff.hard" | tr -d ' ') fichier(s) au contenu different"
      head -20 "$WORK/diff.hard" | sed 's/^/INFO|CONTENT_DIFF|/'
    else
      check C10_PACKAGE_CONTENT PASS "contenu identique au paquet (ecarts metadonnees: ${nmeta})"
    fi
  fi
fi

# ---- C11 garde fuite Supabase locale (rule 17) ---------------------------
if [ -d "$STAGING/.next/static" ]; then
  ph=$(grep -rlE 'placeholder\.supabase\.co' "$STAGING/.next/static" 2>/dev/null | wc -l | tr -d ' ')
  lo=$(grep -rlE '(localhost|127\.0\.0\.1):5432[0-9]|sb-(localhost|127\.0\.0\.1)-auth-token' "$STAGING/.next/static" 2>/dev/null | wc -l | tr -d ' ')
  rf=$(grep -rl "$PROD_REF" "$STAGING/.next/static" 2>/dev/null | wc -l | tr -d ' ')
  info LOCALHOST_LEAK "$lo"; info PLACEHOLDER_SUPABASE "$ph"; info PROD_REF_FILES "$rf"
  if [ "$lo" = 0 ] && [ "$ph" = 0 ] && [ "$rf" -gt 0 ]; then
    check C11_BUNDLE_GUARD PASS "LOCALHOST_LEAK=0 PLACEHOLDER_SUPABASE=0 ref=${PROD_REF}"
  else check C11_BUNDLE_GUARD FAIL "LOCALHOST_LEAK=${lo} PLACEHOLDER_SUPABASE=${ph} PROD_REF_FILES=${rf}"; fi
else check C11_BUNDLE_GUARD FAIL ".next/static absent du staging"; fi

# ---- C12 bascule par renommage possible ----------------------------------
PARENT="$(dirname "$APP")"
if [ -d "$APP" ] && [ -d "$STAGING" ]; then
  d1="$(stat -c %d "$PARENT" 2>/dev/null)"; d2="$(stat -c %d "$STAGING" 2>/dev/null)"
  info PARENT_PERMS "$(stat -c '%A %U:%G %n' "$PARENT" 2>/dev/null)"
  info APP_PERMS "$(stat -c '%A %U:%G %n' "$APP" 2>/dev/null)"
  info STAGING_PERMS "$(stat -c '%A %U:%G %n' "$STAGING" 2>/dev/null)"
  info STAGING_PARENT_PERMS "$(stat -c '%A %U:%G %n' "$(dirname "$STAGING")" 2>/dev/null)"
  if [ -z "$d1" ] || [ -z "$d2" ]; then check C12_SWAP_FEASIBLE FAIL "stat impossible"
  elif [ "$d1" != "$d2" ]; then check C12_SWAP_FEASIBLE FAIL "prod et staging sur des systemes de fichiers differents (mv ne serait pas atomique)"
  elif [ ! -w "$PARENT" ] || [ ! -x "$PARENT" ]; then check C12_SWAP_FEASIBLE FAIL "${PARENT} non inscriptible"
  elif [ ! -w "$(dirname "$STAGING")" ]; then check C12_SWAP_FEASIBLE FAIL "parent du staging non inscriptible"
  else
    av=$(df -Pk "$PARENT" | awk 'NR==2{print $4}')
    info DISK_FREE_KB "$av"
    check C12_SWAP_FEASIBLE PASS "meme FS (dev ${d1}), ${PARENT} inscriptible"
  fi
else check C12_SWAP_FEASIBLE FAIL "prod ou staging absent"; fi

# ---- C13 cron youtube-live-sync inactif ------------------------------------
# Controle CIBLE : seule la nouvelle tache youtube-live-sync doit etre inactive.
# Les taches existantes (/api/cron/notifications, scorecard, ...) sont conservees
# et listees en INFO (planification + nom de route uniquement, jamais la ligne,
# l'URL complete, un jeton ou la valeur d'une variable).
# Bloquant (FAIL) :
#   - ligne active contenant "youtube-live-sync" ;
#   - ligne active liee a YouTube non identifiable (youtube, yt-live, live-sync...) ;
#   - lecture de la crontab impossible (commande absente ou erreur autre que "no crontab").
if ! command -v crontab >/dev/null 2>&1; then
  check C13_CRON_INACTIVE FAIL "commande crontab indisponible : lecture impossible"
elif [ -z "$WORK" ]; then
  check C13_CRON_INACTIVE FAIL "pas d'espace temporaire"
else
  crontab -l > "$WORK/cron.txt" 2> "$WORK/cron.err"; crc=$?
  if [ $crc -ne 0 ]; then
    if grep -qi 'no crontab' "$WORK/cron.err" "$WORK/cron.txt" 2>/dev/null; then
      check C13_CRON_INACTIVE PASS "aucune crontab utilisateur"
    else
      check C13_CRON_INACTIVE FAIL "crontab -l en erreur (code ${crc}) : lecture impossible"
    fi
  else
    tr -d '\r' < "$WORK/cron.txt" | grep -Ev '^[[:space:]]*(#|$)' > "$WORK/cron.active"
    target=0; unknown=0; n=0; nconf=0; nroute=0; nnoroute=0
    while IFS= read -r line; do
      n=$((n+1))
      if printf '%s' "$line" | grep -Eq '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*='; then
        # Ligne de configuration (MAILTO, CRON_TZ, SHELL, secrets...) : nom seulement, valeur masquee.
        nconf=$((nconf+1))
        info CRON_CONFIG "ligne ${n} $(printf '%s' "$line" | sed -E 's/^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*).*/\1/')=<masque>"
        continue
      fi
      case "$line" in
        @*) sched="$(printf '%s' "$line" | awk '{print $1}')" ;;
        *)  sched="$(printf '%s' "$line" | awk '{print $1" "$2" "$3" "$4" "$5}')" ;;
      esac
      route="$(printf '%s' "$line" | grep -oE '/api/cron/[A-Za-z0-9_-]+' | head -1)"
      if printf '%s' "$line" | grep -qi 'youtube-live-sync'; then
        target=$((target+1)); info CRON_TARGET_ACTIVE "ligne ${n} [${sched}] ${route:-youtube-live-sync}"
      elif printf '%s' "$line" | grep -Eqi 'youtube|yt[-_]?live|live[-_]?sync'; then
        unknown=$((unknown+1)); info CRON_YOUTUBE_UNIDENTIFIED "ligne ${n} [${sched}] ${route:-(route non identifiable)}"
      elif [ -n "$route" ]; then
        nroute=$((nroute+1)); info CRON_ROUTE "ligne ${n} [${sched}] ${route}"
      else
        nnoroute=$((nnoroute+1)); info CRON_NO_ROUTE "ligne ${n} [${sched}] commande sans route /api/cron reconnue (non YouTube, conservee)"
      fi
    done < "$WORK/cron.active"
    if [ "$target" -gt 0 ]; then
      check C13_CRON_INACTIVE FAIL "${target} tache(s) youtube-live-sync ACTIVE(S)"
    elif [ "$unknown" -gt 0 ]; then
      check C13_CRON_INACTIVE FAIL "${unknown} tache(s) liee(s) a YouTube non identifiable(s)"
    else
      check C13_CRON_INACTIVE PASS "youtube-live-sync inactif ; conservees : routes=${nroute} sans_route=${nnoroute} config=${nconf}"
    fi
  fi
fi

# ---- C14 fichiers proteges (presence/egalite uniquement) -----------------
miss=""
for f in app.js .env; do [ -f "$APP/$f" ] || miss="$miss $f"; done
for f in app.js .env .htaccess .env.local .env.production; do
  if [ -e "$APP/$f" ]; then
    if [ -e "$STAGING/$f" ]; then
      if cmp -s "$APP/$f" "$STAGING/$f"; then info "PROTECTED_${f}" "prod=present staging=identique"
      else info "PROTECTED_${f}" "prod=present staging=DIFFERENT (sera recopie depuis la prod a l'activation)"; fi
    else info "PROTECTED_${f}" "prod=present staging=absent (sera recopie depuis la prod a l'activation)"; fi
  fi
done
[ -d "$APP/logs" ] && info PROTECTED_logs "prod=present ($(find "$APP/logs" -type f | wc -l | tr -d ' ') fichiers)"
if [ -n "$miss" ]; then check C14_PROTECTED_FILES FAIL "absents en prod:${miss}"
else check C14_PROTECTED_FILES PASS "app.js et .env presents en prod (valeurs non lues)"; fi

# ---- Inspection Passenger (informative, lecture seule) -------------------
info PROD_NODE_MODULES "$( [ -L "$APP/node_modules" ] && echo "lien -> $(readlink "$APP/node_modules")" || ([ -d "$APP/node_modules" ] && echo dossier || echo absent))"
info PROD_TMP_DIR "$( [ -d "$APP/tmp" ] && echo present || echo absent)"
[ -f "$APP/tmp/restart.txt" ] && info PROD_RESTART_TXT_MTIME "$(stat -c %y "$APP/tmp/restart.txt")"
[ -d "$HOME_USER/nodevenv" ] && info NODEVENV "$(find "$HOME_USER/nodevenv" -maxdepth 2 -mindepth 1 -type d 2>/dev/null | tr '\n' ' ')"
# directives Passenger (noms + chemins uniquement, jamais SetEnv)
find "$HOME_USER" -maxdepth 3 -name .htaccess -type f 2>/dev/null | while IFS= read -r h; do
  grep -hE '^[[:space:]]*Passenger(AppRoot|BaseURI|Nodejs|AppType|StartupFile|Enabled)\b' "$h" 2>/dev/null \
    | sed -e 's/^[[:space:]]*//' -e "s|^|INFO|PASSENGER_DIRECTIVE|${h}: |"
done
if [ -d /proc ]; then
  # Uniquement pid, executable et dossier courant : jamais la ligne de commande (peut contenir des secrets).
  for p in $(pgrep -u "$(id -u)" -f 'node|Passenger' 2>/dev/null); do
    exe="$(basename "$(readlink "/proc/$p/exe" 2>/dev/null)" 2>/dev/null)"
    case "$exe" in node|node[0-9]*|Passenger*|passenger*) ;; *) continue;; esac
    printf 'INFO|PROCESS|pid=%s exe=%s cwd=%s\n' "$p" "$exe" "$(readlink "/proc/$p/cwd" 2>/dev/null)"
  done
fi
if [ "$SKIP_HTTP" != 1 ] && command -v curl >/dev/null 2>&1; then
  code=$(curl -s -o "$WORK/home.html" -w '%{http_code}' --max-time 20 "$DOMAIN/" 2>/dev/null || echo 000)
  info HTTP_HOME "$code"
  if [ -s "$WORK/home.html" ]; then
    if grep -q "$EXPECTED_ACTIVE_BUILD_ID" "$WORK/home.html"; then info SERVED_BUILD_ID "$EXPECTED_ACTIVE_BUILD_ID (HTML)"
    else info SERVED_BUILD_ID "non trouve dans le HTML"; fi
  fi
  info HTTP_ACTIVE_BUILD_MANIFEST "$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$DOMAIN/_next/static/$EXPECTED_ACTIVE_BUILD_ID/_buildManifest.js" 2>/dev/null || echo 000)"
fi

printf 'RUNNER_END|%s|%s|%s\n' "$PASS" "$FAIL" "$WARN"
[ "$FAIL" -eq 0 ]
