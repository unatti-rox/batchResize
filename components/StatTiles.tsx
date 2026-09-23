import type { ExportResult } from "@/lib/imageProcessor";
import { bytesToKB } from "@/lib/naming";

interface StatTilesProps {
  results: ExportResult[];
}

function Tile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-good"
      : tone === "bad"
      ? "text-bad"
      : "text-slate-100";
  return (
    <div className="rounded-xl border border-line bg-panel px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

export default function StatTiles({ results }: StatTilesProps) {
  const total = results.length;
  const capped = results.filter((r) => r.spec.maxKB);
  const withinCap = capped.filter((r) => !r.overCap).length;
  const avgKB =
    total === 0
      ? 0
      : Math.round(
          results.reduce((sum, r) => sum + bytesToKB(r.sizeBytes), 0) / total
        );
  const totalKB = Math.round(
    results.reduce((sum, r) => sum + bytesToKB(r.sizeBytes), 0)
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label="Assets generated" value={String(total)} />
      <Tile
        label="Within 50KB cap"
        value={capped.length ? `${withinCap}/${capped.length}` : "—"}
        tone={
          capped.length === 0
            ? "default"
            : withinCap === capped.length
            ? "good"
            : "bad"
        }
      />
      <Tile label="Avg. file size" value={`${avgKB}KB`} />
      <Tile label="Total export weight" value={`${totalKB}KB`} />
    </div>
  );
}
