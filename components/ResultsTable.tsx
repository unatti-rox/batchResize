"use client";

import type { ExportResult } from "@/lib/imageProcessor";
import { buildFileName, bytesToKB } from "@/lib/naming";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/sizes";
import { triggerDownload } from "@/lib/zip";

interface ResultsTableProps {
  baseName: string;
  results: ExportResult[];
}

export default function ResultsTable({ baseName, results }: ResultsTableProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map((category) => {
        const rows = results.filter((r) => r.spec.category === category);
        if (rows.length === 0) return null;

        return (
          <div key={category} className="rounded-xl border border-line bg-panel">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-100">
                {CATEGORY_LABELS[category]}
              </h3>
            </div>
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 font-medium">Preview</th>
                    <th className="px-4 py-2 font-medium">File name</th>
                    <th className="px-4 py-2 font-medium">Size (px)</th>
                    <th className="px-4 py-2 font-medium">Fill</th>
                    <th className="px-4 py-2 font-medium">Weight</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const fileName = buildFileName(baseName, r);
                    const kb = bytesToKB(r.sizeBytes);
                    return (
                      <tr
                        key={r.spec.id}
                        className="border-t border-line/60 hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-2">
                          <img
                            src={r.dataUrl}
                            alt={fileName}
                            className="h-10 w-14 rounded border border-line object-cover bg-white/5"
                          />
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-300">
                          {fileName}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-400">
                          {r.width}×{r.height}
                        </td>
                        <td className="px-4 py-2">
                          {r.fillMode === "ai-extend" ? (
                            <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                              AI extended
                            </span>
                          ) : r.fillMode === "ai-fallback" ? (
                            <span
                              className="inline-flex items-center rounded-full bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn"
                              title={r.fallbackReason}
                            >
                              Fallback fit
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-line px-2 py-0.5 text-xs font-medium text-slate-400">
                              Fit
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-400">
                          {kb}KB
                          {r.spec.maxKB ? ` / ${r.spec.maxKB}KB` : ""}
                        </td>
                        <td className="px-4 py-2">
                          {r.spec.maxKB ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                r.overCap
                                  ? "bg-bad/15 text-bad"
                                  : "bg-good/15 text-good"
                              }`}
                            >
                              {r.overCap ? "Over cap" : "Under cap"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-accent2/15 px-2 py-0.5 text-xs font-medium text-accent2">
                              Print
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => triggerDownload(r.blob, fileName)}
                            className="rounded-md border border-line px-2 py-1 text-xs text-slate-300 hover:border-accent hover:text-accent"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
