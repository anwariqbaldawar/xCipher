// ─────────────────────────────────────────────────────────────────────────────
// Chart & Data Calculation Engine & Formatter
// ─────────────────────────────────────────────────────────────────────────────

export interface ChartMetadata {
  title?: string;
  subtitle?: string;
  source?: string;
  sourceUrl?: string;
  date?: string;
  unit?: string;
  notes?: string;
}

export interface SeriesStats {
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  sum: number | null;
  change: number | null; // Percentage change from first to last observation
}

export interface ChartSeriesConfig {
  key: string;
  label?: string;
  prefix?: string;
  suffix?: string;
  color?: string;
  unit?: string;
}

export interface VersionedChartConfig {
  version: 1 | 2;
  chartType: string;
  metadata?: ChartMetadata;
  series?: ChartSeriesConfig[];
  data: Record<string, any>[];
  stats?: Record<string, SeriesStats>;
}

/**
 * Robust numeric parser that handles currency symbols, thousands separators,
 * units, percentages, and accounting negatives like (123.45).
 * Crucially: NEVER converts NaN, empty, or unparseable input into 0.
 * Returns `null` when a value is absent or non-numeric.
 */
export function parseChartNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value).trim();
  if (!raw || raw === "-" || raw === "—" || raw.toLowerCase() === "n/a" || raw.toLowerCase() === "null") {
    return null;
  }

  // Accounting negative notation: (123.45) -> -123.45
  let clean = raw;
  let isNegative = false;
  if (clean.startsWith("(") && clean.endsWith(")")) {
    isNegative = true;
    clean = clean.slice(1, -1).trim();
  } else if (clean.startsWith("-")) {
    isNegative = true;
    clean = clean.slice(1).trim();
  } else if (clean.startsWith("+")) {
    clean = clean.slice(1).trim();
  }

  // Strip currency symbols, units, commas, spaces
  // Keep digits and decimal point
  clean = clean.replace(/[$€£¥%]/g, "").replace(/,/g, "").trim();

  // Match optional leading decimal or standard decimal
  const match = clean.match(/^[-+]?(\d+(\.\d+)?|\.\d+)/);
  if (!match) return null;

  const parsed = parseFloat(match[0]);
  if (!Number.isFinite(parsed)) return null;

  return isNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Computes descriptive statistical summary for a numeric series.
 * Ignores null, undefined, and non-finite values.
 */
export function calculateSeriesStats(values: (number | null | undefined)[]): SeriesStats {
  const valid = values
    .map(parseChartNumeric)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  if (valid.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      mean: null,
      median: null,
      sum: null,
      change: null,
    };
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  const mean = sum / valid.length;

  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  let change: number | null = null;
  if (valid.length >= 2) {
    const first = valid[0];
    const last = valid[valid.length - 1];
    if (first !== 0) {
      change = ((last - first) / Math.abs(first)) * 100;
    }
  }

  return {
    count: valid.length,
    min,
    max,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    sum: Number(sum.toFixed(2)),
    change: change !== null ? Number(change.toFixed(2)) : null,
  };
}

/**
 * Aligns observations across multiple series keys, ensuring uniform records.
 */
export function alignDatasetObservations(
  records: Record<string, any>[],
  keys: string[]
): Record<string, any>[] {
  if (!Array.isArray(records)) return [];

  return records.map((record, index) => {
    const aligned: Record<string, any> = {
      name: record.name !== undefined && record.name !== null ? String(record.name) : `Observation ${index + 1}`,
    };

    for (const key of keys) {
      if (key === "name") continue;
      const raw = record[key];
      aligned[key] = parseChartNumeric(raw);
    }

    return aligned;
  });
}

/**
 * Formats a value for display with appropriate units, prefixes, or suffixes.
 */
export function formatChartValue(
  value: unknown,
  key: string = "",
  prefix = "",
  suffix = ""
): string {
  if (value === null || value === undefined) return "N/A";

  const num = typeof value === "number" ? value : parseChartNumeric(value);
  const text = num !== null ? num.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value ?? "");
  const normalizedKey = key.toLowerCase();

  if (prefix || suffix) return `${prefix}${text}${suffix}`;
  if (normalizedKey.includes("price")) return `$${text}`;
  if (normalizedKey.includes("battery")) return `${text} mAh`;
  if (normalizedKey.includes("charging")) return `${text} W`;
  if (
    normalizedKey.includes("geekbench") ||
    normalizedKey.includes("score") ||
    normalizedKey.includes("performance")
  ) {
    return `${text} pts`;
  }
  if (normalizedKey.includes("drop") || normalizedKey.includes("throttling")) {
    return `${text}%`;
  }

  return text;
}

/**
 * Generates an accessible, semantic HTML table string for screen readers and search engines.
 */
export function generateAccessibleTableHtml(
  data: Record<string, any>[],
  keys: string[],
  caption?: string
): string {
  if (!data || data.length === 0) return "";

  const captionTag = caption ? `<caption>${caption}</caption>` : "";
  const headerCells = ["Observation", ...keys].map((k) => `<th scope="col">${k}</th>`).join("");

  const rows = data.map((row) => {
    const rowName = String(row.name ?? "");
    const cells = keys.map((k) => `<td>${formatChartValue(row[k], k)}</td>`).join("");
    return `<tr><th scope="row">${rowName}</th>${cells}</tr>`;
  }).join("");

  return `<table class="sr-only focus-within:not-sr-only w-full text-left text-sm border-collapse">${captionTag}<thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
}
