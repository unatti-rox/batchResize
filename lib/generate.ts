import { compressCanvas, drawContain, type ExportResult } from "./imageProcessor";
import {
  callOutpaintApi,
  createOutpaintCache,
  extendAndFit,
  needsExtension,
  type BucketCache,
} from "./outpaint";
import type { SizeSpec } from "./sizes";

export interface GenerateProgress {
  done: number;
  total: number;
  spec: SizeSpec;
  detail?: string;
}

/**
 * Runs the full export batch. When `useAI` is on, social/display specs whose
 * aspect ratio meaningfully differs from the source get their background
 * generatively extended (nothing cropped, no letterbox bars); specs whose
 * ratio is already close, and all print specs, use the plain contain-fit.
 * Any AI failure (missing key, rate limit, network) falls back to
 * contain-fit for that one spec rather than failing the whole batch.
 */
export async function generateExports(
  img: HTMLImageElement,
  specs: SizeSpec[],
  useAI: boolean,
  onProgress?: (p: GenerateProgress) => void
): Promise<ExportResult[]> {
  const cache: BucketCache = createOutpaintCache();
  const results: ExportResult[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    onProgress?.({ done: i, total: specs.length, spec });

    const shouldExtend =
      useAI &&
      spec.category !== "print" &&
      needsExtension(img.naturalWidth, img.naturalHeight, spec.width, spec.height);

    if (shouldExtend) {
      try {
        const canvas = await extendAndFit(
          img,
          spec.width,
          spec.height,
          cache,
          callOutpaintApi,
          (step, total) =>
            onProgress?.({
              done: i,
              total: specs.length,
              spec,
              detail: `AI extending background — step ${step + 1}/${total}`,
            })
        );
        // eslint-disable-next-line no-await-in-loop
        results.push(await compressCanvas(canvas, spec, "ai-extend"));
        continue;
      } catch (e) {
        const reason = e instanceof Error ? e.message : "AI extension failed.";
        const canvas = drawContain(
          img,
          img.naturalWidth,
          img.naturalHeight,
          spec.width,
          spec.height
        );
        // eslint-disable-next-line no-await-in-loop
        results.push(await compressCanvas(canvas, spec, "ai-fallback", reason));
        continue;
      }
    }

    const canvas = drawContain(
      img,
      img.naturalWidth,
      img.naturalHeight,
      spec.width,
      spec.height
    );
    // eslint-disable-next-line no-await-in-loop
    results.push(await compressCanvas(canvas, spec, "contain"));
  }

  onProgress?.({ done: specs.length, total: specs.length, spec: specs[specs.length - 1] });
  return results;
}
