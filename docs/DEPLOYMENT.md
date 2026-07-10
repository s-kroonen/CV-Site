# Deployment

Architecture recap: two independent Docker/Portainer hosts (a bare-metal box
and a Proxmox VM), each running an identical copy of this app behind your
existing Nginx Proxy Manager (NPM) instance, which terminates TLS and handles
the hostname. Cloudflare is **DNS-only** (no orange-cloud proxy, no tunnel) -
so all failover/redundancy below works at the DNS or reverse-proxy layer, not
via Cloudflare's WAF/proxy features.

- **Content** lives in a SQLite file per host, edited live through the
  passkey-protected `/admin` panel - not baked into the image.
- **Redundancy**: both hosts run the full stack; the primary's DB is
  replicated to the secondary on a schedule (see [DB sync](#db-sync)) so the
  secondary is a warm standby, not just a static error page.
- **CI/CD**: GitHub Actions builds, scans, and pushes an image to GHCR, then
  deploys to both hosts over SSH.

## 1. One-time GitHub repo setup

### Secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `PRIMARY_SSH_HOST` | Public IP/hostname of the bare-metal host |
| `PRIMARY_SSH_USER` | SSH user with Docker access on that host |
| `PRIMARY_SSH_KEY` | Private key for that user (deploy-only key, not your personal one) |
| `SECONDARY_SSH_HOST` | Public IP/hostname of the Proxmox VM |
| `SECONDARY_SSH_USER` | SSH user with Docker access on that host |
| `SECONDARY_SSH_KEY` | Private key for that user |
| `DEPLOY_PATH` | Absolute path to this repo's checkout on **both** hosts, e.g. `/opt/cv-site` (must be the same path on both) |
| `SYNC_REMOTE_HOST` | SSH target for the secondary, e.g. `deploy@secondary.example.com` |
| `SYNC_REMOTE_PATH` | Absolute path to the `db_data` volume's mount point on the secondary |

Generate a dedicated SSH keypair for deploys (don't reuse your personal one):

```bash
ssh-keygen -t ed25519 -f deploy_key -C "cv-site-deploy" -N ""
```

Add `deploy_key.pub` to `~/.ssh/authorized_keys` for the deploy user on **both**
hosts, and paste the contents of `deploy_key` (private) into the two
`*_SSH_KEY` secrets above.

### GHCR package visibility

The pushed image contains only compiled app code and static assets - no
secrets, no database. Making the GHCR package **public** (package Settings →
Change visibility) is the simplest option and lets both hosts `docker compose
pull` without any registry login. If you'd rather keep it private, run `docker
login ghcr.io` once on each host with a PAT that has `read:packages` scope.

## 2. First-time host setup (run once per host)

```bash
git clone <your-repo-url> /opt/cv-site   # match DEPLOY_PATH
cd /opt/cv-site
cp .env.example .env
```

Edit `.env` with real production values:

- `SITE_URL` - the real `https://` hostname NPM will serve (this becomes the
  WebAuthn relying-party ID - it **must** match what visitors' browsers see,
  or passkey login will fail).
- `SESSION_SECRET` - `openssl rand -hex 32`. Different per host is fine (only
  matters for cookies issued on that host, and the two-host session strategy
  is stateless per-host, not shared - see note below).
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` - real keys from
  your [Cloudflare Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile),
  not the test keys `.env.example` ships with.
- `SMTP_*` / `MAIL_FROM` - your outbound mail relay, for contact-form
  notifications.

> **Note on sessions across two hosts:** admin session cookies are signed
> with `SESSION_SECRET` and verified statelessly (no DB/shared store). If the
> two hosts have *different* `SESSION_SECRET` values, a session created after
> logging into one host won't validate on the other. Since Cloudflare Load
> Balancing (or your chosen failover) only sends a visitor to one host at a
> time, this only matters if you fail over mid-admin-session - in that case
> you'd just need to log in again. If you'd rather avoid that, use the same
> `SESSION_SECRET` on both hosts.

Bring it up for the first time:

```bash
export GHCR_IMAGE=ghcr.io/<owner>/<repo>
docker compose -f docker-compose.yml up -d
```

The entrypoint runs `prisma migrate deploy` automatically and creates the
data volumes with the right ownership.

### Registering the admin passkey

The production image intentionally ships without `devDependencies` (no
`tsx`, no raw TypeScript sources) to keep the runtime image lean - so
`npm run bootstrap-admin` (used in local dev) won't run inside the container.
Instead, generate the one-time setup link directly with Node's built-in
`crypto`, using the same signing scheme as `src/lib/session.ts`:

```bash
docker compose -f docker-compose.yml exec web node -e "
const { createHmac } = require('crypto');
const secret = process.env.SESSION_SECRET;
const body = { purpose: 'admin-bootstrap', data: {}, exp: Date.now() + 15*60*1000 };
const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
const sig = createHmac('sha256', secret).update(payload).digest('base64url');
console.log(process.env.SITE_URL + '/admin/setup?token=' + payload + '.' + sig);
"
```

Open the printed URL in a browser on the device you want to register as
admin (works once, until a passkey exists - the server re-checks this).

> If `src/lib/session.ts`'s signing scheme ever changes, update this snippet
> to match, or temporarily copy `scripts/bootstrap-admin.ts` + `tsx` into a
> one-off container instead.

Repeat first-time setup on the **second** host too (own `.env`, own
`docker compose up -d`) - or just let the first CI deploy handle it, since
`deploy.yml` runs `docker compose pull && up -d` on both hosts already; you
only need to have cloned the repo and written `.env` there first.

## 3. Wiring into Nginx Proxy Manager

Add a Proxy Host in NPM pointing at `127.0.0.1:3000` on **each** host
(the container publishes to loopback only - NPM and the app must be
reachable to each other, either both on the host network or joined to a
shared Docker network). Enable the "Force SSL" + HTTP/2 options as usual.

### Custom error page (local fallback)

Start the always-up maintenance page once per host, independent of the main
app's lifecycle:

```bash
docker compose -f docker-compose.maintenance.yml up -d
```

In NPM, under the proxy host's **Custom Error Pages** (or, if your NPM
version doesn't expose that per-host, in the global Nginx template), point
502/503/504 at the maintenance container (`127.0.0.1:3001`) instead of NPM's
default error page. This means: if the `web` container crashes but the host
and NPM are still up, visitors immediately see a branded "back shortly" page
instead of a raw connection error - and it survives `docker compose down` /
redeploys of the main app since it's a separate compose file.

## 4. Cross-host failover (whole host down)

Since Cloudflare is DNS-only here, there's no proxy-level failover to lean
on - this has to happen at actual DNS resolution.

**Recommended: Cloudflare Load Balancing** (a paid add-on, independent of
proxy/orange-cloud status) - configure a pool with both hosts' IPs and an
active health check against `GET /api/health` (expect `200` and
`{"status":"ok"}`). On a failed check, Cloudflare stops resolving that host's
IP for new lookups. This is real DNS-level failover to your live warm
standby, not just a maintenance page.

**Free alternative**: a small scheduled script (e.g. a GitHub Actions cron
job, or Uptime Kuma with its Cloudflare integration) that polls
`/api/health` on the primary and calls the Cloudflare API to swap the A
record to the secondary's IP if it fails. More moving parts, but no added
cost.

Either way, layer the NPM custom-error-page fallback (section 3) underneath -
it covers "container crashed but host is fine" instantly, while DNS failover
covers "entire host is unreachable" (which takes longer to detect and
propagate).

## 5. DB sync

`scripts/sync-db.sh` takes a consistent online backup of the primary's
SQLite file (via `better-sqlite3`'s backup API, not a raw file copy - safe
even while the app is actively writing) and ships it to the secondary. The
CI pipeline runs it once after every deploy; you should also cron it on the
primary host so content edited through `/admin` between deploys propagates
too:

```bash
# crontab -e on the PRIMARY host
*/15 * * * * CONTAINER_NAME=cv-site-web SYNC_REMOTE_HOST=deploy@secondary.example.com SYNC_REMOTE_PATH=/opt/cv-site/data/db /opt/cv-site/scripts/sync-db.sh >> /var/log/cv-site-sync.log 2>&1
```

Adjust `SYNC_REMOTE_PATH` to wherever the secondary's `db_data` volume is
actually mounted on disk (check with `docker volume inspect cv-site_db_data`
on the secondary).

## 6. Verifying a deploy

- `curl https://your-domain/api/health` → `{"status":"ok"}`
- `docker compose -f docker-compose.yml ps` → `web` healthy on both hosts
- Log into `/admin`, confirm content renders and edits show up on the public
  page immediately (everything is `force-dynamic` - no rebuild needed)
- Stop the `web` container on one host and confirm NPM shows the maintenance
  page, not a raw error
