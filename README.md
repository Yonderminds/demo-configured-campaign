# Demo: a configured campaign

This repo shows a **finished** campaign: built for one real store (**Coerneuineo**), configured and tested. It uses the **same layout** as the fresh demo and the go-live guide, so you can compare the 2 repos and see exactly what changes.

| Repo | What it shows |
|---|---|
| [demo-fresh-campaign](https://github.com/Yonderminds/demo-fresh-campaign) | Your repo **after Step 4**: Page Kit installed, nothing set up for a store yet |
| **demo-configured-campaign** (this repo) | Your repo **after Step 16**: real campaign, real pages, Shopify URL, redirects and test records |

**New here? Start with [GO-LIVE.md](GO-LIVE.md)**, the step-by-step guide. Coordinators: see [ADMIN-TRACKER.md](ADMIN-TRACKER.md).

Agent instructions are in `AGENTS.md` (`CLAUDE.md` links to it).

This demo is **not hosted** for shoppers. Your store repos are hosted on Cloudflare Pages (Step 13).

---

## Layout

```
demo-configured-campaign/
├── AGENTS.md                ← instructions for Codex (top lines from Step 4b)
├── GO-LIVE.md               ← the developer guide
├── ADMIN-TRACKER.md         ← the coordinator's 1-row-per-store tracker
├── package.json             ← Page Kit, Campaigns OS, and the build commands
├── _data/campaigns.json     ← the campaign: store details and tracking settings
├── src/christmas-diamond-painting-light-wreath/   ← the campaign pages
├── source/                  ← the design the pages were built from
├── scripts/shopify-urls.js  ← keeps the old Shopify address (Step 11)
├── shopify-urls.json        ← old Shopify address → campaign page
├── _redirects               ← Cloudflare Pages: subdomain home → main site (Step 13c)
├── campaign-runtime.build.json, campaign-build-brief.json, .campaign-runtime/  ← Campaigns OS records
└── _site/                   ← made by `npm run build`, never committed
```

## Build

All commands in the repo folder:

```bash
npm ci
npm run dev      # look at the pages on your computer
npm run build    # make _site/ (5 pages + the old Shopify address + _redirects)
```

## The campaign

| Page | Address |
|---|---|
| Landing | `/christmas-diamond-painting-light-wreath/` and the old Shopify address `/products/hot-sale-49-off✨-christmas-diamond-painting-light-wreath-diy-kit-buy-2-get-free-shipping-🎁/` |
| Checkout | `/christmas-diamond-painting-light-wreath/checkout/` |
| Upsell (30% off) | `/christmas-diamond-painting-light-wreath/upsell-30/` |
| Downsell (50% off) | `/christmas-diamond-painting-light-wreath/downsell-50/` |
| Thank-you | `/christmas-diamond-painting-light-wreath/receipt/` |

Built with Page Kit 0.3.0 and Campaigns OS 1.71.0. Tested with test-card orders on 13 November 2026 (records in `.campaign-runtime/qa-verdict.json`).

---

## If you copy from this demo: replace these

**Everything below belongs to the Coerneuineo store.** Never reuse it for another store.

| What | Where | Replace with |
|---|---|---|
| Campaign API key | `src/<slug>/assets/config.js` (`apiKey`) | Your campaign's key (Step 6) |
| Package IDs | The pages and `_includes/` in `src/<slug>/` (`data-next-package-id`, and page settings at the top of each page) | Your campaign's package IDs (Step 6) |
| Store name, support contact, phone, policy links | `_data/campaigns.json` (`store_*` fields) | Your store's details |
| Tracking | `_data/campaigns.json` (`axon_event_key`, `gtm_id`, `fb_pixel_id`). They are **empty** here on purpose. | Your keys (Step 12). Leave customer data sharing **off** unless the store owner approves it. |
| Old Shopify address | `shopify-urls.json` | Your old Shopify product addresses (Step 11) |
| Main site in the redirect | `_redirects` | Your main domain (Step 13c) |
| Page text, images, design | `src/<slug>/`, `source/` | Your own |
| Campaigns OS records | `campaign-runtime.build.json`, `campaign-build-brief.json`, `.campaign-runtime/` | **Do not copy.** Codex makes new ones for your campaign (Step 10). |

## Attribution notes for this store

- All 11 store metadata fields for campaign attribution were present on 13 November 2026 (2 order fields, 9 attribution fields).
- The Campaign Cart SDK saves `affid` / `aff` and `sub1` to `sub5` from the landing address, first visit.
- Attribution platform and Meta Conversions API: not confirmed. Record them here when they are decided.
