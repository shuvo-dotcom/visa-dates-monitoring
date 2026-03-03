/**
 * Scraper for Ireland visa processing dates.
 *
 * Sources:
 *  1. enterprise.gov.ie — regular HTML, scraped with node-fetch + cheerio
 *  2. irishimmigration.ie — JS-rendered, scraped with Playwright
 *
 * On any scrape failure the existing JSON data is preserved for that section.
 *
 * Run with:
 *   npx ts-node --project tsconfig.scripts.json scripts/scrape.ts
 */

import * as fs from "fs";
import * as path from "path";

// cheerio and playwright use require (CommonJS); native fetch is available in Node 18+
const cheerio = require("cheerio");
const { chromium } = require("playwright");

const DATA_FILE = path.join(__dirname, "../data/processing-dates.json");

interface PermitCategory {
  id: string;
  label: string;
  processingDate: string;
  rawText?: string;
  lastChanged: string;
}

interface ProcessingDates {
  lastScraped: string;
  sections: {
    employmentPermits: {
      sourceUrl: string;
      lastUpdatedBySource: string;
      categories: PermitCategory[];
    };
    irpRenewals: {
      sourceUrl: string;
      lastUpdatedBySource: string;
      categories: PermitCategory[];
    };
    travelNotice: {
      active: boolean;
      description: string;
      validUntil: string;
      sourceUrl: string;
      notes: string;
    };
  };
}

function loadExisting(): ProcessingDates {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

function saveData(data: ProcessingDates): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`✅ Saved data to ${DATA_FILE}`);
}

// ---------------------------------------------------------------------------
// Source 1: enterprise.gov.ie (node-fetch + cheerio)
// ---------------------------------------------------------------------------

const ENTERPRISE_URL =
  "https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/current-application-processing-dates/";

/**
 * Maps a normalised label (lowercased, trimmed) to a category id.
 * We use fuzzy matching so minor wording changes on the site don't break things.
 */
function matchCategoryId(text: string): string | null {
  const t = text.toLowerCase();
  // CSEP: "Critical Skills" is the primary type; NOT when it appears as "excluding critical skills"
  if (t.includes("critical skills") && !t.includes("excluding") && !t.includes("review")) return "csep-new";
  if (t.includes("review")) return "csep-reviews";
  // ICT / Intra-Company: check renewal before new to avoid false-positives
  const isIct = t.includes("intra-company") || t.includes("intra company") || t.includes("intra‑company");
  if (isIct && t.includes("renewal")) return "ict-renewal";
  if (isIct) return "ict-new";
  if (t.includes("renewal")) return "renewal-all";
  // "New Applications (All permit types excluding Critical Skills)" or similar
  if (t.includes("new") && (t.includes("all") || t.includes("other") || t.includes("excluding"))) return "new-all-other";
  return null;
}

const ID_TO_LABEL: Record<string, string> = {
  "csep-new": "Critical Skills EP (New)",
  "csep-reviews": "EP Reviews",
  "new-all-other": "New Applications (All other types)",
  "ict-new": "ICT Permit (New)",
  "ict-renewal": "ICT Permit (Renewal)",
  "renewal-all": "Renewal Applications (All types)",
};

