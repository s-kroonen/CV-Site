# TODO

Working list for the CV site. Tick items off as they land; add new ones at the bottom of the relevant section.

## 0. Bugs

- [x] **"Show phone / private email" reveals nothing** (button clicks, nothing appears; the contact form's Turnstile is likely affected too). Probable cause: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is inlined at build time, and the CI/Docker build has no value for it, so `<Turnstile>` renders `null` in production. Fix by passing the site key at runtime (read it in a server component and hand it to the client component as a prop) instead of a build-time `NEXT_PUBLIC_` var. Also show a visible error/fallback when the widget can't load (blocked script, missing key) instead of silence, and verify `TURNSTILE_SECRET_KEY` + hostname allow-list in the Cloudflare widget.

## 1. Admin form fixes (done)

- [x] **Optional fields**: audit every admin form (profile, experience, education, projects, skills). Only truly required fields (e.g. a title/name) should block saving; everything else may be left empty.
  - [x] Relax validation (zod/server-side) and make DB columns nullable where needed (Prisma migration).
  - [x] Public pages must render cleanly when a field is empty (no empty headings, dangling dates, "null", or empty chips).
  - [x] Clean up confusing/odd field labels, ordering and grouping; add short helper text where a field's purpose isn't obvious.
- [x] **Tag input with live search**
  - [x] Typing in a tag field shows live matches from existing tags (case-insensitive, fuzzy/substring).
  - [x] Click a match to add it; if nothing matches exactly, offer "Add *new tag*".
  - [x] Normalise tags (trim, collapse whitespace, case-insensitive uniqueness) so "React", "react " and "ReactJS" typos don't fork.
  - [x] Keyboard support (arrows, Enter, Backspace to remove), accessible combobox roles.
  - [x] Shared tag pool across projects/experience (derived from existing rows; categories pool for skills).
  - [ ] Later: dedicated `Tag` table + management view (rename/merge/delete across all entities).
- [x] **Buttons show no text**: save and other buttons render blank. Find the cause (likely text colour/background token clash or missing label) and fix across all admin buttons; check light/dark and disabled/loading states.

- [x] **Admin list search**: filter box on every admin list (matches title/company/etc. plus tags and tech stack).
- [ ] **npm audit**: `braces` (via `eslint-config-next` > `fast-glob`, dev-only) has no patched release yet. Don't take the `--force` fix (downgrades to eslint-config-next 14). Re-check `npm audit` periodically.

## 2. Trash & archive

- [x] **Archive**: hide outdated/irrelevant entities from the public site without deleting them (`archivedAt` on every entity); archived list in admin with restore.
- [x] **Trash (soft delete)**: delete moves to trash (`deletedAt`), restorable; "Empty trash"/permanent delete is a separate, confirmed action. Optional auto-purge after N days (not done).
- [x] Public queries and the CV PDF exclude archived/trashed rows; admin gets filter tabs: Active / Archived / Trash.
- [x] Prisma migration + update every list/query touching entities.

## 3. Import & media

- [x] Image upload for entities (project gallery, company/school logos, profile photo) stored in `UPLOAD_DIR` volume.
  - [x] Validate type/size, strip EXIF, resize + re-encode to WebP, thumbnail variant, alt-text field.
  - [x] Serve through a safe route (no path traversal, correct content-type, cache headers).
  - [x] Show images on the public site (project cards/page, header avatar, logos).
  - [ ] Media library / orphan cleanup (files no longer referenced by anything), and deleting files when an entity is purged.
- [x] Bulk import (JSON or ZIP with images) with validation and a preview before anything is written; add-new or replace-all modes (`/admin/data`).
  - [ ] Later: CSV import and LinkedIn/GitHub profile import.
- [x] Export/backup of all content (JSON, or ZIP with uploads) for restore and migration between the two hosts.

## 4. MCP server (AI tool access)

An AI tool must be able to **add, edit and remove** entities (and archive/restore, using the trash/archive from section 2).

- [x] Decide transport and hosting: Streamable HTTP MCP endpoint in the Next.js app (e.g. `/api/mcp`) vs. separate small service.
- [x] Auth: scoped API tokens managed from admin (create/revoke, hashed at rest, per-token scopes e.g. read-only vs. write, expiry, last-used). Passkey admin session is not usable by a headless client.
- [x] Tools: `list_*`, `get_*`, `create_*`, `update_*`, `archive_*`, `restore_*`, `delete_*` (to trash) for profile, experience, education, projects, skills, tags; media upload/attach; search tags.
- [x] Reuse the same validation/service layer as the admin forms so there is one code path.
- [x] Audit log of every MCP change (token, tool, item, when) shown in admin; "delete" only moves to trash (undo = restore), permanent delete stays admin-only.
- [x] Rate limiting + input size limits; never expose private contact fields (email/phone) unless explicitly scoped.
- [x] Docs: how to connect (Claude Desktop/Code config snippet) in `docs/`.
- [x] Tested: scopes, auth/expiry/revoke, origin check, validation errors, lifecycle, image upload, and an end-to-end run with the official MCP SDK client.
  - [ ] Add these as automated tests (vitest) so they run in CI.
- [x] OAuth 2.1 sign-in for the MCP endpoint (discovery, dynamic client registration, PKCE, refresh rotation, consent with admin passkey) so claude.ai custom connectors and Claude Desktop can connect; connected apps are listed/revocable in admin. Tested end to end with the official MCP SDK client.

## 5. Visual design / layout

- [x] **Tabbed page layout** (modelled on CV/personal sites like a simple LinkedIn profile or personal blog, but lighter and more personal): replace the single long scroll with tabs/pages - a default **Overview/Home** (hero, short about, highlights), plus **Experience**, **Projects**, **Skills**, **Education**, **Contact** (own URLs such as `/experience`, `/contact` so each is linkable and indexable). Sticky top nav with the active tab highlighted; keep it usable on mobile (scrollable tab bar or menu).
- [x] **Light mode**: proper light theme (currently only follows the OS) with a manual light/dark toggle in the nav, remembered per visitor; keep the existing colour palette in both. Audit contrast.
- [x] Profile-style details borrowed from LinkedIn/blog layouts, kept simple: profile header with avatar, headline, location and quick links; skill chips; experience as a clean timeline with company logos; featured projects; "last updated" note.
- [x] Small UI polish pass: profile header with pill links, focus states, skip link, last-updated note, localized 404, linked projects on experience cards, content visible without JavaScript.

- [x] Background: same palette with depth - drifting accent/ochre glows per tab with scroll parallax, faint grid, film grain (`components/site/Backdrop.tsx`).
- [x] Respects `prefers-reduced-motion` (static); checked light and dark.
- [ ] Check performance on low-end devices / mobile Safari (fixed layer + large gradients).

## 6. Findability / SEO / AI discoverability

- [ ] **Search engines**
  - [x] Per-page `metadata` (title, description, canonical, Open Graph, Twitter cards) driven by profile data; generated OG image.
  - [x] `app/sitemap.ts` and `app/robots.ts` (allow public pages; disallow `/admin`, `/api`); submit to Google Search Console / Bing Webmaster.
  - [x] Structured data (JSON-LD): `Person`, `ProfilePage`, `WorkExperience`/`EducationalOccupationalCredential`, `CreativeWork`/`SoftwareSourceCode` for projects.
  - [x] Semantic HTML, one `h1` per page, heading hierarchy, meaningful link text, image alt text.
  - [ ] Core Web Vitals pass (LCP/CLS/INP), fonts/images optimised, server-rendered content (no content hidden behind JS).
  - [x] Dedicated crawlable URLs for individual projects (`/projects/[slug]`).
  - [x] Make sure the bot-hiding of private email/phone does not hide public contact info that should be indexed.
- [ ] **LLMs / AI tools**
  - [x] `/llms.txt` (and optionally `/llms-full.txt`) describing the site and linking clean markdown versions of the content.
  - [x] Markdown/plain-text rendering of CV content (`.md` routes or content negotiation) for easy ingestion.
  - [x] `robots.txt` rules for AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.) - decide allow/deny per bot.
  - [x] Public read-only JSON of the CV (`/api/cv.json`) alongside the existing PDF.
  - [ ] Optional public read-only MCP endpoint / `/.well-known` discovery entry (separate from the write-capable admin MCP).
