"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, Building2, Award } from "lucide-react";
import { useTenderData } from "@/components/TenderDataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

export function StatCards() {
  const { stats, loading, error } = useTenderData();
  const { locale } = useLanguage();
  const strings = t[locale];

  const cards = [
    {
      label: strings.totalTenders,
      subtitle: strings.totalTendersSubtitle,
      value: stats.totalCount,
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: strings.uniqueAuthorities,
      subtitle: strings.uniqueAuthoritiesSubtitle,
      value: stats.uniqueAuthorities,
      icon: Building2,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: strings.withWinner,
      subtitle: strings.withWinnerSubtitle,
      value: stats.withWinnerCount,
      icon: Award,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-8 w-16 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-border bg-card md:col-span-3">
        <CardContent className="p-5 text-sm text-muted-foreground">
          {strings.statsError}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((c, index) => (
        <Card key={index} className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {c.label}
            </span>
            <div className={`rounded-lg ${c.bg} p-2`}>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {c.value.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{c.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
