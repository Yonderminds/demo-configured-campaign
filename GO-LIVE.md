# Go-live guide: campaigns on NEXT

This guide is for **developers at Yonderminds** who build campaigns for a NEXT store. It takes you from nothing to a live campaign, one step at a time.

Each step says:

- **Who** does it
- **Where** to run commands (which folder)
- **You should see**: how you know the step worked

If a step does not work, **stop and ask NEXT**. Do not guess.

> **For Codex and other AI tools reading this file**
>
> 1. Do the steps in order. Do not skip steps.
> 2. Steps marked **Who: Store admin**, **Org owner**, **Team leader** or **NEXT** need a person. Stop, tell the person what to do, and wait for them to say it is done.
> 3. Never ask for, read, print or commit the **Admin API key**. Never commit a `.env` file.
> 4. Never place a test order, change a price, switch on an offer, change DNS, or push to `main` unless the person says yes for that action.
> 5. When a step says "You should see", check it. If it is not true, stop and report what you see.

---

## Part A. What NEXT gives you and what you give

| NEXT gives you | You give |
|---|---|
| Your NEXT store and access to its dashboard | A GitHub account for each developer (Step 1) |
| The Yonderminds GitHub organization | The products, prices and offers for each campaign |
| The Campaigns App, Campaign Page Kit, Campaigns OS and the NEXT skills | Page designs (or you use a starter template) |
| The Spark storefront theme and Theme Kit (Part H) | Storefront design changes, if you want them |
| Help with payments, domains and redirect rules | Access to your domain's DNS settings |
| 2 demo repos to copy from | Your AppLovin **Event Key** (if you use AppLovin) |
| An admin tracker for the coordinator: [ADMIN-TRACKER.md](ADMIN-TRACKER.md) | A Cloudflare account for hosting (Step 13) |
| | The list of your old Shopify product addresses that ads use |

---

## Part B. Storefront and campaign: what is the difference?

Your store on NEXT can sell in 2 ways. Most stores use **both**.

| | **Storefront** | **Campaign** |
|---|---|---|
| What it is | Your full online shop: home page, all products, collections, cart | A sales funnel for 1 offer: landing page, checkout, upsell, downsell, thank-you page |
| Who builds it | NEXT sets up the theme. You can change it with Codex and the theme skills (Part H) | You build it in GitHub with Codex (this guide) |
| Templates to start from | Spark theme (Part I) | Campaign templates with checkout and upsell pages (Part I) |
| Where it lives | On NEXT, on your main domain (for example `mystore.com`) | On a hosting service you choose (Step 13), on your own domain |
| Best for | Shoppers who browse, search, and come back | Paid ads (AppLovin, Meta, TikTok) that send shoppers to 1 product |
| Post-purchase upsells | **No** | **Yes** (1-click upsell and downsell after payment) |
| Page addresses (URLs) | **Fixed by NEXT. You cannot change them.** Old Shopify addresses need redirect rules (Part F) | **You choose them.** You can keep the **exact** old Shopify address, for example `/products/my-product` (Step 11) |
| Design | NEXT theme | Any design you want |
| Offers | Storefront offers (in the store settings) | Campaign offers (in the Campaigns App). The 2 are separate. A storefront offer does not change a campaign price. |
| AppLovin pixel | The **AppLovin Axon app** in the dashboard (Part G) | A setting in the campaign code (Step 12) |
| Work to set up | Less | More: GitHub, hosting, domain, testing |

**Simple rule:**

- The store itself and old links: **storefront**.
- Ad landing pages where upsells matter, or where you must keep the exact old URL: **campaign**.

### About keeping your Shopify URLs

Your ads send shoppers to addresses like `https://mystore.com/products/my-product`.

- **Storefront:** NEXT product pages use a different address. You cannot change it. So old addresses must **redirect** (send the shopper on) to the new page. See Part F.
- **Campaign:** you can make the campaign page **answer at the same path**: `/products/my-product`. See Step 11.

The address has 2 parts: the **domain** (`mystore.com`) and the **path** (`/products/my-product`). A domain can point to only 1 place:

| Your situation | What to do |
|---|---|
| `mystore.com` is used **only** for campaigns (no storefront) | Point `mystore.com` at your campaign host. The old address works exactly as before. |
| `mystore.com` is the **storefront** | Host campaigns on a subdomain, for example `offers.mystore.com`. Then add a storefront redirect: `mystore.com/products/my-product` goes to `offers.mystore.com/products/my-product` (Part F). Ads keep working with no change. |

---

## Part C. Before you start: collect these

| Item | Who has it | Used in |
|---|---|---|
| Store subdomain (the name in your dashboard address) | NEXT | Steps 5, 6 |
| Products, prices for each quantity, offers, shipping prices, currency | Store owner | Step 6 |
| Page designs (HTML files and images), or "use a template" | Designer | Step 10 |
| Store name, support email, links to policy pages | Store owner | Step 10 |
| Old Shopify product addresses used in ads | Store owner | Step 11, Part F |
| AppLovin Event Key (AppLovin Ads Manager > Account > API keys) | Ads team | Step 12, Part G |
| The domain for the campaign, and who can change its DNS | Store owner | Step 13 |
| Access to the Campaigns OS Workspace (the Map) | NEXT | Step 9 |

---

## Words in this guide

| Word | Meaning |
|---|---|
| Store | Your NEXT store. You log in to its dashboard. |
| Campaign | 1 sales funnel in the Campaigns App: its products, prices, shipping and offers. |
| Package | 1 product (or variant) a shopper can buy in the campaign. Each package has a number (ID). |
| Offer | A discount, for example "Buy 2, get 10% off". |
| Funnel | The pages in order: landing page, checkout, upsell, downsell, thank-you page. |
| Repo | A GitHub repository: 1 folder of code, saved in GitHub. |
| Campaign API key | A **public** key. It goes in the page code. It tells the pages which campaign to use. |
| Admin API key | A **private** key. It can change your store. **Never** put it in code, in GitHub, or in a chat. |
| Domain | A web address, for example `offers.mystore.com`. |
| Map | A plan of the funnel, made in the Campaigns OS Workspace. |
| Publish | Put the pages on the internet. In this guide, merging into `main` publishes (Step 13). |

