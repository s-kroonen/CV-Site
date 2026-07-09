#!/bin/sh
# Replicates the live SQLite database from this (primary) host to the
# secondary host, so it stays a warm standby with near-current content
# between deploys. Run on the PRIMARY host only - via cron every ~15 min,
# and after each deploy. See docs/DEPLOYMENT.md.
#
# Required env vars:
#   CONTAINER_NAME   - name of the running web container (default: cv-site-web)
#   SYNC_REMOTE_HOST - ssh target for the secondary host, e.g. deploy@secondary.example.com
#   SYNC_REMOTE_PATH - absolute path to the db volume's mount point on the secondary host
set -e

CONTAINER_NAME="${CONTAINER_NAME:-cv-site-web}"
: "${SYNC_REMOTE_HOST:?set SYNC_REMOTE_HOST (e.g. deploy@secondary.example.com)}"
: "${SYNC_REMOTE_PATH:?set SYNC_REMOTE_PATH (path to the db volume mount on the secondary host)}"

SNAPSHOT_NAME="sync-snapshot-$(date +%s).db"

# Use better-sqlite3's online backup API rather than rsync-ing the live file
# directly - SQLite can be mid-write at any moment, so a naive file copy risks
# a torn, corrupt snapshot. db.backup() takes a consistent point-in-time copy
# safely even while the app keeps serving requests.
docker exec "$CONTAINER_NAME" node -e "
const Database = require('better-sqlite3');
const path = process.env.DATABASE_URL.replace(/^file:/, '');
const db = new Database(path, { readonly: true });
db.backup('/tmp/$SNAPSHOT_NAME').then(() => { db.close(); process.exit(0); });
"

docker cp "$CONTAINER_NAME:/tmp/$SNAPSHOT_NAME" "/tmp/$SNAPSHOT_NAME"
docker exec "$CONTAINER_NAME" rm -f "/tmp/$SNAPSHOT_NAME"

scp "/tmp/$SNAPSHOT_NAME" "$SYNC_REMOTE_HOST:$SYNC_REMOTE_PATH/prod.db.incoming"
ssh "$SYNC_REMOTE_HOST" "mv '$SYNC_REMOTE_PATH/prod.db.incoming' '$SYNC_REMOTE_PATH/prod.db'"
rm -f "/tmp/$SNAPSHOT_NAME"

echo "Synced database snapshot to $SYNC_REMOTE_HOST:$SYNC_REMOTE_PATH/prod.db"
