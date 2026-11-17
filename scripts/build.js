#!/usr/bin/env node

/**
 * Multi-campaign build script.
 *
 * Discovers all campaign directories from the repo root — any top-level folder
 * that contains both a package.json and a src/ subdirectory — then runs
 * `npm install && npm run build` in each one sequentially.
 *
 * After each campaign is built, its _site/ is optimised in place by
 * optimize-site.js (CSS/JS minified, image width/height written; build output
 * only, src/ is never touched), then merged into a single root-level _site/
 * directory for Netlify to publish. SKIP_OPTIMIZE=1 turns the optimise step off.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { optimizeSite } = require('./optimize-site');

const REPO_ROOT = path.join(__dirname, '..');
const ROOT_SITE = path.join(REPO_ROOT, '_site');

const SKIP = new Set(['.git', '.github', 'node_modules', 'scripts', '_site']);

function discoverCampaigns() {
  return fs.readdirSync(REPO_ROOT).filter(name => {
    if (SKIP.has(name) || name.startsWith('.')) return false;
    const dir = path.join(REPO_ROOT, name);
    if (!fs.statSync(dir).isDirectory()) return false;
    return (
      fs.existsSync(path.join(dir, 'package.json')) &&
      fs.existsSync(path.join(dir, 'src'))
    );
  });
}

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function mergeInto(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  run(`cp -r ${srcDir}/. ${destDir}/`, REPO_ROOT);
}

// A freshly provisioned repo has a campaign folder (package.json, _data/) but no
// src/ yet — campaign-init hasn't been run. Publish a placeholder page instead of
// failing, so the Netlify site gets a green first deploy and the GitHub→Netlify
// connection is provable from day one. Visitors never see it: the root redirect in
// netlify.toml sends / to the storefront, campaigns live under /{slug}/, and the
// first real build replaces the whole _site/ (deploys are not additive).
function publishPlaceholder() {
  fs.mkdirSync(ROOT_SITE, { recursive: true });
  fs.writeFileSync(path.join(ROOT_SITE, 'index.html'), `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Provisioned</title></head>
<body style="font-family: system-ui, sans-serif; margin: 4rem auto; max-width: 32rem; color: #444;">
<p><strong>Site provisioned — awaiting first campaign.</strong></p>
<p>This repo has no campaign source yet (run <code>campaign-init</code> in the campaign folder).
This placeholder is replaced by the first real campaign build.</p>
</body>
</html>
`);
}

const campaigns = discoverCampaigns();

if (campaigns.length === 0) {
  console.warn('[build] WARNING: no campaign directories found (a campaign folder needs both package.json and src/).');
  console.warn('[build] Publishing a placeholder page so this deploy succeeds. If you expected a real build, check the campaign folder layout.');
  publishPlaceholder();
  process.exit(0);
}

console.log(`[build] Found ${campaigns.length} campaign(s): ${campaigns.join(', ')}`);

fs.mkdirSync(ROOT_SITE, { recursive: true });

for (const name of campaigns) {
  const dir = path.join(REPO_ROOT, name);
  console.log(`\n[build] ── ${name} ──`);
  run('npm install', dir);
  run('npm run build', dir);
  optimizeSite(path.join(dir, '_site'));
  mergeInto(path.join(dir, '_site'), ROOT_SITE);
}

console.log(`\n[build] Done — all campaigns merged into _site/`);