---

## Overview

| Step | What | Who |
|---|---|---|
| 1 | Accounts and tools | Every developer |
| 2 | Create the repo for a store | Org owner |
| 3 | Install Campaign Page Kit and Campaigns OS | Developer |
| 4 | Connect Codex, agree the team rule | Developer + team leader |
| 5 | Make an Admin API key | Store admin |
| 6 | Create the campaign with next-campaigns-create | Developer + store admin |
| 7 | Check the campaign settings | Store admin |
| 8 | Add test domains to the Campaigns App | Store admin |
| 9 | Build the Map | Developer |
| 10 | Build the pages with Campaigns OS | Developer |
| 11 | Keep your Shopify URLs | Developer |
| 12 | Add the AppLovin pixel | Developer |
| 13 | Put the pages online | Developer + org owner |
| 14 | Check payments are ready | Store admin + NEXT |
| 15 | Final check and test orders | Developer + store admin |
| 16 | Go live | Team leader |

After go-live: **Part D** (changes and recovery), **Part E** (new campaign or new store). Storefront only: **Part F** (redirects), **Part G** (AppLovin app) and **Part H** (build or change the store theme). Where to get templates: **Part I**.

---

## Step 1. Accounts and tools

**Who:** every developer, 1 time only.

1. Make your **own** GitHub account at https://github.com/signup. 1 account per person. Do not share accounts.
2. Turn on two-factor authentication (2FA): GitHub **Settings > Password and authentication**. The Yonderminds organization requires it.
3. Open the email invite to the **Yonderminds** organization and click **Join**.
4. Install these programs:

| Program | Version | Check |
|---|---|---|
| Git | any recent | `git --version` |
| Node.js | 20.19 or newer (22 is fine) | `node --version` |
| npm | 10 or 11 (comes with Node.js) | `npm --version` |
| Python | 3.9 or newer | `python3 --version` |
| Codex | latest | `codex --version` |

On Windows, use WSL (Windows Subsystem for Linux) for every command in this guide.

**You should see:** each check prints a version number.

---

## Step 2. Create the repo for a store

**Who:** org owner (Harris, Alen or NEXT). Directors, team leaders and members cannot create repos in the Yonderminds organization.

Rules:

- **1 repo for each store.** Name it `<store>-cpk`. Example: store `mystore` has repo `mystore-cpk`.
- All campaigns for that store go in the **same repo**.
- Store repos are **private**. Only your team and NEXT can see them. Still, never put secrets in a repo: no keys, no passwords, no customer data.
- The 2 demo repos are public, because they are examples for everyone.

**How the Yonderminds organization is set up:**

| Who | GitHub role | Sees |
|---|---|---|
| Harris, Alen, NEXT | Owner | Everything |
| Director (Jimmy, John) | Member, maintainer of their group's teams | All repos of their group |
| Team leader | Member, maintainer of their own team | Their team's repos |
| Team member | Member of their team | Their team's repos |

Each group (`group-jimmy`, `group-john`, `group-harris-alen`) has 1 sub-team for each team leader. A store repo belongs to 1 sub-team. Everyone in the organization can see the list of people and teams, but only the right team can see a repo.

1. Go to https://github.com/organizations/Yonderminds/repositories/new
2. **Repository name:** `<store>-cpk`. **Visibility:** Private.
3. Tick **Add a README file**. Click **Create repository**.
4. Give the team access: in the repo, **Settings > Collaborators and teams > Add teams**. Choose the store's **sub-team** (the team leader's team, for example `jimmy-lian-siyu`), role **Write**.
   **Never** give a store repo to a `group-*` team (`group-jimmy`, `group-john`, `group-harris-alen`). Every sub-team in that group would then see the repo. The group's director already sees it, because directors are in every sub-team of their group.
5. Each developer copies the repo to their computer:

```bash
git clone https://github.com/Yonderminds/<store>-cpk.git
cd <store>-cpk
```

**You should see:** a folder `<store>-cpk` with a `README.md` file in it.

### What the repo will look like when it is done

```
<store>-cpk/                 ← run every command in this folder
├── AGENTS.md                ← instructions for Codex
├── package.json             ← Page Kit and Campaigns OS
├── _data/campaigns.json     ← 1 entry for each campaign
├── src/
│   ├── <campaign-1>/        ← 1 folder for each campaign
│   └── <campaign-2>/
├── scripts/shopify-urls.js  ← keeps old Shopify addresses (Step 11)
├── shopify-urls.json
├── _redirects               ← Cloudflare Pages redirect rules (Step 13c)
└── _site/                   ← made by `npm run build`, never committed
```

A **second campaign** for the same store is a new folder in `src/`. It is not a new repo.

**Demo repos:**

| Repo | Shows |
|---|---|
| https://github.com/Yonderminds/demo-fresh-campaign | Your repo **after Step 4** (fresh install, nothing set up yet). Same layout as this guide. |
| https://github.com/Yonderminds/demo-configured-campaign | Your repo **after Step 16**: a finished campaign for 1 real store, in the **same layout**. Compare the 2 repos to see exactly what changes. Its README lists every value you must **replace** if you copy from it. |

---

## Step 3. Install Campaign Page Kit and Campaigns OS

**Who:** developer. **Where:** in the repo folder `<store>-cpk`.

