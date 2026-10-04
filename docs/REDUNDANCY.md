# Two hosts, one writing at a time

Two instances of the site run on machines that are **not on the same network** (different ISPs and public
IPs), one of them often switched off. Both can accept edits, but only one at a time, and their databases are
kept in step by pulling snapshots from each other over HTTPS. Nothing is merged.

| | Preferred host (`storm.amber…`, always on) | Standby host (the main machine behind Traefik, mostly off) |
| --- | --- | --- |
| `SITE_ROLE` | `preferred` (default) | `standby` |
| Takes edits (admin, MCP, OAuth, contact form) | whenever it is up and up to date | only when it cannot reach the preferred host |
| Serves the public site | as fallback | normally |

## How it behaves

- **Both up:** the preferred host takes all edits. The standby pulls the new data every few seconds and
  serves the public site.
- **Preferred down:** the standby takes over edits, using the data it last pulled.
- **Standby down:** the preferred host does everything.
- **A host that (re)starts answers 503 on every page until its first sync round has finished** (a few
  seconds), so the proxy keeps sending traffic to the other host meanwhile. If the peer is unreachable the
  round ends after the connection timeout and the host starts with what it has.
- **The preferred host comes back after the standby took edits:** it pulls them first and refuses edits until
  it has caught up. Nothing is overwritten.
- **Both changed independently** (for example a network split where both took edits): neither overwrites the
  other. Both stop taking edits and `/api/health` reports `conflict`. Resolve it by setting
  `SYNC_ON_CONFLICT=peer` on the host whose changes should be discarded and redeploying it: it saves a copy of its
  own data next to the database (`prod.db.conflict-<time>.db`) and adopts the other host's data. Remove the
  variable afterwards.
- **Edits made in the last few seconds before a host dies** (`SYNC_INTERVAL_SECONDS`, default 15) can be lost
  to the other host.
- A standby that has **never synced** with the preferred host will not take edits when the preferred host is
  down. Start both hosts once while both are reachable.

## How it works

SQLite triggers (migration `sync_meta`) bump a marker row on every change in any table. Each host keeps the
marker of the last state both hosts agreed on. Every round it reads the peer's marker over `/api/sync/state`:
equal means in sync; only the peer moved on means pull its database and uploads; only this host moved on means
wait (the peer pulls); both moved means conflict. Pulls are checksum-verified; uploads are copied first, so
the new database never points at a missing image. A test checks that every table has the triggers, so a table
added later cannot be forgotten.

> The older SSH-based `sync-db` job in `deploy.yml` and `scripts/sync-db.sh` (DEPLOYMENT.md section 5) copy
> the database in one direction only. Turn them off when you use this: they would overwrite edits.

## Settings

Same on both instances:

| Variable | Value |
| --- | --- |
| `SITE_URL` | `https://storm.kroon-en.nl` (the one canonical name; sitemap, canonicals and structured data use it) |
| `SESSION_SECRET` | identical on both |
| `SYNC_TOKEN` | random secret, at least 32 characters, identical on both (`openssl rand -hex 32`) |
| `WEBAUTHN_RP_ID` | `kroon-en.nl` (parent domain, so one passkey works on every subdomain) |
| `WEBAUTHN_ORIGINS` | `https://storm.kroon-en.nl,https://storm.amber.kroon-en.nl,https://storm-main.kroon-en.nl` |
| `SYNC_INTERVAL_SECONDS` | `15` (default; minimum 5) |

Per instance:

| | Preferred (amber) | Standby (main machine) |
| --- | --- | --- |
| `SITE_ROLE` | `preferred` | `standby` |
| `SYNC_PEER_URL` | `https://storm-main.kroon-en.nl` | `https://storm.amber.kroon-en.nl` |

`SYNC_PEER_URL` must be a name that reaches the other instance **directly**. Do not use `storm.kroon-en.nl`,
because Traefik routes that name to whichever host currently takes edits. `storm-main.kroon-en.nl` below is a
hostname that goes straight to the standby with no failover. Both instances must run the **same image
version** (deploy both; the schema travels with the data).

Without `SYNC_PEER_URL` the site runs standalone and none of this applies.

## Stack settings for a host without NPM (the Traefik-fronted main machine)

The compose file joins an external Docker network `npm_shared` (where NPM lives) and publishes the app on
`127.0.0.1:3000`. On a host that has no NPM, and whose proxy runs on another machine, set in that stack's
environment:

| Variable | Value | Why |
| --- | --- | --- |
| `PROXY_NETWORK_EXTERNAL` | `false` | compose creates the network itself instead of failing with "network npm_shared declared as external, but could not be found" |
| `PROXY_NETWORK` | `cv-site-proxy` (optional) | name for that network |
| `HOST_BIND` | this host's LAN IP, e.g. `192.168.1.20` (or `0.0.0.0`) | Traefik is on another machine, so loopback is not reachable |
| `HOST_PORT` | `3000` (default; change if taken) | the published port Traefik's `STANDBY-HOST-IP:PORT` points at |

