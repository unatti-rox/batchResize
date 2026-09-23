import type { ExportResult } from "./imageProcessor";

function slugify(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function baseNameFromFile(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, "");
  return slugify(withoutExt) || "creative";
}

export function bytesToKB(bytes: number): number {
  return Math.round((bytes / 1024) * 10) / 10;
}

/**
 * File naming convention:
 *   {BaseName}_{Platform}_{Label}_{Width}x{Height}_{FileSizeKB}KB.{ext}
 *
 * The file size is baked into the name (rounded KB) so QA and traffickers
 * can confirm the weight cap was met without opening each asset, and so
 * two passes of the same spec never collide on disk.
 */
export function buildFileName(baseName: string, result: ExportResult): string {
  const platform = slugify(result.spec.platform);
  const label = slugify(result.spec.label);
  const dims = `${result.width}x${result.height}`;
  const kb = Math.round(bytesToKB(result.sizeBytes));
  const ext = result.format === "jpeg" ? "jpg" : "png";
  return `${baseName}_${platform}_${label}_${dims}_${kb}KB.${ext}`;
}

export function buildFolderPath(result: ExportResult): string {
  return `${result.spec.category}/${slugify(result.spec.platform)}`;
}
