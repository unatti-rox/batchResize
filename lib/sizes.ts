export type SizeCategory = "social" | "display" | "print";

export type OutputFormat = "jpeg" | "png";

export interface SizeSpec {
  /** Stable identifier, also used as the export slug. */
  id: string;
  /** Human label, e.g. "Half Page". */
  label: string;
  /** Platform/network this spec targets, e.g. "Instagram", "Google Display". */
  platform: string;
  category: SizeCategory;
  width: number;
  height: number;
  /** Preferred codec. Print defaults to lossless-ish high quality jpeg unless flagged png. */
  format: OutputFormat;
  /** Max file weight in KB. Omit for no cap (print). */
  maxKB?: number;
  /** DPI metadata, informational only (canvas export is always 72dpi raster). */
  dpi?: number;
}

export const CATEGORY_LABELS: Record<SizeCategory, string> = {
  social: "Social Media",
  display: "Display (Google Display Network)",
  print: "Print",
};

export const CATEGORY_ORDER: SizeCategory[] = ["social", "display", "print"];

/** Default weight cap applied to every social + display spec, per spec: "under 50kb". */
export const DEFAULT_WEB_CAP_KB = 50;

export const SIZE_LIBRARY: SizeSpec[] = [
  // ---------------------------------------------------------------------
  // Social — most common paid + organic placements
  // ---------------------------------------------------------------------
  { id: "ig-feed-square", label: "Feed Square", platform: "Instagram", category: "social", width: 1080, height: 1080, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "ig-feed-portrait", label: "Feed Portrait", platform: "Instagram", category: "social", width: 1080, height: 1350, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "ig-story", label: "Story-Reel", platform: "Instagram", category: "social", width: 1080, height: 1920, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "fb-feed", label: "Feed", platform: "Facebook", category: "social", width: 1200, height: 628, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "fb-story", label: "Story", platform: "Facebook", category: "social", width: 1080, height: 1920, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "x-post", label: "Post", platform: "X", category: "social", width: 1600, height: 900, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "linkedin-post", label: "Post", platform: "LinkedIn", category: "social", width: 1200, height: 627, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "pinterest-pin", label: "Standard Pin", platform: "Pinterest", category: "social", width: 1000, height: 1500, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },

  // ---------------------------------------------------------------------
  // Display — Google Display Network, exact spec list
  // ---------------------------------------------------------------------
  { id: "gdn-160x600", label: "Wide Skyscraper", platform: "Google Display", category: "display", width: 160, height: 600, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "gdn-300x600", label: "Half Page", platform: "Google Display", category: "display", width: 300, height: 600, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "gdn-336x280", label: "Large Rectangle", platform: "Google Display", category: "display", width: 336, height: 280, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "gdn-320x50", label: "Mobile Leaderboard", platform: "Google Display", category: "display", width: 320, height: 50, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "gdn-320x100", label: "Large Mobile Banner", platform: "Google Display", category: "display", width: 320, height: 100, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "gdn-250x250", label: "Square", platform: "Google Display", category: "display", width: 250, height: 250, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "gdn-200x200", label: "Small Square", platform: "Google Display", category: "display", width: 200, height: 200, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "gdn-970x90", label: "Large Leaderboard", platform: "Google Display", category: "display", width: 970, height: 90, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "gdn-728x90", label: "Leaderboard", platform: "Google Display", category: "display", width: 728, height: 90, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },
  { id: "gdn-468x60", label: "Banner", platform: "Google Display", category: "display", width: 468, height: 60, format: "jpeg", maxKB: DEFAULT_WEB_CAP_KB },

  // ---------------------------------------------------------------------
  // Print — high resolution, no web weight cap
  // ---------------------------------------------------------------------
  { id: "print-us-letter", label: "US Letter", platform: "Print", category: "print", width: 2550, height: 3300, format: "jpeg", dpi: 300 },
  { id: "print-a4", label: "A4", platform: "Print", category: "print", width: 2480, height: 3508, format: "jpeg", dpi: 300 },
  { id: "print-a5-flyer", label: "A5 Flyer", platform: "Print", category: "print", width: 1748, height: 2480, format: "jpeg", dpi: 300 },
  { id: "print-business-card", label: "Business Card 3.5x2in", platform: "Print", category: "print", width: 1050, height: 600, format: "jpeg", dpi: 300 },
  { id: "print-poster-18x24", label: "Poster 18x24in", platform: "Print", category: "print", width: 2700, height: 3600, format: "jpeg", dpi: 150 },
];

export function sizesByCategory(category: SizeCategory): SizeSpec[] {
  return SIZE_LIBRARY.filter((s) => s.category === category);
}

export function getSizeSpec(id: string): SizeSpec | undefined {
  return SIZE_LIBRARY.find((s) => s.id === id);
}
