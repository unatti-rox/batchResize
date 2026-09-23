# Batch Resize — Creative Export Dashboard

Upload one master creative and generate every required **social, display,
and print** ad size in a single pass — the full creative is always kept,
never cropped. Where the target frame's aspect ratio doesn't match the
source, the background is **generatively extended** (AI outpainting) to
fill the frame with real, plausible scene content instead of a letterbox
bar. Every social/display export is compressed under a weight cap, then
named to spec.

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
3. **Generate**:
   - With **AI background extension** on (default, needs `OPENAI_API_KEY` —
     see below): for social/display sizes whose aspect ratio meaningfully
     differs from the source, the master is placed uncropped and centered,
     then an image model ([`gpt-image-1`](https://platform.openai.com/docs/guides/image-generation))
     paints new, matching background into the surrounding frame — no
     cropping, no flat letterbox bars. Extreme ratios (e.g. a 970×90 or
     160×600 banner from a normal photo) are reached by iteratively
     "zooming out" — each step shrinks the previous result and outpaints a
     wider ring around it — capped at 5 steps per orientation and shared
     across every size that needs that orientation, so a full batch costs
     roughly 3–9 generation calls total, not one per size. Sizes whose
     ratio is already close to the source, and all print sizes, skip AI
     entirely and use a plain centered fit (free, instant).
   - With AI off, or if a generation call fails, that size falls back to
     the plain centered fit (still fully uncropped, just letterboxed) —
     flagged in the results table so you know which ones to double-check.
   - Every social/display size then gets its JPEG quality binary-searched
     until it lands **under 50KB**. Print sizes are exported at high
     quality with no weight cap.
4. **Review** — a stats row (assets generated, how many are under the 50KB
   cap, average/total weight) plus a per-category table with a thumbnail,
   resolved file name, pixel size, fill method (AI extended / plain fit /
   fallback), weight vs. cap, and pass/fail badge.
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
- Resizing, "contain" fitting, JPEG weight-capping, and ZIP packaging all
  run client-side via the Canvas API — no upload of the master creative to
  any server for those.
- AI background extension calls a single Next.js API route
  (`app/api/outpaint`), which proxies to OpenAI's image edit endpoint
  server-side (so the API key never reaches the browser). This makes the
  app a Node serverless deployment on Vercel rather than a fully static
  export, still zero-config beyond the one environment variable below.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy — GitHub + Vercel

The repo is wired for zero-config Vercel deployment (Next.js is
auto-detected). To connect it:

1. Push this branch to GitHub (already done if you're reading this from
   the repo) and merge it into your default branch, or point Vercel at
   this branch directly.
2. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
3. **Import** this repository (`unatti-rox/batchresize`).
4. Vercel auto-detects the **Next.js** framework preset — leave build
   command (`next build`) and output settings as default.
5. **(Optional but recommended)** Add an environment variable
   `OPENAI_API_KEY` with a key from
   [platform.openai.com](https://platform.openai.com/api-keys) to turn on
   AI background extension. Without it, the app still works fully — it
   just falls back to a plain centered fit for every size (shows a banner
   saying so).
6. Click **Deploy**. Every future push to the connected branch redeploys
   automatically; pull requests get their own preview URL.

### Cost & latency note

`gpt-image-1` edit calls run a few seconds to tens of seconds each and
cost a small per-image fee. A full 23-size batch triggers roughly 3–9
calls total (shared across sizes with the same orientation via caching),
not 23 — but it's still real time and real money per "Generate", so the
toggle is there to switch it off for quick, free iterations.

## Adjusting the size library

All presets live in `lib/sizes.ts` as a flat, typed list (`SIZE_LIBRARY`).
Add, remove, or edit an entry — including its weight cap (`maxKB`) — and
it shows up in the dashboard automatically, grouped by its `category`.
