#!/usr/bin/env bash
# Citadelle — DÉPLOIEMENT INTELLIGENCE-5B (Couche de Décision) : bascule NON DESTRUCTIVE.
#
# Reprend le mécanisme PROUVÉ de deploy-post-launch.sh (checksum, vérif manifeste,
# backup + rollback auto, contrôle BUILD_ID, préservation .env/.htaccess/app.js,
# rsync SANS --delete, restart Passenger UNIQUE), avec des SMOKE TESTS adaptés 5B :
#   - / = 200 (non-régression maison)
#   - aucune 5xx/000 sur les routes critiques (/parcours /podcast /articles /login /register)
#   - /admin/intelligence non-5xx ; /api/intelligence/status & /decision = 401 (garde admin)
#   - CONTRÔLE FUITE ENV CLIENT : le HTML servi ne contient NI placeholder.supabase.co
#     NI 127.0.0.1 NI localhost:3000 (attrape l'auth client cassée que les codes HTTP ratent).
# Rollback automatique sur tout échec critique.
#
# Usage :
#   ARCHIVE_NAME=int5b-....tar.gz \
#   EXPECTED_SHA256=<sha256> EXPECTED_BUILD_ID=<build_id> EXPECTED_COMMIT=<commit> \
#   ./deploy-intelligence-5b.sh
set -euo pipefail

: "${ARCHIVE_NAME:?ARCHIVE_NAME requis}"
: "${EXPECTED_SHA256:?EXPECTED_SHA256 requis}"
: "${EXPECTED_BUILD_ID:?EXPECTED_BUILD_ID requis}"
: "${EXPECTED_COMMIT:?EXPECTED_COMMIT requis}"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
HOME_USER="/home/frprszbd"
APP="${HOME_USER}/citadelle"
UPLOADS="${HOME_USER}/releases/uploads"
BACKUPS="${HOME_USER}/releases/backups"
RELEASE_ROOT="${HOME_USER}/releases"
CANDIDATE="${RELEASE_ROOT}/int5b-${STAMP}-candidate"
ARCHIVE="${UPLOADS}/${ARCHIVE_NAME}"
MANIFEST="${UPLOADS}/${ARCHIVE_NAME}.manifest.txt"
DOMAIN="https://citadelle.chapelleduroyaume.org"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
fail() { echo "$1"; exit 1; }

do_rollback() {
  local app="$1" rollback_tar="$2" symlink_target="${3:-}"
  echo "===== ROLLBACK AUTOMATIQUE ====="
  if [[ -L "${app}" && -n "${symlink_target}" ]]; then
    ln -sfn "${symlink_target}" "${RELEASE_ROOT}/current-rollback"
    mv -Tf "${RELEASE_ROOT}/current-rollback" "${app}"
  else
    tar -xzf "${rollback_tar}" -C "${app}"
  fi
  mkdir -p "${app}/tmp"
  touch "${app}/tmp/restart.txt"
  sleep 5
  echo "ROLLBACK_COMPLETED"
}

mkdir -p "${BACKUPS}" "${RELEASE_ROOT}" "${APP}/tmp"

log "===== 1/12 VERIFICATION EXISTENCE ARCHIVE ====="
[[ -f "${ARCHIVE}" ]] || fail "ARCHIVE_CHECKSUM_MISMATCH: archive introuvable: ${ARCHIVE}"

log "===== 2/12 VERIFICATION CHECKSUM ====="
REMOTE_SHA=$(sha256sum "${ARCHIVE}" | awk '{print $1}')
echo "REMOTE_SHA256=${REMOTE_SHA}"
if [[ "${REMOTE_SHA}" != "${EXPECTED_SHA256}" ]]; then
  echo "ARCHIVE_CHECKSUM_MISMATCH"; echo "expected ${EXPECTED_SHA256}"; echo "got ${REMOTE_SHA}"; exit 1
fi
log "checksum OK"

log "===== 3/12 VERIFICATION COMMIT ATTENDU (manifeste) ====="
[[ -f "${MANIFEST}" ]] || fail "RELEASE_STRUCTURE_INVALID: manifeste absent (${MANIFEST})"
if ! grep -qE "Commit (court|Git complet)\s*: *${EXPECTED_COMMIT}" "${MANIFEST}"; then
  echo "EXPECTED_COMMIT_MISMATCH"; echo "expected ${EXPECTED_COMMIT} introuvable dans ${MANIFEST}"; exit 1
fi
log "commit attendu confirme dans le manifeste"

