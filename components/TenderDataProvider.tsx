"use client";

import * as React from "react";
import type { TenderDataFile, ScrapedTender } from "@/lib/tender-types";

export interface TenderStats {
  totalCount: number;
  totalEstimatedValue: number;
  withWinnerCount: number;
  uniqueAuthorities: number;
  categoryBreakdown: { name: string; count: number }[];
  statusBreakdown: { name: string; count: number }[];
  authorityBreakdown: { name: string; count: number; totalValue: number }[];
}

interface TenderDataContextValue {
  tenders: ScrapedTender[];
  loading: boolean;
  error: string | null;
  scrapedAt: string | null;
  source: string | null;
  stats: TenderStats;
}

const EMPTY_STATS: TenderStats = {
  totalCount: 0,
  totalEstimatedValue: 0,
  withWinnerCount: 0,
  uniqueAuthorities: 0,
  categoryBreakdown: [],
  statusBreakdown: [],
  authorityBreakdown: [],
};

const TenderDataContext = React.createContext<TenderDataContextValue>({
  tenders: [],
  loading: true,
  error: null,
  scrapedAt: null,
  source: null,
  stats: EMPTY_STATS,
});

const FALLBACK_TEXT = "N/A";

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function toText(value: unknown, fallback = FALLBACK_TEXT): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toOptionalWinnerValue(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeTender(rawTender: unknown, index: number): ScrapedTender {
  const raw = (rawTender ?? {}) as Record<string, unknown>;
  const fallbackId = `row-${index + 1}`;

  return {
    id: toText(raw.id, fallbackId),
    title: toText(raw.title, "Untitled tender"),
    authority: toText(raw.authority),
    contractor: toText(raw.contractor),
    contractType: toText(raw.contractType),
    estimatedValue: toNumber(raw.estimatedValue),
    winnerValue: toOptionalWinnerValue(raw.winnerValue),
    status: toText(raw.status),
    procedureType: toText(raw.procedureType),
    announcementDate: toText(raw.announcementDate, ""),
    detailUrl: typeof raw.detailUrl === "string" ? raw.detailUrl.trim() : "",
    category: toText(raw.category),
  };
}

function normalizeDataFile(data: unknown): TenderDataFile {
  const raw = (data ?? {}) as Partial<TenderDataFile> & {
    tenders?: unknown;
  };
  const rawTenders = Array.isArray(raw.tenders) ? raw.tenders : [];

  return {
    scrapedAt: typeof raw.scrapedAt === "string" ? raw.scrapedAt : "",
    source: typeof raw.source === "string" ? raw.source : "",
    totalCount: rawTenders.length,
    tenders: rawTenders.map(normalizeTender),
  };
}

function computeStats(tenders: ScrapedTender[]): TenderStats {
  const catMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  const authMap = new Map<string, { count: number; totalValue: number }>();
  let totalEstimatedValue = 0;
  let withWinnerCount = 0;

  for (const t of tenders) {
    totalEstimatedValue += toNumber(t.estimatedValue);
    if (typeof t.winnerValue === "number" && t.winnerValue > 0) withWinnerCount++;

    const category = toText(t.category);
    catMap.set(category, (catMap.get(category) ?? 0) + 1);

    const status = toText(t.status);
    statusMap.set(status, (statusMap.get(status) ?? 0) + 1);

    const auth = toText(t.authority);
    const existing = authMap.get(auth) ?? { count: 0, totalValue: 0 };
    existing.count++;
    existing.totalValue += toNumber(t.estimatedValue);
    authMap.set(auth, existing);
  }

  const toSorted = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

  return {
    totalCount: tenders.length,
    totalEstimatedValue,
    withWinnerCount,
    uniqueAuthorities: authMap.size,
    categoryBreakdown: toSorted(catMap),
    statusBreakdown: toSorted(statusMap),
    authorityBreakdown: Array.from(authMap.entries())
      .map(([name, d]) => ({ name, count: d.count, totalValue: d.totalValue }))
      .sort((a, b) => b.count - a.count),
  };
}

export function TenderDataProvider({ children }: { children: React.ReactNode }) {
  const [tenders, setTenders] = React.useState<ScrapedTender[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [scrapedAt, setScrapedAt] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH || "");

    fetch(`${basePath}/data/tenders.json`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to load tender data (${r.status})`);
        }
        return r.json();
      })
      .then((payload: unknown) => {
        const data = normalizeDataFile(payload);
        setTenders(data.tenders);
        setScrapedAt(data.scrapedAt || null);
        setSource(data.source || null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Failed to load tender data";
        setError(message);
        setTenders([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const stats = React.useMemo(() => computeStats(tenders), [tenders]);

  return (
    <TenderDataContext.Provider value={{ tenders, loading, error, scrapedAt, source, stats }}>
      {children}
    </TenderDataContext.Provider>
  );
}

export function useTenderData() {
  return React.useContext(TenderDataContext);
}
