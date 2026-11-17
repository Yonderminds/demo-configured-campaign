# Go-live guide: campaigns on NEXT

This guide takes you from nothing to a live campaign. Do the steps in order. Each step says **who** does it and **what you should see** when it worked.

You will use these tools:

- **GitHub** to keep the campaign code
- **Codex** (your AI coding tool) to do most of the work
- **Campaign Page Kit** to build the pages
- **next-campaigns-create** (a NEXT skill) to create the campaign in your store
- **Campaigns OS** and the **Map** to plan and build the whole funnel
- **A hosting service** to put the pages on the internet

If a step does not work, stop and ask NEXT. Do not guess.

---

## Words in this guide

| Word | Meaning |
|---|---|
| Store | Your NEXT store. You log in to its dashboard. |
| Campaign | One sales funnel in the Campaigns App: its products, prices, shipping and offers. |
| Package | One product (or variant) a shopper can buy in the campaign. Each package has a number (ID). |
| Offer | A discount, for example "Buy 2, get 10% off". |
| Funnel | The pages in order: landing page, checkout, upsell, downsell, thank-you page. |
| Repo | A GitHub repository. One folder of code, saved in GitHub. |
| Campaign API key | A **public** key. It goes in the page code. It tells the pages which campaign to use. |
| Admin API key | A **private** key. It can change your store. **Never** put it in the code, in GitHub, or in a chat. |
| Domain | A web address, for example `offers.mystore.com`. |
| Map | A plan of the funnel, made in the Campaigns OS Workspace. |

---

## Overview

| Step | What | Who |
|---|---|---|
| 1 | Accounts and tools | Every developer |
| 2 | Create the GitHub repo and invite the team | Organization owner |
| 3 | Install Campaign Page Kit and Campaigns OS | Developer |
| 4 | Install the NEXT skills for Codex | Developer |
| 5 | Make an Admin API key | Store admin |
| 6 | Create the campaign with next-campaigns-create | Developer + store admin |
| 7 | Check the campaign settings | Store admin |
| 8 | Add your domains to the Campaigns App | Store admin |
| 9 | Build the Map | Developer |
| 10 | Build the campaign with Campaigns OS | Developer |
| 11 | Test the campaign | Developer |
| 12 | Put the pages online (hosting) | Developer |
| 13 | Go live | Team leader |

---

## Step 1. Accounts and tools

**Who:** every developer, 1 time only.

1. Make your **own** GitHub account at https://github.com/signup. One account per person. Do not share accounts.
2. Turn on two-factor authentication (2FA) in GitHub: **Settings > Password and authentication**. The Yonderminds organization requires it.
3. Open the email invite to the **Yonderminds** organization and click **Join**.
4. Install these programs on your computer:

| Program | Version | Check it works |
|---|---|---|
| Git | any recent | `git --version` |
| Node.js | 20.19 or newer | `node --version` |
| npm | 10 or 11 (comes with Node.js) | `npm --version` |
| Python | 3.9 or newer | `python3 --version` |
| Codex | latest | `codex --version` |

On Windows, use WSL (Windows Subsystem for Linux) for all commands in this guide.

**You should see:** each check command prints a version number.

---

## Step 2. Create the GitHub repo and invite the team

**Who:** an organization **owner** (a director, or NEXT). Team members cannot create repos in the Yonderminds organization. Do this once for each store.

Use **1 repo for each store**. Name it `<store>-cpk`. Example: the store `mystore` has the repo `mystore-cpk`.

1. Go to https://github.com/organizations/Yonderminds/repositories/new
2. **Owner:** Yonderminds. **Repository name:** `<store>-cpk`.
3. **Visibility:** choose **Public** if you will host on GitHub Pages (the free GitHub plan can only host public repos). Choose **Private** if you will host somewhere else (see Step 12).
4. Tick **Add a README file**. Click **Create repository**.
5. Invite your team: in the repo, open **Settings > Collaborators and teams > Add teams**. Choose your team. Give it the **Write** role.
6. Each developer copies the repo to their computer:

```bash
git clone https://github.com/Yonderminds/<store>-cpk.git
cd <store>-cpk
```

**You should see:** a folder named `<store>-cpk` on your computer with a `README.md` file in it.

**2 demo repos** show you the start and the end. Look at them when you are not sure what a file should look like:

