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
  replicated to the secondary on a schedule (see [DB sync](#5-db-sync)) so the
  secondary is a warm standby, not just a static error page.
- **CI/CD**: GitHub Actions builds, scans, and pushes an image to GHCR, then
  triggers a redeploy on each host via its Portainer API (git-based stacks),
  followed by a DB sync trigger over a restricted SSH command (see
  [DB sync](#5-db-sync)).

## 1. One-time GitHub repo setup

### Secrets

Add these under **Settings → Secrets and variables → Actions**. Currently
only `PRIMARY_*` is configured (testing with one host) - add the `SECONDARY_*`
equivalents once that host exists, and add `secondary` back to the `deploy`
job's matrix in `deploy.yml` at the same time.

| Secret | Value |
| --- | --- |
| `PRIMARY_PORTAINER_URL` | Base URL of the primary host's Portainer, e.g. `https://portainer.example.com` (no trailing slash) |
| `PRIMARY_PORTAINER_TOKEN` | A Portainer API access token: Portainer UI → user menu → **My account** → **Access tokens** → **Add access token**. Scope it as tightly as Portainer allows |
| `PRIMARY_STACK_ID` | Numeric ID of the git-based stack for this app: **Stacks** → click it → ID is in the URL, or `GET /api/stacks` |
| `PRIMARY_ENDPOINT_ID` | Numeric ID of the Portainer environment that stack lives on: **Environments** → click it → ID in the URL, or `GET /api/endpoints` |
| `PRIMARY_SSH_HOST` | SSH host for triggering the DB sync (kept as a secret, not a plain variable, along with the port below - both reveal details about how the primary host's SSH is reachable) |
| `PRIMARY_SSH_PORT` | SSH port for that connection |
| `SYNC_SSH_KEY` | Private key for the restricted `sync` user whose `authorized_keys` forces a fixed sync command (set up via your Ansible playbooks) - **never** the host's primary/admin SSH key |

The stack itself must already exist in Portainer as a **git-based stack**
pointing at this repo with `docker-compose.yml` (repo root) as the compose
file - the redeploy API call only tells Portainer "re-pull and redeploy an
existing stack," it does not create one.

### GHCR package visibility

The pushed image contains only compiled app code and static assets - no
secrets, no database. Making the GHCR package **public** (package Settings →
Change visibility) is the simplest option and lets both hosts `docker compose
pull` without any registry login. If you'd rather keep it private, run `docker
login ghcr.io` once on each host with a PAT that has `read:packages` scope.

## 2. First-time host setup (run once per host)

### Environment variables: two mechanisms, same variable names

`docker-compose.yml` deliberately uses variable substitution (`${VAR}`) for
every secret-shaped setting rather than `env_file: - .env`. `env_file`
requires an actual file sitting next to the compose file on disk - fine for
a manual local `docker compose up` (a `.env` file at the repo root, loaded
automatically), but Portainer's git-based stack deploy pulls straight from
the git checkout with no separate file-upload step, so that file can never
exist there. It failed with `env file /data/compose/<id>/.env not found`
until this was switched over. `${VAR}` substitution works identically both
ways:

- **Locally**: create a `.env` file at the repo root (`cp .env.example .env`,
  then fill in real values) - `docker compose` loads it automatically for
  substitution, no `env_file:` directive needed.
- **On Portainer**: open the stack → **Environment variables** (in the stack
  editor, not a file) and add each of the variables below as a key/value
  pair. Portainer injects these the same way a shell `export` would, so the
  same `${VAR}` placeholders in `docker-compose.yml` resolve correctly.

Variables to set either way:

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
  notifications. Optional - blank is fine until you wire up mail.

> **Note on sessions across two hosts:** admin session cookies are signed
> with `SESSION_SECRET` and verified statelessly (no DB/shared store). If the
> two hosts have *different* `SESSION_SECRET` values, a session created after
> logging into one host won't validate on the other. Since Cloudflare Load
> Balancing (or your chosen failover) only sends a visitor to one host at a
> time, this only matters if you fail over mid-admin-session - in that case
> you'd just need to log in again. If you'd rather avoid that, use the same
> `SESSION_SECRET` on both hosts.

Bring it up for the first time (locally, or manually on a host before its
Portainer stack exists):

```bash
export GHCR_IMAGE=ghcr.io/<owner>/<repo>
docker compose -f docker-compose.yml up -d
```

The entrypoint runs `prisma migrate deploy` automatically and creates the
data volumes with the right ownership. Once the Portainer git-stack is set
up with the same environment variables, `deploy.yml`'s redeploy call takes
over for subsequent deploys.

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

Once a second host exists, its Portainer git-stack needs to be created and
configured with its own environment variables the same way as primary (see
above) before adding `secondary` back to `deploy.yml`'s matrix and its
secrets - `deploy.yml` only redeploys stacks that already exist, it doesn't
create them.

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

Sync execution itself now lives outside this repo, in Ansible playbooks that
provision a restricted `sync` user on the primary host - its
`authorized_keys` entry forces a fixed command (e.g.
`command="/opt/sync/sync-cv-site.sh" ssh-ed25519 ...`) regardless of what's
actually passed over SSH, so `SYNC_SSH_KEY` can only ever trigger that one
script, nothing else. `deploy.yml`'s `sync-db` job just opens that SSH
connection after every deploy to kick it off - it doesn't pass parameters or
know what the script does internally.

`scripts/sync-db.sh` in this repo is kept as the reference implementation of
*what that sync should do*: take a consistent online backup of the primary's
SQLite file via `better-sqlite3`'s backup API (not a raw file copy - safe
even while the app is actively writing), then ship it to the secondary. If
your Ansible-provisioned script diverges from this, keep this file updated
to match so it stays useful as documentation, or cron it directly instead if
you'd rather not maintain the Ansible side:

```bash
# crontab -e on the PRIMARY host
*/15 * * * * CONTAINER_NAME=cv-site-web SYNC_REMOTE_HOST=deploy@secondary.example.com SYNC_REMOTE_PATH=/opt/cv-site/data/db /opt/cv-site/scripts/sync-db.sh >> /var/log/cv-site-sync.log 2>&1
```

Adjust `SYNC_REMOTE_PATH` to wherever the secondary's `db_data` volume is
actually mounted on disk (check with `docker volume inspect cv-site_db_data`
on the secondary). None of this applies yet while only the primary host
exists - the `sync-db` job is safe to leave wired up, but there's nowhere to
sync to until the secondary is provisioned.

## 6. Verifying a deploy

- `curl https://your-domain/api/health` → `{"status":"ok"}`
- In Portainer, the stack's `web` service shows healthy (or
  `docker compose -f docker-compose.yml ps` if checking directly on the host)
  - on both hosts, once secondary is in the mix
- Log into `/admin`, confirm content renders and edits show up on the public
  page immediately (everything is `force-dynamic` - no rebuild needed)
- Stop the `web` container on one host and confirm NPM shows the maintenance
  page, not a raw error
