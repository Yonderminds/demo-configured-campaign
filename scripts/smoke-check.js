#!/usr/bin/env node

/**
 * Smoke check for CPK campaigns.
 *
 * Discovers all campaigns by scanning for {campaign}/src/{slug}/ directories
 * from the repo root — works for any campaign name or count.
 *
 * Checks each campaign for:
 * - assets/config.js present and has apiKey
 * - Required frontmatter fields (title, page_type, next_success_url, etc.)
 * - campaign_include references that resolve to real files in _includes/
 * - Local scripts/styles in frontmatter that exist in assets/
 * - No hardcoded localhost URLs in page HTML
 * - Tailwind build wiring: if a campaign uses Tailwind, the local build step
 *   must be wired and the CDN must not ship to production (see checkTailwind)
 * - NEXT-hosted assets use cdn.cachebucket.com, never the legacy
 *   cdn.29next.store host — warning on previews, error on production
 *   (see checkAssetCdnHost)
 *
 * Plus non-blocking quality warnings (never fail the preview):
 * - config.js / campaigns.json completeness — placeholder/empty store details
 * - favicon + Open Graph tags present (scans layouts, not just pages)
 * - oversized raster images, locally-served video, video without IntersectionObserver
 *
 * Page-speed checks, for the slugs a PR changes only
 * (SMOKE_CHANGED_BASE, set by the PR workflow; SMOKE_SPEED_ALL=1 for every slug):
 * - pages that bypass the shared layouts; PNGs > 150 KB and images > 300 KB in the repo
 * - heavy media incl. files on the NEXT CDN (HEAD request for the size): videos > 2 MB,
 *   CDN images > 300 KB, video on a checkout, <video> without poster / preload.
 *   SMOKE_OFFLINE=1 skips the network.
 * - an `async` SDK loader without window.nextConfig inlined above it (every slug, error)
 */

const fs   = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

// Netlify sets CONTEXT to 'production' on the main deploy, and
// 'deploy-preview' / 'branch-deploy' on PR and branch previews.
const IS_PRODUCTION = process.env.CONTEXT === 'production';

// ── Discovery ────────────────────────────────────────────────────────────────

function discoverCampaigns() {
  const campaigns = [];

  const skip = new Set(['.git', '.github', 'node_modules', 'scripts', '_site']);

  const topLevel = fs.readdirSync(REPO_ROOT).filter(name => {
    if (skip.has(name) || name.startsWith('.')) return false;
    return fs.statSync(path.join(REPO_ROOT, name)).isDirectory();
  });

  for (const folder of topLevel) {
    const srcDir = path.join(REPO_ROOT, folder, 'src');
    if (!fs.existsSync(srcDir)) continue;

    const slugs = fs.readdirSync(srcDir).filter(name => {
      return fs.statSync(path.join(srcDir, name)).isDirectory();
    });

    for (const slug of slugs) {
      const dir = path.join(srcDir, slug);
      // Must look like a campaign dir — has _includes/ or assets/
      if (
        fs.existsSync(path.join(dir, '_includes')) ||
        fs.existsSync(path.join(dir, 'assets'))
      ) {
        campaigns.push({ label: `${folder}/src/${slug}`, dir });
      }
    }
  }

  return campaigns;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let errors   = 0;
let warnings = 0;
const findings = [];   // { level, file, msg } — collected for the PR report

// In GitHub Actions, also emit workflow commands so findings surface as inline
// PR annotations (yellow for warnings, red for errors) without opening CI logs.
const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === 'true';

function annotate(level, file, msg) {
  if (!IS_GITHUB_ACTIONS) return;
  // Workflow commands are single-line; encode any newlines just in case.
  console.log(`::${level} title=smoke-check::${file}: ${msg}`.replace(/\n/g, '%0A'));
}

function error(file, msg) {
  console.error(`  \x1b[31mERROR\x1b[0m  ${file}: ${msg}`);
  annotate('error', file, msg);
  findings.push({ level: 'error', file, msg });
  errors++;
}

function warn(file, msg) {
  console.warn(`  \x1b[33mWARN\x1b[0m   ${file}: ${msg}`);
  annotate('warning', file, msg);
  findings.push({ level: 'warning', file, msg });
  warnings++;
}

// Optional recommendations: shown in the report, not counted as warnings.
let notes = 0;
function note(file, msg) {
  console.log(`  \x1b[36mNOTE\x1b[0m   ${file}: ${msg}`);
  annotate('notice', file, msg);
  findings.push({ level: 'note', file, msg });
  notes++;
}

// Write a markdown findings report to $SMOKE_CHECK_REPORT, if set. The PR
// workflow reads this file and posts it as a sticky PR comment, so developers
// (who don't have Netlify deploy-log access) see every finding directly on the
// PR — including warnings that don't block the preview but WILL block the
// production deploy.
function writeReport() {
  const reportPath = process.env.SMOKE_CHECK_REPORT;
  if (!reportPath) return;

  const out = ['<!-- smoke-check-report -->', '## 🚦 Smoke check', ''];

  if (findings.length === 0) {
    out.push('✅ All checks passed.');
  } else {
    out.push(`Found **${errors} error(s)**, **${warnings} warning(s)** and ${notes} recommendation(s).`, '');
    out.push('| | Location | Finding |', '|---|---|---|');
    for (const f of findings) {
      const icon = f.level === 'error' ? '🔴' : f.level === 'note' ? '🔵' : '🟡';
      out.push(`| ${icon} | \`${f.file}\` | ${f.msg.replace(/\|/g, '\\|')} |`);
    }
    out.push('');
    out.push('> 🔴 **Errors** fail this check and block the deploy.');
    out.push('> 🟡 **Warnings** don\'t block the preview — but read each one: ' +
      'some (e.g. a Tailwind CDN reference) become **errors on the production deploy to `main`**.');
    if (notes > 0) out.push('> 🔵 **Recommendations** are optional.');
  }

  out.push('', '<sub>Generated by `scripts/smoke-check.js`.</sub>', '');
  fs.writeFileSync(reportPath, out.join('\n'));
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fm    = {};
  const lines = match[1].split('\n');
  let i = 0;

  while (i < lines.length) {
    const line     = lines[i];
    const keyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      const val = keyMatch[2].trim();

      if (val === '') {
        const arr = [];
        let j = i + 1;
        while (j < lines.length && /^\s+-\s/.test(lines[j])) {
          arr.push(lines[j].replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, ''));
          j++;
        }
        fm[key] = arr.length > 0 ? arr : null;
        i = j;
        continue;
      } else {
        fm[key] = val.replace(/^["']|["']$/g, '');
      }
    }
    i++;
  }

  return fm;
}

function extractIncludes(content) {
  const regex    = /{%[-\s]*campaign_include\s+'([^']+)'/g;
  const includes = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    includes.push(match[1]);
  }
  return includes;
}

