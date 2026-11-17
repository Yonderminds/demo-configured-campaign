#!/usr/bin/env node

/**
 * Campaign check for CPK campaigns: can every package the pages offer actually be sold?
 *
 * For each campaign key found in the repo (assets/config.js apiKey, plus any page-level
 * <meta name="next-api-key"> override) it fetches the campaign from the Campaigns API and
 * asks POST /api/v1/carts/calculate/ for a price of every package in every currency the
 * campaign offers. It also lists the campaign's shipping countries.
 *
 * A package with no price in a currency is an ERROR: a customer in that currency cannot buy
 * it, and an upsell page offering it will fail at the click. Fix it in the Campaigns App
 * (package prices per currency, markets / fulfilment locations), never on the page.
 * Background: a merchant case (Nov 2026) — a page-side "availability probe" built to work
 * around this charged customers full price and added an upsell with no click.
 *
 * It also reads the pages of each slug and checks, against the same campaign data:
 * - every package id a page references exists in the campaign (ERROR)
 * - every upsell accept / decline URL points at a page that exists in the slug (ERROR)
 * - a non-USD price that is numerically the USD price, i.e. never converted (WARN)
 * - more than one campaign key in a slug: "is the page-level override intended?", and two keys
 *   without `storageScope` in config.js, which splits the SDK's storage between the keys (WARN)
 *
 * Read-only: calculate does not touch any order or cart. Exit 1 on any error. A campaign that
 * cannot be fetched (403 "Campaign not active", bad key) is a WARN so a retired slug does not
 * block a deploy — retire the slug instead.
 *
 * Usage:
 *   node scripts/campaign-check.js                 # every campaign in the repo
 *   node scripts/campaign-check.js --only sadlamp  # one slug (substring match on the label)
 *   node scripts/campaign-check.js --currencies USD,EUR
 *   CAMPAIGN_CHECK_ROOT=/path/to/repo node scripts/campaign-check.js
 */

const fs   = require('fs');
const path = require('path');

const REPO_ROOT = process.env.CAMPAIGN_CHECK_ROOT || path.join(__dirname, '..');
const API       = process.env.CAMPAIGN_CHECK_API || 'https://campaigns.apps.29next.com/api/v1';
const args      = process.argv.slice(2);
const argVal    = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const ONLY      = argVal('--only');
const ONLY_CUR  = (argVal('--currencies') || '').split(',').map(s => s.trim()).filter(Boolean);
const CONCURRENCY = 2;
const REPORT      = process.env.CAMPAIGN_CHECK_REPORT; // markdown written here, errors only (PR comment)
const IN_ACTIONS  = !!process.env.GITHUB_ACTIONS;
const findings    = [];

// ── Discovery (same walk as smoke-check.js) ───────────────────────────────────

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
    for (const slug of fs.readdirSync(srcDir)) {
      const dir = path.join(srcDir, slug);
      if (!fs.statSync(dir).isDirectory()) continue;
      if (fs.existsSync(path.join(dir, '_includes')) || fs.existsSync(path.join(dir, 'assets'))) {
        campaigns.push({ label: `${folder}/src/${slug}`, dir });
      }
    }
  }
  return campaigns;
}

// Every API key a slug can run on: the config.js key, plus page-level meta overrides
// (email arms and the like). Returns [{ key, where }].
function collectKeys(campaign) {
  const keys = new Map();
  const add = (key, where) => { if (key && !/your-api-key/i.test(key) && !keys.has(key)) keys.set(key, where); };

  const configPath = path.join(campaign.dir, 'assets', 'config.js');
  if (fs.existsSync(configPath)) {
    const cfg = fs.readFileSync(configPath, 'utf8');
    // first apiKey in the file is window.nextConfig.apiKey; googleMaps.apiKey comes later
    add((cfg.match(/apiKey:\s*['"]([^'"]*)['"]/) || [])[1], 'assets/config.js');
  }
  const walk = dir => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) { if (name !== 'assets') walk(p); continue; }
      if (!name.endsWith('.html')) continue;
      const html = fs.readFileSync(p, 'utf8');
      const re = /name="next-api-key"\s+content="([^"{}]+)"/g;
      let m;
      while ((m = re.exec(html))) add(m[1], path.relative(campaign.dir, p));
    }
  };
  walk(campaign.dir);
  return [...keys].map(([key, where]) => ({ key, where }));
}

