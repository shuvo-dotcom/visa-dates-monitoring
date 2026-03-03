interface LastUpdatedProps {
  lastScraped: string; // ISO 8601 timestamp
}

function formatRelative(isoTimestamp: string): string {
  const now = new Date();
  const scraped = new Date(isoTimestamp);
  const diffMs = now.getTime() - scraped.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "just now";
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export default function LastUpdated({ lastScraped }: LastUpdatedProps) {
  const relative = formatRelative(lastScraped);
  const fullDate = new Date(lastScraped).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <span
        className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"
        aria-hidden="true"
      />
      <span>
        Checked{" "}
        <time dateTime={lastScraped} title={fullDate}>
          {relative}
        </time>
        {" · "}
        <span className="text-gray-500">INIS updates Tuesdays</span>
      </span>
    </div>
  );
}