| Repo | What it shows |
|---|---|
| https://github.com/Yonderminds/demo-fresh-campaign | How your repo looks **after Step 3** (fresh install, nothing set up yet) |
| https://github.com/Yonderminds/demo-configured-campaign | How your repo looks **after Step 13** (configured for a store, tested, online) |

---

## Step 3. Install Campaign Page Kit and Campaigns OS

**Who:** developer. Run these commands **inside** the repo folder.

Open https://campaigns.nextcommerce.com/start/ first. It shows the **current** version numbers. Use those numbers if they are newer than the ones below.

```bash
npm init -y && npm install --save-exact next-campaign-page-kit@0.3.0
npm install --save-dev --save-exact @nextcommerce/campaigns-os@1.71.2
npx --no-install campaigns-os install-skills --platform codex
npx --no-install campaigns-os install-agent-context --target .
npx --no-install campaigns-os qa install-browser
```

What these do:

1. Install **Campaign Page Kit** (builds the pages).
2. Install **Campaigns OS** (plans, builds and checks the campaign).
3. Install the Campaigns OS skills into **Codex**.
4. Add instruction files for Codex to the repo.
5. Install a test browser, used for checking pages and placing test orders.

Then make a file named `.gitignore` in the repo folder with these lines. It stops private and temporary files going to GitHub:

```
node_modules/
_site/
.env
.env.*
qa-output/
```

Save your work to GitHub:

```bash
git add -A
git commit -m "Install Campaign Page Kit and Campaigns OS"
git push
```

**You should see:** `node_modules/`, `package.json` and `package-lock.json` in the folder, and no errors.

---

## Step 4. Install the NEXT skills for Codex

**Who:** developer, 1 time only.

```bash
npx skills add NextCommerceCo/skills -g -a codex
```

Then **close Codex and open it again**. Codex only loads new skills when it starts.

**You should see:** Codex lists `next-campaigns-create` and `next-campaigns-setup` when you ask "Which NEXT skills do you have?"

More information: https://developers.nextcommerce.com/docs/skills

---

## Step 5. Make an Admin API key

**Who:** store admin.

The `next-campaigns-create` skill needs this key to create the campaign in your store.

1. In your store dashboard, open **Settings > API Access**.
2. Create a new key. Give it **exactly these 7 permissions**:
   - read store settings
   - read campaigns
   - write campaigns
   - read catalogue (products)
   - read gateways
   - read metadata
   - write metadata
3. Copy the key.

**Where the key goes:** Codex will make a private file named `.env` in the repo folder. Open that file in a normal text editor and paste the key on the line Codex shows you. The line looks like this (store `my-store` becomes `MY_STORE`):

```
MY_STORE_NEXT_ADMIN_API_TOKEN=paste-the-key-here
```

**Rules for this key:**

- Never paste it into Codex or any chat.
- Never commit `.env` to GitHub. The `.gitignore` from Step 3 stops this.
- If the key is ever shared by mistake, delete it in **Settings > API Access** and make a new one.

---

## Step 6. Create the campaign with next-campaigns-create

**Who:** developer, with the store admin for the prices.

Before you start, decide these things. Codex will ask you, and it never guesses them:

- Which product(s) to sell
- The price for each quantity (for example: 1 for $29.99, 2 for $49.99, 3 for $64.99)
- The discounts (offers)
- Shipping methods and shipping price
- Currency (for example USD)

Open Codex in the repo folder and type a request in plain words. Example:

```
Use the next-campaigns-create skill. Create a campaign for store my-store.
Product: Christmas Light Wreath.
Buy 1 for $29.99, Buy 2 for $49.99, Buy 3 for $64.99.
Standard shipping $5.99, free over $45.
Currency USD.
```

What happens:

1. Codex reads your store: products, payment gateways, shipping methods.
2. Codex shows you a **plan**: every package, price and offer.
3. **Check every price.** If something is wrong, tell Codex what to change.
4. When the plan is right, approve it. Codex creates the campaign.
5. Codex gives you the **Campaign API key** and the **package IDs**. Keep these. The pages need them.

Tip: you can ask Codex to create the offers **switched off**. Then nothing is discounted until you switch them on.

**You should see:** the new campaign in your store dashboard under **Campaigns**.

---

## Step 7. Check the campaign settings

**Who:** store admin.

In the dashboard, open **Campaigns**, click your campaign, then open the **Settings** tab. Check:

