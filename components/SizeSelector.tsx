"use client";

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  SIZE_LIBRARY,
  sizesByCategory,
  type SizeCategory,
} from "@/lib/sizes";

interface SizeSelectorProps {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleCategory: (category: SizeCategory, checked: boolean) => void;
}

export default function SizeSelector({
  selected,
  onToggle,
  onToggleCategory,
}: SizeSelectorProps) {
  return (
    <div className="space-y-5">
      {CATEGORY_ORDER.map((category) => {
        const specs = sizesByCategory(category);
        const selectedCount = specs.filter((s) => selected.has(s.id)).length;
        const allSelected = selectedCount === specs.length;

        return (
          <div
            key={category}
            className="rounded-xl border border-line bg-panel"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  {CATEGORY_LABELS[category]}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCount}/{specs.length} selected
                  {category !== "print" ? " · capped at 50KB" : " · print resolution, no weight cap"}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleCategory(category, e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-line accent-accent"
                />
                Select all
              </label>
            </div>
            <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
              {specs.map((spec) => (
                <label
                  key={spec.id}
                  className="flex cursor-pointer items-start gap-3 bg-panel px-4 py-3 hover:bg-white/[0.03]"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(spec.id)}
                    onChange={() => onToggle(spec.id)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-line accent-accent"
                  />
                  <span>
                    <span className="block text-sm text-slate-100">
                      {spec.platform} — {spec.label}
                    </span>
                    <span className="block font-mono text-xs text-slate-500">
                      {spec.width}×{spec.height}px
                      {spec.maxKB ? ` · ≤${spec.maxKB}KB` : spec.dpi ? ` · ${spec.dpi}dpi` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-slate-600">
        {SIZE_LIBRARY.length} presets available across{" "}
        {CATEGORY_ORDER.length} categories.
      </p>
    </div>
  );
}
