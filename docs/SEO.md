# Search and AI discoverability

What the site publishes so search engines and AI tools can find and read it.
All of it is generated from the live content, so it updates when you edit
something in the admin panel (or through the MCP connector).

| URL | What |
| --- | --- |
| `/en/...`, `/nl/...` | Every page exists per language (see `docs/TRANSLATION.md`); `/` redirects by browser language. Each language version carries `hreflang` links to the others, an `x-default` (English) and its own canonical URL. |
| `/robots.txt` | Allows everything public, blocks `/admin`, `/api/`, `/oauth/`. AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, ...) are listed explicitly as allowed. |
| `/sitemap.xml` | All public pages and project pages, with last-modified dates. Hidden sections (nothing to show) are left out. |
| `/llms.txt` | Short index for LLMs (llmstxt.org convention). |
| `/llms-full.txt?lang=nl` | The whole CV as one Markdown document (`lang=en` default). |
| `/api/cv.json?lang=nl` | The same content as structured JSON (active items only, never the private email/phone). |
| `/en/og-image`, `/nl/og-image` | Generated social preview card (name, tagline, location). Project pages use their cover image instead. |

Every page also carries a canonical link, Open Graph and Twitter tags, and
`<link rel="alternate">` pointers to the Markdown and JSON versions. The home
page has schema.org `Person` / `ProfilePage` / `WebSite` data and each project
page has `SoftwareSourceCode` data (JSON-LD). `/admin`, `/oauth` and `/api`
also send `X-Robots-Tag: noindex`.

## One-time setup after deploying

1. **Google Search Console**: add the property `https://storm.amber.kroon-en.nl`
   and choose the *HTML tag* verification method. Put the `content` value of
   the tag into the stack environment variable `GOOGLE_SITE_VERIFICATION`,
   redeploy, then press Verify. Submit `https://storm.amber.kroon-en.nl/sitemap.xml`.
2. **Bing Webmaster Tools** (optional): same idea with `BING_SITE_VERIFICATION`
   (the `msvalidate.01` value), or import the site from Search Console.
3. Check a page with Google's *Rich Results Test* and a link preview tool
   (e.g. paste the URL into a chat app) to see the card.

## Checking it

`npm run seo:check -- https://storm.amber.kroon-en.nl` (or `http://localhost:3000`)
crawls the running site and verifies about 200 things: robots and sitemap,
language redirects for different `Accept-Language` headers, and for every page
the title and description length, one `h1`, canonical and reciprocal `hreflang`
links, Open Graph tags, image alt text, valid JSON-LD, reachable social images,
the AI files, and that `/admin`, `/api` and `/oauth` stay private. It exits
with an error if anything fails. Run it after each deploy.

## Opting an AI crawler out

`robots.txt` is a request, not enforcement, but well-behaved bots follow it.
To block one, add its name to `BLOCKED_CRAWLERS` in `src/lib/seo.ts`.

## What helps most (content, not code)

Search engines rank on what is written: fill in the profile bio and tagline,
give every project a summary and description, and add alt text to images.
Empty sections are hidden, so the site only shows what you have filled in.