```bash
npm init -y
npm install --save-exact next-campaign-page-kit@0.3.0
npm install --save-dev --save-exact @nextcommerce/campaigns-os@1.71.2
npx --no-install campaigns-os install-agent-context --target .
npx --no-install campaigns-os qa install-browser
```

What these do:

1. Make `package.json`.
2. Install **Campaign Page Kit** (builds the pages).
3. Install **Campaigns OS** (plans, builds and checks the campaign).
4. Add Campaigns OS instructions for Codex in `.campaign-runtime/agent-context/`.
5. Install a test browser on your computer (for page checks and test orders).

This guide was checked with **Page Kit 0.3.0** and **Campaigns OS 1.71.2**. Use these versions. To use a newer version later, ask NEXT first.

Campaigns OS also makes a `.gitignore` file. Add these lines at the end of it:

```
node_modules/
_site/
.env
.env.*
```

Save your work:

```bash
git add -A
git commit -m "Install Campaign Page Kit and Campaigns OS"
git push
```

**You should see:** `package.json`, `package-lock.json`, `node_modules/` and `.campaign-runtime/agent-context/AGENTS.md` in the folder.

---

## Step 4. Connect Codex

**Who:** developer.

### 4a. Install the skills (1 time on each computer)

```bash
npx --no-install campaigns-os install-skills --platform codex
npx skills add NextCommerceCo/skills -g -a codex
```

The 1st command installs the Campaigns OS skills (for example `next-campaigns-os`, `next-campaigns-build`, `next-campaigns-qa`). The 2nd installs the NEXT skills, including `next-campaigns-create` and `next-campaigns-setup`.

### 4b. Tell Codex where the Campaigns OS instructions are

**Where:** in the repo folder. Make a file named `AGENTS.md` (or open it if it exists) and add these lines at the top:

```
# Instructions for AI tools

- Read and follow `.campaign-runtime/agent-context/AGENTS.md` for Campaigns OS work.
- Follow `GO-LIVE.md` from the demo: https://github.com/Yonderminds/demo-configured-campaign/blob/main/GO-LIVE.md
- Never read, print or commit the Admin API key or `.env`.
- When you run `campaign-init`, do not use `--ai-context`. It replaces this file.
```

Keep anything else that is already in `AGENTS.md`.

**Important:** the Page Kit command `campaign-init --ai-context codex` **replaces** `AGENTS.md` and deletes these lines. If that happens, add the lines again.

### 4c. Check

Open Codex in the repo folder and ask:

1. "Which NEXT and Campaigns OS skills can you use?" It should list `next-campaigns-create` and `next-campaigns-os`.
2. "Which file has the Campaigns OS instructions for this repo?" It should say `.campaign-runtime/agent-context/AGENTS.md`.

If Codex cannot see the skills, close Codex and open it again in the repo folder.

**You should see:** both answers are correct. Commit `AGENTS.md` and push.

### 4d. Agree the team rule for `main`

**Who:** team leader.

From now on, every change goes through a **branch** and a **pull request**. Nobody merges their own pull request. The **team leader** merges it after checking it (Part D). Merging into `main` publishes the pages once Step 13 is done.

(GitHub can enforce this rule on private repos only with a paid GitHub plan. On the free plan, the team keeps it by agreement.)

More information: https://developers.nextcommerce.com/docs/skills and https://campaigns.nextcommerce.com/start/

---

## Step 5. Make an Admin API key

**Who:** store admin.

The `next-campaigns-create` skill needs this key to create the campaign in your store.

1. In the store dashboard, open **Settings > API Access**.
2. Create a new key with **exactly these 7 permissions**:
   - read store settings
   - read campaigns
   - write campaigns
   - read catalogue (products)
   - read gateways
   - read metadata
   - write metadata
3. Copy the key.

**Where the key goes:** Codex makes a private file named `.env` in the repo folder and shows you 1 line to fill in. Open `.env` in a normal text editor and paste the key there. The line looks like this (store `my-store` becomes `MY_STORE`):

```
MY_STORE_NEXT_ADMIN_API_TOKEN=paste-the-key-here
```

Rules:

- Never paste the key into Codex or any chat.
- Never commit `.env`. The `.gitignore` from Step 3 stops this.
- If the key is ever shared by mistake, delete it in **Settings > API Access** and make a new one.

---

## Step 6. Create the campaign with next-campaigns-create

**Who:** developer, with the store admin for prices.

Decide these first. Codex asks for them and never guesses:

- Which product(s)
- Price for each quantity (for example 1 for $29.99, 2 for $49.99, 3 for $64.99)
- Offers (discounts)
- Shipping methods and prices (for example free over $45)
- Currency

Open Codex in the repo folder and ask in plain words. Example:

```
Use the next-campaigns-create skill. Create a campaign for store my-store.
Product: Christmas Light Wreath.
Buy 1 for $29.99, Buy 2 for $49.99, Buy 3 for $64.99.
Standard shipping $5.99, free over $45.
Currency USD.
Create the offers switched off.
```

What happens:

1. Codex reads your store: products, payment gateways, shipping.
2. Codex shows a **plan** with every package, price and offer.
3. The store admin **checks every price**. Tell Codex what to change.
4. When the plan is right, approve it. Codex creates the campaign.
5. Codex gives you the **Campaign API key** and the **package IDs**. Keep them.
6. **Save the plan** Codex showed (copy it to a file outside the repo, or a shared document). You need it if you ever have to undo a change (Part D).

Offers are **switched off** for now. You switch them on in Step 15, **before** the final test.

**You should see:** the new campaign in the dashboard under **Campaigns**.

---

## Step 7. Check the campaign settings

**Who:** store admin.

Dashboard: **Campaigns** > click the campaign > **Settings** tab.

