#!/usr/bin/env bash
set -euo pipefail

# PremDigital full backup script
# - collects important files (user-db, xray, letsencrypt, system accounts)
# - creates a tar.gz archive
# - encrypts the archive with GPG symmetric AES256
# - optionally uploads the encrypted archive to a remote host (BACKUP_DEST)

DATE=$(date +%F)
TMPDIR="/root/premdigital-backup/${DATE}"
OUT_TAR="/root/premdigital-backup-${DATE}.tar.gz"
OUT_ENC="${OUT_TAR}.gpg"

# Files/dirs to include - adjust as needed
FILES=(
  "/etc/user-db.txt"
  "/etc/vpn_expiry.txt"
  "/usr/local/etc/xray/config.json"
  "/etc/xray/domain"
  "/etc/letsencrypt"
  "/etc/passwd"
  "/etc/shadow"
  "/etc/group"
  "/etc/gshadow"
  "/etc/systemd/system"
  "/root"
)

mkdir -p "$TMPDIR"

echo "[INFO] Collecting files into $TMPDIR"
for f in "${FILES[@]}"; do
  if [ -e "$f" ]; then
    echo "  - Adding: $f"
    # preserve absolute path structure by copying into TMPDIR with same basename
    base=$(basename "$f")
    # if it's a directory, copy recursively
    if [ -d "$f" ]; then
      cp -a "$f" "$TMPDIR/"
    else
      cp --preserve=mode,ownership,timestamps "$f" "$TMPDIR/"
    fi
  else
    echo "  - Skipping (not found): $f"
  fi
done

echo "[INFO] Creating tar.gz archive: $OUT_TAR"
tar -C "$TMPDIR" -czf "$OUT_TAR" .

# Encryption: prefer BACKUP_PASSPHRASE env var for non-interactive use
if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  echo "[INFO] Encrypting archive using GPG (symmetric) with provided BACKUP_PASSPHRASE"
  gpg --batch --yes --passphrase "$BACKUP_PASSPHRASE" --symmetric --cipher-algo AES256 --output "$OUT_ENC" "$OUT_TAR"
else
  echo "[WARN] BACKUP_PASSPHRASE not set. You will be prompted for a passphrase to encrypt the archive."
  gpg --symmetric --cipher-algo AES256 --output "$OUT_ENC" "$OUT_TAR"
fi

# Cleanup intermediate tar
rm -f "$OUT_TAR"

# Secure the encrypted archive
chmod 600 "$OUT_ENC" || true

# Optional remote upload (set BACKUP_DEST to user@host:/path)
if [ -n "${BACKUP_DEST:-}" ]; then
  echo "[INFO] Uploading $OUT_ENC to $BACKUP_DEST"
  scp "$OUT_ENC" "$BACKUP_DEST"
  if [ $? -eq 0 ]; then
    echo "[INFO] Upload finished"
    # Optionally remove local copy after successful upload. Uncomment if desired.
    # rm -f "$OUT_ENC"
  else
    echo "[WARN] Upload failed"
  fi
fi

# Final output
echo "[DONE] Encrypted backup: $OUT_ENC"

echo "[INFO] Temporary files removed: $TMPDIR"
rm -rf "$TMPDIR"

exit 0