function stripFrontmatter(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n/, '');
}

// Recursively collect every file under root (skips node_modules + dotfiles).
function listFiles(root) {
  const out = [];
  (function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(p);
    }
  })(root);
  return out;
}

// Text files worth scanning for markup/config (layouts, includes, pages, css).
function listTextFiles(root) {
  const exts = new Set(['.html', '.css', '.liquid', '.njk']);
  return listFiles(root).filter(f => exts.has(path.extname(f)));
}

// ── Quality checks (all warnings — they never block a preview) ──────────────────

const IMAGE_EXTS       = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);
const VIDEO_EXTS       = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const IMAGE_WARN_BYTES = 300 * 1024;  // a full-width hero fits in this as WebP at quality ~80
const PNG_WARN_BYTES   = 150 * 1024;  // a PNG this big is almost always a photo that should be WebP

// Placeholder values shipped in the template docs/scaffold — if any survive into
// a real campaign, the field was never configured.
const PLACEHOLDER = /acme\.com|acme store|your-store-name|your-api-key-here|1-800-555-0100|GTM-XXXXXXX|YOUR_PIXEL_ID/i;

function fmtKB(bytes) { return `${Math.round(bytes / 1024)} KB`; }

// Read and concatenate all of a campaign's markup (pages + layouts + includes).
function readMarkup(dir) {
  let markup = '';
  for (const f of listTextFiles(dir)) {
    if (['.html', '.liquid', '.njk'].includes(path.extname(f))) {
      markup += fs.readFileSync(f, 'utf8') + '\n';
    }
  }
  return markup;
}