| Setting | What to check |
|---|---|
| Name | Clear, so your team can find it |
| Currency | Correct. **It cannot be changed later.** |
| Additional currencies | Only if you sell in more than 1 currency |
| Shipping | The right shipping methods and prices |
| Payment gateway group | The gateway that takes card payments for this store |
| Payment methods | For example Credit Card, PayPal, Apple Pay |
| Express payment methods | The buttons shown at the top of checkout, for example PayPal and Apple Pay |
| PayPal account | Only if this campaign uses a different PayPal account from the store |

To see the **Campaign API key** again: click **Developer** at the top of the campaign page. The key is in the **Campaigns API** box.

---

## Step 8. Add your domains to the Campaigns App

**Who:** store admin.

The pages can only load products and checkout on web addresses that you add here. **If a domain is not on this list, the checkout does not work.**

1. In the dashboard, open **Campaigns > Settings**.
2. Under **Allowed Domains**, click **Add Domain**.
3. Type the domain only, with no `https://` and no path. Example: `offers.mystore.com`.
4. Choose the **Environment**:

| Environment | Use it for | Analytics |
|---|---|---|
| Development | Test addresses (your preview or test site) | NEXT analytics ignores visits and orders. Ad pixels still fire. |
| Production | Your live address that shoppers and ads use | NEXT analytics records everything |

5. Click **Save**.

Notes:

- This list is for **all campaigns** in the store, not one campaign.
- `localhost` (your own computer) already works for testing.
- Add your **test** address as Development now. Add your **live** address as Production in Step 13.

---

## Step 9. Build the Map

**Who:** developer.

The Map is the plan of your funnel: which pages, in which order, and which offer is on each page.

