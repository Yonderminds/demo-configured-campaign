#!/usr/bin/env node

/**
 * Post-build asset optimisation.
 *
 * Minifies every .css and .js file in a campaign's built _site/ output, in place,
 * keeping filenames, and strips comments from opted-in inline config scripts in HTML. Runs on build output only — src/ is never touched, so a page
 * edit or Figma export can't undo it. Called by build.js after each campaign's
 * `npm run build`; also runnable on its own:
 *
 *   node scripts/optimize-site.js <campaign>/_site
 *
 * Whitespace-only (comments and spacing removed; names, values and syntax untouched):
 *   - config.js                 the SDK config people inspect on a live page
 *   - <script data-inline-config> blocks in .html — the same config inlined into a page
 *                               head (the attribute is removed from the output)
 *
 * Image dimensions: every <img> in the built HTML whose src is a local raster
 * file and which carries neither width nor height gets both from the file's pixel size, so
 * the browser reserves the space before the image arrives (no layout shift when the page
 * paints earlier). One rule is added first in <head>, in its own cascade layer, so any height
 * an author set in CSS (including Tailwind's layered utilities) still wins:
 * `@layer next-img-dims{:where(img[data-dims]){height:auto}}`. SVG, CDN-hosted images, data:
 * URIs and tags with srcset are left alone. Images inside a slide (swiper-slide, w-slide,
 * slick-slide, …) are left alone too: a flex slide sizes its image from the stretched height
 * and a width attribute would widen it. So are images with inline padding or border and no
 * inline width (under border-box the attribute would squeeze them). To keep the pass off one image, put `data-no-dims` on
 * its <img> tag in src/. Set SKIP_IMAGE_DIMENSIONS=1 to turn
 * this part off on its own.
 *
 * Skipped on purpose:
 *   - *.min.js / *.min.css      already minified
 *   - analytics scripts         next-forwarder-core.js, *.adapter.js, user-data-capture.js:
 *                               tracking contracts we don't want to risk for a few KB
 *   - brand-fonts.css           Campaigns OS theme output; `record theme` byte-compares it
 *
 * A file esbuild can't parse is left as it is (warning, not a build failure).
 * Set SKIP_OPTIMIZE=1 to turn the step off without a code change.
 */

const fs   = require('fs');
const path = require('path');
const { imageSize } = require('./image-size');

const WHITESPACE_ONLY = [/(^|\/)config\.js$/];
const SKIP_FILE = [
  /\.min\.(js|css)$/,
  /(^|\/)next-forwarder-core\.js$/,
  /\.adapter\.js$/,
  /(^|\/)user-data-capture\.js$/,
  /(^|\/)brand-fonts\.css$/,      // Campaigns OS generated file; `record theme` byte-compares it
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(css|js|html)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function optimizeSite(siteDir) {
  if (process.env.SKIP_OPTIMIZE === '1') {
    console.log('[optimize] SKIP_OPTIMIZE=1 — skipped');
    return;
  }
  if (!fs.existsSync(siteDir)) return;
  const esbuild = require('esbuild');

  let files = 0, before = 0, after = 0, skipped = 0, inline = 0, dims = 0;
  for (const file of walk(siteDir)) {
    const rel = path.relative(siteDir, file);
    if (file.endsWith('.html')) { inline += stripInlineConfig(esbuild, file, rel); dims += addImageDimensions(file, siteDir); continue; }
    if (SKIP_FILE.some(re => re.test(rel))) { skipped++; continue; }
    const src = fs.readFileSync(file, 'utf8');
    if (WHITESPACE_ONLY.some(re => re.test(rel))) {
      try {
        fs.writeFileSync(file, esbuild.transformSync(src, { loader: 'js', minifyWhitespace: true, target: 'esnext' }).code);
      } catch (err) {
        console.warn(`[optimize] ⚠ left as-is (esbuild couldn't parse): ${rel}`);
      }
      continue;
    }
    try {
      // JS: no `format`, so esbuild treats the file as a classic script and keeps
      // top-level names (globals used by inline handlers and other scripts survive).
      // `esnext` keeps the source syntax — no down-levelling helpers leak onto window.
      const { code } = esbuild.transformSync(src, {
        loader: file.endsWith('.css') ? 'css' : 'js',
        minify: true,
        target: 'esnext',
      });
      if (Buffer.byteLength(code) >= Buffer.byteLength(src)) continue;
      fs.writeFileSync(file, code);
      files++;
      before += Buffer.byteLength(src);
      after += Buffer.byteLength(code);
    } catch (err) {
      console.warn(`[optimize] ⚠ left as-is (esbuild couldn't parse): ${rel}`);
    }
  }
  const kb = n => (n / 1024).toFixed(0);
  console.log(`[optimize] ${siteDir}: minified ${files} file(s), ${kb(before)} KB → ${kb(after)} KB (${skipped} skipped by rule, ${inline} inline config block(s) stripped, ${dims} image tag(s) given width/height)`);
}

// <script data-inline-config>…</script> → whitespace-only minify of the body, attribute dropped.
// Opt-in so no other inline script is ever touched. A block esbuild can't parse is left as-is.
function stripInlineConfig(esbuild, file, rel) {
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('data-inline-config')) return 0;
  let n = 0;
  const out = html.replace(/<script(\s[^>]*?)?\sdata-inline-config(?:="[^"]*")?([^>]*)>([\s\S]*?)<\/script>/g, (whole, pre = '', post = '', body) => {
    try {
      const code = esbuild.transformSync(body, { loader: 'js', minifyWhitespace: true, target: 'esnext' }).code.trim();
      n++;
      return `<script${pre}${post}>${code}</script>`;
    } catch (err) {
      console.warn(`[optimize] ⚠ inline config left as-is (esbuild couldn't parse): ${rel}`);
      return whole;
    }
  });
  if (n) fs.writeFileSync(file, out);
  return n;
}