- [x] `npm run seo:check` crawls a running site and verifies robots, sitemap, hreflang, metadata, JSON-LD, AI files and private areas (see `docs/SEO.md`).
- [ ] After deploy: run it against production, set up Search Console, Rich Results Test, Lighthouse in CI.

## 7. Infrastructure / carry-overs

- [ ] Provision secondary host: add `secondary` back to the deploy matrix, `SECONDARY_*` secrets, Portainer stack and env vars; DB sync only meaningful once it exists.
- [ ] Pin `github/codeql-action` and `appleboy/ssh-action` to commit SHAs (global rule).
- [ ] Confirm `SMTP_PORT` default (587) is what the mail provider needs.
- [ ] Decide on committing the `package-lock.json` `hasInstallScript` change.

## 8. Linked content and detail pages

- [x] **Relations** between items (many-to-many, editable in admin and via MCP):
  - [x] Experience <-> Project (a role can have several projects; a project can belong to several roles).
  - [x] Experience <-> Education (e.g. an internship belongs to a study programme).
  - [x] Education never links to projects directly: a project that belongs to a study must hang off an experience; the education page shows those projects *through* its linked experiences.
- [x] **Detail pages** (own URL per language, in the sitemap, with JSON-LD):
  - [x] Experience detail: full description, bullet points, tags, linked projects and linked education.
  - [x] Project detail: also shows the experiences it belongs to (reverse link).
  - [x] Education detail: linked experiences (and their projects).
  - [ ] Later: show linked projects on the Experience cards as small chips.
