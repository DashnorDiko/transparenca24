"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ExternalLink,
  FileText,
  Award,
  Banknote,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTenderData } from "@/components/TenderDataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { formatLek } from "@/lib/utils";
import type { ScrapedTender } from "@/lib/tender-types";

const STATUS_COLORS: Record<string, string> = {
  "Shpallur Procedura": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Njoftuar Fituesi": "bg-green-500/20 text-green-400 border-green-500/30",
  "Lidhur Kontrata": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Anuluar Procedura": "bg-red-500/20 text-red-400 border-red-500/30",
  "Rishpallur Prokurimi": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Fazë Planifikimi": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Shpallur: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

type SortField = "title" | "authority" | "status" | "category" | "estimatedValue";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function SortIcon({
  field,
  activeField,
  sortDir,
}: {
  field: SortField;
  activeField: SortField | null;
  sortDir: SortDir;
}) {
  if (activeField !== field) {
    return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  }
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" />
  );
}

export default function TendersPage() {
  const { tenders, stats, loading, error, scrapedAt } = useTenderData();
  const { locale } = useLanguage();
  const strings = t[locale];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const statusOptions = useMemo(
    () => stats.statusBreakdown.map((s) => s.name),
    [stats.statusBreakdown],
  );
  const categoryOptions = useMemo(
    () => stats.categoryBreakdown.map((c) => c.name),
    [stats.categoryBreakdown],
  );

  const filtered = useMemo(() => {
    const toSearchText = (value: unknown) => String(value ?? "").toLowerCase();
    const normalizeStatus = (value: unknown) => {
      const text = String(value ?? "").trim();
      return text || "N/A";
    };

    let list = tenders;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (tender) =>
          toSearchText(tender.title).includes(q) ||
          toSearchText(tender.authority).includes(q) ||
          toSearchText(tender.contractor).includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((tender) => normalizeStatus(tender.status) === statusFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((tender) => tender.category === categoryFilter);
    }
    if (dateFrom) {
      list = list.filter((tender) => tender.announcementDate >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((tender) => tender.announcementDate <= dateTo);
    }

    if (sortField) {
      list = [...list].sort((a, b) => {
        let cmp = 0;
        if (sortField === "estimatedValue") {
          cmp = a.estimatedValue - b.estimatedValue;
        } else {
          cmp = String(a[sortField] ?? "").localeCompare(String(b[sortField] ?? ""));
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    }

    return list;
  }, [tenders, search, statusFilter, categoryFilter, dateFrom, dateTo, sortField, sortDir]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
      setPage(0);
    },
    [sortField],
  );

  const downloadCsv = useCallback(() => {
    const headers = ["Title", "Authority", "Contractor", "Status", "Category", "Estimated Value", "Winner Value", "Date", "URL"];
    const rows = filtered.map((tender) =>
      [
        escapeCsvField(tender.title),
        escapeCsvField(tender.authority),
        escapeCsvField(tender.contractor),
        escapeCsvField(tender.status),
        escapeCsvField(tender.category),
        String(tender.estimatedValue),
        tender.winnerValue != null ? String(tender.winnerValue) : "",
        tender.announcementDate,
        tender.detailUrl,
      ].join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="mx-auto h-8 w-48 rounded bg-muted" />
          <div className="mx-auto h-4 w-96 rounded bg-muted" />
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          {strings.errorTitle}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {strings.errorMessage}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{strings.tenders}</h1>
        <p className="mt-1 text-muted-foreground">{strings.tendersSubtitle}</p>
        {scrapedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            {strings.tendersDataSource} &middot;{" "}
            {new Date(scrapedAt).toLocaleDateString(locale === "sq" ? "sq-AL" : "en-GB")}
          </p>
        )}
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{strings.tendersTotal}</p>
              <p className="text-2xl font-bold text-card-foreground">{tenders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Award className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{strings.tendersWithWinner}</p>
              <p className="text-2xl font-bold text-card-foreground">{stats.withWinnerCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Banknote className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{strings.tendersTotalValue}</p>
              <p className="text-2xl font-bold text-card-foreground">
                {stats.totalEstimatedValue > 0 ? formatLek(stats.totalEstimatedValue, locale) : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-border bg-card">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={strings.tendersSearch}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={strings.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{strings.all}</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={strings.category} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{strings.all}</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label={strings.dateFrom}
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="w-full sm:w-[160px]"
          />
          <Input
            type="date"
            aria-label={strings.dateTo}
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="w-full sm:w-[160px]"
          />
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadCsv}>
            <Download className="h-4 w-4" />
            {strings.downloadCsv}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-card-foreground">
            {filtered.length} {strings.tendersCount}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <caption className="sr-only">{strings.tenders}</caption>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground min-w-[250px] cursor-pointer select-none" onClick={() => handleSort("title")}>
                    {strings.institution}
                    <SortIcon field="title" activeField={sortField} sortDir={sortDir} />
                  </TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer select-none" onClick={() => handleSort("authority")}>
                    {strings.tenderAuthority}
                    <SortIcon field="authority" activeField={sortField} sortDir={sortDir} />
                  </TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer select-none" onClick={() => handleSort("status")}>
                    {strings.status}
                    <SortIcon field="status" activeField={sortField} sortDir={sortDir} />
                  </TableHead>
                  <TableHead className="text-muted-foreground cursor-pointer select-none" onClick={() => handleSort("category")}>
                    {strings.category}
                    <SortIcon field="category" activeField={sortField} sortDir={sortDir} />
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">{strings.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((tender) => (
                  <TenderRow key={tender.id} tender={tender} locale={locale} />
                ))}
                {paged.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      {strings.noData}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-40"
              >
                &laquo;
              </button>
              {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
                const p = pageCount <= 7 ? i : page < 3 ? i : page > pageCount - 4 ? pageCount - 7 + i : page - 3 + i;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${p === page ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"}`}
                  >
                    {p + 1}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-40"
              >
                &raquo;
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TenderRow({ tender, locale }: { tender: ScrapedTender; locale: "sq" | "en" }) {
  const strings = t[locale];
  const statusClass = STATUS_COLORS[tender.status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <TableRow className="border-border">
      <TableCell>
        <p className="font-medium text-card-foreground line-clamp-2">{tender.title}</p>
        {tender.estimatedValue > 0 && (
          <p className="mt-0.5 text-xs text-primary font-medium">{formatLek(tender.estimatedValue, locale)}</p>
        )}
      </TableCell>
      <TableCell className="text-foreground/70 text-sm">{tender.authority}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-xs ${statusClass}`}>{tender.status || "N/A"}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">{tender.category}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {tender.detailUrl && (
          <a href={tender.detailUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{strings.viewOnPortal}</span>
          </a>
        )}
      </TableCell>
    </TableRow>
  );
}
