"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileSearch, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCards } from "@/components/StatCards";
import { LiveFeed } from "@/components/LiveFeed";
import { useTenderData } from "@/components/TenderDataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { t } from "@/lib/i18n";

export function LandingContent() {
  const { stats, loading, error } = useTenderData();
  const { locale } = useLanguage();
  const strings = t[locale];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-background via-background to-primary/5 px-4 py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />
        <div className="container relative mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary"
          >
            <FileSearch className="h-4 w-4" />
            {locale === "sq" ? "Të dhëna reale" : "Real data"}
          </motion.div>
          <motion.h1
            className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            {strings.heroTitle}
          </motion.h1>
          <motion.p
            className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {strings.heroSubtitle}
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button asChild size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/dashboard">
                {strings.openDashboard}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/tenders">
                <FileSearch className="h-4 w-4" />
                {strings.viewTenders}
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 py-8">
        <StatCards />
      </section>

      {/* Top Authorities + Recent Feed */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <TopAuthoritiesCard stats={stats} loading={loading} error={error} locale={locale} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <LiveFeed limit={10} />
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card/30 px-4 py-12">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            {locale === "sq"
              ? "Eksploroni të gjitha tenderat publike"
              : "Explore all public tenders"}{" "}
            <Link
              href="/tenders"
              className="font-medium text-primary hover:underline"
            >
              {strings.exploreAll}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function TopAuthoritiesCard({
  stats,
  loading,
  error,
  locale,
}: {
  stats: { authorityBreakdown: { name: string; count: number }[] };
  loading: boolean;
  error: string | null;
  locale: string;
}) {
  const strings = t[locale as "sq" | "en"];
  const top = stats.authorityBreakdown.slice(0, 8);

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted" />
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
            ? "Autoritetet nuk u ngarkuan. Ju lutem rifreskoni faqen."
            : "Authorities could not be loaded. Please refresh the page."}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold text-foreground">
          {strings.topAuthorities}
        </h3>
        <p className="text-sm text-muted-foreground">
          {strings.topAuthoritiesSubtitle}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {top.map((auth) => (
            <li
              key={auth.name}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-card-foreground truncate">
                  {auth.name}
                </span>
              </div>
              <span className="text-sm font-medium text-primary shrink-0 ml-2">
                {auth.count}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 text-center">
          <Link
            href="/projects"
            className="text-sm text-primary hover:underline"
          >
            {strings.exploreAll} &rarr;
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
