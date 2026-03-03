import type { TravelNotice as TravelNoticeType } from "@/lib/types";

interface TravelNoticeProps {
  notice: TravelNoticeType;
}

function formatDisplayDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isExpired(validUntil: string): boolean {
  const [year, month, day] = validUntil.split("-").map(Number);
  const expiry = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today > expiry;
}

export default function TravelNotice({ notice }: TravelNoticeProps) {
  const expired = isExpired(notice.validUntil);
  const displayDate = formatDisplayDate(notice.validUntil);

  if (expired) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none mt-0.5" aria-hidden="true">
            ✈
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Travel Confirmation Notice
              </span>
              <span className="inline-block rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                EXPIRED
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Last notice was valid to{" "}
              <span className="text-gray-600 dark:text-gray-400">{displayDate}</span>. No active
              extension issued.{" "}
              <a
                href={notice.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors dark:text-blue-400 dark:hover:text-blue-300"
              >
                Check irishimmigration.ie
              </a>{" "}
              for updates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5" aria-hidden="true">
          ✈
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-amber-800 dark:text-amber-200">
              Travel Confirmation Notice — ACTIVE
            </span>
            <span className="inline-block rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide bg-amber-200 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300">
              ACTIVE
            </span>
          </div>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/80">
            Expired IRP cards accepted for travel until{" "}
            <span className="font-semibold text-amber-800 dark:text-amber-200">{displayDate}</span>.{" "}
            <a
              href={notice.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 hover:text-amber-800 underline underline-offset-2 transition-colors dark:text-amber-300 dark:hover:text-amber-200"
            >
              View official notice
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