// <img src="/slug/images/x.webp"> without width/height → both attributes from the file's pixel
// size, plus one zero-specificity rule per page so author CSS sizing still wins and the
// attributes only contribute the aspect ratio. Only local
// raster files under the built site are touched; SVG, remote, data: and srcset tags are left.
// In its own cascade layer, declared first in <head>: a layered rule loses to every unlayered author
// rule and to every layer declared after it (Tailwind's utilities included), but still beats the
// width/height presentational hints the attributes add. So the attributes only contribute the
// aspect ratio; whatever CSS sized the image before keeps sizing it.
const IMG_DIMS_RULE = '<style>@layer next-img-dims{:where(img[data-dims]){height:auto}}</style>';
function addImageDimensions(file, siteDir) {
  if (process.env.SKIP_IMAGE_DIMENSIONS === '1') return 0;
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('<img')) return 0;
  const sizeCache = new Map();
  const inSlider = sliderImageOffsets(html);
  let n = 0;
  const out = html.replace(/<img\b[^>]*>/g, (tag, offset) => {
    if (/\s(width|height|srcset)\s*=/i.test(tag) || /\sdata-no-dims\b/i.test(tag)) return tag;
    if (inSlider.has(offset)) return tag;
    // Inline padding/border with no inline width: under box-sizing:border-box (Bootstrap, Tailwind)
    // the width attribute would include the padding and squeeze the picture (grounded-sheets'
    // 37px icon with 8px padding rendered 17px wide). Leave these to their natural size.
    const style = ((tag.match(/\sstyle\s*=\s*"([^"]*)"/i) || tag.match(/\sstyle\s*=\s*'([^']*)'/i) || [])[1] || '').toLowerCase();
    if (/(^|[;\s])(padding(-[a-z]+)?|border(-(top|right|bottom|left))?(-width)?)\s*:/.test(style) && !/(^|[;\s])width\s*:/.test(style)) return tag;
    const m = tag.match(/\ssrc\s*=\s*"(\/[^"]+\.(?:png|jpe?g|webp|gif))"/i) || tag.match(/\ssrc\s*=\s*'(\/[^']+\.(?:png|jpe?g|webp|gif))'/i);
    if (!m) return tag;
    const abs = path.join(siteDir, m[1].split('?')[0]);
    if (!abs.startsWith(siteDir) || !fs.existsSync(abs)) return tag;
    if (!sizeCache.has(abs)) sizeCache.set(abs, imageSize(abs));
    const size = sizeCache.get(abs);
    if (!size || !size.width || !size.height) return tag;
    n++;
    const selfClosing = /\/\s*>$/.test(tag);
    const body = tag.replace(/\s*\/?\s*>$/, '');
    return `${body} width="${size.width}" height="${size.height}" data-dims${selfClosing ? ' />' : '>'}`;
  });
  if (!n) return 0;
  const headOpen = out.match(/<head\b[^>]*>/i);
  const withRule = out.includes(IMG_DIMS_RULE) ? out
    : headOpen ? out.replace(headOpen[0], `${headOpen[0]}\n${IMG_DIMS_RULE}`)
    : out.includes('</head>') ? out.replace('</head>', `${IMG_DIMS_RULE}\n</head>`) : IMG_DIMS_RULE + out;
  fs.writeFileSync(file, withRule);
  return n;
}

// Offsets of <img> tags that sit inside a slide (an ancestor carrying one of the slide classes
// below). Slides are flex items that size the image from their stretched height; a width
// attribute turns that into a definite flex-basis and the image widens. Slides fix their own
// box, so these images don't shift the page anyway. Matched by whole class token, not substring:
// a layout wrapper named e.g. "olympus-checkout__left-slider" is not a slide, and the
// weighted-blanket checkout hero sits in one.
// One forward pass over the tags with an open-element stack; void elements don't push.
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
const SLIDE_CLASSES = new Set(['swiper-slide', 'w-slide', 'slick-slide', 'splide__slide', 'carousel-item', 'keen-slider__slide', 'glide__slide', 'flickity-cell']);
function sliderImageOffsets(html) {
  const found = new Set();
  const stack = []; // depth of slider ancestors is what matters
  let sliderDepth = 0;
  const re = /<\/?([a-zA-Z][\w:-]*)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    const [whole, name, attrs] = m;
    const tag = name.toLowerCase();
    if (whole.startsWith('</')) {
      // pop to the matching open tag; tolerate stray closers
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) { for (let j = stack.length - 1; j >= i; j--) if (stack[j].slider) sliderDepth--; stack.length = i; break; }
      }
      continue;
    }
    if (tag === 'img' && sliderDepth > 0) found.add(m.index);
    if (VOID.has(tag) || /\/\s*$/.test(attrs)) continue;
    if (tag === 'script' || tag === 'style') { // skip to the closer, their bodies aren't markup
      const end = html.indexOf(`</${tag}`, re.lastIndex); if (end > 0) re.lastIndex = end; continue;
    }
    const cls = (attrs.match(/\sclass\s*=\s*"([^"]*)"/i) || attrs.match(/\sclass\s*=\s*'([^']*)'/i) || [])[1] || '';
    const slider = cls.split(/\s+/).some(c => SLIDE_CLASSES.has(c));
    if (slider) sliderDepth++;
    stack.push({ tag, slider });
  }
  return found;
}

module.exports = { optimizeSite, addImageDimensions };

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node scripts/optimize-site.js <site-dir>');
    process.exit(1);
  }
  optimizeSite(path.resolve(dir));
}
