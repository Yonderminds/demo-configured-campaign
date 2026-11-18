// Keep old Shopify addresses: copy a built campaign page to an extra address.
// Reads shopify-urls.json, for example:
//   { "/products/my-product-handle": "/first-offer/landing/" }
// Runs after `npm run build` (the "postbuild" script in package.json).
const fs = require('fs');
const path = require('path');

const SITE = path.join(__dirname, '..', '_site');
const MAP = path.join(__dirname, '..', 'shopify-urls.json');

if (!fs.existsSync(MAP)) process.exit(0);
const urls = JSON.parse(fs.readFileSync(MAP, 'utf8'));
let failed = false;

for (const [from, to] of Object.entries(urls)) {
  const src = path.join(SITE, to.replace(/^\/+|\/+$/g, ''), 'index.html');
  const dest = path.join(SITE, from.replace(/^\/+|\/+$/g, ''), 'index.html');
  if (!dest.startsWith(SITE + path.sep) || !src.startsWith(SITE + path.sep)) {
    console.error(`[shopify-urls] not allowed: ${from} -> ${to}`);
    failed = true;
    continue;
  }
  if (!fs.existsSync(src)) {
    console.error(`[shopify-urls] page not found: ${to} (for ${from})`);
    failed = true;
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`[shopify-urls] ${from}/ shows ${to}`);
}

process.exit(failed ? 1 : 0);