log "===== 4/12 SAUVEGARDE .env/.htaccess AVANT ACTIVATION ====="
for f in .env .env.local .htaccess; do
  if [[ -f "${APP}/${f}" ]]; then
    cp -a "${APP}/${f}" "${BACKUPS}/citadelle-${f#.}-pre-int5b-${STAMP}"
    chmod 600 "${BACKUPS}/citadelle-${f#.}-pre-int5b-${STAMP}" 2>/dev/null || true
    echo "BACKUP_${f}=${BACKUPS}/citadelle-${f#.}-pre-int5b-${STAMP}"
  fi
done

log "===== 5/12 SAUVEGARDE COMPLETE DU RUNTIME ACTIF (rollback) ====="
PROD_BUILD_BEFORE="MISSING"
[[ -f "${APP}/.next/BUILD_ID" ]] && PROD_BUILD_BEFORE=$(cat "${APP}/.next/BUILD_ID" | tr -d '\r\n')
echo "PROD_BUILD_ID_BEFORE=${PROD_BUILD_BEFORE}"
ROLLBACK_TAR="${BACKUPS}/citadelle-active-before-int5b-${STAMP}.tar.gz"
tar -C "${APP}" -czf "${ROLLBACK_TAR}" .
echo "ROLLBACK_TAR=${ROLLBACK_TAR}"
echo "ROLLBACK_SHA256=$(sha256sum "${ROLLBACK_TAR}" | awk '{print $1}')"

log "===== 6/12 EXTRACTION DANS UN NOUVEAU DOSSIER DE RELEASE ====="
rm -rf "${CANDIDATE}"; mkdir -p "${CANDIDATE}"
tar -xzf "${ARCHIVE}" -C "${CANDIDATE}"
for f in app.js server.js; do
  [[ -f "${CANDIDATE}/${f}" ]] || fail "RELEASE_STRUCTURE_INVALID: ${f} manquant dans la candidate"
done
[[ -f "${CANDIDATE}/.next/BUILD_ID" ]] || fail "RELEASE_STRUCTURE_INVALID: .next/BUILD_ID manquant"

log "===== 7/12 VERIFICATION BUILD_ID ATTENDU ====="
CAND_BUILD=$(cat "${CANDIDATE}/.next/BUILD_ID" | tr -d '\r\n')
if [[ "${CAND_BUILD}" != "${EXPECTED_BUILD_ID}" ]]; then
  echo "EXPECTED_BUILD_ID_MISMATCH"; echo "expected ${EXPECTED_BUILD_ID}"; echo "got ${CAND_BUILD}"; exit 1
fi
log "BUILD_ID candidate = ${CAND_BUILD} (conforme)"

log "===== 8/12 PRESERVATION .env/.env.local/.htaccess/app.js (jamais depuis l'archive) ====="
for f in .env .env.local .htaccess app.js; do
  if [[ -f "${APP}/${f}" ]]; then cp -a "${APP}/${f}" "${CANDIDATE}/${f}"; echo "PRESERVED_${f}=from_live"; fi
done

log "===== 9/12 BASCULE NON DESTRUCTIVE (atomique si symlink, sinon rsync SANS --delete) ====="
CURRENT_TARGET=""
if [[ -L "${APP}" ]]; then
  CURRENT_TARGET="$(readlink -f "${APP}")"
  ln -sfn "${CANDIDATE}" "${RELEASE_ROOT}/current-new"
  mv -Tf "${RELEASE_ROOT}/current-new" "${APP}"
  echo "SWITCH_MODE=atomic_symlink"; echo "PREVIOUS_TARGET=${CURRENT_TARGET}"
else
  echo "SWITCH_MODE=rsync_inplace_no_delete"
  rsync -a --exclude='.env' --exclude='.env.local' --exclude='.env.production' \
    --exclude='.htaccess' --exclude='tmp/' "${CANDIDATE}/" "${APP}/"
  for f in .env .env.local .htaccess app.js; do
    [[ -f "${CANDIDATE}/${f}" ]] && cp -a "${CANDIDATE}/${f}" "${APP}/${f}"
  done
fi

for f in .env .htaccess app.js; do
  if [[ ! -f "${APP}/${f}" ]] && [[ -f "${CANDIDATE}/${f}" ]]; then
    echo "CRITICAL: ${f} manquant apres bascule — restauration depuis la sauvegarde"
    tar -xzf "${ROLLBACK_TAR}" -C "${APP}" "./${f}" 2>/dev/null || tar -xzf "${ROLLBACK_TAR}" -C "${APP}" "${f}" 2>/dev/null || true
  fi
