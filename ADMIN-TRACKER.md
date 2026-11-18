# Admin tracker: campaigns going live

For the **Yonderminds coordinator** (Harris). The developer guide ([GO-LIVE.md](GO-LIVE.md)) has the detailed steps. This page is the short view: **1 row for each store**, so you can see what is done, who owns it, and what is next.

Copy the table into a shared Google Sheet (or a private document). **Do not fill in real names, keys or customer data in this public repo.**

---

## 1. Before any store starts: what NEXT must provide

| # | NEXT provides | Status |
|---|---|---|
| 1 | The store is set up on NEXT, and the Yonderminds store admin can log in to its dashboard | |
| 2 | The Campaigns App is installed on the store | |
| 3 | Access to the Campaigns OS Workspace (the Map) for each developer | |
| 4 | Yonderminds GitHub organization invites sent; org owners named | |
| 5 | Each payment method set up and approved for the store (Step 14) | |
| 6 | The list of apps connected to the store that receive orders (warehouse, Shopify sync, email) (Step 15a) | |
| 7 | Storefront redirects for old Shopify URLs, if the domain is the storefront (Part F) | |
| 8 | The AppLovin app on the storefront, if used (Part G) | |

## 2. Before any store starts: what Yonderminds must provide

| # | Yonderminds provides | Status |
|---|---|---|
| 1 | GitHub username for each developer, with 2FA on | |
| 2 | A Cloudflare account for hosting, owned by Yonderminds (Step 13) | |
| 3 | For each store: who can change the domain's DNS | |
| 4 | For each store: the AppLovin Event Key | |
| 5 | For each store: the old Shopify product URLs used in ads | |
| 6 | For each store: who approves go-live (team leader) | |

---

## 3. One row for each store

| Store | Merchant owner | Developer | Repo | Domain / DNS owner | Approved offer | Tracking | Payments ready | QA evidence | Launch approver | Status | Next action (who, by when) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| *example: mystore* | *name* | *name* | *mystore-cpk* | *offers.mystore.com / name* | *Buy 1/2/3 at $29.99 / $49.99 / $64.99, free shipping over $45; approved by name, date* | *AppLovin key added; events checked (Step 15e)* | *Card yes, PayPal yes, Apple Pay no (NEXT, date)* | *Link to test notes: paths, order numbers, cleaned up (Step 15f)* | *name* | *Testing* | *Developer: fix downsell price, 20 Nov* |
| | | | | | | | | | | | |

### What to write in each column

| Column | Write |
|---|---|
| Store | The NEXT store name |
| Merchant owner | The person who owns the store's business decisions (prices, offers) |
| Developer | The developer building the campaign |
| Repo | `<store>-cpk` |
| Domain / DNS owner | The campaign domain, and the person who can change its DNS |
| Approved offer | The products, prices and offers the merchant owner approved (Step 6), with name and date |
| Tracking | AppLovin (and other pixels): key added? events checked against the Step 15e table? |
| Payments ready | Each payment method, and NEXT's confirmation with date (Step 14) |
| QA evidence | A link to the test notes from Step 15f: paths tested, order numbers, cleanup done |
| Launch approver | The team leader who says yes in Step 16 |
| Status | 1 of: **Not started**, **Building**, **Testing**, **Waiting for NEXT**, **Approved**, **Live**, **Paused** |
| Next action | 1 action, the person, and the date |

### Status meanings

| Status | Meaning |
|---|---|
| Not started | Repo not created yet |
| Building | Steps 2 to 13 in progress |
| Testing | Step 15 in progress |
| Waiting for NEXT | Blocked on something in section 1 |
| Approved | Step 16: the team leader said yes, ads not started yet |
| Live | Ads point to the campaign |
| Paused | Ads stopped because of a problem (Part D) |
