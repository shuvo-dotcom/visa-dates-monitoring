import fs from "fs";
import path from "path";
import type { ProcessingDates } from "@/lib/types";
import DateCard from "@/components/DateCard";
import TravelNotice from "@/components/TravelNotice";
import LastUpdated from "@/components/LastUpdated";
import RefreshButton from "@/components/RefreshButton";
import ThemeToggle from "@/components/ThemeToggle";

// ISR: revalidate every hour
export const revalidate = 3600;

function loadData(): ProcessingDates {
  const filePath = path.join(process.cwd(), "data", "processing-dates.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ProcessingDates;
}

// IDs that are personally relevant — gets a subtle highlight
const HIGHLIGHTED_IDS = new Set(["csep-new", "csep-reviews", "stamp-1g", "csep-review"]);

export default function Home() {
  const data = loadData();
  const { employmentPermits, irpRenewals, travelNotice } = data.sections;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
              Ireland Immigration Tracker
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Unofficial personal dashboard &mdash; always verify on official sites
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <ThemeToggle />
            <span className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-500 font-medium uppercase tracking-wide dark:border-gray-700">
              Unofficial
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <LastUpdated lastScraped={data.lastScraped} />
          <RefreshButton />
        </div>
      </header>

      {/* Travel Notice Banner */}
      <section className="mb-8">
        <TravelNotice notice={travelNotice} />
      </section>

      {/* Employment Permits */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Employment Permits
          </h2>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <a
            href={employmentPermits.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-600 dark:hover:text-gray-400"
          >
            enterprise.gov.ie &rarr;
          </a>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {employmentPermits.categories.map((cat) => (
            <DateCard
              key={cat.id}
              category={cat}
              highlight={HIGHLIGHTED_IDS.has(cat.id)}
            />
          ))}
        </div>
      </section>

      {/* IRP Renewals */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            IRP Renewals
          </h2>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <a
            href={irpRenewals.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-600 dark:hover:text-gray-400"
          >
            irishimmigration.ie &rarr;
          </a>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {irpRenewals.categories
            .filter((cat) => cat.id === "stamp-1g")
            .map((cat) => (
              <DateCard
                key={cat.id}
                category={cat}
                highlight={HIGHLIGHTED_IDS.has(cat.id)}
              />
            ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 pt-6 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-600">
        <p>
          <strong className="text-gray-600 dark:text-gray-500">Disclaimer:</strong> This is an
          unofficial personal tracker. Data is scraped automatically and may be
          outdated or incorrect. Always verify processing dates on{" "}
          <a
            href="https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/current-application-processing-dates/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-gray-700 transition-colors dark:hover:text-gray-400"
          >
            enterprise.gov.ie
          </a>{" "}
          and{" "}
          <a
            href="https://www.irishimmigration.ie/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-gray-700 transition-colors dark:hover:text-gray-400"
          >
            irishimmigration.ie
          </a>
          .
        </p>
        <p className="mt-2">
          Data refreshed automatically every Tuesday. Color coding:{" "}
          <span className="text-green-600 dark:text-green-400">green</span> = within 14 days,{" "}
          <span className="text-amber-600 dark:text-yellow-400">amber</span> = 15&ndash;60 days,{" "}
          <span className="text-red-600 dark:text-red-400">red</span> = older than 60 days.
        </p>
      </footer>
    </main>
  );
}
