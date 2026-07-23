#!/usr/bin/env bash
# Citadelle Homepage V3 — deploy from manually uploaded archive
# Run ON the N0C server as frprszbd (after SSH works).
# Does NOT recreate archive. Does NOT touch Supabase/SQL.
set -euo pipefail

ARCHIVE_NAME="citadelle-homepage-v3-72dc006-qO0-gnOSVS3SSQUlA2oaJ-strict-linuxsafe.tar.gz"
EXPECTED_SHA="06502e062613c405d2ad3562c9e351a98ae13b63e02d15b33967a9aaf6b7f83d"
EXPECTED_BUILD="qO0-gnOSVS3SSQUlA2oaJ"
EXPECTED_HEAD="72dc0067399f652d3685eb679e97a2bbb0dea5c6"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

HOME_USER="/home/frprszbd"
APP="${HOME_USER}/citadelle"
UPLOADS="${HOME_USER}/releases/uploads"
BACKUPS="${HOME_USER}/releases/backups"
CANDIDATE="${HOME_USER}/releases/citadelle-homepage-v3-72dc006-${STAMP}"
ARCHIVE="${UPLOADS}/${ARCHIVE_NAME}"

echo "===== PHASE 6 PRECHECK ====="
whoami
hostname
pwd
df -h "${HOME_USER}" | tail -1

# locate archive (uploads preferred, fallback home/releases)
if [[ ! -f "${ARCHIVE}" ]]; then
  for alt in \
    "${HOME_USER}/releases/${ARCHIVE_NAME}" \
    "${HOME_USER}/${ARCHIVE_NAME}" \
    "${HOME_USER}/citadelle/${ARCHIVE_NAME}"
  do
    if [[ -f "${alt}" ]]; then
      echo "FOUND_ALT=${alt}"
      mkdir -p "${UPLOADS}"
      cp -a "${alt}" "${ARCHIVE}"
      break
    fi
  done
fi

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "ERROR: archive not found in uploads/home/releases"
  find "${HOME_USER}" -maxdepth 3 -name "${ARCHIVE_NAME}" 2>/dev/null || true
  exit 1
fi

BYTES=$(stat -c%s "${ARCHIVE}" 2>/dev/null || stat -f%z "${ARCHIVE}")
REMOTE_SHA=$(sha256sum "${ARCHIVE}" | awk '{print $1}')
echo "ARCHIVE=${ARCHIVE}"
echo "BYTES=${BYTES}"
echo "SHA256=${REMOTE_SHA}"
if [[ "${REMOTE_SHA}" != "${EXPECTED_SHA}" ]]; then
  echo "ERROR: SHA256 mismatch"
  echo "expected ${EXPECTED_SHA}"
  echo "got      ${REMOTE_SHA}"
  exit 1
fi
echo "SHA256_MATCH=OK"

mkdir -p "${BACKUPS}" "${APP}/tmp" "${HOME_USER}/releases"

# pre checksums protected files
echo "===== PROTECTED BEFORE ====="
for f in .env .htaccess app.js; do
  p="${APP}/${f}"
  if [[ -f "${p}" ]]; then
    echo "BEFORE_${f}_SHA=$(sha256sum "${p}" | awk '{print $1}')"
    echo "BEFORE_${f}_SIZE=$(stat -c%s "${p}" 2>/dev/null || stat -f%z "${p}")"
  else
    echo "BEFORE_${f}=MISSING"
  fi
done
if [[ -f "${APP}/.next/BUILD_ID" ]]; then
  echo "PROD_BUILD_ID_BEFORE=$(cat "${APP}/.next/BUILD_ID" | tr -d '\r\n')"
else
  echo "PROD_BUILD_ID_BEFORE=MISSING"
fi

# full backup of active app
BACKUP="${BACKUPS}/citadelle-active-before-homepage-v3-${STAMP}.tar.gz"
echo "===== BACKUP ====="
tar -C "${APP}" -czf "${BACKUP}" .
BACKUP_BYTES=$(stat -c%s "${BACKUP}" 2>/dev/null || stat -f%z "${BACKUP}")
BACKUP_SHA=$(sha256sum "${BACKUP}" | awk '{print $1}')
echo "BACKUP=${BACKUP}"
echo "BACKUP_BYTES=${BACKUP_BYTES}"
echo "BACKUP_SHA256=${BACKUP_SHA}"
# prove protected files in backup
tar -tzf "${BACKUP}" | grep -E '^\./?(\.env|\.htaccess|app\.js)$' || true
echo "BACKUP_OK"

