# TODO

Working list for the CV site. Tick items off as they land; add new ones at the bottom of the relevant section.

## 1. Admin form fixes (do first)

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

## 2. Trash & archive

- [ ] **Archive**: hide outdated/irrelevant entities from the public site without deleting them (`archivedAt` on every entity); archived list in admin with restore.
- [ ] **Trash (soft delete)**: delete moves to trash (`deletedAt`), restorable; "Empty trash"/permanent delete is a separate, confirmed action. Optional auto-purge after N days.
- [ ] Public queries and the CV PDF exclude archived/trashed rows; admin gets filter tabs: Active / Archived / Trash.
- [ ] Prisma migration + update every list/query touching entities.

## 3. Import & media

- [ ] Image upload for entities (project screenshots, company logos, profile photo) stored in `UPLOAD_DIR` volume.
  - [ ] Validate type/size, strip EXIF, generate resized/optimised variants (next/image friendly), alt-text field.
  - [ ] Serve through a safe route (no path traversal, correct content-type, cache headers).
- [ ] Import of other details for entities: bulk import from JSON/CSV (and maybe LinkedIn/GitHub export) with a preview + validation step before committing.
- [ ] Export/backup of all content (JSON + uploads) for restore and migration between the two hosts.

## 4. MCP server (AI tool access)

An AI tool must be able to **add, edit and remove** entities (and archive/restore, using the trash/archive from section 2).

- [ ] Decide transport and hosting: Streamable HTTP MCP endpoint in the Next.js app (e.g. `/api/mcp`) vs. separate small service.
- [ ] Auth: scoped API tokens managed from admin (create/revoke, hashed at rest, per-token scopes e.g. read-only vs. write, expiry, last-used). Passkey admin session is not usable by a headless client.
- [ ] Tools: `list_*`, `get_*`, `create_*`, `update_*`, `archive_*`, `restore_*`, `delete_*` (to trash) for profile, experience, education, projects, skills, tags; media upload/attach; search tags.
- [ ] Reuse the same validation/service layer as the admin forms so there is one code path.
- [ ] Dry-run / confirmation for destructive actions; audit log of every MCP change (who/token, what, when) with undo via trash.
- [ ] Rate limiting + input size limits; never expose private contact fields (email/phone) unless explicitly scoped.
- [ ] Docs: how to connect (Claude Desktop/Code config snippet) in `docs/`.
- [ ] Tests for tools, auth failures and scope enforcement.

## 5. Visual design

- [ ] Background is bland: keep the current colour palette but add depth (layered gradients/mesh, subtle grain/noise, soft glows, section-aware backgrounds, parallax or scroll-linked movement).
- [ ] Respect `prefers-reduced-motion` and keep contrast/readability; check performance on low-end devices.
- [ ] Verify in light/dark and mobile widths.

## 6. Findability / SEO / AI discoverability

- [ ] **Search engines**
  - [ ] Per-page `metadata` (title, description, canonical, Open Graph, Twitter cards) driven by profile data; generated OG image.
  - [ ] `app/sitemap.ts` and `app/robots.ts` (allow public pages; disallow `/admin`, `/api`); submit to Google Search Console / Bing Webmaster.
  - [ ] Structured data (JSON-LD): `Person`, `ProfilePage`, `WorkExperience`/`EducationalOccupationalCredential`, `CreativeWork`/`SoftwareSourceCode` for projects.
  - [ ] Semantic HTML, one `h1` per page, heading hierarchy, meaningful link text, image alt text.
  - [ ] Core Web Vitals pass (LCP/CLS/INP), fonts/images optimised, server-rendered content (no content hidden behind JS).
  - [ ] Dedicated crawlable URLs for individual projects (`/projects/[slug]`).
  - [ ] Make sure the bot-hiding of private email/phone does not hide public contact info that should be indexed.
- [ ] **LLMs / AI tools**
  - [ ] `/llms.txt` (and optionally `/llms-full.txt`) describing the site and linking clean markdown versions of the content.
  - [ ] Markdown/plain-text rendering of CV content (`.md` routes or content negotiation) for easy ingestion.
  - [ ] `robots.txt` rules for AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.) - decide allow/deny per bot.
  - [ ] Public read-only JSON of the CV (`/api/cv.json`) alongside the existing PDF.
  - [ ] Optional public read-only MCP endpoint / `/.well-known` discovery entry (separate from the write-capable admin MCP).
- [ ] Analytics-free verification: Search Console, Rich Results Test, Lighthouse in CI.

## 7. Infrastructure / carry-overs

- [ ] Provision secondary host: add `secondary` back to the deploy matrix, `SECONDARY_*` secrets, Portainer stack and env vars; DB sync only meaningful once it exists.
- [ ] Pin `github/codeql-action` and `appleboy/ssh-action` to commit SHAs (global rule).
- [ ] Confirm `SMTP_PORT` default (587) is what the mail provider needs.
- [ ] Decide on committing the `package-lock.json` `hasInstallScript` change.

## Suggested order

1. Section 1 (forms, tags, button text) - unblocks entering real content.
2. Section 2 (trash/archive) - data model changes the MCP and import build on.
3. Section 3 (media/import).
4. Section 4 (MCP).
5. Sections 5 and 6 (design, SEO) - can run in parallel with the above.
