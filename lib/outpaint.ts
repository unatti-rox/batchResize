import { drawContain } from "./imageProcessor";

export type Bucket = "square" | "landscape" | "portrait";

/** The only output pixel sizes the image-generation model accepts. */
export const BUCKET_SIZES: Record<Bucket, { w: number; h: number }> = {
  square: { w: 1024, h: 1024 },
  landscape: { w: 1536, h: 1024 },
  portrait: { w: 1024, h: 1536 },
};

/** How much the previous frame shrinks (and how much new canvas opens up
 * around it) on each outpaint "zoom out" iteration. */
const SHRINK = 0.55;
/** Hard cap on iterations per bucket — bounds cost/latency even for the
 * most extreme banner ratios (e.g. 970x90). */
const MAX_ITERATIONS = 5;
/** Below this ratio deviation from the source, skip AI extension entirely
 * — the contain-fit margin is already negligible. */
const SKIP_THRESHOLD = 0.05;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function pickBucket(targetW: number, targetH: number): Bucket {
  const ratio = targetW / targetH;
  if (ratio > 1.15) return "landscape";
  if (ratio < 0.87) return "portrait";
  return "square";
}

export function needsExtension(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number
): boolean {
  const deviation = Math.abs(
    Math.log(targetW / targetH) - Math.log(srcW / srcH)
  );
  return deviation > SKIP_THRESHOLD;
}

/**
 * Smallest rect of aspect ratio targetW:targetH, positioned within
 * [0,cw]x[0,ch], that fully contains `inner`. Returns null when no such
 * rect fits — i.e. `inner` is still too large relative to the canvas for
 * that ratio, and more zoom-out iterations are needed.
 */
export function computeCropRect(
  inner: Rect,
  cw: number,
  ch: number,
  targetW: number,
  targetH: number
): Rect | null {
  const ratio = targetW / targetH;
  const minW = Math.max(inner.w, inner.h * ratio);
  const minH = minW / ratio;
  const EPS = 0.01;
  if (minW > cw + EPS || minH > ch + EPS) return null;

  const xLow = Math.max(0, inner.x + inner.w - minW);
  const xHigh = Math.min(inner.x, cw - minW);
  const yLow = Math.max(0, inner.y + inner.h - minH);
  const yHigh = Math.min(inner.y, ch - minH);
  if (xLow > xHigh + EPS || yLow > yHigh + EPS) return null;

  const centeredX = inner.x - (minW - inner.w) / 2;
  const centeredY = inner.y - (minH - inner.h) / 2;
  return {
    x: Math.min(Math.max(centeredX, xLow), xHigh),
    y: Math.min(Math.max(centeredY, yLow), yHigh),
    w: minW,
    h: minH,
  };
}

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function averageColor(
  source: CanvasImageSource,
  srcW: number,
  srcH: number
): string {
  const c = createCanvas(8, 8);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, 0, 0, srcW, srcH, 0, 0, 8, 8);
  const { data } = ctx.getImageData(0, 0, 8, 8);
  let r = 0,
    g = 0,
    b = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

function buildBaseCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  canvasW: number,
  canvasH: number,
  placeRect: Rect,
  seedColor: string
): HTMLCanvasElement {
  const c = createCanvas(canvasW, canvasH);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = seedColor;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    0,
    0,
    srcW,
    srcH,
    placeRect.x,
    placeRect.y,
    placeRect.w,
    placeRect.h
  );
  return c;
}

/** OpenAI edit-mask convention: fully transparent = regenerate, opaque = keep as-is. */
function buildMaskDataUrl(canvasW: number, canvasH: number, keepRect: Rect): string {
  const c = createCanvas(canvasW, canvasH);
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(keepRect.x, keepRect.y, keepRect.w, keepRect.h);
  return c.toDataURL("image/png");
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode the generated image."));
    img.src = dataUrl;
  });
}

export interface BucketStep {
  canvas: HTMLCanvasElement;
  subjectRect: Rect;
}

export type OutpaintCallFn = (
  imageDataUrl: string,
  maskDataUrl: string,
  size: string
) => Promise<string>;

export type BucketCache = Map<Bucket, BucketStep[]>;

export function createOutpaintCache(): BucketCache {
  return new Map();
}

async function buildStep0(
  img: HTMLImageElement,
  bucket: Bucket,
  call: OutpaintCallFn
): Promise<BucketStep> {
  const { w: cw, h: ch } = BUCKET_SIZES[bucket];
  const base = drawContain(img, img.naturalWidth, img.naturalHeight, cw, ch);
  // Recover the exact placement rect drawContain used, so we can mask it.
  const rect = containRect(img.naturalWidth, img.naturalHeight, cw, ch);
  const seed = averageColor(img, img.naturalWidth, img.naturalHeight);
  const seeded = buildBaseCanvas(img, img.naturalWidth, img.naturalHeight, cw, ch, rect, seed);
  void base; // drawContain output isn't needed once we have the seeded+masked version.

  const maskDataUrl = buildMaskDataUrl(cw, ch, rect);
  const resultDataUrl = await call(seeded.toDataURL("image/png"), maskDataUrl, `${cw}x${ch}`);
  const resultImg = await loadImageFromDataUrl(resultDataUrl);
  const resultCanvas = createCanvas(cw, ch);
  resultCanvas.getContext("2d")!.drawImage(resultImg, 0, 0, cw, ch);
  return { canvas: resultCanvas, subjectRect: rect };
}

