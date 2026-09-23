"use client";

import { useMemo, useState } from "react";
import Dropzone from "@/components/Dropzone";
import SizeSelector from "@/components/SizeSelector";
import StatTiles from "@/components/StatTiles";
import ResultsTable from "@/components/ResultsTable";
import { exportAll, loadImageFromFile, type ExportResult } from "@/lib/imageProcessor";
import { baseNameFromFile } from "@/lib/naming";
import { buildExportZip, triggerDownload } from "@/lib/zip";
import { SIZE_LIBRARY, type SizeCategory } from "@/lib/sizes";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(SIZE_LIBRARY.map((s) => s.id))
  );
  const [results, setResults] = useState<ExportResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseName = useMemo(
    () => (file ? baseNameFromFile(file.name) : "creative"),
    [file]
  );

  async function handleFile(nextFile: File) {
    setError(null);
    setResults([]);
    try {
      const img = await loadImageFromFile(nextFile);
      setFile(nextFile);
      setImage(img);
      setPreviewUrl(img.src);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that file.");
    }
  }

  function toggleSize(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(category: SizeCategory, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      SIZE_LIBRARY.filter((s) => s.category === category).forEach((s) => {
        if (checked) next.add(s.id);
        else next.delete(s.id);
      });
      return next;
    });
  }

  async function handleGenerate() {
    if (!image) return;
    const specs = SIZE_LIBRARY.filter((s) => selected.has(s.id));
    if (specs.length === 0) {
      setError("Select at least one export size first.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    setResults([]);
    try {
      const out = await exportAll(image, specs, (done, total, current) => {
        setProgress({ done, total, label: `${current.platform} — ${current.label}` });
      });
      setResults(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }

  async function handleDownloadZip() {
    if (results.length === 0) return;
    const zipBlob = await buildExportZip(baseName, results);
    triggerDownload(zipBlob, `${baseName}_export.zip`);
  }

  const selectedCount = selected.size;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">
          Creative Ops
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-50 sm:text-3xl">
          Batch Resize — Export Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Upload one master creative and generate every required social,
          display, and print size in a single pass — nothing is cropped,
          full creative scaled to fit each frame, compressed under 50KB
          where a network requires it, and named to spec.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <section className="space-y-6">
          <Dropzone
            onFile={handleFile}
            previewUrl={previewUrl}
            fileName={file?.name ?? null}
            fileMeta={
              image ? `${image.naturalWidth}×${image.naturalHeight}px` : null
            }
          />

          <div className="rounded-xl border border-line bg-panel p-4">
            <button
              onClick={handleGenerate}
              disabled={!image || isGenerating}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-slate-500"
            >
              {isGenerating
                ? "Generating…"
                : `Generate ${selectedCount} export${selectedCount === 1 ? "" : "s"}`}
            </button>

            {isGenerating && progress ? (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width: `${(progress.done / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {progress.done}/{progress.total} · {progress.label}
                </p>
              </div>
            ) : null}

            {results.length > 0 ? (
              <button
                onClick={handleDownloadZip}
                className="mt-3 w-full rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-accent2 hover:text-accent2"
              >
                Download all as ZIP
              </button>
            ) : null}

            {error ? <p className="mt-3 text-xs text-bad">{error}</p> : null}
          </div>

          <SizeSelector
            selected={selected}
            onToggle={toggleSize}
            onToggleCategory={toggleCategory}
          />
        </section>

        <section className="space-y-6">
          {results.length > 0 ? (
            <>
              <StatTiles results={results} />
              <ResultsTable baseName={baseName} results={results} />
            </>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel/50 text-center">
              <p className="text-sm font-medium text-slate-300">
                No exports yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Upload a master creative, pick your sizes on the left, then
                generate — results, weight checks, and downloads show up
                here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
