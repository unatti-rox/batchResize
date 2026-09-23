import type { SizeSpec } from "./sizes";

export interface ExportResult {
  spec: SizeSpec;
  blob: Blob;
  sizeBytes: number;
  quality: number;
  width: number;
  height: number;
  format: "jpeg" | "png";
  overCap: boolean;
  dataUrl: string;
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      // Keep the object URL alive for the caller; revoked by caller when done.
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode the selected file as an image."));
    };
    img.src = url;
  });
}

/**
 * Draws `img` onto a canvas sized targetW x targetH using a centered
 * "cover" crop (fills the frame, crops overflow) — the standard approach
 * ad-ops pipelines use so every derivative keeps the same visual crop
 * intent as the master, regardless of target aspect ratio.
 */
function drawCover(
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Flatten transparency onto white — required for JPEG output.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);

  const srcRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = targetW / targetH;

  let sx: number, sy: number, sw: number, sh: number;
  if (srcRatio > targetRatio) {
    // Source is wider than target: crop left/right.
    sh = img.naturalHeight;
    sw = sh * targetRatio;
    sy = 0;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    // Source is taller than target: crop top/bottom.
    sw = img.naturalWidth;
    sh = sw / targetRatio;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: "jpeg" | "png",
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed."))),
      format === "jpeg" ? "image/jpeg" : "image/png",
      quality
    );
  });
}

/**
 * Binary-searches JPEG quality to land just under `maxKB`. Converges in
 * ~7 encode passes regardless of image complexity.
 */
async function compressToCap(
  canvas: HTMLCanvasElement,
  maxKB: number
): Promise<{ blob: Blob; quality: number }> {
  const capBytes = maxKB * 1024;
  let lo = 0.05;
  let hi = 0.95;
  let best: { blob: Blob; quality: number } | null = null;

  // First check: even the lowest quality might exceed the cap for very
  // large frame sizes — still return the smallest we can produce.
  const lowest = await canvasToBlob(canvas, "jpeg", lo);
  if (lowest.size > capBytes) {
    return { blob: lowest, quality: lo };
  }
  best = { blob: lowest, quality: lo };

  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvasToBlob(canvas, "jpeg", mid);
    if (blob.size <= capBytes) {
      best = { blob, quality: mid };
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return best;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read encoded blob."));
    reader.readAsDataURL(blob);
  });
}

export async function exportSize(
  img: HTMLImageElement,
  spec: SizeSpec
): Promise<ExportResult> {
  const canvas = drawCover(img, spec.width, spec.height);

  let blob: Blob;
  let quality: number;

  if (spec.maxKB) {
    const result = await compressToCap(canvas, spec.maxKB);
    blob = result.blob;
    quality = result.quality;
  } else {
    quality = 0.92;
    blob = await canvasToBlob(canvas, spec.format, quality);
  }

  const dataUrl = await blobToDataUrl(blob);
  const sizeBytes = blob.size;
  const overCap = spec.maxKB ? sizeBytes > spec.maxKB * 1024 : false;

  return {
    spec,
    blob,
    sizeBytes,
    quality,
    width: spec.width,
    height: spec.height,
    format: spec.format,
    overCap,
    dataUrl,
  };
}

export async function exportAll(
  img: HTMLImageElement,
  specs: SizeSpec[],
  onProgress?: (done: number, total: number, current: SizeSpec) => void
): Promise<ExportResult[]> {
  const results: ExportResult[] = [];
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    onProgress?.(i, specs.length, spec);
    // eslint-disable-next-line no-await-in-loop
    const result = await exportSize(img, spec);
    results.push(result);
  }
  onProgress?.(specs.length, specs.length, specs[specs.length - 1]);
  return results;
}
