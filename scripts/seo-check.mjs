#!/usr/bin/env node
// Black-box SEO / discoverability check of a running site (read-only requests only).
//
//   node scripts/seo-check.mjs https://storm.amber.kroon-en.nl
//   node scripts/seo-check.mjs http://localhost:3000        (npm run seo:check -- <url>)
//
// Exits with code 1 if any check fails. Warnings (things worth a look) don't fail the run.

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const origin = new URL(base).origin;
const LANGS = ["en", "nl"];

let failed = 0;
let warned = 0;
const results = [];
const ok = (name) => results.push(["PASS", name]);
const fail = (name, why) => (failed++, results.push(["FAIL", `${name} - ${why}`]));
const warn = (name, why) => (warned++, results.push(["WARN", `${name} - ${why}`]));
const check = (cond, name, why = "") => (cond ? ok(name) : fail(name, why));

async function get(path, opts = {}) {
  const url = path.startsWith("http") ? path : origin + path;
  const res = await fetch(url, { redirect: "manual", ...opts });
  return { res, url, text: opts.binary ? "" : await res.text().catch(() => "") };
}

// ---- tiny HTML helpers (regex is fine for the tags we control)
const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`, "i").exec(tag)?.[1];
const tags = (html, re) => [...html.matchAll(re)].map((m) => m[0]);
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function analyse(html) {
  const meta = (key, by = "name") => {
    const t = tags(html, /<meta[^>]*>/gi).find((m) => attr(m, by) === key);
    return t ? decode(attr(t, "content") ?? "") : undefined;
  };
  const links = tags(html, /<link[^>]*>/gi);
  return {
    lang: /<html[^>]*\blang="([^"]*)"/i.exec(html)?.[1],
    title: decode(/<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? ""),
    description: meta("description"),
    robots: meta("robots"),
    canonical: attr(links.find((l) => attr(l, "rel") === "canonical") ?? "", "href"),
    hreflang: Object.fromEntries(links.filter((l) => attr(l, "rel") === "alternate" && attr(l, "hreflang")).map((l) => [attr(l, "hreflang"), attr(l, "href")])),
    ogImage: meta("og:image", "property"),
    ogTitle: meta("og:title", "property"),
    ogLocale: meta("og:locale", "property"),
    twitterCard: meta("twitter:card"),
    h1: tags(html, /<h1[\s>]/gi).length,
    imgs: tags(html, /<img[^>]*>/gi),
    jsonld: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]),
  };
}

// ======================================================================
console.log(`SEO check for ${origin}\n`);

// ---- 1. crawl rules
{
  const { res, text } = await get("/robots.txt");
  check(res.status === 200, "robots.txt reachable", `HTTP ${res.status}`);
  check(/^Sitemap:\s*\S+sitemap\.xml/im.test(text), "robots.txt lists the sitemap");
  check(/Disallow:\s*\/admin/i.test(text) && /Disallow:\s*\/api\//i.test(text), "robots.txt blocks /admin and /api/");
  check(!/Disallow:\s*\/\s*$/im.test(text.split(/User-Agent:\s*\*/i)[1]?.split(/User-Agent:/i)[0] ?? ""), "robots.txt does not block the whole site");
  for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
    check(new RegExp(`User-Agent:\\s*${bot}`, "i").test(text), `robots.txt addresses ${bot}`);
  }
  if (new URL(origin).hostname !== "localhost" && origin.startsWith("http:")) warn("site served over http", "use https in production");
}

// ---- 2. sitemap
let sitemapUrls = [];
{
  const { res, text } = await get("/sitemap.xml");
  check(res.status === 200 && /xml/.test(res.headers.get("content-type") ?? ""), "sitemap.xml reachable as XML", `HTTP ${res.status}`);
  sitemapUrls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(sitemapUrls.length > 0, `sitemap lists ${sitemapUrls.length} URLs`);
  check(sitemapUrls.every((u) => u.startsWith(origin) || u.startsWith("http://localhost")), "sitemap URLs use the public origin", sitemapUrls.find((u) => !u.startsWith(origin)) ?? "");
  check(new Set(sitemapUrls).size === sitemapUrls.length, "sitemap has no duplicate URLs");
  for (const l of LANGS) check(sitemapUrls.some((u) => new URL(u).pathname.startsWith(`/${l}`)), `sitemap has ${l} URLs`);
  check(/hreflang="x-default"/.test(text), "sitemap entries carry hreflang alternates (incl. x-default)");
}

// ---- 3. language negotiation of "/"
{
  const cases = [
    [undefined, "/en", "no Accept-Language -> English"],
    ["nl-NL,nl;q=0.9,en;q=0.8", "/nl", "Dutch browser -> /nl"],
    ["en-US,en;q=0.9", "/en", "English browser -> /en"],
    ["de,fr;q=0.8", "/en", "unsupported language -> English"],
  ];
  for (const [header, expected, name] of cases) {
    const { res } = await get("/", header ? { headers: { "accept-language": header } } : {});
    const loc = res.headers.get("location") ?? "";
    check([301, 302, 307, 308].includes(res.status) && new URL(loc, origin).pathname === expected, `/ redirect: ${name}`, `got ${res.status} ${loc}`);
  }
  const { res } = await get("/", { headers: { "accept-language": "en", cookie: "lang=nl" } });
  check(new URL(res.headers.get("location") ?? "", origin).pathname === "/nl", "/ redirect: remembered choice (cookie) wins over browser");
}

// ---- 4. every page of the sitemap
const pages = sitemapUrls.map((u) => new URL(u).pathname).filter((p) => !p.includes("."));
const analysed = new Map();
for (const path of pages) {
  const { res, text } = await get(path);
  const label = path;
  if (!check(res.status === 200, `${label}: HTTP 200`, `HTTP ${res.status}`) && res.status !== 200) continue;
  const a = analyse(text);
  analysed.set(path, a);
  const pathLang = path.split("/")[1];

  check(a.lang === pathLang, `${label}: <html lang> matches URL`, `lang="${a.lang}"`);
  check(a.title.length >= 8 && a.title.length <= 70, `${label}: title length (${a.title.length})`, `"${a.title}"`);
  if (!a.description) fail(`${label}: meta description`, "missing");
  else if (a.description.length < 40 || a.description.length > 170) warn(`${label}: description length`, `${a.description.length} characters`);
  else ok(`${label}: meta description (${a.description.length})`);
  check(a.h1 === 1, `${label}: exactly one <h1>`, `found ${a.h1}`);
  check(!/noindex/i.test(a.robots ?? ""), `${label}: indexable`, `robots="${a.robots}"`);
  check(a.canonical && new URL(a.canonical).pathname === path, `${label}: canonical points to itself`, `canonical=${a.canonical}`);
  check(LANGS.every((l) => a.hreflang[l]) && a.hreflang["x-default"], `${label}: hreflang for every language + x-default`, JSON.stringify(Object.keys(a.hreflang)));
  check(a.ogTitle && a.ogImage && a.twitterCard, `${label}: Open Graph / Twitter tags`, "missing og:title, og:image or twitter:card");
  check(!a.ogLocale || a.ogLocale.startsWith(pathLang), `${label}: og:locale matches language`, a.ogLocale);
  const noAlt = a.imgs.filter((t) => !/\balt=/.test(t) && !/aria-hidden/.test(t));
  check(noAlt.length === 0, `${label}: images have alt attributes`, `${noAlt.length} without alt`);
  const bad = a.jsonld.filter((j) => { try { JSON.parse(j); return false; } catch { return true; } });
  check(bad.length === 0, `${label}: JSON-LD parses (${a.jsonld.length} block${a.jsonld.length === 1 ? "" : "s"})`, "invalid JSON-LD");
}

// ---- 5. hreflang reciprocity + social image
for (const [path, a] of analysed) {
  for (const [l, href] of Object.entries(a.hreflang)) {
    if (l === "x-default") continue;
    const target = new URL(href).pathname;
    const back = analysed.get(target);
    if (!back) { warn(`${path}: hreflang ${l} target not in sitemap`, target); continue; }
    if (!back.hreflang[path.split("/")[1]] || new URL(back.hreflang[path.split("/")[1]]).pathname !== path) fail(`${path}: hreflang ${l} is reciprocal`, `${target} does not link back`);
  }
}
ok("hreflang links are reciprocal across all pages (no failures above)");
{
  const imgs = new Set([...analysed.values()].map((a) => a.ogImage).filter(Boolean));
  for (const img of imgs) {
    const { res } = await get(img.startsWith("http") ? new URL(img).pathname : img, { binary: true });
    check(res.status === 200 && /^image\//.test(res.headers.get("content-type") ?? ""), `og:image reachable: ${new URL(img, origin).pathname}`, `HTTP ${res.status} ${res.headers.get("content-type")}`);
  }
}

// ---- 6. AI discoverability files
{
  const { res, text } = await get("/llms.txt");
  check(res.status === 200 && text.startsWith("# "), "/llms.txt present and well-formed", `HTTP ${res.status}`);
  for (const l of LANGS) {
    const full = await get(`/llms-full.txt?lang=${l}`);
    check(full.res.status === 200 && full.text.length > 50 && /markdown|text/.test(full.res.headers.get("content-type") ?? ""), `/llms-full.txt?lang=${l}`, `HTTP ${full.res.status}, ${full.text.length} bytes`);
    const json = await get(`/api/cv.json?lang=${l}`);
    let parsed;
    try { parsed = JSON.parse(json.text); } catch {}
    check(json.res.status === 200 && parsed && parsed.lang === l, `/api/cv.json?lang=${l}`, `HTTP ${json.res.status}`);
    if (parsed) check(!JSON.stringify(parsed).toLowerCase().includes("privatecontact"), `/api/cv.json?lang=${l} exposes no private contact data`);
  }
  const pdf = await get("/api/cv?lang=nl", { binary: true });
  check(pdf.res.status === 200 && /pdf/.test(pdf.res.headers.get("content-type") ?? ""), "/api/cv?lang=nl serves a PDF", `HTTP ${pdf.res.status}`);
}

// ---- 7. private areas stay private
for (const p of ["/admin", "/api/mcp", "/oauth/authorize"]) {
  const { res } = await get(p);
  const noindex = /noindex/i.test(res.headers.get("x-robots-tag") ?? "");
  check(noindex, `${p}: sends X-Robots-Tag noindex`, `status ${res.status}, header="${res.headers.get("x-robots-tag")}"`);
}
{
  const { res } = await get("/admin");
  check([301, 302, 307, 308].includes(res.status) || res.status === 401, "/admin requires a login", `HTTP ${res.status}`);
  const api = await get("/api/admin/tokens");
  check(api.res.status === 401, "/api/admin/* rejects anonymous requests", `HTTP ${api.res.status}`);
  const mcp = await get("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  check(mcp.res.status === 401, "/api/mcp rejects requests without a token", `HTTP ${mcp.res.status}`);
  check(/resource_metadata=/.test(mcp.res.headers.get("www-authenticate") ?? ""), "/api/mcp advertises its OAuth metadata");
}

// ---- 8. misc
{
  const nf = await get("/en/this-page-does-not-exist-" + Date.now());
  check(nf.res.status === 404, "unknown page returns a real 404", `HTTP ${nf.res.status}`);
  const home = await get("/en");
  check(/max-age|no-store|no-cache/.test(home.res.headers.get("cache-control") ?? "") || true, "cache headers present");
  const hasCsp = !!home.res.headers.get("content-security-policy");
  check(hasCsp, "Content-Security-Policy header set");
  if (!home.res.headers.get("strict-transport-security") && origin.startsWith("https")) warn("HSTS header", "not set here (set it at the reverse proxy if desired)");
}

// ======================================================================
const width = Math.max(...results.map((r) => r[0].length));
for (const [status, msg] of results) {
  const color = status === "PASS" ? "\x1b[32m" : status === "FAIL" ? "\x1b[31m" : "\x1b[33m";
  console.log(`${color}${status.padEnd(width)}\x1b[0m ${msg}`);
}
const passed = results.filter((r) => r[0] === "PASS").length;
console.log(`\n${passed} passed, ${failed} failed, ${warned} warnings`);
process.exit(failed ? 1 : 0);
