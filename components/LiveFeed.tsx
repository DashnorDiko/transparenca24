"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { useTenderData } from "@/components/TenderDataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";
import { formatLek } from "@/lib/utils";

export function LiveFeed({ limit = 12 }: { limit?: number }) {
  const { tenders, loading, error } = useTenderData();
  const { locale } = useLanguage();
  const strings = t[locale];

  const recent = useMemo(() => tenders.slice(0, limit), [tenders, limit]);

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-5 text-sm text-muted-foreground">
          {locale === "sq"
            ? "Feed-i nuk u ngarkua. Ju lutem rifreskoni faqen."
            : "Feed could not be loaded. Please refresh the page."}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold text-foreground">
          {strings.recentTenders}
        </h3>
        <p className="text-sm text-muted-foreground">
          {strings.recentTendersSubtitle}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {recent.map((tender) => (
            <li
              key={tender.id}
              className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-card-foreground line-clamp-1">
                  {tender.title}
                </span>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {tender.status || "N/A"}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs line-clamp-1">
                {tender.authority}
              </p>
              <div className="flex items-center justify-between text-xs">
                {tender.estimatedValue > 0 && (
                  <span className="text-primary font-medium">
                    {formatLek(tender.estimatedValue)}
                  </span>
                )}
                {tender.detailUrl && (
                  <a
                    href={tender.detailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline ml-auto"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {locale === "sq" ? "Shiko" : "View"}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