async function scrapeEnterpriseGov(
  existing: ProcessingDates
): Promise<ProcessingDates["sections"]["employmentPermits"]> {
  console.log("🔍 Scraping enterprise.gov.ie …");

  try {
    const response = await fetch(ENTERPRISE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IrelandVisaTracker/1.0; personal dashboard)",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from enterprise.gov.ie`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // The page uses a table or definition-list structure.
    // Strategy: look for rows / cells that contain a date-like pattern.
    const datePattern = /\d{1,2}\s+\w+\s+\d{4}/i;

    const scraped: Record<string, string> = {};

    // Primary strategy: each permit type is its own <table> with label in
    // <thead><tr><td> and date in <tbody><tr><td> (observed structure Mar 2026)
    $("table").each((_: number, table: any) => {
      const labelText = $(table).find("thead td, thead th").first().text().trim();
      const valueText = $(table).find("tbody td").first().text().trim();
      if (labelText && datePattern.test(valueText)) {
        const id = matchCategoryId(labelText);
        if (id) scraped[id] = valueText.match(datePattern)![0];
      }
    });

    // Fallback A: multi-column table rows (label | date)
    if (Object.keys(scraped).length === 0) {
      $("table tr").each((_: number, row: any) => {
        const cells = $(row).find("td, th");
        if (cells.length >= 2) {
          const labelText = $(cells[0]).text().trim();
          const valueText = $(cells[1]).text().trim();
          if (datePattern.test(valueText)) {
            const id = matchCategoryId(labelText);
            if (id) scraped[id] = valueText.match(datePattern)![0];
          }
        }
      });
    }

    // Fallback B: dl/dt/dd pairs
    if (Object.keys(scraped).length === 0) {
      $("dl").each((_: number, dl: any) => {
        const dts = $(dl).find("dt");
        const dds = $(dl).find("dd");
        dts.each((i: number, dt: any) => {
          const labelText = $(dt).text().trim();
          const valueText = $(dds[i]).text().trim();
          if (datePattern.test(valueText)) {
            const id = matchCategoryId(labelText);
            if (id) scraped[id] = valueText.match(datePattern)![0];
          }
        });
      });
    }

    // Fallback C: scan paragraphs / list items
    if (Object.keys(scraped).length === 0) {
      $("p, li").each((_: number, el: any) => {
        const text = $(el).text().trim();
        const match = text.match(datePattern);
        if (match) {
          const id = matchCategoryId(text);
          if (id) scraped[id] = match[0];
        }
      });
    }

    if (Object.keys(scraped).length === 0) {
      throw new Error(
        "Could not extract any dates from enterprise.gov.ie — page structure may have changed"
      );
    }

    const now = new Date().toISOString();
    const existingCats = existing.sections.employmentPermits.categories;

    const categories: PermitCategory[] = Object.entries(ID_TO_LABEL).map(
      ([id, defaultLabel]) => {
        const prevEntry = existingCats.find((c) => c.id === id);
        const newDate = scraped[id];

        if (!newDate) {
          // Not found on page this run — keep previous
          console.warn(`  ⚠️  No date found for "${id}" — keeping existing`);
          return prevEntry ?? { id, label: defaultLabel, processingDate: "Unknown", lastChanged: now };
        }

        const changed = !prevEntry || prevEntry.processingDate !== newDate;
        return {
          id,
          label: prevEntry?.label ?? defaultLabel,
          processingDate: newDate,
          lastChanged: changed ? now : prevEntry!.lastChanged,
        };
      }
    );

    console.log(
      `  ✅ enterprise.gov.ie: scraped ${Object.keys(scraped).length} dates`
    );

    return {
      sourceUrl: ENTERPRISE_URL,
      lastUpdatedBySource: new Date().toISOString().slice(0, 10),
      categories,
    };
  } catch (err) {
    console.error(`  ❌ enterprise.gov.ie scrape failed: ${err}`);
    console.error("  Keeping existing employment permits data.");
    return existing.sections.employmentPermits;
  }
}

// ---------------------------------------------------------------------------
// Source 2: irishimmigration.ie (Playwright)
// ---------------------------------------------------------------------------

const INIS_URL =
  "https://www.irishimmigration.ie/registering-your-immigration-permission/how-to-renew-your-current-permission/renewing-your-registration-permission-if-you-live-in-the-republic-of-ireland/";

