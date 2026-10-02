# Languages: English and Dutch

The public site exists in English (`/en/...`) and Dutch (`/nl/...`).

## How visitors get their language

- Opening `/` (or any page without a language) redirects to **the visitor's
  browser language** (Dutch browsers go to `/nl`, everything else to `/en`).
- The EN / NL switch in the header goes to the same page in the other language.
  The choice is remembered in a cookie, so the next visit to `/` honours it.
- Every page has its own indexable URL per language with `hreflang` links, the
  sitemap lists both, and `/llms.txt`, `/llms-full.txt?lang=nl`,
  `/api/cv.json?lang=nl` and `/api/cv?lang=nl` (PDF) exist per language.

## How your content gets translated

Interface text (menus, buttons, headings) is built in. **Your own content**
works like this:

- Every item (profile, experience, education, project, skill) has a *source
  language*: the language you wrote it in (set in the form: "The text above is
  written in English/Dutch", or `sourceLang` over MCP).
- The other language is stored as a translation of the translatable fields
  (tagline, bio, job title, descriptions, bullet points, project summary,
  skill category, ...). Names, companies, dates, tags and links are the same in
  both languages.
- A visitor sees the translation if there is one, otherwise the original text.

Ways to fill in the translation:

1. **By hand** in the *Language and translation* box at the bottom of each admin
   form. Text you type is marked *written by hand* and is never overwritten.
2. **Translate automatically** button / automatic on save, if a translation
   service is configured (below). A machine translation can be corrected by
   hand afterwards, which turns it into a hand-written one.
3. **Via the MCP connector**: pass `translation` when creating/updating, or
   call `set_translation` (also hand-written).

If the original text changes after a hand-written translation was made, the
form shows "The original text changed since this translation was made". An
automatic translation is simply refreshed on the next save.

## Setting up automatic translation (optional)

Not an LLM: a translation API. Set **one** of these in the stack environment
variables (Portainer) or `.env` and redeploy. Without any, everything still
works, translations are then written by hand.

| Service | Variables | Notes |
| --- | --- | --- |
| **DeepL** | `DEEPL_API_KEY` | Best quality. The free plan (key ends in `:fx`) allows 500,000 characters a month, far more than a CV needs. |
| **LibreTranslate** (self-hosted) | `LIBRETRANSLATE_URL`, optional `LIBRETRANSLATE_API_KEY` | No account or cost; runs next to the site. Quality is lower than DeepL. Needs roughly 1-2 GB RAM. |

DeepL wins if both are set. Example LibreTranslate service for the same stack
(then set `LIBRETRANSLATE_URL=http://libretranslate:5000`):

```yaml
  libretranslate:
    image: libretranslate/libretranslate:latest
    restart: unless-stopped
    environment:
      LT_LOAD_ONLY: "en,nl"
    volumes:
      - lt_models:/home/libretranslate/.local
```

Text is only sent to the chosen service when you press Translate or save an
item without a hand-written translation. If the service is down or over its
quota the item is still saved, the form reports the error, and visitors see
the original text.

## Adding a language later

Add the code to `LOCALES` in `src/lib/i18n/config.ts`, a dictionary in
`src/lib/i18n/dictionary.ts`, and the admin translation panel and data model
need a small extension (a translation row per language already exists, the
panel currently edits the one language that is not the source).