Amber keeps the defaults (external `npm_shared`, loopback port 3000). The port inside the container is always 3000.

## Traefik (on the machine in front of the main host)

Adjust names and addresses; check the Traefik docs for your version (`failover` needs a health check on the main
service). The write routes use `/api/health/writable` as the health check, which is `200` only while that host may
take edits. The public routes use `/api/health`, which is `503` until the host has synced.

```yaml
http:
  routers:
    cv-writes:                       # edits, logins, MCP/OAuth, contact messages
      rule: >-
        Host(`storm.kroon-en.nl`) && (PathPrefix(`/admin`) || PathPrefix(`/api/admin`) ||
        PathPrefix(`/api/mcp`) || PathPrefix(`/oauth`) || PathPrefix(`/.well-known`) || Path(`/api/contact`))
      priority: 100
      service: cv-writes
      entryPoints: [websecure]
      tls: {}
    cv-public:                       # everything else
      rule: Host(`storm.kroon-en.nl`)
      priority: 10
      service: cv-public
      entryPoints: [websecure]
      tls: {}
    cv-standby-direct:               # the peer's view of the standby; no failover, used for sync only
      rule: Host(`storm-main.kroon-en.nl`)
      service: cv-standby-raw
      entryPoints: [websecure]
      tls: {}
  services:
    cv-amber-writable:               # amber, healthy only while it may take edits
      loadBalancer:
        passHostHeader: false        # amber's proxy expects its own hostname
        healthCheck: { path: /api/health/writable, interval: 5s, timeout: 3s }
        servers: [{ url: "https://storm.amber.kroon-en.nl" }]
    cv-amber-up:                     # amber, healthy as soon as it has synced
      loadBalancer:
        passHostHeader: false
        healthCheck: { path: /api/health, interval: 10s, timeout: 3s }
        servers: [{ url: "https://storm.amber.kroon-en.nl" }]
    cv-standby-up:                   # the standby, healthy as soon as it has synced
      loadBalancer:
        healthCheck: { path: /api/health, interval: 10s, timeout: 3s }
        servers: [{ url: "http://STANDBY-HOST-IP:3000" }]
    cv-standby-raw:
      loadBalancer:
        servers: [{ url: "http://STANDBY-HOST-IP:3000" }]
    cv-writes:                       # edits: amber while it can write, otherwise the standby
      failover:
        service: cv-amber-writable
        fallback: cv-standby-raw
    cv-public:                       # visitors: the standby while it is up, otherwise amber
      failover:
        service: cv-standby-up
        fallback: cv-amber-up
```

The standby refuses edits itself (503) while the preferred host is up, so a routing mistake cannot create two
diverging databases. If a Traefik decision and the app disagree, the app wins.

## Passkeys on every name

Setting `WEBAUTHN_RP_ID` changes what a passkey is bound to, so **the existing passkey stops working**. In order:

1. Deploy the new settings (an open admin session stays valid until it expires).
2. Mint an "additional passkey" link on the preferred host:

   ```bash
   docker compose exec web node -e "
   const { createHmac } = require('crypto');
   const body = { purpose: 'admin-bootstrap', data: { additional: '1' }, exp: Date.now() + 15*60*1000 };
   const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
   const sig = createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
   console.log(process.env.SITE_URL + '/admin/setup?token=' + payload + '.' + sig);
   "
   ```

   (Locally: `npm run bootstrap-admin -- --add`.)
3. Open the link, register the passkey. It is stored in the database and reaches the other host with the next
   sync. It signs in on `storm.kroon-en.nl`, `storm.amber.kroon-en.nl` and `storm-main.kroon-en.nl`.

Keep the old passkey row until the new one is confirmed working.

## Search engines

Verify only `storm.kroon-en.nl` in Search Console and submit its sitemap. Both hosts serve identical pages
whose `<link rel="canonical">` points at the main name. Set `GOOGLE_SITE_VERIFICATION` on both instances.

## Checks

- `curl https://storm.amber.kroon-en.nl/api/health` shows `role`, `canWrite`, `peerReachable` and `lastSyncAt`.
- Edit something on the preferred host; within `SYNC_INTERVAL_SECONDS` the standby serves it.
- Stop the preferred host: `https://storm-main.kroon-en.nl/api/health/writable` turns `200` within one interval and
  admin works on `storm.kroon-en.nl`. Start it again: it answers `503` until synced, then takes over; the
  standby's `/api/health/writable` goes back to `503`.
- Anonymous requests to `/api/sync/state` return `401`.
