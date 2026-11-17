# Bumping the Campaign Cart SDK

Read this when the task is an SDK version bump. The target version comes from the ticket, never from memory.

The procedure is the `next-campaigns-sdk-bump` skill that ships with Campaigns OS (1.59.0 and later). In the campaign folder:

```bash
npm i -D -E @nextcommerce/campaigns-os@<version from the ticket>
npx --no-install campaigns-os install-skills --platform claude
```

Then start a fresh session and follow the skill. This file is what this repo adds on top of it. Where the two differ, this file wins.

## Overrides

- **Ask before every test order**, not once up front. Also ask before every push and before opening the PR.
- **Branch name** follows the ticket.
- **Hand back as a comment on the ticket**, not the PR. That comment is the evidence record; don't commit an evidence file. Include the PR link, what changed, storage-check and doctor results, the order table, what passed, what is not proven, and order numbers to cancel. List anything you found that the bump didn't cause separately.

## Extra checks

- **Pins:** `scripts/smoke-check.js` fails the build if a page's loader version differs from its `sdk_version`. Run `node scripts/smoke-check.js` from the repo root after the build.
- **Known changes so far** (still read the release notes for the range): storage keys scoped per campaign (0.4.34); FOMO popup removed (0.4.37) — the replacement is a standalone `fomo-popup.js` drop-in (ask NEXT for the file): copy its `fomo-popup.js` into the funnel, list it before the script that starts it, and call `FomoPopup.start({ … })` with the same `items`, `customers` and timing the page gave `next.fomo()`; it fires `fomo:shown` on `document`, not on `next.on`; intl-tel-input replaced by the SDK's phone field (0.4.39); address rules from the i18n service and the `data-next-address` block (0.4.40); card fields through 29next's payment wrapper, and coupons that add no discount refused (0.4.41); billing validated like shipping (0.4.42); Shop Pay as a radio and express method, and `expressCheckout.methodOrder` is a filter as well as an order, so a campaign's `config.js` must list `shop_pay` and `link` for those buttons to render (0.4.43).
- **Coupons:** check the code exists and discounts on every campaign the funnel uses, including email-checkout campaigns.
- **Storage check:** a `shared-script-outside-scope` line is a script the scanned pages load from outside `--scope`. Add its folder to `--scope`, or say whose it is.

## Preview proof

- Fresh browser context per order. Emails `test+<ticket>-<path>@example.com`. Read the data layer by polling; never wrap `push`.
- Test cards, including the 3-D Secure one, are on the NEXT developer docs testing page (https://developers.29next.com/docs/testing). Orders placed with them are tagged as test orders and never reach a gateway. Use the 3-D Secure card whenever the range changed the card fields (0.4.41 did), and say whether a challenge showed or it passed frictionless.
- Add `?currency=<main>&country=<main>` to the first URL as well as pinning the browser's locale and geolocation. The SDK picks the market by IP, so browser geolocation alone doesn't hold it.
- Don't use `?ignore=true` on test orders: on 0.4.42 it stops all `dl_*` events, so `dl_purchase` can't be proved. Block analytics beacons at the network instead (GA4 collect, Google Ads, Meta, TikTok, Everflow and any other vendor the funnel loads).
- **Returning visitor:** the SDK fires `next:initialized` once and doesn't replay it, so on a cached reload a `defer` script that only listens for that event can miss it and never run. Find every listener; guard the ones that only wait for the event (run at once if `window.next` exists and `body[data-next-sdk-loading="false"]`, otherwise wait for the event, and run once). The guard goes in the bump PR. Prove it with 1 fresh plus 5 cached loads of each SDK page, and one load with the page's scripts forced to run after the SDK.
- If no page shows an upsell quantity picker, cover quantity at checkout and say so.
- `dl_purchase` exactly once on the first page after checkout, never on the receipt, and none for the cancelled PayPal attempt. Read every order back from the store: lines, totals, currency.

The developer reviews, merges, and checks the live pages load the target version.

## Rules

- Change only what the bump needs. Don't touch other people's open PRs; tell the developer if a file overlaps.
- Never commit to `main`, never merge, never run `npm audit fix`.
- `tooling setup` is not needed. `tooling status` ATTENTION_REQUIRED is normal.

## Bumping while you're doing other work

If you're in the repo for something else and want to bump the SDK too, do it as its own PR, from the rollout ticket for this repo (ask NEXT if there isn't one), with every step of the skill and this file, including the test orders on the preview. Clicking through the pages doesn't prove payment, upsells or `dl_purchase`. Comment on the rollout ticket with the PR link, the order numbers and the ticket you were working on.