async function scrapeIrishImmigration(
  existing: ProcessingDates
): Promise<ProcessingDates["sections"]["irpRenewals"]> {
  console.log("🔍 Scraping irishimmigration.ie with Playwright …");

  let browser: any = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    await page.goto(INIS_URL, { waitUntil: "networkidle", timeout: 60_000 });

    // Wait for JS-rendered content
    await page.waitForTimeout(3000);

    // Get full page text
    const bodyText: string = await page.evaluate(() => document.body.innerText);

    const now = new Date().toISOString();
    const existingCats = existing.sections.irpRenewals.categories;

    // The INIS page currently shows a single general renewal processing date,
    // e.g. "We are currently processing applications for renewal submitted on 06/12/2025"
    // Format: DD/MM/YYYY
    //
    // There is no per-stamp-type breakdown on this page as of March 2026.
    // Both Stamp 1G and CSEP Review share this same date.

    /** Convert DD/MM/YYYY → human-readable "DD Month YYYY" */
    function parseDdMmYyyy(s: string): string | null {
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!m) return null;
      const months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December",
      ];
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const year = m[3];
      if (month < 0 || month > 11) return null;
      return `${day.toString().padStart(2, "0")} ${months[month]} ${year}`;
    }

    // Primary: look for "submitted on DD/MM/YYYY" pattern
    const submittedOnMatch = bodyText.match(
      /(?:submitted on|submitted on:?)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i
    );

    // Fallback: any DD/MM/YYYY in the processing timelines section
    const generalDateMatch = bodyText.match(/\d{1,2}\/\d{1,2}\/\d{4}/);

    // Also try "DD Month YYYY" style
    const longDateMatch = bodyText.match(/\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i);

    let generalDate = "";
    let rawContext = "";

    if (submittedOnMatch) {
      const parsed = parseDdMmYyyy(submittedOnMatch[1]);
      if (parsed) {
        generalDate = parsed;
        // Extract surrounding sentence as context
        const idx = bodyText.indexOf(submittedOnMatch[0]);
        rawContext = bodyText.slice(Math.max(0, idx - 50), idx + 200).trim();
      }
    } else if (generalDateMatch) {
      const parsed = parseDdMmYyyy(generalDateMatch[0]);
      if (parsed) {
        generalDate = parsed;
        const idx = bodyText.indexOf(generalDateMatch[0]);
        rawContext = bodyText.slice(Math.max(0, idx - 50), idx + 200).trim();
      }
    } else if (longDateMatch) {
      generalDate = longDateMatch[0];
      const idx = bodyText.indexOf(longDateMatch[0]);
      rawContext = bodyText.slice(Math.max(0, idx - 50), idx + 200).trim();
    }

    if (!generalDate) {
      console.warn(
        "  ⚠️  Could not find processing date. Page text excerpt:\n",
        bodyText.slice(800, 2500)
      );
    }

    const prevStamp1g = existingCats.find((c) => c.id === "stamp-1g");
    const prevCsep = existingCats.find((c) => c.id === "csep-review");

    // Both stamp types share the same general renewal date (no per-type breakdown on site)
    const categories: PermitCategory[] = [
      {
        id: "stamp-1g",
        label: "Stamp 1G Renewal",
        processingDate: generalDate || prevStamp1g?.processingDate || "Pending first scrape",
        rawText: rawContext || prevStamp1g?.rawText || "",
        lastChanged:
          generalDate && generalDate !== prevStamp1g?.processingDate
            ? now
            : prevStamp1g?.lastChanged ?? now,
      },
      {
        id: "csep-review",
        label: "CSEP Review (IRP)",
        processingDate: generalDate || prevCsep?.processingDate || "Pending first scrape",
        rawText: rawContext || prevCsep?.rawText || "",
        lastChanged:
          generalDate && generalDate !== prevCsep?.processingDate
            ? now
            : prevCsep?.lastChanged ?? now,
      },
    ];

    console.log(
      `  ✅ irishimmigration.ie: General renewal date="${generalDate || "not found"}"`
    );

    return {
      sourceUrl: INIS_URL,
      lastUpdatedBySource: new Date().toISOString().slice(0, 10),
      categories,
    };
  } catch (err) {
    console.error(`  ❌ irishimmigration.ie scrape failed: ${err}`);
    console.error("  Keeping existing IRP renewals data.");
    return existing.sections.irpRenewals;
  } finally {
    if (browser) await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🇮🇪 Ireland Visa Processing Dates Scraper");
  console.log(`   Started: ${new Date().toISOString()}\n`);

  const existing = loadExisting();

  // Run both scrapers (enterprise.gov.ie can run without Playwright)
  const [employmentPermits, irpRenewals] = await Promise.all([
    scrapeEnterpriseGov(existing),
    scrapeIrishImmigration(existing),
  ]);

  const updated: ProcessingDates = {
    lastScraped: new Date().toISOString(),
    sections: {
      employmentPermits,
      irpRenewals,
      travelNotice: existing.sections.travelNotice, // never auto-updated
    },
  };

  saveData(updated);
  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
