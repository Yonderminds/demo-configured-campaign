#!/usr/bin/env node
/**
 * pages-routes.js — reproduce netlify.toml rewrites as static files for GitHub Pages.
 *
 * GitHub Pages serves files only: it has no rewrites, redirects or custom headers.
 * Run after scripts/build.js. For every [[redirects]] rule in netlify.toml with
 * status 200 (a rewrite), this copies the target page into _site/ at the `from`
 * address, so `/products/<handle>` serves the campaign page just as it did before.
 *
 * Rules with any other status (301/302 redirects) cannot be reproduced on Pages and
 * are listed as skipped. Fails if a rewrite target is missing from _site/.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const SITE = path.join(REPO_ROOT, '_site');
const TOML = path.join(REPO_ROOT, 'netlify.toml');

if (!fs.existsSync(TOML)) {
  console.log('[pages-routes] no netlify.toml, nothing to do');
  process.exit(0);
}
if (!fs.existsSync(SITE)) {
  console.error('[pages-routes] _site/ not found; run scripts/build.js first');
  process.exit(1);
}

// Minimal reader for [[redirects]] blocks: from / to / status keys only.
const rules = [];
let current = null;
for (const raw of fs.readFileSync(TOML, 'utf8').split('\n')) {
  const line = raw.trim();
  if (line.startsWith('#') || line === '') continue;
  if (line.startsWith('[')) {
    if (current) rules.push(current);
    current = line === '[[redirects]]' ? {} : null;
    continue;
  }
  if (!current) continue;
  const m = line.match(/^(from|to|status)\s*=\s*(?:"([^"]*)"|(\d+))/);
  if (m) current[m[1]] = m[2] !== undefined ? m[2] : Number(m[3]);
}
if (current) rules.push(current);

function decode(p) {
  try { return decodeURIComponent(p); } catch { return p; }
}

function targetFile(to) {
  const rel = decode(to).replace(/^\/+/, '');
  const file = rel === '' || rel.endsWith('/') ? path.join(rel, 'index.html') : rel;
  return path.join(SITE, file);
}

let written = 0;
const seen = new Set();
const errors = [];
for (const r of rules) {
  if (!r.from || !r.to) continue;
  if (r.status !== 200) {
    console.log(`[pages-routes] skipped ${r.status} ${r.from} -> ${r.to} (Pages cannot redirect)`);
    continue;
  }
  const from = decode(r.from).replace(/^\/+|\/+$/g, '');
  if (!from || from.includes('*') || from.includes(':')) {
    console.log(`[pages-routes] skipped pattern rule ${r.from}`);
    continue;
  }
  if (seen.has(from)) continue;
  seen.add(from);

  const src = targetFile(r.to);
  if (!fs.existsSync(src)) {
    errors.push(`rewrite target missing: ${r.to} (for ${r.from})`);
    continue;
  }
  const dest = path.join(SITE, from, 'index.html');
  if (!dest.startsWith(SITE + path.sep)) {
    errors.push(`refusing to write outside _site/: ${r.from}`);
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  written++;
  console.log(`[pages-routes] /${from}/ serves ${r.to}`);
}

if (errors.length) {
  errors.forEach(e => console.error(`[pages-routes] ERROR ${e}`));
  process.exit(1);
}
console.log(`[pages-routes] ${written} rewrite page(s) written`);

// ── Base path ───────────────────────────────────────────────────────────────
// A project site without a custom domain is served under /<repo>/ (for example
// https://yonderminds.github.io/coerneuineo-cpk/). Pages use root-relative paths
// such as "/<campaign-slug>/css/…", so prefix every root-relative reference to a
// top-level folder of _site/ with the base path. The workflow passes the base path
// from actions/configure-pages; it is empty once a custom domain is attached, and
// then nothing is rewritten.
const BASE = (process.env.PAGES_BASE_PATH || '').replace(/\/+$/, '');
if (BASE && !/^\/[A-Za-z0-9._~%-]+(\/[A-Za-z0-9._~%-]+)*$/.test(BASE)) {
  console.error(`[pages-routes] ERROR unexpected PAGES_BASE_PATH: ${BASE}`);
  process.exit(1);
}
if (BASE) {
  const tops = fs.readdirSync(SITE, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Encoded and decoded forms of each top folder (e.g. "products").
  const alt = tops.map(t => `${t}|${encodeURIComponent(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).join('|');
  // A quote, backtick or "(" then "/<top>" followed by "/", a quote or ")".
  const rx = new RegExp(`(["'\`(])/((?:${alt}))(?=[/"'\`)?#])`, 'g');
  let files = 0, refs = 0;
  const walk = dir => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) { walk(p); continue; }
      if (!/\.(html|css|js|json|webmanifest)$/i.test(d.name)) continue;
      const s = fs.readFileSync(p, 'utf8');
      let n = 0;
      const out = s.replace(rx, (m, q, top) => { n++; return `${q}${BASE}/${top}`; });
      if (n) { fs.writeFileSync(p, out); files++; refs += n; }
    }
  };
  walk(SITE);
  console.log(`[pages-routes] base path ${BASE}: ${refs} reference(s) prefixed in ${files} file(s)`);
} else {
  console.log('[pages-routes] no base path (custom domain or local build): paths left as built');
}