echo "===== PHASE 7 EXTRACT CANDIDATE ====="
rm -rf "${CANDIDATE}"
mkdir -p "${CANDIDATE}"
tar -xzf "${ARCHIVE}" -C "${CANDIDATE}"
test -f "${CANDIDATE}/app.js" || { echo "ERROR: app.js missing in archive extract"; exit 1; }
test -f "${CANDIDATE}/server.js" || { echo "ERROR: server.js missing"; exit 1; }
test -f "${CANDIDATE}/.next/BUILD_ID" || { echo "ERROR: BUILD_ID missing"; exit 1; }
CAND_BUILD=$(cat "${CANDIDATE}/.next/BUILD_ID" | tr -d '\r\n')
echo "CANDIDATE_BUILD_ID=${CAND_BUILD}"
if [[ "${CAND_BUILD}" != "${EXPECTED_BUILD}" ]]; then
  echo "ERROR: candidate BUILD_ID mismatch"
  exit 1
fi

# Preserve protected files into candidate from live app (never overwrite from archive)
for f in .env .htaccess app.js; do
  if [[ -f "${APP}/${f}" ]]; then
    cp -a "${APP}/${f}" "${CANDIDATE}/${f}"
    echo "PRESERVED_${f}=from_live"
  else
    echo "PRESERVE_SKIP_${f}=not_on_live"
  fi
done

echo "===== PHASE 8 RSYNC SWITCH (excludes protected source overrides already applied) ====="
# rsync candidate -> app, exclude nothing from candidate for app content,
# but NEVER delete protected if missing; candidate has copies of protected.
# Extra safety: exclude .env* and .htaccess from rsync DELETE/overwrite by using
# --exclude and then re-copy from backup copies we saved.
rsync -a --delete \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  --exclude='.htaccess' \
  --exclude='tmp/' \
  "${CANDIDATE}/" "${APP}/"

# Always restore protected files from pre-switch live copies stored in candidate
# (we copied live .env/.htaccess/app.js into candidate before rsync)
for f in .env .htaccess app.js; do
  if [[ -f "${CANDIDATE}/${f}" ]]; then
    cp -a "${CANDIDATE}/${f}" "${APP}/${f}"
  fi
done

# Verify protected still present
for f in .env .htaccess app.js; do
  if [[ ! -f "${APP}/${f}" ]]; then
    echo "CRITICAL: ${f} missing after switch — restoring from backup"
    tar -xzf "${BACKUP}" -C "${APP}" "./${f}" 2>/dev/null || tar -xzf "${BACKUP}" -C "${APP}" "${f}" 2>/dev/null || true
  fi
  if [[ ! -f "${APP}/${f}" ]]; then
    echo "FATAL: cannot restore ${f}"
    exit 1
  fi
done

echo "===== PROTECTED AFTER ====="
for f in .env .htaccess app.js; do
  echo "AFTER_${f}_SHA=$(sha256sum "${APP}/${f}" | awk '{print $1}')"
done
PROD_BUILD=$(cat "${APP}/.next/BUILD_ID" | tr -d '\r\n')
echo "PROD_BUILD_ID_AFTER=${PROD_BUILD}"
if [[ "${PROD_BUILD}" != "${EXPECTED_BUILD}" ]]; then
  echo "ERROR: production BUILD_ID incorrect after switch"
  exit 1
fi

echo "===== PASSENGER RESTART ====="
mkdir -p "${APP}/tmp"
touch "${APP}/tmp/restart.txt"
ls -la "${APP}/tmp/restart.txt"
echo "RESTART_TOUCHED=OK"
echo "WAIT 8s..."
sleep 8

echo "===== LOCAL SMOKE HEADERS ====="
for path in / /podcast /parcours /rejoindre /live /evenements /admin/login; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://citadelle.chapelleduroyaume.org${path}" || echo ERR)
  echo "HTTP ${code} ${path}"
done
for path in \
  /images/podcast/covers/instant-citadelle-cover.png \
  /images/podcast/covers/transformer-pour-rayonner.png \
  /images/podcast/parallax/podcast-parallax.png \
  /images/formations/parcours-1/module-1-vision-et-histoire.png \
  /images/formations/parcours-1/module-2-valeurs-du-royaume.png \
  /images/formations/parcours-1/module-3-rejoindre-une-cellule.png \
  /images/formations/parcours-1/module-4-nos-plateformes.png \
  /images/formations/parcours-1/module-5-mes-premiers-pas.png \
  /images/formations/parcours-1/module-6-mon-engagement.png \
  /images/formations/parcours-1/parcours-1-je-decouvre-la-maison.png
do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://citadelle.chapelleduroyaume.org${path}" || echo ERR)
  echo "HTTP ${code} ${path}"
done

echo "===== SUMMARY ====="
echo "EXPECTED_HEAD=${EXPECTED_HEAD}"
echo "EXPECTED_BUILD=${EXPECTED_BUILD}"
echo "ARCHIVE_SHA256=${REMOTE_SHA}"
echo "BACKUP=${BACKUP}"
echo "BACKUP_SHA256=${BACKUP_SHA}"
echo "CANDIDATE=${CANDIDATE}"
echo "PROD_BUILD_ID=${PROD_BUILD}"
echo "CITADELLE_HOMEPAGE_V3_REMOTE_DEPLOY_SCRIPT_DONE"
