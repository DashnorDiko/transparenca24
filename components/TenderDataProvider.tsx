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
  scrapedAt: null,
  source: null,
  stats: EMPTY_STATS,
});

function computeStats(tenders: ScrapedTender[]): TenderStats {
  const catMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  const authMap = new Map<string, { count: number; totalValue: number }>();
  let totalEstimatedValue = 0;
  let withWinnerCount = 0;

  for (const t of tenders) {
    totalEstimatedValue += t.estimatedValue;
    if (t.winnerValue !== null) withWinnerCount++;

    catMap.set(t.category, (catMap.get(t.category) ?? 0) + 1);

    const status = t.status || "N/A";
    statusMap.set(status, (statusMap.get(status) ?? 0) + 1);

    const auth = t.authority || "N/A";
    const existing = authMap.get(auth) ?? { count: 0, totalValue: 0 };
    existing.count++;
    existing.totalValue += t.estimatedValue;
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
  const [scrapedAt, setScrapedAt] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<string | null>(null);

  React.useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${basePath}/data/tenders.json`)
      .then((r) => r.json())
      .then((data: TenderDataFile) => {
        setTenders(data.tenders);
        setScrapedAt(data.scrapedAt);
        setSource(data.source);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = React.useMemo(() => computeStats(tenders), [tenders]);

  return (
    <TenderDataContext.Provider value={{ tenders, loading, scrapedAt, source, stats }}>
      {children}
    </TenderDataContext.Provider>
  );
}

export function useTenderData() {
  return React.useContext(TenderDataContext);
}
