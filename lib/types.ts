export interface PermitCategory {
  id: string;
  label: string;
  processingDate: string;
  rawText?: string;
  lastChanged: string; // ISO 8601 timestamp
}

export interface PermitSection {
  sourceUrl: string;
  lastUpdatedBySource: string;
  categories: PermitCategory[];
}

export interface TravelNotice {
  active: boolean;
  description: string;
  validUntil: string; // YYYY-MM-DD
  sourceUrl: string;
  notes: string;
}

export interface ProcessingDates {
  lastScraped: string; // ISO 8601 timestamp
  sections: {
    employmentPermits: PermitSection;
    irpRenewals: PermitSection;
    travelNotice: TravelNotice;
  };
}