1. In the dashboard, open **Campaigns**, click your campaign, click **Developer**, then click **Go to Map**. The Map opens with your store and campaign already filled in, and shows your packages, offers and shipping.
   (The Workspace address is https://campaign-map.nextcommerce.com if you need to open it directly. Then connect it with the **Campaign API key** from Step 6.)
2. Check that the packages and prices are the ones you approved in Step 6.
3. Add the pages in order. A common funnel is:
   **Landing page > Checkout > Upsell > Downsell > Thank-you page**
4. For each page, choose a **template** and the **offer** it shows. See the templates at https://campaigns.nextcommerce.com/templates/
5. **Save** the Map.
6. Open **Handoff** and click **Copy start prompt**. This prompt includes your **Map ID**. You need it in Step 10.

If you cannot open the Workspace, ask NEXT for access.

---

## Step 10. Build the campaign with Campaigns OS

**Who:** developer.

1. In the repo folder, make a folder named `source`. Put your page designs in it (HTML files and their images). If you use the templates as they are, leave `source` empty.
2. Open Codex in the repo folder.
3. Paste the **start prompt** you copied from the Map in Step 9.
   If you do not have it, paste this instead:

```
Set up a NEXT campaign build in this folder.
Follow https://campaigns.nextcommerce.com/llms.txt and ask me for anything you need.
```

4. Codex now builds the campaign. It sets up the campaign folder with Campaign Page Kit (`npx campaign-init`), adds the Campaign API key, and runs Campaigns OS commands such as:

```bash
npx --no-install campaigns-os start --map-id <map-id> --target . --source ./source --template-family <family>
npx --no-install campaigns-os next --packet ./campaign-runtime.build.json
```

   You do not need to type these yourself. Let Codex run them, and answer its questions.

5. Codex asks you questions on the way, for example your store name, support email and policy page links. Answer them.
6. Look at the pages on your computer:

```bash
npm run dev
```

Open the address it prints (it starts with `http://localhost`). Click through every page.

7. When the pages look right, save to GitHub:

```bash
git add -A
git commit -m "Build the <campaign name> campaign"
git push
```

**You should see:** every page of the funnel on `localhost`, with your products and prices.

---

## Step 11. Test the campaign

**Who:** developer.

Ask Codex to run the Campaigns OS checks and **1 test order**. Codex uses this test card:

| Card number | Expiry | CVV |
|---|---|---|
| 6011 1111 1111 1117 | any date in the future | any |

Important:

- A test card takes **no money**, but it makes a **real order** in your store's **Orders** list. Tell your team. Make sure your warehouse does **not** ship test orders. Cancel them after the test.
- Test the full path: landing page > checkout > upsell **accept**, and a second time with upsell **decline**.
- If the card number box and CVV box on the checkout are **empty and you cannot type in them**, the store's card payment is not ready. Stop and ask NEXT.

More information: https://developers.nextcommerce.com/docs/testing

**You should see:** the thank-you page, and the test order in **Orders** with the right products and prices.

---

## Step 12. Put the pages online (hosting)

**Who:** developer.

The build makes normal web files (HTML, CSS, images) in a folder named `_site`. **Any** static hosting service can host them. Every host needs the same 2 settings:

- **Build command:** `npm run build`
- **Output (publish) folder:** `_site`

### Hosting services you can use

| Host | Free plan | Notes |
|---|---|---|
| GitHub Pages | Yes | Repo must be **public** on the free plan. Set it up with the workflow below. |
| Cloudflare Pages | Yes | Connect the GitHub repo. Framework preset: **None**. Fast in many countries. |
| Netlify | Yes | Connect the GitHub repo. It finds the settings itself. |
| Vercel | Yes | Connect the GitHub repo. Framework: **Other**. |
| Render | Yes | Create a **Static Site**. Publish path `_site`. |
| Firebase Hosting | Yes | Uses the `firebase` command line tool. |
| AWS Amplify Hosting | Free tier | Connect the GitHub repo. |
| AWS S3 + CloudFront | Pay as you use | More setup. For teams that already use AWS. |
| Azure Static Web Apps | Yes | Connect the GitHub repo. |
| DigitalOcean App Platform | Yes (static sites) | Create a **Static Site** component. |
| GitLab Pages | Yes | Only if your code is in GitLab. |
| Surge | Yes | Upload from the command line. For quick tests. |

All of them work. Choose **one** host for your team and use it for every store. If you are not sure, use **Cloudflare Pages** or **GitHub Pages**.

### Use your own domain

Always use **your own domain** (for example `offers.mystore.com`). The pages use addresses that start with `/`, so they only work at the top of a domain. The free addresses like `yonderminds.github.io/<repo>/` need extra setup. The demo-configured-campaign repo shows that setup (`scripts/pages-routes.js`) if you need it.

To use your own domain:

1. In your host, add the custom domain. The host tells you which DNS record to add (usually a **CNAME** record).
2. Add that record where your domain's DNS is managed.
3. Wait until the host says the domain is ready and HTTPS is on.
4. Add the domain in **Campaigns > Settings > Allowed Domains** (Step 8).

### GitHub Pages setup

1. In the repo, make the file `.github/workflows/pages.yml` with this content:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

2. In the repo, open **Settings > Pages**. Under **Source**, choose **GitHub Actions**.
3. On the same page, under **Custom domain**, type your domain and click **Save**. Tick **Enforce HTTPS** when it is available.
4. Commit and push. Open the **Actions** tab to watch it. A green tick means the pages are online.

Every time you push to `main`, the pages update by themselves.

---

## Step 13. Go live

**Who:** team leader.

1. Add your **live** domain in **Campaigns > Settings > Allowed Domains** as **Production**.
2. Open the live address. Click through every page.
3. Place **1 test order** on the live address (Step 11 rules). Check it in **Orders**. Cancel it.
4. Check your ad pixels and analytics see the visit and the purchase.
5. Switch on the offers if you created them switched off.
6. Point your ads to the live landing page address.

### Go-live checklist

- [ ] Every developer has their own GitHub account with 2FA
- [ ] The repo is in the Yonderminds organization and the team has Write access
- [ ] `.env` and the Admin API key are **not** in GitHub
- [ ] The campaign exists and every price was checked
- [ ] Campaign settings checked: currency, shipping, payment methods
- [ ] Test domain added as Development, live domain added as Production
- [ ] Map saved, campaign built, every page checked on `localhost`
- [ ] Test orders placed (upsell accept and decline), checked, and cancelled
- [ ] Pages online on your own domain with HTTPS
- [ ] Ads point to the live address

---

## Changing a live campaign

- **Page changes** (text, images, layout): ask Codex, check with `npm run dev`, then commit and push. The host updates the pages.
- **Price or offer changes:** ask Codex to use `next-campaigns-create` again. It shows what will change before it changes anything.
- **New campaign for the same store:** add it to the same repo. Repeat Steps 6 to 11.
- **New store:** make a new repo. Start again at Step 2.

## Help

- Campaigns docs: https://developers.nextcommerce.com/docs/campaigns
- NEXT skills: https://developers.nextcommerce.com/docs/skills
- Campaigns OS: https://campaigns.nextcommerce.com/
- Testing: https://developers.nextcommerce.com/docs/testing
- Something not working: contact your NEXT team. Send the store name, the page address, and a screenshot.