- [x] **Compact lists**: the Overview and the Experience tab show basic info only (title, company, dates, short description, no bullet points) as cards that link to the detail page.
- [x] Admin pickers for linking (search + add/remove), import/export and MCP tools carry the links.

## 9. Languages (English / Dutch)

- [x] Language prefix in URLs (`/en`, `/nl`), default from the browser's Accept-Language, remembered choice, language switcher, hreflang.
- [x] Interface text in both languages; content translated per item (hand-written or via a translation API: DeepL or self-hosted LibreTranslate - no LLM), source language per item, "out of date" flag.
- [x] Admin translation panel, MCP `set_translation`, translations included in export/import, localized PDF, sitemap and llms files per language.

## 10. GitHub projects and education import

- [x] Inventory of all public repos (`docs/github-inventory.md`) with groups and proposed links.
- [x] Project **category** (grouping on the Projects tab), **status** (ongoing / on hold / completed / experiment / discontinued) and period (start/end) - database, admin, public site, translation, import/export, MCP.
- [ ] After deploy: import the ~28 own repos as projects (basic info), the "study projects" experience linked to education, education items (HBO ICT, HBO TI, HAVO), Jumbo experience, CV profile text as Dutch bio and skills; add the freelance NRG2Fly note.

## Suggested order

1. Section 1 (forms, tags, button text) - unblocks entering real content.
2. Section 2 (trash/archive) - data model changes the MCP and import build on.
3. Section 3 (media/import).
4. Section 4 (MCP).
5. Sections 5 and 6 (design, SEO) - can run in parallel with the above.

## 11. Two-host redundancy (preferred host + standby, one writes at a time)

- [x] Data state marker (SyncMeta + triggers on every table); each host pulls the other's snapshot and uploads when the peer is ahead; conflicts stop instead of overwriting - see docs/REDUNDANCY.md.
- [x] Preferred host takes edits when up and caught up; standby takes edits only when the preferred host is unreachable.
- [x] A host answers 503 (pages and `/api/health`) until its first sync round is done; `/api/health/writable` for the proxy's write routes.
- [x] Passkeys across hostnames: `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGINS`, plus "additional passkey" setup links.
- [x] Verified with two real server processes (boot 503 -> 200, failover, edit while the other host is down, catch-up).
- [ ] Deploy: env on both stacks, Traefik routers (docs), register the new passkey, delete the unused SSH sync secrets and `sync` user, verify `storm.kroon-en.nl` in Search Console.
- [ ] Not yet run as Docker images in production.
