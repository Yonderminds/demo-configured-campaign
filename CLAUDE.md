# Coerneuineo: Campaign Repo (CPK)

- **Store:** coerneuineo
- **Owner:** Yonderminds
- **Campaign type:** CPK (Campaign Page Kit)
- **Hosting:** GitHub Pages, published by `.github/workflows/pages.yml` on every push to `main`. No custom domain is attached yet, so nothing here is on coerneuineo.com.

`AGENTS.md` is a link to this file, so Codex and Claude Code read the same instructions. Edit `CLAUDE.md`; do not replace the link with a copy.

This repo is the worked example for building campaigns on NEXT: the campaign is created in the Campaigns App, laid out in the Campaigns Map, and built here with Campaign Page Kit and the Campaign Cart SDK.

---

## Repo structure

```
coerneuineo-cpk/
├── .github/
│   └── workflows/
│       ├── pages.yml           # Build + publish to GitHub Pages on every push to main
│       ├── smoke-check.yml     # Runs smoke-check.js on every PR → inline PR annotations
│       └── campaign-check.yml  # Every package priced in every currency, on PRs + weekly
├── scripts/
│   ├── pages-routes.js     # Writes netlify.toml rewrites as static pages for GitHub Pages
│   ├── smoke-check.js      # Pre-deploy validator (run before the build, and on PRs)
│   ├── campaign-check.js   # Read-only Campaigns API gate: every package priced in every currency
│   ├── build.js            # Multi-campaign build: discovers + builds every campaign dir
│   ├── optimize-site.js    # Post-build: minify CSS/JS, write image width/height (build output only)
│   └── image-size.js       # Image header reader used by optimize-site.js
├── christmas-diamond-painting/   # One folder per product line (CPK project)
│   ├── _data/
│   │   └── campaigns.json  # Campaign registry: sdk_version, store fields, analytics IDs
│   ├── src/
│   │   └── christmas-diamond-painting-light-wreath/   # Campaign source: layouts, includes, assets, pages
│   ├── .campaign-runtime/  # Campaigns OS build records (readback bundle, agent context)
│   ├── CLAUDE.md           # Full SDK + template rules for campaigns in this project
│   ├── AGENTS.md           # Link to that CLAUDE.md, for Codex
│   └── package.json        # Build scripts (npm run build, dev, config, etc.)
├── netlify.toml            # Rewrite rules read by pages-routes.js; redirects and headers are not used on Pages
├── package.json            # Repo-level build tooling only (esbuild for optimize-site.js)
├── CLAUDE.md               # ← this file
├── AGENTS.md               # Link to this file, for Codex
└── .gitignore
```

Each campaign is fully isolated. Assets, layouts, and pages from one campaign never bleed into another.

---

## New campaigns

The repo-level tooling (`scripts/`, `.github/workflows/`) is already here. Keep it; every campaign is built and checked by it.

To add a campaign to an existing project:

```bash
cd christmas-diamond-painting
npm install
npm run setup -- --slug <slug>
```

`npm run setup` is an alias for `campaign-init`. It shows a template picker, adds the entry to `_data/campaigns.json`, downloads the chosen template's `src/<slug>/` files, and can write the API key to `assets/config.js`. Keep `--slug`, because the folder name is the URL path. Then wire up store config and analytics with the `next-campaigns-setup` skill.

The campaign itself (packages, offers, shipping) is created in the Campaigns App, with the `next-campaigns-create` skill, before the pages are built. The Admin API token that skill uses is private: keep it in your shell environment or a git-ignored `.env`, never in this repo and never in page code. The Campaigns API key in `assets/config.js` is a public browser key and is meant to ship with the pages.

---

## Build

```bash
cd christmas-diamond-painting
npm start                # interactive menu: dev server, compress, clone, configure
npm run setup            # alias for campaign-init: bootstrap project, install starter template, set API key
npm run dev              # dev server with campaign picker
npm run build            # build all campaigns to _site/
npm run clone            # duplicate a campaign to a new slug
npm run config           # set API key interactively
npm run compress         # compress all images in a campaign
npm run compress:preview # preview compression savings without modifying files
```

The full build runs from the repo root: `node scripts/smoke-check.js && node scripts/build.js`. `build.js` auto-discovers all campaign directories (any top-level folder with `package.json` + `src/`), runs `npm install && npm run build` in each, optimises each campaign's `_site/` (below), and merges all `_site/` outputs into a root `_site/`, which is what gets published.

### Page speed (automatic)

- **Post-build optimise** (`scripts/optimize-site.js`, called by `build.js` after each campaign builds). It works on `_site/` only, so a page edit or Figma export can't undo it.
  - **Minify:** every `.css` / `.js` file is minified in place. Skipped: `*.min.*`, `next-forwarder-core.js`, `*.adapter.js`, `user-data-capture.js`. `config.js` and `<script data-inline-config>` blocks get whitespace-only minification.
  - **Image width/height:** local raster `<img>` tags with neither attribute get both from the file's pixel size, so the browser reserves the space. Left alone: SVG, CDN images, `srcset`, images inside slides, images with inline padding or a border and no width, and any tag with `data-no-dims` (the per-image opt-out).
  - Switches: `SKIP_OPTIMIZE=1` turns the whole step off; `SKIP_IMAGE_DIMENSIONS=1` turns off only the image part.