// Pages of a slug with the package ids, upsell URLs and key override each one carries.
function scanPages(campaign) {
  const pages = [];
  const walk = dir => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) { if (!['assets', 'node_modules'].includes(name)) walk(p); continue; }
      if (!name.endsWith('.html')) continue;
      const html = fs.readFileSync(p, 'utf8');
      const ids = new Set();
      for (const re of [/data-next-package-id="(\d+)"/g, /data-next-package-toggle="(\d+)"/g, /data-next-upsell-package-id="(\d+)"/g,
                        /data-next-display="package\.(\d+)\./g, /"packageId"\s*:\s*(\d+)/g, /"package_id"\s*:\s*(\d+)/g]) {
        let m; while ((m = re.exec(html))) ids.add(Number(m[1]));
      }
      const urls = [];
      for (const re of [/name="next-upsell-(?:accept|decline)-url"\s+content="([^"]+)"/g, /name="next-success-url"\s+content="([^"]+)"/g,
                        /^(?:next_url|decline_url|next_success_url|upsell_accept_url|upsell_decline_url):\s*['"]?([^'"\n]+)/gm]) {
        let m; while ((m = re.exec(html))) urls.push(m[1].trim());
      }
      const key = (html.match(/name="next-api-key"\s+content="([^"{}]+)"/) || [])[1];
      pages.push({ file: path.relative(campaign.dir, p), name: name.replace(/\.html$/, ''), ids: [...ids], urls, key });
    }
  };
  walk(campaign.dir);
  return pages;
}

