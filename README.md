# CV Site

Personal CV / portfolio site — public profile, work experience, education, and
projects, all editable through a passkey-protected admin panel instead of
being hardcoded.

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS, Framer Motion
- Prisma + SQLite for content storage
- Passkeys (WebAuthn) for admin auth — no password
- Cloudflare Turnstile + click-to-reveal for hiding private contact info from bots
- Docker, GitHub Actions CI/CD

## Development

```bash
cp .env.example .env      # fill in SESSION_SECRET at minimum for local dev
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build/serve |
| `npm run typecheck` / `npm run lint` / `npm test` | Verification |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm run prisma:seed` | Seed placeholder CV content |
| `npm run bootstrap-admin` | One-time: register the first admin passkey |

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for Docker, reverse-proxy
(NPM), and two-host failover setup.