| Setting | Check |
|---|---|
| Name | Clear, so the team can find it |
| Currency | Correct. **It cannot be changed later.** |
| Additional currencies | Only if you sell in more than 1 currency |
| Shipping | Right methods and prices |
| Payment gateway group | The gateway that takes card payments for this store |
| Payment methods | For example Credit Card, PayPal, Apple Pay |
| Express payment methods | Buttons at the top of checkout, for example PayPal, Apple Pay |
| PayPal account | Only if this campaign uses a different PayPal account from the store |

The **Campaign API key**: click **Developer** at the top of the campaign page. It is in the **Campaigns API** box.

---

## Step 8. Add test domains to the Campaigns App

**Who:** store admin.

The pages can only load products and checkout on addresses in this list. **If an address is not in the list, checkout does not work.**

1. Dashboard: **Campaigns > Settings**.
2. Under **Allowed Domains**, click **Add Domain**.
3. Type only the domain. No `https://`, no path. Example: `offers.mystore.com`.
4. Choose the **Environment**:

| Environment | Use for | What happens to tracking |
|---|---|---|
| Development | Your computer (`localhost`) and test addresses | NEXT analytics **ignores** visits and orders. **Ad pixels (AppLovin, Meta) still fire.** |
| Production | The live address that shoppers and ads use | NEXT analytics records everything. Ad pixels fire. |

5. Click **Save**.

Add now, as **Development**:

- `localhost`
- your test address, if you have one

You add the **live** address as Production in Step 16.

This list is for **all campaigns** in the store.

---

## Step 9. Build the Map

**Who:** developer. **Needs:** access to the Campaigns OS Workspace. If you cannot open it, ask NEXT before you start this step.

The Map is the plan of your funnel: which pages, in which order, and which offer is on each page.

