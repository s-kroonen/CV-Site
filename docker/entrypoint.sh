#!/bin/sh
set -e

# DATABASE_URL is "file:/data/db/prod.db" - ensure its parent dir (and the
# uploads dir, if configured) are writable by the non-root runtime user.
# Docker named volumes are created root-owned, so this must run once as root
# before we drop privileges.
db_dir=$(dirname "${DATABASE_URL#file:}")
mkdir -p "$db_dir"
chown -R nextjs:nodejs "$db_dir"

if [ -n "$UPLOAD_DIR" ]; then
  mkdir -p "$UPLOAD_DIR"
  chown -R nextjs:nodejs "$UPLOAD_DIR"
fi

su-exec nextjs npx prisma migrate deploy

exec su-exec nextjs "$@"
