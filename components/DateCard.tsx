import type { PermitCategory } from "@/lib/types";

interface DateCardProps {
  category: PermitCategory;
  highlight?: boolean; // highlight personally relevant cards
}

function formatRelativeChange(isoTimestamp: string): string {
  const now = new Date();
  const changed = new Date(isoTimestamp);
  const diffMs = now.getTime() - changed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "updated today";
  if (diffDays === 1) return "updated yesterday";
  if (diffDays <= 7) return "updated this week";
  if (diffDays <= 14) return "updated 2 weeks ago";
  return `${diffDays} days ago`;
}

function parseProcessingDate(dateStr: string): Date | null {
  // Try to parse "18 February 2026" or "03 November 2025"
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function staleness(dateStr: string): "fresh" | "moderate" | "stale" | "unknown" {
  const d = parseProcessingDate(dateStr);
  if (!d) return "unknown";

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 14) return "fresh";
  if (diffDays <= 60) return "moderate";
  return "stale";
}

const stalenessColors = {
  fresh: "text-green-400",
  moderate: "text-yellow-400",
  stale: "text-red-400",
  unknown: "text-gray-400",
};

const stalenesBorderColors = {
  fresh: "border-green-800/50",
  moderate: "border-yellow-800/50",
  stale: "border-red-900/50",
  unknown: "border-gray-700",
};

export default function DateCard({ category, highlight = false }: DateCardProps) {
  const level = staleness(category.processingDate);
  const relativeChange = formatRelativeChange(category.lastChanged);

  const borderClass = highlight
    ? "border-blue-600/60"
    : stalenesBorderColors[level];

  const isPending =
    category.processingDate === "Pending first scrape" ||
    category.processingDate === "Unknown";

  return (
    <div
      className={`relative rounded-xl border ${borderClass} bg-gray-900 p-4 flex flex-col gap-1 transition-all hover:bg-gray-800/80`}
    >
      {highlight && (
        <span className="absolute top-3 right-3 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-700/40 text-blue-300">
          You
        </span>
      )}
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 pr-8">
        {category.label}
      </p>

      {isPending ? (
        <p className="text-lg font-semibold text-gray-500 italic">
          Pending scrape
        </p>
      ) : (
        <p
          className={`text-xl font-bold ${stalenessColors[level]}`}
          title={`Processing date: ${category.processingDate}`}
        >
          {category.processingDate}
        </p>
      )}

      <p className="text-xs text-gray-600 mt-auto pt-1">
        {relativeChange}
      </p>
    </div>
  );
}
