# Batch Resize — Creative Export Dashboard

Upload one master creative and generate every required **social, display,
and print** ad size in a single pass — cropped, compressed under a weight
cap where the network requires it, and named to spec. Everything runs
client-side in the browser (canvas resize + compression + ZIP packaging),
so there's no backend, no upload to a server, and no per-run cost.

## What it does

1. **Upload** a master creative (PNG / JPEG / WebP, highest resolution you have).
2. **Pick sizes** — grouped by category, all selected by default:
   - **Social**: Instagram (Feed Square/Portrait, Story-Reel), Facebook
     (Feed, Story), X Post, LinkedIn Post, Pinterest Pin.
   - **Display — Google Display Network** (exact required set):
     `160x600`, `300x600`, `336x280`, `320x50`, `320x100`, `250x250`,
     `200x200`, `970x90`, `728x90`, `468x60`.
   - **Print**: US Letter, A4, A5 Flyer, Business Card, Poster 18×24 — all
     at print DPI, exported at full resolution (no weight cap).
3. **Generate** — each size is center-cropped ("cover" fit) to its exact
   pixel dimensions, then, for every social/display size, JPEG quality is
   binary-searched until the file lands **under 50KB** (the cap requested
   for ad-network delivery). Print sizes are exported at high quality with
   no cap, since print assets are inherently large.
4. **Review** — a stats row (assets generated, how many are under the 50KB
   cap, average/total weight) plus a per-category table with a thumbnail,
   resolved file name, pixel size, weight vs. cap, and pass/fail badge.
5. **Download** — grab any single file, or **Download all as ZIP**, which
   bundles everything into `category/platform/...` folders plus a
   `manifest.csv` (file name, category, platform, placement, dimensions,
   weight, cap, pass/fail) for QA and traffickers.

## File naming convention

```
{BaseName}_{Platform}_{Placement}_{Width}x{Height}_{FileSizeKB}KB.{ext}
```

Example: `acme-summer-sale_Google-Display_Half-Page_300x600_22KB.jpg`

The actual output weight is baked into the file name (per the "naming as
per file size" requirement) so QA can confirm the 50KB cap was met without
opening each asset, and so re-runs never collide on disk.

## Tech

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS**
- All image work happens in the browser via the Canvas API — no server,
  no API routes, no image upload anywhere. `jszip` bundles the results.
- Fully static-renderable, so it deploys on Vercel's free tier with zero
  configuration.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy — GitHub + Vercel

The repo is already wired for zero-config Vercel deployment (Next.js is
auto-detected, no environment variables required). To connect it:

1. Push this branch to GitHub (already done if you're reading this from
   the repo) and merge it into your default branch, or point Vercel at
   this branch directly.
2. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
3. **Import** this repository (`unatti-rox/batchresize`).
4. Vercel auto-detects the **Next.js** framework preset — leave build
   command (`next build`) and output settings as default.
5. Click **Deploy**. Every future push to the connected branch redeploys
   automatically; pull requests get their own preview URL.

No secrets or environment variables are needed — the whole pipeline runs
client-side in the visitor's browser.

## Adjusting the size library

All presets live in `lib/sizes.ts` as a flat, typed list (`SIZE_LIBRARY`).
Add, remove, or edit an entry — including its weight cap (`maxKB`) — and
it shows up in the dashboard automatically, grouped by its `category`.