function containRect(srcW: number, srcH: number, cw: number, ch: number): Rect {
  const srcRatio = srcW / srcH;
  const bucketRatio = cw / ch;
  let dw: number, dh: number;
  if (srcRatio > bucketRatio) {
    dw = cw;
    dh = dw / srcRatio;
  } else {
    dh = ch;
    dw = dh * srcRatio;
  }
  return { x: (cw - dw) / 2, y: (ch - dh) / 2, w: dw, h: dh };
}

async function zoomOutStep(
  prev: BucketStep,
  bucket: Bucket,
  call: OutpaintCallFn
): Promise<BucketStep> {
  const { w: cw, h: ch } = BUCKET_SIZES[bucket];
  const rect: Rect = {
    x: (cw * (1 - SHRINK)) / 2,
    y: (ch * (1 - SHRINK)) / 2,
    w: cw * SHRINK,
    h: ch * SHRINK,
  };
  const seeded = buildBaseCanvas(prev.canvas, cw, ch, cw, ch, rect, "#808080");
  const maskDataUrl = buildMaskDataUrl(cw, ch, rect);
  const resultDataUrl = await call(seeded.toDataURL("image/png"), maskDataUrl, `${cw}x${ch}`);
  const resultImg = await loadImageFromDataUrl(resultDataUrl);
  const resultCanvas = createCanvas(cw, ch);
  resultCanvas.getContext("2d")!.drawImage(resultImg, 0, 0, cw, ch);

  const subjectRect: Rect = {
    x: rect.x + prev.subjectRect.x * SHRINK,
    y: rect.y + prev.subjectRect.y * SHRINK,
    w: prev.subjectRect.w * SHRINK,
    h: prev.subjectRect.h * SHRINK,
  };
  return { canvas: resultCanvas, subjectRect };
}

/** Analytically finds how many zoom-out iterations a target ratio needs,
 * without calling the API — so we only ever generate as many steps as a
 * batch actually requires. */
function iterationsNeeded(
  img: HTMLImageElement,
  bucket: Bucket,
  targetW: number,
  targetH: number
): number {
  const { w: cw, h: ch } = BUCKET_SIZES[bucket];
  let rect = containRect(img.naturalWidth, img.naturalHeight, cw, ch);
  let n = 0;
  while (n < MAX_ITERATIONS && !computeCropRect(rect, cw, ch, targetW, targetH)) {
    const shrunk: Rect = {
      x: (cw * (1 - SHRINK)) / 2,
      y: (ch * (1 - SHRINK)) / 2,
      w: cw * SHRINK,
      h: ch * SHRINK,
    };
    rect = {
      x: shrunk.x + rect.x * SHRINK,
      y: shrunk.y + rect.y * SHRINK,
      w: rect.w * SHRINK,
      h: rect.h * SHRINK,
    };
    n++;
  }
  return n;
}

async function ensureSteps(
  img: HTMLImageElement,
  bucket: Bucket,
  count: number,
  cache: BucketCache,
  call: OutpaintCallFn,
  onProgress?: (step: number, total: number) => void
): Promise<BucketStep[]> {
  let steps = cache.get(bucket);
  if (!steps) {
    steps = [];
    cache.set(bucket, steps);
  }
  while (steps.length <= count) {
    onProgress?.(steps.length, count + 1);
    if (steps.length === 0) {
      // eslint-disable-next-line no-await-in-loop
      steps.push(await buildStep0(img, bucket, call));
    } else {
      // eslint-disable-next-line no-await-in-loop
      steps.push(await zoomOutStep(steps[steps.length - 1], bucket, call));
    }
  }
  return steps;
}

/**
 * Produces a targetW x targetH canvas whose background has been generatively
 * extended (via the outpaint `call` callback) so the full master creative
 * fits with nothing cropped — no letterbox bars, the whole frame is real
 * (AI-painted) image content. Results are cached per orientation bucket so
 * a batch of similarly-shaped sizes shares generation calls instead of
 * re-generating from scratch for every single export.
 */
export async function extendAndFit(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  cache: BucketCache,
  call: OutpaintCallFn,
  onProgress?: (step: number, total: number) => void
): Promise<HTMLCanvasElement> {
  const bucket = pickBucket(targetW, targetH);
  const { w: cw, h: ch } = BUCKET_SIZES[bucket];
  const needed = iterationsNeeded(img, bucket, targetW, targetH);

  const steps = await ensureSteps(img, bucket, needed, cache, call, onProgress);
  const final = steps[Math.min(needed, steps.length - 1)];

  const crop =
    computeCropRect(final.subjectRect, cw, ch, targetW, targetH) ?? {
      x: 0,
      y: 0,
      w: cw,
      h: ch,
    };

  const out = createCanvas(targetW, targetH);
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(final.canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, targetW, targetH);
  return out;
}

/** Calls the app's `/api/outpaint` route. */
export async function callOutpaintApi(
  imageDataUrl: string,
  maskDataUrl: string,
  size: string
): Promise<string> {
  const res = await fetch("/api/outpaint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl, maskDataUrl, size }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `Image generation failed (${res.status}).`);
  }
  return json.imageDataUrl as string;
}