// "/slug/upsell2/", "/slug/upsell2", "upsell2.html", "upsell2" -> "upsell2"; Liquid stays unresolved (null)
function pageNameFromUrl(url) {
  if (/\{\{|\{%/.test(url)) return null;
  const clean = url.replace(/[?#].*$/, '').replace(/\/+$/, '');
  const last = clean.split('/').filter(Boolean).pop() || '';
  return last.replace(/\.html$/, '') || null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let errors = 0, warnings = 0;
const error = (file, msg) => { console.error(`  \x1b[31mERROR\x1b[0m  ${file}: ${msg}`); errors++; findings.push({ level: 'error', file, msg }); };
const warn  = (file, msg) => { console.warn(`  \x1b[33mWARN\x1b[0m   ${file}: ${msg}`); warnings++; findings.push({ level: 'warn', file, msg }); };
const group = title => { if (IN_ACTIONS) console.log(`::group::${title}`); };
const endGroup = () => { if (IN_ACTIONS) console.log('::endgroup::'); };

// PR comment: short, errors (and warnings) only — the full tables stay in the log.
function writeReport() {
  if (!REPORT) return;
  const out = ['<!-- campaign-check-report -->', '## 💱 Campaign check', ''];
  if (findings.length === 0) out.push('✅ Every package is priced in every currency.');
  else {
    out.push(`Found **${errors} error(s)** and ${warnings} warning(s). A missing price is fixed in the Campaigns App (prices per currency, markets), never on the page; a bad page reference is fixed on the page. Full price tables are in the Action log.`, '');
    out.push('| | Where | Finding |', '|---|---|---|');
    for (const f of findings) out.push(`| ${f.level === 'error' ? '🔴' : '🟡'} | \`${f.file}\` | ${f.msg.replace(/\|/g, '\\|').replace(/<(?=[a-zA-Z\/])/g, '&lt;')} |`);
  }
  out.push('', '<sub>Generated by `scripts/campaign-check.js`.</sub>', '');
  fs.writeFileSync(REPORT, out.join('\n'));
}
const mask  = key => key.slice(0, 4) + '…' + key.slice(-4);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// The Campaigns API throttles bursts (HTTP 429 "Request was throttled. Expected available in N
// second(s)"), which a GitHub runner hits long before a laptop does. Wait and retry; a 429 is
// never "no price".
async function api(key, route, body, attempt = 0) {
  const res = await fetch(API + route, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (_) { /* non-JSON body */ }
  if (res.status === 429 && attempt < 6) {
    const hinted = Number((res.headers.get('retry-after') || (json && json.detail || '').match(/(\d+) second/)?.[1] || 0));
    await sleep(Math.max(1000, hinted * 1000) + attempt * 500);
    return api(key, route, body, attempt + 1);
  }
  return { status: res.status, json };
}

async function pool(items, limit, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  }));
  return out;
}

const price = (res, pkgId) => {
  const line = res.json && Array.isArray(res.json.lines) && res.json.lines.find(l => l.package_id === pkgId);
  return line ? line.unit_price : null;
};

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  const campaigns = discoverCampaigns().filter(c => !ONLY || c.label.includes(ONLY));
  if (campaigns.length === 0) {
    // The template repo itself ships no src/ (it comes from campaign-cart-starter-templates), so an
    // empty repo is nothing to check, not a failure.
    console.log('No campaigns found (expected {campaign}/src/{slug}/ directories) — nothing to check.\n');
    writeReport();
    process.exit(0);
  }
  console.log(`\nCampaign check: ${campaigns.length} slug(s), API ${API}\n`);

  const seen = new Map(); // key -> result, so a key shared by several slugs is checked once

  for (const campaign of campaigns) {
    console.log(`[${campaign.label}]`);
    const keys = collectKeys(campaign);
    if (keys.length === 0) { error(campaign.label, 'no apiKey in assets/config.js and no next-api-key meta'); console.log(''); continue; }
    const pages = scanPages(campaign);
    const pageNames = new Set(pages.map(p => p.name));

    // 8. every upsell / success URL on a page points at a page of this slug
    for (const pg of pages) for (const url of pg.urls) {
      const target = pageNameFromUrl(url);
      if (target && !pageNames.has(target)) error(`${campaign.label}/${pg.file}`, `points at "${url}" but there is no ${target}.html in this slug`);
    }

    // 9. more than one campaign key in the slug
    if (keys.length > 1) {
      const overrides = pages.filter(p => p.key && p.key !== keys[0].key).map(p => p.file);
      warn(campaign.label, `runs on ${keys.length} campaign keys — ${overrides.join(', ')} override the config.js key. Intended? (an email arm, say)`);
      const cfg = fs.existsSync(path.join(campaign.dir, 'assets', 'config.js')) ? fs.readFileSync(path.join(campaign.dir, 'assets', 'config.js'), 'utf8') : '';
      if (!/storageScope\s*:/.test(cfg)) warn(campaign.label, 'two keys but no storageScope in assets/config.js — the SDK stores the cart and order under a name built from the key, so the order placed under the override key is not found by the next page on the main key. Set storageScope to the slug name (same value on every page).');
    }

    for (const { key, where } of keys) {
      if (seen.has(key)) { console.log(`  ${where}: key ${mask(key)} already checked (${seen.get(key)})`); continue; }

      const camp = await api(key, '/campaigns/');
      if (camp.status !== 200 || !camp.json || !Array.isArray(camp.json.packages)) {
        const detail = camp.json && (camp.json.detail || camp.json.message) || `HTTP ${camp.status}`;
        warn(`${campaign.label} ${where}`, `campaign not reachable with key ${mask(key)}: ${detail} — retire the slug or fix the key`);
        seen.set(key, 'unreachable');
        continue;
      }
      const c = camp.json;
      const currencies = (c.available_currencies || []).map(x => x.code).filter(cur => ONLY_CUR.length === 0 || ONLY_CUR.includes(cur));
      if (currencies.length === 0) currencies.push(c.currency || 'USD');
      const countries  = (c.available_shipping_countries || []).map(x => x.code);
      console.log(`  ${where}: campaign ${c.id} "${c.name}" — ${c.packages.length} packages, currencies ${currencies.join('/')}, ships to ${countries.join(' ') || '(none listed)'}`);
      group(`price table: campaign ${c.id} ${c.name} (${c.packages.length} × ${currencies.length})`);

      const jobs = [];
      for (const cur of currencies) for (const p of c.packages) jobs.push({ cur, p });
      const results = await pool(jobs, CONCURRENCY, async ({ cur, p }) => {
        const res = await api(key, '/carts/calculate/', { lines: [{ package_id: p.ref_id, quantity: 1 }], vouchers: [], currency: cur });
        return { cur, p, status: res.status, price: price(res, p.ref_id), detail: res.json && (res.json.detail || JSON.stringify(res.json.message || res.json.lines || '')).toString().slice(0, 120) };
      });

      // table: one row per package, one column per currency
      const w = Math.min(44, Math.max(...c.packages.map(p => (p.ref_id + ' ' + p.name).length)));
      console.log('  ' + 'package'.padEnd(w) + currencies.map(cu => cu.padStart(11)).join(''));
      let bad = 0;
      for (const p of c.packages) {
        const cells = currencies.map(cur => {
          const r = results.find(x => x.p === p && x.cur === cur);
          if (r.status === 200 && r.price != null) return String(r.price).padStart(11);
          bad++;
          error(`${campaign.label} campaign ${c.id}`, `package ${p.ref_id} "${p.name}" has no price in ${cur} (HTTP ${r.status}${r.detail ? ': ' + r.detail : ''})`);
          return '  --MISSING--'.padStart(11);
        });
        console.log('  ' + (p.ref_id + ' ' + p.name).slice(0, w).padEnd(w) + cells.join(''));
      }
      endGroup();
      if (countries.length === 0) warn(`${campaign.label} campaign ${c.id}`, 'no shipping countries listed on the campaign');

      // 1. every package id a page references exists in this campaign (pages on an override key check against that key)
      const known = new Set(c.packages.map(p => p.ref_id));
      for (const pg of pages) {
        const pageKey = pg.key || keys[0].key;
        if (pageKey !== key) continue;
        const missing = pg.ids.filter(id => !known.has(id));
        if (missing.length) error(`${campaign.label}/${pg.file}`, `references package id(s) ${missing.join(', ')} that are not in campaign ${c.id}`);
      }

      // 4. non-USD prices that were never converted
      const base = c.currency || 'USD';
      for (const cur of currencies) {
        if (cur === base) continue;
        const same = c.packages.filter(p => {
          const a = results.find(x => x.p === p && x.cur === base), b = results.find(x => x.p === p && x.cur === cur);
          return a && b && a.price != null && b.price != null && Number(a.price) > 0 && Number(a.price) === Number(b.price);
        });
        if (same.length && same.length >= Math.ceil(c.packages.filter(p => { const a = results.find(x => x.p === p && x.cur === base); return a && Number(a.price) > 0; }).length / 2)) {
          warn(`${campaign.label} campaign ${c.id}`, `${cur} prices are the ${base} numbers on ${same.length} package(s) (e.g. ${same[0].ref_id} ${same[0].name}: ${base} ${results.find(x => x.p === same[0] && x.cur === base).price} = ${cur} ${results.find(x => x.p === same[0] && x.cur === cur).price}) — never converted?`);
        }
      }
      seen.set(key, bad ? `${bad} missing price(s)` : 'ok');
      console.log('');
    }
  }

  if (errors === 0 && warnings === 0) console.log('\x1b[32m✓ Every package is priced in every currency\x1b[0m\n');
  else {
    if (warnings > 0) console.warn(`\x1b[33m⚠ ${warnings} warning(s)\x1b[0m`);
    if (errors   > 0) console.error(`\x1b[31m✗ ${errors} error(s) — a missing price is fixed in the Campaigns App (prices per currency, markets); a bad page reference is fixed on the page\x1b[0m\n`);
  }
  writeReport();
  if (errors > 0) process.exit(1);
})().catch(e => { console.error('campaign-check failed:', e.message); process.exit(2); });