1. Dashboard: **Campaigns** > click the campaign > **Developer** > **Go to Map**. The Map opens with your store and campaign filled in.
   (Direct address: https://campaign-map.nextcommerce.com. Then connect it with the Campaign API key.)
2. Check the packages and prices are the ones approved in Step 6.
3. Add the pages in order. A common funnel: **Landing > Checkout > Upsell > Downsell > Thank-you**.
4. For each page, choose a **template** and the **offer** it shows. Templates: https://campaigns.nextcommerce.com/templates/
5. **Save** the Map.
6. Open **Handoff** and click **Copy start prompt**. It includes your **Map ID**.

**You should see:** a saved Map and the start prompt copied.

---

## Step 10. Build the pages with Campaigns OS

**Who:** developer. **Where:** the repo folder.

1. Make a folder named `source`. Put the page designs in it (HTML files and images). To use templates as they are, leave it empty.
2. Open Codex in the repo folder.
3. Paste the **start prompt** from Step 9. If you do not have it, paste:

```
Set up a NEXT campaign build in this folder.
Follow https://campaigns.nextcommerce.com/llms.txt and ask me for anything you need.
```

4. Codex builds the campaign. It sets up the campaign folder with Page Kit, adds the Campaign API key, and runs Campaigns OS commands such as:

```bash
npx --no-install campaigns-os start --map-id <map-id> --target . --source ./source --template-family <family>
npx --no-install campaigns-os next --packet ./campaign-runtime.build.json
```

   You do not type these. Answer Codex's questions (store name, support email, policy links).

   Then check that `AGENTS.md` still starts with the lines from Step 4b. If not, add them again.

5. Look at the pages on your computer:

```bash
npm run dev
```

Open the address it prints (it starts with `http://localhost`). Click through every page.

6. Build the final files:

```bash
npm run build
```

**You should see:** a folder `_site/<campaign-slug>/` with 1 folder for each page (for example `landing`, `checkout`, `receipt`), each with an `index.html`.

Commit your work on a branch and open a pull request (Part D).

---

## Step 11. Keep your Shopify URLs

**Who:** developer. **Skip this step** if no ads or links use old Shopify addresses for this campaign.

This makes the campaign page also answer at the old Shopify path, for example `/products/my-product`.

1. In the repo folder, make the file `scripts/shopify-urls.js` with this content:

```js
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
```

2. Make the file `shopify-urls.json`. On the left: the old Shopify path. On the right: the campaign page to show. Example:

```json
{
  "/products/christmas-light-wreath": "/first-offer/landing/"
}
```

3. Make it run after every build:

```bash
npm pkg set scripts.postbuild="node scripts/shopify-urls.js"
```

4. Build:

```bash
npm run build
```

**You should see:** the line `[shopify-urls] /products/christmas-light-wreath/ shows /first-offer/landing/`, and the file `_site/products/christmas-light-wreath/index.html`.

Notes:

- Ad click data in the address (for example AppLovin's `?aleid=...&alart=...`) stays on the address. Do not remove it.
- If the domain is your **storefront**, you also need a storefront redirect (Part F) to send the old address to the campaign's domain.

---

## Step 12. Add the AppLovin pixel

**Who:** developer. **Skip** if you do not run AppLovin ads.

The campaign templates already include the AppLovin (Axon) pixel. You only add your key.

1. Get the **Event Key** from AppLovin Ads Manager: **Account > API keys**. It is not a pixel ID.
2. Open `_data/campaigns.json`. In your campaign's entry, add:

```json
"axon_event_key": "your-event-key-here",
"axon_item_category_id": "123"
```

   `axon_item_category_id` is a **number**. Use the category number from your AppLovin product setup. If you do not have one, leave this line out.

3. **Customer email and phone:** off by default. Add `"axon_send_user_data": "true"` **only** if the store owner confirms the store's privacy policy and consent allow sharing them with AppLovin.
4. Do **not** also add AppLovin through Google Tag Manager. That counts every event 2 times.
5. Build and open the page on your computer. Use the **Axon Pixel Helper** browser extension to check that `page_view`, `view_item`, `add_to_cart` and `begin_checkout` fire **once**.

Tell your media buyer:

- Each accepted **upsell** sends **another purchase** to AppLovin. Revenue is correct, but the **number of purchases** is higher than the number of orders.
- Stores in the EU or UK: ask NEXT before switching the pixel on (consent rules).

The storefront uses the AppLovin **app** instead. See Part G.

---

## Step 13. Put the pages online (Cloudflare Pages)

**Who:** org owner (Cloudflare and domain), then developer. **Host:** Cloudflare Pages. GitHub keeps the code and the pull requests. Cloudflare builds the pages and puts them online.

Do **not** use GitHub Pages for campaigns. GitHub's rules do not allow GitHub Pages for sites that are mainly used to sell things.

**Always use your own domain**, for example `offers.mystore.com`. The pages use addresses that start with `/`, so they work only at the top of a domain.

### 13a. Connect the repo to Cloudflare (1 time for each store repo)

**Who:** org owner.

1. Make a free Cloudflare account for Yonderminds at https://dash.cloudflare.com/sign-up (1 company account; add developers as members).
2. In Cloudflare: **Workers & Pages > Create application > Pages > Connect to Git**.
3. Choose **GitHub**. The first time, install the **Cloudflare Workers and Pages** GitHub app on the **Yonderminds** organization. Choose **Only select repositories** and pick the store repo.
4. Choose the repo `<store>-cpk`. Set:

| Setting | Value |
|---|---|
| Project name | `<store>-cpk` |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `_site` |
| Environment variable | `NODE_VERSION` = `22` |

5. Click **Save and Deploy**. Wait for the build to finish.

**You should see:** a green "Success", and an address like `https://<store>-cpk.pages.dev`.

### 13b. Add your domain

**Who:** org owner.

1. In the Pages project: **Custom domains > Set up a custom domain**. Type the domain, for example `offers.mystore.com`.
2. If the domain's DNS is in Cloudflare, Cloudflare adds the record for you. If not, add the **CNAME** record Cloudflare shows (pointing to `<store>-cpk.pages.dev`) where your DNS is managed.
3. Wait until the domain shows **Active**. HTTPS is set up automatically.
4. Add the domain to the Campaigns App as **Development** for now (Step 8). It becomes Production in Step 16.

### 13c. AppLovin rule: send the subdomain home address to your main site

AppLovin requires that the **home address** of an ad subdomain (`https://offers.mystore.com/`) sends shoppers to your main site (`https://mystore.com/`) with a permanent (301) redirect.

1. In the repo folder, make a file named `_redirects` with this line (use your own main domain):

```
/ https://mystore.com/ 301
```

2. Make the build copy it into `_site` (Cloudflare reads it from there):

```bash
npm pkg set scripts.postbuild="node scripts/shopify-urls.js && cp _redirects _site/_redirects"
```

(If you skipped Step 11, use `npm pkg set scripts.postbuild="cp _redirects _site/_redirects"`.)

3. After the next publish, open `https://offers.mystore.com/`. It must go to `https://mystore.com/`.

### 13d. Preview and production

| | Address | What it is for |
|---|---|---|
| **Production** | Your domain, and `<store>-cpk.pages.dev` | What shoppers see. Updated when a pull request is **merged into `main`**. |
| **Preview** | A different `*.pages.dev` address for each pull request | For the team leader to look at a change **before** it is merged. Cloudflare shows the link on the pull request in GitHub. |

Preview addresses change for each pull request, so they are not in **Allowed Domains**. Pages show, but **checkout may not work on a preview**. Test checkout on your domain (Step 15).

**You should see:** `https://<your-domain>/<campaign-slug>/` opens with styles and images, over HTTPS.

---

## Step 14. Check payments are ready

**Who:** store admin, with NEXT.

The test card in Step 15 **does not use the payment gateway**. It proves the pages and order flow work. It does **not** prove that real payments work.

For **each payment method** in the campaign (Step 7), confirm with NEXT that it is set up and approved:

- [ ] Credit card gateway connected and approved
- [ ] PayPal connected (if used)
- [ ] Apple Pay / Google Pay working on your domain (if used)

Do **not** pay with a real card to test, unless the store owner says yes and agrees to refund it.

**You should see:** NEXT confirms each method in writing.

---

## Step 15. Final check and test orders

**Who:** developer, with the store admin. Do this on the **final setup**: your domain, the real campaign, and the **offers switched on**.

### 15a. Before any test order: stop test orders reaching the warehouse

**Who:** store admin. **Name the person** who does this for the store, and write the name down.

Test orders use a test card, so **no money moves**. But they are **real order records**, and they can reach other systems. Before the first test order, check each one:

| System | Check before testing | Who |
|---|---|---|
| Warehouse / fulfillment | Test orders can create **fulfillment orders**. Agree how you stop them before they are picked (hold or cancel straight after each test), or tell the warehouse the test times. | Store admin |
| Shopify sync (if the store still syncs to Shopify) | Test orders may be copied to Shopify. Ask NEXT if the store uses it. | Store admin + NEXT |
| Customer emails | Order emails are sent to the test email address. Use an email address your team reads. | Developer |
| Other apps (CRM, reviews, accounting) | Ask NEXT which apps are connected, and whether they receive test orders. | Store admin + NEXT |

Do not start 15d until this table is complete.

### 15b. Set the final offers

1. Store admin: switch on the offers you will run (ask Codex to use `next-campaigns-create`, or in the dashboard).
2. After this, **do not change prices or offers** before go-live. If you change them, do Step 15 again.

If the campaign **already has live traffic**, switching an offer on changes the price for real shoppers straight away. Plan the time with the team leader first.

### 15c. Check prices and links (no orders needed)

On your domain, for **every quantity you advertise** (for example 1, 2 and 3):

- [ ] The price on the landing page is right
- [ ] The checkout total is right (product + shipping)
- [ ] Free shipping starts at the right amount
- [ ] Any discount code works
- [ ] The currency is right

Old Shopify addresses (Step 11): open each one **with** `?aleid=test` on the end, for example `https://offers.mystore.com/products/my-product?aleid=test`.

- [ ] The landing page opens
- [ ] `aleid=test` is still in the address bar when the page has loaded

### 15d. Place the test orders

Ask Codex to run the Campaigns OS QA test orders on your domain. Campaigns OS uses NEXT's test card and **blocks the test purchase from reaching AppLovin and other ad tools**. Do not place test orders by hand on the live domain: a hand test sends a fake purchase to your ad accounts.

Test **every path** in your funnel. For a funnel with 1 upsell and 1 downsell:

| Test | Path |
|---|---|
| 1 | Checkout, then **accept** the upsell |
| 2 | Checkout, **decline** the upsell, **accept** the downsell |
| 3 | Checkout, **decline** the upsell, **decline** the downsell |

You do **not** need 1 order for every price tier. Check the tiers in 15c. Order 1 tier on each path.

Test card (from https://developers.nextcommerce.com/docs/testing):

| Card number | Expiry | CVV |
|---|---|---|
| 6011 1111 1111 1117 | any future date | any |

The test card proves the **pages and order flow** work. It does **not** prove real payments. That is Step 14.

After each order, open the store dashboard **Orders**:

- [ ] The order is tagged **Test Order**
- [ ] The products, quantities and total are right
- [ ] The upsell or downsell is on the order when accepted, and not there when declined

If the card number and CVV boxes on checkout are **empty and you cannot type in them**, card payment is not ready. Stop and go back to Step 14.

### 15e. Check the AppLovin events

**Who:** developer. **Skip** if you do not use AppLovin.

Open the Campaigns OS QA results (Codex shows them) or use the **Axon Pixel Helper**. These are the **expected** `purchase` events for each path:

| Path | `purchase` events | Values |
|---|---|---|
| Checkout only (no upsell page) | 1 | The order |
| Checkout + upsell **accepted** | 2 | The order, then the upsell (id ends in `-US1`) |
| Upsell declined + downsell **accepted** | 2 | The order, then the downsell |
| Upsell declined + downsell declined | 1 | The order |
| **Reload** the thank-you page | **0 more** | Nothing new is sent |

- [ ] The number of `purchase` events matches the table
- [ ] Each value matches the order (or the upsell) in the dashboard. If not, stop and tell NEXT.
- [ ] `page_view`, `view_item`, `add_to_cart`, `begin_checkout` each fire **once** per page

This is why AppLovin shows **more purchases than orders** when upsells are accepted (Step 12). Tell your media buyer.

### 15f. Clean up the test orders

**Who:** the person named in 15a.

1. Straight after testing: check **Fulfillment**, and stop any fulfillment for the test orders, as agreed in 15a.
2. Filter **Orders** by **Test Orders** and delete them.
3. Deleting an order does **not** undo what was already sent to a warehouse or another app. If a test order reached one, tell them it is a test.

Write down what you tested, the order numbers, and anything that did not pass. This is your **QA evidence** for the team leader and the admin tracker.

---

## Step 16. Go live

**Who:** team leader. Nothing goes live without the team leader's yes.

1. Check Steps 13, 14 and 15 are done and passed, with the QA evidence from 15f.
2. Store admin: change the live domain in **Campaigns > Settings > Allowed Domains** to **Production**.
3. If the domain is your storefront domain: NEXT adds the storefront redirects (Part F).
4. Team leader writes "approved to go live" in the team chat, with the date, and updates the admin tracker.
5. Point your ads to the live address.
6. In the first hour, check: new orders arrive, order totals are right, and AppLovin shows the purchase events from the 15e table (1 per order, plus 1 per accepted upsell or downsell).

### Go-live checklist

- [ ] Every developer has their own GitHub account with 2FA
- [ ] Store repo in the Yonderminds organization (private)
- [ ] `AGENTS.md` points to the Campaigns OS instructions
- [ ] No `.env` and no Admin API key in GitHub
- [ ] Campaign created and every price approved
- [ ] Campaign settings checked: currency, shipping, payment methods
- [ ] Old Shopify URLs work with `?aleid=test` (Step 11, and Part F if needed)
- [ ] AppLovin Event Key added
- [ ] Pages online on Cloudflare Pages, on your own domain, with HTTPS
- [ ] Subdomain home address redirects to the main site (`_redirects`, Step 13c)
- [ ] Every payment method confirmed by NEXT (Step 14)
- [ ] Warehouse, Shopify sync, emails and apps checked before testing (15a)
- [ ] Final offers on, prices checked for every tier
- [ ] Test orders on every path, AppLovin events match the table, test orders cleaned up
- [ ] Live domain changed to Production
- [ ] Team leader approved, admin tracker updated
- [ ] Ads point to the live address

---

## Part D. After go-live: making changes, and recovery

### How a change is published

1. Developer makes a **branch**, makes the change with Codex, and checks it with `npm run dev`.
2. Developer opens a **pull request**. Cloudflare adds a **preview** link to it (Step 13d).
3. **Team leader** looks at the preview and approves the pull request.
4. **Team rule:** nobody merges their own pull request. The **team leader** merges it. (GitHub can only enforce this on private repos with a paid GitHub plan, so the team keeps this rule by agreement.)
5. Merging into `main` **publishes** the change. Cloudflare takes about 1 to 2 minutes.
6. Developer checks the page **on your domain** (not only on their computer or the preview) and tells the team leader it is done.

Price and offer changes are **not** in the code. They are store settings. Use `next-campaigns-create`, approve its plan, **save the plan**, then do Step 15c again.

### If something breaks

**Who owns recovery:** the team leader.

1. **Checkout broken or prices wrong?** Pause the ads first. Then fix.
2. **Page code problem, fastest fix:** in Cloudflare, open the Pages project, **Deployments**, find the last good deployment, and choose **Rollback**. The old version is back in seconds.
3. Then fix the code: on GitHub, open the pull request that caused the problem and click **Revert**. The team leader merges the revert, so `main` matches what is online.
4. **Price or offer problem:** rolling back code does **not** change store settings. Ask Codex to use `next-campaigns-create` to put back the old values from the saved plan (Step 6). Check prices again (Step 15c).
5. Turn the ads back on only when the team leader says the page is right.
6. Tell NEXT if the problem was on the platform.

---

## Part E. New campaign or new store

**New campaign for a store that already has a repo:**

- Reuse: the repo, Steps 1 to 5, the Cloudflare Pages project and domain (Step 13), the Allowed Domains.
- Do again: Steps 6, 7, 9, 10, 11, 12, 15 and 16 for the new campaign. It goes in a new folder in `src/`.

**New store:** start again at Step 2 with a new repo.

---

## Part F. Storefront: redirects for old Shopify URLs

**Who:** NEXT or the store admin. This is for the **storefront** (Part B). Campaigns use Step 11.

Storefront page addresses are fixed. Old Shopify addresses must redirect. Dashboard: **Settings > Redirects**. Add 1 rule at a time.

For **every** rule that an ad can reach:

1. Tick **Match using regular expressions**. Without it, ad clicks (which carry `?aleid=...`) land on a "not found" page.
2. Fill in:

| Old Shopify address | Redirect From | Redirect To |
|---|---|---|
| `/products/my-product` | `^/products/my-product/?(?=$\|\?)` | the new page, for example `/my-product/` |
| `/collections/any/products/my-product` | `^/collections/[^/?]+/products/my-product/?(?=$\|\?)` | the same new page |
| Old address that should go to a **campaign** | the same patterns | the full campaign address, for example `https://offers.mystore.com/products/my-product/` |

Type the From field **without** the `\` before `|`. Example: `^/products/my-product/?(?=$|\?)`

3. **Redirect To** must have **no** `?` and **no** `#`. Otherwise the ad click data breaks.
4. Wait 1 minute (rules are cached), then test the old address **with** `?aleid=test` on the end. It must arrive at the new page with `?aleid=test` still there.

---

## Part G. Storefront: AppLovin app

**Who:** NEXT with the store admin. This is for the **storefront** only. It does **not** track campaign orders (campaigns use Step 12).

1. Install the **AppLovin Axon** app on the store (Dashboard > Apps). If you cannot find it, ask NEXT.
2. Enter the store's **Event Key** (AppLovin Ads Manager > Account > API keys).
3. Settings: **Send Customer Email and Phone: off**. **Skip Test Orders: on**. Then switch **Enable** on.
4. NEXT checks the storefront theme supports the app.
5. Check with the **Axon Pixel Helper** on the storefront: `page_view`, `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout` and `purchase` each fire **once**, and `purchase` has the right value, currency and order number.
6. Do not also add AppLovin with Google Tag Manager.
7. EU or UK stores: ask NEXT before switching it on (consent rules).

---

## Part H. Storefront: build or change the store theme

**Who:** developer, with the store admin. This is for the **storefront** (Part B). It does not change campaigns.

The storefront look comes from a **theme**. NEXT's recommended theme is **Spark** (built with Tailwind CSS). You change a theme on your computer and send it to the store with **Theme Kit** (the `ntk` command). Codex does the work with the 3 **theme skills**:

| Skill | Use it when |
|---|---|
| `next-theme-figma` | You have a **Figma** design for the store |
| `next-theme-design` | You want to copy a **live website** (for example your old Shopify page) |
| `next-theme-dev` | Codex builds or changes the theme. Always the last step. |

`next-theme-figma` or `next-theme-design` makes a **handoff package** (a full description of the design). Then `next-theme-dev` builds it.

### H1. Install the tools (1 time on each computer)

1. Python **3.10 or newer**: `python3 --version`
2. Theme Kit, in a Python virtual environment:

```bash
python3 -m venv ~/.venvs/ntk
source ~/.venvs/ntk/bin/activate
pip install next-theme-kit
ntk --help
```

3. The theme skills come with the NEXT skills from Step 4a (`npx skills add NextCommerceCo/skills -g -a codex`). If you skipped Step 4a, run it now, then close and open Codex.

**You should see:** `ntk --help` prints the list of commands.

### H2. Make a Theme Kit key

**Who:** store admin.

1. Store dashboard: **Settings > API Access > Create App**.
2. Give it a name (for example "Theme Kit"), and choose the user.
3. **Permissions** tab: tick **themes:read** and **themes:write**. Nothing else.
4. Click **Save** and copy the key.

This key is different from the Admin API key in Step 5. Keep it private in the same way.

### H3. Make the theme repo

**Who:** org owner, then developer.

1. Create a repo named `<store>-theme` in Yonderminds (same way as Step 2).
2. Developer: clone it and open the folder.
3. Make a `.gitignore` file **first**, with these lines. `config.yml` holds the Theme Kit key. Never commit it, even in a private repo.

```
config.yml
node_modules/
.env
```

4. Commit and push the `.gitignore`.

### H4. Get a theme to work on

**Never work on the live theme directly.** Always work on a **copy** that shoppers do not see.

Choose 1:

- **Change the store's current theme.** In the store dashboard, duplicate the live theme first, so you have a copy to work on. Then:

```bash
ntk list --apikey <theme-kit-key> --store https://<store>.29next.store
ntk checkout --theme_id <id-of-the-copy> --apikey <theme-kit-key> --store https://<store>.29next.store
```

- **Start a new theme from Spark.** Copy the Spark files from https://github.com/NextCommerceCo/spark into the repo folder, then register it as a new theme on the store:

```bash
ntk init --name "<store> theme" --apikey <theme-kit-key> --store https://<store>.29next.store
```

  `ntk init` makes an **empty** theme on the store. The files go up with `ntk push` in H5 (Codex asks you first). Spark also has its own setup step for its styles: ask Codex to follow Spark's README.

Both commands write `config.yml` with the key. Check `git status` does **not** show `config.yml`.

Type the key in **your own terminal**, not in the Codex chat.

### H5. Build the design with Codex

Open Codex in the theme repo folder. Example requests:

```
Use next-theme-design to record the design of https://old-shopify-store.com/products/my-product.
Then use next-theme-dev to build the product page in this theme.
```

```
Use next-theme-figma with this Figma file: <link>. Then use next-theme-dev to build it.
```

Codex tells you which theme it will change (store, theme ID, live or not live) and **waits for your yes** before it uploads (`ntk push` or `ntk watch`).

### H6. Check the preview

Open the preview of the **copy** on the store's own address (`https://<store>.29next.store`), not your public domain. Check on a computer and a phone:

- [ ] Home page, a collection, a product page, the cart and checkout look right
- [ ] Add to cart and checkout work
- [ ] Nothing is broken on a phone

Commit and push the theme files to GitHub, using a pull request (Part D).

### H7. Make it live

**Who:** team leader approves, store admin publishes.

1. Keep the **old live theme** in the store. It is how you go back if something is wrong.
2. In the store dashboard, publish the new theme.
3. Check the live storefront: home, product, cart, checkout, and the AppLovin events (Part G).
4. **If something is wrong:** publish the old theme again, then fix the copy.

More information: https://developers.nextcommerce.com/docs/storefront/themes and https://developers.nextcommerce.com/docs/storefront/themes/theme-kit

---

## Part I. Where to get templates

### Storefront themes

| Template | What it is | Where |
|---|---|---|
| Spark | NEXT's recommended storefront theme (Tailwind CSS) | https://github.com/NextCommerceCo/spark |
| Intro Bootstrap | An older theme, based on Bootstrap | https://github.com/NextCommerceCo/intro-bootstrap |
| Your store's current theme | The theme NEXT already set up for your store | Download it with `ntk checkout` (Part H) |

### Campaign templates (landing, checkout, upsell, downsell, thank-you)

Each campaign **template family** is a full funnel: landing or presell pages, a **checkout**, **upsell** and downsell pages, and a **receipt** (thank-you) page. Campaigns OS and Page Kit download them for you (Step 10). You do not copy them by hand.

| Where | What you find |
|---|---|
| https://campaigns.nextcommerce.com/templates/ | Preview each template family and see its pages. **apollo** is the recommended one. Others include **olympus**, **olympus-mv-single-step** (products with variants, like size or colour) and **shop-three-step** (checkout in 3 steps). |
| https://campaigns.nextcommerce.com/patterns/ | Ready parts you can add to a page, for example **bundle selectors** (Buy 1 / Buy 2 / Buy 3 cards) |
| https://github.com/NextCommerceCo/campaign-cart-starter-templates | The template code itself, and `templates.json`, the list of all template families |
| https://github.com/Yonderminds/demo-fresh-campaign | The apollo template as you get it: 9 pages, including **5 upsell styles** (bundle stepper, tier cards, tier pills, single product, video) |
| https://github.com/Yonderminds/demo-configured-campaign | A finished funnel: landing page, checkout, upsell, downsell, receipt |

You choose the template for each page in the **Map** (Step 9). Codex uses that choice when it builds (Step 10).

---

## Appendix 1. Other hosting services

Yonderminds uses **Cloudflare Pages** (Step 13). Other static hosts can also serve the `_site` folder, but their settings are **not the same**: redirects (`_redirects` is a Cloudflare and Netlify format), custom domains, preview addresses and plan limits differ. Check the host's own documentation, and ask NEXT before you use one.

| Host | Notes |
|---|---|
| GitHub Pages | **Do not use for campaigns.** GitHub's rules do not allow it for sites mainly used to sell things. Keep GitHub for code and pull requests. |
| Netlify | Connect the repo. Build command `npm run build`, publish folder `_site`. Reads `_redirects`. |
| Vercel | Connect the repo. Framework: Other. |
| Render | Static Site, publish path `_site`. |
| Others | Firebase Hosting, AWS Amplify, AWS S3 + CloudFront, Azure Static Web Apps, DigitalOcean App Platform, GitLab Pages, Surge. |

Whichever host you use: add its domain to **Allowed Domains** (Step 8), and do Steps 14 to 16 on it.

---

## Help

- Campaigns docs: https://developers.nextcommerce.com/docs/campaigns
- NEXT skills: https://developers.nextcommerce.com/docs/skills
- Campaigns OS: https://campaigns.nextcommerce.com/ and https://campaigns.nextcommerce.com/start/
- Testing: https://developers.nextcommerce.com/docs/testing
- Campaign templates: https://campaigns.nextcommerce.com/templates/
- Storefront themes: https://developers.nextcommerce.com/docs/storefront/themes
- Theme Kit (`ntk`): https://developers.nextcommerce.com/docs/storefront/themes/theme-kit
- Spark theme: https://github.com/NextCommerceCo/spark
- Theme skills: https://github.com/NextCommerceCo/skills (next-theme-figma, next-theme-design, next-theme-dev)
- Something not working: contact your NEXT team. Send the store name, the page address, and a screenshot.

*Checked against Campaign Page Kit 0.3.0 and Campaigns OS 1.71.2 on 17 November 2026. Hosting changed to Cloudflare Pages on 18 November 2026.*
