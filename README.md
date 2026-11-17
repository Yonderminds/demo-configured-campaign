# Coerneuineo: Campaign Repo (CPK)

Campaign repo for the **Coerneuineo** store, built on the Campaign Page Kit (CPK) and the Campaign Cart SDK. It is the worked example for Yonderminds campaign repos: 1 repo per store, 1 folder per product line, 1 `src/<slug>/` folder per campaign.

Agent instructions are in `CLAUDE.md`. `AGENTS.md` links to it, so Codex and Claude Code follow the same rules.

## Campaigns

| Slug | Pages | Status |
|------|-------|--------|
| `christmas-diamond-painting-light-wreath` | landing, checkout, upsell, downsell, receipt | Built; moves to GitHub Pages next |

## Build

```bash
cd christmas-diamond-painting
npm install
npm run dev              # dev server with campaign picker
npm run build            # build just this project, for local checking
npm run config           # set API key interactively
npm run compress         # compress all images in a campaign
npm run compress:preview # preview compression savings without modifying files
```

The full build runs from the repo root: `node scripts/smoke-check.js && node scripts/build.js`. `build.js` finds every top-level folder holding both `package.json` and `src/`, builds each, and merges the results into one root `_site/`, which is what gets published.

## Adding a new campaign

A new campaign in this project is a new `src/<slug>/` folder, and the folder name is the URL path, so slugs must be unique across the whole repo. `npm run clone` duplicates a campaign that already exists in `src/` to a new slug. It cannot create the first one.

For a project's first campaign, inside the project folder:

1. `npm install`
2. `npm run setup -- --slug <slug>` (an alias for `campaign-init`). It shows a picker of starter templates from `NextCommerceCo/campaign-cart-starter-templates`, downloads the chosen template into `src/<slug>/`, adds the entry to `_data/campaigns.json`, and can write the API key to `src/<slug>/assets/config.js`. Keep `--slug`: without it the folder name, and so the URL path, defaults to the template name.
3. Check that the new entry in `_data/campaigns.json` carries a pinned `sdk_version`. The lookup is best effort, so copy it from the upstream registry if it is missing.

Do not pass `--ai-context claude`; it overwrites the project's `CLAUDE.md`.

A separate product line is a new top-level project folder alongside `christmas-diamond-painting/`: copy `package.json`, `CLAUDE.md`, `AGENTS.md`, and an empty `_data/campaigns.json` (not `src/`, so no slug is duplicated), run `npm install`, then add its first campaign the same way. The root build picks it up with no other change.

## Structure

```
coerneuineo-cpk/
├── scripts/
│   ├── smoke-check.js       # Pre-deploy validator
│   └── build.js             # Root build: discovers and merges every project
├── christmas-diamond-painting/
│   ├── _data/
│   │   └── campaigns.json   # Campaign registry: sdk_version, store fields, analytics IDs
│   ├── src/
│   │   └── christmas-diamond-painting-light-wreath/  # Campaign source
│   ├── CLAUDE.md            # SDK + template rules for campaigns in this project
│   ├── AGENTS.md            # Link to CLAUDE.md, for Codex
│   └── package.json         # Build scripts (next-campaign-page-kit)
├── netlify.toml              # Rules from the previous host; see "Hosting" in CLAUDE.md
├── CLAUDE.md                 # Repo-level agent instructions
├── AGENTS.md                 # Link to CLAUDE.md, for Codex
└── .gitignore
```

## References

- [Campaign Cart SDK docs](https://cart-sdk.nextcommerce.com/latest/). For the docs matching this repo's pin, use `https://cart-sdk.nextcommerce.com/v<sdk_version>/` with the `sdk_version` in `christmas-diamond-painting/_data/campaigns.json`
- [Starter templates](https://github.com/NextCommerceCo/campaign-cart-starter-templates)
- [Page Kit on npm](https://www.npmjs.com/package/next-campaign-page-kit)
- SDK + template rules for this repo: `christmas-diamond-painting/CLAUDE.md`
