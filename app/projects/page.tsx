"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, ExternalLink, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export default function AuthoritiesPage() {
  const { stats, tenders, loading } = useTenderData();
  const { locale } = useLanguage();
  const strings = t[locale];
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const authorities = useMemo(() => {
    let list = stats.authorityBreakdown;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }
    return list;
  }, [stats.authorityBreakdown, search]);

  const expandedTenders = useMemo(() => {
    if (!expanded) return [];
    return tenders.filter((t) => t.authority === expanded).slice(0, 20);
  }, [expanded, tenders]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="mx-auto h-8 w-56 rounded bg-muted" />
          <div className="mx-auto h-4 w-96 rounded bg-muted" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted" />
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
        <h1 className="text-3xl font-bold text-foreground">{strings.authorities}</h1>
        <p className="mt-1 text-muted-foreground">{strings.authoritiesSubtitle}</p>
      </div>

      <Card className="mb-6 border-border bg-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={strings.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {authorities.map((auth) => {
          const isExpanded = expanded === auth.name;
          return (
            <Card key={auth.name} className="border-border bg-card">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpanded(isExpanded ? null : auth.name)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-card-foreground truncate">
                      {auth.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="font-medium text-primary">{auth.count} {strings.authTenderCount}</span>
                      {auth.totalValue > 0 && (
                        <span>{formatLek(auth.totalValue)}</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </CardContent>
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4">
                  <div className="overflow-x-auto mt-3">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">{strings.institution}</TableHead>
                          <TableHead className="text-muted-foreground">{strings.status}</TableHead>
                          <TableHead className="text-muted-foreground">{strings.category}</TableHead>
                          <TableHead className="text-muted-foreground text-right">{strings.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expandedTenders.map((tender) => (
                          <TableRow key={tender.id} className="border-border">
                            <TableCell>
                              <p className="font-medium text-card-foreground line-clamp-1">{tender.title}</p>
                              {tender.estimatedValue > 0 && (
                                <p className="text-xs text-primary font-medium">{formatLek(tender.estimatedValue)}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{tender.status || "N/A"}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{tender.category}</Badge>
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
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {authorities.length === 0 && (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              {strings.noData}
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