// Favicon + Open Graph tags. Scans layouts too, since the <head> lives there.
function checkMetaTags(label, dir) {
  const markup = readMarkup(dir);
  if (!markup) return;

  if (!/rel=["'](shortcut\s+)?(icon|apple-touch-icon)["']/i.test(markup)) {
    warn(label, 'no favicon link (<link rel="icon"> or apple-touch-icon) found in any layout or page');
  }

  const ogMissing = ['og:title', 'og:image', 'og:description'].filter(p => !markup.includes(p));
  if (ogMissing.length === 3) {
    warn(label, 'no Open Graph tags (og:title, og:image, og:description) — social/link previews will be blank');
  } else if (ogMissing.length > 0) {
    warn(label, `missing Open Graph tag(s): ${ogMissing.join(', ')} — incomplete social/link previews`);
  }
}

// Locally-served video and uncontrolled video playback. (Image sizes: checkSpeed.)
function checkMediaAssets(label, dir) {
  const markup = readMarkup(dir);
  const hasVideo = /<video[\s>]/i.test(markup);

  // Local (non-CDN) <video>/<source> sources — large media should be CDN-delivered.
  const srcRe = /<(?:video|source)\b[^>]*\bsrc=["']([^"']+)["']/gi;
  const localVids = new Set();
  let m;
  while ((m = srcRe.exec(markup)) !== null) {
    const src = m[1];
    const ext = path.extname(src.split('?')[0]).toLowerCase();
    if (VIDEO_EXTS.has(ext) && !/^(https?:)?\/\//i.test(src)) localVids.add(src);
  }
  for (const v of localVids) {
    warn(label, `video served from a local asset (${v}) — deliver video via CDN, not bundled with the campaign`);
  }

  // Video present but nothing pauses it when scrolled offscreen.
  if (hasVideo) {
    let js = markup;
    for (const f of listFiles(dir)) {
      if (path.extname(f) === '.js') js += fs.readFileSync(f, 'utf8') + '\n';
    }
    if (!/IntersectionObserver/.test(js)) {
      warn(label, "video element(s) present but no IntersectionObserver found — videos won't pause when scrolled offscreen");
    }
  }
}

// In-page anchor links must resolve to a real element id in the same campaign.
// A nav linking to "#features" with nothing carrying id="features" silently does
// nothing — no build error, no runtime error, just a dead jump. (This is exactly
// the class of bug that shipped in a real campaign and prompted this check.)
//
// The campaign_link filter is NOT the cause: it returns "#"-prefixed input
// verbatim, so href="#x" and href="{{ '#x' | campaign_link }}" both render to the
// same "#x" — the missing id is the bug. We extract anchor targets from BOTH
// authored forms and check each against the set of ids defined anywhere in the
// campaign markup (pages + layouts + includes), since a nav include and its
// target section live in different files that render into the same page.
//
// Campaign-level aggregation can over-approximate (an id present on a different
// page still counts as "defined"), so this is a warning, not a blocker — a clean
// post-build pass over _site/ would be exact. In practice it catches the real
// failure mode: an anchor whose target id exists in no file at all.
function checkAnchors(label, dir) {
  const markup = readMarkup(dir);
  if (!markup) return;

  // Every id="..." defined anywhere (skip Liquid-templated ids like id="{{ x }}").
  const ids = new Set();
  let m;
  const idRe = /\bid=["']([^"'{}\s]+)["']/g;
  while ((m = idRe.exec(markup)) !== null) ids.add(m[1]);

  // Anchor targets, from plain and Liquid-filtered hrefs:
  //   href="#features"
  //   href="{{ '#features' | campaign_link }}"
  // Strip <use> tags first: SVG sprite references like <use href="#icon-cart">
  // are not in-page navigation — their target lives in a <symbol id="icon-cart">
  // (often an injected or external sprite), so scanning them produces false dead-
  // anchor warnings. We only care about <a>/<area> jumps.
  const linkMarkup = markup.replace(/<use\b[^>]*>/gi, '');
  const targets = [];
  const plainRe    = /href=["']#([^"'{}\s]+)["']/g;
  const filteredRe = /href=["']\{\{-?\s*['"]#([^'"{}\s]+)['"][^}]*\}\}["']/g;
  while ((m = plainRe.exec(linkMarkup))    !== null) targets.push(m[1]);
  while ((m = filteredRe.exec(linkMarkup)) !== null) targets.push(m[1]);

  for (const target of new Set(targets)) {
    if (!ids.has(target)) {
      warn(label, `in-page anchor href="#${target}" has no element with id="${target}" anywhere in the campaign — the link does nothing`);
    }
  }

  // campaign_link on a "#" anchor is harmless (the filter returns it verbatim)
  // but signals confusion — it's an inter-page filter applied to an in-page link.
  if (/\{\{-?\s*['"]#[^'"]*['"]\s*\|\s*campaign_link\s*-?\}\}/.test(markup)) {
    warn(label, "campaign_link applied to a '#' anchor — it's anchor-safe so the link still works, but use a plain href=\"#id\" for in-page links");
  }
}

// config.js + campaigns.json completeness — placeholder/empty store details.
function checkConfigDetails(label, dir) {
  const configPath = path.join(dir, 'assets', 'config.js');
  if (fs.existsSync(configPath)) {
    const cfg      = fs.readFileSync(configPath, 'utf8');
    const apiKey   = (cfg.match(/apiKey:\s*['"]([^'"]*)['"]/) || [])[1];
    const storeNm  = (cfg.match(/storeName:\s*['"]([^'"]*)['"]/) || [])[1];
    if (apiKey !== undefined && (apiKey === '' || /your-api-key-here/.test(apiKey))) {
      warn(label, 'config.js apiKey is empty or still the placeholder — set it via `npm run config`');
    }
    if (storeNm !== undefined && (storeNm === '' || /your-store-name/.test(storeNm))) {
      warn(label, 'config.js storeName is empty or still the placeholder — required for Facebook purchase deduplication');
    }
  }

  // campaigns.json store_* fields populate footer/header links on the pages.
  const cjPath = path.join(dir, '..', '..', '_data', 'campaigns.json');
  let registry;
  try { registry = JSON.parse(fs.readFileSync(cjPath, 'utf8')); } catch { return; }

  const slug  = path.basename(dir);
  const entry = registry && registry[slug];
  if (!entry) {
    warn(label, `no '${slug}' entry in _data/campaigns.json — store_* fields (footer links, store details) won't render`);
    return;
  }

  const storeFields = ['store_name', 'store_url', 'store_terms', 'store_privacy', 'store_contact', 'store_returns', 'store_shipping'];
  const bad = storeFields.filter(k => !entry[k] || PLACEHOLDER.test(String(entry[k])));
  if (bad.length) {
    warn(label, `campaigns.json '${slug}': placeholder/empty store field(s): ${bad.join(', ')} — these render as footer/header links`);
  }

  // gtm_id / fb_pixel_id — "" is a valid, intentional "off" (the layout guards
  // with `{% if campaign.gtm_id != "" %}`). A *placeholder* is NOT off: in
  // non-development builds the snippet still loads, with a dummy ID. So blanks
  // pass silently, but a missing key, a leftover placeholder, or a malformed ID
  // all warrant a (non-blocking) nudge — the choice must be deliberate.
  checkAnalyticsId(label, slug, entry, 'gtm_id', 'GTM container',
    /^GTM-X+$/i,        /^GTM-[A-Z0-9]+$/i);
  checkAnalyticsId(label, slug, entry, 'fb_pixel_id', 'Meta Pixel',
    /^(YOUR_PIXEL_ID|123456789012345)$/i, /^\d{10,20}$/);
}

function checkAnalyticsId(label, slug, entry, key, human, placeholderRe, formatRe) {
  if (!(key in entry)) {
    warn(label, `campaigns.json '${slug}': '${key}' key missing — set it deliberately ("" disables the ${human} snippet, or use a real ID)`);
    return;
  }
  const val = String(entry[key]).trim();
  if (val === '') return; // explicit, intentional "off"

  if (placeholderRe.test(val)) {
    warn(label, `campaigns.json '${slug}': '${key}' is the placeholder "${entry[key]}" — in non-development builds this loads the ${human} snippet with a dummy ID. Use a real ID, or "" to disable.`);
    return;
  }
  if (!formatRe.test(val)) {
    warn(label, `campaigns.json '${slug}': '${key}' value "${entry[key]}" doesn't look like a ${human} ID`);
  }
}

// ── Tailwind build wiring ──────────────────────────────────────────────────────
//
// CPK landing pages develop on the Tailwind CDN but must ship a locally compiled
// stylesheet — the CDN is a runtime dependency that JIT-compiles in every
// visitor's browser. The CDN "works" identically on previews and production, so
// nothing catches a forgotten build step at runtime. This guard does.
function checkTailwind(label, dir) {
  let usesCdn   = false;
  let cdnFile   = null;
  let refsOutput = false;
  let hasInput  = false;

  for (const f of listTextFiles(dir)) {
    if (path.basename(f) === 'tailwind.output.css') continue; // compiled artifact
    const text = fs.readFileSync(f, 'utf8');
    // A CDN reference inside a `{% if environment == "development" %}` guard
    // never reaches a production build (the kit emits the `{% else %}` branch),
    // so it's the documented dual-mode pattern (see campaign/CLAUDE.md), not a
    // leak. Strip dev-only guarded regions before testing, so only an
    // *unguarded* CDN ref counts as "shipping". Catches a forgotten/unguarded
    // CDN, ignores the safe pattern the docs tell you to use.
    const shippable = text.replace(
      /{%-?\s*if\s+environment\s*==\s*["']development["']\s*-?%}[\s\S]*?{%-?\s*(?:else|endif)\s*-?%}/g,
      ''
    );
    if (/cdn\.tailwindcss\.com/.test(shippable)) { usesCdn = true; cdnFile = cdnFile || path.relative(dir, f); }
    if (/tailwind\.output\.css/.test(text)) refsOutput = true;
    if (path.extname(f) === '.css' && /@import\s+["']tailwindcss["']/.test(text)) hasInput = true;
  }

  // No sign of Tailwind — not a Tailwind campaign, stay silent.
  if (!usesCdn && !refsOutput && !hasInput) return;

  // package.json lives one level above src/ (dir is {folder}/src/{slug}).
  const campaignRoot = path.join(dir, '..', '..');
  const pkgPath      = path.join(campaignRoot, 'package.json');
  let pkg = null;
  try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch { /* handled below */ }

  const scripts      = (pkg && pkg.scripts) || {};
  const twBuild      = scripts['tailwind:build'] || '';
  const buildWired   = /tailwind:build/.test(scripts.build || '') && !!twBuild;

  // 1. The compiled-output path requires the build step to be wired, or the
  //    production CSS is never generated and pages ship unstyled.
  if ((hasInput || refsOutput) && !buildWired) {
    error(label,
      "Tailwind detected (input file or tailwind.output.css reference) but package.json " +
      "'build' does not run 'tailwind:build' — compiled CSS will be missing. Add a " +
      "'tailwind:build' script and prepend it: \"build\": \"npm run tailwind:build && campaign-build\".");
  }

  // 2. The CDN must not ship to production. Allowed on previews for design review.
  if (usesCdn) {
    const msg = `Tailwind CDN (cdn.tailwindcss.com) referenced in ${cdnFile} — ` +
      'replace with the compiled tailwind.output.css before the production deploy.';
    if (IS_PRODUCTION) error(label, msg);
    else warn(label, msg + ' (allowed on preview deploys for design review)');
  }

  // 3. A wired build script must point at a real input file (catches a stale slug),
  //    and the Tailwind CLI must be installed or Netlify's npm install can't run it.
  if (buildWired) {
    const m = twBuild.match(/-i\s+(\S+)/);
    if (m && !fs.existsSync(path.join(campaignRoot, m[1].replace(/^\.\//, '')))) {
      error(label, `tailwind:build input '${m[1]}' not found — check the {slug} in the -i path`);
    }

    const deps    = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const missing = ['tailwindcss', '@tailwindcss/cli'].filter(d => !deps[d]);
    if (missing.length) {
      error(label, `tailwind:build is wired but ${missing.join(' + ')} not in package.json — ` +
        "Netlify's `npm install` won't provide the `tailwindcss` CLI, so the build will fail. Add them as devDependencies.");
    }
  }

  // 4. The compiled artifact should be gitignored, not committed.
  try {
    const gi = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8');
    if (!/tailwind\.output\.css/.test(gi)) {
      warn(label, "'tailwind.output.css' is not in .gitignore — the compiled artifact may get committed");
    }
  } catch { /* no .gitignore — skip */ }
}

// ── SDK pin ──────────────────────────────────────────────────────
// The SDK version is set once, as sdk_version in {folder}/_data/campaigns.json, and the
// layouts build the loader URL from it. A page that types the version into its own
// <script src=".../campaign-cart@vX.Y.Z/..."> ignores that pin, so an SDK bump that
// changes campaigns.json silently leaves the page on the old SDK. Error when a page's
// version differs from the pin (always checked: zero noise, and it ships silently).
// Warn when a page hard-codes the version at all, pointing at campaign-cart@v{{ campaign.sdk_version }}.
// Only NextCommerceCo/campaign-cart URLs count (old fork stylesheets are not the SDK pin).
function checkSdkPin(label, dir) {
  const slug = path.basename(dir);
  let pin = null;
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(dir, '..', '..', '_data', 'campaigns.json'), 'utf8'));
    pin = reg && reg[slug] && reg[slug].sdk_version;
  } catch (e) { return; }
  if (!pin) return;
  const stale = [], hardcoded = [];
  for (const f of listTextFiles(dir).filter(f => path.extname(f) === '.html')) {
    const content = stripFrontmatter(fs.readFileSync(f, 'utf8'));
    const re = /nextcommerceco\/campaign-cart@v(\d+\.\d+\.\d+)\//gi;
    let m;
    while ((m = re.exec(content)) !== null) {
      const rel = path.relative(dir, f);
      if (m[1] !== pin) stale.push([rel, m[1]]);
      else hardcoded.push(rel);
    }
  }
  const seen = new Set();
  for (const [rel, v] of stale) {
    if (seen.has(rel + v)) continue; seen.add(rel + v);
    error(`${label}/${rel}`, `loads Campaign Cart v${v} but campaigns.json pins '${slug}' to v${pin} — ` +
      'this page will not follow an SDK bump. Use campaign-cart@v{{ campaign.sdk_version }} in the loader URL.');
  }
  const hc = [...new Set(hardcoded)];
  if (hc.length) {
    warn(label, `${hc.length} page(s) hard-code the SDK version (${hc.slice(0, 3).join(', ')}${hc.length > 3 ? `, +${hc.length - 3} more` : ''}) — use campaign-cart@v{{ campaign.sdk_version }} so the next bump is one line in campaigns.json`);
  }
}

// ── NEXT-hosted asset CDN host ──────────────────────────────────────────────────
// Assets uploaded to the NEXT platform are served from two interchangeable
// hosts with identical paths: cdn.29next.store (legacy) and cdn.cachebucket.com.
// Campaign pages are frequent DMCA-takedown targets from competitors, so
// campaigns must reference the alternative host only — a takedown filed against
// the primary domain then never touches campaign assets. Same shape as the
// Tailwind CDN guard: a warning on preview deploys, a hard error on production.
//
// Only the CDN host is matched. Storefront URLs like {store}.29next.store (the
// `store_url` field, policy links) are a different thing and are left alone.
const LEGACY_ASSET_CDN  = /cdn\.29next\.store/g;
const PREFERRED_ASSET_CDN = 'cdn.cachebucket.com';

function checkAssetCdnHost(label, dir) {
  const hits = [];   // { file, count }

  // Page source: layouts, includes, pages, CSS, and any JS (config.js, popups)
  // that may carry an image URL.
  const exts = new Set(['.html', '.css', '.liquid', '.njk', '.js']);
  for (const f of listFiles(dir).filter(f => exts.has(path.extname(f)))) {
    if (path.basename(f) === 'tailwind.output.css') continue; // compiled artifact
    const count = (fs.readFileSync(f, 'utf8').match(LEGACY_ASSET_CDN) || []).length;
    if (count) hits.push({ file: path.relative(dir, f), count });
  }

  // Campaign registry: og_image, brand_favicon, and similar fields are URLs
  // that render straight into the layouts.
  const cjPath = path.join(dir, '..', '..', '_data', 'campaigns.json');
  try {
    const count = (fs.readFileSync(cjPath, 'utf8').match(LEGACY_ASSET_CDN) || []).length;
    if (count) hits.push({ file: '_data/campaigns.json', count });
  } catch { /* no registry — checkConfigDetails reports that */ }

  if (!hits.length) return;

  const total = hits.reduce((n, h) => n + h.count, 0);
  const where = hits.slice(0, 5).map(h => `${h.file} (${h.count})`).join(', ') +
    (hits.length > 5 ? `, +${hits.length - 5} more file(s)` : '');
  const msg = `${total} reference(s) to legacy asset CDN host cdn.29next.store in ${where} — ` +
    `swap the host to ${PREFERRED_ASSET_CDN} (same path; the two are interchangeable). ` +
    'Campaigns are DMCA-takedown targets and must not depend on the primary CDN domain.';
  if (IS_PRODUCTION) error(label, msg);
  else warn(label, msg + ' (warning on preview deploys; error on production)');
}

// The SDK loader as a classic `async` script runs as soon as it downloads — before any
// deferred script. So window.nextConfig must already be defined, inline and above it,
// in the same file. With `<script src=config.js defer>` instead, the SDK boots without
// its config and the checkout silently never starts. Checked on every slug: it is
// zero-noise, and it is the one speed mistake that breaks a page.
function checkLoaderOrder(label, dir) {
  for (const f of listTextFiles(dir).filter(f => path.extname(f) === '.html')) {
    const content = stripFrontmatter(fs.readFileSync(f, 'utf8'));
    const re = /<script\b([^>]*campaign-cart@[^>]*\/dist\/loader\.js[^>]*)>/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
      const attrs = m[1];
      if (!/\basync\b/.test(attrs) || /type=["']?module/.test(attrs)) continue;
      const before = content.slice(0, m.index);
      if (!/<script\b[^>]*data-inline-config|window\.nextConfig\s*=/.test(before)) {
        error(`${label}/${path.relative(dir, f)}`, 'SDK loader is `async` but window.nextConfig is not inlined above it in this file — ' +
          'the SDK can start before its config and the checkout never boots. Inline the config (`<script data-inline-config>` + ' +
          "`{% campaign_include '../assets/config.js' %}`) above the loader, or remove `async`.");
      }
    }
  }
}

// Slugs this change touches, as "{folder}/src/{slug}" labels. The speed findings below
// cover pre-existing debt in every slug, so they are reported only for slugs the PR
// changes — otherwise every PR comment would list the whole repo's backlog.
// SMOKE_CHANGED_BASE (e.g. origin/main) is set by the PR workflow. Unset (Netlify,
// local runs) → speed findings are skipped. SMOKE_SPEED_ALL=1 reports every slug.
function changedSlugLabels() {
  if (process.env.SMOKE_SPEED_ALL === '1') return 'all';
  const base = process.env.SMOKE_CHANGED_BASE;
  if (!base) return null;
  try {
    const out = require('child_process').execSync(`git diff --name-only ${base}...HEAD`, { cwd: REPO_ROOT, encoding: 'utf8' });
    const set = new Set();
    for (const p of out.split('\n')) {
      const m = p.match(/^([^/]+)\/src\/([^/]+)\//);
      if (m) set.add(`${m[1]}/src/${m[2]}`);
    }
    return set;
  } catch (e) {
    console.warn(`  (speed checks skipped: could not diff against ${base})`);
    return null;
  }
}

function listSome(items, n = 3) {
  return items.slice(0, n).join(', ') + (items.length > n ? `, +${items.length - n} more` : '');
}

// Heavy media, including files on the store CDN (cdn.29next.store), which the image check
// above can't see because they aren't in the repo. Remote sizes come from a HEAD request
// (curl, 5 s timeout, cached across slugs); SMOKE_OFFLINE=1 skips them. Origin: client
// landings have carried 4–19 MB of video each (one hero 11.7 MB at 11.4 Mbps; a re-encode at
// crf 28 was 0.74 MB with SSIM 0.983), which images-only work couldn't touch.
const VIDEO_WARN_BYTES        = 2 * 1024 * 1024;  // a muted 8–10 s loop at 720p fits in ~1 MB
const REMOTE_IMAGE_WARN_BYTES = IMAGE_WARN_BYTES;
const MAX_REMOTE_HEADS        = 80;               // per slug, so a PR check stays quick
const VIDEO_FIX = 'Re-encode a web copy (e.g. `ffmpeg -i in.mp4 -an -c:v libx264 -preset slow -crf 26 ' +
  '-pix_fmt yuv420p -movflags +faststart -vf "scale=\'min(1280,iw)\':-2" in-web.mp4`), check it against the ' +
  'original (SSIM ≥ 0.98, plus a side-by-side look; client-supplied heroes need the client\'s OK), upload it ' +
  'as a new asset (store dashboard or Admin API `POST /assets/`), swap the URL (on the ' + PREFERRED_ASSET_CDN + ' host) and keep the original.';
const remoteSizeCache = new Map();

function remoteSize(url) {
  if (process.env.SMOKE_OFFLINE === '1') return null;
  if (remoteSizeCache.has(url)) return remoteSizeCache.get(url);
  let size = null;
  try {
    const out = require('child_process').execFileSync('curl',
      ['-sIL', '--max-time', '5', url], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lens = [...out.matchAll(/^content-length:\s*(\d+)/gim)].map(m => Number(m[1]));
    if (lens.length) size = lens[lens.length - 1];
  } catch (e) { /* offline or unreachable: say nothing rather than guess */ }
  remoteSizeCache.set(url, size);
  return size;
}

function checkMediaWeight(label, dir) {
  const files = listFiles(dir);
  const text = files.filter(f => ['.html', '.liquid', '.njk', '.css', '.js'].includes(path.extname(f)))
    .map(f => fs.readFileSync(f, 'utf8')).join('\n');
  const urls = new Map(); // one entry per file, whatever scheme or query string a page used
  for (const u of text.match(/https?:\/\/[^\s"'()<>]+?\.(?:mp4|webm|mov|m4v|jpe?g|png|gif|webp|avif)(?=[\s"'()<>?#]|$)/gi) || []) {
    const key = u.replace(/^http:/i, 'https:').split(/[?#]/)[0];
    if (!urls.has(key)) urls.set(key, u);
  }

  // Videos: local files (by size on disk) and remote URLs (by HEAD).
  const heavyVideo = [], heavyImage = [];
  for (const f of files) {
    if (!VIDEO_EXTS.has(path.extname(f).toLowerCase())) continue;
    const { size } = fs.statSync(f);
    if (size > VIDEO_WARN_BYTES) heavyVideo.push([size, `${path.relative(dir, f)} (${fmtKB(size)})`]);
  }
  let heads = 0;
  for (const url of urls.values()) {
    const ext = path.extname(url.split('?')[0]).toLowerCase();
    const isVideo = VIDEO_EXTS.has(ext);
    if (!isVideo && heads >= MAX_REMOTE_HEADS) continue;
    heads++;
    const size = remoteSize(url);
    if (size === null) continue;
    // Keep the store folder (cdn.29next.store/media/<store>/uploads/…): two stores can hold files with the same name.
    const parts = url.split(/[?#]/)[0].split('/');
    const store = /^cdn\.(29next\.store|cachebucket\.com)$/i.test(parts[2] || '') && parts[3] === 'media' ? `${parts[4]}/` : '';
    const name = `${store}${parts.pop()} (${fmtKB(size)})`;
    if (isVideo && size > VIDEO_WARN_BYTES) heavyVideo.push([size, name]);
    else if (!isVideo && size > REMOTE_IMAGE_WARN_BYTES) heavyImage.push([size, name]);
  }
  const top = arr => arr.sort((a, b) => b[0] - a[0]).map(x => x[1]);
  if (heavyVideo.length) {
    warn(label, `${heavyVideo.length} video(s) over ${fmtKB(VIDEO_WARN_BYTES)}: ${listSome(top(heavyVideo))} — ` +
      `on a phone this is usually what holds up the page. ${VIDEO_FIX}`);
  }
  if (heavyImage.length) {
    warn(label, `${heavyImage.length} CDN image(s) over ${fmtKB(REMOTE_IMAGE_WARN_BYTES)}: ${listSome(top(heavyImage))} — ` +
      'resize to ~1600px wide and/or save as WebP (quality ~80), upload as a new asset and swap the URL (on the ' + PREFERRED_ASSET_CDN + ' host).');
  }

  // Video on a checkout: the shopper is there to pay, and the bytes compete with the payment form.
  const checkoutsWithVideo = [];
  for (const htmlFile of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const content = fs.readFileSync(path.join(dir, htmlFile), 'utf8');
    const fm = parseFrontmatter(content) || {};
    if (fm.page_type !== 'checkout') continue;
    let body = content;
    for (const inc of extractIncludes(content)) {
      const p = path.join(dir, '_includes', inc);
      if (fs.existsSync(p)) body += fs.readFileSync(p, 'utf8');
    }
    if (/<video[\s>]/i.test(body)) checkoutsWithVideo.push(htmlFile);
  }
  if (checkoutsWithVideo.length) {
    warn(label, `video on checkout page(s): ${listSome(checkoutsWithVideo)} — keep checkout video short and light ` +
      '(well under 2 MB), give it a poster, and prefer `preload="none"` or an image.');
  }

  // <video> without a poster shows a blank box until the file arrives; without `preload`
  // the browser may start downloading a video the shopper never scrolls to.
  const videoTags = text.match(/<video\b[^>]*>/gi) || [];
  const noPoster = videoTags.filter(t => !/\sposter\s*=/i.test(t)).length;
  const noPreload = videoTags.filter(t => !/\spreload\s*=/i.test(t)).length;
  if (noPoster) {
    note(label, `${noPoster} of ${videoTags.length} \`<video>\` tag(s) have no poster — add a lightweight poster image so the space isn't blank while the video loads.`);
  }
  if (noPreload) {
    note(label, `${noPreload} of ${videoTags.length} \`<video>\` tag(s) have no preload attribute — use preload="none" (or "metadata") for videos below the fold so they don't download on page load.`);
  }
}

function checkSpeed(label, dir) {
  // Pages that bypass the shared layouts: a `passthrough` layout, or a page that is a
  // whole HTML document. Head changes (loader, config, tags) must then be hand-copied
  // into each page, and drift.
  const bypass = [];
  for (const htmlFile of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const content = fs.readFileSync(path.join(dir, htmlFile), 'utf8');
    const fm = parseFrontmatter(content) || {};
    if (/passthrough/i.test(fm.page_layout || '') || /<!doctype|<html[\s>]/i.test(stripFrontmatter(content))) bypass.push(htmlFile);
  }
  if (bypass.length) {
    warn(label, `${bypass.length} page(s) bypass the shared layouts (${listSome(bypass)}) — ` +
      'head changes have to be copied into each page by hand. Move them onto base.html / base-checkout.html.');
  }

  // Images: a big PNG is almost always a photo in the wrong format; anything over the
  // ceiling is bigger than even a full-width hero needs. One line per slug.
  const pngs = [], big = [];
  for (const f of listFiles(dir)) {
    const ext = path.extname(f).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    const { size } = fs.statSync(f);
    const rel = `${path.relative(dir, f)} (${fmtKB(size)})`;
    if (ext === '.png' && size > PNG_WARN_BYTES) pngs.push([size, rel]);
    else if (size > IMAGE_WARN_BYTES) big.push([size, rel]);
  }
  const top = arr => arr.sort((a, b) => b[0] - a[0]).map(x => x[1]);
  if (pngs.length) {
    warn(label, `${pngs.length} PNG(s) over ${fmtKB(PNG_WARN_BYTES)}: ${listSome(top(pngs))} — ` +
      'PNG is the heaviest format for this; WebP (which also supports transparency) is usually several times smaller at the same quality.');
  }
  if (big.length) {
    warn(label, `${big.length} image(s) over ${fmtKB(IMAGE_WARN_BYTES)}: ${listSome(top(big))} — ` +
      'larger than a full-width image needs; resize to ~1600px wide and/or convert to WebP.');
  }

  checkMediaWeight(label, dir);

  // Web fonts: optional. Only Google Fonts can be self-hosted under its licence;
  // Adobe Fonts must be served by Adobe, and other hosts depend on the font's licence.
  const markup = readMarkup(dir) + listTextFiles(dir).filter(f => path.extname(f) === '.css')
    .map(f => fs.readFileSync(f, 'utf8')).join('\n');
  if (/fonts\.googleapis\.com/.test(markup)) {
    note(label, 'loads Google Fonts — optional: self-hosting them (the licence allows it) saves a third-party connection on first load.');
  }
  if (/use\.typekit\.net|p\.typekit\.net/.test(markup)) {
    note(label, 'loads Adobe Fonts — the licence requires Adobe to serve them, so leave as-is; a `<link rel="preconnect" href="https://use.typekit.net" crossorigin>` can help.');
  }
  if (/fonts\.cdnfonts\.com/.test(markup)) {
    note(label, "loads fonts from cdnfonts.com — check each font's licence before self-hosting.");
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const campaigns = discoverCampaigns();
const speedScope = changedSlugLabels();

if (campaigns.length === 0) {
  // Not a failure: this is the state of the template repo itself and of any
  // repo before its first campaign is scaffolded. build.js still exits 1 on a
  // genuinely empty repo at deploy time, so Netlify stays protected.
  console.log('No campaigns found ({folder}/src/{slug}/) — nothing to check.\n');
  writeReport();
  process.exit(0);
}

console.log(`\nChecking ${campaigns.length} campaign(s):\n`);

for (const { label, dir } of campaigns) {
  console.log(`[${label}]`);

  const includesDir = path.join(dir, '_includes');
  const assetsDir   = path.join(dir, 'assets');

  // ── config.js ──────────────────────────────────────────────────────────────
  const configPath = path.join(assetsDir, 'config.js');
  if (!fs.existsSync(configPath)) {
    error('assets/config.js', 'file not found');
  } else {
    const configContent = fs.readFileSync(configPath, 'utf8');
    if (!configContent.includes('apiKey')) {
      error('assets/config.js', "missing 'apiKey' field");
    }
  }

  // ── Tailwind build wiring ────────────────────────────────────────────────────
  checkTailwind(label, dir);

  // ── NEXT-hosted asset CDN host ───────────────────────────────────────────────
  checkAssetCdnHost(label, dir);

  // ── SDK pin ────────────────────────────────────────────────────────────────
  checkSdkPin(label, dir);

  // ── Quality warnings (config details, meta tags, media assets) ──────────────
  checkConfigDetails(label, dir);
  checkMetaTags(label, dir);
  checkMediaAssets(label, dir);
  checkAnchors(label, dir);

  // ── Page speed ───────────────────────────────────────────────────────────────
  checkLoaderOrder(label, dir);
  if (speedScope === 'all' || (speedScope && speedScope.has(label))) checkSpeed(label, dir);

  // ── HTML pages ─────────────────────────────────────────────────────────────
  const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

  if (htmlFiles.length === 0) {
    warn(label, 'no HTML page files found');
  }

  for (const htmlFile of htmlFiles) {
    const filePath = path.join(dir, htmlFile);
    const content  = fs.readFileSync(filePath, 'utf8');
    const fm       = parseFrontmatter(content);
    const fileLabel = htmlFile;

    if (!fm) {
      error(fileLabel, 'no frontmatter found');
      continue;
    }

    if (!fm.title) {
      error(fileLabel, "missing 'title' in frontmatter");
    }

    if (!fm.page_type) {
      error(fileLabel, "missing 'page_type' in frontmatter");
    } else {
      // next_url is the universal forward link (checkout success + upsell accept)
      // decline_url is optional on upsell — defaults to next_url in the layout
      if (fm.page_type === 'checkout' && !fm.next_url) {
        error(fileLabel, "page_type is 'checkout' but 'next_url' is missing");
      }
      if (fm.page_type === 'upsell' && !fm.next_url) {
        error(fileLabel, "page_type is 'upsell' but 'next_url' is missing");
      }
    }

    if (Array.isArray(fm.scripts)) {
      for (const script of fm.scripts) {
        if (script.startsWith('http')) continue;
        if (!fs.existsSync(path.join(assetsDir, script))) {
          error(fileLabel, `script '${script}' not found in assets/`);
        }
      }
    }

    if (Array.isArray(fm.styles)) {
      for (const style of fm.styles) {
        if (style.startsWith('http')) continue;
        if (!fs.existsSync(path.join(assetsDir, style))) {
          error(fileLabel, `style '${style}' not found in assets/`);
        }
      }
    }

    const includes = extractIncludes(content);
    for (const inc of includes) {
      if (!fs.existsSync(path.join(includesDir, inc))) {
        error(fileLabel, `{% campaign_include '${inc}' %} — not found in _includes/`);
      }
    }

    const body = stripFrontmatter(content);
    if (/https?:\/\/localhost/i.test(body)) {
      warn(fileLabel, 'contains hardcoded localhost URL');
    }
  }

  console.log('');
}

// ── Summary ───────────────────────────────────────────────────────────────────
if (errors === 0 && warnings === 0) {
  console.log('\x1b[32m✓ All checks passed\x1b[0m\n');
} else {
  if (warnings > 0) console.warn(`\x1b[33m⚠ ${warnings} warning(s)\x1b[0m`);
  if (errors   > 0) console.error(`\x1b[31m✗ ${errors} error(s)\x1b[0m\n`);
}

if (notes > 0) console.log(`\x1b[36mℹ ${notes} recommendation(s)\x1b[0m`);
if (speedScope === null) console.log('(speed checks: loader order only — set SMOKE_CHANGED_BASE=origin/main for the rest)');

writeReport();

if (errors > 0) process.exit(1);
