"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTenderData } from "@/components/TenderDataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { formatLek } from "@/lib/utils";

const PIE_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
];

export function DashboardContent() {
  const { tenders, stats, loading, scrapedAt } = useTenderData();
  const { locale } = useLanguage();
  const strings = t[locale];

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const categories = useMemo(
    () => stats.categoryBreakdown.map((c) => c.name),
    [stats.categoryBreakdown]
  );
  const statuses = useMemo(
    () => stats.statusBreakdown.map((s) => s.name),
    [stats.statusBreakdown]
  );

  const filtered = useMemo(() => {
    let list = tenders;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.authority.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "all") {
      list = list.filter((t) => t.category === categoryFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }
    return list;
  }, [tenders, search, categoryFilter, statusFilter]);

  const filteredCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      map.set(t.category, (map.get(t.category) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const filteredAuthorityData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      const auth = t.authority || "N/A";
      map.set(auth, (map.get(auth) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name: name.length > 30 ? name.slice(0, 28) + "..." : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filtered]);

  const filteredStatusData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      const s = t.status || "N/A";
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-6">
          <div className="mx-auto h-8 w-48 rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
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
        <h1 className="text-3xl font-bold text-foreground">{strings.dashboard}</h1>
        <p className="text-muted-foreground mt-1">{strings.dashboardSubtitle}</p>
        {scrapedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            {strings.tendersDataSource} &middot;{" "}
            {new Date(scrapedAt).toLocaleDateString(locale === "sq" ? "sq-AL" : "en-GB")}
          </p>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6 border-border bg-card">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={strings.tendersSearch}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={strings.category} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{strings.all}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={strings.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{strings.all}</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tenders by category */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">{strings.tendersByCategory}</CardTitle>
            <p className="text-sm text-muted-foreground">{strings.tendersByCategorySubtitle}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredCategoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--card-foreground))" }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 10 authorities */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">{strings.topAuthoritiesChart}</CardTitle>
            <p className="text-sm text-muted-foreground">{strings.topAuthoritiesChartSubtitle}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredAuthorityData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--card-foreground))" }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">{strings.statusDistribution}</CardTitle>
            <p className="text-sm text-muted-foreground">{strings.statusDistributionSubtitle}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {filteredStatusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--card-foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tender summary table */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">
              {strings.tenderSummary} ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">{strings.institution}</TableHead>
                    <TableHead className="text-muted-foreground">{strings.tenderAuthority}</TableHead>
                    <TableHead className="text-muted-foreground">{strings.status}</TableHead>
                    <TableHead className="text-muted-foreground text-right">{strings.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 15).map((tender) => (
                    <TableRow key={tender.id} className="border-border">
                      <TableCell>
                        <p className="font-medium text-card-foreground line-clamp-1">{tender.title}</p>
                        {tender.estimatedValue > 0 && (
                          <p className="text-xs text-primary font-medium">{formatLek(tender.estimatedValue)}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground/70 text-sm">{tender.authority}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{tender.status || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {tender.detailUrl && (
                          <a
                            href={tender.detailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        {strings.noData}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