- **Speed checks on PRs** (`scripts/smoke-check.js`, warnings only, and only for the slugs a PR changes): pages that bypass the shared layouts, PNGs over 150 KB and images over 300 KB, videos over 2 MB and CDN images over 300 KB (`SMOKE_OFFLINE=1` skips the HEAD requests), video on a checkout page, `<video>` without a poster or `preload`, and Google / Adobe fonts. Run `SMOKE_SPEED_ALL=1 node scripts/smoke-check.js` to see them for every slug.
- **Always checked:** an `async` SDK loader without `window.nextConfig` inlined above it is an **error**. The SDK can start before its config and the checkout never boots.

---

## Hosting

Campaigns in this repo are published with GitHub Pages. `.github/workflows/pages.yml` runs on every push to `main`: smoke check, root build, then `scripts/pages-routes.js`, and publishes the merged `_site/`. Pages serves static files only, so the rules in `netlify.toml` do not apply there directly:

- **Rewrites:** `scripts/pages-routes.js` reads every status-200 rule in `netlify.toml` and copies the target page to the `from` address in `_site/`. That is how the landing page is also served at the store's old product address (`/products/hot-sale-49-off…`), which is where the ads point. To add an address, add a status-200 rule to `netlify.toml`.
- **Redirects:** 301 rules cannot be sent and are skipped (the build log lists them). The campaign slug address keeps serving the landing page itself.
- **Domain:** pages use root-relative paths (`/christmas-diamond-painting-light-wreath/…`), so they only render correctly on a custom domain. The `github.io` project address serves the HTML without its styles.
- **Cache headers:** GitHub Pages sets its own; the 30-day image and font caching is not available.
- **Previews:** there are no per-PR preview sites. Check changes with `npm run dev` locally.

Before checkout is tested on any new address (the github.io address or the custom domain), that address has to be added to the campaign's SDK origin allow-list in the Campaigns App.

---

## Campaign Cart SDK

All campaigns in this repo use the **Campaign Cart SDK** by NEXT at **SDK 0.4.***. Do not apply SDK knowledge from older versions.

- **Docs (primary reference):** `https://cart-sdk.nextcommerce.com/v<sdk_version>/`, the docs for the `sdk_version` pinned in that campaign's `_data/campaigns.json` (e.g. `https://cart-sdk.nextcommerce.com/v0.4.41/`). `/latest/` tracks the newest release; use it only to check what a version bump would change.
- **Source (ultimate truth):** https://github.com/NextCommerceCo/campaign-cart

The SDK is controlled via `data-next-*` HTML attributes and configured via `window.nextConfig` in `assets/config.js`. Do not write JavaScript to replicate what SDK attributes already handle.

**Before working on any campaign, read the full rules file:**
`christmas-diamond-painting/CLAUDE.md`. It covers SDK wiring, Liquid filters, frontmatter, config.js structure, data attributes, and task checklists.

---

## sdk_version

To bump an existing campaign's SDK, use the `next-campaigns-sdk-bump` skill from Campaigns OS together with `BUMP.md` at the repo root. The rest of this section is for a new campaign's starting version.

Always copy `sdk_version` from the upstream template registry. Do not guess or hardcode it from memory:

```
https://github.com/NextCommerceCo/campaign-cart-starter-templates/blob/main/_data/campaigns.json
```

Set it in the project's `_data/campaigns.json`. The SDK CDN URL is built from this value.

---

## Commerce surface catalog

Before touching any template-family commerce components (bundle selector, bumps, upsells, receipt surfaces), fetch the catalog:

- Human-readable: https://raw.githubusercontent.com/NextCommerceCo/campaign-cart-starter-templates/main/docs/commerce-surface-catalog.md
- Machine-readable: https://raw.githubusercontent.com/NextCommerceCo/campaign-cart-starter-templates/main/docs/commerce-surface-catalog.json

Use it to map designed HTML to the correct template family and verify Liquid params for each surface. Ask for a human checkpoint when family confidence is ambiguous.

---

## Working with Codex or Claude Code

- Both agents read the same rules: `AGENTS.md` at the root and in each project folder links to the `CLAUDE.md` beside it.
- Campaigns OS installs its skills per agent from the project folder: `npx --no-install campaigns-os install-skills --platform <platform>`. Check `--help` for the platforms your installed version supports.
- Never commit a `.env` file, an Admin API token, or test-order customer details.

---

## Working across campaigns

Each subdirectory is a separate campaign. Campaign-specific context (package IDs, page structure, upsell routing, analytics IDs) lives in that campaign's `_data/campaigns.json` and `assets/config.js`. Do not carry assumptions between campaigns.

---

## Attribution

State at setup (2026-11-13):

- Store-level metadata definitions (Settings > Metadata): all 11 definitions present (2 Order: `nc_campaign_id`, `nc_campaign_name`; 9 Attribution: `conversion_timestamp`, `device`, `device_type`, `domain`, `landing_page`, `referrer`, `sdk_version`, `timestamp`, `user_ip`). The SDK attaches the attribution values to the order payload whether or not definitions exist; definitions are what make them first-class in admin, reporting, export and filtering. They are store-wide, shared by every campaign on the store.
- The Campaign Cart SDK captures `affid` or `aff` into the Affiliate ID field and `sub1` to `sub5` into `subaffiliate1` to `subaffiliate5` (capped at 225 chars each) from the landing URL, first touch. Values persist in sessionStorage for the tab, not across a returning visit.
- Attribution platform, destination network, click-ID slot (`subaffiliate1` to `subaffiliate5`), inbound query param, and Meta Conversions API (`fbp`, `fbc`, optional `fb_pixel_id`): not confirmed at setup.
- If Everflow is used, the NEXT default is offer ID on `sub4` in the link template, `affid=` so the Affiliate ID field fills, and `evclid=` for the S2S postback; a custom `oid` metafield is the override, not the default.

Record the final attribution choices here when they are made.
