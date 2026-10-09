#!/bin/sh
# Redeploy this host's Portainer stack (re-pulling the image) when the host boots.
# Same call as the deploy job in .github/workflows/deploy.yml, for a host that was off during a deploy.
# Config comes from /etc/cv-site/redeploy.env (see docs/DEPLOYMENT.md#7-catch-up-redeploy-on-boot).
set -eu

CONFIG="${CV_SITE_REDEPLOY_ENV:-/etc/cv-site/redeploy.env}"
# shellcheck disable=SC1090
. "$CONFIG"

: "${PORTAINER_URL:?set in $CONFIG}" "${PORTAINER_TOKEN:?}" "${STACK_ID:?}" "${ENDPOINT_ID:?}"
BASE="${PORTAINER_URL%/}"
WAIT_SECONDS="${WAIT_SECONDS:-300}"

# Portainer may still be starting; wait until it answers.
waited=0
until curl -fsS -o /dev/null -H "X-API-Key: $PORTAINER_TOKEN" "$BASE/api/stacks/$STACK_ID"; do
  if [ "$waited" -ge "$WAIT_SECONDS" ]; then
    echo "Portainer not reachable after ${WAIT_SECONDS}s; giving up." >&2
    exit 1
  fi
  sleep 5
  waited=$((waited + 5))
done

# The redeploy REPLACES the stack's env with the body's "Env", so send the current one back unchanged.
# Refuse on an empty env rather than wiping the stack. Values are never printed.
ENV_JSON=$(curl -fsS "$BASE/api/stacks/$STACK_ID" -H "X-API-Key: $PORTAINER_TOKEN" | jq -c '.Env // []')
if [ "$ENV_JSON" = "[]" ]; then
  echo "Stack $STACK_ID has no environment variables in Portainer; refusing to redeploy." >&2
  exit 1
fi

BODY=$(jq -nc --argjson env "$ENV_JSON" '{Env: $env, PullImage: true, Prune: false}')
curl -fsS -X PUT "$BASE/api/stacks/$STACK_ID/git/redeploy?endpointId=$ENDPOINT_ID" \
  -H "X-API-Key: $PORTAINER_TOKEN" -H "Content-Type: application/json" \
  -d "$BODY" > /dev/null
echo "Redeployed stack $STACK_ID with a fresh image pull."
