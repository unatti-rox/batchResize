import JSZip from "jszip";
import type { ExportResult } from "./imageProcessor";
import { buildFileName, buildFolderPath, bytesToKB } from "./naming";
import { CATEGORY_LABELS } from "./sizes";

export async function buildExportZip(
  baseName: string,
  results: ExportResult[]
): Promise<Blob> {
  const zip = new JSZip();
  const manifestRows = [
    [
      "File Name",
      "Category",
      "Platform",
      "Placement",
      "Width",
      "Height",
      "File Size (KB)",
      "Cap (KB)",
      "Within Cap",
    ].join(","),
  ];

  for (const result of results) {
    const fileName = buildFileName(baseName, result);
    const folder = buildFolderPath(result);
    zip.file(`${folder}/${fileName}`, result.blob);

    manifestRows.push(
      [
        fileName,
        CATEGORY_LABELS[result.spec.category],
        result.spec.platform,
        result.spec.label,
        result.width,
        result.height,
        bytesToKB(result.sizeBytes),
        result.spec.maxKB ?? "—",
        result.overCap ? "NO" : "YES",
      ].join(",")
    );
  }

  zip.file("manifest.csv", manifestRows.join("\n"));

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
