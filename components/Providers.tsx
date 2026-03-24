"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { TenderDataProvider } from "@/components/TenderDataProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TenderDataProvider>
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </TenderDataProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