done

PROD_BUILD_AFTER=$(cat "${APP}/.next/BUILD_ID" 2>/dev/null | tr -d '\r\n' || echo "MISSING")
if [[ "${PROD_BUILD_AFTER}" != "${EXPECTED_BUILD_ID}" ]]; then
  echo "RELEASE_STRUCTURE_INVALID"; echo "BUILD_ID post-bascule (${PROD_BUILD_AFTER}) != attendu (${EXPECTED_BUILD_ID})"
  do_rollback "${APP}" "${ROLLBACK_TAR}" "${CURRENT_TARGET}"; exit 1
fi

log "===== 10/12 REDEMARRAGE PASSENGER (UNIQUE) + ATTENTE DISPONIBILITE ====="
mkdir -p "${APP}/tmp"; touch "${APP}/tmp/restart.txt"
READY=0
for i in $(seq 1 20); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${DOMAIN}/" || echo "000")
  if [[ "${CODE}" == "200" ]]; then READY=1; break; fi
  sleep 2
done
ROLLBACK_ON_FAILURE=0
if [[ "${READY}" != "1" ]]; then
  echo "SMOKE_TEST_FAILED"; echo "Passenger n'a pas repondu 200 sur / (dernier code: ${CODE:-000})"; ROLLBACK_ON_FAILURE=1
fi

log "===== 11/12 SMOKE TESTS 5B (non-régression + routes décision + fuite env client) ====="
# 11.1 — aucune 5xx/000 sur les routes critiques.
for path in / /parcours /podcast /articles /login /register; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${DOMAIN}${path}" || echo "000")
  echo "HTTP ${CODE} ${path}"
  case "${CODE}" in 500|502|503|504|000) ROLLBACK_ON_FAILURE=1;; esac
done
# 11.2 — /admin/intelligence : gardé (jamais 5xx).
AICODE=$(curl -s -o /dev/null -w "%{http_code}" "${DOMAIN}/admin/intelligence" || echo "000")
echo "HTTP ${AICODE} /admin/intelligence"
case "${AICODE}" in 500|502|503|504|000) ROLLBACK_ON_FAILURE=1;; esac
# 11.3 — API décision + statut : garde admin => 401 attendu (jamais 5xx, jamais 200 sans auth).
for api in /api/intelligence/status /api/intelligence/decision; do
  ACODE=$(curl -s -o /dev/null -w "%{http_code}" "${DOMAIN}${api}" || echo "000")
  echo "HTTP ${ACODE} ${api} (attendu 401)"
  case "${ACODE}" in 500|502|503|504|000) ROLLBACK_ON_FAILURE=1;; 200) echo "WARN: ${api} 200 sans cookie admin"; ROLLBACK_ON_FAILURE=1;; esac
done
# 11.4 — FUITE ENV CLIENT : le HTML de / ne doit contenir aucun endpoint local/placeholder.
ROOT_HTML=$(curl -s "${DOMAIN}/" || true)
LEAK=0
for bad in "placeholder.supabase.co" "127.0.0.1:55321" "localhost:3000"; do
  if echo "${ROOT_HTML}" | grep -q "${bad}"; then echo "CLIENT_ENV_LEAK=${bad}"; LEAK=1; fi
done
if [[ "${LEAK}" == "1" ]]; then echo "SMOKE_TEST_FAILED (fuite env client)"; ROLLBACK_ON_FAILURE=1; else echo "CLIENT_ENV_LEAK=none"; fi
# 11.5 — présence du vrai endpoint Supabase (auth client fonctionnelle).
if echo "${ROOT_HTML}" | grep -q "nvyuyffywnuollaxguen.supabase.co"; then echo "SUPABASE_REAL_ENDPOINT=present"; else echo "SUPABASE_REAL_ENDPOINT=absent (info)"; fi

if [[ "${ROLLBACK_ON_FAILURE}" == "1" ]]; then
  echo "SMOKE_TEST_FAILED"; do_rollback "${APP}" "${ROLLBACK_TAR}" "${CURRENT_TARGET}"; exit 1
fi

log "===== 12/12 VERDICT ====="
echo "PROD_BUILD_ID_BEFORE=${PROD_BUILD_BEFORE}"
echo "PROD_BUILD_ID_AFTER=${PROD_BUILD_AFTER}"
echo "ROLLBACK_TAR=${ROLLBACK_TAR}"
echo "DEPLOYMENT_OK"
